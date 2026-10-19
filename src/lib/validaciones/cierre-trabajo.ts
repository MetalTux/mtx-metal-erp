import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const fecha = z.string().refine(fechaCalendarioValida, "Indica una fecha calendario válida.");
const base = { workOrderId:z.number().int().positive(), version:z.number().int().positive() };
export const cierreTrabajoSchema = z.object({...base,date:fecha,note:z.string().trim().max(1000),preparationConfirmed:z.literal(true,{error:"Confirma la revisión de preparación de todas las líneas."})}).strict();
export const facturaTrabajoSchema = z.object({...base,invoiceNumber:z.string().min(1,"Indica el folio de factura.").max(150).refine(v=>v.trim().length>0,"Indica el folio de factura."),invoiceDate:fecha,correctionReason:z.string().trim().max(1000).default("")}).strict();
