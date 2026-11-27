import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/invitation/admin-dashboard";
import { readInvitationSessionFromCookies } from "@/lib/invitations/server";

export const metadata: Metadata = {
  title: "Painel",
  description: "Painel do Leonardo para presentes e convites.",
  robots: { index: false, follow: false },
};

export default async function CreateGiftsPage() {
  const session = await readInvitationSessionFromCookies();

  // Quem não entrou com o código do casal nunca chega a renderizar o painel.
  if (!session?.invitation.isAdmin) redirect("/");

  return (
    <main className="adm">
      <header className="adm__head">
        <p className="eyebrow">Casa nova</p>
        <h1>Painel</h1>
        <nav className="adm__links" aria-label="Outras páginas">
          {/* As reservas ficam numa página à parte: o painel é aberto o tempo
              todo para cuidar dos convites e não deve estragar a surpresa. */}
          <Link className="adm__exit" href="/reservas">
            Quem escolheu o quê ↗
          </Link>
          <Link className="adm__exit" href="/">
            Ver o convite ↗
          </Link>
        </nav>
      </header>

      <AdminDashboard />
    </main>
  );
}
