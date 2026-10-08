import { consultarAjustes } from "@/lib/consultas/ajustes-inventario";
import { listarCatalogosInventario } from "@/lib/consultas/inventario";
import { AjustesInventario } from "@/components/inventario/ajustes-inventario";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const entrada = await searchParams;
  const [consulta, catalogos] = await Promise.all([
    consultarAjustes(entrada),
    listarCatalogosInventario(),
  ]);
  return <AjustesInventario consulta={consulta} catalogos={catalogos} />;
}
