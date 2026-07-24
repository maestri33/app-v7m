import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/app/_components/service-worker-register";

// Self-hosting automático via next/font (subset latin, font-display swap, zero FOUT).
// Geist é a fonte da régua de convenção (app dos alunos): uma família só, pesos
// variáveis — títulos usam o peso pesado (800) via CSS, corpo o normal.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Promotor V7M",
    template: "%s · Promotor V7M",
  },
  description: "App do promotor V7M — funil do candidato ao painel do promotor pleno.",
  applicationName: "V7M Promotor",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "V7M Promotor",
    statusBarStyle: "black-translucent",
  },
};

// Casca tipo app: ocupa toda a viewport com safe-area (notch/home indicator).
// Sem travar zoom (a11y) — apenas viewport-fit cover + theme color por tema.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#071521" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: seta data-theme antes do primeiro paint (CSP permite unsafe-inline) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{var t=localStorage.getItem('v7m-theme')||'light';var d=t==='system'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme='light';}})();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
