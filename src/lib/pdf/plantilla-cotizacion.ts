import { formatearCantidad } from "@/lib/formato";
import { validarTextoCotizacion, type NodoCotizacion } from "@/lib/validaciones/texto-cotizacion";
import { formatearRut } from "@/lib/validaciones/rut";
export const VERSION_PLANTILLA_PDF = 1;
export interface DocumentoPdfCotizacion {
  folio: string; version: number; status: string; date: string; validUntil: string | null;
  company: Record<string, string | null>; client: Record<string, string | null>;
  bank: Record<string, string | null>; paymentCondition: string; paymentDays: number | null;
  commercialTerms: string | null; technicalDescription: NodoCotizacion;
  subtotal: string; discountAmount: string; netAmount: string; vatAmount: string; vatRate: string; totalAmount: string;
  lines: { description: string; quantity: string; unitName: string; unitPrice: string; lineAmount: string; code: string | null; kind: string }[];
}
export const escaparPdf = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pesos = (v: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(BigInt(v));
const fecha = (v: string) => v.split("-").reverse().join("-");
const cantidad = formatearCantidad;
const estilos = (a: NodoCotizacion["attrs"] = {}) => Object.entries(a).filter(([k,v]) => v !== null && ["color", "backgroundColor", "fontFamily", "fontSize", "lineHeight", "textAlign"].includes(k)).map(([k,v]) => `${k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}:${v}`).join(";");
/** Sólo nodos validados; nunca interpretar el HTML del portapapeles directamente. */
export function renderizarTextoPdf(nodo: NodoCotizacion, recursos: Record<string, string>): string {
  const n = validarTextoCotizacion(nodo);
  function leer(n: NodoCotizacion): string {
    const a = n.attrs ?? {}, contenido = (n.content ?? []).map(leer).join("");
    if (n.type === "text") {
      let texto = escaparPdf(n.text);
      for (const marca of n.marks ?? []) {
        const etiquetas: Record<string,string> = { bold: "strong", italic: "em", underline: "u", strike: "s", textStyle: "span" };
        const etiqueta = etiquetas[marca.type]; texto = `<${etiqueta}${marca.type === "textStyle" ? ` style="${escaparPdf(estilos(marca.attrs))}"` : ""}>${texto}</${etiqueta}>`;
      }
      return texto;
    }
    if (n.type === "doc") return contenido;
    if (n.type === "table") {
      const filas = n.content ?? [];
      let cabecera = 0;
      while (cabecera < filas.length && filas[cabecera].content?.every(c => c.type === "tableHeader")) cabecera++;
      return `<table>${cabecera ? `<thead>${filas.slice(0,cabecera).map(leer).join("")}</thead>` : ""}<tbody>${filas.slice(cabecera).map(leer).join("")}</tbody></table>`;
    }
    if (n.type === "hardBreak") return "<br>";
    if (n.type === "horizontalRule") return "<hr>";
    if (n.type === "image") {
      const src = recursos[String(a.src)]; if (!src) throw new Error("No se pudo cargar una imagen histórica del detalle técnico.");
      return `<img src="${escaparPdf(src)}" alt="${escaparPdf(a.alt)}" data-placement="${escaparPdf(a.placement ?? "bloque")}" style="${a.width ? `width:${a.width}%;` : ""}"/>`;
    }
    const etiquetas: Record<string,string> = { paragraph: "p", heading: `h${a.level}`, bulletList: "ul", orderedList: "ol", listItem: "li", blockquote: "blockquote", table: "table", tableRow: "tr", tableCell: "td", tableHeader: "th" };
    const etiqueta = etiquetas[n.type];
    const adicionales = n.type === "orderedList" ? ` start="${a.start ?? 1}"` : ["tableCell","tableHeader"].includes(n.type) ? ` colspan="${a.colspan ?? 1}" rowspan="${a.rowspan ?? 1}"` : "";
    const estilo = estilos({ ...a, ...(a.align ? { textAlign: a.align } : {}) });
    return `<${etiqueta}${adicionales} style="${escaparPdf(estilo)}">${contenido}</${etiqueta}>`;
  }
  return leer(n);
}
export function htmlCotizacionPdf(d: DocumentoPdfCotizacion, recursos: Record<string,string>) {
  const e = escaparPdf, texto = renderizarTextoPdf(d.technicalDescription, recursos);
  const tieneDetalle = /<img|<table|[^\s<>]/.test(texto.replace(/<[^>]*>/g, "")) || texto.includes("<img") || texto.includes("<table");
  const logo = d.company.logoUrl ? recursos[d.company.logoUrl] : null;
  const filas = d.lines.map(l => `<tr><td>${e(l.description)}${l.code ? `<small>${e(l.code)}</small>` : ""}</td><td class="numero">${e(cantidad(l.quantity))}<small>${e(l.unitName)}</small></td><td class="numero">${e(pesos(l.unitPrice))}</td><td class="numero">${e(pesos(l.lineAmount))}</td></tr>`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none';"><title>Cotización ${e(d.folio)}</title><style>
  @page { size: Letter; } * { box-sizing:border-box; } body { margin:0; overflow-wrap:anywhere; font:11px Arial,sans-serif; color:#222; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; border-bottom:3px solid #2f6fd8; padding-bottom:12px; margin-bottom:15px; }
  header img { max-width:115px; max-height:70px; } h1 { margin:0 0 5px; font-size:22px; color:#234e88; } h2 { font-size:15px; } h3 { font-size:13px; } h4,h5,h6 { font-size:12px; }
  p { margin:5px 0; } .identidad { text-align:right; } .estado { font-weight:bold; border:1px solid #777; padding:4px 8px; display:inline-block; }
  .cliente { margin:14px 0; padding:10px; background:#f1f4f8; } small { display:block; color:#555; font-size:9px; margin-top:3px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; } th,td { padding:8px; border-bottom:1px solid #ccd1da; overflow-wrap:anywhere; vertical-align:top; }
  th { background:#234e88; color:white; text-align:left; } thead { display:table-header-group; } tr { break-inside:avoid; } .numero { text-align:right; font-variant-numeric:tabular-nums; }
  .totales { width:52%; margin:15px 0 15px auto; break-inside:avoid; } .totales td { padding:5px 8px; } .total { font-size:14px; font-weight:bold; background:#e8effa; }
  .pagos { margin-top:15px; border-top:1px solid #bbb; padding-top:10px; } .condiciones { white-space:pre-wrap; overflow-wrap:anywhere; }
  .tecnico { break-before:page; overflow-wrap:anywhere; } .tecnico::after { content:""; display:block; clear:both; }
  .tecnico img { height:auto; max-width:100%; max-height:220mm; object-fit:contain; break-inside:avoid; }
  .tecnico img[data-placement="izquierda"] { float:left; margin:6px 12px 6px 0; max-width:calc(100% - 12px); }
  .tecnico img[data-placement="derecha"] { float:right; margin:6px 0 6px 12px; max-width:calc(100% - 12px); }
  .tecnico img[data-placement="centro"] { display:block; clear:both; margin:6px auto; }
  .tecnico img[data-placement="bloque"] { display:block; clear:both; margin:6px 0; }
  .tecnico p { margin:8px 0; orphans:2; widows:2; } .tecnico h1,.tecnico h2,.tecnico h3,.tecnico h4,.tecnico h5,.tecnico h6 { break-after:avoid; }
  .tecnico th { color:#222; background:#eee; } .tecnico td,.tecnico th { border:1px solid #bbb; } blockquote { border-left:3px solid #777; margin-left:0; padding-left:10px; }
  </style></head><body><header><div>${logo ? `<img src="${e(logo)}" alt="Logo de empresa">` : ""}<h2>${e(d.company.legalName)}</h2><p>RUT: ${e(formatearRut(d.company.rut!))}</p><p>${e(d.company.businessActivity)}</p><p>${e(d.company.address)}, ${e(d.company.city)}</p><p>${e(d.company.phone)} ${e(d.company.email)}</p></div><div class="identidad"><h1>COTIZACIÓN</h1><p>N° ${e(d.folio)} · Revisión ${d.version}</p><p>Fecha: ${e(fecha(d.date))}</p>${d.validUntil ? `<p>Vigencia: ${e(fecha(d.validUntil))}</p>` : ""}<p class="estado">${e(d.status === "PENDIENTE" ? "Pendiente" : d.status === "APROBADA" ? "Aprobada" : "Rechazada")}</p></div></header>
  <section class="cliente"><h2>Información del cliente</h2><p><strong>${e(d.client.name)}</strong> · RUT: ${e(d.client.rut ? formatearRut(d.client.rut) : "")}</p><p>Sucursal: ${e(d.client.branchName)}</p><p>${e(d.client.address)}, ${e(d.client.city)}</p><p>Contacto: ${e(d.client.contact)} · ${e(d.client.phone)} · ${e(d.client.email)}</p></section>
  <table><colgroup><col style="width:48%"><col style="width:16%"><col style="width:18%"><col style="width:18%"></colgroup><thead><tr><th>Descripción</th><th class="numero">Cantidad</th><th class="numero">Precio final</th><th class="numero">Importe</th></tr></thead><tbody>${filas}</tbody></table>
  <table class="totales"><tbody><tr><td>Subtotal con IVA</td><td class="numero">${e(pesos(d.subtotal))}</td></tr>${BigInt(d.discountAmount) ? `<tr><td>Descuento global</td><td class="numero">−${e(pesos(d.discountAmount))}</td></tr>` : ""}<tr><td>Neto</td><td class="numero">${e(pesos(d.netAmount))}</td></tr><tr><td>IVA (${e(formatearCantidad(d.vatRate))}%)</td><td class="numero">${e(pesos(d.vatAmount))}</td></tr><tr class="total"><td>TOTAL</td><td class="numero">${e(pesos(d.totalAmount))}</td></tr></tbody></table>
  <section class="pagos"><h2>Condiciones de pago</h2><p>${e(d.paymentCondition)}${d.paymentDays !== null ? ` · Plazo acordado: ${d.paymentDays} días` : ""}</p>${d.commercialTerms ? `<p class="condiciones">${e(d.commercialTerms)}</p>` : ""}${d.bank.name ? `<h3>Datos para transferencia</h3><p>${e(d.bank.name)} · ${e(d.bank.type)} · ${e(d.bank.number)}</p><p>${e(d.bank.holder)} · RUT: ${e(d.bank.rut ? formatearRut(d.bank.rut) : "")}</p><p>${e(d.bank.email)}</p>` : ""}</section>
  ${tieneDetalle ? `<section class="tecnico"><h1>Descripción de trabajos</h1>${texto}</section>` : ""}</body></html>`;
}
