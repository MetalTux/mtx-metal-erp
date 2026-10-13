# Hito PDF de Cotizaciones

Estado: generación, archivo de versiones y actualización explícita del emisor validados funcionalmente por el usuario. P1–P5 cerrados. Envío por correo (P6) pendiente hasta recibir configuración SMTP y contraseña de aplicación válidas del usuario final.

## Decisiones y alcance

- [x] Tamaño Carta: 216 × 279 mm aproximadamente (8,5 × 11 pulgadas).
- [x] Permitir PDF de cotizaciones Pendientes, Aprobadas y Rechazadas.
- [x] Conservar versiones emitidas junto con la versión completa de la cotización que las originó.
- [x] Revisar esquema y servicios actuales: Quote.version es un contador de concurrencia; companySnapshot y demás copias conservan datos históricos, pero las líneas y el detalle técnico editados no tienen archivo completo por revisión.
- [x] Revisar el PDF de referencia de la empresa: hoja comercial con emisor/cliente/líneas/importes/pago y segunda hoja con descripción de trabajos. Contiene un texto de anticipo/entrega que no equivale al plazo de PaymentCondition.
- [x] Respaldar documentación existente antes de actualizarla: `backups/20261012_191935_plan_pdf_cotizaciones`.
- [x] Usuario confirma razón social, RUT, dirección y ciudad obligatorios para el emisor; logo y cuenta bancaria opcionales.
- [x] Usuario confirma Condiciones comerciales opcionales por cotización, separadas del plazo de pago.
- [x] Bloquear nuevas emisiones con emisor histórico incompleto o RUT impreso inválido; informar el motivo sin completar silenciosamente datos históricos.
- [x] Usuario aprueba actualizar expresamente el emisor desde Empresa en cotizaciones Pendientes, creando una nueva revisión y conservando los PDF anteriores.

Referencia: `/home/metaltux/Documentos/fermentador pisquera.pdf`. Su contenido sirve como ejemplo visual/comercial; no se copian automáticamente sus datos bancarios, condiciones ni importes al sistema.

## P1 — revisión histórica y almacenamiento

- [x] Respaldar esquema, archivos afectados, PostgreSQL y archivos locales antes de modificar; comprobar destino autorizado.
- [x] Definir estructura vinculada a Quote que conserve revisión de origen, estado, fecha de emisión, versión de plantilla y formato del snapshot, archivo PDF, tamaño y hash de integridad. UUID estable para reintentos y FK/índices adecuados.
- [x] Guardar snapshot completo de la revisión emitida: folio, fecha/vigencia, cliente/contactos/sucursal, emisor/logo histórico, condición/plazo, cuenta bancaria elegida, líneas/unidades/códigos/cantidades/precios/importes, descuento global, tasa/importes IVA y detalle técnico enriquecido. Incluir condiciones comerciales si se aprueban.
- [x] Conservar referencias de imágenes/logo utilizados y su integridad. No sustituir recursos históricos por archivos actuales. El PDF archivado debe poder descargarse aunque después cambie el catálogo o la plantilla.
- [x] La primera emisión de cada revisión conserva su contenido. Editar una Pendiente cambia Quote.version; emitir esa revisión conserva una nueva copia, sin sobrescribir emisiones anteriores ni asignar otro folio.
- [x] No reconstruir versiones pasadas que nunca se archivaron ni afirmar que cada edición anterior tiene snapshot. El historial nuevo empieza con las emisiones implementadas en este hito.
- [x] Evitar emisiones duplicadas ante doble clic/reintento/concurrencia; reutilizar una emisión equivalente ya confirmada. Distinguir revisión de cotización y versión técnica de plantilla.
- [x] Proteger emisiones y sus snapshots contra modificaciones/borrado físico; conservarlas al ocultar una cotización. Cambios de estado posteriores no alteran el PDF ni el estado que registra su emisión histórica.
- [x] Almacenamiento local con contrato reemplazable por S3, claves controladas y directorio configurable. Respaldar PDFs junto con PostgreSQL, logos e imágenes. Sin purga automática ni URL/ruta libre desde el cliente.
- [x] Migración versionada, restricciones, Prisma validate/generate y prueba en copia antes de aplicar al destino autorizado. No usar db push.

## P2 — plantilla Carta

- [x] Diseñar encabezado de empresa y bloque de identificación: Cotización, folio, revisión emitida, fecha/vigencia y estado textual visible en todos los estados.
- [x] Mostrar cliente/sucursal y contacto usando los snapshots del documento.
- [x] Tabla de líneas mixtas: descripción, cantidad/unidad, precio final unitario e importe; totalizar con los importes ya guardados y formato CLP sin decimales. No recalcular con precios o IVA actuales.
- [x] Mostrar subtotal de líneas, descuento global cuando corresponda, neto, IVA con su tasa histórica y total. Identificar correctamente precios finales frente al desglose neto/IVA.
- [x] Mostrar condición de pago y cuenta bancaria elegida cuando exista; incorporar condiciones comerciales sólo según la respuesta. No convertir textos de anticipo en pagos ni cuentas por cobrar.
- [x] Detalle técnico en sección posterior, inspirado en la segunda hoja de la referencia; no agregar páginas vacías si no hay contenido.
- [x] Renderizar JSON validado a contenido de impresión controlado: títulos, negrita/cursiva/subrayado/tachado, colores, fuentes disponibles, listas/anidamiento, tablas/celdas combinadas, citas y separadores.
- [x] Imágenes con proporción, ancho porcentual, orden y disposición bloque/izquierda/derecha/centro. Listas continuas junto a imágenes; no introducir cierre de flotantes por cada li.
- [x] Definir márgenes/pie/números de página; repetir cabeceras de tablas, evitar cortes innecesarios de filas/bloques y ajustar imágenes grandes al área imprimible. Probar documentos largos y elementos que superen una página.
- [x] Mantener formato independiente del ancho móvil: el PDF siempre es Carta, aunque se solicite desde un teléfono.

## P3 — motor y servicio de emisión

- [x] Elegir motor tras verificar documentación oficial y soporte real de texto enriquecido, flotantes/tablas y paginación. Registrar dependencia y requisitos del servidor; no depender del Chromium temporal utilizado en pruebas locales.
- [x] Recursos de impresión locales/controlados, sin solicitudes a URLs arbitrarias ni ejecución del contenido pegado. Escapar texto y validar estructura; manejar fuentes/archivos ausentes de forma explícita.
- [x] Consultar cotización/líneas/recursos de forma coherente y comprobar revisión esperada. Las consultas transaccionales deben ser secuenciales sobre el mismo cliente pg.
- [x] No mantener bloqueada la cotización durante un render pesado. Diseñar confirmación que compruebe nuevamente la revisión y reconozca reintentos antes de registrar la emisión.
- [x] Guardar archivo y snapshot sin emisiones parciales: coordinar almacenamiento/BD, rollback y limpieza sólo cuando se confirme que no quedó referencia. Conservar ante commit incierto.
- [x] Emitir únicamente documentos guardados; no reservar folios ni guardar cambios del formulario al descargar. Una cotización que cambió exige recarga, no emisión silenciosa de datos obsoletos.
- [x] La emisión no aprueba/rechaza la cotización, fabrica/reserva materiales ni crea orden/deuda/abono.
- [x] Descarga/vista previa de la versión archivada con Content-Type PDF y nombre seguro; futuras descargas entregan el archivo original, no regeneran con catálogos/plantilla actuales.

## P4 — interfaz e historial

- [x] Acción PDF en el listado y en Ver cotización; estados de carga/error y alertas reutilizables.
- [x] Vista de versiones emitidas sobre el listado: revisión de cotización, estado al emitir, fecha/hora y acciones Ver/Descargar. No confundir el estado histórico con el estado actual.
- [x] Emisión de revisión actual y consulta de anteriores; indicar claramente cuando cambió el documento desde el último PDF.
- [x] Controles accesibles, cursor/foco/teclado y adaptación de la lista de versiones a móvil. Alternativa de descarga si el visor PDF integrado no está disponible.
- [x] No emitir un borrador con cambios sin guardar ni descartar modificaciones automáticamente.

## P5 — validación y cierre

- [x] Pruebas de plantilla/importes: CLP entero, IVA variable, descuento global, fechas/RUT y datos bancarios opcionales.
- [x] Integración sólo en copia PostgreSQL/archivos aislados: snapshot completo, revisiones distintas, reintentos/concurrencia, cambio de cotización durante render, rollback de archivo/BD y commit incierto.
- [x] Conservar una emisión previa después de editar Pendiente, cambiar estado, modificar Empresa/Cliente/catálogos/plantilla y ocultar cotización. Comparar hash/bytes del PDF descargado.
- [x] Comprobar documentos Carta de varias páginas con listas/anidamiento, tablas/celdas combinadas, imágenes a ambos lados, títulos y texto largo. Sin páginas vacías ni contenido recortado accidentalmente.
- [x] Probar Pendiente/Aprobada/Rechazada, historial, vista previa/descarga y errores por datos/recursos incompletos según reglas aprobadas.
- [x] Lint/build, comprobación de migración/cliente y diff. Capturas/evidencias, sin fixtures en base real.
- [x] Retirar copia y servidores propios de validación; conservar archivos de prueba sólo como evidencias aisladas en el respaldo. Comprobar puertos libres y conservar procesos previos del usuario.
- [x] Actualizar HITO-COTIZACIONES/CAMBIOS y checks sólo tras implementar y validar.
- [x] Usuario valida expresamente la generación del PDF; cierre funcional de P1–P5.

La actualización del emisor fue aprobada explícitamente. En PDF y versiones se puede usar «Actualizar emisor desde Empresa» mientras la cotización esté Pendiente; requiere confirmación y razón social, RUT válido, dirección y ciudad completos en Empresa. Después se puede generar el PDF de la nueva revisión.


## Entrega técnica — 12-10-2026

- [x] Migración `20261012224528_pdf_cotizaciones_versionadas` revisada, validada en copia y aplicada a PostgreSQL local. 18 migraciones al día; las 45 tablas anteriores conservaron conteos/huellas inmediatamente previos a aplicar. Cero emisiones de prueba en la base real.
- [x] Quote.commercialTerms opcional (5000 caracteres); QuotePdfEmission guarda revisión, estado, folio, snapshot completo, recursos/hashes, versión de plantilla, archivo/tamaño/huella. QuotePdfRequest relaciona UUID estable con emisión; restricciones e inmutabilidad SQL.
- [x] Snapshot conserva todos los escalares originales de Quote/QuoteDetail/DocumentFolio además de los datos de impresión. Decimal y BigInt como texto sin pérdida; fechas ISO. Las revisiones no emitidas anteriormente no se reconstruyen.
- [x] Captura coherente en RepeatableRead → render fuera de transacción → comprobación de revisión/huella antes de archivar. Idempotencia antes de versión, emisión equivalente única y limpieza de archivo perdedor/rollback sólo tras verificar ausencia de referencia; conservación ante commit incierto.
- [x] Plantilla Carta: emisor, cliente/sucursal, estado visible, líneas/precios finales, subtotal con IVA, descuento, neto, tasa/IVA y total; condición/plazo, condiciones comerciales y banco seleccionado. Detalle técnico posterior, listas/imágenes/tablas/cabeceras repetidas y pie de páginas. Plazo histórico nulo no se convierte en cero.
- [x] Playwright 1.64.0/Chromium como dependencia del proyecto; HTML generado desde JSON validado y texto escapado, recursos PNG embebidos, JS de documento deshabilitado y solicitudes remotas bloqueadas. Navegador retirado después de cada render, con límite de tiempo.
- [x] Acción PDF en listado y Ver; historial, visor/descarga y consulta archivada directa sin confirmación ni nueva escritura. Confirmación al emitir, error mediante Aviso reutilizable, estados de carga/procesamiento y retorno de foco.
- [x] Compatibilidad de huellas de solicitudes anteriores sin Condiciones comerciales: null/ausencia conserva la identidad previa de reintento.
- [x] `tests/pdfs-cotizacion.integration.ts`: Carta, copia completa, estados, versiones, UUID/concurrencia, inmutabilidad, rollback/archivos, cambio durante render, recuperación después de commit incierto, alteración del PDF y documento de seis páginas con lista/imagen/tabla y marcador final. Sólo copia y carpetas aisladas.
- [x] Regresión Cotizaciones, pruebas puras de texto/importes, lint/build/tipos y diff. Chromium: edición de condiciones, nueva emisión, visor/descarga con hash anterior intacto, anchos 320–1440; comprobación adicional de RUT histórico inválido en copia.
- [x] Originales, dumps inicial/preaplicación, archivos locales, huellas, logs, scripts, PDF/capturas y sumas en `backups/20261012_194112_pdf_cotizaciones`. Copia/servidores propios retirados al cierre; 3031 libre, servidor previo del usuario en 3030 conservado. Sin push.
- [x] Revisión funcional del usuario: PDF aprobado expresamente; actualización del emisor previamente confirmada como funcional.

### Uso

1. Guardar la cotización. El campo Condiciones comerciales admite texto opcional por documento, sin registrar pagos.
2. Abrir PDF desde el listado o desde Ver cotización.
3. Generar y confirmar la revisión actual si aún no tiene emisión; después elegir Ver o Descargar una revisión archivada.
4. Editar una Pendiente y guardar crea otra revisión de cotización. Emitirla conserva un nuevo PDF; las versiones anteriores siguen disponibles. Cambiar a Aprobada/Rechazada también conserva su revisión/estado al emitir.

La lista puede saltar números de revisión si hubo cambios sin emisión. Guardar snapshots al emitir no significa almacenar cada edición anterior no emitida ni implementar restauración/edición de versiones antiguas. Ocultar una cotización conserva sus archivos y las descargas por referencia.

### Almacenamiento y despliegue

- `var/cotizaciones/pdfs/` o `COTIZACION_PDF_DIR`; contrato AlmacenPdfCotizacion/fábrica para futuro S3. No se implementó S3 ni purga automática. Respaldar esta carpeta y los recursos originales junto con PostgreSQL.
- Runtime Node.js y Chromium instalado para el usuario del proceso. En una máquina nueva ejecutar `pnpm exec playwright install chromium`; instalar las dependencias del sistema que requiera su plataforma. `COTIZACION_CHROMIUM_PATH` permite indicar un ejecutable compatible.
- La instalación actual de Fedora usa el build de fallback de Playwright, validado en este equipo. No se usa la dependencia temporal de pruebas de /tmp para la emisión de la aplicación.
- Las fuentes se muestran según disponibilidad local del servidor; no se descargan fuentes ni recursos externos al emitir. El archivo conservado no depende de que esas fuentes sigan instaladas para futuras descargas.
- Al cambiar la plantilla tras esta entrega, incrementar VERSION_PLANTILLA_PDF. Mantener el formato de snapshot compatible o versionar su estructura mediante migración/validación.

El motor usa CSS de impresión y formato Letter según la [API de PDF de Playwright](https://playwright.dev/docs/api/class-page#page-pdf); la instalación del navegador se documenta en [Browsers](https://playwright.dev/docs/browsers).

## Actualización expresa del emisor — 12-10-2026

- [x] Decisión aprobada por el usuario; nunca actualizar automáticamente documentos antiguos.
- [x] Respaldar código, documentos y PostgreSQL antes del cambio.
- [x] Acción en PDF y versiones, disponible en Pendientes, con confirmación reutilizable y aviso de nueva revisión.
- [x] Copiar sólo el perfil del emisor desde Empresa; mantener cliente, sucursal, banco, condiciones, IVA, precios, líneas, importes y folio.
- [x] Bloquear Empresa incompleta, versión obsoleta, cotizaciones aprobadas/rechazadas/eliminadas o vinculadas a Orden de Compra Cliente.
- [x] Guardar snapshot, nueva versión y operación en una sola transacción; reintentos con UUID estable reconocidos antes de revisar Empresa y versión.
- [x] Preservar emisiones previas; después de actualizar se genera un PDF distinto para la nueva revisión.
- [x] Validación técnica del servicio e integración con PDF archivados (`tests/pdfs-cotizacion.integration.ts --emisor`), regresión del CRUD (`tests/cotizaciones.integration.ts`), lint/build y revisión de interfaz en Chromium.
- [x] Revisión funcional del usuario: actualización del emisor confirmada y generación PDF aprobada.

Respaldo: `backups/20261012_213623_emisor_cotizaciones/`, incluido `postgresql.dump`. No requiere cambio de Prisma ni migración y no actualiza registros reales en lote.

Validado en copia PostgreSQL descartable: renovación de emisor incompleto, conservación exacta de otros datos/líneas, UUID repetido aun después de cambiar Empresa, rechazo de clave reutilizada/Empresa incompleta/estados terminales/baja, conflicto concurrente, rollback deliberado y PDF anterior con bytes/snapshot intactos. En navegador: cancelar y recuperar foco, actualizar, generar PDF de nueva revisión, conservar historial y ocultar acción en Aprobada; anchos 320/375/768/1440 sin desbordamiento.

- [x] Retirar copia de validación y servidor propio de 3031; puerto libre. Servidor previo del usuario en 3030 conservado (PID 43873).
- [x] Revisar diff de archivos afectados contra el respaldo, sin enviar cambios a GitHub.

## P6 — envío de PDF por correo: pendiente

La generación del PDF está aprobada. El envío es una etapa adicional aún no implementada. Por instrucción explícita del usuario, queda en espera hasta que el usuario final entregue sus datos de SMTP y una contraseña de aplicación válidas. Este pendiente no reabre la validación de generación del PDF ni bloquea la planificación de Orden de Compra Cliente.

### P6.1 — decisiones y requisitos

- [x] Registrar la solicitud de envío de cotización PDF al cliente.
- [x] Leer el correo actual del contacto de la sucursal seleccionada desde el mantenedor de Sucursales; no usar automáticamente el contacto general ni el correo histórico copiado en la cotización.
- [x] Si la sucursal no tiene correo, solicitarlo al usuario al realizar el envío.
- [x] Mantener esta etapa pendiente hasta recibir datos SMTP y contraseña de aplicación válidas; no configurar ni enviar correos ahora.
- [ ] Recibir y comprobar servidor, puerto, configuración de seguridad, usuario/remitente y contraseña de aplicación. No registrar valores secretos en documentación ni en git.
- [ ] Al retomar, definir si el correo solicitado cuando falta se usa sólo para ese envío o también se guarda en la sucursal; no asumir esa decisión.
- [ ] Definir selección de revisión PDF, asunto y cuerpo del mensaje antes de desarrollar.

### P6.2 — implementación futura, después de completar requisitos

- [ ] Preparar configuración SMTP con credenciales fuera del repositorio.
- [ ] Incorporar acción de envío, consulta del correo de sucursal, captura de correo faltante y validación del destinatario.
- [ ] Presentar confirmación con destinatario y revisión PDF que se enviará, usando componentes reutilizables.
- [ ] Adjuntar el PDF archivado correspondiente sin alterar sus datos ni las versiones anteriores.
- [ ] Definir y registrar resultado/historial de envío y tratamiento de errores/reintentos para evitar duplicados involuntarios.

### P6.3 — validación y cierre futuro

- [ ] Validar correo existente y ausente, dirección inválida, cancelación y errores SMTP.
- [ ] Comprobar destinatario, adjunto y revisión recibida mediante un envío de prueba autorizado.
- [ ] Ejecutar lint/build y verificaciones apropiadas; retirar servicios propios y comprobar puertos.
- [ ] Obtener validación funcional del usuario para cerrar P6.
