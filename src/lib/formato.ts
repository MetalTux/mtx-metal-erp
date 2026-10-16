/** Presentación es-CL sin pérdida de precisión. Acepta decimales canónicos o de entrada, sin separadores de miles. */
export function formatearCantidad(valor: string): string {
  const coincidencia = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(valor);
  if (!coincidencia) return valor;
  const [, signo, entero, decimales] = coincidencia;
  const fraccion = decimales?.replace(/0+$/, "");
  return `${signo}${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${fraccion ? `,${fraccion}` : ""}`;
}

const formatoFecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function formatearFecha(valor: string): string {
  const partes = formatoFecha.formatToParts(new Date(valor));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(item => item.type === tipo)?.value;
  return `${parte("day")}-${parte("month")}-${parte("year")} ${parte("hour")}:${parte("minute")}`;
}
