import { catalogosTrabajo, listarTrabajos, consultarTrabajo, prepararTrabajoComercial } from "@/lib/consultas/ordenes-trabajo";
import { OrdenesTrabajo } from "@/components/ordenes-trabajo/ordenes";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 const [listado,catalogos]=await Promise.all([listarTrabajos(params),catalogosTrabajo()]);
 let inicial,errorInicial;
 try{if(typeof params.ver==="string")inicial={work:await consultarTrabajo(Number(params.ver))};else if(typeof params.crear==="string")inicial={source:await prepararTrabajoComercial(Number(params.crear))};}
 catch{errorInicial="No se pudo abrir el trabajo u orden solicitados. Actualiza el listado.";}
 return <OrdenesTrabajo key={`${params.ver??""}-${params.crear??""}`} listado={listado} catalogos={catalogos} hoy={hoyOrden()} inicial={inicial} errorInicial={errorInicial}/>;
}
