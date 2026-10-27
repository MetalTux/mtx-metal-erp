import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarUnidades } from "@/lib/servicios/unidades-medida";
import { UnidadesMedida } from "@/components/mantenedores/unidades-medida";

export default async function Page() {
  await exigirAcceso("catalogos.leer");

  return <UnidadesMedida unidades={await listarUnidades()} />;
}
