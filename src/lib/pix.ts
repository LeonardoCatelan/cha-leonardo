import "server-only";

export type PixDetails = {
  holder: string;
  key: string;
  kind: string;
  logo: string;
};

/**
 * A chave Pix é dado pessoal (CPF, telefone, e-mail…), então não fica no
 * repositório: vem das variáveis de ambiente do deploy. Sem chave ou titular,
 * o cartão de Pix simplesmente não aparece.
 */
export function getPixDetails(): PixDetails | null {
  const key = process.env.PIX_KEY?.trim();
  const holder = process.env.PIX_HOLDER?.trim();

  if (!key || !holder) return null;

  return {
    holder,
    key,
    kind: process.env.PIX_KEY_KIND?.trim() || "Chave Pix",
    logo: "/logos/pix.png",
  };
}
