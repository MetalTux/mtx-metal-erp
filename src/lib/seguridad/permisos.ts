/** Catálogo de permisos por unión de roles; aplicado en servidor por las guardas S4. */
export const rolesSeguridad = [
  "ADMINISTRADOR", "VENTAS", "COMPRAS_BODEGA", "PRODUCCION_DESPACHO", "COBRANZA", "CONSULTA_GERENCIA",
] as const;
export type RolSeguridad = typeof rolesSeguridad[number];

const areas = ["configuracion", "clientes", "proveedores", "catalogos", "cotizaciones", "ordenes_cliente", "inventario", "ajustes", "traslados", "trabajos", "guias", "cobranza"] as const;
type Area = typeof areas[number];
export type PermisoSeguridad = `${Area}.${"leer" | "operar"}` | "usuarios.administrar" | "auditoria.leer" | "facturas.operar" | "compras.leer" | "compras.operar" | "costos.leer" | "precios.leer";

const lectura: Record<Exclude<RolSeguridad,"ADMINISTRADOR">, readonly Area[]> = {
  VENTAS: ["configuracion","clientes","catalogos","cotizaciones","ordenes_cliente","inventario","trabajos","guias","cobranza"],
  COMPRAS_BODEGA: ["proveedores","catalogos","inventario","ajustes","traslados","trabajos","guias"],
  PRODUCCION_DESPACHO: ["clientes","catalogos","ordenes_cliente","inventario","trabajos","guias"],
  COBRANZA: ["configuracion","clientes","cotizaciones","ordenes_cliente","trabajos","guias","cobranza"],
  CONSULTA_GERENCIA: areas,
};
const operacion: Record<Exclude<RolSeguridad,"ADMINISTRADOR">, readonly Area[]> = {
  VENTAS: ["clientes","cotizaciones","ordenes_cliente"],
  COMPRAS_BODEGA: ["proveedores","catalogos","inventario","ajustes","traslados"],
  PRODUCCION_DESPACHO: ["trabajos","guias"],
  COBRANZA: ["cobranza"],
  CONSULTA_GERENCIA: [],
};
const adicionales: Record<Exclude<RolSeguridad,"ADMINISTRADOR">, readonly PermisoSeguridad[]> = {
  VENTAS: ["precios.leer"], COMPRAS_BODEGA: ["compras.leer","compras.operar","costos.leer"],
  PRODUCCION_DESPACHO: [], COBRANZA: ["facturas.operar","precios.leer"],
  CONSULTA_GERENCIA: ["compras.leer","costos.leer","precios.leer"],
};
export function esRolSeguridad(valor: string): valor is RolSeguridad {
  return rolesSeguridad.some(r => r === valor);
}
function esPermiso(valor: string): valor is PermisoSeguridad {
  return ["usuarios.administrar","auditoria.leer","facturas.operar","compras.leer","compras.operar","costos.leer","precios.leer"].includes(valor)
    || areas.some(a => valor === `${a}.leer` || valor === `${a}.operar`);
}
/** Unión de roles conocidos; desconocidos y permisos inexistentes no conceden acceso. */
export function tienePermiso(roles: readonly string[], permiso: string): boolean {
  if (!esPermiso(permiso)) return false;
  return roles.some(r => {
    if (!esRolSeguridad(r)) return false;
    if (r === "ADMINISTRADOR") return true;
    return adicionales[r].some(p => p === permiso)
      || lectura[r].some(a => permiso === `${a}.leer`)
      || operacion[r].some(a => permiso === `${a}.operar`);
  });
}
/** El rol Administrador nunca sustituye al titular del factor. IDs vienen de sesión/DB. */
export function esTitularDelFactor(actorId: number, titularId: number): boolean {
  return Number.isSafeInteger(actorId) && actorId > 0 && actorId === titularId;
}
