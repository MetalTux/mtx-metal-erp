import { isIP } from "node:net";
export type MetadatosSeguridad = { ip?: string; browser?: string };
export function tipoNavegador(valor?: string | null) {
  if (!valor) return undefined;
  if (["Chrome","Firefox","Edge","Safari","Otro"].includes(valor)) return valor;
  if (/Edg\//.test(valor)) return "Edge";
  if (/Firefox\//.test(valor)) return "Firefox";
  if (/Chrome\//.test(valor)) return "Chrome";
  if (/Safari\//.test(valor)) return "Safari";
  return "Otro";
}
export function metadatosSeguridad(h: Pick<Headers,"get">): MetadatosSeguridad {
  const ip=process.env.SEGURIDAD_CONFIAR_PROXY==="1"?h.get("x-forwarded-for")?.split(",")[0]?.trim():undefined;
  return {ip:ip&&isIP(ip)?ip:undefined,browser:tipoNavegador(h.get("user-agent"))};
}
