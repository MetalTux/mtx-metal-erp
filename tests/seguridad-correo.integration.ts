// SMTP local TLS: nunca usa un proveedor o destinatario real.
import "dotenv/config";
import assert from "node:assert/strict";
import { createServer, type TLSSocket } from "node:tls";
import { readFile } from "node:fs/promises";
import { operarSeguridad } from "../src/lib/seguridad/servicio";
import { prisma } from "../src/lib/prisma";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s2_\d{8}$/.test(u.pathname));
async function main(){
 const sockets=new Set<TLSSocket>();let recibido="";
 const server=createServer({key:await readFile('/tmp/mtx-s2-tls/key.pem'),cert:await readFile('/tmp/mtx-s2-tls/cert.pem')},socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.write('220 localhost ESMTP\r\n');let buffer='',data=false;
  socket.on('data',chunk=>{buffer+=chunk.toString();let i:number;while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
   if(data){if(line==='.') {data=false;socket.write('250 accepted\r\n');}else recibido+=line+'\n';continue;}
   if(line.startsWith('EHLO'))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
   else if(line.startsWith('AUTH'))socket.write('235 ok\r\n');
   else if(line==='DATA'){data=true;socket.write('354 continue\r\n');}
   else if(line==='QUIT')socket.end('221 bye\r\n');else socket.write('250 ok\r\n');
  }});
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const address=server.address();assert(address&&typeof address!=='string');
  process.env.SMTP_HOST='localhost';process.env.SMTP_PORT=String(address.port);process.env.SMTP_SECURE='true';process.env.SMTP_FROM='erp@ejemplo.invalid';process.env.SMTP_USER='prueba';process.env.SMTP_PASSWORD='fixture-local';
  const fixture=JSON.parse(await readFile('/tmp/mtx-s2-ui.json','utf8')) as {email:string;password:string};
  const r=await operarSeguridad({}, {action:'recover',email:fixture.email});assert(r.client.ok);assert(recibido.length>0,'Se recibió correo en el servidor TLS local');
  const decoded=recibido.replace(/=\n/g,'').replace(/=3D/g,'=');const match=decoded.match(/\/recuperar#token=([\w-]+)/);assert(match,'Enlace privado en fragmento');assert(!decoded.includes(fixture.password));
  const reset=await operarSeguridad({}, {action:'reset',token:match[1],password:fixture.password});assert(reset.client.ok);
  const again=await operarSeguridad({}, {action:'reset',token:match[1],password:fixture.password});assert(!again.client.ok);
  const generic=await operarSeguridad({}, {action:'recover',email:'desconocido@ejemplo.invalid'});assert.deepEqual(generic.client,r.client);
  console.log('S2 correo: recuperación enviada a servidor SMTP TLS local, enlace de un uso, fragmento privado y respuesta sin enumeración correctos. No acredita proveedor real.');
 }finally{for(const s of sockets)s.destroy();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
