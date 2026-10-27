# Cobranzas — guía funcional y operación

Actualizada el **24-10-2026**. C1/C2 aprobados por el usuario; C3 habilitado y validado técnicamente, con revisión funcional pendiente. C4 documenta integración y pruebas; su cierre funcional requiere aprobación expresa.

## Qué representa cada registro

Cada **Orden de Compra Cliente (OCC)** tiene una sola cuenta por cobrar con el importe contratado. Cotizaciones, fabricación y guías no agregan deudas independientes. Las obras propias no tienen cliente ni cuenta comercial.

El **abono** representa dinero efectivamente recibido. Puede ser un anticipo antes de la factura o de la entrega. El saldo se calcula restando los abonos vigentes al importe acordado. Un comprobante es el archivo que documenta un abono; adjuntarlo no cobra dinero otra vez.

El **vencimiento** nace de la factura externa registrada en la OT y el plazo histórico de pago. La **promesa** es una fecha adicional comprometida por el cliente: modificarla no cambia ese vencimiento ni elimina el estado vencido.

## Acceso y permisos

| Perfil | Uso de Cobranzas |
| --- | --- |
| Administrador | Consulta y operaciones del área |
| Cobranza | Consulta, abonos/anulaciones, comprobantes y promesas |
| Ventas | Consulta y descarga autorizada; sin registrar/anular abonos ni cambiar promesas |
| Consulta/Gerencia | Lectura y descarga autorizada |
| Compras y Bodega / Producción y Despacho | Sin acceso financiero por estos roles solos |

Los roles se suman. Una persona con Ventas + Cobranza puede operar ambos módulos. Auditoría y autoría general se consultan con Administrador; los cambios nuevos conservan su responsable aunque luego se cambien los roles.

## Encontrar una cuenta

1. Abrir **Ventas → Cobranza**. Buscar por cliente, folio de OCC o factura y pulsar **Filtrar**.
2. Elegir pago: cuentas vigentes, sin abonos, pago parcial, pagadas o anuladas. El filtro de vencimiento permite vencidas, vencen hoy o sin fecha.
3. Revisar las tarjetas: **Por cobrar en este filtro** y **Saldo vencido en este filtro**. Son totales de todas las cuentas filtradas, no sólo de la página visible. Las anuladas no suman deuda.
4. Abrir **Ver cuenta**. Consultar importe, abonos vigentes, saldo, factura, vencimiento, promesa y sus historiales.
5. Cerrar con **Cerrar detalle**, cruz o Escape; se conserva el filtro. Los historiales tienen paginación independiente cuando superan veinte registros.

También puedes usar **Ver cuenta por cobrar** desde la consulta de una OCC, su OT o una guía. Los tres accesos abren la misma cuenta de la OCC. Si una referencia histórica no tiene cuenta conciliada, el sistema informa que no la encontró: consultar no crea ni reconstruye una deuda.

Si no aparece el enlace, revisar los permisos del perfil y si el trabajo es obra propia. No cambiar una obra propia a comercial sólo para obtener una cuenta.

## Registrar un anticipo o abono

1. Abrir la cuenta y pulsar **Registrar abono**.
2. Ingresar importe positivo, fecha de hoy o pasada según Santiago y medio: Transferencia, Efectivo, Tarjeta, Cheque u Otro. Referencia opcional; para Cheque, registrar sólo cuando esté efectivamente cobrado.
3. Opcionalmente seleccionar un comprobante JPG, PNG o PDF de hasta 5 MB.
4. Pulsar **Revisar operación**, comprobar el resumen y usar **Volver a editar** o **Confirmar operación**.
5. Comprobar el aviso y el nuevo abono/saldo en la cuenta.

Ejemplo: importe acordado $100.000 y anticipo $30.000 dejan saldo $70.000. Emitir dos guías no convierte esa deuda en $200.000. Recibir el pago final de $70.000 deja saldo cero.

No se permiten sobrepagos ni fechas futuras. Si otra persona cobró mientras completabas el formulario, el servidor vuelve a comprobar el saldo antes de confirmar; actualizar y revisar los abonos, sin forzar un importe anterior.

## Corregir un abono

1. Localizar el pago vigente y pulsar **Anular abono #…**.
2. Escribir el motivo, revisar y confirmar. Se conserva el original, con fecha y motivo de anulación, y su importe deja de reducir el saldo.
3. Si corresponde, registrar el pago correcto como abono nuevo. No editar el importe o la fecha de un pago confirmado para ocultar el error.

Anular un abono corrige el registro; no ejecuta una devolución bancaria ni cancela la venta. Una devolución de guía tampoco modifica deuda, factura o abonos. Anular una OCC mantiene sus reglas propias y queda bloqueado si hubo trabajo o abonos, incluso anulados.

## Adjuntar o descargar comprobantes

- En el historial del abono, usar **Adjuntar comprobante**, elegir JPG/PNG/PDF hasta 5 MB, revisar y confirmar. Se puede documentar también un abono anulado, conservando su historia.
- **Descargar [nombre]** obtiene el original. Si se adjuntó un archivo equivocado, agregar el correcto: los anteriores se conservan y se identifican por nombre y fecha.
- La descarga requiere sesión y acceso a Cobranzas. No publicar ni compartir enlaces privados. Cerrar sesión no borra archivos ya descargados al computador.

Al registrar pago y archivo juntos, el sistema confirma primero el pago. Si falla sólo el archivo, el mensaje indica que **el abono ya está registrado**: reintentar únicamente el comprobante o adjuntarlo después desde el historial. No registrar otro pago para resolver un archivo pendiente.

## Cambiar o quitar una promesa

1. Abrir **Cambiar promesa**. Elegir hoy o una fecha futura; dejar la fecha vacía para quitarla.
2. Indicar el motivo, revisar y confirmar.
3. Consultar la fecha actual y **Historial de promesas**, con fecha anterior/nueva y motivo. El Administrador puede consultar la autoría en su visor.

Una promesa antigua ya vencida se conserva. Si la cuenta cambió desde que abriste el detalle, actualizar y volver a revisar antes de enviar: no sobrescribir la decisión de otra persona.

## Cuando no llega una confirmación

- Mantener el formulario y usar **Reintentar misma operación** con sus datos originales. No iniciar otro pago ni volver a cargar un archivo distinto a ciegas.
- Si el resultado continúa incierto, consultar la cuenta desde otra pestaña antes de abandonar el formulario. Si el pago aparece, no registrarlo nuevamente.
- Un error confirmado permite volver a editar. Si sólo falta el comprobante, el pago permanece registrado y se trabaja exclusivamente sobre el archivo pendiente.
- Ante una incidencia persistente, informar cuenta/abono, fecha, rol y mensaje. No enviar contraseñas, códigos de autenticación ni comprobantes con datos sensibles en canales públicos.

## Respaldos y recuperación — responsable de operación

Respaldar conjuntamente PostgreSQL, configuración/claves privadas y todos los almacenes del ERP. Cobranzas incorpora **`COBRANZA_COMPROBANTE_DIR`** o **`var/cobranza/comprobantes/`**; agregarlo a las carpetas ya existentes de logos, imágenes y PDF históricos. Respaldar sólo PostgreSQL conserva las referencias pero pierde los bytes de los comprobantes.

1. Preparar el respaldo con una ventana controlada que permita obtener una copia coherente de base y archivos. Conservar permisos privados y la configuración real de los directorios.
2. Ensayar la restauración en una base y almacenamiento aislados, nunca sobre el entorno de trabajo como prueba.
3. Verificar cuentas/saldos, referencias de archivos, tamaño y huella de los comprobantes, y descargas con/sin permisos. Un archivo alterado no debe descargarse como si fuera válido.
4. Antes de abrir acceso a una base restaurada, seguir la revocación y conciliación de sesiones/enlaces/códigos documentada en [Operación de seguridad](OPERACION-SEGURIDAD.md). No usar restauraciones para omitir el doble factor de otra persona.
5. Conservar originales e historial. Los archivos guardados por una respuesta incierta se concilian contra `PaymentAttachment.fileKey` con servicio detenido y respaldo previo; no hay eliminación automática.

Comprobar espacio disponible y restauración en el servidor definitivo antes de uso en producción. La validación local no sustituye ese ensayo del destino ni las aprobaciones funcionales pendientes.

## Comprobaciones técnicas reproducibles

Desde la raíz: `pnpm seguridad:validar-s6 cobranza-consultas cobranza-cierre`. El ejecutor verifica destino local, respalda el origen, crea copias descartables con almacenamiento temporal y credenciales de prueba, ejecuta escenarios secuenciales y retira sus recursos. No ejecutar los fixtures directamente contra la base de trabajo. Revisa los puertos antes de probar; el servidor de ensayo usa 3031 y no debe reemplazar uno ajeno.

El nombre histórico S6 del ejecutor no implica cerrar Seguridad ni repetir los 48 escenarios. `cobranza-consultas` cubre C1/C2/C3, permisos, idempotencia, rollback, archivos/promesas y Chromium. `cobranza-cierre` cubre integración comercial/productiva, cobro final/corrección, deuda única y enlaces con permisos.

Plan y estado exacto: [HITO-COBRANZAS.md](HITO-COBRANZAS.md). Dashboard sigue como entrega posterior; el resumen de Cobranzas preparado para él no cambia todavía esa pantalla.
