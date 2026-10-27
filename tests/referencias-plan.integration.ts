import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { consultarMaterial, guardarMaterial, eliminarMaterial } from '../src/lib/servicios/materiales';
import { consultarBodega, eliminarBodega } from '../src/lib/servicios/bodegas';
import { eliminarUnidad } from '../src/lib/servicios/unidades-medida';
import { crearPlanConMaterial, exigirPlan } from './fixtures/plan-propio';
async function main(){
 const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname.startsWith('/mtx_validacion_referencias_'));
 const name=`Referencias S6 ${randomUUID()}`,unit=await prisma.unitMeasure.create({data:{name,abbreviation:'un'}}),other=await prisma.unitMeasure.create({data:{name:name+' otra',abbreviation:'ot'}}),material=await prisma.rawMaterial.create({data:{code:name,name,unitMeasureId:unit.id}}),warehouse=await prisma.warehouse.create({data:{name,classification:'MATERIA_PRIMA'}});
 exigirPlan(await crearPlanConMaterial(unit.id,material.id,warehouse.id));
 assert.equal(await prisma.warehouseStock.count({where:{rawMaterialId:material.id}}),0);assert.equal(await prisma.stockMovement.count({where:{rawMaterialId:material.id}}),0);
 const current=await consultarMaterial(material.id);assert(current.ok&&current.material);assert(current.material.referencias.trabajos>0);
 const referencia={id:material.id,updatedAt:current.material.updatedAt};
 assert(!(await guardarMaterial({code:name,name,description:'',unitMeasureId:other.id},referencia)).ok);
 assert(!(await eliminarMaterial(referencia)).ok);
 const wh=await consultarBodega(warehouse.id);assert(wh.ok&&wh.bodega);assert(!(await eliminarBodega({id:warehouse.id,updatedAt:wh.bodega.updatedAt})).ok);
 assert(!(await eliminarUnidad({id:unit.id,updatedAt:unit.updatedAt.toISOString()})).ok);
 assert(await prisma.rawMaterial.findUnique({where:{id:material.id}}));assert(await prisma.warehouse.findUnique({where:{id:warehouse.id}}));
 console.log('S6: plan vigente sin stock ni movimientos protege material/unidad/bodega y bloquea cambio de unidad sin alterar historia.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
