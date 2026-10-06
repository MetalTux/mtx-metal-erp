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
};
export type ResultadoCliente =
  | { ok: true; mensaje: string; cliente?: Cliente }
  | { ok: false; mensaje: string; campos?: Partial<Record<"rut" | "name" | "email" | "phone" | "contact", string[]>> };
