import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { readInvitationSessionFromCookies } from "@/lib/invitations/server";
import {
  loadGiftReservations,
  type GiftReservationGroup,
} from "@/lib/reservations/server";

export const metadata: Metadata = {
  title: "Quem escolheu o quê",
  description: "Reservas de presentes por convidado, só para o anfitrião.",
  robots: { index: false, follow: false },
};

function units(quantity: number) {
  return quantity === 1 ? "unidade" : "unidades";
}

export default async function ReservationsPage() {
  const session = await readInvitationSessionFromCookies();

  // Mesma barreira do painel: sem o código do anfitrião, a página nem consulta.
  if (!session?.invitation.isAdmin) redirect("/");

  let groups: GiftReservationGroup[] | null = null;
  try {
    groups = await loadGiftReservations();
  } catch {
    groups = null;
  }

  const entries = groups?.flatMap((group) => group.reservations) ?? [];
  const guests = new Set(entries.map((entry) => entry.displayName)).size;
  const waiting = entries
    .filter((entry) => entry.status === "reserved")
    .reduce((total, entry) => total + entry.quantity, 0);

  return (
    <main className="adm">
      <header className="adm__head">
        <p className="eyebrow">Casa nova</p>
        <h1>Quem escolheu o quê</h1>
        <Link className="adm__exit" href="/criar-presentes">
          ← Voltar ao painel
        </Link>
      </header>

      <section className="adm-panel">
        {groups === null ? (
          <div className="adm-empty">
            <strong>Não foi possível carregar as reservas.</strong>
            <p>Atualize a página em instantes.</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="adm-empty">
            <strong>Ninguém escolheu nada ainda.</strong>
            <p>As escolhas aparecem aqui assim que alguém reservar.</p>
          </div>
        ) : (
          <>
            <p className="adm-stat">
              <strong>{groups.length}</strong>
              {groups.length === 1 ? "presente escolhido" : "presentes escolhidos"}{" "}
              por <strong>{guests}</strong>
              {guests === 1 ? "convidado" : "convidados"}
              {waiting > 0 &&
                ` · ${waiting} ${units(waiting)} ainda sem compra confirmada`}
            </p>

            <ul className="adm-list rsv-list">
              {groups.map((group) => (
                <li className="rsv-gift" key={group.id}>
                  <div className="rsv-gift__head">
                    <strong>{group.name}</strong>
                    <span>
                      {group.quantityReserved + group.quantityPurchased} de{" "}
                      {group.quantityTotal}
                      {!group.active && " · removido da lista"}
                    </span>
                  </div>
                  <ul className="rsv-gift__people">
                    {group.reservations.map((entry) => (
                      <li key={entry.id}>
                        <span>
                          {entry.quantity}× {entry.displayName}
                          <em>
                            {entry.audience === "familia" ? "Família" : "Amigos"}
                          </em>
                        </span>
                        <small data-done={entry.status === "purchased" || undefined}>
                          {entry.status === "purchased" ? "Comprado" : "Reservado"}
                        </small>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
