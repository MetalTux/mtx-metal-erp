import { consultarEmpresa } from "@/lib/servicios/empresa";
import { ConfiguracionEmpresa } from "@/components/configuracion/empresa";
export default async function Page() { return <ConfiguracionEmpresa perfilInicial={await consultarEmpresa()} />; }
