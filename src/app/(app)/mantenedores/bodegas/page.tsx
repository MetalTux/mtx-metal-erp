import { exigirAcceso } from "@/lib/seguridad/acceso";
import { listarBodegas } from "@/lib/servicios/bodegas";
import { Bodegas } from "@/components/mantenedores/bodegas";

export default async function Page() {
  await exigirAcceso("catalogos.leer");

  return <Bodegas bodegas={await listarBodegas()} />;
}
