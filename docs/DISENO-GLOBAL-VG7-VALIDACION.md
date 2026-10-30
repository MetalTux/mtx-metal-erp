# VG7 — Cobranzas: implementación y validación

Fecha: **29-10-2026**. Implementación visual completa en Claro y Oscuro; **conformidad funcional del usuario pendiente**.

## Cambios

- Listado con Table y Button compartidos, título de 23 px, ayudas de 13 px, filtros compactos y buscador que conserva ancho legible en móvil/tableta. Importes y encabezados alineados a la derecha con cifras tabulares.
- Totales del filtro en una franja plana; cuenta con resumen semántico de importe acordado, abonos vigentes y saldo. Pago, vencimiento y promesa conservan sus textos y significados independientes.
- Tabla de cuentas con región horizontal enfocable y anillo de foco. Grillas históricas conservan paginación, acciones, archivos y motivos; navegación de promesas permite varias líneas.
- Diálogos de cuenta, abono, anulación, comprobantes y promesas con ancho mínimo controlado, altura limitada y overscroll contenido. Revisión de pago y nombres/motivos pueden partir líneas.
- Ajustes compartidos mínimos: ayuda de GrillaHistorial a 13 px y contención de VerDetalleHistorial. Sus consumidores existentes también heredan estos cambios y se incluyen en la regresión de grillas.

Los enlaces desde OCC/OT/guía y las descargas mantienen sus destinos y permisos. Se conserva la descarga autorizada existente; no se agrega un visor de archivos ni se recolorean comprobantes. No cambia esquema, consultas de negocio, servicios, deuda, sobrepagos, fechas, medios, versiones o claves de idempotencia. Sin escrituras en PostgreSQL ni archivos de negocio. Manual y PDF actualizados.

## Verificaciones

| Comprobación | Resultado / alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm exec tsc --noEmit` | Correcto |
| `pnpm build` | Turbopack bloqueado por restricción de creación de proceso/puerto interno del entorno |
| `pnpm exec next build --webpack` | Correcto: compilación, tipos y generación de rutas |
| `pnpm exec tsx tests/diseno-global-vg7.ui.ts` | 88 escenarios/capturas: 72 de 12 superficies × dos temas × 360/768/1280 px y 16 de revisión/respuesta incierta |
| Contraste de textos visibles en galería | 3608 mediciones compuestas; mínimo 5,79:1. Muestra de textos, enlaces, cifras y botones habilitados; no es una auditoría exhaustiva de todos los estados |
| `pnpm grillas:validar var/validacion/diseno-global-vg7/grillas` | 7/7 correctos, Oscuro |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg7/grillas-claro` | 7/7 correctos, Claro |
| `pnpm manual:pdf` | PDF actualizado |

Galería con página y componentes reales, consultas/roles/acciones ficticios: listado, vacío, cuenta inexistente, entorno sin C3, cuenta, consulta sin operación, abono, anulación, adjunto, promesa, detalle de abono y detalle de cambio de promesa. Comprueba ausencia de errores de navegador, desborde de documento/diálogo, ancho útil del buscador y desplazamiento de la tabla con flecha derecha tras enfocarla.

Pruebas de formularios: revisión y vuelta a editar, cambio mediante el estado de tema real con formulario abierto, respuesta perdida, Escape sin descartar una solicitud incierta y reintento con los mismos datos/claves. En abono con comprobante, el segundo fallo simulado ocurre al adjuntar: se reintenta sólo ese archivo y no se registra nuevamente el pago. La inspección de payloads verifica dos intentos idénticos por acción. No comprueba la validación transaccional de un servidor real ni el formato binario del archivo: el comprobante es ficticio y nunca se envía al ERP.

Regresión GD6 conserva paginación contextual de abonos/promesas, enlaces de archivos anteriores/corregidos, consulta histórica, foco al cerrar detalles, ocultación de operaciones por rol e historiales PDF. Las suites restantes cubren consumidores compartidos. Los ensayos estáticos S4 conservan 93 acciones, 25 páginas, 7 rutas de archivo y 127 entradas asíncronas con autorización.

Evidencia local completa en `var/validacion/diseno-global-vg7/` (ignorada por Git); muestras ficticias revisadas en [capturas/diseno-global-vg7](capturas/diseno-global-vg7/):

- [Listado en Oscuro](capturas/diseno-global-vg7/oscuro-listado-1280.png).
- [Listado móvil en Claro](capturas/diseno-global-vg7/claro-listado-360.png).
- [Cuenta en Oscuro](capturas/diseno-global-vg7/oscuro-cuenta-1280.png).
- [Abono móvil](capturas/diseno-global-vg7/oscuro-abono-360.png).
- [Detalle de comprobantes](capturas/diseno-global-vg7/claro-historial-1280.png).
- [Respuesta incierta conservada](capturas/diseno-global-vg7/oscuro-abono-incierto.png).

Se inspeccionaron capturas renderizadas en ambos temas, incluidos listado móvil, cuenta y formulario/reintento. No se inició servidor de validación ni se detuvieron procesos ajenos.

## Pendientes y continuidad

- [ ] Conformidad visual/funcional del usuario con sus perfiles y datos de prueba reales.
- [ ] Zoom real al 200%, lector de pantalla y recorrido integral con tecnologías de asistencia.
- [ ] Renovar, si corresponde, integración autenticada, descarga binaria y operaciones sobre copia autorizada. Los mocks no acreditan esas pruebas ni cierran C3/C4 o S7 pendientes.

**Siguiente desarrollo: VG8 — Cuenta, administración y estados transversales.** Conservar decisiones visuales aprobadas y no reabrir la lógica de Cobranzas por esta extensión.
