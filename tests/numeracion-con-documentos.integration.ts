// Regresión sobre una copia con documentos existentes: no presupone contador vacío.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { asignarFolio,configurarNumeracion } from "../src/lib/servicios/numeracion";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&u.pathname.startsWith("/mtx_validacion_numeracion_"));
async function main(){
 const original=await prisma.documentFolio.findMany({orderBy:{id:"asc"}}),work=await prisma.workOrder.findMany({orderBy:{id:"asc"}}),type="GUIA_DESPACHO" as const;
 let n=await prisma.documentNumbering.findUniqueOrThrow({where:{type}});
 if(n.nextNumber===null){const c=await configurarNumeracion({...n,nextNumber:"1",padding:5});assert(c.ok);n=await prisma.documentNumbering.findUniqueOrThrow({where:{type}});}
 const initial=n.nextNumber!,prefix=n.prefix,padding=n.padding!;const uuid=randomUUID(),assign=(key:string)=>prisma.$transaction(tx=>asignarFolio(tx,type,key));
 const first=await Promise.all([assign(uuid),assign(uuid),assign(uuid)]);assert(first.every(f=>f.id===first[0].id));assert.equal(first[0].number,initial);
 const rows=await Promise.all(Array.from({length:6},()=>assign(randomUUID())));assert.equal(new Set(rows.map(f=>f.number.toString())).size,6);
 const after=await prisma.documentNumbering.findUniqueOrThrow({where:{type}});assert.equal(after.nextNumber,initial+BigInt(7));
 await assert.rejects(prisma.$transaction(async tx=>{await asignarFolio(tx,type,randomUUID());throw new Error("Rollback numeración");}));assert.equal((await prisma.documentNumbering.findUniqueOrThrow({where:{type}})).nextNumber,after.nextNumber);
 assert(!(await configurarNumeracion({...after,prefix:prefix+"X",padding,nextNumber:after.nextNumber!.toString()})).ok);assert(!(await configurarNumeracion({...after,prefix,padding,nextNumber:initial.toString()})).ok);
 assert((await configurarNumeracion({...after,prefix,padding,nextNumber:(after.nextNumber!+BigInt(10)).toString()})).ok);assert(!(await configurarNumeracion({...after,prefix,padding,nextNumber:(after.nextNumber!+BigInt(20)).toString()})).ok);
 await assert.rejects(prisma.documentFolio.update({where:{id:first[0].id},data:{folio:"Adulterado"}}));await assert.rejects(prisma.documentFolio.delete({where:{id:first[0].id}}));await assert.rejects(prisma.$transaction(tx=>asignarFolio(tx,"COTIZACION",uuid)));
 assert.deepEqual(await prisma.documentFolio.findMany({where:{id:{in:original.map(f=>f.id)}},orderBy:{id:"asc"}}),original);assert.deepEqual(await prisma.workOrder.findMany({orderBy:{id:"asc"}}),work);
 console.log("Numeración con documentos existentes: UUID, secuencia, rollback, concurrencia, versiones y conservación histórica correctos.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
