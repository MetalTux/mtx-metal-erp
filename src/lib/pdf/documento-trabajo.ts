import type { WorkOrder, WorkOrderLine, WorkOrderRecipeMaterial, WorkOrderDetail, WorkOrderSupplyPlan, ProductionRecord, ProductionConsumption, ProductionOutput, ProductionReversal, WorkOrderCompletion, WorkOrderInvoiceReference, Prisma } from "@/generated/prisma/client";
type Escalar<T> = T extends Date | Prisma.Decimal | bigint ? string : T;
type Copia<T> = { [K in keyof T]: Escalar<T[K]> };
export interface OrigenPdfTrabajo {
  plan: {header:Copia<WorkOrder>;lines:Copia<WorkOrderLine>[];recipeMaterials:Copia<WorkOrderRecipeMaterial>[];materials:Copia<WorkOrderDetail>[];supplies:Copia<WorkOrderSupplyPlan>[]};
  records:Copia<ProductionRecord>[];
  consumptions:Copia<ProductionConsumption>[];
  outputs:Copia<ProductionOutput>[];
  reversals:Copia<ProductionReversal>[];
  completion:Copia<WorkOrderCompletion>|null;
  invoices:Copia<WorkOrderInvoiceReference>[];
  warehouseNames:Record<string,string>;
  company:Record<string,Prisma.JsonValue>;
  folio:{folio:string};
}
export interface DocumentoPdfTrabajo {folio:string;version:number;status:WorkOrder["status"];origen:OrigenPdfTrabajo}
