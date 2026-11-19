"use client";

import { useEffect, useState } from "react";

type PixCardProps = {
  holder: string;
  kind: string;
  logo: string;
  pixKey: string;
};

/**
 * Um dos três caminhos, no mesmo formato e com o mesmo peso das listas —
 * nenhum deles é apresentado como o preferido.
 */
export function PixCard({ holder, kind, logo, pixKey }: PixCardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const reset = window.setTimeout(() => setCopied(false), 2600);
    return () => window.clearTimeout(reset);
  }, [copied]);

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="way way--wood">
      <span className="way__label">Transferência</span>
      {/* Mesmo bloco das lojas, para os três cartões terem a mesma anatomia. */}
      <h3 className="way__name">
        <span className="way__chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Pix" loading="lazy" />
        </span>
      </h3>
      <p className="way__desc">
        Para quem prefere que eu escolha o que ainda falta.
      </p>
      <dl className="way__pix">
        <dt>Titular</dt>
        <dd>{holder}</dd>
        <dt>{kind}</dt>
        <dd className="way__key">{pixKey}</dd>
      </dl>
      <button
        className={`way__go way__go--button${copied ? " is-done" : ""}`}
        type="button"
        onClick={copyPixKey}
      >
        {copied ? "Chave copiada ✓" : "Copiar chave"}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {copied ? "Chave Pix copiada para a área de transferência." : ""}
      </p>
    </li>
  );
}
