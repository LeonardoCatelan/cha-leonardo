"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { buildInvitationMessage } from "@/lib/invitation-message";

type AudienceFilter = "todos" | "familia" | "amigos";

const audienceFilters: { label: string; value: AudienceFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Família", value: "familia" },
  { label: "Amigos", value: "amigos" },
];

// Só contagens: quem escolheu o quê fica na página /reservas.
type ReservationSummary = {
  purchased: number;
  reserved: number;
};

type ManagedInvitation = {
  audience: "amigos" | "familia";
  code: string;
  codeHint: string;
  confirmed: boolean;
  confirmedAt: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  reservations: ReservationSummary;
  sent: boolean;
  sentAt: string | null;
  sessionVersion: number;
};

type InvitationResponse = {
  error?: string;
  invitations?: ManagedInvitation[];
};

type Status = "loading" | "ready" | "error";

type InvitationManagerProps = {
  onCount?: (total: number) => void;
};

function invitationLink(invitation: ManagedInvitation) {
  if (typeof window === "undefined" || !invitation.code) return "";
  const path = invitation.audience === "amigos" ? "/amigos" : "/familia";
  return `${window.location.origin}${path}#convite=${invitation.code}`;
}

export function InvitationManager({ onCount }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<ManagedInvitation[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [displayName, setDisplayName] = useState("");
  const [audience, setAudience] =
    useState<ManagedInvitation["audience"]>("familia");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<AudienceFilter>("todos");
  const [query, setQuery] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // `onCount` sai das dependências por referência. Ele avisa a contagem para
  // quem renderiza este painel, então mantê-lo como dependência de `request`
  // faria a carga inicial se reagendar toda vez que o pai re-renderizasse — e
  // é a própria carga que provoca esse re-render.
  const onCountRef = useRef(onCount);
  useEffect(() => {
    onCountRef.current = onCount;
  });

  const request = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/invitations/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as InvitationResponse;
    if (!response.ok || !data.invitations) {
      throw new Error(data.error || "Não foi possível carregar os convites.");
    }
    setInvitations(data.invitations);
    onCountRef.current?.(data.invitations.length);
    return data.invitations;
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void request({ action: "list" })
        .then(() => setStatus("ready"))
        .catch((error: unknown) => {
          setStatus("error");
          setToast({
            text:
              error instanceof Error ? error.message : "Não foi possível carregar.",
            error: true,
          });
        });
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [request]);

  useEffect(() => {
    if (!toast || toast.error) return;
    const clear = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(clear);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const clear = window.setTimeout(() => setCopied(null), 1_800);
    return () => window.clearTimeout(clear);
  }, [copied]);

  const counts = useMemo(
    () => ({
      todos: invitations.length,
      familia: invitations.filter((item) => item.audience === "familia").length,
      amigos: invitations.filter((item) => item.audience === "amigos").length,
    }),
    [invitations],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/-/g, "");
    return invitations
      .filter((item) => filter === "todos" || item.audience === filter)
      .filter((item) => {
        if (!term) return true;
        return (
          item.displayName.toLowerCase().includes(term) ||
          item.code.toLowerCase().replace(/-/g, "").includes(term)
        );
      });
  }, [filter, invitations, query]);

  const confirmedCount = useMemo(
    () => visible.filter((item) => item.confirmed).length,
    [visible],
  );

  const sentCount = useMemo(
    () => visible.filter((item) => item.sent).length,
    [visible],
  );

  // Uma confirmação de exclusão pendurada num convite que sai da vista pelo
  // filtro voltaria armada depois. Some junto com a mudança que a escondeu.
  function changeFilter(next: AudienceFilter) {
    setFilter(next);
    setConfirmingDelete(null);
  }

  function changeQuery(next: string) {
    setQuery(next);
    setConfirmingDelete(null);
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setToast(null);

    try {
      await request({ action: "create", audience, displayName });
      setToast({ text: `Convite de ${displayName} criado.` });
      setDisplayName("");
    } catch (error) {
      setToast({
        text: error instanceof Error ? error.message : "Não foi possível criar.",
        error: true,
      });
    } finally {
      setPending(null);
    }
  }

  async function act(
    invitation: ManagedInvitation,
    action: "setConfirmed" | "setSent" | "delete",
  ) {
    setPending(`${action}:${invitation.id}`);
    setToast(null);

    try {
      await request({
        action,
        confirmed:
          action === "setConfirmed" ? !invitation.confirmed : undefined,
        id: invitation.id,
        sent: action === "setSent" ? !invitation.sent : undefined,
      });
      setConfirmingDelete(null);
      setToast({
        text:
          action === "delete"
            ? `${invitation.displayName} foi excluído.`
            : action === "setSent"
              ? invitation.sent
                ? `${invitation.displayName} voltou para os convites a enviar.`
                : `Convite de ${invitation.displayName} marcado como enviado.`
              : invitation.confirmed
                ? `${invitation.displayName} deixou de estar confirmado.`
                : `${invitation.displayName} confirmou presença.`,
      });
    } catch (error) {
      setToast({
        text:
          error instanceof Error ? error.message : "Não foi possível atualizar.",
        error: true,
      });
    } finally {
      setPending(null);
    }
  }

  async function copy(
    invitation: ManagedInvitation,
    kind: "code" | "link" | "message",
  ) {
    const link = invitationLink(invitation);
    // Sem código não há link, e sem link a mensagem sairia convidando para
    // lugar nenhum. Os três casos caem no mesmo aviso.
    const value =
      kind === "code"
        ? invitation.code
        : kind === "link" || !link
          ? link
          : buildInvitationMessage({
              audience: invitation.audience,
              code: invitation.code,
              displayName: invitation.displayName,
              link,
            });

    if (!value) {
      // Sem a troca de código, um convite ilegível não tem conserto na tela: o
      // caminho é excluir e criar outro. Dizer isso é melhor do que mandar
      // procurar um botão que não existe mais.
      setToast({
        text: "Este convite perdeu o código. Exclua e crie outro no lugar.",
        error: true,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${kind}:${invitation.id}`);
    } catch {
      setToast({ text: "Não foi possível copiar.", error: true });
    }
  }

  return (
    <div className="adm-panel">
      <div className="adm-create" data-open={creating || invitations.length === 0}>
        <button
          className="adm-create__toggle"
          type="button"
          aria-expanded={creating || invitations.length === 0}
          onClick={() => setCreating((value) => !value)}
        >
          <span aria-hidden="true">+</span> Novo convite
        </button>
        <div className="adm-create__panel">
          <div>
            <form className="adm-create__form" onSubmit={createInvitation}>
              <label>
                <span>Nome no convite</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ex.: Família Oliveira"
                  maxLength={80}
                  required
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={audience}
                  onChange={(event) =>
                    setAudience(
                      event.target.value as ManagedInvitation["audience"],
                    )
                  }
                >
                  <option value="familia">Família</option>
                  <option value="amigos">Amigos</option>
                </select>
              </label>
              <button
                className="btn btn--solid"
                type="submit"
                disabled={pending === "create"}
              >
                {pending === "create" ? "Gerando…" : "Gerar convite"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="adm-tools">
        <div className="seg" role="group" aria-label="Filtrar por tipo">
          {audienceFilters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => changeFilter(option.value)}
            >
              {option.label}
              <span>{counts[option.value]}</span>
            </button>
          ))}
        </div>
        <label className="adm-search">
          <span className="sr-only">Buscar convite</span>
          <input
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Buscar nome ou código"
          />
        </label>
      </div>

      {status === "ready" && visible.length > 0 && (
        <p className="adm-stat">
          <strong>{sentCount}</strong> de {visible.length} com convite enviado ·{" "}
          <strong>{confirmedCount}</strong> com presença confirmada
        </p>
      )}

      {status === "loading" ? (
        <ul className="adm-list" aria-busy="true" aria-label="Carregando convites">
          {[0, 1, 2].map((index) => (
            <li className="adm-row adm-row--skeleton" key={index} aria-hidden="true">
              <span className="skel skel--box" />
              <span className="skel skel--line" />
              <span className="skel skel--code" />
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="adm-empty">
          <strong>
            {invitations.length === 0
              ? "Nenhum convite ainda."
              : "Nada encontrado."}
          </strong>
          <p>
            {invitations.length === 0
              ? "Comece pelo primeiro nome acima."
              : "Ajuste a busca ou o filtro."}
          </p>
        </div>
      ) : (
        <ul className="adm-list">
          {visible.map((invitation) => {
            const { purchased, reserved } = invitation.reservations;
            const busy = pending === `setConfirmed:${invitation.id}`;

            if (confirmingDelete === invitation.id) {
              return (
                <li className="adm-row adm-row--danger" key={invitation.id}>
                  <p>
                    Excluir <strong>{invitation.displayName}</strong> apaga o
                    acesso e devolve {reserved + purchased}{" "}
                    {reserved + purchased === 1 ? "unidade" : "unidades"} para a
                    lista. Não dá para desfazer.
                  </p>
                  <div>
                    <button
                      className="btn btn--danger"
                      type="button"
                      onClick={() => act(invitation, "delete")}
                      disabled={pending === `delete:${invitation.id}`}
                    >
                      {pending === `delete:${invitation.id}`
                        ? "Excluindo…"
                        : "Excluir"}
                    </button>
                    <button
                      className="btn btn--quiet"
                      type="button"
                      onClick={() => setConfirmingDelete(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li
                className={`adm-row${invitation.confirmed ? " is-confirmed" : ""}`}
                key={invitation.id}
              >
                <button
                  className="adm-check"
                  type="button"
                  role="switch"
                  aria-checked={invitation.confirmed}
                  aria-label={`Presença de ${invitation.displayName}`}
                  data-busy={busy || undefined}
                  onClick={() => act(invitation, "setConfirmed")}
                >
                  <span className="adm-check__box" aria-hidden="true">
                    <svg viewBox="0 0 16 16" focusable="false">
                      <path d="M3 8.4l3.2 3.2L13 4.8" pathLength={1} />
                    </svg>
                  </span>
                </button>

                <div className="adm-row__name">
                  <strong>{invitation.displayName}</strong>
                  <span>
                    {invitation.audience === "familia" ? "Família" : "Amigos"}
                  </span>
                </div>

                <button
                  className="adm-code"
                  type="button"
                  onClick={() => copy(invitation, "code")}
                  data-copied={copied === `code:${invitation.id}` || undefined}
                  aria-label={`Copiar código ${invitation.code} de ${invitation.displayName}`}
                >
                  {invitation.code ? (
                    <>
                      <b>{invitation.code.slice(0, 4)}</b>
                      <i aria-hidden="true">·</i>
                      <b>{invitation.code.slice(5)}</b>
                    </>
                  ) : (
                    <span className="adm-code__lost">••••·{invitation.codeHint}</span>
                  )}
                </button>

                <p className="adm-row__gifts">
                  {reserved > 0 && (
                    <span>
                      <b>{reserved}</b> reservado
                    </span>
                  )}
                  {purchased > 0 && (
                    <span className="is-done">
                      <b>{purchased}</b> comprado
                    </span>
                  )}
                  {reserved + purchased === 0 && (
                    <span className="is-empty">—</span>
                  )}
                </p>

                <div className="adm-row__more">
                  {/* Primeiro da fila: é o que o casal usa para efetivamente
                      convidar alguém. O link sozinho fica ao lado, para quando
                      a mensagem já foi mandada e falta só o endereço. */}
                  <button
                    className="btn btn--quiet is-primary"
                    type="button"
                    onClick={() => copy(invitation, "message")}
                    aria-label={`Copiar mensagem de convite de ${invitation.displayName} para o WhatsApp`}
                  >
                    {copied === `message:${invitation.id}`
                      ? "Copiado"
                      : "Mensagem"}
                  </button>
                  <button
                    className="btn btn--quiet"
                    type="button"
                    onClick={() => copy(invitation, "link")}
                  >
                    {copied === `link:${invitation.id}` ? "Copiado" : "Link"}
                  </button>
                  {/* Marcação manual: nada aqui adivinha que a mensagem foi
                      mandada, porque o envio acontece no WhatsApp pessoal e o
                      site não tem como saber. */}
                  <button
                    className={`btn btn--quiet${invitation.sent ? " is-done" : ""}`}
                    type="button"
                    aria-pressed={invitation.sent}
                    onClick={() => act(invitation, "setSent")}
                    disabled={pending === `setSent:${invitation.id}`}
                  >
                    {pending === `setSent:${invitation.id}`
                      ? "…"
                      : invitation.sent
                        ? "Enviado"
                        : "Marcar enviado"}
                  </button>
                  <button
                    className="btn btn--quiet is-danger"
                    type="button"
                    onClick={() => setConfirmingDelete(invitation.id)}
                  >
                    Excluir
                  </button>
                </div>

              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <p
          className="toast"
          data-tone={toast.error ? "error" : undefined}
          role={toast.error ? "alert" : "status"}
          aria-live="polite"
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
