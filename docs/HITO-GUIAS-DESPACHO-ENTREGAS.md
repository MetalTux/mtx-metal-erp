# Hito Guías de Despacho y Entregas

**Estado: G0–G6 completados; aprobación funcional general del usuario y cierre del hito el 20-10-2026.** El contrato técnico inicial está en [Operación de Órdenes de Trabajo](OPERACION-ORDENES-TRABAJO.md). D01–D08 fijan la emisión; D09–D11, aprobadas por el usuario para G4, fijan las correcciones. Quedan como mejoras posteriores el manual de usuario completo y la facilidad para identificar y utilizar las funcionalidades.

## 1. Objetivo

Registrar, consultar y corregir entregas comprometidas por una Orden de Compra Cliente (OCC), con folio propio, cantidades por línea y bodega, evidencia documental, reservas consumidas y salidas de inventario trazables. Cada entrega confirmada debe quedar relacionada con su origen comercial y con la OT única generada desde esa OCC.

Una guía confirmada acredita la salida física o una prestación con conformidad. No crea, cobra ni modifica la deuda de la OCC. La producción, la finalización industrial y la entrega son hechos distintos.

## 2. Estado actual y dependencias

- `DeliveryNote` distingue guías nuevas con partidas, folio, operación idempotente, movimientos y correcciones vinculadas de las cabeceras legadas (`schemaVersion = null`). Las cabeceras legadas no demuestran cantidades entregadas.
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
- Capturar fecha del hecho, observaciones, cantidades, unidades y bodega de salida por línea. El destino es exclusivamente la sucursal histórica de la OCC, tomada de su `clientSnapshot`; no se admite otra dirección.
- Seleccionar por línea una bodega compatible con el recurso y reservar/stock disponible de esa misma línea; no cambiar retroactivamente el plan de OT.
- Mostrar contratado, ejecutado neto, entregado neto y pendiente por cada línea, sin sumar unidades distintas.
- Emitir documento operativo interno imprimible/PDF con folio e instantánea de emisor, cliente, sucursal/destino y detalle; no es tributario ni se integra con SII.
- Consultar historial cronológico, detalle, movimientos y correcciones; conservar documentos emitidos y folios.
- Corregir una guía mediante documento inverso vinculado, con motivo, antes de permitir una nueva entrega de la cantidad liberada.
- Para líneas SERVICIO y A_MEDIDA, registrar nombre de quien presta conformidad por el cliente y fecha de conformidad por línea. Ambos son obligatorios; no se exige RUT ni firma y no se mueve stock.
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
| D06 | ¿Puede la guía usar una dirección de obra distinta de la sucursal de la OCC? | **Aprobada:** sólo sucursal de la OCC. | Copiar destino del `clientSnapshot` histórico; bloquear si faltan datos esenciales. |
| D07 | ¿Cuándo acredita la guía la entrega y descuenta stock? | **Aprobada:** al confirmar salida de bodega. | Confirmación única de guía, entrega neta, débito de reservas y SALIDA de Kardex; sin recepción posterior. |
| D08 | ¿Qué datos mínimos prueban conformidad de SERVICIO y A_MEDIDA? | **Aprobada:** nombre y fecha por línea. | Ambos campos obligatorios por cada prestación; sin RUT ni firma. |
| D09 | ¿Corrección completa o parcial? | **Aprobada el 19-10-2026:** parciales o completas, sin superar lo entregado originalmente. | Varias correcciones por original, con límite acumulado por partida; no corregir otro inverso. |
| D10 | ¿Qué permite reponer bienes al stock? | **Aprobada el 19-10-2026:** recepción física explícita en la misma bodega de salida. | Conservar confirmación; reponer stock y reserva propia. Prestaciones revierten sólo entrega acreditada. |
| D11 | ¿Bloquear por factura, pagos o guías posteriores? | **Aprobada el 19-10-2026:** permitir con validaciones de dependencias y cantidades; conservar deuda y documentos. | No modificar cuenta, factura, abonos ni guías posteriores. Mantener bloqueo histórico de reversión de producción. |

**Decisiones cerradas:** D01–D08 fueron contestadas expresamente el 18-10-2026. G0 fija el vocabulario y las condiciones de emisión; G1 quedó implementado en la estructura y migración.

## 5. Invariantes de dominio propuestos

Estas reglas derivan del contrato OT y de las decisiones aprobadas; cualquier cambio posterior debe quedar registrado:

1. La cantidad entregada neta de una línea no excede la cantidad aceptada en la OCC. La cuenta conserva el importe aceptado original, con independencia de guías parciales.
2. No aceptar cantidades cero/negativas, precisión distinta de `Decimal(14,3)`, unidad diferente a la histórica ni recursos que no correspondan a esa línea.
3. Producto de catálogo: salida únicamente de `ProductWarehouseStock`, respaldada por su kardex y por reservas elegibles de esa línea. No permitir despachar cobertura reservada por otra OT ni habilitar entregas sin reserva dentro de este alcance.
4. Materia prima vendida directamente: salida de `WarehouseStock`, separada del consumo de producción. No inferir venta directa desde un material usado como componente de receta.
5. Producto fabricado: la guía descuenta terminado. No repetir consumos de receta ni crear producción.
6. A_MEDIDA y SERVICIO no generan movimientos de inventario; la cantidad de entrega debe tener ejecución neta suficiente y cada línea exige nombre de quien presta conformidad por el cliente y fecha válida, no futura ni posterior a la fecha de la guía. No se exige RUT ni firma.
7. La fecha de guía es fecha calendario actual o pasada según Santiago; `createdAt` registra el momento de registro. Una fecha manual anterior no altera orden de registro ni evita dependencias posteriores.
8. Al confirmar la salida se acredita la entrega. Documento, versión, folio, detalle, reserva consumida y movimientos deben confirmarse en una transacción. Reintento con la misma clave UUID y huella devuelve el resultado original; misma clave con otro contenido se rechaza.
9. Documentos, movimientos y correcciones son inmutables. Una corrección conserva el original, exige motivo y vínculos tipados; una entrega corregida no puede borrar una dependencia histórica.
10. Stock final no negativo, saldo igual a suma del Kardex y mismos IDs de material/producto y bodega entre documento, reserva y movimiento.
11. Locks compatibles con otros procesos: adquirir OCC/OT en orden acordado antes de recursos; bloquear materiales/productos y filas de stock en orden ascendente. Revisar expresamente el orden que usan finalización, reversión, reservas, ajustes y traslados antes de escribir el servicio.
12. La guía no actualiza `AccountReceivable`, `Payment`, `DeliveryNote.paymentStatus`, promesas ni fechas de vencimiento.

## 6. Datos y estructura que deberá diseñarse

No editar `schema.prisma` hasta traducir D01–D08 a un diseño concreto y comprobar datos actuales/migraciones aplicadas. El diseño requiere evaluar y definir:

- Cabecera de guía: OCC/OT, folio interno, fecha, revisión/versión, idempotencia/huella, estado de emisión, snapshot del emisor y destino, creador futuro si existe autenticación, observación y referencias de corrección/anulación.
- Detalles inmutables: línea de OT y de OCC, tipo/mode de ejecución, recurso tipado, bodega cuando aplique, cantidad/unidad, código/descripcion histórica y conformidad cuando corresponda.
- Operaciones/versiones para serializar creación/corrección, reconocer reintentos y mantener snapshots antes/después.
- Vínculos tipados desde `StockMovement` y `ProductStockMovement` a los detalles de guía, con FK compuestas para asegurar recurso/bodega; CHECKs de familias de origen mutuamente excluyentes sin invalidar compras, ajustes, traslados, fabricación ni reversiones.
- Vínculos a eventos de reserva para descontar cobertura propia de manera atómica y auditable.
- Tablas de PDF/archivo para el documento operativo propio aprobado; seguir el contrato de archivos y retención establecido por OT8.
- Índices para cada FK nueva, búsquedas por OT/orden/folio/fecha y unicidad permanente del folio.

La forma final debe evitar saldo entregado materializado sin fuente documental. El pendiente se deriva de cantidad aceptada menos entregas confirmadas netas y correcciones vinculadas.

## 7. Etapas de implementación

### G0 — Revisar legado y cerrar campos de captura

- [x] Recibir y registrar respuestas D01–D08 (18-10-2026).
- [x] Auditar por lectura los registros `DeliveryNote` y su contexto local el 18-10-2026; resultado y límites en sección 11.
- [x] Definir manejo de OCC sin OT nueva, OT legadas y snapshots históricos incompletos: bloquear emisión y pedir conciliación explícita; no completar con datos actuales (sección 11).
- [x] Cerrar estados, destino único en sucursal OCC, conformidad por línea y condiciones de emisión al confirmar salida (sección 11).
- [x] Verificar que la anulación vigente de OCC rechaza toda orden con OT; la guía conservará snapshots de emisor, cliente y destino aunque cambien los mantenedores (sección 11).

### G1 — Diseño de invariantes, esquema y migración

- [x] Diseñar relaciones, índices, FK compuestas, unicidad y CHECKs con invariantes documentados.
- [x] Extender orígenes de Kardex mediante migración nueva; preservar restricciones vigentes y evitar modificar migraciones aplicadas.
- [x] Resolver transición de `DeliveryNote` legado de forma explícita; ninguna migración asigna cantidad, folio, pago o sucursal ficticios.
- [x] Añadir restricciones de inmutabilidad/completitud de guía y corrección, siguiendo patrón SQL existente.
- [x] Documentar esquema/arquitectura en `docs/CAMBIOS.md`; validar y generar cliente y aplicar la migración sólo a la base local revisada.

### G2 — Consultas y preparación

- [x] Listado paginado en servidor: búsqueda por folio, cliente, OT, estado y rango de fechas; filtros/orden estables.
- [x] Vista de elegibilidad por OCC/OT y desglose de líneas con contratado, ejecución neta, entregado neto, pendiente, unidad, reservas, saldo libre, Kardex y bodegas permitidas.
- [x] Definir el contrato de revalidación al confirmar: la previsualización es informativa; OCC/OT, cantidades, estado, sucursal, reservas, Kardex y stock pueden cambiar. La revalidación transaccional efectiva corresponde a G3.
- [x] Excluir legado ambiguo del cálculo de entregas confirmadas y mostrar aviso explícito según D05.

### G3 — Crear y confirmar guía

- [x] Formulario sin borrador persistido, previsualización y confirmación explícita de la salida y entrega; revalidación al confirmar.
- [x] Una o más partidas por guía; la misma línea puede repartirse entre bodegas distintas, sin repetir línea/bodega ni combinar unidades.
- [x] UUID estable por intento, bloqueo por clave y OT, huella y reconocimiento del reintento antes de la versión.
- [x] Folio permanente sólo al confirmar, dentro de la transacción mediante `asignarFolio`.
- [x] Consumo de reservas propias y actualización de stock/Kardex SALIDA con operación y snapshots en la misma transacción.
- [x] Producto, materia prima directa, servicio y a medida según D04; prestaciones sin movimientos de inventario.
- [x] Rollback completo ante falla: comprobado con error inducido después de crear documento, folio, eventos y movimientos en copia descartable.

### G4 — Correcciones, anulaciones y dependencias

- [x] Definir corrección completa o parcial; no editar/cancelar silenciosamente una guía confirmada.
- [x] Registrar documento inverso con motivo y vínculo a guía/líneas/movimientos originales.
- [x] Exigir existencia física para reponer al stock tras una devolución; devolución comercial sin recepción física no aumenta bodega.
- [x] Evitar que una reversión de producción o una corrección de guía rompa el orden histórico y la disponibilidad ya comprometida.
- [x] Definir restricciones ante factura, guía posterior, cuenta/pagos y baja/anulación contractual, preservando la deuda acordada y los documentos confirmados.

### G5 — Consulta, documento e interfaz

- [x] Consolidar la ruta aprobada `/trabajos/despachos`, consulta y creación contextual desde OT/OCC.
- [x] Mostrar estados comerciales, fechas, destino y líneas sin mezclar pagado con entregado.
- [x] Preparar PDF imprimible con snapshot inmutable, historial y descarga de bytes validados para el documento operativo aprobado.
- [x] Validar snapshots históricos de Empresa y de la sucursal de la OCC para emitir; las guías archivadas no se actualizan por cambios de mantenedores.
- [x] Diseñar estados vacíos, errores de concurrencia/stock, confirmación, reintento, foco/teclado y móvil usando patrones de la interfaz existente.
- [x] Permisos quedan informativos hasta que se implemente autenticación; no presentar la pantalla como protegida por roles inexistentes.

### G6 — Validación técnica y revisión funcional

- [x] Pruebas de integración exclusivamente en copia local descartable: líneas mixtas, parcial/completa, varias guías, bodegas, falta de stock y rollback.
- [x] Probar concurrencia entre dos guías de la misma línea; asegurar que no excedan contratado ni stock, y entre guía/reversión/ajuste/traslado.
- [x] Probar reintentos exactos, clave reutilizada con contenido distinto, folio concurrente, falla tras cada escritura y unicidad de corrección.
- [x] Comparar saldo y suma de Kardex por bodega/recurso antes y después; verificar mínimos/reservas independientes y que no se consume receta de nuevo.
- [x] Probar legado conforme D05, estados, fechas Santiago, decimales, permisos futuros, accesibilidad y anchos 320/375/768/1440.
- [x] Ejecutar checks requeridos por el repositorio para cambios de código: `pnpm lint` y `pnpm build`; para esquema añadir `pnpm prisma validate`, generación y estado/migración autorizados.
- [x] Retirar sólo copias/fixtures de validación creadas por las pruebas; no modificar datos reales para lograr un resultado esperado.
- [x] Documentar operación, recuperación y respaldo; revisar diff, migración y restricciones SQL.
- [x] Aprobación funcional general del usuario el 20-10-2026: «Quedó bien». Cierre del hito, con manual completo y mejoras de usabilidad pendientes como trabajo posterior.

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
- D06: el único destino es la sucursal histórica de la OCC; sin dirección de obra alternativa.
- D07: confirmar salida de bodega confirma la guía, acredita la entrega y descuenta stock de las líneas físicas en una transacción; no hay recepción posterior.
- D08: SERVICIO y A_MEDIDA exigen nombre y fecha de conformidad por cada línea, sin RUT ni firma.
- Las etapas G0–G6 se marcarán sólo al implementarse y validarse conforme a los criterios anteriores.

## 11. G0 — Auditoría inicial y decisiones derivadas (18-10-2026)

Auditoría **sólo de lectura** sobre la base local, con transacción `REPEATABLE READ READ ONLY` cerrada mediante `ROLLBACK`. Se consultaron únicamente conteos y estados agregados, sin copiar datos personales al documento:

| Comprobación | Resultado local | Implicación |
| --- | ---: | --- |
| `DeliveryNote` heredadas | 0 | No hay filas que conciliar en este entorno; D05 sigue siendo regla obligatoria para otros entornos o datos futuros. |
| OT comerciales nuevas | 1, finalizada | Hay un caso actual de OT comercial; una guía nueva tendrá que validar elegibilidad y pendientes por línea. |
| OCC confirmadas sin OT | 0 | Aun así, el flujo debe rechazar una OCC sin trabajo asociado hasta crear su OT. |
| Sucursales con datos incompletos | 0 | Validar todos los campos requeridos al emitir; no confiar en este conteo como regla general. |
| Numeración de Guía de Despacho | 1 configuración completa | La secuencia local está preparada; la emisión debe seguir comprobándola en la transacción. |
| Perfil de Empresa con datos básicos | 1 | Hay emisor local para previsualizar; usar la copia histórica de la OCC al emitir, no reemplazarla por valores actuales. |

La OCC nueva conserva `clientSnapshot` con RUT/nombre/contacto generales y nombre/dirección/ciudad/contacto/teléfono/correo de su sucursal, además de `companySnapshot`. Para una guía de esta primera versión, el origen comercial debe ser `SalesOrder.status = CONFIRMADA`, con OT propia `schemaVersion = 1` en `EN_PROCESO` o `FINALIZADO`; `PENDIENTE`, `ANULADO`, obra propia y OT legada quedan fuera. Una OCC confirmada sin OT no permite emitir; debe crearse primero la OT conforme al flujo vigente. Si falta un dato histórico esencial de cliente, sucursal o emisor, bloquear emisión y pedir conciliación explícita; no completarlo silenciosamente con el mantenedor actual.

El servicio actual `anularOrdenCompraCliente` ya rechaza cualquier OCC con OT asociada, por lo que una guía de la primera versión no puede quedar con una OCC anulada mediante ese flujo. Conservar esta precondición al desarrollar Despacho. Cambiar la sucursal o Empresa después de emitir no modifica los datos archivados en la guía.

Las respuestas D06–D08 cierran G0. El destino es **únicamente la sucursal que figura en el `clientSnapshot` de la OCC**; nombre, dirección, ciudad y contacto se copian al documento. Si falta un dato histórico esencial, se bloquea la emisión y se solicita conciliación explícita. No se ofrece dirección de obra ni otra sucursal.

**Estados y hecho de entrega:** el formulario sin confirmar no se guarda como guía ni consume folio. La guía queda `CONFIRMADA` cuando se confirma la salida de bodega; en ese mismo hecho se acreditan las cantidades entregadas, se descuentan reservas y se generan las salidas de stock/Kardex de los bienes físicos. Una guía sólo de prestaciones no genera movimientos de stock, pero su confirmación acredita las cantidades con conformidad por línea. No existe estado de recepción posterior. `CORREGIDA` será una condición derivada de documentos inversos vinculados, cuyo detalle técnico se diseña en G4; pagos y vencimiento no son estados de guía.

**Condiciones de emisión:** exigir OCC `CONFIRMADA` con OT nueva propia `EN_PROCESO` o `FINALIZADO`, líneas de OCC/OT coincidentes, cantidades pendientes positivas y elegibles, y snapshot histórico completo de emisor/cliente/sucursal. La numeración debe estar configurada. Cada línea SERVICIO o A_MEDIDA incluida exige nombre no vacío de quien presta conformidad por el cliente y fecha válida, no futura ni posterior a la fecha de la guía. No se exige RUT ni firma. Si la guía combina bienes y prestaciones, la conformidad se registra sólo en cada línea de prestación.

## 12. G1 — Estructura y transición de datos

La migración `20261019010200_estructura_guias_despacho` incorpora `DeliveryNoteLine` y distingue con `schemaVersion = 1` las guías nuevas de las cabeceras heredadas (`null`). Los campos antiguos de fecha, pago y comprobante se conservan en las filas existentes; la migración no crea guías, partidas, folios ni entregas retroactivas. Las nuevas guías dejan esos campos heredados vacíos y guardan fecha calendario de despacho, folio interno, UUID/huella, confirmación, snapshots históricos y eventual vínculo de corrección.

Cada partida referencia simultáneamente la guía, la línea OT y la línea OCC mediante FK compuestas; conserva unidad, recurso, bodega, cantidad y conformidad. Una guía puede repetir una línea comercial en distintas partidas/bodegas, con posición única. Los movimientos físicos tienen referencia tipada única a la partida con FK compuesta de recurso/bodega. Los eventos de reserva también apuntan a la partida. La operación de OT `DESPACHAR` o `CORREGIR_DESPACHO` referencia la guía y mantiene UUID, huella y versión. Los CHECKs distinguen familias de origen y validan signo de salidas/restituciones sin reescribir movimientos previos.

SQL diferido exige para una guía nueva folio y operación correspondientes, OCC confirmada y OT comercial iniciada, snapshots/destino históricos, al menos una partida, copia de líneas OCC/OT, cantidad neta entre cero y lo contratado, movimiento físico exacto y reserva consumida cuando corresponda, conformidad por prestación y corrección vinculada sin exceder el original. G1 mantuvo bloqueada la inserción hasta que la migración G3 habilitó únicamente entregas confirmadas; edición, eliminación y correcciones siguen fuera de ese escritor.

## 13. G2 — Consultas y preparación de salida

`src/lib/consultas/guias-despacho.ts` ofrece listado paginado con filtros validados y orden estable por ID como desempate. Por defecto consulta sólo guías `schemaVersion = 1`; el legado se consulta explícitamente y su conteo genera un aviso. `prepararGuiaDespacho` lee OCC, OT, líneas, ejecución neta no revertida, entregas netas de guías nuevas, reservas activas y saldos por bodega en una transacción `RepeatableRead`. Las cantidades se calculan con `Prisma.Decimal` y viajan como texto. Para bienes físicos, el máximo orientativo queda acotado por pendiente, reserva propia, saldo y conciliación Kardex; para prestaciones, por pendiente y ejecución neta sin entregar. Sólo aparecen bodegas con reserva de entrega propia y se identifica su clasificación.

G2 incorporó a `/trabajos/despachos` el listado, filtro de legado y preparación de una OT por número interno. En esa etapa no existía confirmación ni asignación de folio. La previsualización continúa sin conceder derecho a despachar: G3 vuelve a comprobar las condiciones con bloqueos dentro de la transacción de salida. La prueba G2 de sólo lectura encontró cero guías y preparó la OT comercial existente sin escrituras.

## 14. G3 — Confirmación de salida y entrega

La migración `20261019024500_confirmacion_guias_despacho` habilita inserciones de `ENTREGA` y partidas vinculadas, incorpora `DESPACHAR` a las comprobaciones de plan, cierre y reservas, y verifica que la nueva operación no altere el plan ni cree asignaciones o eventos ajenos a la guía. No habilita `CORRECCION`, edición ni borrado; esos procesos siguen en G4. La OT puede estar `EN_PROCESO` o `FINALIZADO`. La guía interna se confirma en un único paso, sin borrador ni recepción posterior.

`registrarGuiaDespacho` valida UUID/huella antes de versión; bloquea cotización → OCC → OT, luego recursos y saldos ordenados; revalida snapshots históricos, fecha, cantidades, ejecución de prestaciones, reserva propia, stock y Kardex. Acepta varias partidas, incluso una misma línea física repartida entre bodegas distintas. Un servicio o trabajo a medida exige nombre y fecha de conformidad por partida. Al confirmar, asigna folio, crea guía/partidas, consume reservas propias y registra SALIDA de inventario físico, incrementa versión de OT y conserva la operación/snapshots en una sola transacción. La pantalla `/trabajos/despachos` ofrece previsualización y confirmación explícita; un resultado incierto debe reintentarse con los mismos datos y UUID.

Validación técnica G3 en dos copias descartables de la base local: guía mixta de producto y servicio con reintento idéntico; UUID reutilizado con contenido distinto rechazado; stock de producto igual a su Kardex; falla inducida en la operación final con rollback de guía, eventos, movimientos y folio. La migración se aplicó a `mtx_metal_erp` después de respaldarla en `backups/20261019_guias_g3/base.dump` (ignorado por git), sin emitir guías allí. Los escenarios exhaustivos de concurrencia, venta directa, correcciones, UI y revisión funcional corresponden a G6/G4/G5 según su etapa.

## 15. G4 — Correcciones y dependencias (19-10-2026)

### Reglas aprobadas y operación

D09–D11 permiten corregir una parte o todo el pendiente de una guía de entrega nueva. En `/trabajos/despachos`, la acción **Corregir** abre las partidas originales, sus cantidades aún corregibles y las bodegas históricas. Indicar cantidades sólo en las partidas afectadas, fecha entre la guía original y hoy según Santiago, y motivo obligatorio. Una corrección completa incluye todo el pendiente de todas las partidas; no hay borrado, edición ni cancelación silenciosa del documento original.

Para bienes, confirmar expresamente que las cantidades retornadas fueron recibidas físicamente en sus bodegas originales. Sin esa recepción no se registra una devolución que aumente inventario. Para SERVICIO/A_MEDIDA se revierte sólo la entrega acreditada, sin stock ni consumo de receta. La corrección no acredita una nueva conformidad. El documento inverso conserva la guía original, cada partida original y, mediante esos vínculos tipados, sus movimientos de salida. La nueva corrección tiene folio propio e inmutable; los folios anteriores no se reciclan. No se corrigen cabeceras legadas ni documentos inversos; cada nuevo intento sobre el original respeta el límite acumulado por partida.

La previsualización es informativa. Al confirmar se revalidan versión, fecha, pertenencia, cantidades, stock/Kardex y reservas bajo bloqueos cotización → OCC → OT → materiales/productos → bodegas/saldos ordenados. `corregirGuiaDespacho` reconoce UUID/huella antes de validar versión. Documento, líneas, AJUSTE positivo, reserva reconstruida, versión y operación `CORREGIR_DESPACHO` se confirman juntos. Ante resultado incierto, mantener la pantalla y reintentar sin cambiar datos ni UUID; no iniciar otra devolución mientras no se resuelva ese intento.

### Reservas y dependencias

La recepción física reconstruye reserva propia con nuevas asignaciones que referencian la partida inversa y el evento `CONSUMIR` original mediante FK. Cada asignación conserva recurso, bodega, unidad y origen de abastecimiento/resultado fabricado. La suma restituida no puede superar ese débito. Los eventos/asignaciones anteriores permanecen inmutables; la cantidad devuelta queda comprometida a la misma línea, incluso con OT finalizada, y puede volver a despacharse.

Las funciones SQL `entrega_neta_linea_trabajo` y `entrega_neta_origen_reserva` derivan cantidades desde documentos/débitos y sus restituciones. Completar reservas pide sólo lo aún no entregado; el cierre de OT exige cobertura del pendiente neto, no volver a reservar una entrega ya confirmada. Su previsualización incluye entregado neto y pendiente. No se guardan saldos entregados duplicados ni se reescriben snapshots previos.

Factura, pagos o guías posteriores no impiden por sí solos una corrección válida. La cuenta, importe acordado, vencimiento, promesas, abonos y factura se conservan. La anulación contractual de OCC con OT sigue bloqueada por su servicio existente; la corrección no habilita anular el contrato. Revertir producción con despacho asociado sigue bloqueado, aun si después se devuelve todo; una devolución no borra salidas ni dependencias históricas. Las cantidades y las reservas ajenas se preservan mediante revalidación, bloqueos y restricciones de stock.

### Migración y validación

`20261019040000_correcciones_guias_despacho` habilita los inversos conservando las protecciones G1/G3, añade confirmación física y relaciones/indexación de reservas restituidas, y adapta las comprobaciones de OT/reservas/cierre. No modifica migraciones anteriores. Restricciones SQL exigen motivo/fecha, identidad de origen, restitución exacta y operación propia sin alterar plan ni reservas ajenas. Las partidas sólo pueden agregarse en la misma transacción que crea su cabecera; documentos y movimientos siguen inmutables.

`tests/guias-correcciones.integration.ts` exige copia local `mtx_validacion_guias_g4_*`. Se validaron producto fabricado y desde stock, MP directa, servicio, a medida, guías mixtas, varias bodegas, parcial/completa, reentrega, factura/abonos/guía posterior, completar reservas y cerrar OT después de entrega/devolución, UUID/reintento, concurrencia entre correcciones y entre entrega/corrección, inmutabilidad, rechazo SQL de recepción no confirmada y rollback inducido al crear la operación final. Se compararon stock/Kardex y mínimos. La regresión existente `tests/ordenes-trabajo-cierre.integration.ts` pasó en una copia independiente.

La migración definitiva se aplicó desde una copia limpia y no presentó diferencias con el esquema Prisma. En Chromium se verificaron recepción obligatoria, previsualización, volver a revisar y confirmar; sin errores JS ni desborde a 320/375/768/1440 px tras estabilizar el cambio responsive. El servidor temporal de 3031 se detuvo; se conservó el servidor previo del usuario en 3030.

Migración aplicada a la base local `mtx_metal_erp` tras respaldo en `backups/20261019_guias_g4/base.dump` (ignorado por git). Las 67 tablas de negocio conservaron conteos y huellas antes/después, excluyendo sólo las nuevas columnas al comparar. No se emitieron guías ni correcciones en la base original durante las pruebas. G5 mantiene pendientes documento/PDF, historial detallado e integración contextual; G6 mantiene la matriz exhaustiva y la aprobación funcional final del usuario.

Checks finales: `pnpm lint`, `pnpm build`, `pnpm prisma validate` y `pnpm prisma generate` correctos; `pnpm prisma migrate status` informa 35 migraciones al día y `migrate diff` no detecta diferencias. Revisión de contenido/rutas/diff sin espacios finales. Las tres copias locales de validación G4 y los dumps temporales del contenedor se retiraron; el respaldo permanente se conserva. No se realizó push.

## 16. G5 — Consulta, PDF e integración contextual (19-10-2026)

### Consulta y operación

Se mantiene la ruta aprobada `/trabajos/despachos`. El folio del listado abre la consulta sobre la misma pantalla, con emisor/cliente/destino históricos, fecha del hecho y de registro, cantidades por partida/unidad, conformidad, correcciones y referencias tipadas de Kardex, débitos y reservas restituidas. La tabla de compromiso muestra contratado, entregado neto y pendiente actual sin sumar unidades diferentes. El historial de entregas/correcciones de la OT se ordena por registro con desempate por ID; una fecha manual no cambia ese orden. Los vínculos permiten recorrer originales y documentos inversos. El legado se rotula sin atribuirle cantidades ni emitir PDF retrospectivos.

**Guías y entregas** desde Ver OT o Ver OCC abre el módulo filtrado por OT y prepara una nueva entrega con sus condiciones actuales. Los filtros conservan el contexto; **Ver todas** lo retira. Confirmar salida o corrección abre el documento registrado. La salida presenta las cantidades y destino previsualizados antes de pedir confirmación; los campos se bloquean mientras confirma o ante resultado incierto, conservando UUID y datos. La consulta no muestra pagado como estado de entrega ni altera cobranza. Incluye estados de carga, documento no encontrado y error de consulta recuperable.

La consulta tiene foco inicial en el título, cierre por Escape y retorno al enlace del listado cuando está presente. Las confirmaciones devuelven foco al botón de revisión/confirmación. La emisión PDF bloquea el cierre y navegación de la consulta mientras escribe o conserva un resultado incierto. Los permisos se describen expresamente como futuros: no hay autenticación ni protección efectiva por roles.

### PDF archivado e inmutabilidad

**Generar PDF de guía** pide confirmación y archiva el documento interno en Carta; **Ver PDF**, **Descargar** y abrir en otra pestaña permiten consultarlo/imprimirlo. Cada entrega o corrección tiene su propio PDF. Contiene folio, fecha, emisor, cliente/sucursal/contacto/destino, OCC/OT, partidas, unidades, bodegas y conformidad de prestaciones. Un inverso incluye guía original, motivo y recepción física cuando aplica. No incorpora deuda ni abonos y declara su naturaleza operativa, sin integración SII ni valor tributario.

`DeliveryNotePdfEmission` / `DeliveryNotePdfRequest`, incorporados por `20261019060000_pdf_guias_despacho`, conservan snapshot, versión de plantilla, archivo/tamaño/SHA-256, historial y UUID/huella. Las guías son inmutables: la unicidad es guía/plantilla, no una revisión artificial de OT ni su estado actual de pago. Una corrección posterior no modifica el PDF de la entrega original. Otra versión de plantilla crea una emisión nueva y conserva las anteriores. El emisor/cliente/destino provienen exclusivamente de la guía; la emisión rechaza copias históricas incompletas, sin recurrir a mantenedores actuales.

`snapshot_pdf_guia` conserva cabecera/partidas, folios y nombres auxiliares de bodega al emitir. La bodega se identifica siempre por su ID original; su nombre descriptivo se captura al generar el primer PDF de esa plantilla, no se presenta como un nombre histórico reconstruido. Tras archivar, tampoco ese nombre cambia. El logo opcional usa únicamente la referencia local histórica del emisor y se conserva su huella como recurso; una referencia inválida o archivo faltante bloquea una emisión nueva, sin sustituirlo por el logo actual.

Captura coherente en `RepeatableRead`, render fuera de transacción y comprobación del origen al archivar. Bloqueos por UUID/guía serializan reintentos y primeras emisiones concurrentes; sus solicitudes convergen en una sola emisión. Triggers impiden editar/borrar emisiones o solicitudes, exigen el origen exacto y una solicitud confirmada en la misma transacción. Emitir PDF no asigna otro folio ni modifica guía, stock, reservas, OT o cuenta. Un archivo nuevo perdedor o de una transacción revertida se retira sólo tras comprobar que la base no lo referencia; ante incertidumbre de esa comprobación se conserva para revisión.

### Archivos, recuperación y respaldo

Contrato `AlmacenPdfGuia`, directorio predeterminado `var/guias/pdfs/` o `GUIA_PDF_DIR`, excluido de git. Respaldar **PostgreSQL y esa carpeta juntos**, además del almacén de logos históricos. No purgar emisiones ni versiones anteriores. Al cambiar una plantilla publicada, incrementar `VERSION_PLANTILLA_PDF_GUIA` en `src/config/pdf-guias.ts`. El contrato permite un proveedor futuro conservando claves e historial; no hay integración S3 implementada.

Runtime Node y Chromium de Playwright; `GUIA_CHROMIUM_PATH` permite indicar un ejecutable ya instalado. El render escapa los textos, deshabilita JavaScript y bloquea recursos de red; sólo incorpora el logo local permitido. No se instala Chromium desde un formulario. La aplicación utiliza los mismos requisitos de navegador del módulo PDF de OT.

`/api/guias/pdfs/[emision]` lee los bytes archivados y verifica cabecera PDF, tamaño y SHA-256 antes de devolverlos con `nosniff`, caché privada deshabilitada y nombre saneado. Una referencia inválida o archivo faltante/alterado devuelve error; descargar no regenera historia. Recuperar los bytes originales desde el respaldo coherente y verificar su huella; no sobrescribir con un PDF recién generado. Ante una emisión incierta, reintentar con los mismos datos y UUID; no borrar archivos por intuición ni filas de historial para forzar otra emisión. Los posibles archivos huérfanos requieren contrastar `fileKey` contra las referencias reales antes de retirarlos.

### Validación técnica G5

`tests/guias-documentos.integration.ts` sólo acepta copia local `mtx_validacion_guias_g5_*` y almacén temporal `/tmp/pdfs-validacion-guias-g5-*`. Verifica consulta/historial/filtros, producto/MP/servicio/a medida, PDF de entrega y corrección, cantidades netas, conformidad, escape de texto, archivos inmutables tras cambios de Empresa/bodega, idempotencia, concurrencia de primera emisión, eliminación del archivo perdedor, rechazo de snapshot adulterado, archivo corrupto y rollback al fallar la solicitud. La plantilla se comprueba también con un documento mixto sintético multipágina que no se archiva como hecho de dominio; `pdftotext`/`pdfinfo` verifican texto y paginación. No se atribuye esa prueba de formato a un documento comercial emitido.

En Chromium: detalle, foco inicial y Escape, anchos 320/375/768/1440 sin desborde estable ni errores JS, preparación/previsualización/confirmación de una guía de prueba, emisión y descarga PDF con bytes/cabeceras verificados, referencia inválida y accesos desde OT/OCC. La validación usa la copia descartable y el puerto 3031; el servidor previo del usuario en 3030 se conserva.

Migración aplicada a `mtx_metal_erp` tras respaldo en `backups/20261019_guias_g5/base.dump` (ignorado por git). Las 67 tablas previas de negocio conservaron conteos y huellas; las dos tablas PDF nuevas se crean vacías. No se emitieron guías ni PDF en la base original durante las pruebas. G6 y la aprobación funcional final siguen pendientes.

Comprobación final adicional en Chromium: retorno de foco al enlace de consulta y a los botones de salida/corrección tras revisar, y búsqueda numérica fuera del rango de ID sin error de consulta. Servidor temporal 3031 detenido, copia PostgreSQL G5 y almacén PDF temporal retirados; servidor previo 3030 conservado. Se conserva el respaldo permanente.

Checks finales G5: `pnpm lint`, `pnpm build`, `pnpm prisma validate` y `pnpm prisma generate` correctos; 36 migraciones al día y `migrate diff` sin diferencias. Contenido, rutas y diff revisados. Sin push ni aprobación funcional inferida.


## 17. G6 — Cierre técnico y revisión funcional pendiente (20-10-2026)

Se completó la matriz técnica en cuatro copias PostgreSQL locales descartables, sin emitir guías, alterar stock ni crear fixtures en la base de trabajo. G6 no modifica esquema ni agrega migraciones. La revisión funcional final requiere confirmación explícita del usuario; el último check de G6 permanece pendiente.

### Matriz ejecutada

- `tests/guias-despacho.integration.ts` y `tests/fixtures/guias-despacho.ts`: cuatro modalidades en una OT, producto desde stock y fabricación, entregas parciales/completas, varias guías y dos bodegas; precisión decimal, campos ajenos, cantidades inválidas, fechas/conformidades y OT no elegibles. Verifica saldo igual a Kardex, mínimos intactos, reservas propias, cobertura ajena preservada y ausencia de nuevo consumo de receta.
- Carreras: misma OT con UUID iguales/distintos, folios de OT distintas, dos OT sobre el mismo saldo, guía frente a reversión productiva, ajuste de materia prima, traslado y ajuste de terminado. Se verifican resultados y saldos/reservas bajo bloqueo; las operaciones incompatibles no producen sobreentrega ni saldo negativo.
- Fallos inducidos después de cada una de 11 escrituras de entrega y 11 de corrección: las huellas de 21 tablas relevantes conservan exactamente el estado anterior. Incluye numeración/folio, documento/partidas, reservas, ambos inventarios/Kardex, versión de OT y operación. Las secuencias técnicas pueden dejar huecos; el folio transaccional no se consume al fallar.
- Corrección parcial/completa, límite acumulado, reintento y carrera por la última cantidad corregible. Regresiones completas de `guias-correcciones.integration.ts` y `guias-documentos.integration.ts` en copias independientes: factura/pagos/deuda intactos, reentrega, cierre, historial/PDF, snapshots, inmutabilidad, idempotencia y rollback de archivos.
- `tests/guias-legado.integration.ts`: crea tres guías con estados de pago heredados antes de la migración del contrato de OT, aplica la cadena restante y compara todos sus campos originales. Conserva fechas/promesas/comprobante; no inventa cantidades, folios, deuda, abonos ni PDF retrospectivo. No deshabilita triggers de dominio.
- `tests/guias-despacho.ui.ts`: Chromium contra servidor y fixture de identidad aleatoria verificados antes de escribir. Anchos 320/375/768/1440, foco/Tab/Escape, contraste de textos/acciones consultados, estados inciertos y permisos rotulados como futuros. Intercepta la respuesta después del commit de entrega, PDF y corrección; reintentar conserva UUID y recupera un único resultado. Valida bytes/cabeceras del PDF y conservación del archivo original tras devolver.
- Fechas de Santiago verificadas en días de 23 y 25 horas (06-09-2026 y 04-04-2026), sin desplazamiento fijo.

### Correcciones detectadas durante la validación

La consulta de OT deriva ahora el pendiente de abastecimientos y resultados fabricados descontando la entrega neta de su origen de reserva; la interfaz usa ese pendiente para mostrar cobertura y habilitar completar reservas. Antes comparaba la cantidad original con la reserva restante y podía mostrar una falta después de entregar. No cambia el plan histórico ni duplica cantidades persistidas.

El formulario de salida omite sólo cantidades vacías. Cero y negativos llegan a validación y se rechazan, aun cuando otra partida tenga una cantidad válida; antes podían omitirse silenciosamente. Los enlaces de consulta usan el token informativo existente para cumplir el contraste comprobado sobre sus fondos.

### Operación y comprobaciones finales

[Operación de Guías de Despacho](OPERACION-GUIAS-DESPACHO.md) documenta entrega/corrección, incertidumbre y recuperación, legado, respaldo conjunto de base/PDF/logos y repetición segura de pruebas; incluye la revisión funcional pendiente.

`pnpm lint` y `pnpm build` correctos. `pnpm prisma validate` válido, 36 migraciones al día y `migrate diff` sin diferencias; no se requiere regenerar cliente porque G6 no cambia esquema. Se revisaron migraciones, FK, CHECK y triggers existentes, contenido, rutas y diff. Evidencia local en `backups/20261020_guias_g6/` (ignorada por git).

Se retiraron las cuatro copias de prueba, sus almacenes PDF, archivos auxiliares y dump temporal. El servidor propio de validación se detuvo; puertos 3030 y 3031 libres al terminar. No se realizó push. **Sólo falta que el usuario revise el flujo y apruebe expresamente el cierre funcional.**


## 18. Aprobación funcional y seguimiento (20-10-2026)

El usuario aprueba el resultado general: «Quedó bien». Se registra el cierre funcional de G0–G6 a partir de esta aprobación explícita, sin atribuirle ejecuciones individuales de la matriz técnica.

El usuario observa que algunas funcionalidades son difíciles de identificar y que el sistema debe facilitar su uso para personas con distintos niveles de experiencia. Queda pendiente como trabajo posterior:

- [ ] Preparar un manual de usuario completo del ERP, orientado a tareas, con ejemplos, capturas y resolución de dudas frecuentes. El documento operativo actual no cubre ese alcance.
- [ ] Revisar la visibilidad de acciones, nombres, ayudas contextuales y mensajes que expliquen requisitos o bloqueos y el siguiente paso posible.
- [ ] Validar los recorridos principales con usuarios de distintos niveles de experiencia y ajustar la interfaz según las dificultades observadas.

Estas mejoras quedan registradas; no se presentan como implementadas ni se modifica la interfaz en este cierre documental.
