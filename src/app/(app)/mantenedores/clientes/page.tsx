import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarClientes } from "@/lib/servicios/clientes";
import { Clientes } from "@/components/mantenedores/clientes";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirAcceso("clientes.leer");

  return <Clientes clientes={await listarClientes()} />;
}
