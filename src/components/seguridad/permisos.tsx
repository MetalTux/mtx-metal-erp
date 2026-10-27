"use client";
import { createContext, useContext } from "react";
import { tienePermiso, type PermisoSeguridad } from "@/lib/seguridad/permisos";
const Contexto = createContext<readonly string[]>([]);
export function PermisosProvider({ roles, children }: { roles: readonly string[]; children: React.ReactNode }) {
  return <Contexto.Provider value={roles}>{children}</Contexto.Provider>;
}
export function useRoles() { return useContext(Contexto); }
export function usePermiso(permiso: PermisoSeguridad) { return tienePermiso(useRoles(), permiso); }
export function Permiso({ permiso, children }: { permiso: PermisoSeguridad; children: React.ReactNode }) {
  return usePermiso(permiso) ? children : null;
}
