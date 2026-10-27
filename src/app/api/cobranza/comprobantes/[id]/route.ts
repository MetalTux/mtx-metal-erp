import { esquemaCobranzaC3 } from "@/lib/consultas/esquema-cobranza-c3";
import { createHash } from "node:crypto";
import { accesoArchivo } from "@/lib/seguridad/archivos";
import { tienePermiso } from "@/lib/seguridad/permisos";
import { prisma } from "@/lib/prisma";
import { almacenComprobantes } from "@/lib/almacenamiento/comprobantes-cobranza";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const acceso=await accesoArchivo("cobranza.leer");if(acceso.respuesta)return acceso.respuesta;
 const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox; default-src 'none'","Referrer-Policy":"no-referrer"};
 if(!tienePermiso(acceso.sesion!.roles,"precios.leer"))return new Response(null,{status:403,headers});
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))return new Response(null,{status:404,headers});
 if(!await esquemaCobranzaC3.disponible(prisma))return new Response(null,{status:503,headers});
 const a=await prisma.paymentAttachment.findUnique({where:{id}});if(!a)return new Response(null,{status:404,headers});
 try{const bytes=await almacenComprobantes.leer(a.fileKey);if(bytes.length!==a.size||createHash("sha256").update(bytes).digest("hex")!==a.fingerprint)return new Response(null,{status:409,headers});
 return new Response(new Uint8Array(bytes),{headers:{...headers,"Content-Type":a.mimeType,"Content-Length":String(bytes.length),"Content-Disposition":`attachment; filename="comprobante"; filename*=UTF-8''${encodeURIComponent(a.originalName)}`}});
 }catch{return new Response(null,{status:404,headers});}
}
