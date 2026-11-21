"use client";

import { useEffect, useState } from "react";

type PixCardProps = {
  holder: string;
  kind: string;
  logo: string;
  pixKey: string;
};

/**
 * Alternativa à lista, apresentada depois dela: quem chega aqui já viu os
 * itens e decidiu que prefere transferir.
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
    <section className="pix" aria-labelledby="pix-title" data-reveal-item>
      <div className="pix__intro">
        <span className="pix__label">Transferência</span>
        <h3 className="pix__title" id="pix-title">
          <span className="pix__chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" loading="lazy" />
          </span>
          Prefere um Pix?
        </h3>
        <p className="pix__desc">
          Para quem prefere que eu escolha o que ainda falta.
        </p>
      </div>

      <div className="pix__data">
        <dl className="pix__fields">
          <dt>Titular</dt>
          <dd>{holder}</dd>
          <dt>{kind}</dt>
          <dd className="pix__key">{pixKey}</dd>
        </dl>
        <button
          className={`pix__copy${copied ? " is-done" : ""}`}
          type="button"
          onClick={copyPixKey}
        >
          {copied ? "Chave copiada ✓" : "Copiar chave"}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {copied ? "Chave Pix copiada para a área de transferência." : ""}
      </p>
    </section>
  );
}
