import type { Metadata, Viewport } from "next";
// Fontes empacotadas com o app (sem depender do Google Fonts), o que também
// ajuda o PWA a abrir sem internet.
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Playmaker: Football Manager",
  description: "Manager de futebol brasileiro: carreira de técnico, clubes vivos e mundo realista.",
  appleWebApp: { capable: true, title: "Playmaker", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f2a1d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
