import { z } from "zod";
import { Prisma } from "@/generated/prisma/browser";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const id=z.number().int().positive().max(2147483647);
const quantity=z.string().trim().transform(s=>s.replace(",",".")).refine(s=>/^\d{1,11}(?:\.\d{1,3})?$/.test(s),"Indica una cantidad con hasta tres decimales.").transform(s=>new Prisma.Decimal(s).toFixed(3)).refine(s=>new Prisma.Decimal(s).gt(0),"La cantidad debe ser positiva.");
export const produccionSchema=z.object({workOrderId:id,workOrderLineId:id,version:id,date:z.string().refine(fechaCalendarioValida,"Fecha de registro inválida."),quantity,warehouseId:id.nullable(),correctsProductionRecordId:id.nullable().default(null),note:z.string().trim().max(2000),deviationReason:z.string().trim().max(1000),consumptions:z.array(z.object({rawMaterialId:id,unitMeasureId:id,warehouseId:id,quantity}).strict()).max(300),roundingReviews:z.array(z.object({rawMaterialId:id,quantity,reason:z.string().trim().min(1).max(1000)}).strict()).max(100)}).strict();
export type RegistroProduccion=z.input<typeof produccionSchema>;

export const reversionProduccionSchema=z.object({workOrderId:id,productionRecordId:id,version:id,date:z.string().refine(fechaCalendarioValida,"Fecha de reversión inválida."),reason:z.string().trim().min(1,"Indica el motivo de la reversión.").max(1000),physicalRestitutionConfirmed:z.boolean()}).strict();
export type ReversionProduccion=z.infer<typeof reversionProduccionSchema>;
export const anulacionTrabajoSchema=z.object({workOrderId:id,version:id,reason:z.string().trim().min(1,"Indica el motivo de anulación.").max(1000)}).strict();
