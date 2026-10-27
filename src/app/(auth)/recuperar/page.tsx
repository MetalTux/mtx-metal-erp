import { Ingreso } from "@/components/seguridad/ingreso";
import { seguridadConfigurada } from "@/lib/seguridad/configuracion";
export const dynamic="force-dynamic";
export default function Page(){return <Ingreso modo="reset" disponible={seguridadConfigurada()}/>;}
