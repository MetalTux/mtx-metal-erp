/** Cantidades decimales como texto: no convertir importes o cantidades a number. */
export function formatearCantidad(valor: string): string {
  const coincidencia = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(valor);
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
