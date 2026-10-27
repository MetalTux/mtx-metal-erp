/** Lista explícita adicional sólo para desarrollo; nunca habilita comodines ni HTTP remoto. */
export function origenesSeguridad(origen: string, entorno: string | undefined = process.env.NODE_ENV, adicionales = process.env.SEGURIDAD_ORIGENES_DESARROLLO ?? "") {
  const principal = new URL(origen).origin;
  if (entorno !== "development" || !adicionales.trim()) return [principal];
  const extras = adicionales.split(",").map(valor => {
    let url: URL;
    try { url = new URL(valor.trim()); } catch { throw Error("SEGURIDAD_ORIGENES_DESARROLLO contiene una URL inválida."); }
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    const tunel = url.protocol === "https:" && url.hostname.endsWith(".devtunnels.ms");
    if ((!local && !tunel) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || valor.includes("*")) {
      throw Error("SEGURIDAD_ORIGENES_DESARROLLO sólo permite orígenes HTTP locales o HTTPS de Dev Tunnels, sin ruta ni comodines.");
    }
    return url.origin;
  });
  return [...new Set([principal, ...extras])];
}

/** El host público sólo elige entre orígenes configurados; no autoriza una solicitud. */
export function origenPeticionSeguridad(headers: Pick<Headers, "get">, origen: string, entorno: string | undefined = process.env.NODE_ENV, adicionales = process.env.SEGURIDAD_ORIGENES_DESARROLLO ?? "") {
  const permitidos = origenesSeguridad(origen, entorno, adicionales);
  if (entorno !== "development") return permitidos[0];
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return permitidos.find(valor => new URL(valor).host === host) ?? permitidos[0];
}
