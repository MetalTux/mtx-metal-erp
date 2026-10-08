export type SucursalCliente = {
  id: number; name: string; isHeadOffice: boolean; legacyIncomplete: boolean;
  address: string | null; city: string | null; contact: string | null; phone: string | null; email: string | null;
};
export type Cliente = {
  id: number;
  rut: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  cotizaciones: number;
  branches: SucursalCliente[];
};
export type ResultadoCliente =
  | { ok: true; mensaje: string; cliente?: Cliente }
  | { ok: false; mensaje: string; campos?: Partial<Record<"rut" | "name" | "email" | "phone" | "contact" | "branches", string[]>> };
