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
  titleLead: "Casa nova,",
  titleAccent: "porta aberta.",
  deck: "Uma casa nova pede gente dentro. Vem inaugurar a minha.",
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
    rsvpTitle: "Você vem?",
    rsvpCopy:
      "Me avisa com alguma antecedência — assim a comida e o gelo dão conta.",
    rsvpLabel: "Confirmar pelo WhatsApp",
    rsvpMessage:
      "Oi, Leonardo! Confirmo minha presença no chá de casa nova da família, dia 13 de dezembro, às 11h. 💚",
    rsvpNote: "Se aparecer um imprevisto, avisa também. Sem cerimônia.",
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
    rsvpTitle: "Você vem?",
    rsvpCopy:
      "Avisa com alguma antecedência — assim a comida e o gelo dão conta.",
    rsvpLabel: "Confirmar pelo WhatsApp",
    rsvpMessage:
      "Oi, Leonardo! Confirmo minha presença no chá de casa nova com os amigos, dia 13 de dezembro, às 11h. 💚",
    rsvpNote: "Se aparecer um imprevisto, avisa também. Sem cerimônia.",
  },
} as const satisfies Record<InvitationGroup, InvitationDetails>;

/**
 * `logo` aponta para um arquivo em `public/logos/`. Sem ele, o cartão mostra o
 * nome da loja em tipografia de display.
 */
export const giftLists = [
  {
    name: "Camicado",
    logo: "/logos/camicado.png" as string | null,
    label: "Lista de presentes",
    description:
      "Nossa lista está montada no site. Dá para comprar de casa e receber em casa.",
    action: "Abrir a lista",
    note: null,
    tone: "paper",
    url: "https://lista.camicado.com.br/livi",
  },
  {
    // O link abre a lista, mas não vende: serve para conferir os itens antes de
    // sair de casa. Por isso o cartão traz as duas coisas — a visita ao site e
    // o aviso de que a compra continua sendo no balcão.
    name: "Casa Maria",
    logo: "/logos/casa-maria.png" as string | null,
    label: "Lista de presentes",
    description:
      "Dá para ver os itens pelo site antes de ir, mas a compra não sai por lá: é só pedir a lista de Vitória e Felipe no balcão da loja.",
    action: "Ver os itens da lista",
    note: "A compra é só na loja",
    tone: "forest",
    url: "https://bazarcasamaria.com.br/lista-de-presente-individual/?gift_list=cha-de-casa-nova-vitoria-e-felipe",
  },
] as const;

