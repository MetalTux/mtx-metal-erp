import { listarCondiciones } from "@/lib/servicios/condiciones-pago";
import { CondicionesPago } from "@/components/mantenedores/condiciones-pago";
// El catálogo se consulta por petición, sin acceder a PostgreSQL al prerenderizar.
export const dynamic = "force-dynamic";
export default async function Page() {
  return <CondicionesPago condiciones={await listarCondiciones()} />;
}
