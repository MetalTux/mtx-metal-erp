/** Convierte estilos heredados de HTML/Word en marcas de texto que Tiptap puede conservar.
 * Nunca se inserta el HTML directamente: pasa después por el esquema del editor. */
export function prepararPegadoCotizacion(html: string): string {
  const documento = new DOMParser().parseFromString(html, "text/html");
  const propiedades = ["color", "background-color", "font-family", "font-size", "line-height", "font-weight", "font-style", "text-decoration", "text-align"];
  // Word puede entregar estilos de clase en el portapapeles. Aplicar sólo las
  // propiedades de presentación conocidas; ignorar reglas externas/@import.
  for (const style of documento.querySelectorAll("style")) {
    for (const regla of (style.textContent ?? "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (regla[1].includes("@")) continue;
      const fuente = documento.createElement("span"); fuente.setAttribute("style", regla[2]);
      try { for (const el of documento.querySelectorAll<HTMLElement>(regla[1].trim())) for (const p of propiedades) if (!el.style.getPropertyValue(p) && fuente.style.getPropertyValue(p)) el.style.setProperty(p, fuente.style.getPropertyValue(p)); } catch { /* Un selector de otro procesador puede no ser HTML/CSS válido. */ }
    }
  }
  for (const font of documento.querySelectorAll("font")) {
    const span = documento.createElement("span"), color = font.getAttribute("color"), familia = font.getAttribute("face"), tamaño = Number(font.getAttribute("size"));
    if (color) span.style.color = color;
    if (familia) span.style.fontFamily = familia;
    if (tamaño >= 1 && tamaño <= 7) span.style.fontSize = `${[10, 12, 14, 16, 18, 24, 32][tamaño - 1]}px`;
    span.append(...font.childNodes); font.replaceWith(span);
  }
  for (const bloque of documento.querySelectorAll<HTMLElement>("p,h1,h2,h3,h4,h5,h6")) {
    let padre = bloque.parentElement;
    while (!bloque.style.textAlign && padre) { if (padre.tagName === "CENTER") bloque.style.textAlign = "center"; else if (padre.style.textAlign) bloque.style.textAlign = padre.style.textAlign; padre = padre.parentElement; }
  }
  documento.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(e => e.remove());
  const walker = documento.createTreeWalker(documento.body, NodeFilter.SHOW_TEXT), textos: Text[] = [];
  while (walker.nextNode()) textos.push(walker.currentNode as Text);
  for (const texto of textos) {
    if (!texto.textContent?.trim()) continue;
    const span = documento.createElement("span");
    for (const propiedad of propiedades.filter(p => p !== "text-align")) {
      let padre = texto.parentElement;
      while (padre) { const valor = padre.style.getPropertyValue(propiedad); if (valor) { span.style.setProperty(propiedad, valor); break; } padre = padre.parentElement; }
    }
    if (span.getAttribute("style")) { texto.replaceWith(span); span.append(texto); }
  }
  return documento.body.innerHTML;
}
