import nodemailer from "nodemailer";
import { configuracionSeguridad } from "./configuracion";
export async function enviarRecuperacion(email:string,token:string){
 if(!process.env.SMTP_HOST||!process.env.SMTP_FROM)throw Error("SMTP no configurado");
 const port=Number(process.env.SMTP_PORT??465);if(!Number.isInteger(port)||port<1||port>65535)throw Error("Puerto SMTP inválido");
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:process.env.SMTP_SECURE==="true"||port===465,requireTLS:true,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,logger:false,debug:false});
 try{await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:"Recuperar acceso a MTX Metal ERP",text:`Se solicitó recuperar tu contraseña. El enlace es privado, de un uso y vence en 30 minutos:\n${configuracionSeguridad().origin}/recuperar#token=${token}\n\nSi no lo solicitaste, ignora este mensaje. Tu doble factor no se desactiva.`});}finally{transport.close();}
}
