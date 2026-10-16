import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type WorkOrderLine } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { inicioTrabajoSchema, planTrabajoSchema, type PlanTrabajo, type LineaPlanTrabajo } from "@/lib/validaciones/orden-trabajo";
import { asignarFolio } from "./numeracion";
import { leerCompromisoParaTrabajo, jsonHistoricoOrden, hoyOrden } from "./ordenes-compra-cliente";
import { calcularRequerimientosProduccion } from "./requerimientos-produccion";
import { reservarPlanTrabajoEnTransaccion } from "./reservas-stock";
class ReglaTrabajo extends Error {}
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaTrabajo(mensaje); }
const decimal = (v: string) => new Prisma.Decimal(v);
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const fecha = (v: string) => new Date(`${v}T00:00:00Z`);
export type ResultadoTrabajo = { ok: true; id: number; version: number; mensaje: string } | { ok: false; mensaje: string; incierto?: boolean };

/** Cambia únicamente estado/fecha y registra su revisión, sin consumir ni ampliar reservas. */
export async function iniciarTrabajo(input: unknown, clave: unknown): Promise<ResultadoTrabajo> {
  const parsed = inicioTrabajoSchema.safeParse(input), k = z.uuid().safeParse(clave);
  if (!parsed.success || !k.success) return { ok: false, mensaje: !parsed.success ? parsed.error.issues[0].message : "UUID inválido." };
  const d = parsed.data, key = k.data.toLowerCase(), fingerprint = hash({ type: "INICIAR", ...d });
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
      const previa = await tx.workOrderOperation.findUnique({ where: { idempotencyKey: key } });
      if (previa) {
        exigir(previa.type === "INICIAR" && previa.workOrderId === d.workOrderId && previa.fingerprint === fingerprint, "El UUID ya pertenece a otra solicitud.");
        return { ok: true as const, id: previa.workOrderId, version: previa.version, mensaje: "El inicio ya se confirmó." };
      }
      exigir(!await tx.documentFolio.findUnique({ where: { idempotencyKey: key } }), "La clave ya pertenece a otro documento.");
      await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${d.workOrderId} FOR UPDATE`;
      const work = await tx.workOrder.findUnique({ where: { id: d.workOrderId } });
      exigir(work?.schemaVersion === 1 && work.status === "PENDIENTE", "Sólo se puede iniciar una OT pendiente con estructura vigente.");
      exigir(work.version === d.version, "La OT cambió. Actualiza la consulta antes de iniciar.");
      const decision = await tx.workOrderOperation.findFirst({ where: { workOrderId: work.id, type: { in: ["CREAR", "EDITAR_PLAN"] } }, orderBy: { version: "desc" } });
      exigir(decision?.planConfirmed === true, "Confirma primero el plan y su distribución antes de iniciar.");
      exigir(d.startedDate >= work.date!.toISOString().slice(0, 10) && d.startedDate <= hoyOrden(), "La fecha de inicio debe estar entre la fecha de OT y hoy en Santiago.");
      const anterior = await tx.workOrderOperation.findUniqueOrThrow({ where: { workOrderId_version: { workOrderId: work.id, version: work.version } } });
      await tx.workOrder.update({ where: { id: work.id }, data: { status: "EN_PROCESO", startedDate: fecha(d.startedDate), version: { increment: 1 } } });
      const [snap] = await tx.$queryRaw<{ plan: Prisma.InputJsonValue; reservations: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${work.id}) AS plan,public.snapshot_reservas_trabajo(${work.id}) AS reservations`;
      await tx.workOrderOperation.create({ data: { workOrderId: work.id, idempotencyKey: key, fingerprint, type: "INICIAR", version: work.version + 1,
        beforeSnapshot: anterior.afterSnapshot as Prisma.InputJsonValue, afterSnapshot: snap.plan, reservationSnapshot: snap.reservations } });
      return { ok: true as const, id: work.id, version: work.version + 1, mensaje: "OT iniciada sin modificar existencias ni reservas." };
    }, { maxWait: 10000, timeout: 30000 });
  } catch (e) {
    if (e instanceof ReglaTrabajo) return { ok: false, mensaje: e.message };
    console.error("Error al iniciar OT:", e);
    return { ok: false, mensaje: "No se pudo comprobar el inicio. Reintenta sin cambiar la solicitud.", incierto: true };
  }
}

async function bloquearRecursos(tx: Prisma.TransactionClient, d: PlanTrabajo) {
  const productos = [...new Set(d.lines.flatMap(l => l.productId ? [l.productId] : []))].sort((a,b)=>a-b);
  // Descubrir componentes antes de bloquear. Si cambia su conjunto, abortar en vez de invertir locks.
  const receta = await tx.productRecipe.findMany({ where: { productId: { in: productos } } });
  const anteriores = d.id ? await tx.workOrderDetail.findMany({ where: { workOrderId: d.id } }) : [];
  const historicas = d.id ? await tx.workOrderRecipeMaterial.findMany({ where: { workOrderLine: { workOrderId: d.id } } }) : [];
  const reservas = d.id ? await tx.stockReservationAllocation.findMany({ where: { workOrderId: d.id } }) : [];
  const raws = [...new Set([...receta.map(r=>r.rawMaterialId), ...anteriores.map(r=>r.rawMaterialId), ...historicas.map(r=>r.rawMaterialId),
    ...reservas.flatMap(r=>r.rawMaterialId ? [r.rawMaterialId] : []), ...d.lines.flatMap(l=>[...(l.rawMaterialId ? [l.rawMaterialId] : []),...l.materials.map(m=>m.rawMaterialId)])])].sort((a,b)=>a-b);
  for (const id of raws) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
  for (const id of productos) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
  const actual = await tx.productRecipe.findMany({ where: { productId: { in: productos } } });
  exigir(actual.every(r=>raws.includes(r.rawMaterialId)), "La composición de receta cambió mientras se bloqueaban los recursos. Actualiza el plan.");
  const bodegas = [...new Set([...anteriores.map(r=>r.warehouseId),...reservas.map(r=>r.warehouseId),...d.lines.flatMap(l=>[...l.supplies.map(s=>s.warehouseId),...l.materials.map(m=>m.warehouseId)])])].sort((a,b)=>a-b);
  for (const id of bodegas) await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
}

async function revisarLinea(tx: Prisma.TransactionClient, dto: LineaPlanTrabajo, vieja: WorkOrderLine | undefined, comercial: boolean, confirmar: boolean) {
  const q = decimal(dto.quantity), fabricar = decimal(dto.quantityToProduce);
  const producto = dto.productId ? await tx.product.findUnique({ where: { id: dto.productId, deletedAt: null } }) : null;
  const raw = dto.rawMaterialId ? await tx.rawMaterial.findUnique({ where: { id: dto.rawMaterialId } }) : null;
  const unidad = await tx.unitMeasure.findUniqueOrThrow({ where: { id: dto.unitMeasureId } });
  const catalogo = dto.kind === "PRODUCTO" && dto.executionMode === "CATALOGO" && producto && !raw;
  const directa = dto.kind === "MATERIA_PRIMA" && dto.executionMode === "VENTA_DIRECTA_MP" && raw && !producto;
  const servicio = dto.kind === "SERVICIO" && ["SERVICIO","A_MEDIDA"].includes(dto.executionMode) && !producto && !raw;
  exigir(catalogo || directa || servicio, "Tipo comercial, modo operativo y recurso incompatibles.");
  exigir(comercial || catalogo || dto.executionMode === "A_MEDIDA", "Obra propia admite fabricación de catálogo o trabajo a medida.");
  if (producto) exigir(producto.unitMeasureId === unidad.id, "La unidad del producto cambió.");
  if (raw) exigir(raw.unitMeasureId === unidad.id, "La unidad del material cambió.");
  exigir(fabricar.lte(q) && (catalogo || fabricar.isZero()), "La cantidad a fabricar supera la línea o no corresponde a su modo.");
  if (!comercial && catalogo) exigir(fabricar.eq(q), "La obra propia de catálogo fabrica toda su cantidad; no crea una obligación de entregar stock propio.");
  const desdeStock = catalogo ? q.minus(fabricar) : directa ? q : new Prisma.Decimal(0);
  const recipe = [] as { rawMaterialId: number; unitMeasureId: number; quantityPerUnit: string; materialCode: string; materialName: string; unitName: string; unitAbbreviation: string }[];
  let capturedAt: Date | null = null, fingerprint: string | null = null, productVersion: number | null = null;
  if (catalogo && fabricar.gt(0)) {
    const conservar = vieja && vieja.recipeCapturedAt && !dto.refreshRecipe;
    if (conservar) {
      exigir(dto.productVersion === vieja.productVersion, "La revisión histórica del plan cambió.");
      const rs = await tx.workOrderRecipeMaterial.findMany({ where: { workOrderLineId: vieja.id, retiredAt: null }, orderBy: { rawMaterialId: "asc" } });
      recipe.push(...rs.map(r=>({ rawMaterialId:r.rawMaterialId,unitMeasureId:r.unitMeasureId,quantityPerUnit:r.quantityPerUnit.toFixed(3),materialCode:r.materialCode,materialName:r.materialName,unitName:r.unitName,unitAbbreviation:r.unitAbbreviation })));
      capturedAt = vieja.recipeCapturedAt; fingerprint = vieja.recipeFingerprint; productVersion = vieja.productVersion;
    } else {
      exigir(dto.productVersion === producto!.version, "El producto o su receta cambió. Actualiza antes de capturar la receta.");
      const rs = await tx.productRecipe.findMany({ where: { productId: producto!.id }, orderBy: { rawMaterialId: "asc" } });
      for (const r of rs) {
        const m=await tx.rawMaterial.findUniqueOrThrow({where:{id:r.rawMaterialId}}), u=await tx.unitMeasure.findUniqueOrThrow({where:{id:m.unitMeasureId}});
        recipe.push({rawMaterialId:m.id,unitMeasureId:u.id,quantityPerUnit:r.quantity.toFixed(3),materialCode:m.code,materialName:m.name,unitName:u.name,unitAbbreviation:u.abbreviation});
      }
      capturedAt=new Date();fingerprint=hash(recipe);productVersion=producto!.version;
    }
    exigir(recipe.length, "La fabricación requiere una receta con materiales.");
  }
  const requerimientos = recipe.length ? calcularRequerimientosProduccion(fabricar.toFixed(3),recipe).materials : [];
  const revisiones: Record<string,{exactQuantity:string;quantity:string;reason:string}> = {};
  const overrideIds=new Set<number>();
  for(const r of dto.roundingReviews){
    exigir(!overrideIds.has(r.rawMaterialId),"No repetir una revisión de redondeo.");overrideIds.add(r.rawMaterialId);
    const esperado=requerimientos.find(m=>m.rawMaterialId===r.rawMaterialId);
    exigir(esperado?.requiresReview,"La revisión de redondeo sólo corresponde a una necesidad positiva que queda en cero.");
    revisiones[String(r.rawMaterialId)]={exactQuantity:esperado.expectedExactQuantity,quantity:r.quantity,reason:r.reason};
  }
  for (const r of requerimientos) if(r.requiresReview && confirmar) exigir(revisiones[String(r.rawMaterialId)],"Una necesidad positiva queda en cero: indica cantidad positiva y motivo de revisión antes de confirmar.");
  const matKeys=new Set<string>(), supplyKeys=new Set<number>();
  for(const m of dto.materials){
    const k=`${m.rawMaterialId}/${m.warehouseId}`;exigir(!matKeys.has(k),"Repite un material/bodega en la distribución.");matKeys.add(k);
    exigir(dto.executionMode==="A_MEDIDA" || recipe.some(r=>r.rawMaterialId===m.rawMaterialId),"El requerimiento no pertenece a la receta histórica.");
    const w=await tx.warehouse.findUniqueOrThrow({where:{id:m.warehouseId}});exigir(w.classification==="MATERIA_PRIMA"||w.classification==="MIXTA","Selecciona bodega clasificada para materias primas.");
  }
  exigir(dto.executionMode!=="SERVICIO" || dto.materials.length===0,"Servicio puro no consume materiales; usa modo a medida si los requiere.");
  for(const rawId of new Set(dto.materials.map(m=>m.rawMaterialId))){
    const suma=dto.materials.filter(m=>m.rawMaterialId===rawId).reduce((s,m)=>s.plus(m.quantity),new Prisma.Decimal(0));
    exigir(suma.lte("99999999999.999"),"La suma prevista de un material excede el límite.");
  }
  for(const r of requerimientos){
    const esperada=decimal(revisiones[String(r.rawMaterialId)]?.quantity ?? r.expectedQuantity);
    const asignada=dto.materials.filter(m=>m.rawMaterialId===r.rawMaterialId).reduce((s,m)=>s.plus(m.quantity),new Prisma.Decimal(0));
    exigir(asignada.lte(esperada) && (!confirmar || asignada.eq(esperada)),"Distribuye la cantidad prevista completa de cada material para confirmar; el borrador admite distribución parcial.");
  }
  for(const s of dto.supplies){
    exigir(!supplyKeys.has(s.warehouseId),"Repite una bodega de abastecimiento.");supplyKeys.add(s.warehouseId);
    const w=await tx.warehouse.findUniqueOrThrow({where:{id:s.warehouseId}});
    exigir(catalogo ? w.classification==="PRODUCTO_TERMINADO"||w.classification==="MIXTA" : directa && (w.classification==="MATERIA_PRIMA"||w.classification==="MIXTA"),"Bodega de abastecimiento incompatible.");
  }
  const abastecida=dto.supplies.reduce((s,m)=>s.plus(m.quantity),new Prisma.Decimal(0));
  exigir(abastecida.lte(desdeStock) && (!confirmar || abastecida.eq(desdeStock)),"Distribuye toda la cantidad desde stock/venta directa para confirmar.");
  return { recipe, capturar: !vieja?.recipeCapturedAt || dto.refreshRecipe, productVersion,capturedAt,fingerprint,
    roundingReview:Object.keys(revisiones).length ? revisiones as Prisma.InputJsonValue : Prisma.DbNull,
    qtyStock:catalogo ? desdeStock : null, qtyProduce:catalogo ? fabricar : null,
    code:producto?.code ?? raw?.code ?? null,unitName:unidad.name,unitAbbreviation:unidad.abbreviation,ownDescription:producto?.name ?? dto.description };
}

async function guardarLinea(tx: Prisma.TransactionClient, wId: number, dto: LineaPlanTrabajo, vieja: WorkOrderLine | undefined, comercial: boolean, position: number, confirmar: boolean,
 source?: {id:number;salesOrderId:number;code:string|null;unitName:string;unitAbbreviation:string}) {
  const plan=await revisarLinea(tx,dto,vieja,comercial,confirmar);
  const cambios={quantity:dto.quantity,quantityToProduce:plan.qtyProduce,quantityFromStock:plan.qtyStock,productVersion:plan.productVersion,
    recipeCapturedAt:plan.capturedAt,recipeFingerprint:plan.fingerprint,executionMode:dto.executionMode,roundingReview:plan.roundingReview};
  const line=vieja ? await tx.workOrderLine.update({where:{id:vieja.id},data:{...cambios,version:{increment:1}}}) : await tx.workOrderLine.create({data:{...cambios,
    workOrderId:wId,salesOrderId:source?.salesOrderId ?? null,salesOrderDetailId:source?.id ?? null,position,kind:dto.kind,productId:dto.productId,rawMaterialId:dto.rawMaterialId,
    unitMeasureId:dto.unitMeasureId,description:comercial ? dto.description : plan.ownDescription,code:source?.code ?? plan.code,unitName:source?.unitName ?? plan.unitName,unitAbbreviation:source?.unitAbbreviation ?? plan.unitAbbreviation}});
  const activarReceta=plan.capturar || plan.recipe.length===0;
  if(activarReceta){
    await tx.workOrderRecipeMaterial.updateMany({where:{workOrderLineId:line.id,retiredAt:null},data:{retiredAt:new Date()}});
    for(const r of plan.recipe) await tx.workOrderRecipeMaterial.upsert({where:{workOrderLineId_rawMaterialId:{workOrderLineId:line.id,rawMaterialId:r.rawMaterialId}},create:{workOrderLineId:line.id,...r},update:{...r,retiredAt:null}});
  }
  await tx.workOrderDetail.updateMany({where:{workOrderLineId:line.id,retiredAt:null},data:{retiredAt:new Date()}});
  const rs=await tx.workOrderRecipeMaterial.findMany({where:{workOrderLineId:line.id,retiredAt:null}});
  for(const m of dto.materials){
    const receta=rs.find(r=>r.rawMaterialId===m.rawMaterialId);
    const raw=await tx.rawMaterial.findUniqueOrThrow({where:{id:m.rawMaterialId}}), u=await tx.unitMeasure.findUniqueOrThrow({where:{id:raw.unitMeasureId}});
    const datos={quantityNeeded:m.quantity,recipeMaterialId:receta?.id ?? null,unitMeasureId:receta?.unitMeasureId ?? u.id,materialCode:receta?.materialCode ?? raw.code,
      materialName:receta?.materialName ?? raw.name,unitName:receta?.unitName ?? u.name,unitAbbreviation:receta?.unitAbbreviation ?? u.abbreviation,retiredAt:null};
    await tx.workOrderDetail.upsert({where:{workOrderLineId_rawMaterialId_warehouseId:{workOrderLineId:line.id,rawMaterialId:m.rawMaterialId,warehouseId:m.warehouseId}},
      create:{workOrderId:wId,workOrderLineId:line.id,rawMaterialId:m.rawMaterialId,warehouseId:m.warehouseId,...datos},update:datos});
  }
  await tx.workOrderSupplyPlan.updateMany({where:{workOrderLineId:line.id,retiredAt:null},data:{retiredAt:new Date()}});
  for(const s of dto.supplies) await tx.workOrderSupplyPlan.upsert({where:{workOrderLineId_warehouseId:{workOrderLineId:line.id,warehouseId:s.warehouseId}},
    create:{workOrderId:wId,workOrderLineId:line.id,rawMaterialId:dto.rawMaterialId,productId:dto.productId,warehouseId:s.warehouseId,quantity:s.quantity},update:{quantity:s.quantity,retiredAt:null}});
}

async function conciliarReservas(tx: Prisma.TransactionClient, id:number, key:string, confirmar:boolean, reason:string) {
  const asignaciones=await tx.stockReservationAllocation.findMany({where:{workOrderId:id},orderBy:{id:"asc"}});
  const detalles=await tx.workOrderDetail.findMany({where:{workOrderId:id,retiredAt:null}}), supplies=await tx.workOrderSupplyPlan.findMany({where:{workOrderId:id,retiredAt:null}});
  const pendientes=new Map<string,Prisma.Decimal>();
  for(const a of asignaciones){
    const origen=a.plannedDetailId ? `d${a.plannedDetailId}` : `s${a.supplyPlanId}`;
    const demanda=confirmar ? (a.plannedDetailId ? detalles.find(d=>d.id===a.plannedDetailId)?.quantityNeeded : supplies.find(s=>s.id===a.supplyPlanId)?.quantity) ?? new Prisma.Decimal(0) : new Prisma.Decimal(0);
    if(!pendientes.has(origen)) pendientes.set(origen,demanda);
    const [r]=await tx.$queryRaw<{quantity:string}[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS quantity`;
    const activa=decimal(r.quantity), conservar=Prisma.Decimal.min(activa,pendientes.get(origen)!);
    pendientes.set(origen,pendientes.get(origen)!.minus(conservar));
    if(activa.gt(conservar)) await tx.stockReservationEvent.create({data:{allocationId:a.id,type:"LIBERAR",quantity:activa.minus(conservar),reason,operationId:key}});
  }
}

export async function guardarPlanTrabajo(input: unknown, clave: unknown): Promise<ResultadoTrabajo> {
  const parsed=planTrabajoSchema.safeParse(input), k=z.uuid().safeParse(clave);
  if(!parsed.success || !k.success) return {ok:false,mensaje:!parsed.success ? parsed.error.issues[0].message : "UUID inválido."};
  const d=parsed.data,key=k.data.toLowerCase(),type=d.id ? "EDITAR_PLAN" : "CREAR",fingerprint=hash({type,plan:d});
  try{return await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
    const previa=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});
    if(previa){exigir(previa.type===type && previa.fingerprint===fingerprint && (!d.id||previa.workOrderId===d.id),"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:previa.workOrderId,version:previa.version,mensaje:"La operación ya se confirmó."};}
    exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave ya pertenece a otro documento.");
    exigir(d.date<=hoyOrden(),"La fecha de OT no puede ser futura.");
    exigir(!d.targetDate || d.targetDate>=d.date,"La fecha objetivo no puede ser anterior a la OT.");
    exigir(d.id ? d.version!==null && d.reason.length>0 : d.version===null,"Editar requiere versión y motivo; crear no lleva versión previa.");
    exigir(d.salesOrderId ? d.salesOrderVersion!==null && !d.ownPurpose : Boolean(d.ownPurpose),"Selecciona revisión comercial o indica finalidad de obra propia.");
    let before: Prisma.JsonValue | undefined;
    let w = d.id ? await tx.workOrder.findUniqueOrThrow({where:{id:d.id}}) : null;
    if(d.salesOrderId){
      if(!w) await leerCompromisoParaTrabajo(tx,{id:d.salesOrderId,version:d.salesOrderVersion!});
      else {const s=await tx.salesOrder.findUniqueOrThrow({where:{id:d.salesOrderId}});await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${s.quoteId} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id=${s.id} FOR UPDATE`;}
    }
    if(w){await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${w.id} FOR UPDATE`;w=await tx.workOrder.findUniqueOrThrow({where:{id:w.id}});
      exigir(w.schemaVersion===1&&w.status==="PENDIENTE"&&w.version===d.version,"La OT cambió o no admite edición; actualiza el listado.");
      exigir(w.salesOrderId===d.salesOrderId && w.salesOrderVersion===d.salesOrderVersion && w.date!.toISOString().slice(0,10)===d.date,"Origen y fecha de OT son inmutables.");
      before=(await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:w.id,version:w.version}}})).afterSnapshot;
    }
    const viejas=w ? await tx.workOrderLine.findMany({where:{workOrderId:w.id},orderBy:{position:"asc"}}) : [];
    if(w) exigir(d.lines.length===viejas.length && new Set(d.lines.map(l=>l.id)).size===viejas.length && d.lines.every(l=>viejas.some(v=>v.id===l.id)),"La revisión conserva todas las líneas; no se borran orígenes históricos.");
    else exigir(d.lines.every(l=>l.id===null),"Una OT nueva no puede reutilizar líneas de otro trabajo.");
    const sales=d.salesOrderId ? await tx.salesOrder.findUniqueOrThrow({where:{id:d.salesOrderId}}) : null;
    const source=sales ? await tx.salesOrderDetail.findMany({where:{salesOrderId:sales.id},orderBy:{position:"asc"}}) : [];
    if(sales){exigir(sales.status==="CONFIRMADA"&&sales.version===d.salesOrderVersion&&d.date>=sales.acceptanceDate!.toISOString().slice(0,10),"Orden o fecha comercial incompatibles.");
      exigir(source.length===d.lines.length && new Set(d.lines.map(l=>l.sourceDetailId)).size===source.length,"El trabajo debe conservar todas las líneas aceptadas.");
      for(const l of d.lines){const s=source.find(s=>s.id===l.sourceDetailId);exigir(s && l.kind===s.kind && l.productId===s.productId && l.rawMaterialId===s.rawMaterialId && l.unitMeasureId===s.unitMeasureId && l.description===s.description && decimal(l.quantity).eq(s.quantity),"La línea debe conservar descripción, unidad, cantidad y recurso aceptados.");}}
    else exigir(d.lines.every(l=>l.sourceDetailId===null),"Obra propia no tiene detalles comerciales.");
    for(const l of d.lines){const v=viejas.find(v=>v.id===l.id);if(v) exigir(l.kind===v.kind && l.productId===v.productId && l.rawMaterialId===v.rawMaterialId && l.unitMeasureId===v.unitMeasureId && l.description===v.description && l.sourceDetailId===v.salesOrderDetailId,"No cambiar identidad ni copias de una línea existente.");}
    await bloquearRecursos(tx,d);
    if(!w){const numeracion=await tx.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});exigir(numeracion.nextNumber!==null&&numeracion.padding!==null,"Configura primero la numeración de Orden de Trabajo.");const folio=await asignarFolio(tx,"ORDEN_TRABAJO",key);w=await tx.workOrder.create({data:{schemaVersion:1,folioId:folio.id,creationKey:key,date:fecha(d.date),productName:d.productName,ownPurpose:sales ? null:d.ownPurpose,
      salesOrderId:d.salesOrderId,salesOrderVersion:sales?.version ?? null,sourceSnapshot:sales ? jsonHistoricoOrden({schemaVersion:1,order:sales,details:source}) : Prisma.DbNull,
      technicalDescription:sales ? sales.technicalDescription as Prisma.InputJsonValue : Prisma.DbNull,internalInstructions:d.internalInstructions||null,targetDate:d.targetDate ? fecha(d.targetDate):null}});}
    else w=await tx.workOrder.update({where:{id:w.id},data:{productName:d.productName,ownPurpose:sales ? null:d.ownPurpose,internalInstructions:d.internalInstructions||null,targetDate:d.targetDate ? fecha(d.targetDate):null,version:{increment:1}}});
    for(let i=0;i<d.lines.length;i++){const dto=d.lines[i],v=viejas.find(v=>v.id===dto.id),s=source.find(s=>s.id===dto.sourceDetailId);
      await guardarLinea(tx,w.id,dto,v,Boolean(sales),v?.position ?? s?.position ?? i,d.confirmPlan,s);}
    await conciliarReservas(tx,w.id,key,d.confirmPlan,d.reason||"Confirmación inicial del plan");
    if(d.confirmPlan) await reservarPlanTrabajoEnTransaccion(tx,w.id,key);
    const [snap]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${w.id}) AS plan,public.snapshot_reservas_trabajo(${w.id}) AS reservations`;
    await tx.workOrderOperation.create({data:{workOrderId:w.id,idempotencyKey:key,fingerprint,type,version:w.version,beforeSnapshot:before as Prisma.InputJsonValue | undefined,
      afterSnapshot:snap.plan,reservationSnapshot:snap.reservations,planConfirmed:d.confirmPlan,reason:d.reason||null}});
    return {ok:true as const,id:w.id,version:w.version,mensaje:d.confirmPlan ? "Plan confirmado y stock disponible reservado; revisa faltantes." : "Borrador guardado sin reservas activas."};
  },{maxWait:10000,timeout:60000});}catch(e){if(e instanceof ReglaTrabajo || (e instanceof Error && e.name==="ReglaOrden"))return {ok:false,mensaje:e.message};
    console.error("Error al guardar planificación de OT:",e);return {ok:false,mensaje:"No se pudo confirmar la OT. Conserva la solicitud y reintenta con el mismo UUID.",incierto:true};}
}
