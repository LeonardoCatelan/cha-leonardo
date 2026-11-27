import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type GiftReservationEntry = {
  audience: "amigos" | "familia";
  displayName: string;
  id: string;
  quantity: number;
  status: "purchased" | "reserved";
};

export type GiftReservationGroup = {
  active: boolean;
  id: string;
  name: string;
  quantityPurchased: number;
  quantityReserved: number;
  quantityTotal: number;
  reservations: GiftReservationEntry[];
};

/**
 * Quem escolheu o quê, agrupado por presente. Só deve ser chamada depois de
 * conferir que a sessão é do anfitrião: a consulta usa a chave privilegiada e
 * devolve o nome de cada convidado.
 */
export async function loadGiftReservations(): Promise<GiftReservationGroup[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_reservations")
    .select(
      "id,quantity,status,created_at,gift:gifts!inner(id,name,is_active,sort_order,created_at,quantity_total,quantity_reserved,quantity_purchased),invitation:gift_invitations!inner(display_name,audience)",
    )
    .in("status", ["reserved", "purchased"])
    .order("created_at");

  if (error) {
    console.error("Supabase reservation listing failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("reservation_listing_failed");
  }

  const groups = new Map<string, GiftReservationGroup>();
  const order = new Map<string, { createdAt: string; sortOrder: number }>();

  for (const row of data ?? []) {
    const { gift, invitation } = row;
    let group = groups.get(gift.id);
    if (!group) {
      group = {
        active: gift.is_active,
        id: gift.id,
        name: gift.name,
        quantityPurchased: gift.quantity_purchased,
        quantityReserved: gift.quantity_reserved,
        quantityTotal: gift.quantity_total,
        reservations: [],
      };
      groups.set(gift.id, group);
      order.set(gift.id, {
        createdAt: gift.created_at,
        sortOrder: gift.sort_order,
      });
    }

    group.reservations.push({
      audience: invitation.audience === "amigos" ? "amigos" : "familia",
      displayName: invitation.display_name,
      id: row.id,
      quantity: row.quantity,
      status: row.status === "purchased" ? "purchased" : "reserved",
    });
  }

  // Mesma ordem da lista que o convidado vê.
  return [...groups.values()].sort((a, b) => {
    const left = order.get(a.id)!;
    const right = order.get(b.id)!;
    return (
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt)
    );
  });
}
