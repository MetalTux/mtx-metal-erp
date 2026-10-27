import { recursosAutoria } from "@/config/recursos-autoria";
import Link from "next/link";
import { exigirAcceso } from "@/lib/seguridad/acceso";
import { consultarAuditoria } from "@/lib/seguridad/auditoria";
import { formatearFecha } from "@/lib/formato";
import { PageHeader } from "@/components/page-header";
import { DepurarAuditoria } from "@/components/seguridad/depurar-auditoria";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await exigirAcceso("auditoria.leer");
 const data=await consultarAuditoria(await searchParams),f=data.filtros;
 const enlace=(pagina:number)=>{const p=new URLSearchParams();for(const [k,v]of Object.entries(f))if(v!==undefined)p.set(k,String(v));p.set("pagina",String(pagina));return `/administracion/auditoria?${p}`;};
 return <div className="space-y-5"><PageHeader titulo="Auditoría y autoría" descripcion="Consulta exclusiva del Administrador. Eventos de seguridad y responsables de operaciones nuevas."/>
 <form method="get" className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
 <label className="text-sm">Consultar<select name="vista" defaultValue={f.vista} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"><option value="eventos">Eventos de seguridad</option><option value="autoria">Autoría documental</option></select></label>
 <label className="text-sm">Acción exacta<input name="accion" maxLength={100} defaultValue={f.accion} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"/></label>
 <label className="text-sm">Resultado<select name="resultado" defaultValue={f.resultado} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"><option value="TODOS">Todos</option><option value="CORRECTO">Correcto</option><option value="RECHAZADO">Rechazado</option><option value="ERROR">Error</option></select></label>
 <label className="text-sm">Documento o registro (autoría)<select name="tipo" defaultValue={f.tipo} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"><option value="">Todos</option>{Object.entries(recursosAutoria).map(([valor,nombre])=><option key={valor} value={valor}>{nombre}</option>)}</select></label>
 <label className="text-sm">Número interno (autoría)<input name="recurso" maxLength={100} defaultValue={f.recurso} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"/></label>
 <label className="text-sm">Desde<input type="date" name="desde" defaultValue={f.desde} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"/></label>
 <label className="text-sm">Hasta<input type="date" name="hasta" defaultValue={f.hasta} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"/></label>
 <button type="submit" className="h-9 self-end rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrar</button></form>
 <p className="text-sm text-muted-foreground">La autoría se registra desde S5. Los documentos anteriores mantienen «Sin autoría registrada» donde no existe evidencia; una modificación posterior no acredita quién los creó. Los nombres mostrados son los actuales; el ID de usuario identifica al responsable.</p>
 <div className="overflow-x-auto rounded-md border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">{f.vista==="autoria"?"Autoría de operaciones":"Eventos de seguridad"}</caption><thead><tr>{["Fecha","Actor","Afectado","Acción","Resultado","IP","Navegador","Referencia"].map(t=><th key={t} className="whitespace-nowrap px-3 py-2">{t}</th>)}</tr></thead><tbody>{data.filas.map(v=><tr key={v.id} className="border-t border-border">{[formatearFecha(v.fecha),v.actor,v.afectado,v.accion.replaceAll("_"," "),v.resultado,v.ip??"No disponible",v.navegador??"No disponible",v.referencia].map((s,i)=><td key={i} className="px-3 py-2">{s}</td>)}</tr>)}{!data.filas.length&&<tr><td colSpan={8} className="p-5">{f.vista==="autoria"?"Sin autoría registrada":"Sin eventos para estos filtros"}</td></tr>}</tbody></table></div>
 <nav aria-label="Páginas de auditoría" className="flex flex-wrap gap-4 text-sm"><span>{data.total} registros · Página {f.pagina} de {data.paginas}</span>{f.pagina>1&&<Link href={enlace(f.pagina-1)} className="underline">Anterior</Link>}{f.pagina<data.paginas&&<Link href={enlace(f.pagina+1)} className="underline">Siguiente</Link>}</nav><DepurarAuditoria/></div>;
}
