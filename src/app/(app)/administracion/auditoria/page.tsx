import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
 return <div className="min-w-0 space-y-4"><PageHeader titulo="Auditoría y autoría" descripcion="Consulta exclusiva del Administrador. Eventos de seguridad y responsables de operaciones nuevas."/>
 <form method="get" className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <label className="text-sm">Consultar<select name="vista" defaultValue={f.vista} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"><option value="eventos">Eventos de seguridad</option><option value="autoria">Autoría documental</option></select></label>
 <label className="text-sm">Acción exacta<input name="accion" maxLength={100} defaultValue={f.accion} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"/></label>
 <label className="text-sm">Resultado<select name="resultado" defaultValue={f.resultado} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"><option value="TODOS">Todos</option><option value="CORRECTO">Correcto</option><option value="RECHAZADO">Rechazado</option><option value="ERROR">Error</option></select></label>
 <label className="text-sm">Documento o registro (autoría)<select name="tipo" defaultValue={f.tipo} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"><option value="">Todos</option>{Object.entries(recursosAutoria).map(([valor,nombre])=><option key={valor} value={valor}>{nombre}</option>)}</select></label>
 <label className="text-sm">Número interno (autoría)<input name="recurso" maxLength={100} defaultValue={f.recurso} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"/></label>
 <label className="text-sm">Desde<input type="date" name="desde" defaultValue={f.desde} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"/></label>
 <label className="text-sm">Hasta<input type="date" name="hasta" defaultValue={f.hasta} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"/></label>
 <Button type="submit" className="self-end">Filtrar</Button></form>
 <p className="text-sm text-muted-foreground">La autoría se registra desde S5. Los documentos anteriores mantienen «Sin autoría registrada» donde no existe evidencia; una modificación posterior no acredita quién los creó. Los nombres mostrados son los actuales; el ID de usuario identifica al responsable.</p>
 <Table containerProps={{role:"region","aria-label":f.vista==="autoria"?"Autoría de operaciones":"Eventos de seguridad",tabIndex:0,className:"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}}><TableCaption className="sr-only">{f.vista==="autoria"?"Autoría de operaciones":"Eventos de seguridad"}</TableCaption><TableHeader><TableRow>{["Fecha","Actor","Afectado","Acción","Resultado","IP","Navegador","Referencia"].map(t=><TableHead key={t} scope="col">{t}</TableHead>)}</TableRow></TableHeader><TableBody>{data.filas.map(v=><TableRow key={v.id}>{[formatearFecha(v.fecha),v.actor,v.afectado,v.accion.replaceAll("_"," "),v.resultado,v.ip??"No disponible",v.navegador??"No disponible",v.referencia].map((s,i)=><TableCell key={i} className={i===0?"whitespace-nowrap":"min-w-32 max-w-sm whitespace-normal break-words"}>{s}</TableCell>)}</TableRow>)}{!data.filas.length&&<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{f.vista==="autoria"?"Sin autoría registrada":"Sin eventos para estos filtros"}</TableCell></TableRow>}</TableBody></Table>
 <nav aria-label="Páginas de auditoría" className="flex flex-wrap gap-4 text-sm"><span>{data.total} registros · Página {f.pagina} de {data.paginas}</span>{f.pagina>1&&<Link href={enlace(f.pagina-1)} className="underline">Anterior</Link>}{f.pagina<data.paginas&&<Link href={enlace(f.pagina+1)} className="underline">Siguiente</Link>}</nav><DepurarAuditoria/></div>;
}
