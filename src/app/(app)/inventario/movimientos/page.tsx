import { consultarMovimientos, listarCatalogosInventario } from "@/lib/consultas/inventario";
import { filtrosMovimientosSchema, borradorFiltrosInventario } from "@/lib/validaciones/inventario";
import { ConsultaInventario } from "@/components/inventario/consulta-inventario";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const entrada = await searchParams;
  const validacion = filtrosMovimientosSchema.safeParse(entrada);
  const [consulta, catalogos] = await Promise.all([consultarMovimientos(entrada), listarCatalogosInventario()]);
  return <ConsultaInventario modo="movimientos" consulta={consulta} catalogos={catalogos} borrador={borradorFiltrosInventario(entrada)} filtros={validacion.success ? validacion.data : filtrosMovimientosSchema.parse({})} />;
}
