# VG9.10 — Documentación final

Fecha: **30-10-2026**. **Completado documentalmente; aceptación del usuario pendiente (VG9.11).**

## Entrega

- [x] [Manual Markdown](MANUAL-USUARIO.md) edición 30-10-2026 y [PDF](MANUAL-USUARIO.pdf) regenerados desde la misma fuente.
- [x] Navegación, apariencia, teclado, desplazamiento de grillas, cancelación de detalles y estados vacíos descritos; retiradas notas que presentaban el PDF como desactualizado.
- [x] Ocho capturas actuales: ingreso, Dashboard y compra en ambos temas, listado móvil y abono con comprobante. Componentes reales con datos ficticios y transporte simulado; no acreditan operaciones de negocio reales.
- [x] Referencias, avances y continuidad conciliados; resumen actual de V1 distingue implementación y validaciones pendientes, sin reescribir el registro histórico.

## Origen de las imágenes

Copias sin alteración de la **ejecución final correcta de VG9.9**, no del directorio antes/. Archivo permanente: [manifest de capturas](capturas/manual-vg9-10/manifest.json), con ruta original y SHA-256 por imagen. Las imágenes GD7 anteriores se conservan como evidencia histórica, pero ya no ilustran el manual actual.

Las galerías usan componentes y CSS locales, escenarios controlados y datos ficticios. No son una prueba de instalación final, identidad tipográfica en todos los dispositivos, conexión a base real, permisos de servidor o transacciones confirmadas. El manual mantiene pasos textuales para no depender de la lectura de una captura reducida.

## Verificación ejecutada

- `pnpm manual:pdf`: correcto, exportador existente sin cambios, sin iniciar servidor de aplicación ni acceder a PostgreSQL. El exportador impide solicitudes externas y embebe las imágenes.
- `pdfinfo`: **26 páginas Carta**, PDF 1.4, etiquetado, sin cifrado ni JavaScript; **1,107,167 bytes**.
- `pdftotext -layout`: fecha y **19 capítulos** presentes; texto seleccionable comprobado por extracción.
- `pdfimages -list`: **8 imágenes** embebidas; dimensiones originales conservadas.
- Revisión visual de portada/índice y página 23 (grilla de compra): sin recortes de imagen ni pie de página superpuesto en la muestra. No equivale a revisión integral por usuarios.
- Rutas locales, imágenes y anclas del manual: sin destinos inexistentes. Guías externas al PDF requieren conservar docs; no se incrustan sus textos completos.
- SHA-256 del PDF: `903d5e7264da3dd7056b899fcbf2fa827529fdf1c12770e11a452672cf882e7f`.

No se repiten lint/build ni suites: sólo cambian documentación y sus imágenes/PDF. Los resultados de código vigentes son los de [VG9.9](DISENO-GLOBAL-VG9-9-VALIDACION.md), no nuevas ejecuciones en VG9.10. No se cambian aplicación, exportador, dependencias, configuración, servicios, esquema, datos ni PDF comerciales históricos.

## Pendientes conservados

- [ ] VG9.11: aceptación visual y del manual con el usuario.
- [ ] VG9.4: lector de pantalla real; las comprobaciones AX no lo sustituyen.
- [ ] Dispositivos/motores reales, recorridos autenticados e integración con datos autorizados, medición representativa y preparación del entorno definitivo.
- [ ] Revisiones de S7, C3/C4 de Cobranzas, Dashboard, inventario, grillas y usabilidad/manual según sus propios hitos. No se aprueban por publicar documentación.

**Continuar en VG9.11** desde la sección 26 de [HITO-DISENO-GLOBAL.md](HITO-DISENO-GLOBAL.md). No rehacer las regresiones técnicas sólo para retomar la revisión documental.
