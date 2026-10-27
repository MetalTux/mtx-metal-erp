import { origenesSeguridad } from "./src/lib/seguridad/origenes-desarrollo";
import type { NextConfig } from "next";

const esDesarrollo = process.env.NODE_ENV === "development";
const origenes = esDesarrollo
  ? origenesSeguridad(process.env.SEGURIDAD_ORIGEN ?? "http://localhost:3030")
  : [];
const hostsDesarrollo = origenes.map(origen => new URL(origen).host);
const dominiosDesarrollo = origenes.map(origen => new URL(origen).hostname);

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Los PDF pueden mostrarse dentro del ERP, sin admitir marcos de otros sitios.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      ...[
        "/ingresar",
        "/activar",
        "/recuperar",
        "/mi-acceso",
        "/administracion/:path*",
        "/api/seguridad",
      ].map((source) => ({
        source,
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      })),
    ];
  },
  experimental: {
    serverActions: {
      // Hasta diez imágenes de 2 MB y margen para metadatos del formulario.
      bodySizeLimit: "22mb",
      ...(esDesarrollo && {
        // Devtunnels reescribe Origin a localhost aunque conserva el host público.
        allowedOrigins: [...new Set([...hostsDesarrollo, "localhost:3030"])],
      }),
    },
  },
  ...(esDesarrollo && {
    allowedDevOrigins: [...new Set(dominiosDesarrollo)],
  }),
};

export default nextConfig;
