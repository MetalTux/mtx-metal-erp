import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarProductos, listarMaterialesReceta } from "@/lib/servicios/productos";
import { listarUnidadesMaterial } from "@/lib/servicios/materiales";
import { Productos } from "@/components/mantenedores/productos";
export const dynamic = "force-dynamic";
export default async function Page() {
  await exigirAcceso("catalogos.leer");

  const [productos, materiales, unidades] = await Promise.all([listarProductos(), listarMaterialesReceta(), listarUnidadesMaterial()]);
  return <Productos productos={productos} materiales={materiales} unidades={unidades} />;
}
