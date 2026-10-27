import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
export async function conServidorValidacion(callback:()=>void){
 const probe=createServer();probe.listen(3031,'127.0.0.1');await once(probe,'listening');await new Promise<void>(r=>probe.close(()=>r()));
 const server:ChildProcess=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3031'],{env:{...process.env,NODE_ENV:'production'},stdio:['ignore','inherit','inherit']});
 const cancel=()=>server.kill('SIGTERM');process.once('SIGTERM',cancel);
 try{
  let ready=false;for(let i=0;i<100;i++){assert(server.exitCode===null,'El servidor de ensayo terminó antes de estar disponible');try{if((await fetch('http://127.0.0.1:3031/ingresar')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,'El servidor de ensayo no respondió');
  callback();
 }finally{
  process.off('SIGTERM',cancel);
  if(server.exitCode===null&&server.signalCode===null){const end=once(server,'exit');server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),10000);try{await end;}finally{clearTimeout(timer);}}
 }
}
