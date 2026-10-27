import "dotenv/config";
import assert from "node:assert/strict";
import { createServer as httpServer, request as httpRequest } from "node:http";
import { createServer as httpsServer } from "node:https";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, openSync, closeSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, type Browser } from "playwright";
import { hash } from "@node-rs/argon2";
import { generate } from "otplib";
import { prisma } from "../src/lib/prisma";
const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/mtx_validacion_seguridad_s6_https_\d{8}$/.test(url.pathname), "Sólo copia HTTPS S6");
async function main() {
 const temp=mkdtempSync('/tmp/mtx-s6-https-'),log=openSync(join(temp,'next.log'),'a',0o600);
 let child:ChildProcess|undefined;
 const backend=httpServer();backend.listen(0,'127.0.0.1');await once(backend,'listening');const port=(backend.address() as {port:number}).port;await new Promise<void>(r=>backend.close(()=>r()));
 const cert=join(temp,'cert.pem'),key=join(temp,'key.pem');
 assert.equal(spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'}).status,0);
 const proxy=httpsServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-for':req.socket.remoteAddress??'127.0.0.1','x-forwarded-proto':'https','x-forwarded-host':req.headers.host}},r=>{res.writeHead(r.statusCode??502,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 proxy.listen(0,'127.0.0.1');await once(proxy,'listening');const origin=`https://localhost:${(proxy.address() as {port:number}).port}`;
 process.env.SEGURIDAD_ORIGEN=origin.replace('https:','HTTPS:');process.env.SEGURIDAD_CONFIAR_PROXY='1';
 async function stop(){if(!child||child.exitCode!==null||child.signalCode!==null)return;const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child?.kill('SIGKILL'),10000);try{await exited;}finally{clearTimeout(timer);}}
 async function start(){
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'production'},stdio:['ignore',log,log]});
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Servidor HTTPS de ensayo no inició');try{const r=await fetch(`http://127.0.0.1:${port}/ingresar`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Servidor de ensayo no responde');
 }
 let browser:Browser|undefined;
 try{
  browser=await chromium.launch({headless:true});
  const password=randomUUID(),email=`https-${randomUUID()}@ejemplo.invalid`,role=await prisma.role.upsert({where:{name:'HTTPS S6'},create:{name:'HTTPS S6'},update:{}});
  const user=await prisma.user.create({data:{name:'Titular HTTPS S6',email,password:'!INUTILIZABLE',roleId:role.id}});
  await prisma.userSecurity.create({data:{userId:user.id,normalizedEmail:email,status:'ACTIVO',passwordHash:await hash(password,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1}),passwordChangedAt:new Date()}});
  await prisma.userSecurityRole.create({data:{userId:user.id,role:'ADMINISTRADOR'}});
  await start();
  // Se ignora únicamente la confianza del certificado efímero de localhost.
  const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/mi-acceso');await page.waitForURL('**/ingresar');
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
  const call=(data:unknown,headers:Record<string,string>={})=>context.request.post(origin+'/api/seguridad',{headers:{Origin:origin,...headers},data});
  assert.equal((await call({action:'login',email,password},{Origin:'https://ajeno.invalid'})).status(),403);
  assert.equal((await call({action:'login',email,password:'a'.repeat(17000)})).status(),413);
  const entry=await context.request.get(origin+'/ingresar');assert.equal(entry.headers()['x-frame-options'],'DENY');
  await page.getByLabel('Correo',{exact:true}).fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.waitForURL(origin+'/');await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
  const dashboard=await context.request.get(origin+'/');assert.equal(dashboard.headers()['x-frame-options'],'SAMEORIGIN');assert.equal(dashboard.headers()['content-security-policy'],"frame-ancestors 'self'");
  const cookies=await context.cookies(),cookie=cookies.find(c=>c.name==='__Host-mtx_sesion');assert(cookie?.httpOnly&&cookie.secure);assert.equal(cookie.sameSite,'Lax');assert.equal(cookie.path,'/');assert(Buffer.byteLength(cookies.map(c=>`${c.name}=${c.value}`).join('; '))<4096);
  const self=await call({action:'self'},{'x-forwarded-for':'198.51.100.77'});assert((await self.json()).ok);assert.match(self.headers()['cache-control'],/no-store/);
  const events=await prisma.securityAuditEvent.findMany({where:{actorUserId:user.id}});assert(events.some(e=>e.ipAddress==='127.0.0.1'));assert(!events.some(e=>e.ipAddress==='198.51.100.77'));
  await page.goto(origin+'/mi-acceso');for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
  await stop();await start();assert((await (await call({action:'self'})).json()).ok,'La sesión sobrevive al reinicio del proceso');
  const setup=await (await call({action:'factor-setup'})).json();assert(setup.ok);
  const enabled=await (await call({action:'factor-enable',setup:setup.setup,code:await generate({secret:setup.secret})})).json();assert(enabled.ok);
  assert((await (await call({action:'logout'})).json()).ok);
  const challenged=await call({action:'login',email,password});assert((await challenged.json()).ok);const challengeCookies=await context.cookies();assert(challengeCookies.some(c=>c.name==='__Host-mtx_desafio'&&c.secure&&c.httpOnly));assert(!challengeCookies.some(c=>c.name==='__Host-mtx_sesion'));
  const factor=await call({action:'factor-login',code:enabled.codes[0]});assert((await factor.json()).ok);assert((await context.cookies()).some(c=>c.name==='__Host-mtx_sesion'));
  const staleCookie=(await context.cookies()).find(c=>c.name==='__Host-mtx_sesion')!;
  assert((await (await call({action:'logout'})).json()).ok);await context.addCookies([staleCookie]);assert(!(await (await call({action:'self'})).json()).ok,'Una cookie revocada no recupera la sesión');
  assert.deepEqual(errors,[]);await context.close();
  console.log('S6 HTTPS local: proxy/IP, cookies Secure/HttpOnly/SameSite/__Host y tamaño, CSRF/límite/no-store, Dashboard/panel 320/375/768/1440, TOTP/desafío, reinicio y revocación correctos.');
 }finally{await browser?.close();await stop();proxy.closeAllConnections();await new Promise<void>(r=>proxy.close(()=>r()));closeSync(log);rmSync(temp,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
