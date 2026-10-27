import "dotenv/config";
async function main(){
 const args=process.argv.slice(2);if(args.length>1||args.some(a=>a!=="--aplicar"))throw Error("Argumentos inválidos");
 const {configuracionSeguridad}=await import("../src/lib/seguridad/configuracion");configuracionSeguridad();
 const {prisma}=await import("../src/lib/prisma");
 try{const {revocarAccesosRestaurados}=await import("../src/lib/seguridad/restauracion"),aplicar=args.includes("--aplicar"),r=await revocarAccesosRestaurados(aplicar);console.log(`${aplicar?"Revocación completada":"Simulación"}: ${r.sesiones} sesiones, ${r.enlaces} enlaces, ${r.desafios} desafíos, ${r.usuarios} usuarios. Factores, códigos personales y autoría conservados. Mantener mantenimiento hasta conciliar los respaldos personales.`);}
 finally{await prisma.$disconnect();}
}
main().catch(()=>{console.error("No se pudieron revisar o revocar accesos. Verifica configuración, conexión y reloj del servidor; mantener acceso público cerrado.");process.exitCode=1;});
