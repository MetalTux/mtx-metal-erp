import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarProveedores } from "@/lib/servicios/proveedores";
import { Proveedores } from "@/components/mantenedores/proveedores";

export default async function Page() {
  await exigirAcceso("proveedores.leer");

  return <Proveedores proveedores={await listarProveedores()} />;
}
