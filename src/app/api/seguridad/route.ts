import { NextRequest, NextResponse } from "next/server";
import { metadatosSeguridad } from "@/lib/seguridad/metadatos";
import { configuracionSeguridad, nombreCookieSeguridad } from "@/lib/seguridad/configuracion";
import { operarSeguridad } from "@/lib/seguridad/servicio";
import { origenSeguridadPermitido } from "@/lib/seguridad/origen";
export const runtime="nodejs";
const cabeceras={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
export async function POST(request:NextRequest){
 try{
  const config=configuracionSeguridad();
  if(!origenSeguridadPermitido(request.headers,config.origin)||!request.headers.get("content-type")?.startsWith("application/json"))return NextResponse.json({ok:false,message:"Solicitud no autorizada."},{status:403,headers:cabeceras});
  const reader=request.body?.getReader();if(!reader)return NextResponse.json({ok:false},{status:400,headers:cabeceras});
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16384){await reader.cancel();return NextResponse.json({ok:false,message:"Solicitud demasiado grande."},{status:413,headers:cabeceras});}chunks.push(value);}
  let datos:unknown;try{datos=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return NextResponse.json({ok:false},{status:400,headers:cabeceras});}
  const r=await operarSeguridad({session:request.cookies.get(nombreCookieSeguridad("sesion"))?.value,challenge:request.cookies.get(nombreCookieSeguridad("desafio"))?.value,...metadatosSeguridad(request.headers)},datos);
  const response=NextResponse.json(r.client,{headers:cabeceras});
  const options={httpOnly:true,secure:config.secure,sameSite:"lax" as const,path:"/"};
  if(r.clearSession)response.cookies.set(nombreCookieSeguridad("sesion"),"",{...options,maxAge:0});
  if(r.clearChallenge)response.cookies.set(nombreCookieSeguridad("desafio"),"",{...options,maxAge:0});
  if(r.sessionToken)response.cookies.set(nombreCookieSeguridad("sesion"),r.sessionToken,{...options,maxAge:8*3600});
  if(r.challengeToken)response.cookies.set(nombreCookieSeguridad("desafio"),r.challengeToken,{...options,maxAge:300});
  return response;
 }catch{return NextResponse.json({ok:false,message:"El acceso no está disponible. Revisa la configuración con el Administrador."},{status:503,headers:cabeceras});}
}
