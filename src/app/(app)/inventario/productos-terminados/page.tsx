import { exigirAcceso } from "@/lib/seguridad/acceso";
import { catalogosTerminado, consultarInventarioTerminado } from "@/lib/consultas/stock-terminado";
import { InventarioTerminado } from "@/components/inventario/productos-terminados";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAcceso("inventario.leer");

  const filtros = await searchParams;
  const [consulta, catalogos] = await Promise.all([consultarInventarioTerminado(filtros), catalogosTerminado()]);
  return <InventarioTerminado consulta={consulta} catalogos={catalogos} />;
}
