import { listarClientes } from "@/lib/servicios/clientes";
import { Clientes } from "@/components/mantenedores/clientes";

export default async function Page() {
  return <Clientes clientes={await listarClientes()} />;
}
