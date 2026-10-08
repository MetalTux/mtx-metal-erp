const formatoDia = new Intl.DateTimeFormat("en", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
export function fechaCalendarioValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < "1900-01-01" || fecha > "9999-12-30") return false;
  const dia = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === fecha;
}
function diaChile(instante: number) {
  const partes = formatoDia.formatToParts(new Date(instante));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(item => item.type === tipo)!.value;
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}
/** Primer instante del día local, incluso cuando el cambio de hora omite medianoche. */
function buscarInicioDiaChile(fecha: string): Date {
  const referencia = new Date(`${fecha}T00:00:00Z`).getTime();
  let inferior = referencia - 86_400_000;
  let superior = referencia + 86_400_000;
  while (inferior < superior) {
    const medio = Math.floor((inferior + superior) / 2);
    if (diaChile(medio) < fecha) inferior = medio + 1;
    else superior = medio;
  }
  return new Date(inferior);
}
export function inicioDiaChile(fecha: string): Date {
  if (!fechaCalendarioValida(fecha)) throw new Error("Fecha de calendario inválida.");
  return buscarInicioDiaChile(fecha);
}
export function finExclusivoDiaChile(fecha: string): Date {
  if (!fechaCalendarioValida(fecha)) throw new Error("Fecha de calendario inválida.");
  const siguiente = new Date(`${fecha}T12:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return buscarInicioDiaChile(siguiente.toISOString().slice(0, 10));
}
