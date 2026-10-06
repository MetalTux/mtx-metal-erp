import { listarBodegas } from "@/lib/servicios/bodegas";
import { Bodegas } from "@/components/mantenedores/bodegas";

export default async function Page() {
  return <Bodegas bodegas={await listarBodegas()} />;
}
