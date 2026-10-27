import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarCondiciones } from "@/lib/servicios/condiciones-pago";
import { CondicionesPago } from "@/components/mantenedores/condiciones-pago";
// El catálogo se consulta por petición, sin acceder a PostgreSQL al prerenderizar.
export const dynamic = "force-dynamic";
export default async function Page() {
  await exigirAcceso("configuracion.leer");

  return <CondicionesPago condiciones={await listarCondiciones()} />;
}
