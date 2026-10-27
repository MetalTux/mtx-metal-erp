import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { guardarPlanTrabajo } from '../../src/lib/servicios/ordenes-trabajo';
import { hoyOrden } from '../../src/lib/servicios/ordenes-compra-cliente';
export async function crearPlanConMaterial(unitMeasureId:number,rawMaterialId:number,warehouseId:number){
 return guardarPlanTrabajo({id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoyOrden(),productName:'Plan de regresión S6',ownPurpose:'Verificar referencias históricas',internalInstructions:'',targetDate:null,confirmPlan:false,reason:'',lines:[{id:null,sourceDetailId:null,kind:'SERVICIO',executionMode:'A_MEDIDA',productId:null,rawMaterialId:null,unitMeasureId,description:'Fabricación interna',quantity:'1',quantityToProduce:'0',productVersion:null,refreshRecipe:false,materials:[{rawMaterialId,warehouseId,quantity:'1'}],supplies:[],roundingReviews:[]}]},randomUUID());
}
export function exigirPlan(r:Awaited<ReturnType<typeof crearPlanConMaterial>>){assert(r.ok,JSON.stringify(r));return r;}
