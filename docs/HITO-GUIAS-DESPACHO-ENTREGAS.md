# Hito Guías de Despacho y Entregas

**Estado: planificación funcional cerrada; implementación pendiente.** El contrato técnico inicial está en [Operación de Órdenes de Trabajo](OPERACION-ORDENES-TRABAJO.md). Las decisiones D01–D05 quedaron aprobadas por el usuario el 18-10-2026. El plan permite iniciar diseño técnico detallado e implementación por etapas; no acredita funcionalidades construidas.

## 1. Objetivo

Registrar, consultar y corregir entregas comprometidas por una Orden de Compra Cliente (OCC), con folio propio, cantidades por línea y bodega, evidencia documental, reservas consumidas y salidas de inventario trazables. Cada entrega confirmada debe quedar relacionada con su origen comercial y con la OT única generada desde esa OCC.

Una guía representa una entrega física o una prestación acreditada según el alcance que se apruebe. No crea, cobra ni modifica la deuda de la OCC. La producción, la finalización industrial y la entrega son hechos distintos.

## 2. Estado actual y dependencias

- `DeliveryNote` sólo contiene fecha, OT y campos heredados de pago; no tiene detalle, folio, idempotencia ni movimientos. No demuestra cantidades entregadas.
- `SalesOrderDetail` conserva lo aceptado y `WorkOrderLine` vincula esa línea con su modo operativo y cantidad de abastecimiento.
- `WorkOrderSupplyPlan` declara producto o materia prima directa por bodega; `StockReservationAllocation` conserva reservas por recurso y línea.
- `ProductWarehouseStock` / `ProductStockMovement` administran terminado. `WarehouseStock` / `StockMovement` administran materias primas. Ambos saldos deben coincidir con su Kardex.
- `DocumentNumberType.GUIA_DESPACHO` y el servicio de folios ya existen. La secuencia debe estar configurada para emitir; un folio asignado no se recicla.
- Las reservas de entrega sobreviven al cierre de OT. Producir terminado no lo despacha ni vuelve a consumir la receta.
- La cuenta por cobrar única pertenece a la OCC. No se creará deuda por guía ni se interpretarán campos de pago heredados de `DeliveryNote`.
- La navegación y cualquier nueva ruta deben ajustarse a `docs/GUIA-INTERFAZ.md`; el módulo debe integrarse en Ventas/Trabajos y sólo habilitar registros comerciales vinculados a OCC.

## 3. Alcance propuesto

Conforme a las decisiones aprobadas de la sección 4:

- Crear guías asociadas a una OT comercial y a una o más líneas contratadas, admitiendo entregas parciales y sucesivas hasta la cantidad aceptada.
- Capturar fecha del hecho, destinatario/dirección de entrega históricos, observaciones, cantidades, unidades y bodega de salida por línea. Los campos exactos de destinatario dependen de la regla acordada para sucursales de clientes.
- Seleccionar por línea una bodega compatible con el recurso y reservar/stock disponible de esa misma línea; no cambiar retroactivamente el plan de OT.
- Mostrar contratado, ejecutado neto, entregado neto y pendiente por cada línea, sin sumar unidades distintas.
- Emitir documento operativo interno imprimible/PDF con folio e instantánea de emisor, cliente, sucursal/destino y detalle; no es tributario ni se integra con SII.
- Consultar historial cronológico, detalle, movimientos y correcciones; conservar documentos emitidos y folios.
- Corregir una guía mediante documento inverso vinculado, con motivo, antes de permitir una nueva entrega de la cantidad liberada.
- Para líneas SERVICIO y A_MEDIDA, registrar conformidad del cliente por línea, sin inventar productos ni mover stock. Definir en G0 los campos mínimos del receptor para evidenciar esa conformidad; una firma electrónica no está incluida en este alcance.
- Mantener integración transaccional con Producción, reservas, Inventario y Cobranza sin modificar los hechos históricos de esos módulos.

Fuera de alcance aprobado: factura tributaria, integración SII, pagos/abonos, cambio de precio o deuda, fabricación, modificación del plan de OT, firma electrónica, transportistas/seguimiento logístico y despacho de obra propia.

## 4. Decisiones funcionales aprobadas

Las respuestas explícitas del usuario se registran abajo; los impactos identifican trabajo de diseño ya derivado de esas respuestas.

| ID | Decisión consultada | Decisión aprobada | Impacto en el plan |
| --- | --- | --- | --- |
| D01 | ¿La guía cubre sólo entregas a clientes vinculadas a OCC, o también movimientos de obra propia? Una obra propia carece de cliente, sucursal y compromiso comercial. | **Aprobada:** sólo OCC/clientes; obra propia queda fuera. | Resuelta: entidad, destino, folio y pantallas limitados a venta comercial. |
| D02 | ¿Se permiten guías parciales mientras la OT está `EN_PROCESO`, o sólo cuando está `FINALIZADO`? | **Aprobada:** permitir parciales antes de finalizar OT; exige ejecución suficiente para servicio/a medida y disponibilidad física del recurso para líneas de inventario. Finalizar OT no despacha. | Resuelta: la implementación debe serializar salida contra reversión y validar la cantidad física correspondiente. |
| D03 | ¿El documento inicial es una guía operativa interna con folio propio o una Guía de Despacho tributaria electrónica conectada al SII? | **Aprobada:** documento operativo interno imprimible, sin integración SII. | Resuelta: folio interno existente; datos tributarios, firma e integración SII no forman requisito de emisión. |
| D04 | Para `SERVICIO` y `A_MEDIDA`, ¿qué acredita la entrega: cantidad/fecha por línea, o conformidad del cliente (nombre, fecha y eventualmente firma)? ¿La guía puede mezclar líneas de stock y servicios? | **Aprobada:** conformidad del cliente por línea para servicios y a medida; se permiten líneas mixtas. La firma electrónica requiere alcance separado; esta versión conserva evidencia de conformidad por línea. | Resuelta en cuanto al hecho requerido; definir en G0 los campos mínimos de identidad del receptor y reflejarlos en el snapshot/PDF. |
| D05 | ¿Cómo tratar las filas `DeliveryNote` históricas que no tienen líneas ni folio de guía? | **Aprobada:** conservarlas como legado no conciliado; no contarlas como entregas ni asignarles folios retrospectivos. | Resuelta: identificar/rotular legado y excluirlo del saldo de entregas. |

**Decisiones cerradas:** D01–D05 fueron contestadas expresamente el 18-10-2026, según el registro al final de este documento. Las preguntas sobre campos de captura identificadas en las etapas son decisiones de detalle del diseño, no bloquean la planificación aprobada.

## 5. Invariantes de dominio propuestos

Estas reglas derivan del contrato OT y de las decisiones aprobadas; cualquier cambio posterior debe quedar registrado:

1. La cantidad entregada neta de una línea no excede la cantidad aceptada en la OCC. La cuenta conserva el importe aceptado original, con independencia de guías parciales.
2. No aceptar cantidades cero/negativas, precisión distinta de `Decimal(14,3)`, unidad diferente a la histórica ni recursos que no correspondan a esa línea.
3. Producto de catálogo: salida únicamente de `ProductWarehouseStock`, respaldada por su kardex y por reservas elegibles de esa línea. No permitir despachar cobertura reservada por otra OT ni habilitar entregas sin reserva dentro de este alcance.
4. Materia prima vendida directamente: salida de `WarehouseStock`, separada del consumo de producción. No inferir venta directa desde un material usado como componente de receta.
5. Producto fabricado: la guía descuenta terminado. No repetir consumos de receta ni crear producción.
6. A_MEDIDA y SERVICIO no generan movimientos de inventario; la cantidad de entrega debe tener ejecución neta suficiente y cada línea requiere conformidad del cliente registrada en el documento. Capturar quién recibe y cuándo; sin incluir firma electrónica en este alcance.
7. La fecha de guía es fecha calendario actual o pasada según Santiago; `createdAt` registra el momento de registro. Una fecha manual anterior no altera orden de registro ni evita dependencias posteriores.
8. Documento, versión, folio, detalle, reserva consumida y movimientos deben confirmarse en una transacción. Reintento con la misma clave UUID y huella devuelve el resultado original; misma clave con otro contenido se rechaza.
9. Documentos, movimientos y correcciones son inmutables. Una corrección conserva el original, exige motivo y vínculos tipados; una entrega corregida no puede borrar una dependencia histórica.
10. Stock final no negativo, saldo igual a suma del Kardex y mismos IDs de material/producto y bodega entre documento, reserva y movimiento.
11. Locks compatibles con otros procesos: adquirir OCC/OT en orden acordado antes de recursos; bloquear materiales/productos y filas de stock en orden ascendente. Revisar expresamente el orden que usan finalización, reversión, reservas, ajustes y traslados antes de escribir el servicio.
12. La guía no actualiza `AccountReceivable`, `Payment`, `DeliveryNote.paymentStatus`, promesas ni fechas de vencimiento.

## 6. Datos y estructura que deberá diseñarse

No editar `schema.prisma` hasta traducir D01–D05 a un diseño concreto y comprobar datos actuales/migraciones aplicadas. El diseño requiere evaluar y definir:

- Cabecera de guía: OCC/OT, folio interno, fecha, revisión/versión, idempotencia/huella, estado de emisión, snapshot del emisor y destino, creador futuro si existe autenticación, observación y referencias de corrección/anulación.
- Detalles inmutables: línea de OT y de OCC, tipo/mode de ejecución, recurso tipado, bodega cuando aplique, cantidad/unidad, código/descripcion histórica y conformidad cuando corresponda.
- Operaciones/versiones para serializar creación/corrección, reconocer reintentos y mantener snapshots antes/después.
- Vínculos tipados desde `StockMovement` y `ProductStockMovement` a los detalles de guía, con FK compuestas para asegurar recurso/bodega; CHECKs de familias de origen mutuamente excluyentes sin invalidar compras, ajustes, traslados, fabricación ni reversiones.
- Vínculos a eventos de reserva para descontar cobertura propia de manera atómica y auditable.
- Tablas de PDF/archivo sólo si se aprueba documento propio; seguir el contrato de archivos y retención establecido por OT8.
- Índices para cada FK nueva, búsquedas por OT/orden/folio/fecha y unicidad permanente del folio.

La forma final debe evitar saldo entregado materializado sin fuente documental. El pendiente se deriva de cantidad aceptada menos entregas confirmadas netas y correcciones vinculadas.

## 7. Etapas de implementación

### G0 — Revisar legado y cerrar campos de captura

- [x] Recibir y registrar respuestas D01–D05 (18-10-2026).
- [ ] Revisar conteos, fechas, OT asociadas y uso histórico de `DeliveryNote`; no asumir que está vacío.
- [ ] Definir manejo de líneas de OCC sin OT nueva, OT legadas, clientes sin Casa Central completa y referencias de destino ausentes.
- [ ] Cerrar vocabulario de estados, campos del destino y condiciones de emisión.
- [ ] Definir qué ocurre con una guía confirmada si se intenta anular la OCC; los datos de sucursal/destino quedan congelados en el snapshot y no se actualizan al editar el cliente.

### G1 — Diseño de invariantes, esquema y migración

- [ ] Diseñar relaciones, índices, FK compuestas, unicidad y CHECKs con invariantes documentados.
- [ ] Extender orígenes de Kardex mediante migración nueva; preservar restricciones vigentes y evitar modificar migraciones aplicadas.
- [ ] Resolver transición de `DeliveryNote` legado de forma explícita; ninguna migración debe asignar cantidad, folio, pago o sucursal ficticios.
- [ ] Añadir restricciones de inmutabilidad/completitud de guía y corrección, siguiendo patrón SQL existente.
- [ ] Documentar esquema/arquitectura en `docs/CAMBIOS.md`; `prisma validate`, generar cliente y aplicar la migración sólo al entorno local/autorizado después de revisar su estado.

### G2 — Consultas y preparación

- [ ] Listado paginado en servidor: búsqueda por folio, cliente, OT, estado y rango de fechas; filtros/orden estables.
- [ ] Vista de elegibilidad por OCC/OT y desglose de líneas con contratado, ejecución neta, entregado neto, pendiente, unidad, reservas, saldo libre y bodegas permitidas.
- [ ] Revalidar al guardar cualquier preview: OCC/OT, cantidades, estado, sucursal, reservas, Kardex y stock pueden cambiar entre consulta y confirmación.
- [ ] Excluir legado ambiguo del cálculo de entregas confirmadas y mostrar aviso explícito según D05.

### G3 — Crear y confirmar guía

- [ ] Flujo de borrador/confirmación (o confirmación única, a decidir al detallar estados), previsualización y confirmación explícita de salidas.
- [ ] Aceptar una o más líneas y posiblemente múltiples bodegas por guía, sin combinar unidades; definir cardinalidad en diseño final.
- [ ] Usar clave UUID generada una vez por intento; bloqueo por clave y por documento para concurrencia e idempotencia.
- [ ] Asignar folio permanente sólo al confirmar, dentro de la transacción y mediante `asignarFolio`.
- [ ] Consumir reservas elegibles de la línea y actualizar stock/Kardex con movimiento SALIDA, operación, snapshot y estado en la misma transacción.
- [ ] Manejar producto, materia prima directa, servicio y a medida conforme D04; evitar movimientos para prestaciones.
- [ ] Rollback completo ante falta de stock, folio, reserva, conflicto de versión, validación SQL o cualquier escritura fallida.

### G4 — Correcciones, anulaciones y dependencias

- [ ] Definir corrección completa o parcial; no editar/cancelar silenciosamente una guía confirmada.
- [ ] Registrar documento inverso con motivo y vínculo a guía/líneas/movimientos originales.
- [ ] Exigir existencia física para reponer al stock tras una devolución; devolución comercial sin recepción física no aumenta bodega.
- [ ] Evitar que una reversión de producción o una corrección de guía rompa el orden histórico y la disponibilidad ya comprometida.
- [ ] Definir restricciones ante factura, guía posterior, cuenta/pagos y baja/anulación contractual, preservando la deuda acordada y los documentos confirmados.

### G5 — Consulta, documento e interfaz

- [ ] Implementar `/trabajos/guias` o ruta aprobada, consulta y creación contextual desde OT/OCC.
- [ ] Mostrar estados comerciales, fechas, destino y líneas sin mezclar pagado con entregado.
- [ ] Preparar PDF imprimible con snapshot inmutable, historial y descarga de bytes validados para el documento operativo aprobado.
- [ ] Validar Empresa y sucursal requeridas para emitir; snapshots futuros no se actualizan por cambios de mantenedores.
- [ ] Diseñar estados vacíos, errores de concurrencia/stock, confirmación, reintento, foco/teclado y móvil usando patrones de la interfaz existente.
- [ ] Permisos quedan informativos hasta que se implemente autenticación; no presentar la pantalla como protegida por roles inexistentes.

### G6 — Validación técnica y revisión funcional

- [ ] Pruebas de integración exclusivamente en copia local descartable: líneas mixtas, parcial/completa, varias guías, bodegas, falta de stock y rollback.
- [ ] Probar concurrencia entre dos guías de la misma línea; asegurar que no excedan contratado ni stock, y entre guía/reversión/ajuste/traslado.
- [ ] Probar reintentos exactos, clave reutilizada con contenido distinto, folio concurrente, falla tras cada escritura y unicidad de corrección.
- [ ] Comparar saldo y suma de Kardex por bodega/recurso antes y después; verificar mínimos/reservas independientes y que no se consume receta de nuevo.
- [ ] Probar legado conforme D05, estados, fechas Santiago, decimales, permisos futuros, accesibilidad y anchos 320/375/768/1440.
- [ ] Ejecutar checks requeridos por el repositorio para cambios de código: `pnpm lint` y `pnpm build`; para esquema añadir `pnpm prisma validate`, generación y estado/migración autorizados.
- [ ] Retirar sólo copias/fixtures de validación creadas por las pruebas; no modificar datos reales para lograr un resultado esperado.
- [ ] Documentar operación, recuperación y respaldo; revisar diff, migración y restricciones SQL.
- [ ] Usuario valida el flujo en su entorno y confirma cierre del hito. No inferir esta aprobación de pruebas técnicas.

## 8. Casos funcionales mínimos

- OCC con una línea PRODUCTO desde fabricación y entrega en dos guías; el stock terminado disminuye sólo por guías y la receta no se repite.
- OCC con PRODUCTO mixto: parte fabricada y parte desde stock; el total entregado no excede aceptado y cada abastecimiento conserva su origen.
- Venta directa de materia prima: salida de MP; sin producción ficticia.
- Guía mixta de recursos y servicio/a medida; unidad/cantidad correctas y movimiento sólo en inventario físico.
- Cantidad entregada parcial y luego saldo restante; rechazo de sobreentrega concurrente o secuencial.
- Intento sin stock, reserva ajena, reserva insuficiente, bodega no autorizada, saldo desalineado con Kardex o recurso archivado.
- Reintento por timeout y UUID repetido para otra carga; rollback conserva folio/stock/documentos según punto de fallo.
- Corrección, devolución física, rechazo de reposición sin stock físicamente recibido y bloqueo por documento posterior.
- OT en cada estado relevante; orden anulada, factura/cobro y campos de pago heredados no generan efectos de despacho/cobranza.
- Filas de DeliveryNote legado con distintos grados de ambigüedad, sin inventar entregas.

## 9. Criterios de cierre

El hito se cierra cuando datos legados se manejen explícitamente; folios, documentos, reservas, stock y Kardex sean consistentes bajo concurrencia y rollback; cada tipo de línea tenga su tratamiento; las correcciones preserven historia; interfaz/documento corresponda a la naturaleza aprobada; checks técnicos y revisión funcional final estén registrados. Los pagos siguen exclusivamente en Cobranza.

## 10. Registro de decisiones y avance

- 18-10-2026: planificación iniciada desde el contrato de OT; el usuario responde D01–D05 y cierra el alcance funcional de la primera versión.
- D01: únicamente entregas comerciales vinculadas a OCC/OT; obras propias fuera de alcance.
- D02: se permiten entregas parciales antes de finalizar la OT; cada línea exige ejecución suficiente si es servicio/a medida y stock físico del recurso cuando corresponda.
- D03: guía operativa interna con folio propio e impresión/PDF; sin naturaleza tributaria ni integración SII.
- D04: servicios y a medida requieren conformidad del cliente por línea; se permiten guías mixtas. La firma electrónica requiere alcance separado; esta versión conserva evidencia de conformidad por línea.
- D05: filas históricas `DeliveryNote` se conservan como legado no conciliado, sin inferir cantidades ni crear folios.
- Las etapas G0–G6 se marcarán sólo al implementarse y validarse conforme a los criterios anteriores.
