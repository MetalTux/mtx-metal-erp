# Operación de Guías de Despacho y Entregas

El módulo está en **Trabajos → Guías de despacho** (`/trabajos/despachos`). Registra entregas comerciales de una OCC y su OT; no despacha obra propia. La guía es un documento operativo interno, sin carácter tributario ni integración SII. Entregar, producir, finalizar y cobrar son hechos independientes.

## Preparar y confirmar una entrega

1. Desde **Ver OT** o **Ver OCC**, seleccionar **Guías y entregas**. También se puede consultar el número interno de OT en Despachos.
2. Revisar contratado, ejecutado neto, entregado neto y pendiente de cada partida. No sumar cantidades de unidades diferentes.
3. Indicar cantidades sólo en las partidas/bodegas que se entregarán. Dejar las demás vacías; cero, negativos o más de tres decimales se rechazan. Una línea puede repartirse entre bodegas permitidas, sin repetir línea/bodega.
4. Elegir fecha actual o pasada, nunca anterior al inicio de la OT/aceptación de la OCC. Para servicio y a medida, registrar por partida nombre y fecha de conformidad del cliente, no posterior a la guía.
5. **Previsualizar salida** y revisar cantidades y destino histórico. **Confirmar salida y entrega** abre la confirmación final. Hasta confirmarla no se guarda documento ni se consume folio.
6. **Confirmar salida** registra folio permanente, entrega, reserva consumida y salidas de stock/Kardex en una transacción. Se abre la consulta del documento emitido.

Se exige OCC confirmada y OT comercial nueva iniciada o finalizada, numeración configurada y snapshots históricos completos de emisor/cliente/sucursal. No se completan documentos antiguos con datos de los mantenedores actuales. El destino es exclusivamente la sucursal histórica de la OCC.

Bienes: deben existir reserva propia y saldo conciliado en esa bodega. Producto fabricado descuenta terminado; no vuelve a consumir receta. Materia prima directa es una salida comercial separada del consumo de producción. Servicio/a medida exige ejecución neta suficiente y no mueve inventario. Finalizar la OT no entrega sus cantidades ni libera sus reservas.

La preparación es informativa: se revalida bajo bloqueo al confirmar. Si cambian versión, cantidades, reservas o stock, se rechaza la solicitud y corresponde volver a consultar. Los mínimos de inventario no se modifican por entregar.

## Corregir una guía

1. Abrir el folio o seleccionar **Corregir** sobre una entrega nueva.
2. Indicar sólo las cantidades afectadas, dentro del pendiente aún corregible de cada partida, fecha entre la guía original y hoy, y motivo obligatorio.
3. Para bienes, confirmar que las cantidades fueron recibidas físicamente en las **mismas bodegas de salida**. Una devolución sólo comercial no repone inventario.
4. **Previsualizar corrección**, revisar y **Confirmar corrección**.

La corrección es otro documento con folio propio y referencias al original. Puede ser parcial o completa y puede haber varias correcciones parciales, sin superar acumuladamente cada partida original. Una corrección completa incluye todo el pendiente de todas sus partidas. No se editan ni borran guías, movimientos ni folios, y no se corrige otro documento inverso.

La recepción física repone stock y reconstruye reserva propia vinculada al débito original, conservando recurso, bodega y abastecimiento/resultado. Para prestaciones se revierte sólo entrega acreditada, sin inventario. Esto permite volver a despachar la cantidad liberada, incluso con OT finalizada.

Factura, pagos o guías posteriores no bloquean por sí solos una corrección válida: permanecen intactos la deuda acordada, los abonos, vencimientos y documentos confirmados. Una devolución no habilita revertir producción después de un despacho histórico ni anular una OCC que ya tiene OT. La cancelación contractual y notas de crédito requieren alcance separado.

## Consultar, imprimir y descargar

Seleccionar un folio abre el detalle sobre el listado. La consulta distingue fecha del hecho y momento de registro; muestra cantidades por unidad, conformidad, originales/correcciones y referencias de Kardex/reservas. El historial se ordena por registro, no por la fecha manual.

**Generar PDF de guía** requiere confirmación y archiva una copia propia por documento/plantilla. **Ver PDF**, **Descargar** y abrir en otra pestaña permiten imprimir los bytes archivados. Una corrección posterior no reescribe el PDF original. Cada corrección tiene su propio PDF; las plantillas anteriores se conservan.

El PDF toma emisor, cliente y destino de la guía histórica. La bodega conserva su ID original y el nombre auxiliar capturado al emitir esa plantilla. Un logo histórico inválido o faltante bloquea una emisión nueva; no se sustituye por el logo actual. Descargar no depende de volver a renderizar ni de disponer todavía de esos recursos si los bytes ya se archivaron.

Una fila **Legado no conciliado** conserva sus campos originales, incluidos los de pago heredados. No demuestra cantidades entregadas, no genera deuda/pagos nuevos y no recibe folio o PDF retrospectivo.

La sesión y los permisos se validan en servidor: Producción y Despacho/Administrador operan las guías; los perfiles con lectura autorizada consultan. El acceso financiero a la cuenta requiere sus propios permisos. Ver [Seguridad](OPERACION-SEGURIDAD.md) y [manual completo](MANUAL-USUARIO.md).

## Incidencias y recuperación

| Situación | Actuación |
| --- | --- |
| OT modificada / versión desactualizada | Volver a consultar y preparar con el estado vigente. No forzar la versión. |
| Stock o reserva propia insuficiente | Revisar la partida/bodega y las reservas de esa OT; no usar cobertura ajena ni simular fabricación. |
| Saldo distinto del Kardex | Detener la operación y conciliar la incidencia; nunca editar movimientos históricos para hacerla pasar. |
| Resultado incierto o respuesta perdida | Mantener pantalla, datos y UUID; reintentar la misma confirmación. El servicio devuelve el documento ya registrado antes de comprobar versión. No iniciar otra intención para resolver un timeout. |
| Se cerró la pantalla durante un resultado incierto | Revisar primero el historial de esa OT y la operación registrada. No deducir que falló ni emitir un reemplazo hasta conciliar si se confirmó. |
| PDF ausente o huella distinta | Restaurar los bytes originales del respaldo coherente. La descarga falla; no regenera ni sobrescribe historia. |
| Falla de emisión PDF | Reintentar con la misma solicitud. Los archivos nuevos sólo se retiran cuando se comprueba que la base no los referencia; ante incertidumbre se conservan para revisión. |
| Copia histórica incompleta | Solicitar conciliación explícita. No rellenarla desde Empresa/Cliente actuales ni inventar destino/cantidades. |

La fecha manual no cambia el orden histórico ni borra dependencias. Corregir un documento o reponer stock nunca elimina la salida original.

## Respaldo y traslado

Respaldar PostgreSQL junto con `GUIA_PDF_DIR` (por defecto `var/guias/pdfs/`), logos históricos y los demás almacenes del ERP. La base sin sus archivos no recupera las emisiones. Conservar todas las versiones y verificar tamaño/SHA-256 al restaurar; no ejecutar seed para reconstruir documentos.

El render usa Chromium de Playwright instalado y, opcionalmente, `GUIA_CHROMIUM_PATH`; HTML escapado, JavaScript y red bloqueados. Descargar sólo lee bytes validados. El contrato `AlmacenPdfGuia` permite un proveedor futuro manteniendo claves; no hay S3 implementado. Cambiar una plantilla publicada exige incrementar `VERSION_PLANTILLA_PDF_GUIA`, sin purgar archivos previos.

## Repetir la validación técnica

Nunca ejecutar estas pruebas sobre la base de trabajo. Preparar copias locales descartables, verificar su destino y usar un almacén PDF temporal separado. Las pruebas contienen fixtures y triggers de fallo deliberado; sus guardas rechazan nombres de base fuera de su alcance. No deshabilitan triggers de dominio.

| Prueba | Destino requerido | Propósito |
| --- | --- | --- |
| `tests/guias-despacho.integration.ts` | `mtx_validacion_guias_g6_YYYYMMDD` | Matriz de entrega, reservas, carreras y rollback de cada escritura. |
| `tests/guias-despacho.ui.ts preparar` / `tests/guias-despacho.ui.ts <OT>` | Misma copia G6, servidor temporal en 3031 | Fixture único y navegador; comprueba su identidad en el servidor antes de escribir. Pérdida de respuesta después de commit de entrega/PDF/corrección y recuperación con el mismo UUID. |
| `tests/guias-legado.integration.ts preparar` / `tests/guias-legado.integration.ts` | `mtx_validacion_guias_legado_g6_YYYYMMDD` | Preparar primero con migraciones anteriores a `20261013184612`; aplicar luego el resto y verificar transición sin inventar historia. |
| `tests/guias-correcciones.integration.ts` | `mtx_validacion_guias_g4_*` | Regresión de correcciones, finanzas, reentrega y cierre. |
| `tests/guias-documentos.integration.ts` | `mtx_validacion_guias_g5_*` y `GUIA_PDF_DIR=/tmp/pdfs-validacion-guias-g5-*` | Historial/PDF, snapshots, concurrencia, integridad y rollback de archivos. |

Ejecutar cada archivo con `pnpm exec tsx` y `DATABASE_URL` de su copia ya configurada; el test de navegador usa como argumento la OT creada por `preparar`. Las copias de G6/G4/G5 parten de una base configurada con emisor, cliente/sucursal y al menos una cotización válidos. Las pruebas no insertan clientes incompletos ni ejecutan el seed general. La copia de legado parte vacía y recorre las migraciones históricas indicadas.

No paralelizar escrituras de fixtures o regresiones que comparan huellas globales en una misma copia. Sólo las carreras que la prueba declara son simultáneas; para ejecuciones independientes, usar copias y almacenes distintos. Al terminar retirar exclusivamente copias/archivos creados por la validación, detener sus servidores y comprobar puertos. No detener servidores previos del usuario.

## Revisión funcional final

Aprobación funcional general del usuario registrada el 20-10-2026: «Quedó bien». El hito está cerrado. Los recorridos individuales siguientes se conservan como checklist de consulta, sin atribuir al usuario pruebas no detalladas:

- [ ] Entrega parcial y saldo restante desde una OT/OCC propia del entorno, con cantidades/destino y bodega correctos.
- [ ] Prestación con conformidad y entrega de bienes sin repetir consumo de receta.
- [ ] Devolución parcial/completa con recepción física, historial y reserva para reentrega.
- [ ] PDF de entrega/corrección legible y descarga de una emisión anterior conservada.
- [x] Aprobación funcional general y cierre del hito (20-10-2026).

La primera edición textual del [manual del ERP](MANUAL-USUARIO.md) integra estos recorridos. La revisión de usabilidad sigue en [REVISION-USABILIDAD-V1.md](REVISION-USABILIDAD-V1.md); capturas anonimizadas, revisión con usuarios y aprobación de sus mejoras siguen pendientes.
