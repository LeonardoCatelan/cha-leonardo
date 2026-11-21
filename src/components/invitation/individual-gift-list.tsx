"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Database } from "@/types/database.types";

type GiftReservation = {
  id: string;
  quantity: number;
  status: "purchased" | "reserved";
};

type GiftItem = {
  active: boolean;
  description: string | null;
  id: string;
  myReservation: GiftReservation | null;
  name: string;
  quantityAvailable: number;
  quantityPurchased: number;
  quantityReserved: number;
  quantityTotal: number;
  referenceUrl: string | null;
  sortOrder: number;
};

type RealtimeConfig = { key: string; url: string };

type GiftListResponse = {
  error?: string;
  items?: GiftItem[];
  realtime?: RealtimeConfig | null;
};

type GiftFilter = "all" | "free" | "mine";
type GiftState = "available" | "mine" | "purchased" | "taken";

type IndividualGiftListProps = {
  displayName: string;
};

const filters: { label: string; value: GiftFilter }[] = [
  { label: "Tudo", value: "all" },
  { label: "Disponíveis", value: "free" },
  { label: "Minhas escolhas", value: "mine" },
];

function giftState(item: GiftItem): GiftState {
  if (item.myReservation?.status === "purchased") return "purchased";
  if (item.myReservation) return "mine";
  return item.quantityAvailable < 1 ? "taken" : "available";
}

function maximumSelectable(item: GiftItem) {
  const ownedReserved =
    item.myReservation?.status === "reserved" ? item.myReservation.quantity : 0;
  return Math.min(20, item.quantityAvailable + ownedReserved);
}

function statusText(item: GiftItem, state: GiftState) {
  const reservation = item.myReservation;

  if (state === "purchased" && reservation) {
    return `${reservation.quantity} ${reservation.quantity === 1 ? "unidade comprada" : "unidades compradas"} · compra confirmada`;
  }
  if (state === "mine" && reservation) {
    return `${reservation.quantity} ${reservation.quantity === 1 ? "unidade reservada" : "unidades reservadas"} por você`;
  }
  if (state === "taken") return "Escolhido por outro convidado";
  if (item.quantityTotal > 1) {
    return `${item.quantityAvailable} de ${item.quantityTotal} disponíveis`;
  }
  return "Disponível";
}

export function IndividualGiftList({ displayName }: IndividualGiftListProps) {
  const router = useRouter();
  const [items, setItems] = useState<GiftItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GiftFilter>("all");
  const [realtime, setRealtime] = useState<RealtimeConfig | null>(null);
  // Presente cujo seletor de quantidade está aberto. Nada foi gravado ainda:
  // enquanto ele está aqui, a reserva só existe na tela.
  const [choosingId, setChoosingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const response = await fetch("/api/gifts", { cache: "no-store" });
      const data = (await response.json()) as GiftListResponse;

      // A sessão caiu ou foi revogada: o servidor volta a exibir o portão.
      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (!response.ok || !data.items) throw new Error(data.error);

      const next = data.items;
      setItems(next);
      // A configuração chega igual em toda resposta, mas num objeto novo. Trocar
      // o estado por causa disso derrubaria e reabriria o canal do Realtime a
      // cada carga — inclusive nas de 30 em 30 segundos —, e mudanças que
      // caíssem na janela entre uma inscrição e outra se perderiam.
      setRealtime((current) => {
        const config = data.realtime ?? null;
        if (!config) return current === null ? current : null;
        return current?.key === config.key && current.url === config.url
          ? current
          : config;
      });
      setQuantities((current) =>
        Object.fromEntries(
          next.map((item) => {
            const maximum = Math.max(1, maximumSelectable(item));
            const preferred =
              current[item.id] ?? item.myReservation?.quantity ?? 1;
            return [item.id, Math.min(Math.max(1, preferred), maximum)];
          }),
        ),
      );
    } catch {
      setMessage("A lista não pôde ser carregada. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadItems(), 0);
    // Aba escondida não precisa de lista atualizada: a volta para ela já dispara
    // uma carga logo abaixo. Sem essa checagem, cada convidado com o convite
    // aberto em segundo plano continuaria consultando o servidor a cada 30s.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadItems();
    }, 30_000);
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void loadItems();
    };
    document.addEventListener("visibilitychange", refreshVisible);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [loadItems]);

  useEffect(() => {
    if (!realtime) return;

    const supabase = createClient<Database>(realtime.url, realtime.key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const channel = supabase
      .channel("public-gifts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gifts" },
        () => void loadItems(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadItems, realtime]);

  useEffect(() => {
    if (!claimedId) return;
    const clear = window.setTimeout(() => setClaimedId(null), 900);
    return () => window.clearTimeout(clear);
  }, [claimedId]);

  useEffect(() => {
    if (!message) return;
    const clear = window.setTimeout(() => setMessage(""), 5_000);
    return () => window.clearTimeout(clear);
  }, [message]);

  const visible = useMemo(() => {
    if (filter === "free") {
      return items.filter((item) => giftState(item) === "available");
    }
    if (filter === "mine") return items.filter((item) => item.myReservation);
    return items;
  }, [filter, items]);

  function changeQuantity(item: GiftItem, delta: number) {
    const maximum = maximumSelectable(item);
    setQuantities((current) => ({
      ...current,
      [item.id]: Math.min(Math.max(1, (current[item.id] ?? 1) + delta), maximum),
    }));
  }

  /**
   * Reservar acontece em dois tempos: o primeiro toque abre o seletor e não
   * grava nada, o segundo grava a quantidade escolhida. Antes o primeiro toque
   * já reservava uma unidade, e quem queria duas descobria isso depois,
   * corrigindo uma reserva que nunca pediu.
   *
   * Presente com uma unidade disponível é a exceção: não há o que escolher, e
   * um seletor travado em 1 só acrescentaria um toque para dizer o óbvio.
   */
  function reserve(item: GiftItem) {
    if (maximumSelectable(item) <= 1) {
      void saveReservation(item, 1);
      return;
    }
    if (choosingId === item.id) {
      void saveReservation(item, quantities[item.id] ?? 1);
      return;
    }

    // A escolha começa sempre em 1, e não no número que sobrou de uma abertura
    // anterior que a pessoa cancelou.
    setQuantities((current) => ({ ...current, [item.id]: 1 }));
    setChoosingId(item.id);
    setMessage("");
  }

  // Um seletor aberto num presente que sai da vista pelo filtro voltaria aberto
  // depois. Some junto com a mudança que o escondeu.
  function changeFilter(next: GiftFilter) {
    setFilter(next);
    setChoosingId(null);
  }

  async function saveReservation(item: GiftItem, quantity: number) {
    setPendingId(item.id);
    setMessage("");

    try {
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: item.myReservation ? "setQuantity" : "reserve",
          id: item.id,
          quantity,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      setClaimedId(item.id);
      // Só fecha o seletor quando o servidor aceitou. Se a quantidade não
      // couber mais, ele continua aberto no número que a pessoa escolheu,
      // pronto para ajustar.
      setChoosingId(null);
      setMessage(
        item.myReservation
          ? `${item.name}: agora são ${quantity} ${quantity === 1 ? "unidade" : "unidades"}.`
          : `${quantity} ${quantity === 1 ? "unidade" : "unidades"} de ${item.name} ${quantity === 1 ? "reservada" : "reservadas"} para ${displayName}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível salvar sua escolha.",
      );
    } finally {
      setPendingId(null);
      await loadItems();
    }
  }

  async function updateReservation(
    item: GiftItem,
    action: "confirm" | "release",
  ) {
    setPendingId(item.id);
    setMessage("");

    try {
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: item.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      if (action === "confirm") setClaimedId(item.id);
      setMessage(
        action === "release"
          ? `${item.name} voltou para a lista.`
          : `Compra de ${item.name} confirmada. Obrigado pelo carinho!`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível atualizar sua escolha.",
      );
    } finally {
      setPendingId(null);
      await loadItems();
    }
  }

  return (
    // O título e a explicação ficam no cabeçalho da seção, que agora é a
    // própria lista — repetir aqui seria dizer "Lista de presentes" duas vezes.
    <div className="ledger" id="lista-presentes">
      <div className="ledger__filters" role="group" aria-label="Filtrar lista">
        {filters.map((option) => (
          <button
            className="chip"
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => changeFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ul className="rows" aria-busy="true" aria-label="Carregando a lista">
          {[0, 1, 2, 3].map((index) => (
            <li className="row row--skeleton" key={index} aria-hidden="true">
              <span className="row__mark" />
              <div className="row__body">
                <span className="skel skel--title" />
                <span className="skel skel--meta" />
              </div>
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <p className="ledger__empty">
          {items.length === 0
            ? "A lista de presentes ainda está vazia."
            : filter === "mine"
              ? "Você ainda não escolheu nenhum presente."
              : "Nenhum presente disponível no momento."}
        </p>
      ) : (
        <ul className="rows">
          {visible.map((item, index) => {
            const state = giftState(item);
            const reservation = item.myReservation;
            const isPending = pendingId === item.id;
            const selected = quantities[item.id] ?? 1;
            const maximum = maximumSelectable(item);
            const quantityChanged =
              state === "mine" && reservation?.quantity !== selected;
            // Se o presente foi levado por outra pessoa enquanto o seletor
            // estava aberto, ele não fica aberto sobre uma linha esgotada.
            const choosing = state === "available" && choosingId === item.id;

            return (
              <li
                className="row"
                data-state={state}
                data-choosing={choosing || undefined}
                data-pending={isPending || undefined}
                data-claimed={claimedId === item.id || undefined}
                style={{ "--i": index } as React.CSSProperties}
                key={item.id}
              >
                <span className="row__mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    {state === "mine" && <circle cx="12" cy="12" r="4.5" />}
                    {state === "purchased" && (
                      <path d="m6.5 12.5 3.5 3.5 7.5-8" pathLength={1} />
                    )}
                    {state === "taken" && <path d="M7.5 16.5 16.5 7.5" />}
                  </svg>
                </span>

                <div className="row__body">
                  <h3 className="row__name">{item.name}</h3>
                  {item.description && state !== "taken" && (
                    <p className="row__desc">{item.description}</p>
                  )}
                  <p className="row__meta" id={`gs-${item.id}`}>
                    <span className="row__status">{statusText(item, state)}</span>
                    {item.referenceUrl && (
                      <a
                        className="row__link"
                        href={item.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver sugestão de ${item.name} — é só uma referência, compre onde preferir`}
                      >
                        Ver sugestão
                      </a>
                    )}
                  </p>
                </div>

                <div className="row__act">
                  {state === "available" && (
                    <button
                      // Escolhendo, o rótulo é longo e precisa aparecer inteiro:
                      // sem `btn--reserve` ele deixa de virar o alvo circular do
                      // celular, que esconde o texto.
                      className={`btn btn--solid${choosing ? "" : " btn--reserve"}`}
                      type="button"
                      onClick={() => reserve(item)}
                      disabled={isPending}
                      aria-describedby={`gs-${item.id}`}
                      aria-expanded={maximum > 1 ? choosing : undefined}
                      aria-label={
                        choosing
                          ? `Reservar ${selected} ${selected === 1 ? "unidade" : "unidades"} de ${item.name}`
                          : `Reservar ${item.name}`
                      }
                    >
                      {choosing ? (
                        <span className="btn__label">
                          Reservar {selected}{" "}
                          {selected === 1 ? "unidade" : "unidades"}
                        </span>
                      ) : (
                        <>
                          <span className="btn__glyph" aria-hidden="true">
                            +
                          </span>
                          <span className="btn__label">Reservar</span>
                        </>
                      )}
                    </button>
                  )}
                  {state === "mine" && (
                    <button
                      className="btn btn--solid"
                      type="button"
                      onClick={() => updateReservation(item, "confirm")}
                      disabled={isPending || quantityChanged}
                    >
                      Confirmar que comprei
                    </button>
                  )}
                  {state === "purchased" && (
                    <button
                      className="btn btn--cancel"
                      type="button"
                      onClick={() => updateReservation(item, "release")}
                      disabled={isPending}
                    >
                      Cancelar escolha
                    </button>
                  )}
                </div>

                {/* A gaveta abre sozinha quando o presente é seu: quem reservou
                    já está decidindo quantidade, não navegando. Escolhendo, ela
                    é o próprio seletor — a reserva ainda não existe. */}
                <div
                  className={`row__drawer${choosing || state === "mine" ? " is-open" : ""}`}
                >
                  <div className="row__drawer-clip">
                    <div className="row__drawer-inner">
                      <div
                        className="stepper"
                        role="group"
                        aria-label={`Quantidade de ${item.name}`}
                      >
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, -1)}
                          disabled={selected <= 1 || isPending}
                          aria-label={`Diminuir quantidade de ${item.name}`}
                        >
                          −
                        </button>
                        <span className="stepper__value" aria-hidden="true">
                          <span key={selected}>{selected}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, 1)}
                          disabled={selected >= maximum || isPending}
                          aria-label={`Aumentar quantidade de ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      {choosing ? (
                        <button
                          className="btn btn--quiet"
                          type="button"
                          onClick={() => setChoosingId(null)}
                          disabled={isPending}
                        >
                          Cancelar
                        </button>
                      ) : (
                        <>
                          {quantityChanged && (
                            <button
                              className="btn btn--solid"
                              type="button"
                              onClick={() => saveReservation(item, selected)}
                              disabled={isPending}
                            >
                              Atualizar quantidade
                            </button>
                          )}
                          <button
                            className="btn btn--cancel"
                            type="button"
                            onClick={() => updateReservation(item, "release")}
                            disabled={isPending}
                          >
                            Cancelar reserva
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {message && (
        <p className="toast" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
