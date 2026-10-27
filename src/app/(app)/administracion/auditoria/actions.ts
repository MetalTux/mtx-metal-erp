"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";
import { depurarEventosSeguridad } from "@/lib/seguridad/auditoria";
import { revalidatePath } from "next/cache";
export async function depurarEventos(){
 await exigirOrigenAccion();
 await exigirAcceso("auditoria.leer", true);
 try{const cantidad=await depurarEventosSeguridad();revalidatePath("/administracion/auditoria");return {ok:true,mensaje:`Se retiraron ${cantidad} eventos de más de 12 meses. La autoría documental se conserva.`};}
 catch{return {ok:false,mensaje:"No se pudo depurar. Confirma tu identidad en Mi acceso (máximo 5 minutos) y vuelve a intentar."};}
}
