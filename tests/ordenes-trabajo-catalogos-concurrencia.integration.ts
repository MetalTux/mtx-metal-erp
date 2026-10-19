import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarPlanTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo } from "../src/lib/consultas/ordenes-trabajo";
import { guardarMaterial } from "../src/lib/servicios/materiales";
import { guardarBodega } from "../src/lib/servicios/bodegas";
import { hoyOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import type { PlanTrabajo } from "../src/lib/validaciones/orden-trabajo";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&u.pathname.startsWith("/mtx_validacion_ot_pdf_"));
async function main(){
 const key=()=>randomUUID(),unit=await prisma.unitMeasure.create({data:{name:`Unidad carreras ${key()}`,abbreviation:"un"}}),other=await prisma.unitMeasure.create({data:{name:`Otra unidad carreras ${key()}`,abbreviation:"kg"}});
 async function fixture(){const m=await prisma.rawMaterial.create({data:{code:key(),name:"Material carrera de catálogo",unitMeasureId:unit.id}}),b=await prisma.warehouse.create({data:{name:"Bodega carrera de catálogo",classification:"MATERIA_PRIMA"}});const plan:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoyOrden(),productName:"Plan concurrente",ownPurpose:"Regresión de catálogos",internalInstructions:"",targetDate:null,confirmPlan:true,reason:"",lines:[{id:null,sourceDetailId:null,kind:"SERVICIO",executionMode:"A_MEDIDA",productId:null,rawMaterialId:null,unitMeasureId:unit.id,description:"Obra propia",quantity:"1",quantityToProduce:"0",productVersion:null,refreshRecipe:false,materials:[{rawMaterialId:m.id,warehouseId:b.id,quantity:"1"}],supplies:[],roundingReviews:[]}]};return {m,b,plan};}
 for(let i=0;i<3;i++){
  const {m,plan}=await fixture();const [saved,changed]=await Promise.all([guardarPlanTrabajo(plan,key()),guardarMaterial({code:m.code,name:m.name,description:"",unitMeasureId:other.id},{id:m.id,updatedAt:m.updatedAt.toISOString()})]);
  if(saved.ok){const row=await prisma.workOrderDetail.findFirstOrThrow({where:{workOrderId:saved.id}}),actual=await prisma.rawMaterial.findUniqueOrThrow({where:{id:m.id}});assert.equal(row.unitMeasureId,actual.unitMeasureId);assert.equal(actual.unitMeasureId,changed.ok?other.id:unit.id);}else assert(changed.ok);
 }
 for(let i=0;i<3;i++){
  const {b,plan}=await fixture();const [saved,changed]=await Promise.all([guardarPlanTrabajo(plan,key()),guardarBodega({name:b.name,location:"",classification:"PRODUCTO_TERMINADO"},{id:b.id,updatedAt:b.updatedAt.toISOString()})]);assert.equal(Number(saved.ok)+Number(changed.ok),1,"Clasificación incompatible y requerimiento no se confirman juntos");
 }
 for(let i=0;i<3;i++){
  const {m,plan}=await fixture(),p=await prisma.product.create({data:{name:"Producto receta concurrente",unitMeasureId:unit.id,creationKey:key(),creationFingerprint:"a".repeat(64)}});await prisma.productRecipe.create({data:{productId:p.id,rawMaterialId:m.id,quantity:"1"}});
  const productPlan:PlanTrabajo={...plan,lines:plan.lines.map(l=>({...l,kind:"PRODUCTO",executionMode:"CATALOGO",productId:p.id,productVersion:p.version,quantityToProduce:"1"}))};
  const [saved]=await Promise.all([guardarPlanTrabajo(productPlan,key()),prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${m.id} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${p.id} FOR UPDATE`;await tx.productRecipe.update({where:{productId_rawMaterialId:{productId:p.id,rawMaterialId:m.id}},data:{quantity:"2"}});await tx.product.update({where:{id:p.id},data:{version:{increment:1}}});})]);
  if(saved.ok){const w=await consultarTrabajo(saved.id);assert.equal(w.historicalRecipes[0].quantityPerUnit,"1.000");assert.equal(w.materials[0].quantity,"1.000");}assert.equal((await prisma.productRecipe.findUniqueOrThrow({where:{productId_rawMaterialId:{productId:p.id,rawMaterialId:m.id}}})).quantity.toFixed(3),"2.000");
 }
 console.log("Catálogos concurrentes: unidad vigente protegida, clasificación serializada y receta histórica coherente con sus locks.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
