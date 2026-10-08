import { consultarTraslados } from "@/lib/consultas/traslados-inventario";
import { listarCatalogosInventario } from "@/lib/consultas/inventario";
import { TrasladosInventario } from "@/components/inventario/traslados-inventario";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const entrada = await searchParams;
  const [consulta, catalogos] = await Promise.all([
    consultarTraslados(entrada),
    listarCatalogosInventario(),
  ]);
  return <TrasladosInventario consulta={consulta} catalogos={catalogos} />;
}
