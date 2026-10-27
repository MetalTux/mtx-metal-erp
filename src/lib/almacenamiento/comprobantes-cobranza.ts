import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
export const limiteComprobante=5*1024*1024;
export const almacenComprobantes={
 directorio(){return process.env.COBRANZA_COMPROBANTE_DIR||path.join(process.cwd(),"var/cobranza/comprobantes");},
 async guardar(bytes:Buffer){await mkdir(this.directorio(),{recursive:true,mode:0o700});const key=randomUUID()+".bin";await writeFile(path.join(this.directorio(),key),bytes,{flag:"wx",mode:0o600});return key;},
 async leer(key:string){if(!/^[0-9a-f-]{36}\.bin$/.test(key))throw Error("Archivo inválido.");return readFile(path.join(this.directorio(),key));},
 async eliminar(key:string){if(!/^[0-9a-f-]{36}\.bin$/.test(key))throw Error("Archivo inválido.");await unlink(path.join(this.directorio(),key));},
 async preparar(archivo:File){
  if(!(archivo instanceof File)||!archivo.size||archivo.size>limiteComprobante)throw Error("Selecciona JPG, PNG o PDF de hasta 5 MB.");
  const bytes=Buffer.from(await archivo.arrayBuffer());
  let mimeType:string;
  if(bytes.subarray(0,5).toString()==="%PDF-"){
   if(!/\.pdf$/i.test(archivo.name)||!/^%PDF-(1\.[0-7]|2\.0)/.test(bytes.subarray(0,12).toString())||!bytes.subarray(-1024).toString().includes("%%EOF"))throw Error("El archivo no tiene una estructura PDF reconocible.");
   mimeType="application/pdf";
  }else{
   try{const image=sharp(bytes,{limitInputPixels:25_000_000,failOn:"warning"});const m=await image.metadata();if(!["jpeg","png"].includes(m.format??"")||(m.pages??1)>1)throw Error();await image.stats();mimeType=m.format==="png"?"image/png":"image/jpeg";if(!/\.(png|jpe?g)$/i.test(archivo.name))throw Error();}catch{throw Error("La imagen debe ser JPG o PNG válida, de hasta 25 megapíxeles.");}
  }
  return {bytes,mimeType,size:bytes.length,originalName:archivo.name.replace(/[\\/\u0000-\u001f\u007f]/g,"_").slice(0,180)||"comprobante",fingerprint:createHash("sha256").update(bytes).digest("hex")};
 }
};
