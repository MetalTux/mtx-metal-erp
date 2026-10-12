import type { NextConfig } from "next";

const esDesarrollo = process.env.NODE_ENV === "development";
const dominioTunel = "b1315pk2-3030.brs.devtunnels.ms";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Hasta diez imágenes de 2 MB y margen para metadatos del formulario.
      bodySizeLimit: "22mb",
      ...(esDesarrollo && {
        // Devtunnels reescribe Origin a localhost aunque conserva el host público.
        allowedOrigins: ["localhost:3030", dominioTunel],
      }),
    },
  },
  ...(esDesarrollo && {
    allowedDevOrigins: [dominioTunel],
  }),
};

export default nextConfig;
