import { listarUnidades } from "@/lib/servicios/unidades-medida";
import { UnidadesMedida } from "@/components/mantenedores/unidades-medida";

export default async function Page() {
  return <UnidadesMedida unidades={await listarUnidades()} />;
}
