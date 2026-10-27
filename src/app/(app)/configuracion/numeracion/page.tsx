import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarNumeraciones } from "@/lib/servicios/numeracion";
import { NumeracionDocumental } from "@/components/configuracion/numeracion-documental";
export const dynamic = "force-dynamic";
export default async function Page() {
  await exigirAcceso("configuracion.leer");

  return <NumeracionDocumental filas={await listarNumeraciones()} />;
}
