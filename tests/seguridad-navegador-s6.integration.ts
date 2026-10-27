import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { conServidorValidacion } from './fixtures/servidor-validacion';
const test=process.env.S6_PRUEBA;
assert(test==='tests/seguridad-s4.integration.ts'||test==='tests/seguridad-s5.integration.ts');
const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s[45]_\d{8}$/.test(u.pathname));
function ejecutar(path:string){const r=spawnSync(process.execPath,['--import','tsx',path],{env:process.env,encoding:'utf8',timeout:90000});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');assert.equal(r.status,0,path);}
async function main(){ejecutar(test!);await conServidorValidacion(()=>ejecutar(test!.replace('.integration.ts','.ui.ts')));}
main().catch(e=>{console.error(e);process.exitCode=1;});
