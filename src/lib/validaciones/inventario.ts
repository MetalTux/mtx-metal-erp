import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";

const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (valor) => (valor === "" ? undefined : valor),
    schema.optional(),
  );
const identificador = opcional(
  z.coerce.number().int().positive().max(2_147_483_647),
);
const fecha = opcional(
  z
    .string()
    .refine(fechaCalendarioValida, "Ingresa una fecha de calendario válida."),
);
const comunes = {
  q: z.string().trim().max(150).default(""),
  bodega: identificador,
  material: identificador,
  pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
  tamano: z
    .enum(["10", "20", "50"])
    .default("10")
    .transform((valor) => Number(valor)),
};
export const filtrosStockSchema = z.object({
  ...comunes,
  reposicion: z.enum(["todos", "reposicion"]).default("todos"),
  orden: z
    .enum(["material", "bodega", "cantidad", "minimo"])
    .default("material"),
  sentido: z.enum(["asc", "desc"]).default("asc"),
});
export const filtrosMovimientosSchema = z
  .object({
    ...comunes,
    tipo: opcional(z.enum(["ENTRADA", "SALIDA", "AJUSTE"])),
    desde: fecha,
    hasta: fecha,
    orden: z
      .enum(["fecha", "material", "bodega", "cantidad", "tipo"])
      .default("fecha"),
    sentido: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta,
    "La fecha Desde no puede ser posterior a Hasta.",
  );
export type FiltrosStock = z.output<typeof filtrosStockSchema>;
export type FiltrosMovimientos = z.output<typeof filtrosMovimientosSchema>;

/** Retener los controles editables al mostrar errores, sin usar esos valores en SQL. */
export function borradorFiltrosInventario(
  entrada: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    ["q", "bodega", "material", "tipo", "desde", "hasta", "reposicion"].flatMap(
      (nombre) =>
        typeof entrada[nombre] === "string" ? [[nombre, entrada[nombre]]] : [],
    ),
  );
}

export const combinacionMinimoSchema = z.object({
  warehouseId: z.number().int().positive().max(2147483647),
  rawMaterialId: z.number().int().positive().max(2147483647),
  unitMeasureId: z.number().int().positive().max(2147483647),
});
export const minimoInventarioSchema = combinacionMinimoSchema.extend({
  minStock: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine(
      (v) => v === "" || /^\d{1,11}(?:\.\d{1,3})?$/.test(v),
      "Indica un mínimo no negativo con hasta tres decimales, o déjalo vacío.",
    )
    .transform((v) => (v === "" ? null : v)),
});
export const referenciaMinimoSchema = z.object({
  id: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
  minimo: z.string().nullable(),
});
