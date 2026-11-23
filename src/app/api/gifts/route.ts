import type { PostgrestError } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  readInvitationSession,
  type InvitationSession,
} from "@/lib/invitations/server";
import {
  createSupabaseAdminClient,
  getSupabaseRealtimeConfig,
} from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database.types";

export const runtime = "nodejs";

type GiftAction = {
  action?: unknown;
  description?: unknown;
  id?: unknown;
  name?: unknown;
  quantity?: unknown;
  quantityTotal?: unknown;
  referenceUrl?: unknown;
};

type GiftRow = {
  created_at: string;
  description: string | null;
  id: string;
  is_active: boolean;
  name: string;
  quantity_available: number | null;
  quantity_purchased: number;
  quantity_reserved: number;
  quantity_total: number;
  reference_url: string | null;
  sort_order: number;
  updated_at: string;
};

type ReservationRow = {
  gift_id: string;
  id: string;
  quantity: number;
  status: "cancelled" | "purchased" | "reserved";
};

const giftSelect =
  "id,name,description,reference_url,quantity_total,quantity_reserved,quantity_purchased,quantity_available,is_active,sort_order,created_at,updated_at";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(data, { ...init, headers });
}

function mapGift(item: GiftRow, reservation?: ReservationRow) {
  return {
    active: item.is_active,
    description: item.description,
    id: item.id,
    myReservation: reservation
      ? {
          id: reservation.id,
          quantity: reservation.quantity,
          status: reservation.status,
        }
      : null,
    name: item.name,
    quantityAvailable: item.quantity_available ?? 0,
    quantityPurchased: item.quantity_purchased,
    quantityReserved: item.quantity_reserved,
    quantityTotal: item.quantity_total,
    referenceUrl: item.reference_url,
    sortOrder: item.sort_order,
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function requireGiftName(value: unknown) {
  const name = normalizeText(value);

  if (name.length < 2 || name.length > 80) {
    throw new ApiError("O nome deve ter entre 2 e 80 caracteres.", 400);
  }

  return name;
}

function requireGiftDescription(value: unknown) {
  const description = normalizeText(value);

  if (description.length > 500) {
    throw new ApiError("A descrição deve ter no máximo 500 caracteres.", 400);
  }

  return description || null;
}

/**
 * O link vira um href na página do convidado. Só http e https passam: um
 * `javascript:` aqui seria script rodando no navegador de quem abre a lista.
 */
function requireReferenceUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (raw.length > 2_048) {
    throw new ApiError("O link é longo demais.", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ApiError(
      "Informe um link completo, começando com https://.",
      400,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ApiError(
      "Informe um link completo, começando com https://.",
      400,
    );
  }

  return parsed.toString();
}

function readInteger(value: unknown, minimum: number, maximum: number) {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isInteger(number) && number >= minimum && number <= maximum
    ? number
    : null;
}

function requireGiftId(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ApiError("Presente inválido.", 400);
  }
  return value;
}

function requireAdmin(session: InvitationSession) {
  if (!session.invitation.isAdmin) {
    throw new ApiError("Esta área é exclusiva do anfitrião.", 403);
  }
}

function mapDatabaseError(error: PostgrestError) {
  if (error.message.includes("insufficient_quantity")) {
    return new ApiError(
      "A quantidade escolhida não está mais disponível. A lista foi atualizada.",
      409,
    );
  }
  if (error.message.includes("purchased_reservation_locked")) {
    return new ApiError(
      "A compra já foi confirmada. Cancele a escolha se precisar corrigi-la.",
      409,
    );
  }
  if (
    error.message.includes("gift_not_found") ||
    error.message.includes("claim_not_found") ||
    error.message.includes("invitation_not_found")
  ) {
    return new ApiError(
      "Essa escolha não está mais disponível. Atualize a lista e tente novamente.",
      409,
    );
  }
  if (error.code === "23505") {
    return new ApiError("Esse item já está na lista.", 409);
  }
  // A mensagem do Postgres traz o nome da constraint violada; sem olhar para
  // ela, um nome longo demais viraria um aviso sobre quantidade.
  if (error.code === "23514") {
    if (error.message.includes("gifts_quantity_within_total")) {
      return new ApiError(
        "A quantidade total não pode ser menor que as unidades já escolhidas.",
        409,
      );
    }
    if (error.message.includes("gifts_name_length")) {
      return new ApiError("O nome deve ter entre 2 e 80 caracteres.", 400);
    }
    if (error.message.includes("gifts_description_length")) {
      return new ApiError("A descrição deve ter no máximo 500 caracteres.", 400);
    }
    if (error.message.includes("gifts_quantity_total_positive")) {
      return new ApiError("Informe uma quantidade de pelo menos 1.", 400);
    }
    if (error.message.includes("gifts_reference_url_format")) {
      return new ApiError(
        "Informe um link completo, começando com https://.",
        400,
      );
    }
    return new ApiError("Os dados enviados são inválidos.", 400);
  }
  if (error.code === "22023") {
    return new ApiError("Os dados enviados são inválidos.", 400);
  }

  console.error("Supabase gift operation failed", {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
  return new ApiError("Não foi possível atualizar a lista agora.", 500);
}

async function readPayload(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 8_192) {
    throw new ApiError("A solicitação é grande demais.", 413);
  }

  try {
    return (await request.json()) as GiftAction;
  } catch {
    throw new ApiError("Envie um corpo JSON válido.", 400);
  }
}

async function loadGiftRows() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gifts")
    .select(giftSelect)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");

  if (error) throw mapDatabaseError(error);
  return data as GiftRow[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await readInvitationSession(request);
    if (!session) {
      return json(
        {
          accessRequired: true,
          error: "Digite o código do convite para acessar a lista.",
        },
        { status: 401 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const [{ data: reservations, error: reservationError }, items] =
      await Promise.all([
        supabase
          .from("gift_reservations")
          .select("id,gift_id,quantity,status")
          .eq("invitation_id", session.invitation.id)
          .in("status", ["reserved", "purchased"]),
        loadGiftRows(),
      ]);
    if (reservationError) throw mapDatabaseError(reservationError);

    const reservationByGift = new Map(
      ((reservations ?? []) as ReservationRow[]).map((reservation) => [
        reservation.gift_id,
        reservation,
      ]),
    );

    let realtime: ReturnType<typeof getSupabaseRealtimeConfig> | null = null;
    try {
      realtime = getSupabaseRealtimeConfig();
    } catch {
      // A lista continua funcionando com atualização periódica sem Realtime.
    }

    return json({
      invitation: {
        audience: session.invitation.audience,
        displayName: session.invitation.displayName,
      },
      items: items.map((item) =>
        mapGift(item, reservationByGift.get(item.id)),
      ),
      realtime,
    });
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError("Não foi possível carregar os presentes agora.", 500);
    return json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await readPayload(request);
    const action = typeof payload.action === "string" ? payload.action : "";
    const supabase = createSupabaseAdminClient();

    // Convidados e casal usam a mesma sessão de convite; o que separa os dois
    // é a marca administrativa conferida em requireAdmin.
    const session = await readInvitationSession(request);
    if (!session) {
      throw new ApiError(
        "Sua sessão expirou. Digite novamente o código do convite.",
        401,
      );
    }

    if (action === "adminList") {
      requireAdmin(session);
      return json({ items: (await loadGiftRows()).map((item) => mapGift(item)) });
    }

    if (action === "add") {
      requireAdmin(session);
      const name = requireGiftName(payload.name);
      const description = requireGiftDescription(payload.description);
      const referenceUrl = requireReferenceUrl(payload.referenceUrl);
      const quantityTotal = readInteger(payload.quantityTotal, 1, 999);

      if (quantityTotal === null) {
        throw new ApiError("Informe uma quantidade entre 1 e 999.", 400);
      }

      const { data: lastGift, error: orderError } = await supabase
        .from("gifts")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orderError) throw mapDatabaseError(orderError);

      const { data, error } = await supabase
        .from("gifts")
        .insert({
          description,
          name,
          quantity_total: quantityTotal,
          reference_url: referenceUrl,
          sort_order: (lastGift?.sort_order ?? 0) + 1,
        })
        .select(giftSelect)
        .single();
      if (error) throw mapDatabaseError(error);

      return json({ item: mapGift(data as GiftRow) }, { status: 201 });
    }

    if (action === "update") {
      requireAdmin(session);
      const id = requireGiftId(payload.id);
      const changes: TablesUpdate<"gifts"> = {};

      if (payload.name !== undefined) {
        changes.name = requireGiftName(payload.name);
      }
      if (payload.description !== undefined) {
        changes.description = requireGiftDescription(payload.description);
      }
      if (payload.referenceUrl !== undefined) {
        changes.reference_url = requireReferenceUrl(payload.referenceUrl);
      }
      if (payload.quantityTotal !== undefined) {
        const quantityTotal = readInteger(payload.quantityTotal, 1, 999);
        if (quantityTotal === null) {
          throw new ApiError("Informe uma quantidade entre 1 e 999.", 400);
        }
        changes.quantity_total = quantityTotal;
      }
      if (Object.keys(changes).length === 0) {
        throw new ApiError("Nenhuma alteração foi informada.", 400);
      }

      const { data, error } = await supabase
        .from("gifts")
        .update(changes)
        .eq("id", id)
        .select(giftSelect)
        .single();
      if (error) throw mapDatabaseError(error);

      return json({ item: mapGift(data as GiftRow) });
    }

    if (action === "archive") {
      requireAdmin(session);
      const id = requireGiftId(payload.id);
      const { error } = await supabase
        .from("gifts")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw mapDatabaseError(error);
      return json({ ok: true });
    }

    const id = requireGiftId(payload.id);

    if (action === "reserve" || action === "setQuantity") {
      const quantity = readInteger(payload.quantity, 1, 20);
      if (quantity === null) {
        throw new ApiError("Escolha uma quantidade entre 1 e 20.", 400);
      }

      const { data, error } = await supabase.rpc(
        "set_gift_reservation_quantity",
        {
          p_gift_id: id,
          p_invitation_id: session.invitation.id,
          p_quantity: quantity,
        },
      );
      if (error) throw mapDatabaseError(error);

      return json(
        { ok: true, reservationId: data, status: "reserved" },
        { status: action === "reserve" ? 201 : 200 },
      );
    }

    if (action === "confirm" || action === "release") {
      const { data, error } = await supabase.rpc(
        "update_invitation_gift_reservation",
        {
          p_action: action,
          p_gift_id: id,
          p_invitation_id: session.invitation.id,
        },
      );
      if (error) throw mapDatabaseError(error);

      return json({ ok: true, status: data });
    }

    throw new ApiError("Ação inválida.", 400);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError("Não foi possível atualizar a lista agora.", 500);
    return json({ error: apiError.message }, { status: apiError.status });
  }
}
