---
target: Evaluación conjunta Dashboard y Compras, ambos temas, según DESIGN.md; sin cambios de aplicación
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/metaltux/Proyectos/mtx-metal-erp/src/components/compras/compras.tsx"
target_fingerprint: "sha256:6db00404c289e54de84d2a584ab9ef59568f4e8e619f857232d9f9e93722b90a"
target_path: /home/metaltux/Proyectos/mtx-metal-erp/src/components/compras/compras.tsx
timestamp: 2026-10-28T13-12-30Z
slug: src-components-compras-compras-tsx
---
# Auditoría visual y propuesta — Dashboard y Compras

**28-10-2026 · Propuesta para revisión, no implementada en el ERP.**

Método: dual-agent (A: `/root/revision_diseno` · B: `/root/auditoria_tecnica`), con Impeccable y Web Design Guidelines. A evaluó diseño sin conocer los resultados del detector; B ejecutó detector y revisión técnica sin leer A. La síntesis se realizó después de terminar A.

Fuentes de autoridad: [DESIGN.md](../DESIGN.md), [PRODUCT.md](../PRODUCT.md), componentes actuales y [reglas oficiales de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). El encargo en español y las reglas del ERP prevalecen sobre recomendaciones genéricas. No se ejecutó init ni se reescribió el brief.

## Resultado y criterio

Base funcional sólida, presentación aún genérica y dificultades concretas de operación. La prioridad no es cambiar colores: primero ancho útil, lectura simultánea y descubrimiento de acciones. No hay evidencia de un bloqueo P0; los P1 se reproducen en componentes con servicios/datos ficticios o se identifican en código. No se presentan como pruebas completas autenticadas.

Valoración conjunta Dashboard/Compras: **27/40 — aceptable, con mejoras significativas necesarias**. No son dos puntuaciones independientes ni una certificación de accesibilidad.

| Heurística | /4 | Evidencia |
| --- | ---: | --- |
| Visibilidad del estado | 3 | Estados y progreso claros; KPI no conecta directamente con la acción |
| Correspondencia con el mundo real | 4 | Bodega, unidades, recepción y equivalencias representan el trabajo |
| Control y libertad | 3 | Cancelar, Escape y descarte; recorrido real completo no ensayado |
| Consistencia | 3 | Mismos componentes/jerarquía en ambos temas; acciones pasan a iconos en filas |
| Prevención de errores | 3 | Revisión, confirmación y precio fijo; revisión simultánea perjudicada por ancho |
| Reconocer antes que recordar | 2 | Seis iconos requieren aprendizaje y ayudas |
| Flexibilidad y eficiencia | 2 | Búsqueda/orden/paginación; desplazamientos laterales frecuentes |
| Estética y minimalismo | 2 | Marcos, degradados, relieve y alturas vacías compiten con los datos |
| Recuperación de errores | 3 | Resguardo de reintentos, pero errores generales del formulario |
| Ayuda y documentación | 2 | Ayudas por campo/acción; guía de tarea poco visible en las pantallas |

Fortalezas: distinguir documento y recepción; conservar grillas; revisión/confirmación y descarte; ayudas de bloqueos accesibles mediante foco; cifras tabulares y tabla alternativa al gráfico. El diseño debe mantener estas garantías.

## Diagnóstico priorizado

| ID | Prioridad | Hallazgo y evidencia | Propuesta | Comando de referencia |
| --- | --- | --- | --- | --- |
| V01 | P1 | Buscador de Compras comprimido a pocos caracteres en 360 px; etiqueta se divide en varias líneas. compras.tsx:914–941 | Campo en fila completa móvil; botones debajo. No cambiar filtrado ni URL | adapt / layout |
| V02 | P1 | Formulario excede el diálogo: 896 px de ancho y 1.388 px de contenido; en 360 px también mantiene 1.388 px. Campos, texto y acciones quedan fuera del área visible, además de la tabla. compras.tsx:314,344,355,402 | Resolver tamaños mínimos intrínsecos; desplazamiento lateral sólo dentro de la grilla; cabecera y pie contenidos. En escritorio permitir mayor ancho útil; en móvil conservar todas las columnas con scroll explícito | harden / layout |
| V03 | P1 | Seis iconos de acción por fila; Recibir compite con cerrar/anular/eliminar. La última acción exige desplazamiento en la muestra de 1440 px. compras.tsx:788–864 | Ver y Recibir reconocibles con texto según estado; secundarias en Más, con nombres completos, permisos, motivos de bloqueo y confirmaciones actuales | clarify / distill |
| V04 | P1 | Zod se reduce a mensaje general, sin presentar issues por campo ni foco al primer inválido. compras.tsx:228–233,348 | Mantener validaciones; asociar error a campo/partida mediante aria-invalid/aria-describedby y foco o enlace pertinente | harden |
| V05 | P2 | Dashboard sin prioridad de actuación clara, stock de ocho columnas en 2/3 del espacio, tarjetas estiradas por gráfico/tabla. page.tsx:10,17–28. Cabeceras con degradado/relieve y explicaciones a 12 px: globals.css:150–151; section-card.tsx:10 | KPI con acceso contextual, stock a ancho útil, paneles independientes, cabeceras planas y contexto a 13 px | layout / typeset / quieter |

V02 está medido en render de los componentes actuales, sin CSS correctivo del arnés. La combinación de form sin min-w-0 como hijo grid y tabla de ancho intrínseco es una causa probable por código; el piloto debe confirmar la solución con captura/regresión, no darla por corregida en esta auditoría. [Medición completa](capturas/auditoria-visual-20261028/medidas-formulario.json).

### Lectura por personas y carga cognitiva

- **Compras/Bodega experto:** comparar cantidades/importes y operar repetidamente exige menos desplazamientos y acciones predecibles.
- **Persona nueva:** cerrar pendiente, anular y eliminar no son equivalentes. Las ayudas actuales son buenas, pero no reemplazan la identificación visual del siguiente paso.
- **Baja visión/teclado:** nombres accesibles y foco existentes; revisar tamaño del contexto, orden/foco en errores y contenido fuera del ancho visible. No se certifica lector de pantalla.

Carga moderada en escritorio, alta en la revisión del formulario estrecho: seis alternativas equivalentes por fila y necesidad de recordar cifras durante el desplazamiento. No se propone eliminar las ocho medidas de stock ni las columnas de compra: agrupar por significado y preservar comparación.

El recorrido genera confianza al explicar guardar frente a recibir, pero la pierde al localizar acciones o verificar datos recortados. El cierre debe conservar confirmación y siguiente paso explícito. Evitar sustituir resguardos por una estética más simple.

## Propuesta visual para revisar

Abrir la [maqueta HTML independiente](propuestas/visual-20261028/index.html) con el navegador. Sus controles superiores permiten cambiar Dashboard/Compras/Formulario y Claro/Oscuro. No requiere servidor ni sesión. No ejecuta operaciones, no consulta datos y no representa una sustitución ya aprobada del ERP.

Dirección: **mesa de trabajo industrial**. Jerarquía mediante alineación, agrupación funcional y separación tonal; texto suficiente para operar; pocos acentos. El modo de estas pantallas es Operate. Se evita decoración promocional y no se afirma que una paleta concreta garantice por sí sola ausencia de aspecto genérico.

| Rol | Claro | Oscuro |
| --- | --- | --- |
| Fondo | #f0f3f3 | #191f22 |
| Superficie | #fafbfb | #21292d |
| Superficie secundaria | #e6ebeb | #293438 |
| Texto | #202a2e | #e3e9e9 |
| Secundario | #506168 | #a7b8bc |
| Acción / texto sobre acción | #285a54 / #ffffff | #a2cac2 / #162723 |
| Separador / borde de control | #bdc9cc / #63777d | #46585f / #899fa6 |
| Marca/cobre discreto | #815426 | #d4b17e |

Fuente candidata: **IBM Plex Sans**, regular 400 y semibold 600, frente a Inter como referencia actual. Se propone por carácter técnico y lectura de datos, no porque Inter sea inválida. IBM documenta su uso en interfaces y distribución bajo OFL: [fuente oficial](https://github.com/IBM/plex). Copias locales/licencia/procedencia fijada en [fuentes](propuestas/visual-20261028/fuentes/PROCEDENCIA.md); no se instala en el ERP.

Escala candidata: trabajo 14 px, contexto 13 px, metadatos breves 12 px, títulos de bloque 15 px, página 23 px y KPI 27 px. Esquinas discretas de 4 px; sombras y degradados ausentes. Bordes funcionales, foco visible. Acciones compactas de escritorio y más altas en móvil; no encoger texto para ganar filas.

### Dashboard

Mantener cuatro indicadores y definiciones actuales, pero quitar el marco individual y añadir navegación contextual permitida. Comparación de stock a ancho útil, antes de paneles de trabajos/vencimientos. Gráfico secundario más compacto y tabla mensual accesible desplegable; conservar cifras y período de consulta. Paneles sin estirarse a la altura de su vecino.

### Compras

Listado con búsqueda legible y total alineado a derecha. Proveedor/RUT/bodega agrupados como contexto, no borrados. Ver/Recibir identificables; Más para las otras operaciones. En formulario, datos generales compactos, ancho disponible para detalles y total/acciones fuera de la zona de scroll horizontal. Mantener revisión/confirmación, precio fijo, validación de equivalencias, altas relacionadas, bloqueos e idempotencia.

La maqueta representa composición y estilo, no todos los estados ni los permisos. El formulario es sólo lectura de muestra; no contiene todos los diálogos del flujo. La navegación lateral y barra de cuenta están abreviadas para la comparación, no se propone retirar módulos, buscador, notificaciones, cierre de sesión o controles de apariencia del ERP. En el piloto real deben conservarse todos.

## Revisión Web Design Guidelines por archivo

Hallazgos manuales complementarios; el detector de Impeccable no equivale a este listado.

- src/components/compras/compras.tsx:228 — errores generales; conservar issues y vincular al campo/foco.
- src/components/compras/compras.tsx:153 — protección de Cancelar/Escape no cubre por sí sola recarga/cierre del navegador; verificar guardia de salida. No se ensayó pérdida real de borrador.
- src/components/compras/compras.tsx:369 — revisar name/autocomplete/spellCheck del número documental; el estado controlado ya permite enviar datos.
- src/components/section-card.tsx:10 — contexto operativo prolongado a 12 px; evaluar 13 px.
- src/components/ui/button.tsx:7 — transition-all; explicitar propiedades.
- src/components/ui/sidebar.tsx:291 — transición general; explicitar propiedades pertinentes.
- src/components/ui/dialog.tsx:64 — verificar contención de scroll móvil; Radix puede bloquear el fondo, no afirmar fallo sólo por ausencia de overscroll.
- src/app/layout.tsx:17 — evaluar theme-color; color-scheme ya está implementado.

No son fallos: nombres accesibles de iconos, etiquetas enlazadas, anuncios por role=alert/status, foco de Button/Input, gestión Radix, skip link, tabla alternativa al gráfico, límites/paginación y filtros en URL. No forzar type=number para decimales chilenos, virtualización para listas pequeñas, títulos en inglés ni detección automática de idioma.

## Evidencia y alcance

Capturas actuales: [Dashboard Claro](capturas/auditoria-visual-20261028/dashboard-claro-1440.png), [Dashboard Oscuro](capturas/auditoria-visual-20261028/dashboard-oscuro-1440.png), [Compras Claro](capturas/auditoria-visual-20261028/compras-claro-1440.png), [Compras Oscuro](capturas/auditoria-visual-20261028/compras-oscuro-1440.png), [búsqueda móvil](capturas/auditoria-visual-20261028/compras-claro-360.png), [formulario escritorio](capturas/auditoria-visual-20261028/compra-formulario-claro-1440.png), [formulario móvil](capturas/auditoria-visual-20261028/compra-formulario-oscuro-360.png).

Las capturas usan componentes actuales completos, Inter/Geist Mono de la compilación local y datos/servicios ficticios; no incluyen los bloques de prueba extra de TC3. Chromium aislado, solicitudes interceptadas y sin Next/BD. No se leyó .env ni se inició sesión. Otros estados del servidor no se dan por aprobados.

Detector ejecutado realmente por B sobre página Dashboard, Compras y componentes compartidos: **0 hallazgos, 0 advisories, 0 reglas activadas**, exit 0. [JSON](capturas/auditoria-visual-20261028/detector-B.json). El resultado [] no detecta los problemas de ancho, acciones o validación: no certifica calidad ni contraste. No hay falsos positivos que depurar. No hubo overlay ni modificación de pestaña del usuario; la evidencia de navegador la generó el padre con Playwright.

Maqueta revisada con 12 capturas (tres vistas, dos temas, 1440/360 px), fuente local y sin solicitudes HTTP. Ancho de página contenido; scroll horizontal limitado a las tablas. Mínimo de contraste observado del texto ensayado: **5,37:1 Claro / 6,23:1 Oscuro**; objetivo 4,5:1. [Resultados](capturas/auditoria-visual-20261028/propuesta-resultados.json). No certifica todos los pares de controles, zoom 200%, lector de pantalla ni comodidad durante horas; el piloto requiere evaluación humana.

Muestras propuestas: [Dashboard Oscuro](propuestas/visual-20261028/capturas/dashboard-oscuro-1440.png), [Dashboard Claro](propuestas/visual-20261028/capturas/dashboard-claro-1440.png), [Compras Claro](propuestas/visual-20261028/capturas/compras-claro-1440.png), [formulario Oscuro](propuestas/visual-20261028/capturas/formulario-oscuro-1440.png). Datos equivalentes a las capturas actuales; no son documentos reales.

## Orden de un futuro piloto

1. Corregir V01/V02/V04 y comprobar alcance/foco/validación sin cambiar reglas.
2. Probar Ver/Recibir/Más y navegación contextual de Dashboard conservando permisos.
3. Aplicar tokens, tipografía/escala y superficies planas sólo al piloto; evaluar ambos temas con el mismo contenido.
4. Medir desktop/móvil/zoom, errores, cargas, permisos, descartes, recepciones e intentos; ejecutar lint/build/tipos y regresión de grillas al modificar aplicación.
5. Revisar resultado con el usuario antes de extender. No dar por aprobados pendientes previos S7/Cobranzas/Grillas/TC4.

No se modificaron src, esquema, tests de la aplicación, configuración o dependencias. Se añadieron documentos, capturas y maqueta independiente. Los scripts temporales/evidencia completa están en var/validacion/auditoria-visual-20261028, ignorados por Git. No se ejecutan build/lint por una auditoría documental sin cambios de aplicación.

Decisiones para revisión: tipografía IBM Plex Sans frente a conservar Inter, y acciones Ver/Recibir/Más frente a las seis acciones actuales. No se necesita repetir quién usa el ERP ni sus requisitos, ya definidos en el brief.
