import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`dark ${inter.variable} ${geistMono.variable} min-h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
