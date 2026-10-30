import { SCRIPT_INICIAL_TEMA } from "@/lib/tema-config";
import localFont from "next/font/local";
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const plex = localFont({
  src: [
    { path: "./fuentes/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fuentes/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTX Metal ERP",
  description: "Gestión de bodegas, materia prima, cotizaciones y órdenes de trabajo para fabricación de estructuras metálicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`dark ${geistMono.variable} ${plex.variable} min-h-full antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_INICIAL_TEMA }} /></head>
      <body>{children}</body>
    </html>
  );
}
