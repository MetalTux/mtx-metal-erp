# Operación de Órdenes de Trabajo

Entrega técnica OT0–OT9 completada el 16-10-2026. Aprobación funcional general del usuario recibida el 18-10-2026 y registrada en [el hito](HITO-ORDEN-TRABAJO-PRODUCCION.md). Autenticación/roles, Despacho y los servicios de Cobranza requieren entregas propias.

## Flujo operativo

1. **Ventas → Órdenes de Compra Cliente → Crear trabajo**, o **Trabajos → Órdenes → Crear OT → Obra propia**. Una OCC tiene un solo trabajo permanente; una obra propia no tiene cliente ni cuenta ficticios.
2. Revisar líneas aceptadas, cantidades, receta histórica y distribución de materiales/bodegas. Guardar borrador no reserva. Confirmar plan intenta reservar parcialmente el stock libre, sin consumir ni fabricar. «Completar reservas» intenta cubrir faltantes; liberar exige motivo.
3. **Iniciar OT** fija el plan y registra fecha, sin movimientos físicos. Las reservas pendientes siguen visibles; el consumo se vuelve a comprobar al confirmar cada fabricación.
4. **Registrar fabricación/avance** por línea y lote. Revisar consumos previstos, indicar los reales y justificar diferencias. La fabricación de catálogo confirma SALIDA de materiales + ENTRADA de producto terminado + reservas propias en una transacción. A medida consume materiales sin producto ficticio; servicio puro registra avance. Materia prima directa y cantidades desde stock no se fabrican.
5. **Revertir registro** sólo corrige un error de registro antes del cierre y dentro de sus dependencias. Exige restitución física real cuando corresponde. Retira el resultado exacto y devuelve los materiales originales; conserva ambos documentos. El daño/conteo corresponde a Ajustes y no devuelve receta. Después se puede registrar la ejecución correcta vinculada al original revertido.
6. **Finalizar OT** exige ejecución neta completa y, en comercial, reservas de entrega completas con respaldo físico/Kardex. Revisar preparación y confirmar. Conserva stock/reservas y no acredita despacho. No hay reapertura ni cierre parcial.
7. **Registrar factura externa** en comercial finalizada: folio literal y fecha juntos. El vencimiento usa fecha de factura y plazo histórico de la OCC. Puede registrarse después del cierre. **Corregir factura** requiere motivo y conserva revisión e identidad anteriores. Abonos, importe y promesa no cambian.
8. **Ver OT → PDF y versiones → Generar PDF de esta revisión** archiva una copia Carta de plan, instrucciones, receta, ejecución/reversiones, cierre y referencia de factura. No cambia revisión/folio/estado. Ver/Descargar utiliza los bytes archivados, incluso después de modificar Empresa, receta o trabajo. Revisiones anteriores que nunca se emitieron no se reconstruyen.

La anulación sólo se ofrece para obra propia pendiente sin inicio ni ejecución; libera reservas y conserva documento/folio. No anula un compromiso comercial. Las cantidades se interpretan en la unidad de cada línea/material; no sumar unidades diferentes.

## Errores, conflictos y recuperación

| Situación | Respuesta operativa |
| --- | --- |
| Validación de fecha/cantidad/unidad/motivo | Corregir el dato y volver a previsualizar; nunca se confirma un ajuste silencioso |
| Versión antigua o catálogo/stock cambiado | Actualizar Ver OT, revisar el nuevo estado y preparar una solicitud nueva si la intención cambia |
| Resultado incierto después de confirmar | Mantener datos y UUID; usar Reintentar. El formulario bloquea edición/cierre hasta reconocer el resultado |
| UUID reutilizado para otro contenido | Rechazar. No cambiar el contenido de una solicitud que todavía puede haberse confirmado |
| Físico distinto de Kardex o reserva sin respaldo | Conciliar la incidencia antes de producir/cerrar; no editar movimientos históricos |
| Reversión bloqueada por salida posterior | No reponer stock para eludir la dependencia. Revisar el hecho real y usar el proceso de corrección aplicable |
| Imagen/logo histórico ausente al generar PDF | Recuperar archivo desde respaldo; no sustituirlo automáticamente por el actual |
| PDF archivado ausente o huella/tamaño distinto | GET falla; restaurar los bytes originales desde respaldo. Consultar no regenera otra versión |
| OT legada sin contrato nuevo | Conciliación explícita fuera de esta entrega. No inventar folio, receta, ejecución o factura |

Las operaciones de dominio usan UUID/huella/versiones y snapshots propios. El PDF tiene solicitudes y emisiones independientes: reintentar no consume otro folio ni incrementa versión de OT. Dos solicitudes de la misma OT/revisión/plantilla reutilizan una emisión. Los archivos perdedores o sin referencia se retiran sólo tras comprobar que la base no los referencia; ante incertidumbre se conservan para revisión.

## PDF, respaldo y traslado de entorno

- Carpeta predeterminada: `var/trabajos/pdfs/`; variable `TRABAJO_PDF_DIR`. Contrato `AlmacenPdfTrabajo`, preparado para sustituir el almacenamiento local por otro proveedor sin cambiar las claves históricas.
- Runtime Node y Chromium de Playwright. `TRABAJO_CHROMIUM_PATH` permite seleccionar un ejecutable instalado; no se instala uno desde el formulario. HTML controlado, texto escapado, JavaScript deshabilitado y red bloqueada durante el render.
- Respaldar PostgreSQL **junto con** `TRABAJO_PDF_DIR`, logos de Empresa, imágenes de Cotizaciones y los demás almacenes configurados. Una copia de la base sin sus archivos no permite recuperar los documentos originales.
- Restaurar base y carpetas de un mismo punto coherente en un destino verificado; comprobar migraciones/checksums, permisos de lectura/escritura y lectura por huella de emisiones existentes. No ejecutar seed para «recrear» historia ni vaciar volúmenes para reparar una emisión.
- Nunca purgar emisiones anteriores al cambiar la plantilla. Incrementar `VERSION_PLANTILLA_PDF_TRABAJO` si cambia una plantilla publicada; `snapshotVersion` versiona la estructura de sus copias.
- En OT comercial, el emisor y el alcance provienen del compromiso histórico; en obra propia, la emisión captura la configuración de Empresa disponible al emitir, sin inventar datos faltantes. Las emisiones existentes nunca se actualizan desde Empresa.
- El PDF es un documento interno: contiene instrucciones operativas. No incluye el detalle de abonos ni se presenta como guía, factura tributaria o certificado de pago. No se habilitan uploads de planos ni firma de recepción.

## Permisos futuros

No hay login/roles implementados. La siguiente matriz delimita capacidades que deberá controlar ese módulo; no describe una protección de acceso existente.

| Capacidad | Lectura | Escritura futura a autorizar |
| --- | --- | --- |
| Consulta de OT, plan, avance e historial | Consultar documentos y sus versiones | Ninguna por consultar |
| Planificación | Ver compromiso y recursos | Crear/revisar plan pendiente, iniciar, completar/liberar reservas |
| Producción | Ver previsión, consumos y resultado | Registrar fabricación/avance con confirmación |
| Correcciones | Ver originales y dependencias | Revertir con motivo/confirmación física y anular propia pendiente |
| Cierre y factura | Ver preparación y cuenta | Finalizar, registrar/corregir referencia externa |
| Documentos PDF | Leer/descargar archivo histórico | Emitir copia de revisión actual con confirmación |
| Despacho y Cobranza | Sólo contratos documentados abajo | Sin servicios operativos en este hito |

## Contrato final de integración: Despacho

Contrato de dominio para el próximo módulo; no se ha publicado un endpoint de despacho ni se permiten salidas genéricas para simularlo.

El alcance fue planificado y aprobado en [HITO-GUIAS-DESPACHO-ENTREGAS.md](HITO-GUIAS-DESPACHO-ENTREGAS.md): sólo ventas de OCC, entregas parciales incluso antes de finalizar OT, guía operativa interna e historial legado no conciliado.

- Fuente: `WorkOrder` de contrato nuevo, `WorkOrderLine` y `SalesOrderDetail` aceptado. Cada futura línea de guía conservará esas referencias y snapshots de producto/material/servicio, descripción, unidad y cantidades. El máximo comercial es lo aceptado menos entregas netas confirmadas, no lo ofrecido ni únicamente lo fabricado.
- Datos de consulta a preparar: ID/versión/folio/estado de OT, orden/línea de origen, modo operativo, recurso/unidad histórica, cantidad aceptada, ejecutada neta, entregada neta, pendiente y reserva propia activa por bodega. Mientras no existan líneas de guía, **no presentar** `DeliveryNote` legado como prueba de cantidades entregadas ni inventar entregado cero para un legado ambiguo.
- Producto: consumir únicamente reservas elegibles de entrega de esa línea y saldo de `ProductWarehouseStock`; salida de terminado con origen tipado de guía, sin volver a consumir receta. MP directa: salida comercial de `WarehouseStock`, separada del consumo productivo. A medida/servicio: no mover inventario ni crear producto ficticio; exigir conformidad del cliente por cada línea entregada según D04 del hito.
- Bloquear OT → materiales ascendentes → productos ascendentes → bodegas/saldos, en el orden compatible con producción/reservas. Nunca tomar cuenta/orden comercial después de mantener recursos si otro flujo toma esos padres primero. Si hay comprobaciones comerciales, adquirir Quote → SalesOrder antes de OT.
- Guía/operación/versiones, débitos de reserva, saldo y Kardex deben confirmarse atómicamente con UUID estable. Ampliar restricciones de orígenes con una migración nueva, conservando inicial/ajuste/producción/reversión. El estado FINALIZADO no acredita entrega ni libera reservas.
- Serializar con reversiones, stock y estado industrial; no habilitar reversión de fabricación después de una salida/dependencia confirmada. Anulación/corrección de guía tendrá hechos inversos propios, sin editar Kardex ni reciclar folios.

## Contrato final de integración: Cobranza

- Reutilizar la cuenta única de OCC. Importe acordado inmutable y saldo derivado de abonos no anulados. No crear cuenta por OT, factura o guía.
- `AccountReceivable.dueDate` de OT con contrato nuevo tiene como fuente exclusiva la referencia externa vigente; nulo antes de facturar. `paymentPromiseDate` permanece independiente. Corregir factura conserva importe/pagos y puede recalcular vencimiento incluso con saldo cero.
- Los servicios futuros de abono/anulación deben validar UUID estable, importe positivo, medio, sobrepagos, estado de cuenta y permisos. Mantener locks Quote → SalesOrder → WorkOrder si corresponde → AccountReceivable; cuando sólo se bloquea cuenta, no solicitar luego un padre que otro flujo mantenga esperando esa cuenta.
- No trasladar identidad/origen de cuenta o abono para eludir restricciones; no inferir pagos desde campos heredados de `DeliveryNote`. Cuenta anulada se excluye de por cobrar y no se presenta automáticamente como saldada.
- Cancelación contractual, reapertura, cierre incompleto, notas de crédito y facturación parcial requieren nuevas decisiones sobre importes/identidades/vencimientos. No resolverlos reduciendo cantidades de una OT ni editando una cuenta existente.
