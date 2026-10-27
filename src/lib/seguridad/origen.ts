import { origenesSeguridad } from "./origenes-desarrollo";

/** Comprueba el origen sin aceptar comodines ni confiar por sí solo en el proxy. */
export function origenSeguridadPermitido(
  headers: Pick<Headers, "get">,
  origen: string,
  entorno: string | undefined = process.env.NODE_ENV,
  adicionales = process.env.SEGURIDAD_ORIGENES_DESARROLLO ?? "",
) {
  const sitio = headers.get("sec-fetch-site");
  if (sitio === "cross-site") return false;
  const recibido = headers.get("origin");
  const permitidos = origenesSeguridad(origen, entorno, adicionales);
  if (recibido && permitidos.includes(recibido)) return true;

  // Dev Tunnels reescribe Origin. Sólo en desarrollo exigimos además la
  // declaración same-origin del navegador y el host público exacto configurado.
  if (entorno !== "development" || sitio !== "same-origin") return false;
  if (recibido !== "http://localhost:3030" && recibido !== "https://localhost:3030") return false;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return permitidos.some(valor => {
    const publico = new URL(valor);
    return publico.protocol === "https:" && publico.hostname.endsWith(".devtunnels.ms") && host === publico.host;
  });
}
