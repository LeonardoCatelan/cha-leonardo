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
 * O texto é o mesmo para família e amigos, e por isso evita marcar singular ou
 * plural: o convite de família costuma ir para uma casa inteira, e o dos
 * amigos para uma pessoa só. Só a data vem do grupo, que pode mudar um dia.
 */
export function buildInvitationMessage({
  audience,
  code,
  displayName,
  link,
}: InvitationMessageInput) {
  const event = invitationGroups[audience];

  return [
    `Oi, ${displayName}!`,
    "",
    "Depois de muito planejamento, finalmente estou de casa nova. E uma conquista dessas merece ser comemorada com quem faz parte da minha história — por isso vou fazer um chá de casa nova, e o convite é seu.",
    "",
    `📅 ${bold(event.compactDate)} — ${event.compactDateNote}`,
    place,
    "",
    "🍗 O galeto e os refris ficam por minha conta. Quem quiser tomar uma cervejinha ou outra bebida, fica à vontade pra trazer o seu cooler.",
    "",
    "Todas as informações estão no convite:",
    link,
    "",
    `O link é pessoal e já abre com o código do convite (${code}).`,
    "",
    "Quando puder, me confirma a presença por lá. Vai ser muito bom receber quem é importante pra mim na casa nova.",
    "",
    "Um abraço,",
    "Leonardo",
  ].join("\n");
}
