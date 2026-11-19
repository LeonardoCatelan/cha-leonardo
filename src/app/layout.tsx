import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const bodyFont = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Chá de Casa Nova — Leonardo",
    template: "%s | Casa nova",
  },
  description: "Convite digital para celebrar o novo lar do Leonardo.",
  applicationName: "Chá de Casa Nova",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * A classe precisa existir antes do primeiro paint. Se ela entrasse só num
 * efeito, o conteúdo pintaria visível, hidrataria, receberia `opacity: 0` e
 * re-animaria — o salto que existia antes. De quebra, quem pediu movimento
 * reduzido nunca entra no estado escondido, e quem está sem JS vê a página
 * inteira.
 */
const motionReadyScript = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-ready")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
      // O script acima acrescenta `motion-ready` antes da hidratação, então a
      // classe do servidor não bate com a do cliente de propósito.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionReadyScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
