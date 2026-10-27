import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

const actores = new WeakMap<object, number>();
/** Sólo la guarda de servidor registra al actor después de validar la sesión en la tx. */
export function fijarActorTransaccion(tx: Prisma.TransactionClient, actorId: number) {
  const anterior = actores.get(tx);
  if (anterior && anterior !== actorId) throw Error("No se puede cambiar el actor de una transacción.");
  actores.set(tx, actorId);
}
export const modelosConAutoria = ["paymentAttachment","paymentPromiseChange","payment","unitMeasure","warehouse","rawMaterial","product","client","supplier","paymentCondition","companyProfile","companyBankAccount","vatRatePeriod","documentNumbering","warehouseStock","purchaseOperation","inventoryOperation","productInventoryOperation","quoteOperation","salesOrderOperation","workOrderOperation","quotePdfEmission","workOrderPdfEmission","deliveryNotePdfEmission","quoteImageFile"] as const;

/** Se llama después de la mutación y antes de su commit, usando el mismo cliente. */
export async function anotarMutacion<T>(tx: Prisma.TransactionClient, modelo: string, metodo: string, resultado: T): Promise<T> {
  const actorUserId = actores.get(tx);
  if (!actorUserId) throw Error("La operación requiere un actor de servidor verificado.");
  const r = resultado as Record<string, unknown>;
  const entries: {resourceType:string;resourceId:string;action:string;operationKey:string}[]=[];
  const key = typeof r.idempotencyKey === "string" ? r.idempotencyKey : randomUUID();
  const add=(resourceType:string,id:unknown,action:string,operationKey=key)=>{if(id!==null&&id!==undefined)entries.push({resourceType,resourceId:String(id),action,operationKey});};
  const action = modelo.endsWith("Operation") && typeof r.type === "string" ? r.type : metodo === "create" ? "CREAR" : metodo === "delete" ? "ELIMINAR" : "MODIFICAR";
  switch(modelo){
    case "paymentAttachment": add("PaymentAttachment",r.id,"ADJUNTAR",String(r.id));add("Payment",r.paymentId,"ADJUNTAR_COMPROBANTE",String(r.id));break;
    case "paymentPromiseChange": add("PaymentPromiseChange",r.id,"CAMBIAR_PROMESA",String(r.id));add("AccountReceivable",r.accountReceivableId,"CAMBIAR_PROMESA",String(r.id));break;
    case "payment": add("Payment",r.id,metodo === "create" ? "REGISTRAR_ABONO" : "ANULAR_ABONO",metodo === "create" ? key : randomUUID());break;
    case "purchaseOperation": add("Purchase",r.purchaseId,action);add("PurchaseReceipt",r.receiptId,action);add("PurchasePendingClosure",r.closureId,action);break;
    case "inventoryOperation": add("InventoryAdjustment",r.adjustmentId,action);add("InventoryTransfer",r.transferId,action);break;
    case "productInventoryOperation": add("ProductInitialStock",r.initialStockId,"INVENTARIO_INICIAL");add("ProductInventoryAdjustment",r.adjustmentId,"AJUSTAR");break;
    case "quoteOperation": add("Quote",r.quoteId,action);break;
    case "salesOrderOperation": add("SalesOrder",r.salesOrderId,action);break;
    case "workOrderOperation":
      add("WorkOrder",r.workOrderId,action);add("DeliveryNote",r.deliveryNoteId,action);add("ProductionRecord",r.productionRecordId,action);add("ProductionReversal",r.productionReversalId,action);add("WorkOrderCompletion",r.completionId,action);add("WorkOrderInvoiceReference",r.invoiceReferenceId,action);break;
    default: {
      const names: Record<string,string>={unitMeasure:"UnitMeasure",warehouse:"Warehouse",rawMaterial:"RawMaterial",product:"Product",client:"Client",supplier:"Supplier",paymentCondition:"PaymentCondition",companyProfile:"CompanyProfile",companyBankAccount:"CompanyBankAccount",vatRatePeriod:"VatRatePeriod",documentNumbering:"DocumentNumbering",warehouseStock:"WarehouseStock",quotePdfEmission:"QuotePdfEmission",workOrderPdfEmission:"WorkOrderPdfEmission",deliveryNotePdfEmission:"DeliveryNotePdfEmission",quoteImageFile:"QuoteImageFile"};
      const name=names[modelo];if(!name)throw Error("Modelo no incluido en el catálogo de autoría.");
      const stable = modelo.endsWith("PdfEmission") ? String(r.id) : modelo==="quoteImageFile" ? String(r.uploadKey) : modelo==="product"&&metodo==="create" ? String(r.creationKey) : key;
      add(name,r.id,modelo==="warehouseStock"?"CONFIGURAR_MINIMO":modelo.endsWith("PdfEmission")?"EMITIR_PDF":modelo==="product"&&r.deletedAt?"ELIMINAR":action,stable);
    }
  }
  if(!entries.length)throw Error("No se pudo vincular la autoría de la operación.");
  for(const data of entries){
    const anterior=await tx.securityOperationAuthor.findUnique({where:{resourceType_operationKey:{resourceType:data.resourceType,operationKey:data.operationKey}}});
    if(anterior){if(anterior.resourceId!==data.resourceId||anterior.action!==data.action)throw Error("La autoría existente no corresponde a esta operación.");continue;}
    await tx.securityOperationAuthor.create({data:{...data,actorUserId}});
  }
  return resultado;
}
