# Operación de Órdenes de Trabajo

Entrega técnica OT0–OT9 completada el 16-10-2026. Aprobación funcional general del usuario recibida el 18-10-2026 y registrada en [el hito](HITO-ORDEN-TRABAJO-PRODUCCION.md). Acceso por roles, Despacho y Cobranza están implementados en sus hitos posteriores. Manual transversal vigente: [MANUAL-USUARIO.md](MANUAL-USUARIO.md).

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

## Permisos vigentes

La sesión y los permisos se validan en servidor. Producción y Despacho/Administrador operan plan, reservas, fabricación, cierre y entregas; Cobranza/Administrador registra o corrige factura externa y opera pagos. Los perfiles con lectura autorizada pueden consultar; precios/cuentas no se envían a perfiles sin permiso financiero. Los roles se suman. Ver [Seguridad](OPERACION-SEGURIDAD.md), [Cobranzas](OPERACION-COBRANZAS.md) y el [manual](MANUAL-USUARIO.md).

Los contratos técnicos siguientes conservan parte de su redacción histórica; las guías operativas actuales y los checkpoints posteriores determinan lo implementado.

## Contrato final de integración: Despacho

Contrato de dominio integrado con el módulo de despacho en `/trabajos/despachos`; las salidas usan sus servicios transaccionales y referencias tipadas.

El alcance fue planificado y aprobado en [HITO-GUIAS-DESPACHO-ENTREGAS.md](HITO-GUIAS-DESPACHO-ENTREGAS.md): sólo ventas de OCC, entregas parciales incluso antes de finalizar OT, guía operativa interna e historial legado no conciliado. G0 fija la sucursal histórica de la OCC como único destino; confirmar la salida acredita la entrega y descuenta stock, y cada línea de servicio/a medida conserva nombre y fecha de conformidad. G1 creó la estructura, G2 incorporó consultas y G3 habilitó la confirmación de entregas en `/trabajos/despachos`. G4 habilita correcciones parciales/completas con motivo y folio propio, recepción física explícita en la bodega original y reconstrucción de reserva propia. Factura, deuda, abonos y documentos posteriores se conservan. Completar reservas y cerrar OT consideran sólo el pendiente neto; devolver no desbloquea la reversión histórica de producción.

- Fuente: `WorkOrder` de contrato nuevo, `WorkOrderLine` y `SalesOrderDetail` aceptado. Cada futura línea de guía conservará esas referencias y snapshots de producto/material/servicio, descripción, unidad y cantidades. El máximo comercial es lo aceptado menos entregas netas confirmadas, no lo ofrecido ni únicamente lo fabricado.
- Datos de consulta a preparar: ID/versión/folio/estado de OT, orden/línea de origen, modo operativo, recurso/unidad histórica, cantidad aceptada, ejecutada neta, entregada neta, pendiente y reserva propia activa por bodega. Mientras no existan líneas de guía, **no presentar** `DeliveryNote` legado como prueba de cantidades entregadas ni inventar entregado cero para un legado ambiguo.
- Producto: consumir únicamente reservas elegibles de entrega de esa línea y saldo de `ProductWarehouseStock`; salida de terminado con origen tipado de guía, sin volver a consumir receta. MP directa: salida comercial de `WarehouseStock`, separada del consumo productivo. A medida/servicio: no mover inventario ni crear producto ficticio; exigir conformidad del cliente por cada línea entregada según D04 del hito.
- Bloquear OT → materiales ascendentes → productos ascendentes → bodegas/saldos, en el orden compatible con producción/reservas. Nunca tomar cuenta/orden comercial después de mantener recursos si otro flujo toma esos padres primero. Si hay comprobaciones comerciales, adquirir Quote → SalesOrder antes de OT.
- Guía/operación/versiones, débitos de reserva, saldo y Kardex deben confirmarse atómicamente con UUID estable. Ampliar restricciones de orígenes con una migración nueva, conservando inicial/ajuste/producción/reversión. El estado FINALIZADO no acredita entrega ni libera reservas.
- Serializar con reversiones, stock y estado industrial; no habilitar reversión de fabricación después de una salida/dependencia confirmada. Anulación/corrección de guía tendrá hechos inversos propios, sin editar Kardex ni reciclar folios.

## Contrato final de integración: Cobranza

- Reutilizar la cuenta única de OCC. Importe acordado inmutable y saldo derivado de abonos no anulados. No crear cuenta por OT, factura o guía.
- `AccountReceivable.dueDate` de OT con contrato nuevo tiene como fuente exclusiva la referencia externa vigente; nulo antes de facturar. `paymentPromiseDate` permanece independiente. Corregir factura conserva importe/pagos y puede recalcular vencimiento incluso con saldo cero.
- Los servicios de abono/anulación implementados en Cobranzas validan UUID estable, importe positivo, medio, sobrepagos, estado de cuenta y permisos. Mantener locks Quote → SalesOrder → WorkOrder si corresponde → AccountReceivable; cuando sólo se bloquea cuenta, no solicitar luego un padre que otro flujo mantenga esperando esa cuenta.
- No trasladar identidad/origen de cuenta o abono para eludir restricciones; no inferir pagos desde campos heredados de `DeliveryNote`. Cuenta anulada se excluye de por cobrar y no se presenta automáticamente como saldada.
- Cancelación contractual, reapertura, cierre incompleto, notas de crédito y facturación parcial requieren nuevas decisiones sobre importes/identidades/vencimientos. No resolverlos reduciendo cantidades de una OT ni editando una cuenta existente.

## Consulta documental de despachos (G5)

Desde **Ver OT** o **Ver OCC**, **Guías y entregas** abre `/trabajos/despachos` filtrado por OT y permite preparar el pendiente elegible. Seleccionar un folio abre el documento sobre el listado: destino histórico, cantidades por unidad, conformidad, Kardex/reservas e historial de originales/correcciones. Registrar una salida o devolución abre su consulta; generar su PDF requiere otra confirmación y no altera inventario ni deuda.

Cada guía o corrección tiene PDF propio, interno y no tributario, archivado por versión de plantilla. Ver/descargar/imprimir utiliza los bytes conservados y verificados; una corrección posterior se consulta en el historial y no reescribe el PDF original. Respaldar PostgreSQL junto con `GUIA_PDF_DIR` (predeterminado `var/guias/pdfs/`) y logos históricos. No purgar emisiones; ante un archivo alterado restaurar los bytes originales desde respaldo. Mantener UUID/datos al reintentar una emisión incierta. El PDF de OT sigue siendo un documento de producción separado. Más detalle en la sección 16 del hito de Guías de Despacho.
