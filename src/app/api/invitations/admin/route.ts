import type { PostgrestError } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  decryptInvitationCode,
  encryptInvitationCode,
  formatInvitationCode,
  generateInvitationCode,
  hashInvitationCode,
  readInvitationSession,
  type InvitationAudience,
} from "@/lib/invitations/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AdminPayload = {
  action?: unknown;
  audience?: unknown;
  confirmed?: unknown;
  displayName?: unknown;
  id?: unknown;
  sent?: unknown;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function requireDisplayName(value: unknown) {
  const displayName =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (displayName.length < 2 || displayName.length > 80) {
    throw new AdminError("O nome deve ter entre 2 e 80 caracteres.", 400);
  }

  return displayName;
}

function requireId(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new AdminError("Convite inválido.", 400);
  }
  return value;
}

function requireAudience(value: unknown): InvitationAudience {
  if (value !== "amigos" && value !== "familia") {
    throw new AdminError("Escolha entre amigos ou família.", 400);
  }
  return value;
}

function mapDatabaseError(error: PostgrestError) {
  if (error.code === "23505") {
    return new AdminError(
      "Houve uma coincidência ao gerar o código. Tente novamente.",
      409,
    );
  }
  if (error.message.includes("invitation_not_found")) {
    return new AdminError("Esse convite não existe mais.", 404);
  }
  if (error.message.includes("admin_invitation_locked")) {
    return new AdminError("O convite do anfitrião não pode ser excluído.", 409);
  }
  if (error.code === "23514") {
    if (error.message.includes("gift_invitations_display_name_length")) {
      return new AdminError("O nome deve ter entre 2 e 80 caracteres.", 400);
    }
    if (error.message.includes("gift_invitations_audience_valid")) {
      return new AdminError("Escolha entre amigos ou família.", 400);
    }
    return new AdminError("Os dados enviados são inválidos.", 400);
  }

  console.error("Supabase invitation admin operation failed", error);
  return new AdminError("Não foi possível atualizar os convites agora.", 500);
}

async function readPayload(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 8_192) {
    throw new AdminError("A solicitação é grande demais.", 413);
  }

  try {
    return (await request.json()) as AdminPayload;
  } catch {
    throw new AdminError("Envie dados válidos.", 400);
  }
}

function createCodeRecord() {
  const code = generateInvitationCode();
  return {
    code,
    codeCiphertext: encryptInvitationCode(code),
    codeHash: hashInvitationCode(code),
    codeHint: code.slice(-4),
  };
}

async function loadInvitations() {
  const supabase = createSupabaseAdminClient();
  const [{ data: invitations, error: invitationError }, reservationsResult] =
    await Promise.all([
      // O convite do casal fica fora da lista: pausá-lo ou trocar seu código
      // por engano tirando o próprio acesso ao painel não é uma opção que valha
      // a pena oferecer. Ele é gerenciado pela variável GIFT_ADMIN_CODE.
      supabase
        .from("gift_invitations")
        .select(
          "id,display_name,audience,code_ciphertext,code_hint,is_confirmed,confirmed_at,is_sent,sent_at,session_version,created_at",
        )
        .eq("is_admin", false)
        // Do mais novo para o mais antigo: quem acabou de criar um convite quer
        // vê-lo na frente, sem procurar. `id` desempata convites criados no
        // mesmo instante, para a ordem não variar entre duas leituras.
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
      supabase
        .from("gift_reservations")
        .select("invitation_id,gift_id,quantity,status,created_at")
        .not("invitation_id", "is", null)
        .in("status", ["reserved", "purchased"]),
    ]);

  if (invitationError) throw mapDatabaseError(invitationError);
  if (reservationsResult.error) {
    throw mapDatabaseError(reservationsResult.error);
  }

  const giftIds = [
    ...new Set((reservationsResult.data ?? []).map((item) => item.gift_id)),
  ];
  const giftNames = new Map<string, string>();
  if (giftIds.length > 0) {
    const { data: gifts, error: giftError } = await supabase
      .from("gifts")
      .select("id,name")
      .in("id", giftIds);
    if (giftError) throw mapDatabaseError(giftError);
    for (const gift of gifts ?? []) giftNames.set(gift.id, gift.name);
  }

  return (invitations ?? []).map((invitation) => {
    const reservations = (reservationsResult.data ?? [])
      .filter((item) => item.invitation_id === invitation.id)
      .map((item) => ({
        createdAt: item.created_at,
        giftId: item.gift_id,
        giftName: giftNames.get(item.gift_id) ?? "Presente",
        quantity: item.quantity,
        status: item.status,
      }));

    let code = "";
    try {
      code = formatInvitationCode(
        decryptInvitationCode(invitation.code_ciphertext),
      );
    } catch (error) {
      console.error("Invitation code decryption failed", {
        error,
        invitationId: invitation.id,
      });
    }

    return {
      audience: invitation.audience,
      code,
      codeHint: invitation.code_hint,
      confirmed: invitation.is_confirmed,
      confirmedAt: invitation.confirmed_at,
      createdAt: invitation.created_at,
      displayName: invitation.display_name,
      id: invitation.id,
      reservations,
      sent: invitation.is_sent,
      sentAt: invitation.sent_at,
      sessionVersion: invitation.session_version,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await readPayload(request);
    const session = await readInvitationSession(request);

    if (!session) {
      throw new AdminError(
        "Sua sessão expirou. Digite novamente o código do convite.",
        401,
      );
    }
    if (!session.invitation.isAdmin) {
      throw new AdminError("Esta área é exclusiva do anfitrião.", 403);
    }

    const action = typeof payload.action === "string" ? payload.action : "list";
    const supabase = createSupabaseAdminClient();

    if (action === "list") {
      return json({ invitations: await loadInvitations() });
    }

    if (action === "create") {
      const displayName = requireDisplayName(payload.displayName);
      const audience = requireAudience(payload.audience);

      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
        const code = createCodeRecord();
        const { error } = await supabase.from("gift_invitations").insert({
          audience,
          code_ciphertext: code.codeCiphertext,
          code_hash: code.codeHash,
          code_hint: code.codeHint,
          display_name: displayName,
        });

        if (!error) {
          created = true;
          break;
        }
        if (error.code !== "23505") throw mapDatabaseError(error);
      }

      if (!created) {
        throw new AdminError(
          "Não foi possível gerar um código único. Tente novamente.",
          409,
        );
      }

      return json({ invitations: await loadInvitations() }, 201);
    }

    if (action === "delete") {
      const id = requireId(payload.id);
      const { error } = await supabase.rpc("delete_gift_invitation", {
        p_invitation_id: id,
      });
      if (error) throw mapDatabaseError(error);

      return json({ invitations: await loadInvitations() });
    }

    if (action === "setConfirmed") {
      const id = requireId(payload.id);
      if (typeof payload.confirmed !== "boolean") {
        throw new AdminError("Estado de confirmação inválido.", 400);
      }
      const { error } = await supabase.rpc("set_gift_invitation_confirmed", {
        p_invitation_id: id,
        p_is_confirmed: payload.confirmed,
      });
      if (error) throw mapDatabaseError(error);

      return json({ invitations: await loadInvitations() });
    }

    if (action === "setSent") {
      const id = requireId(payload.id);
      if (typeof payload.sent !== "boolean") {
        throw new AdminError("Estado de envio inválido.", 400);
      }
      const { error } = await supabase.rpc("set_gift_invitation_sent", {
        p_invitation_id: id,
        p_is_sent: payload.sent,
      });
      if (error) throw mapDatabaseError(error);

      return json({ invitations: await loadInvitations() });
    }

    throw new AdminError("Ação inválida.", 400);
  } catch (error) {
    const adminError =
      error instanceof AdminError
        ? error
        : new AdminError("Não foi possível atualizar os convites agora.", 500);
    return json({ error: adminError.message }, adminError.status);
  }
}
