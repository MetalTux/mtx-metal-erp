import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { conServidorValidacion } from './fixtures/servidor-validacion';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s2_\d{8}$/.test(u.pathname));
const fixture='/tmp/mtx-s2-ui.json',tls='/tmp/mtx-s2-tls';
assert(!existsSync(fixture)&&!existsSync(tls),'No reemplazar fixtures o certificados de otra validación');
mkdirSync(tls,{mode:0o700});
async function main(){try{
 const cert=tls+'/cert.pem';assert.equal(spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',tls+'/key.pem','-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'}).status,0);
 for(const prueba of ['seguridad-acceso','seguridad-sin-credencial','seguridad-admin-local','seguridad-correo']){
  const r=spawnSync(process.execPath,['--import','tsx',`tests/${prueba}.integration.ts`],{env:{...process.env,NODE_EXTRA_CA_CERTS:cert},encoding:'utf8',timeout:90000});
  process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');assert.equal(r.status,0,prueba);
  if(prueba==='seguridad-acceso')await conServidorValidacion(()=>{const ui=spawnSync(process.execPath,['--import','tsx','tests/seguridad-acceso.ui.ts'],{env:process.env,encoding:'utf8',timeout:90000});process.stdout.write(ui.stdout??'');process.stderr.write(ui.stderr??'');assert.equal(ui.status,0,'S7: activación, avisos y reautenticación modal');});
 }
}finally{rmSync(fixture,{force:true});rmSync(tls,{recursive:true,force:true});}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
