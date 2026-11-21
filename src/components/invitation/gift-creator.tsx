"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type GiftItem = {
  description: string | null;
  id: string;
  name: string;
  quantityAvailable: number;
  quantityPurchased: number;
  quantityReserved: number;
  quantityTotal: number;
  referenceUrl: string | null;
};

type GiftDraft = {
  description: string;
  name: string;
  quantityTotal: number;
  referenceUrl: string;
};

type Status = "loading" | "ready" | "error";

type GiftCreatorProps = {
  onCount?: (total: number) => void;
};

const emptyDraft: GiftDraft = {
  description: "",
  name: "",
  quantityTotal: 1,
  referenceUrl: "",
};

/** Abaixo disso o banco recusa: são unidades que convidados já escolheram. */
function minimumQuantity(item: GiftItem) {
  return Math.max(1, item.quantityReserved + item.quantityPurchased);
}

export function GiftCreator({ onCount }: GiftCreatorProps) {
  const [items, setItems] = useState<GiftItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<GiftDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GiftDraft>(emptyDraft);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
    null,
  );
  // Separado por operação: editar um presente não pode travar o formulário de
  // criação, que é o que acontecia com uma flag única.
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const request = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      error?: string;
      items?: GiftItem[];
    };
    if (!response.ok) throw new Error(data.error);
    return data;
  }, []);

  // `onCount` sai das dependências por referência. Ele avisa a contagem para
  // quem renderiza este painel, então mantê-lo como dependência de `loadItems`
  // faria a carga inicial se reagendar toda vez que o pai re-renderizasse — e
  // é a própria carga que provoca esse re-render.
  const onCountRef = useRef(onCount);
  useEffect(() => {
    onCountRef.current = onCount;
  });

  const loadItems = useCallback(async () => {
    const data = await request({ action: "adminList" });
    setItems(data.items ?? []);
    onCountRef.current?.(data.items?.length ?? 0);
  }, [request]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadItems()
        .then(() => setStatus("ready"))
        .catch((error: unknown) => {
          setStatus("error");
          setToast({
            text:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os presentes.",
            error: true,
          });
        });
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadItems]);

  useEffect(() => {
    if (!toast || toast.error) return;
    const clear = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(clear);
  }, [toast]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setToast(null);

    try {
      await request({
        action: "add",
        description: draft.description,
        name: draft.name,
        quantityTotal: draft.quantityTotal,
        referenceUrl: draft.referenceUrl,
      });
      setDraft(emptyDraft);
      setToast({ text: "Presente criado. Já aparece na lista dos convidados." });
      await loadItems();
    } catch (error) {
      setToast({
        text:
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível adicionar o item.",
        error: true,
      });
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(item: GiftItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId(item.id);
    setToast(null);

    try {
      await request({
        action: "update",
        description: editDraft.description,
        id: item.id,
        name: editDraft.name,
        quantityTotal: editDraft.quantityTotal,
        referenceUrl: editDraft.referenceUrl,
      });
      setEditingId(null);
      setToast({ text: `${editDraft.name} foi atualizado.` });
      await loadItems();
    } catch (error) {
      setToast({
        text:
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível salvar as alterações.",
        error: true,
      });
    } finally {
      setSavingId(null);
    }
  }

  async function archiveItem(item: GiftItem) {
    setSavingId(item.id);
    try {
      await request({ action: "archive", id: item.id });
      setEditingId(null);
      setToast({ text: `${item.name} saiu da lista dos convidados.` });
      await loadItems();
    } catch (error) {
      setToast({
        text:
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível arquivar.",
        error: true,
      });
    } finally {
      setSavingId(null);
    }
  }

  function startEditing(item: GiftItem) {
    setEditingId(item.id);
    setEditDraft({
      description: item.description ?? "",
      name: item.name,
      quantityTotal: item.quantityTotal,
      referenceUrl: item.referenceUrl ?? "",
    });
    setToast(null);
  }

  return (
    <div className="adm-panel">
      <div className="adm-create" data-open={formOpen || items.length === 0}>
        <button
          className="adm-create__toggle"
          type="button"
          aria-expanded={formOpen || items.length === 0}
          onClick={() => setFormOpen((value) => !value)}
        >
          <span aria-hidden="true">+</span> Novo presente
        </button>
        <div className="adm-create__panel">
          <div>
            <form className="adm-create__form adm-create__form--gift" onSubmit={addItem}>
              <label className="adm-field--wide">
                <span>Nome do presente</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Ex.: Panela elétrica"
                  maxLength={80}
                  required
                />
              </label>
              <label>
                <span>Quantidade</span>
                <input
                  type="number"
                  value={draft.quantityTotal}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      quantityTotal: Number(event.target.value),
                    })
                  }
                  min={1}
                  max={999}
                  required
                />
              </label>
              <label className="adm-field--full">
                <span>Descrição opcional</span>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  placeholder="Ex.: Pode ser de qualquer loja."
                  maxLength={500}
                />
              </label>
              <label className="adm-field--full">
                <span>Link de referência opcional</span>
                <input
                  type="url"
                  value={draft.referenceUrl}
                  onChange={(event) =>
                    setDraft({ ...draft, referenceUrl: event.target.value })
                  }
                  placeholder="https://loja.com.br/produto"
                  maxLength={2048}
                  inputMode="url"
                  spellCheck={false}
                />
              </label>
              <button className="btn btn--solid" type="submit" disabled={creating}>
                {creating ? "Criando…" : "Criar presente"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {status === "loading" ? (
        <ul className="adm-list" aria-busy="true" aria-label="Carregando presentes">
          {[0, 1, 2].map((index) => (
            <li className="adm-row adm-row--skeleton" key={index} aria-hidden="true">
              <span className="skel skel--line" />
              <span className="skel skel--code" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="adm-empty">
          <strong>Nenhum presente ainda.</strong>
          <p>Cadastre o primeiro no formulário acima.</p>
        </div>
      ) : (
        <ul className="adm-list adm-list--gifts">
          {items.map((item) => {
            const chosen = item.quantityReserved + item.quantityPurchased;
            const busy = savingId === item.id;

            if (editingId === item.id) {
              return (
                <li className="adm-row adm-row--editing" key={item.id}>
                  <form className="adm-edit" onSubmit={(event) => saveEdit(item, event)}>
                    <div className="adm-edit__grid">
                      <label className="adm-field--wide">
                        <span>Nome</span>
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, name: event.target.value })
                          }
                          maxLength={80}
                          required
                        />
                      </label>
                      <label>
                        <span>Quantidade</span>
                        <input
                          type="number"
                          value={editDraft.quantityTotal}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              quantityTotal: Number(event.target.value),
                            })
                          }
                          min={minimumQuantity(item)}
                          max={999}
                          required
                        />
                      </label>
                      <label className="adm-field--full">
                        <span>Descrição</span>
                        <input
                          type="text"
                          value={editDraft.description}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              description: event.target.value,
                            })
                          }
                          maxLength={500}
                        />
                      </label>
                      <label className="adm-field--full">
                        <span>Link de referência opcional</span>
                        <input
                          type="url"
                          value={editDraft.referenceUrl}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              referenceUrl: event.target.value,
                            })
                          }
                          placeholder="https://loja.com.br/produto"
                          maxLength={2048}
                          inputMode="url"
                          spellCheck={false}
                        />
                      </label>
                    </div>

                    {chosen > 0 && (
                      <p className="adm-edit__hint">
                        {chosen}{" "}
                        {chosen === 1
                          ? "unidade já foi escolhida"
                          : "unidades já foram escolhidas"}
                        ; o mínimo é {minimumQuantity(item)}.
                      </p>
                    )}

                    <div className="adm-edit__actions">
                      <button className="btn btn--solid" type="submit" disabled={busy}>
                        {busy ? "Salvando…" : "Salvar"}
                      </button>
                      <button
                        className="btn btn--quiet"
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                      >
                        Cancelar
                      </button>
                      <button
                        className="btn btn--quiet is-danger"
                        type="button"
                        onClick={() => archiveItem(item)}
                        disabled={busy}
                      >
                        Arquivar da lista
                      </button>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li
                className={`adm-row${item.quantityAvailable === 0 ? " is-out" : ""}`}
                key={item.id}
              >
                <div className="adm-row__name">
                  <strong>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                  {item.referenceUrl && (
                    <a
                      className="adm-row__link"
                      href={item.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver sugestão ↗
                    </a>
                  )}
                </div>

                <div className="adm-meter">
                  <div
                    className="adm-meter__bar"
                    role="img"
                    aria-label={`${item.quantityPurchased} comprados, ${item.quantityReserved} reservados, ${item.quantityAvailable} livres de ${item.quantityTotal}`}
                  >
                    <span
                      className="adm-meter__seg is-purchased"
                      style={{ flexGrow: item.quantityPurchased }}
                    />
                    <span
                      className="adm-meter__seg is-reserved"
                      style={{ flexGrow: item.quantityReserved }}
                    />
                    <span style={{ flexGrow: item.quantityAvailable }} />
                  </div>
                  <span className="adm-meter__label">
                    {item.quantityAvailable === 0 ? (
                      "Esgotado na lista"
                    ) : (
                      <>
                        <b>{item.quantityAvailable}</b> de {item.quantityTotal}{" "}
                        livres
                      </>
                    )}
                  </span>
                </div>

                <div className="adm-row__more">
                  <button
                    className="btn btn--quiet"
                    type="button"
                    onClick={() => startEditing(item)}
                  >
                    Editar
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
