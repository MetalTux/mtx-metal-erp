/** Comprueba el origen sin aceptar comodines ni confiar por sí solo en el proxy. */
export function origenSeguridadPermitido(
  headers: Pick<Headers, "get">,
  origen: string,
  entorno: string | undefined = process.env.NODE_ENV,
) {
  const sitio = headers.get("sec-fetch-site");
  if (sitio === "cross-site") return false;
  const recibido = headers.get("origin");
  if (recibido === origen) return true;

  // Dev Tunnels reescribe Origin. Sólo en desarrollo exigimos además la
  // declaración same-origin del navegador y el host público exacto configurado.
  const publico = new URL(origen);
  if (entorno !== "development" || publico.protocol !== "https:"
    || !publico.hostname.endsWith(".devtunnels.ms") || sitio !== "same-origin") return false;
  if (recibido !== "http://localhost:3030" && recibido !== "https://localhost:3030") return false;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return host === publico.host;
}
