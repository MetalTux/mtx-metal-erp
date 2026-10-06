export type Proveedor = {
  id: number;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  compras: number;
};
export type ResultadoProveedor =
  | { ok: true; mensaje: string; proveedor?: Proveedor }
  | { ok: false; mensaje: string; campos?: Partial<Record<"rut" | "name" | "email" | "phone", string[]>> };
