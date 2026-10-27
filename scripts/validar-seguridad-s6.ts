import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, lstatSync, cpSync, rmSync, mkdtempSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const origen=new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(origen.hostname),"Sólo PostgreSQL local para S6");
const usuario=decodeURIComponent(origen.username),base=origen.pathname.slice(1),contenedor=process.env.S6_CONTENEDOR??"mtx-metal-erp-postgres-db";
assert(/^[a-zA-Z0-9_-]+$/.test(contenedor));
const fecha=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago"}).format(new Date()).replaceAll("-",""),destino=resolve(`backups/${fecha}_seguridad_s6/${Date.now()}`);
mkdirSync(destino,{recursive:true,mode:0o700});
const docker=(args:string[],input?:Buffer)=>{const r=spawnSync("docker",["exec","-i",contenedor,...args],{input,maxBuffer:256*1024*1024});if(r.status!==0)throw Error("Falló una operación de PostgreSQL del ensayo");return r.stdout;};
const sql=(db:string,s:string)=>docker(["psql","-U",usuario,"-d",db,"-v","ON_ERROR_STOP=1","-Atc",s]).toString().trim();
function privado(path:string,contenido:string|Buffer){writeFileSync(path,contenido,{mode:0o600});chmodSync(path,0o600);}
function huellas(db:string){
 const tablas=sql(db,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").split("\n");
 const consultas=tablas.map(t=>{assert(/^[A-Za-z0-9_]+$/.test(t));return `SELECT json_build_object('tabla','${t}','datos',count(*)::text||':'||md5(coalesce(string_agg(to_jsonb(r)::text,'' ORDER BY to_jsonb(r)::text),'')))::text FROM "${t}" r`;});
 return sql(db,consultas.join(' UNION ALL ')).split("\n").map(v=>JSON.parse(v) as {tabla:string;datos:string});
}
const almacenes=[['COBRANZA_COMPROBANTE_DIR','var/cobranza/comprobantes','comprobantes-validacion-cobranza'],['EMPRESA_LOGO_DIR','var/empresa/logos','logos'],['PRODUCTO_IMAGEN_DIR','var/productos/imagenes','imagenes-validacion-productos'],['COTIZACION_IMAGEN_DIR','var/cotizaciones/imagenes','imagenes-validacion-cotizaciones'],['COTIZACION_PDF_DIR','var/cotizaciones/pdfs','pdfs-validacion-cotizaciones'],['TRABAJO_PDF_DIR','var/trabajos/pdfs','pdfs-validacion-trabajos'],['GUIA_PDF_DIR','var/guias/pdfs','pdfs-validacion-guias']] as const;
function lista(dir:string):{archivo:string;sha256:string;bytes:number}[]{if(!existsSync(dir))return [];assert(!lstatSync(dir).isSymbolicLink(),'No se respaldan almacenes que sean enlaces simbólicos');return readdirSync(dir).sort().flatMap(n=>{const f=join(dir,n),s=lstatSync(f);assert(!s.isSymbolicLink(),"No se respaldan enlaces simbólicos");return s.isDirectory()?lista(f).map(v=>({...v,archivo:n+'/'+v.archivo})):[{archivo:n,sha256:createHash('sha256').update(readFileSync(f)).digest('hex'),bytes:s.size}];});}
const pruebas:[string,string][]=[
 ['cotizaciones-netos','netos'],['dashboard','guias_g6'],['cobranza-cierre','guias_g6'],['cobranza-consultas','cobranza_c1'],['unidades-medida','unidades'],['bodegas','bodegas_crud'],['proveedores','proveedores'],['clientes','s6'],['materiales','materiales'],['empresa','empresa'],['cuentas-bancarias','bancos'],['sucursales-clientes','sucursales'],['condiciones-pago','condiciones'],['iva','iva'],['numeracion','numeracion'],['bodegas-clasificacion','bodegas'],['productos','productos'],['inventario','s6'],['minimos-inventario','minimos'],['ajustes-inventario','ajustes'],['traslados-inventario','traslados'],['stock-terminado','terminado'],['ajustes-terminado','terminado_ajustes'],['compras','s6'],['compras-ayudas','s6'],['compras-recepciones','recepciones'],['compras-cierre','recepciones'],['cotizaciones','cotizaciones'],['ordenes-compra-cliente','occ'],['ordenes-compra-cliente-adicional','occ'],['ordenes-trabajo-plan','plan'],['ordenes-trabajo-inicio','inicio'],['reservas-stock','reservas'],['produccion','produccion'],['produccion-reversiones','produccion_reversiones'],['produccion-snapshots','produccion_snapshots'],['ordenes-trabajo-cierre','finalizacion'],['ordenes-trabajo-catalogos-concurrencia','ot_pdf'],['pdfs-cotizacion','cotizaciones'],['pdfs-trabajo','ot_pdf'],['guias-despacho','guias_g6'],['guias-correcciones','guias_g4'],['guias-documentos','guias_g5'],['guias-legado','guias_legado_g6'],['referencias-plan','referencias'],['seguridad-acceso','seguridad_s2'],['seguridad-s4','seguridad_s4'],['seguridad-s5','seguridad_s5'],['seguridad-clave8','clave8'],['seguridad-estructura','seguridad_s1'],['seguridad-restauracion','seguridad_s6'],['seguridad-https','seguridad_s6_https'],
];
async function main(){
 const seleccion=process.argv.slice(2);assert(seleccion.every(p=>pruebas.some(([n])=>n===p)),"Prueba no admitida");
 const antes=huellas(base);privado(join(destino,'base-antes.json'),JSON.stringify(antes,null,2));
 const dump=docker(['pg_dump','-U',usuario,'-Fc',base]);privado(join(destino,'postgres.dump'),dump);
 if(existsSync('.env'))privado(join(destino,'entorno-privado.env'),readFileSync('.env'));
 const archivos:Record<string,ReturnType<typeof lista>>={};
 for(const [variable,fallback,nombre]of almacenes){const dir=resolve(process.env[variable]??fallback);archivos[variable]=lista(dir);if(existsSync(dir))cpSync(dir,join(destino,'archivos',nombre),{recursive:true});}
 privado(join(destino,'archivos.json'),JSON.stringify(archivos,null,2));
 const resultados:{prueba:string;ok:boolean;segundos:number}[]=[];
 for(const [nombre,prefijo]of pruebas.filter(([n])=>!seleccion.length||seleccion.includes(n))){
  const copia=`mtx_validacion_${prefijo}_${fecha}`+(['ajustes','traslados'].includes(prefijo)?'_120000':'');assert(/^[a-z0-9_]+$/.test(copia));assert(!sql('postgres',`SELECT 1 FROM pg_database WHERE datname='${copia}'`),"Ya existe una copia; no se reemplaza");
  const temporal=mkdtempSync('/tmp/mtx-empresa-logos-s6-'),temporalGuia=nombre==='guias-documentos'?mkdtempSync('/tmp/pdfs-validacion-guias-g5-'):null;const url=new URL(origen);url.pathname='/'+copia;
  const env:NodeJS.ProcessEnv={...process.env,DATABASE_URL:url.href,S6_PRUEBA:`tests/${nombre}.integration.ts`,SEGURIDAD_ORIGEN:'http://127.0.0.1:3031',SEGURIDAD_CLAVE_ACTIVA:'s6',SEGURIDAD_CLAVES:JSON.stringify({s6:randomBytes(32).toString('base64')}),SMTP_HOST:'',SEGURIDAD_CONFIAR_PROXY:nombre==='seguridad-s5'?'1':'0',NEXT_TELEMETRY_DISABLED:'1'};
  for(const [variable,,carpeta]of almacenes){env[variable]=variable==='GUIA_PDF_DIR'&&temporalGuia?temporalGuia:join(temporal,carpeta);mkdirSync(env[variable]!,{recursive:true,mode:0o700});const source=join(destino,'archivos',carpeta);if(existsSync(source))cpSync(source,env[variable]!,{recursive:true});assert.deepEqual(lista(env[variable]!),archivos[variable],`Restauración de archivos ${variable}`);}
  const fixture=nombre==='seguridad-s4'?'/tmp/s4-actores.json':nombre==='seguridad-s5'?'/tmp/s5-actores.json':null;if(fixture)assert(!existsSync(fixture),'No reemplazar fixture ajeno');
  console.log(`Validando ${nombre}…`);const inicio=Date.now();let legadoPropio=false,copiaCreada=false;
  try{
   const vacia=['empresa','cuentas-bancarias','proveedores','iva','numeracion','seguridad-estructura'].includes(nombre);
   docker(['createdb','-U',usuario,copia]);copiaCreada=true;
   if(nombre==='guias-legado'){
    assert(!existsSync('/tmp/guias-legado-g6-antes.json'),'No reemplazar fixture de legado ajeno');legadoPropio=true;
    const migraciones=readdirSync('prisma/migrations').filter(n=>/^\d+_/.test(n)).sort();let preparado=false;
    for(const migracion of migraciones){
     if(!preparado&&migracion>='20261013184612_estructura_orden_trabajo'){
      const r=spawnSync(process.execPath,['--import','tsx','tests/guias-legado.integration.ts','preparar'],{env,encoding:'utf8',timeout:30000});privado(join(destino,'legado-preparacion.log'),(r.stdout??'')+(r.stderr??''));assert.equal(r.status,0,'Preparación del legado anterior a OT');preparado=true;
     }
     docker(['psql','-U',usuario,'-d',copia,'-v','ON_ERROR_STOP=1','-f','-'],readFileSync(join('prisma/migrations',migracion,'migration.sql')));
    }
    assert(preparado,'Se requiere el checkpoint histórico de OT');
   }else docker(['pg_restore','-U',usuario,'-d',copia,'--no-owner','--no-privileges',...(vacia?['--schema-only']:[])],dump);
   if(!vacia&&nombre!=='guias-legado')assert.deepEqual(huellas(copia),antes,'Restauración distinta del origen antes de fixtures');
   else if(vacia) {
    assert(huellas(copia).every(t=>t.datos.startsWith('0:')),'El escenario requiere tablas inicialmente vacías');
    if(nombre==='seguridad-estructura')sql(copia,`INSERT INTO "Role" (name,"updatedAt") VALUES ('Prueba S1',now())`);
    if(nombre==='numeracion')sql(copia,`INSERT INTO "DocumentNumbering" (type,"updatedAt") VALUES ('COTIZACION',now()),('ORDEN_COMPRA_CLIENTE',now()),('ORDEN_TRABAJO',now()),('GUIA_DESPACHO',now())`);
    if(nombre==='iva')sql(copia,`INSERT INTO "VatRatePeriod" (rate,"validFrom","updatedAt") VALUES (19,'2003-10-01',now())`);
   }
   if(['cobranza-consultas','cotizaciones-netos'].includes(nombre)){const m=spawnSync('pnpm',['exec','prisma','migrate','deploy'],{env,encoding:'utf8',timeout:60000});privado(join(destino,'c3-migracion.log'),(m.stdout??'')+(m.stderr??''));assert.equal(m.status,0,'Migraciones C3 en copia');}
   if(['seguridad-acceso','seguridad-clave8'].includes(nombre))sql(copia,`UPDATE "UserSecurity" SET status='INACTIVO' WHERE status='ACTIVO'`);
   const r=spawnSync(process.execPath,['--import','tsx',['seguridad-s4','seguridad-s5'].includes(nombre)?'tests/seguridad-navegador-s6.integration.ts':nombre==='seguridad-acceso'?'tests/seguridad-recuperacion-s6.integration.ts':nombre==='seguridad-https'?'tests/seguridad-s6.ui.ts':nombre.startsWith('seguridad-')?`tests/${nombre}.integration.ts`:'tests/fixtures/sesion-regresion.ts'],{env,encoding:'utf8',maxBuffer:32*1024*1024,timeout:180000});
   privado(join(destino,nombre+'.log'),(r.stdout??'')+(r.stderr??''));resultados.push({prueba:nombre,ok:r.status===0,segundos:Math.round((Date.now()-inicio)/1000)});console.log(`${r.status===0?'OK':'FALLO'} ${nombre}`);
  }finally{if(copiaCreada)docker(['dropdb','-U',usuario,'--if-exists','--force',copia]);rmSync(temporal,{recursive:true,force:true});if(temporalGuia)rmSync(temporalGuia,{recursive:true,force:true});if(fixture)rmSync(fixture,{force:true});if(legadoPropio)rmSync('/tmp/guias-legado-g6-antes.json',{force:true});}
  privado(join(destino,'resultados.json'),JSON.stringify(resultados,null,2));
 }
 assert.deepEqual(huellas(base),antes,'La base de origen cambió; revisar actividad concurrente');
 for(const [variable,fallback]of almacenes)assert.deepEqual(lista(resolve(process.env[variable]??fallback)),archivos[variable],`Almacén de origen ${variable} alterado`);
 privado(join(destino,'resumen.json'),JSON.stringify({resultados,origenSinCambios:true,almacenesSinCambios:true,restauracionPostgres:true},null,2));
 console.log(`Evidencias privadas: ${destino}. Correctas: ${resultados.filter(v=>v.ok).length}/${resultados.length}.`);if(resultados.some(v=>!v.ok))process.exitCode=1;
}
main().catch(()=>{console.error('S6 no pudo terminar. Conservar evidencia y comprobar copias/entorno.');process.exitCode=1;});
