export type InvitationGroup = "familia" | "amigos";

type InvitationDetails = {
  /** Ficha técnica do hero: linha forte e linha de apoio da célula "quando". */
  specWhen: string;
  specWhenNote: string;
  /** Lockup da data no desktop. */
  weekday: string;
  day: string;
  monthYear: string;
  time: string;
  dateTime: string;
  /**
   * A mesma data como frase, para o celular. O numeral isolado só funciona
   * quando há coluna ao lado dele; em tela estreita vira uma torre.
   */
  compactDate: string;
  compactDateNote: string;
  /** Nota abaixo do horário. */
  whenNote: string;
  rsvpEyebrow: string;
  rsvpTitle: string;
  rsvpCopy: string;
  rsvpLabel: string;
  rsvpMessage: string;
  rsvpNote: string;
};

export const heroCopy = {
  eyebrow: "Chá de casa nova",
  titleLead: "Casa própria,",
  titleAccent: "casa aberta.",
  deck: "Foi uma conquista, e quero comemorar com quem fez parte dela.",
} as const;

export const sharedEvent = {
  address: "Rua Cândida Paim Terra, 93",
  // O local exato vai junto do bairro: é a linha que acompanha o endereço no
  // convite, no mapa e na mensagem de WhatsApp.
  neighborhood: "Salão de festas do condomínio — Olaria, Canoas/RS",
  // Sem `·` interno: a ficha técnica do hero já usa esse separador entre o
  // espaço e a cidade, e dois seguidos ficam ilegíveis.
  city: "Canoas, RS",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Rua%20C%C3%A2ndida%20Paim%20Terra%2C%2093%2C%20Olaria%2C%20Canoas%2C%20RS",
  // Embed público do Google Maps: sem chave de API e sem script externo.
  // Aponta direto para o destino final — a forma `?q=…&output=embed` responde
  // 301 com `X-Frame-Options: SAMEORIGIN`, e pular o salto evita depender de
  // como cada navegador trata o cabeçalho no redirect.
  mapEmbedUrl:
    "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1sRua+C%C3%A2ndida+Paim+Terra,+93,+Olaria,+Canoas+-+RS",
} as const;

export const invitationGroups = {
  familia: {
    specWhen: "Domingo, 13 de dezembro",
    specWhenNote: "2026 · a partir das 11h",
    weekday: "domingo",
    day: "13",
    monthYear: "dezembro de 2026",
    time: "11h",
    dateTime: "2026-12-13T11:00:00-03:00",
    compactDate: "13 de dezembro",
    compactDateNote: "domingo, a partir das 11h",
    whenNote: "Fico por lá o dia todo.",
    rsvpEyebrow: "Confirmação",
    rsvpTitle: "Conto contigo?",
    rsvpCopy:
      "Me avisa com antecedência pra eu me organizar.",
    rsvpLabel: "Confirmar pelo WhatsApp",
    rsvpMessage:
      "Oi, Leonardo! Confirmo minha presença no chá de casa nova da família, dia 13 de dezembro, às 11h.",
    rsvpNote: "Se mudar de planos, é só avisar.",
  },
  amigos: {
    specWhen: "Domingo, 13 de dezembro",
    specWhenNote: "2026 · a partir das 11h",
    weekday: "domingo",
    day: "13",
    monthYear: "dezembro de 2026",
    time: "11h",
    dateTime: "2026-12-13T11:00:00-03:00",
    compactDate: "13 de dezembro",
    compactDateNote: "domingo, a partir das 11h",
    whenNote: "Fico por lá o dia todo.",
    rsvpEyebrow: "Confirmação",
    rsvpTitle: "Conto contigo?",
    rsvpCopy:
      "Me avisa com antecedência pra eu me organizar.",
    rsvpLabel: "Confirmar pelo WhatsApp",
    rsvpMessage:
      "Oi, Leonardo! Confirmo minha presença no chá de casa nova com os amigos, dia 13 de dezembro, às 11h.",
    rsvpNote: "Se mudar de planos, é só avisar.",
  },
} as const satisfies Record<InvitationGroup, InvitationDetails>;

