import { listarNumeraciones } from "@/lib/servicios/numeracion";
import { NumeracionDocumental } from "@/components/configuracion/numeracion-documental";
export const dynamic = "force-dynamic";
export default async function Page() {
  return <NumeracionDocumental filas={await listarNumeraciones()} />;
}
