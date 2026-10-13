import { listarPeriodosIva } from "@/lib/servicios/iva";
import { PeriodosIva } from "@/components/configuracion/periodos-iva";
export const dynamic = "force-dynamic";
export default async function Page() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const p = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return <PeriodosIva periodos={await listarPeriodosIva()} hoy={`${p("year")}-${p("month")}-${p("day")}`} />;
}
