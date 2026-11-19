import {
  invitationGroups,
  sharedEvent,
  type InvitationGroup,
} from "./invitation-data";

type InvitationMessageInput = {
  audience: InvitationGroup;
  code: string;
  displayName: string;
  link: string;
};

/** `*texto*` é o negrito do WhatsApp; qualquer outra marcação vira literal. */
function bold(value: string) {
  return `*${value}*`;
}

const place = [
  `📍 ${bold(sharedEvent.address)}`,
  sharedEvent.neighborhood,
].join("\n");

/**
 * Mensagem pronta para colar no WhatsApp, uma por convite. Quem manda é o
 * Leonardo, do telefone pessoal, então ela é escrita na voz dele e já carrega o
 * link com o código de quem vai receber.
 *
 * Os dois públicos recebem textos diferentes de propósito, e cada um lê a data
 * do seu próprio grupo, mesmo que hoje sejam iguais. O tratamento muda — o
 * convite de família costuma ir para uma casa inteira, e o dos amigos vai para
 * uma pessoa só.
 */
export function buildInvitationMessage({
  audience,
  code,
  displayName,
  link,
}: InvitationMessageInput) {
  if (audience === "familia") {
    const event = invitationGroups.familia;

    return [
      `Oi, ${displayName}! 💚`,
      "",
      "Finalmente vou me mudar! E como casa nova pede gente dentro, vou fazer um chá pra inaugurar — vocês não podem faltar.",
      "",
      `📅 ${bold(event.compactDate)} — ${event.compactDateNote}`,
      place,
      "",
      "O convite de vocês está aqui:",
      link,
      "",
      `O link é pessoal e abre sozinho com o código de vocês (${code}). Lá dentro tem todas as informações.`,
      "",
      "",
      "Me avisa se posso contar com vocês, só pra acertar a comida e o gelo!",
      "",
      "Beijo,",
      "Leonardo",
    ].join("\n");
  }

  const event = invitationGroups.amigos;

  return [
    `Oi, ${displayName}! 💚`,
    "",
    "Finalmente vou me mudar! Vou fazer um chá de casa nova pra inaugurar, e você está na lista.",
    "",
    `📅 ${bold(event.compactDate)} — ${event.compactDateNote}`,
    place,
    "",
    "Teu convite já está de pé:",
    link,
    "",
    `O link é pessoal e abre sozinho com o teu código (${code}). Lá dentro tem todas as informações.`,
    "",
    "Me avisa se posso contar contigo, só pra acertar a comida e o gelo!",
    "",
    "Abraço,",
    "Leonardo",
  ].join("\n");
}
