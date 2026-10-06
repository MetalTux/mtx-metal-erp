import type { NextConfig } from "next";

const esDesarrollo = process.env.NODE_ENV === "development";
const dominioTunel = "b1315pk2-3030.brs.devtunnels.ms";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(esDesarrollo && {
    allowedDevOrigins: [dominioTunel],
    experimental: {
      serverActions: {
        // Devtunnels reescribe Origin a localhost aunque conserva el host público.
        allowedOrigins: ["localhost:3030", dominioTunel],
      },
    },
  }),
};

export default nextConfig;
