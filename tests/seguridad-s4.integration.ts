import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { hash } from "@node-rs/argon2";
import { prisma } from "../src/lib/prisma";
import { operarSeguridad, autorizarSesionEnTransaccion } from "../src/lib/seguridad/servicio";
import { conCredencialSeguridad, exigirAcceso } from "../src/lib/seguridad/acceso";
import { tienePermiso, rolesSeguridad } from "../src/lib/seguridad/permisos";
import { listarUnidades, guardarUnidad } from "../src/lib/servicios/unidades-medida";
import { listarClientes } from "../src/lib/servicios/clientes";
import { listarProveedores } from "../src/lib/servicios/proveedores";
import { listarCompras } from "../src/lib/servicios/compras";
import { consultarCotizaciones } from "../src/lib/consultas/cotizaciones";
import { consultarOrdenesCompraCliente, obtenerOrdenCompraCliente } from "../src/lib/consultas/ordenes-compra-cliente";
import { listarTrabajos, consultarTrabajo, catalogosTrabajo } from "../src/lib/consultas/ordenes-trabajo";
import { listarGuiasDespacho } from "../src/lib/consultas/guias-despacho";
import { listarProductos, guardarProducto } from "../src/lib/servicios/productos";
import { registrarFacturaTrabajo } from "../src/lib/servicios/cierre-trabajo";
import { guardarPlanTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { configurarNumeracion } from "../src/lib/servicios/numeracion";
import { huellaToken } from "../src/lib/seguridad/configuracion";
const url = new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(url.hostname) && /^\/mtx_validacion_seguridad_s4_\d{8}$/.test(url.pathname), "Sólo copia local descartable S4");
const denegado = (f: () => Promise<unknown>) => assert.rejects(f, /NEXT_REDIRECT/);
async function main() {
 const password = `S4-${randomUUID()}`, passwordHash = await hash(password, {algorithm:2,memoryCost:19456,timeCost:2,parallelism:1});
 const actors: {id:number;roles:string[];email:string;token:string}[]=[];
 for (const roles of [...rolesSeguridad.map(r=>[r]), ["VENTAS","COBRANZA"]]) {
  const email=`s4-${randomUUID()}@ejemplo.invalid`;
  const role=await prisma.role.upsert({where:{name:roles[0]},create:{name:roles[0]},update:{}});
  const user=await prisma.user.create({data:{name:`Prueba ${roles.join(" + ")}`,email,password:"!INUTILIZABLE",roleId:role.id}});
  await prisma.userSecurity.create({data:{userId:user.id,normalizedEmail:email,status:"ACTIVO",passwordHash,passwordChangedAt:new Date()}});
  await prisma.userSecurityRole.createMany({data:roles.map(role=>({userId:user.id,role:role as typeof rolesSeguridad[number]}))});
  const r=await operarSeguridad({}, {action:"login",email,password}); assert(r.client.ok&&r.sessionToken);
  actors.push({id:user.id,roles,email,token:r.sessionToken});
 }
 const reads: [string,()=>Promise<unknown>][] = [["catalogos.leer",listarUnidades],["clientes.leer",listarClientes],["proveedores.leer",listarProveedores],["compras.leer",()=>listarCompras({})],["cotizaciones.leer",()=>consultarCotizaciones({})],["ordenes_cliente.leer",()=>consultarOrdenesCompraCliente({})],["trabajos.leer",()=>listarTrabajos({})],["guias.leer",()=>listarGuiasDespacho({})]];
 for(const actor of actors) await conCredencialSeguridad(actor.token,async()=>{
  for(const [permiso,read] of reads) if(tienePermiso(actor.roles,permiso)) await read(); else await denegado(read);
  for(const [permiso,write] of [["catalogos.operar",()=>guardarUnidad({})],["trabajos.operar",()=>guardarPlanTrabajo({},randomUUID())],["facturas.operar",()=>registrarFacturaTrabajo({},randomUUID())],["configuracion.operar",()=>configurarNumeracion({})]] as const) {
   if(tienePermiso(actor.roles,permiso)) await write(); else await denegado(write);
  }
  if(tienePermiso(actor.roles,"catalogos.leer")){
   const products=await listarProductos(); if(!tienePermiso(actor.roles,"precios.leer"))assert(products.every(p=>p.suggestedPrice===null));
  }
  if(tienePermiso(actor.roles,"trabajos.leer")){
   await catalogosTrabajo();
   const works=await prisma.workOrder.findMany({take:3});
   for(const w of works){const dto=await consultarTrabajo(w.id);if(!tienePermiso(actor.roles,"precios.leer")){assert.equal(dto.finance,null);assert.deepEqual(dto.invoices,[]);}}
  }
  if(tienePermiso(actor.roles,"ordenes_cliente.leer")){
   const list=await consultarOrdenesCompraCliente({orden:"total"});
   if(!tienePermiso(actor.roles,"precios.leer"))assert(list.filas.every(r=>r.totalAmount===""));
   for(const row of list.filas.slice(0,2)){
    const dto=await obtenerOrdenCompraCliente(row.id);
    if(!tienePermiso(actor.roles,"precios.leer")){assert.equal(dto.cuenta,null);assert.equal(dto.totalAmount,"");assert.deepEqual(dto.bankSnapshot,{});assert(dto.lines.every(l=>l.unitPrice===""&&l.lineAmount===""));}
   }
  }
 });
 const bodega=actors.find(a=>a.roles[0]==="COMPRAS_BODEGA")!;
 const unit=await conCredencialSeguridad(bodega.token,()=>guardarUnidad({name:`Unidad S4 ${randomUUID()}`,abbreviation:"s4"}));assert(unit.ok,unit.mensaje);
 const datosProducto={name:`Producto S4 ${randomUUID()}`,description:"Prueba de permisos de precio",unitMeasureId:unit.unidad!.id,suggestedPrice:"777777",recipes:[],images:[]};
 const creado=await conCredencialSeguridad(actors[0].token,()=>guardarProducto(datosProducto,undefined,[],randomUUID()));assert(creado.ok&&creado.producto);
 const editado=await conCredencialSeguridad(bodega.token,()=>guardarProducto({...datosProducto,suggestedPrice:"999999"},{id:creado.producto!.id,version:creado.producto!.version}));assert(editado.ok,editado.mensaje);
 assert.equal(editado.producto!.suggestedPrice,null);assert.equal((await prisma.product.findUniqueOrThrow({where:{id:creado.producto!.id}})).suggestedPrice!.toFixed(0),"777777","Un formulario manipulado no cambia el precio restringido");
 const admin=actors[0],consulta=actors.find(a=>a.roles[0]==="CONSULTA_GERENCIA")!;
 const before=await prisma.unitMeasure.count();await denegado(()=>conCredencialSeguridad(consulta.token,()=>guardarUnidad({name:"No escribir",abbreviation:"no"})));assert.equal(await prisma.unitMeasure.count(),before);
 const us=await prisma.userSecurity.findUniqueOrThrow({where:{userId:bodega.id}});
 let soltar!:()=>void, tomada!:()=>void;
 const retenido=new Promise<void>(r=>{soltar=r;}), listo=new Promise<void>(r=>{tomada=r;});
 const escritura=prisma.$transaction(async tx=>{await autorizarSesionEnTransaccion(tx,bodega.token,"catalogos.operar");tomada();await retenido;},{timeout:10000});
 await listo;let termino=false;
 const cambio=operarSeguridad({session:admin.token},{action:"user-update",id:bodega.id,version:us.securityVersion,name:"Bodega ahora consulta",roles:["CONSULTA_GERENCIA"],status:"ACTIVO"}).then(r=>{termino=true;return r;});
 await new Promise(r=>setTimeout(r,100));assert.equal(termino,false,"La revocación espera al commit autorizado");
 soltar();await escritura;const changed=await cambio;assert(changed.client.ok,String(changed.client.message));
 await denegado(()=>conCredencialSeguridad(bodega.token,()=>listarUnidades()));
 await assert.rejects(()=>prisma.$transaction(tx=>autorizarSesionEnTransaccion(tx,bodega.token,"catalogos.operar")),/sesión/);
 const other=actors.find(a=>a.roles[0]==="PRODUCCION_DESPACHO")!;
 await prisma.securitySession.update({where:{tokenHash:huellaToken(other.token)},data:{authenticatedAt:new Date(Date.now()-7200000),lastActivityAt:new Date(Date.now()-3600001),expiresAt:new Date(Date.now()+3600000)}});
 await denegado(()=>conCredencialSeguridad(other.token,()=>exigirAcceso()));
 const absoluta=actors.find(a=>a.roles[0]==="COBRANZA")!;
 const inicio=new Date(Date.now()-9*3600000);
 await prisma.securitySession.update({where:{tokenHash:huellaToken(absoluta.token)},data:{authenticatedAt:inicio,reauthenticatedAt:inicio,lastActivityAt:new Date(inicio.getTime()+7*3600000),expiresAt:new Date(inicio.getTime()+8*3600000)}});
 await denegado(()=>conCredencialSeguridad(absoluta.token,()=>exigirAcceso()));
 await denegado(()=>conCredencialSeguridad("token-no-valido",()=>listarUnidades()));
 await writeFile('/tmp/s4-actores.json',JSON.stringify({actors,password}),{mode:0o600});
 console.log("S4: matriz de seis roles y unión, servicios, DTO sin importes, escritura autorizada, revocación y expiración correctas.");
}
main().finally(()=>prisma.$disconnect());
