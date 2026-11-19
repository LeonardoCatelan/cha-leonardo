import Link from "next/link";

import { buildWhatsAppShareUrl } from "@/lib/external-links";
import { getPixDetails } from "@/lib/pix";
import {
  giftLists,
  heroCopy,
  invitationGroups,
  sharedEvent,
  type InvitationGroup,
} from "@/lib/invitation-data";

import { BotanicalMark } from "./botanical-mark";
import { HousePlan } from "./house-plan";
import { IndividualGiftList } from "./individual-gift-list";
import { InvitationAccessGate } from "./invitation-access-gate";
import { PixCard } from "./pix-card";
import { RevealOnScroll } from "./reveal-on-scroll";
import { SessionExit } from "./session-exit";
import { WhatsAppIcon } from "./whatsapp-icon";

type InvitationPageProps = {
  displayName: string;
  group: InvitationGroup;
  isAdmin: boolean;
};

export function InvitationPage({
  displayName,
  group,
  isAdmin,
}: InvitationPageProps) {
  const event = invitationGroups[group];
  const whatsappUrl = buildWhatsAppShareUrl(event.rsvpMessage);
  const pix = getPixDetails();

  return (
    <main>
      <RevealOnScroll />
      {/* Mesmo com sessão aberta, um link `#convite=CODE` precisa trocar o
          convite exibido. */}
      <InvitationAccessGate hasSession />

      <div className="top-actions">
        {isAdmin && (
          <Link className="top-action" href="/criar-presentes">
            Painel admin
          </Link>
        )}
        <SessionExit />
      </div>

      <section className="hero" aria-labelledby="invitation-title">
        <HousePlan />

        {/* O canto superior direito pertence às ações fixas (Sair, painel). */}
        <div className="hero__rail">
          <p className="eyebrow">{heroCopy.eyebrow}</p>
        </div>

        <div className="hero__main">
          <div className="hero__content">
            <h1 className="hero__display" id="invitation-title">
              {heroCopy.titleLead}
              <br />
              <em>{heroCopy.titleAccent}</em>
            </h1>
            <p className="hero__deck">{heroCopy.deck}</p>
          </div>

          {/* A marca é a peça da direita: grande, com o anel de fundo dando
              o assentamento que o traço fino sozinho não tem. */}
          <div className="hero__mark" aria-hidden="true">
            <span className="hero__ring" />
            <BotanicalMark className="hero__sprig" />
          </div>
        </div>

        <dl className="spec">
          <div className="spec__cell">
            <dt className="spec__k">Quando</dt>
            <dd className="spec__v">
              <strong>{event.specWhen}</strong>
              <span>{event.specWhenNote}</span>
            </dd>
          </div>
          <div className="spec__cell">
            <dt className="spec__k">Onde</dt>
            <dd className="spec__v">
              <strong>{sharedEvent.address}</strong>
              <span>{sharedEvent.neighborhood}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="section when-where" aria-labelledby="details-title" data-reveal>
        <div className="container">
          {/* Conteúdo à esquerda, mapa à direita: o mapa sobe até o topo da
              seção em vez de começar depois do título. */}
          <div className="ww">
            <div className="ww__col">
              <header className="section-heading" data-reveal-item>
                <p className="eyebrow">Um novo capítulo</p>
                <h2 id="details-title">Minha casa tem endereço</h2>
                <p className="section-heading__note">
                  Chegou a hora de encher de gente.
                </p>
              </header>

              <div className="ww__when" data-reveal-item>
                <p className="eyebrow">Quando</p>
                <p className="date-lockup">
                  <span className="date-lockup__weekday">{event.weekday}</span>
                  <span className="date-lockup__day">{event.day}</span>
                  <span className="date-lockup__month">{event.monthYear}</span>
                </p>
                <p className="date-lockup__hour">
                  <time dateTime={event.dateTime}>{event.time}</time>
                </p>

                {/* Versão de celular. Só uma das duas fica visível, e
                    `display: none` também a tira do leitor de tela — ninguém
                    ouve a data duas vezes. */}
                <p className="date-compact">
                  <time className="date-compact__main" dateTime={event.dateTime}>
                    {event.compactDate}
                  </time>
                  <span className="date-compact__note">
                    {event.compactDateNote}
                  </span>
                </p>

                <p className="ww__note">{event.whenNote}</p>
              </div>
            </div>

            <div className="place" data-reveal-item>
              <iframe
                className="place__map"
                src={sharedEvent.mapEmbedUrl}
                title={`Mapa de ${sharedEvent.address}, ${sharedEvent.neighborhood}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              <div className="place__body">
                <p className="eyebrow eyebrow--dark">Onde</p>
                <h3 className="place__venue">
                  {sharedEvent.address}
                  <span>{sharedEvent.neighborhood}</span>
                </h3>
                <a
                  className="place__cta"
                  href={sharedEvent.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no mapa <i aria-hidden="true">↗</i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rsvp" id="confirmacao" aria-labelledby="rsvp-title" data-reveal>
        <div className="rsvp__inner">
          <BotanicalMark className="rsvp__sprig" />
          <p className="eyebrow eyebrow--dark" data-reveal-item>
            {event.rsvpEyebrow}
          </p>
          <h2 className="rsvp__title" id="rsvp-title" data-reveal-item>
            {event.rsvpTitle}
          </h2>
          <p className="rsvp__lead" data-reveal-item>
            {event.rsvpCopy}
          </p>
          <a
            className="btn btn--whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-reveal-item
          >
            <WhatsAppIcon className="btn__icon" width={18} height={18} />
            {event.rsvpLabel}
          </a>
          <p className="rsvp__note" data-reveal-item>
            {event.rsvpNote}
          </p>
        </div>
      </section>

      <section className="section gifts" id="presentes" aria-labelledby="gifts-title" data-reveal>
        <div className="container">
          <header className="section-heading" data-reveal-item>
            <p className="eyebrow">Se quiser presentear</p>
            <h2 id="gifts-title">Listas de presente</h2>
            <p className="section-heading__note">
              São três caminhos, sem preferência entre eles. Sua presença já
              resolve a festa; o resto é bônus.
            </p>
          </header>

          {/* Os três caminhos têm o mesmo peso: nenhum é apresentado como
              preferido. */}
          <ul className="ways" data-reveal-item>
            {giftLists.map((list) => (
              <li className={`way way--${list.tone}`} key={list.name}>
                <span className="way__label">{list.label}</span>
                {/* A marca fica dentro do h3: a hierarquia de cabeçalho
                    permanece e o nome acessível vem do alt. */}
                <h3 className="way__name">
                  {list.logo ? (
                    <span className="way__chip">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={list.logo} alt={list.name} loading="lazy" />
                    </span>
                  ) : (
                    list.name
                  )}
                </h3>
                <p className="way__desc">{list.description}</p>
                {/* Link e aviso não são alternativas: a Casa Maria tem os dois,
                    porque o site dela mostra a lista mas não a vende. */}
                {list.action && (
                  <a
                    className="way__go"
                    href={list.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {list.action} <i aria-hidden="true">↗</i>
                  </a>
                )}
                {list.note && <span className="way__tag">{list.note}</span>}
              </li>
            ))}

            {pix && (
              <PixCard
                holder={pix.holder}
                kind={pix.kind}
                logo={pix.logo}
                pixKey={pix.key}
              />
            )}
          </ul>

          <IndividualGiftList displayName={displayName} />
        </div>
      </section>

      <footer className="footer" data-reveal>
        <BotanicalMark className="footer__sprig" />
        <blockquote className="footer__quote" data-reveal-item>
          <p>Casa é onde a gente volta — e onde cabe mais um lugar à mesa.</p>
        </blockquote>
        <hr className="footer__rule" />
        <p className="footer__signature" data-reveal-item>
          Leonardo
        </p>
        <p className="footer__place" data-reveal-item>
          {sharedEvent.city} · 2026
        </p>
      </footer>
    </main>
  );
}
