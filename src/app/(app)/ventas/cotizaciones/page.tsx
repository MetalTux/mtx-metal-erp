import { consultarCotizaciones, catalogosCotizacion } from "@/lib/consultas/cotizaciones";
import { Cotizaciones } from "@/components/cotizaciones/cotizaciones";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [listado, catalogos] = await Promise.all([consultarCotizaciones(params), catalogosCotizacion()]);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  return <Cotizaciones listado={listado} catalogos={catalogos} hoy={hoy} />;
}
