# VG9.3 — Contraste de texto, controles y estados

Fecha: **29-10-2026**. **Completado técnicamente sobre la muestra descrita.** Revisión del usuario y accesibilidad integral pendientes; siguiente VG9.4.

Criterios del [brief aprobado](../DESIGN.md): texto normal ≥4,5:1, controles/gráficos/foco ≥3:1, en Claro y Oscuro. Se aplica el objetivo de legibilidad también a las opciones deshabilitadas. Referencia complementaria: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada el 29-10-2026; Impeccable orienta la comprobación renderizada. Esta entrega revisa contraste, no puntúa dimensiones ajenas ni certifica WCAG integral.

## Hallazgos y correcciones

- `src/components/ui/button.tsx:7`: opacidad 50% debilitaba texto deshabilitado (ejemplo Claro: 2,44:1); ahora pares muted opacos, conservando disabled y pointer-events. Outline usa borde input; hover destructivo pasa de rellenos 10%/20% a 5%/10%, también en Oscuro, para evitar pérdida de contraste sobre panel informativo.
- `src/components/ui/input.tsx:10`, `textarea.tsx:9`, `input-group.tsx:17`: se evita opacidad acumulada de campos/grupos deshabilitados; texto y fondo coherentes. Foco y bordes/anillos de error usan color sólido.
- `src/app/globals.css:126`: outline de respaldo sólido; anillos de componentes antes al 50% llegaban a 2,32:1 en Claro, y foco destructivo al 20% a 1,38:1. Ahora superan 3:1 en la muestra.
- `src/components/ui/dropdown-menu.tsx:75`: texto deshabilitado legible y contorno interior visible por teclado. No se habilitan opciones restringidas.
- `src/components/ui/command.tsx:158`: opciones deshabilitadas con texto legible y selección con contorno sólido; se conserva búsqueda, teclado y selección del componente.
- `src/components/ui/label.tsx:15`, `sidebar.tsx:469`: variantes disabled/aria-disabled conservan tono legible en lugar de reducir toda la opacidad. Navegación y permisos sin cambios.
- `src/components/formularios/selector-buscable.tsx:24`, `ui/command.tsx:84`: iconos de expansión/búsqueda con color secundario legible en lugar de opacidad 50%.

No se cambian valores de la paleta base, fuentes, tamaños, servicios, handlers, permisos, datos ni documentos históricos. El borde/contorno reforzado es un indicador funcional; no se agregan sombras decorativas. Las variantes compartidas alcanzan a todos sus consumidores.

## Método y alcance

Nuevo ensayo `tests/diseno-global-vg9-3.ui.ts`: componentes reales, IBM Plex Sans local y CSS real en Chromium, sin Next, API o PostgreSQL. Superficies: background, card, muted e info. Incluye seis variantes de botón en reposo/hover, campos normales/deshabilitados/heredados de fieldset, placeholder, error, textarea, grupo de importe, select nativo, selector buscable, etiquetas y estados semánticos, gráficos, selección de texto/opciones, diálogo y menús con opciones deshabilitadas.

Calcula luminancia desde colores CSS computados convertidos por Canvas a RGBA. Compone alfa y opacidad de ancestros; para bordes considera cara interior/exterior y para foco el fondo circundante. Estabiliza animaciones antes de medir y excluye contenido oculto por el diálogo/menú. No permite bajar el umbral por redondeo (sólo tolerancia numérica de 1e-9).

**18.268 mediciones entre 72 combinaciones de tema/estado; cero fallos.** Se repiten elementos al recorrer estados: no significa 18.268 controles distintos ni auditoría de cada pantalla. El primer barrido exploratorio incluye muestras transitorias al abrir el menú; esas lecturas no se cuentan como defectos confirmados ni se comparan uno a uno con el total final. Los ejemplos anteriores corresponden a reposo/foco estables y a problemas confirmados.

## Mínimos observados

| Tipo | Claro | Oscuro | Objetivo |
| --- | ---: | ---: | ---: |
| Texto | 4,79:1 | 4,77:1 | 4,5:1 |
| Placeholder | 5,18:1 | 4,77:1 | 4,5:1 |
| Borde interior | 3,77:1 | 3,27:1 | 3:1 |
| Borde exterior | 3,77:1 | 3,99:1 | 3:1 |
| Foco: anillo | 6,27:1 | 9,02:1 | 3:1 |
| Foco: contorno | 7,02:1 | 8,29:1 | 3:1 |
| Indicador de opción seleccionada | 6,51:1 | 7,16:1 | 3:1 |
| Texto seleccionado | 7,83:1 | 8,72:1 | 4,5:1 |
| Iconos de control | 5,79:1 | 4,77:1 | 3:1 |
| Series gráficas | 5,18:1 | 5,38:1 | 3:1 |

Las cifras se muestran redondeadas; el ensayo evalúa valores sin redondear. Gráficos medidos contra su fondo, no como garantía de diferenciación entre series; se mantienen etiquetas. No se mide antialiasing de cada glifo, fotografías, logos, contenido técnico libre ni bytes de PDF históricos. Tampoco reemplaza lector de pantalla, zoom o comprobación de foco en todos los recorridos.

## Comprobaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `VG9_3_DIAGNOSTICO=1 pnpm exec tsx tests/diseno-global-vg9-3.ui.ts` | Barrido inicial exploratorio archivado antes de corregir |
| `pnpm exec tsx tests/diseno-global-vg9-3.ui.ts` | Final correcto, 18.268 mediciones y cero errores de navegador |
| `pnpm grillas:validar var/validacion/diseno-global-vg9-3/grillas` | 7/7 correctos, Oscuro; transporte simulado |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg9-3/grillas-claro` | 7/7 correctos, Claro; transporte simulado |
| `TEMAS_TC2_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-3/estado pnpm exec tsx tests/temas-tc2.ui.ts` | Selector por teclado, persistencia, pestañas, borradores y almacenamiento restringido correctos |
| `pnpm lint` | Correcto |
| `pnpm build` | Turbopack bloqueado por restricción interna de proceso/puerto del entorno |
| `pnpm exec next build --webpack` | Compilación final y tipos correctos |

Las regresiones conservan consultas, readonly, confirmaciones, identidades de líneas, descarte y reintentos con mismo payload/UUID. No ejecutan operaciones de negocio. No se inició servidor de aplicación en esta etapa.

## Evidencia y continuidad

Informe agregado y SHA-256 de las diez fuentes afectadas: `var/validacion/diseno-global-vg9-3/resultado.json`. Mediciones completas/capturas en `final/`; barrido exploratorio en `antes/`. Directorios locales ignorados por Git.

Muestras permanentes inspeccionadas:

- [Controles y foco Claro](capturas/diseno-global-vg9-3/claro-controles-foco.png).
- [Controles y foco Oscuro](capturas/diseno-global-vg9-3/oscuro-controles-foco.png).
- [Menú Claro](capturas/diseno-global-vg9-3/claro-menu-1280.png).
- [Menú Oscuro](capturas/diseno-global-vg9-3/oscuro-menu-1280.png).

- [x] Objetivos medidos y fallos confirmados corregidos en la muestra compartida.
- [x] Regresiones y comprobaciones técnicas realizadas.
- [ ] Conformidad visual del usuario y validaciones de accesibilidad de VG9.4.
- [ ] Regenerar/contrastar capturas anteriores en la regresión final: VG9.1 es un inventario histórico y no acredita vigencia tras estos cambios compartidos.
- [ ] Cierre y documentación final VG9.9–VG9.11, sin aprobar por arrastre otros hitos.

**Siguiente: VG9.4 — Accesibilidad.** El manual no necesita nuevos pasos operativos por estos cambios de color; su revisión/exportación final permanece en VG9.10.
