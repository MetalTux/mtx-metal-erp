import { tienePermiso } from "@/lib/seguridad/permisos";
import { exigirAcceso } from "@/lib/seguridad/acceso";
import { consultarOrdenesCompraCliente, catalogoOfertasParaOrden, catalogoCotizacionesConOrden, obtenerOfertaParaOrden, obtenerOrdenCompraCliente } from "@/lib/consultas/ordenes-compra-cliente";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
import { OrdenesCompraCliente } from "@/components/ordenes-compra-cliente/ordenes";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirAcceso("ordenes_cliente.leer");
  const operar = tienePermiso(sesion.roles,"ordenes_cliente.operar");

  const params = await searchParams;
  const [listado, ofertas, cotizaciones] = await Promise.all([consultarOrdenesCompraCliente(params), operar ? catalogoOfertasParaOrden() : Promise.resolve([]), catalogoCotizacionesConOrden()]);
  let inicial, errorInicial;
  try {
    if (typeof params.ver === "string") inicial = { orden: await obtenerOrdenCompraCliente(Number(params.ver)) };
    else if (operar && typeof params.aceptar === "string") inicial = { oferta: await obtenerOfertaParaOrden(Number(params.aceptar)) };
  } catch { errorInicial = "No se pudo abrir el documento solicitado. Revisa su estado, vigencia y datos históricos."; }
  return <OrdenesCompraCliente key={`${params.ver ?? ""}-${params.aceptar ?? ""}`} listado={listado} ofertas={ofertas} cotizaciones={cotizaciones} hoy={hoyOrden()} inicial={inicial} errorInicial={errorInicial} />;
}
