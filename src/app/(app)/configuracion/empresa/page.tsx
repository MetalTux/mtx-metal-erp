import { consultarEmpresa } from "@/lib/servicios/empresa";
import { listarCuentasBancarias } from "@/lib/servicios/cuentas-bancarias";
import { ConfiguracionEmpresa } from "@/components/configuracion/empresa";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [perfil, cuentas] = await Promise.all([consultarEmpresa(), listarCuentasBancarias()]);
  return <ConfiguracionEmpresa perfilInicial={perfil} cuentasIniciales={cuentas} />;
}
