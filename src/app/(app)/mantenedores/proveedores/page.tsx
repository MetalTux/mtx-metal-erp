import { listarProveedores } from "@/lib/servicios/proveedores";
import { Proveedores } from "@/components/mantenedores/proveedores";

export default async function Page() {
  return <Proveedores proveedores={await listarProveedores()} />;
}
