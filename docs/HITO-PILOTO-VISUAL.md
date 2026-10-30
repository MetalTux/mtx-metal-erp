# Piloto visual — Dashboard y Compras

Fecha: **28-10-2026**. **Implementado y validado técnicamente; conformidad general del usuario recibida el 28-10-2026.** La extensión global está planificada en [HITO-DISENO-GLOBAL.md](HITO-DISENO-GLOBAL.md), aún no implementada.

## Decisiones y alcance

El usuario aprobó la propuesta de auditoría y eligió IBM Plex Sans. Posteriormente autorizó implementar el piloto en Dashboard y Compras, Claro y Oscuro, conservando funcionalidades y verificando contraste, densidad, teclado y móvil.

Fuentes: [DESIGN.md](../DESIGN.md), [PRODUCT.md](../PRODUCT.md), [auditoría y propuesta originales](AUDITORIA-VISUAL-DASHBOARD-COMPRAS.md). Se aplicó Impeccable como guía de revisión y acabado. La maqueta independiente conserva su carácter ilustrativo; la aplicación real mantiene todos sus controles y navegación, no sólo los abreviados en la maqueta.

## Avances

| Etapa | Resultado | Estado |
| --- | --- | --- |
| PV0 | Auditoría, propuesta y elección de tipografía | Aprobado para implementación |
| PV1 | Fuente local, tokens de ambos temas y alcance por ruta | Implementado/verificado |
| PV2 | Composición y accesos de Dashboard | Implementado/verificado |
| PV3 | Compras, menú de acciones, filtros y formulario | Implementado/verificado |
| PV4 | Regresión técnica, capturas y documentación | Completado en alcance descrito |
| PV5 | Revisión del piloto real por el usuario y decisión de extensión | Conformidad general recibida; planificación de extensión solicitada |

### PV1 — Base visual

- [x] IBM Plex Sans local, regular 400 y semibold 600, con licencia OFL y procedencia conservadas en src/app/fuentes.
- [x] Paleta mineral para Claro/Oscuro, acento verde mineral y cobre discreto; foco, estados y series con tokens.
- [x] Cabeceras planas, sin sombras decorativas; títulos de página moderados y descripciones de 13 px.
- [x] Alcance por ruta activa: AlcancePiloto usa usePathname; el marcador activa tokens en body para incluir menús/diálogos portados.
- [x] Navegar fuera de / y /compras retira el ámbito aunque se conserve contenido previo en caché; fuente y tokens anteriores se recuperan.

La fuente está declarada en el layout raíz como variable con preload desactivado; sólo se utiliza en las rutas piloto. Inter/Geist Mono y la presentación anterior siguen disponibles fuera de ellas. La barra superior y sidebar acompañan la apariencia de la ruta piloto. No hay preferencia nueva en cuenta/BD ni cambios al selector Claro/Oscuro/Sistema.

### PV2 — Dashboard

- [x] KPI planos y enlaces contextuales a cotizaciones, trabajos, cobranza y reposición; no se ocultan errores como si fueran cero.
- [x] Requerimiento de stock a ancho completo conservando las ocho medidas y sus unidades.
- [x] Paneles sin estirarse a la altura del vecino; listas sin cajas individuales redundantes.
- [x] Gráfico compacto con las mismas series/importes; tabla accesible mediante Ver importes mensuales, operable con teclado.
- [x] Consultas, permisos condicionales, cohortes, definiciones y precisión intactos.

El enlace de reposición usa el filtro real `?reposicion=reposicion`. No se cambió el cálculo de deuda, faltantes, reservas o importes.

### PV3 — Compras

- [x] Ver y Recibir visibles con texto; Más contiene Editar compra, Cerrar cantidades pendientes, Anular compra y Ocultar del listado.
- [x] Permisos y condiciones de bloqueo previos conservados; opciones deshabilitadas muestran motivos legibles.
- [x] Menú con teclado y retorno de foco al botón Más al cerrar edición.
- [x] Búsqueda móvil con ancho útil, sin competir con los botones por unos pocos caracteres.
- [x] Formulario contenido; scroll horizontal sólo en la grilla. Pie de acciones sin márgenes negativos que desborden el form.
- [x] Anchos anteriores de diálogos secundarios conservados: detalle 672 px y recepción 768 px en escritorio, limitados por viewport en móvil.
- [x] Errores de validación en campos/partidas, aria-invalid/describedby y foco al primer inválido en orden visual.
- [x] Precios, factor histórico, equivalencias, confirmaciones, UUID de operaciones, servicios y lógica de stock sin cambios.

No se eliminan las altas relacionadas de proveedor/materia prima ni el historial. Ocultar del listado sigue usando la eliminación lógica previa, sólo tras anular. Este piloto no incluye guardado automático del borrador ni un nuevo flujo de recuperación ante recarga del navegador.

## Validaciones ejecutadas

- [x] `node --import tsx tests/piloto-visual.ui.ts`: componentes completos con datos ficticios y lecturas simuladas; sin servidor/BD y sin ejecutar mutaciones.
- [x] Matriz Claro/Oscuro a 1440/768/360 px y 640 px de reflow equivalente; **640 px no se presenta como prueba de zoom real del navegador**.
- [x] Buscador móvil mayor a 200 px; página/formulario contenidos; desplazamiento horizontal intencional sólo de grilla.
- [x] Menú y tabla mensual con teclado; retorno del foco; cinco controles inválidos con mensajes enlazados y primer foco visual.
- [x] Texto de menú, motivos deshabilitados, errores, controles y foco medidos: mínimos observados **5,78:1 texto, 4,38:1 borde/control y 6,51:1 foco** (objetivos 4,5/3/3). Muestras representativas, no certificación integral.
- [x] Navegación simulada fuera/dentro del piloto con contenido anterior conservado: tokens y fuente aislados por ruta.
- [x] Anchos de detalle/recepción comprobados para evitar una regresión detectada por revisión independiente.
- [x] `pnpm grillas:validar var/validacion/piloto-visual/grillas`: **7/7**; incluye cobertura S4, requerimientos y GD2–GD6 con respuestas simuladas.
- [x] `node --import tsx tests/piloto-visual-next.ui.ts`: Next de producción real, GET públicos a ingreso/recuperación, CSS del ámbito mediante marcador de prueba, carga de ambos pesos de Plex y restauración de la fuente base; hidratación sin errores y cero POST. No representa visita autenticada a Dashboard/Compras.
- [x] `pnpm lint`, tipos y compilación final `pnpm exec next build --webpack` correctos.
- [x] `pnpm build` intentado; Turbopack mantiene el fallo de permisos de puerto interno del entorno. No se altera el script habitual.
- [x] Detector estático de Impeccable ejecutado; no sustituye las pruebas de navegador ni la inspección visual.
- [x] Manual Markdown y PDF regenerados, 19 páginas Carta; capturas ficticias actuales archivadas.

Evidencia completa: var/validacion/piloto-visual/resultado.json (418 mediciones de texto/control/foco), next/next-resultado.json, grillas/resultado.json y 28 capturas. Scripts reproducibles en tests/piloto-visual.ui.ts y tests/piloto-visual-next.ui.ts. El servidor temporal 3032 lo detiene su ensayo; el servidor previo del usuario no se detiene.

## Evidencia visual actual

- [Dashboard Oscuro](capturas/piloto-visual/dashboard-oscuro-1440.png) y [Claro](capturas/piloto-visual/dashboard-claro-1440.png).
- [Compras Claro](capturas/piloto-visual/compras-claro-1440.png), [Oscuro](capturas/piloto-visual/compras-oscuro-1440.png) y [móvil](capturas/piloto-visual/compras-claro-360.png).
- [Formulario móvil](capturas/piloto-visual/formulario-oscuro-360.png), [menú Más](capturas/piloto-visual/menu-oscuro.png) y [errores por campo](capturas/piloto-visual/errores-claro.png).

## Continuidad y límites

- [x] Usuario conforme con el piloto implementado: «mucho más profesional y minimalista» y colores adecuados; no se atribuye ejecución de cada prueba técnica.
- [ ] Recorrido autenticado real, zoom real al 200%, lector de pantalla y comodidad con uso prolongado.
- [x] Usuario solicitó planificar extensión a toda la aplicación, primero base global e Inicio de Sesión; ver HITO-DISENO-GLOBAL.md.

No hay migraciones, seeds, cambios de BD o nuevas dependencias de aplicación. Autenticación, permisos de servidor, servicios transaccionales y documentos históricos intactos. La extensión visual y los pendientes funcionales de otros hitos conservan su estado. El hito original de temas TC4 no se cierra por estas pruebas representativas.
