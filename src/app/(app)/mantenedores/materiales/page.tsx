import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarMateriales, listarUnidadesMaterial } from "@/lib/servicios/materiales";
import { Materiales } from "@/components/mantenedores/materiales";

export default async function Page() {
  await exigirAcceso("catalogos.leer");

  const [materiales, unidades] = await Promise.all([listarMateriales(), listarUnidadesMaterial()]);
  return <Materiales materiales={materiales} unidades={unidades} />;
}
