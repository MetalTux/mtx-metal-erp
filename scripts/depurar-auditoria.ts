import "dotenv/config";
/** Mantenimiento del servidor: sin actores ficticios ni acceso HTTP. Por defecto sólo cuenta. */
async function main(){
 const args=process.argv.slice(2);
 if(args.some(v=>v!=="--aplicar")||args.length>1)throw Error("Argumentos inválidos");
 const {configuracionSeguridad}=await import("../src/lib/seguridad/configuracion");configuracionSeguridad();
 const {prisma}=await import("../src/lib/prisma");
 try{const {depurarEventosSistema}=await import("../src/lib/seguridad/auditoria");const aplicar=args.includes("--aplicar"),cantidad=await depurarEventosSistema(aplicar);console.log(aplicar?`Depuración completada: ${cantidad} eventos retirados. Autoría documental conservada.`:`Simulación: ${cantidad} eventos cumplieron 12 meses. Usa --aplicar para ejecutar la retención aprobada.`);}
 finally{await prisma.$disconnect();}
}
main().catch(()=>{console.error("No se pudo revisar o depurar la auditoría. Comprueba argumentos, configuración y conexión en el servidor.");process.exitCode=1;});
