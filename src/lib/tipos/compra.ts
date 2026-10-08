import type { DatosCompra } from "@/lib/validaciones/compra";
export type LineaCompra = DatosCompra["lines"][number] & {
  id: number;
  quantity: string;
  lineAmount: string;
  material: string;
  unidad: string;
  recibido: string;
  cerrado: string;
  pendiente: string;
};
export type Compra = {
  id: number;
  version: number;
  date: string;
  dia: string;
  totalAmount: string;
  supplierId: number;
  proveedor: string;
  rut: string;
  documentTypeId: number;
  documento: string;
  documentNumber: string;
  warehouseId: number;
  bodega: string;
  voidedAt: string | null;
  voidReason: string | null;
  deletedAt: string | null;
  recibida: boolean;
  estado: string;
  lines: LineaCompra[];
  closures: {
    id: number;
    material: string;
    cantidad: string;
    motivo: string;
    fecha: string;
  }[];
  receipts: {
    id: number;
    fecha: string;
    lineas: {
      material: string;
      cantidad: string;
      equivalente: string;
    }[];
  }[];
};
export type CatalogosCompra = {
  presentaciones: string[];
  proveedores: {
    id: number;
    name: string;
    rut: string;
  }[];
  bodegas: {
    id: number;
    name: string;
  }[];
  tipos: {
    id: number;
    code: string;
    name: string;
  }[];
  materiales: {
    id: number;
    code: string;
    name: string;
    unidad: string;
  }[];
};
export type ResultadoCompra =
  | {
      ok: true;
      mensaje: string;
      compra?: Compra;
      id?: number;
    }
  | {
      ok: false;
      mensaje: string;
    };
export type CalculoCompra = {
  total: string;
  lineas: {
    cantidad: string;
    importe: string;
  }[];
};
