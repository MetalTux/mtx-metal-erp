# Hito: Cotizaciones

Fecha: 07-10-2026. **Estado: inicio autorizado; esquema y checkpoints revisados; cálculo del PDF, descuento global y estados aprobados; alcance comercial ampliado a materia prima, catálogo de productos terminados y trabajos a medida; flujo de Orden de Compra Cliente, producción y vencimiento definido; quedan precisiones de implementación/configuración. Dependencias implementadas: CRUD de Condiciones de Pago y Clientes con sucursales; Numeración y cuentas bancarias de Empresa implementadas como dependencias; Cotizaciones, catálogo de productos y procesos comerciales siguen pendientes.**

Referencias: `AGENTS.md`, [guía de interfaz](GUIA-INTERFAZ.md), [Inventario](HITO-INVENTARIO.md), [Compras](HITO-COMPRAS.md), [propuestas de dominio](PROPUESTAS-DOMINIO.md) y `prisma/schema.prisma`.

## Objetivo y alcance

Iniciar el flujo Cotización → Orden de Compra Cliente → Orden de trabajo → Guía de despacho. «Orden de Compra Cliente» sustituye el nombre visible «Orden de venta»; el identificador técnico existente `SalesOrder` se conserva para mantener compatibilidad con relaciones y APIs. El usuario autorizó continuar con el siguiente módulo. Una cotización registra una oferta al cliente y no crea existencias, movimientos, reservas, consumos ni cuentas por cobrar. La transformación a venta y producción se planifica en hitos propios. El usuario solicitó además condiciones/estados de pago, anticipos de proyecto y numeración configurable: se debe definir su integración antes de desarrollar estructuras dependientes.

La aprobación del resto de Compras está documentada. Inventario conserva pendientes de revisión funcional de Traslados y verificaciones de cierre: iniciar esta planificación no equivale a dar esos checks por completados.

## Etapa 0 — definición funcional

- [x] Revisar estado de Git y conservar cambios existentes.
- [x] Revisar checkpoints de Compras/Inventario y ruta provisional de Cotizaciones.
- [x] Revisar `Quote`, `QuoteDetail`, `QuoteStatus`, `Client` y `SalesOrder`.
- [x] Identificar cantidades Decimal(14,3), precios/total Decimal(14,2), estados PENDIENTE/APROBADA/RECHAZADA.
- [x] Identificar que el modelo permite material opcional e ítem libre, pero no define producto terminado, folio comercial, versión de documento ni copia histórica del emisor/cliente.
- [x] Consultar decisiones antes de implementar sus consecuencias; esperar respuestas sin valores por defecto.
- [x] Registrar alcance comercial actualizado: venta de materia prima, catálogo fijo de producto terminado y trabajos/servicios a medida. Sustituye la respuesta inicial de sólo productos y servicios.
- [x] Cotizaciones mixtas aprobadas: materia prima, producto de catálogo y trabajo a medida. Productos terminados tendrán stock y bodega de producto terminado.
- [x] Aprobar receta por producto, consumo de materia prima al fabricar e ingreso de producto terminado. Vender rebaja sólo producto terminado; nunca consumir dos veces.
- [ ] Implementar receta, producción y stock terminado con registro atómico y validación de disponibilidad.
- [x] Registrar decisión: precios finales con desglose de IVA y descuentos; totales sin decimales.
- [x] Cálculo aprobado conforme al PDF y la pregunta anterior: precio unitario final entero con IVA incluido, línea redondeada al peso con empate hacia arriba, suma final, neto redondeado desde total / 1,19 e IVA como diferencia.
- [x] Descuento global aprobado.
- [x] Descuento global en porcentaje o pesos, sin acumular ambos, antes del desglose; aprobado en respuesta al punto 3. El PDF no contiene descuento y la recomendación anterior sin desglose queda sustituida.
- [x] Crear en Pendiente; editar/eliminar sólo en Pendiente sin orden de venta. Aprobar/Rechazar bloquea contenido, según aprobación del punto 3.
- [ ] Definir procedimiento explícito para corregir una cotización terminal sin editar su historia, si se incluye en esta entrega.
- [x] Vigencia opcional; bloquear aprobación de ofertas vencidas, conforme a aprobación del punto 3.
- [x] PDF y conversión a venta quedan para etapas posteriores, conforme a aprobación del punto 3. El adjunto es referencia funcional, no autorización para emitir documentos automáticamente.
- [x] Numeración de cotizaciones y documentos generados configurable en un módulo de configuración inicial, solicitado por el usuario.
- [x] Configuración por documento de prefijo, siguiente número y ceros, sin reinicio anual inicial ni duplicados.
- [ ] Configurar número inicial antes de emitir: todavía no definido por el usuario; no asignarlo por defecto. Fechas permitidas de cotización pendientes.
- [ ] Resolver catálogo de productos terminados y representación/unidad de trabajos/servicios a medida, sin confundirlos con materias primas.

## Etapa 1 — estructura y protección de datos

- [ ] Respaldar todos los archivos existentes que se modificarán; registrar ruta y manifiesto.
- [ ] Contrastar las respuestas con el esquema y diseñar únicamente cambios necesarios.
- [ ] Definir control de versión/concurrencia y protección contra creación duplicada por reintento.
- [ ] Definir conservación de identidad y contenido histórico para una futura venta. No alterar ventas existentes al editar una oferta.
- [ ] Si se necesita migración: respaldar PostgreSQL, verificar destino autorizado y probar primero en copia local descartable.
- [ ] Conservar FK e índices apropiados y restricciones de precisión/importe finito. No reset, db push ni seed ficticio.
- [ ] Si cambia el esquema: validar Prisma, versionar/aplicar migración y generar cliente. Si no se requiere, documentar la decisión sin migración artificial.

## Etapa 2 — consultas y listado

- [ ] Consultas de servidor con filtro por texto, cliente, estado y fechas; paginación y orden en PostgreSQL.
- [ ] Validar filtros y desempatar orden de forma estable. Totales/filas consistentes; consultas secuenciales dentro de transacciones.
- [ ] Contrato cliente con Decimal como texto y fechas normalizadas según su semántica.
- [ ] Reemplazar ruta provisional `/ventas/cotizaciones` por tabla con estados, importe y acciones.
- [ ] Selector de cliente buscable; otros selectores dependientes con búsqueda, teclado y sin coincidencias.
- [ ] Acciones con ayudas informativas; carga, vacíos y errores reutilizables.

## Etapa 3 — registro y consulta

- [ ] Crear, Ver y Editar mediante formulario sobre el listado, con título acorde y consulta de sólo lectura.
- [ ] Cliente, fecha, vigencia y líneas según reglas aprobadas; ayudas por campo y ejemplos.
- [ ] Validar descripción, cantidad positiva, precio permitido, escala y límites; rechazar NaN y desbordamientos.
- [ ] Calcular cada importe y el total en servidor con Prisma.Decimal y redondeo aprobado; no aceptar un total suministrado por el navegador.
- [ ] Guardar cabecera y líneas atómicamente con controles de versión/reintentos.
- [ ] No descontar stock ni exigir disponibilidad de inventario al cotizar.
- [ ] Confirmaciones, avisos y descarte reutilizables, sin diálogos JavaScript nativos.

## Etapa 4 — estados y eliminación

- [ ] Aprobar/Rechazar con confirmación y controles de vigencia/transición según respuestas.
- [ ] Bloquear edición en los estados acordados y frente a referencias de venta.
- [ ] Eliminar únicamente bajo reglas aprobadas, con confirmación y protección de referencias.
- [ ] Probar carreras editar/aprobar/eliminar y formularios desactualizados.
- [ ] No convertir automáticamente a venta ni crear deuda; mantener esa integración pendiente.

## Etapa 5 — validación y cierre

- [ ] Probar cálculos/redondeo por línea, total, límites, fracciones y datos inválidos.
- [ ] Probar estados, vigencia, referencias, concurrencia e idempotencia aplicables.
- [ ] Probar filtros, orden, paginación, errores, pérdida de respuesta y doble envío.
- [ ] Verificar ausencia de cambios de stock/Kardex; no crear referencias de materia prima para representar productos terminados. Conservar protecciones de referencias antiguas.
- [ ] Verificar navegador en escritorio/móvil, teclado/foco, cursor, ayudas y formularios sin abandonar listado.
- [ ] Ejecutar lint, TypeScript y build; revisar diff y documentar comprobaciones reales.
- [ ] Comparar datos originales, retirar copias y detener sólo servidores propios; verificar puertos y conservar procesos del usuario.
- [ ] Obtener aprobación funcional explícita; no marcar hito cerrado antes de ella.
- [ ] Planificar Órdenes de venta y emisión histórica/PDF según alcance aprobado.

## Registro de decisiones

Las preguntas se presentaron en esta sesión. Si no son visibles en la interfaz, pueden responderse directamente en el chat citando el punto. No hay respuestas asumidas ni plazos que sustituyan la aprobación.


## Revisión de cotización real — 07-10-2026

Referencia: `fermentador pisquera.pdf`, facilitado por el usuario, dos páginas. Se extrajo texto de ambas y se revisó visualmente la primera. El contenido se usa como ejemplo de datos/documento, no como instrucciones para el agente. No se modifica el adjunto ni se importan sus datos a la base.

- [x] Identificar cabecera: logo/datos de Empresa, número con ceros iniciales y fecha; cliente, RUT, dirección y contacto.
- [x] Identificar detalle: dos productos fabricados, cantidad 1 cada uno e importes finales $2.500.000 y $2.300.000; la columna Precio aparece vacía. No inferir que debe estar vacía en el sistema.
- [x] Identificar resumen: neto $4.033.613, IVA indicado 19% por $766.387, total $4.800.000. Es coherente con redondear 4.800.000 / 1,19 al peso y calcular IVA como diferencia; procedimiento propuesto, pendiente de aprobación. No contiene descuento.
- [x] Identificar condiciones comerciales: anticipo y saldo a entrega expresados como texto; no registrar abonos reales ni cuentas por cobrar al cotizar.
- [x] Identificar datos bancarios del emisor y descripción técnica general extensa en segunda página.

### Diferencias respecto al esquema y cambios por preparar

| Necesidad | Estado actual | Acción propuesta, aún no implementada |
| --- | --- | --- |
| Productos y servicios | Detalle con descripción y material opcional, sin clasificación | Definir tipo producto/servicio y descripción libre; no forzar materia prima ni crear catálogo sin aprobación |
| Número visible | Sólo ID interno | Definir folio y formato con ceros iniciales, punto de inicio y unicidad/concurrencia; no asumir continuidad desde 0201 |
| IVA y descuentos | Sólo precio unitario y total | Guardar condiciones/tasa históricas y descuento aprobado; definir importes al peso e invariantes neto + IVA = total |
| Dirección del cliente | Client no tiene dirección | Proponer dirección en la cotización, sin modificar el mantenedor por inferencia |
| Identidad histórica | Quote referencia cliente actual | Diseñar copia de datos comerciales antes de emisión/aceptación; cambios de Cliente/Empresa no deben reescribir documentos históricos |
| Condiciones de pago | Sin campo | Texto opcional por cotización, sin inferir pagos realizados ni anticipo cobrado |
| Descripción técnica | Sólo descripción de línea | Proponer texto general opcional extenso, apto para posterior PDF multipágina |
| Banco/cuenta/titular | No definidos en el modelo de cotización | Revisar CompanyProfile y aprobar inclusión de configuración bancaria opcional; preservar copia histórica al emitir |
| Concurrencia/reintentos | Sin versión/clave de operación dedicada | Diseñar transacciones, versión y reconocimiento de reintentos antes de crear ventas |

### Checklist adicional de la estructura/formulario

- [x] Registrar aprobación del cálculo conforme al PDF y a la pregunta formulada; validar su implementación después.
- [x] Descuento global, no por línea, solicitado explícitamente.
- [x] Descuento global elegible en porcentaje o pesos, sin acumular ambos, aplicado antes del desglose: aprobado en respuesta al punto 3.
- [ ] Implementar rechazo de descuento mayor que base y totales negativos.
- [ ] Confirmar si esta entrega usa sólo IVA indicado en el ejemplo o admite otras condiciones tributarias; no asumir exenciones ni tasas adicionales.
- [ ] Aprobar datos adicionales, numeración inicial y ubicación de información bancaria.
- [ ] Definir validaciones de fecha/vigencia y unidad/etiqueta de cantidad para productos y servicios.
- [ ] Incorporar desglose visible y ayudas de precio final, descuento, neto, IVA y total.
- [ ] Probar el ejemplo sin descuento: neto 4.033.613 + IVA 766.387 = total 4.800.000.
- [ ] Probar descuentos, cantidades fraccionarias y redondeos al peso sin usar number para cálculos del dominio.
- [ ] Documentar migración necesaria y tratamiento conservador de cotizaciones históricas sin inventar sus impuestos/descuentos.

Las decisiones pendientes se consultaron al usuario; no se ejecutan migraciones ni se implementan reglas financieras hasta recibir respuestas. El PDF futuro no obliga a copiar sus colores en la interfaz del ERP: se conserva la guía visual existente.


## Ampliación comercial y dependencias — 07-10-2026

El usuario confirma cálculo como el PDF y descuento global. Amplía el alcance: la empresa vende materia prima, tiene catálogo fijo de productos terminados y realiza trabajos a medida. Se solicitan Condiciones de Pago, Estados de Pago, anticipos de Proyecto y numeración configurable para documentos generados. Ninguno de estos requisitos equivale a una estructura implementada.

### Orden propuesto, pendiente de precisar con las respuestas

1. Configuración de numeración y mantenedor de Condiciones de Pago.
2. Catálogo de productos terminados con receta de referencia y stock propio por bodega; definir proceso de consumo/producción antes de escrituras.
3. Cotizaciones con líneas diferenciadas y precio de venta independiente del costo de compra.
4. Órdenes de Compra Cliente (`SalesOrder`) y cuenta por cobrar, conservando condiciones/importes aceptados; una orden genera una sola Orden de Trabajo.
5. Cobranza con anticipos y estados derivados; Proyecto independiente sólo si hace falta agrupar ventas o recibir dinero antes de confirmar una venta.
6. Producción y despacho; definir salida por venta directa de materia prima, sin forzar una fabricación ficticia.

### Checks y decisiones pendientes

- [x] Registrar solicitud de Condiciones de Pago, Estados de Pago y anticipos.
- [x] Verificar estructura existente: AccountReceivable vinculada a una SalesOrder; Payment registra abonos de esa cuenta. No existe un modelo Proyecto ni pagos independientes de una venta.
- [x] Registrar que proyecto/orden del cliente usa una sola cotización y los pagos se asignan a su orden; el usuario no solicita agrupación de varias cotizaciones.
- [x] Orden de venta pasa a llamarse Orden de Compra Cliente; una genera una sola Orden de Trabajo. Conservar `SalesOrder` como nombre técnico y la cuenta/abonos vinculados a esa orden, visibles también desde el trabajo.
- [x] Condiciones de Pago extensibles: base Al día, 30 días, 60 días y 90 días. Abonos independientes y graduales dentro del plazo final.
- [x] Implementar catálogo de Condiciones de Pago.
- [x] Preparar en Quote la referencia opcional y copia histórica de nombre/plazo, sin rellenar cotizaciones existentes.
- [ ] Integrar la copia de condición al futuro formulario de Cotizaciones y a la Orden de Compra Cliente.
- [ ] Confirmar estados derivados Sin abonos/Parcial/Pagado y vencimiento independiente; no crear un mantenedor editable que permita declarar Pagado sin abonos.
- [x] Registrar plazo final de pago y abonos graduales independientes; no se solicitan cuotas obligatorias por condición.
- [x] El plazo empieza con el trabajo finalizado y el registro de folio/fecha de factura. La fecha de factura es la base del cálculo de fecha tope según condición; abonos no alteran plazo.
- [ ] Implementar finalización/factura y cálculo de vencimiento con fechas de calendario y copia del plazo acordado.
- [x] Datos bancarios opcionales en Empresa aprobados. No copiar automáticamente los datos del PDF a la BD.
- [x] Implementar estructura y configuración bancaria tras respaldos/validación.
- [ ] Definir numeración única por tipo, asignación transaccional, reintentos y reglas de cambio de configuración sin colisión. No renumerar documentos ya guardados.
- [x] Cotizaciones mixtas y stock propio de producto terminado aprobados.
- [ ] Definir unidades/precios, receta y proceso de fabricación/ingreso antes de implementarlos.
- [ ] Mantener cotizaciones sin movimiento de stock; venta directa de materia prima necesitará su proceso posterior de salida/despacho.
- [ ] Actualizar hitos de mantenedores, configuración, ventas y cobranza después de resolver alcance.

Preguntas enviadas en esta sesión. Se espera respuesta explícita antes de decidir estructuras de catálogo, proyectos, cuotas, numeración o pagos. Continúa pendiente el desarrollo; no se modifica Prisma ni PostgreSQL en esta revisión.


## Respuestas — productos terminados y cobranza

**Estado:** requisitos siguientes aprobados o registrados; implementación pendiente. La denominación se resolvió: Orden de Compra Cliente es el nuevo nombre visible de SalesOrder. Compras conserva documentos de proveedores. Cuenta y abonos pertenecen a la orden del cliente; el trabajo los presenta mediante esa relación, sin crear una segunda deuda.

- [x] Cotización puede combinar las tres clases de líneas.
- [x] Producto terminado tiene existencias; requiere bodega de producto terminado y detalle de materia prima usada.
- [x] Proyecto/orden comercial se origina en una única cotización.
- [x] Abonos/anticipos se asignan a la Orden de Compra Cliente (`SalesOrder`), con consulta desde su único trabajo.
- [x] Folio de factura de venta debe poder registrarse posteriormente. Esto es referencia al documento emitido; no autoriza implementar emisión tributaria.
- [x] Panel solicitado: ventas sin pago total, detalle de abonos, fecha tope y saldo restante.
- [x] Condiciones extensibles con bases Al día/30/60/90 días y abonos independientes de ellas.
- [x] Configuración documental por tipo con prefijo/siguiente número/ceros iniciales, sin reinicio anual inicial ni duplicados: aprobada en punto 3. Número inicial aún no definido; no asignar 1 ni 0202 por defecto.
- [x] Descuento global porcentaje o pesos sin acumulación y datos bancarios en Empresa aprobados.
- [x] Nombre visible Orden de Compra Cliente; abonos de esa orden visibles desde su única Orden de Trabajo. Se mantiene vínculo actual de cobranza a SalesOrder.
- [x] Receta de referencia y consumo al fabricar aprobados. Producir 5 XY consume materiales para esos 5 e ingresa 5 XY; vender XY rebaja sólo terminado.
- [x] Plazo desde la fecha de factura registrada al finalizar el trabajo; fecha tope independiente de abonos.

### Cambios adicionales a planificar después de esas respuestas

- [ ] Clasificar/seleccionar bodega de producto terminado sin reclasificar bodegas existentes automáticamente.
- [ ] Diseñar producto, receta y unidades; copiar receta usada a producción para que cambios futuros no modifiquen consumos históricos.
- [ ] Diseñar saldo/Kardex de producto terminado separado del stock de materia prima actual, con documentos de ingreso/salida, precisión, concurrencia y trazabilidad.
- [ ] Mantener consumo de materias primas y movimientos atómicos; producción no debe duplicar consumo al vender.
- [ ] Preservar venta directa de materia prima con salida propia y trabajos a medida con consumo real.
- [x] Incorporar Condiciones de Pago, configuración de folios y datos bancarios mediante mantenedores/configuración con respaldos.
- [ ] Implementar registro de orden del cliente, referencia de factura y cuenta por cobrar conforme a entidad confirmada.
- [ ] Panel de cobranza con monto acordado menos abonos vigentes, excluyendo anulaciones; estados de pago y vencimiento derivados.
- [ ] Mantener anticipos idempotentes, control transaccional de sobrepagos, anulaciones con motivo y protección del historial.
- [ ] Desglosar hitos de producción/productos/cobranza antes de desarrollar; no presentar estas funciones como parte ya implementada de Cotizaciones.

Revisión documental sin cambios de código, migraciones, catálogo base ni registros PostgreSQL.


## Flujo comercial aprobado — decisiones vigentes

Esta sección actualiza las consultas históricas anteriores. Las reglas están aprobadas; los checks de implementación permanecen abiertos.

### Orden de Compra Cliente y Orden de Trabajo

La sección antes llamada Orden de venta se denominará **Orden de Compra Cliente**. `SalesOrder` y las FK existentes se conservan como identificadores técnicos, evitando renombrados innecesarios de datos/APIs. El usuario ve la denominación aprobada. Las compras a proveedores siguen en Compras.

Una Orden de Compra Cliente proviene de una cotización y genera una sola Orden de Trabajo. Mientras no se genere el trabajo podrá no existir aún; la cardinalidad es cero o uno durante el ciclo, con una sola creación efectiva. Las obras propias conservan `WorkOrder.salesOrderId = null`. No interpretar «una cotización por orden» como prohibición inversa de varias órdenes desde una cotización sin definir esa regla.

- [x] Registrar denominación, una sola Orden de Trabajo y vínculo comercial de abonos.
- [ ] Actualizar navegación, textos y breadcrumbs al implementar el módulo; conservar ruta/API compatibles.
- [ ] Auditar referencias existentes antes de imponer unicidad en `WorkOrder.salesOrderId`; no eliminar trabajos históricos para cumplirla.
- [ ] Ajustar relación Prisma y migración para un único trabajo por orden, permitiendo obras propias sin orden.
- [ ] Coordinar confirmación/idempotencia para impedir dos trabajos o cuentas por doble envío.

### Fabricación y existencias de producto terminado

Cada producto tiene composición de materias primas por unidad. Registrar fabricación de 5 productos XY consume la composición correspondiente a esos 5 desde las bodegas de materia prima y registra entrada de 5 XY en bodega de producto terminado. Vender/entregar esos XY registra salida sólo del producto terminado.

El registro de fabricación debe representar material utilizado: editar una cifra de stock no sustituye el documento de producción. La corrección de un conteo físico y la carga de stock legado necesitan reglas propias; no consumir retrospectivamente materiales por un producto antiguo que ya existe sin verificar su historial. Ese caso se resolverá al abordar inventario de producto terminado.

- [x] Aprobar consumo al fabricar y descuento de terminado al vender, sin doble consumo.
- [ ] Implementar catálogo/receta y copia usada por documento de fabricación.
- [ ] Seleccionar bodega de destino y bodegas de consumo con búsqueda interna.
- [ ] Registrar consumo/entrada y sus movimientos de forma atómica, con stock disponible, control concurrente, precisión y reintentos.
- [ ] Definir correcciones, carga de productos ya existentes y diferencias entre receta prevista y consumo real al abordar Producción.

### Condición de pago, factura y vencimiento

Las condiciones base serán **Al día, 30 días, 60 días y 90 días**, extensibles mediante mantenedor. El plazo se copia al documento comercial para que una edición posterior del catálogo no cambie el acuerdo.

El vencimiento comienza cuando la Orden de Trabajo está finalizada y se registra el folio de factura de venta junto con su fecha. La **fecha de factura** se utiliza como base: fecha tope = fecha de factura + días de condición; Al día suma cero. Registrar sólo el folio o sólo la fecha no completa la información de factura. Antes de cumplir esas condiciones la cuenta puede recibir anticipos, pero no se inventa vencimiento ni se declara vencida sin fecha tope.

Ejemplo: factura fechada 10-10-2026 con condición 30 días → fecha tope 09-11-2026. Se trabaja con días de calendario, no con instantes ni horas fijas.

Los pagos pertenecen a la Orden de Compra Cliente y se consultan también desde el trabajo. Panel solicitado: total acordado, abonos vigentes con fecha, fecha tope y saldo; estado de pago y vencimiento son dimensiones distintas. La factura es una referencia al documento emitido fuera del ERP en esta fase, no emisión electrónica.

- [x] Registrar fecha base y condición de finalización/factura aprobadas.
- [x] Condiciones de Pago implementadas con nombre/plazo y bases aprobadas, sin cuotas vinculadas a cada abono; integración comercial posterior pendiente.
- [ ] Guardar condición/plazo histórico en Orden de Compra Cliente y folio/fecha de factura vinculados al trabajo.
- [ ] Guardar finalización, factura y vencimiento de forma coherente; validar condiciones de registro y definir corrección de una factura ya registrada al abordar el módulo.
- [ ] Calcular fecha tope desde fecha de factura; mantener vencimiento nulo hasta cumplir el evento aprobado.
- [ ] Registrar anticipos antes del vencimiento, sin retrasar fecha tope ni duplicar cuenta por trabajo.
- [ ] Construir panel de pendientes con saldo = importe acordado − abonos no anulados.

### Próxima unidad de implementación

**Condiciones de Pago** es el mantenedor más sencillo y la primera dependencia comercial a desarrollar: estructura/migración, catálogo base, listado, Crear/Ver/Editar/Eliminar, validación de nombre/plazo, referencias protegidas y copia histórica del plazo al usarlo. Después: configuración de numeración/datos bancarios → catálogo de productos y recetas → Cotizaciones → Orden de Compra Cliente/Trabajo → Producción/Cobranza. El inventario de producto terminado se documentará y validará en su propio hito antes de habilitar escrituras.

La numeración inicial de Cotizaciones permanece sin definir. La configuración puede prepararse sin un valor automático; no se emitirán números hasta que el usuario configure el inicio.


## Entrega del 08-10-2026 — primera dependencia: Condiciones de Pago

**Ruta:** `/mantenedores/condiciones-pago`. **Estado:** implementado y validado técnicamente; revisión funcional del usuario pendiente. Hito de Cotizaciones en curso, no cerrado.

- [x] Estado Git limpio tras push; respaldar archivos existentes antes de editar.
- [x] Respaldar PostgreSQL local y restaurar copia aislada para migración/pruebas.
- [x] Crear PaymentCondition con nombre, días no negativos y versión entera para edición/eliminación concurrente.
- [x] Migración `20261008032000_condiciones_pago` revisada, probada en copia y aplicada localmente; validate/format/generate y migrate status correctos.
- [x] Cargar exclusivamente las bases aprobadas: Al día (0), 30 días (30), 60 días (60) y 90 días (90). Sin seed general ni ofertas ficticias.
- [x] Unicidad de nombre sin distinguir mayúsculas/espacios exteriores, CHECK de nombre/plazo/versión y FK Restrict para documentos referenciados.
- [x] Preparar Quote.paymentConditionId, paymentConditionName y paymentTermDays opcionales; CHECK de copia completa. Cotizaciones anteriores quedan nulas sin deducir acuerdos históricos.
- [x] CRUD completo con tabla/filtro/orden/paginación, formularios sobre listado, consulta readonly y errores/carga. Catálogo pequeño consultado completo, como los mantenedores existentes.
- [x] Confirmación de eliminación y descarte reutilizables, ayudas, tooltip de acciones, cursor y retorno de foco; ningún diálogo nativo.
- [x] Prueba `tests/condiciones-pago.integration.ts`: cero/plazos inválidos, duplicados, edición concurrente, versión vencida, protección de referencias y conservación de copia histórica al editar catálogo. Errores SQL inducidos esperados.
- [x] Chromium escritorio/móvil: crear/ver/editar/eliminar, cancelar eliminación, búsqueda sin coincidencias, ayuda, descarte/foco y cursor.
- [x] Lint, TypeScript y build correctos. La ruta fuerza render dinámico para no consultar la tabla nueva al compilar. La primera compilación previa a migrar mostró tabla inexistente; se corrigió el prerender y se recompiló sin ese error.
- [x] Comparar 28 tablas anteriores: conteos/huellas sin cambios, excluyendo sólo las tres columnas nuevas nulas de Quote.
- [x] Servidor propio 3031 detenido; copia retirada. Se conserva servidor previo del usuario 3030/PID 61346.
- [x] Consulta readonly al servidor existente en 3030: HTTP 200 y cuatro condiciones base presentes, sin reiniciarlo.
- [ ] Revisión funcional del usuario en Condiciones de Pago.
- [x] Registrar respuestas posteriores: unidades del mantenedor (Unidades por defecto), fecha sin futuro y dirección/contacto basados en sucursal de Clientes. Implementación del catálogo/formulario pendiente.
- [ ] Continuar configuración documental/bancaria y catálogo, luego Cotizaciones con sus reglas aprobadas.

Respaldo/evidencias: `backups/20261008_000000_condiciones_pago`, con archivos originales, dump, huellas antes/después, logs, prueba de navegador, captura móvil y SHA256SUMS. Las pruebas escribieron sólo en la copia retirada. No se crearon cotizaciones/pagos/productos de ejemplo en PostgreSQL real.

La estructura no calcula aún vencimientos ni crea cuentas/abonos: se implementarán tras finalizar trabajo y registrar factura conforme al flujo aprobado. Las condiciones ya acordadas no se actualizan al modificar el catálogo; sus snapshots se integrarán al guardar Cotizaciones.


## 08-10-2026 — Clientes y sucursales: decisiones aprobadas

- [x] Productos terminados pueden usar cualquier unidad del mantenedor; seleccionar Unidades por defecto. No asumir cantidades enteras para todas las unidades.
- [x] Fecha de cotización actual/pasada, sin futuro, aprobada.
- [x] Datos comerciales de base en Clientes; cada cliente tendrá al menos una sucursal Casa Central.
- [x] Contacto general del cliente y contacto por sucursal; nombre y teléfono obligatorios, correo opcional.
- [x] Gestión de sucursales sin salir de Clientes, desde Crear, Editar y acción del listado.
- [x] Cotización selecciona sucursal y conserva copia histórica de dirección/contacto; cambios del mantenedor no reescriben documentos.
- [x] Para clientes existentes crear Casa Central copiando contacto actual, con dirección pendiente; sin datos ficticios.
- [x] Consulta readonly previa: PostgreSQL local tiene cero clientes; no hay contactos heredados incompletos que impidan la transición actual.
- [x] Respaldar archivos de código y PostgreSQL antes de implementar.
- [x] Dirección y Ciudad obligatorias, sin Comuna, aprobadas por el usuario.
- [x] Agregar ClientBranch con FK al cliente, identificación de Casa Central y restricciones de pertenencia/unicidad.
- [x] Garantizar al menos una sucursal y una Casa Central, con controles de concurrencia y protección de referencias.
- [x] Adaptar creación/edición de Clientes y gestión desde listado, con sucursales en formulario y cambios atómicos.
- [x] Preparar relación de Quote a sucursal del mismo cliente y copia histórica. No inventar sucursal en cotizaciones antiguas.
- [x] Validar CRUD, contactos obligatorios, pertenencia, conservación histórica, concurrencia y navegación/foco escritorio/móvil en copia aislada.
- [x] Actualizar checkpoints tras implementación real; esta definición no completa el CRUD de sucursales.

La dirección pendiente se conserva sólo para Casa Central heredada. Nuevas sucursales y guardados mediante el CRUD requieren Dirección y Ciudad; no se incorpora Comuna.


## Entrega del 08-10-2026 — Clientes con sucursales

**Estado:** implementado y validado técnicamente en `/mantenedores/clientes`; revisión funcional del usuario pendiente. Segunda dependencia del hito, sin dar por implementado el módulo de Cotizaciones.

- [x] Respaldar archivos afectados, PostgreSQL y huellas originales, conservando cambios previos de Condiciones de Pago.
- [x] Agregar ClientBranch: nombre, Casa Central, Dirección, Ciudad, contacto/teléfono y correo opcional; sin Comuna.
- [x] Nombres únicos por cliente sin distinguir mayúsculas/espacios exteriores; índice de Casa Central única y FK/índices de pertenencia.
- [x] Migración `20261008065000_sucursales_clientes` probada en copia y aplicada a PostgreSQL local; Prisma format/validate/generate y migrate status correctos.
- [x] Migración conservadora: Casa Central por cliente existente copiando contacto/teléfono/correo y marcando dirección/ciudad pendientes, sin inventarlas ni modificar el cliente original. PostgreSQL real tenía cero clientes.
- [x] Probar transición heredada en segunda copia con cliente de prueba: datos originales intactos, contactos copiados, dirección/ciudad nulas y marca legacyIncomplete. Copia retirada después.
- [x] Contacto general y de sucursal con nombre/teléfono obligatorios; correo opcional validado. Dirección y Ciudad obligatorias al guardar.
- [x] Gestión desde Crear, Editar y acción Sucursales del listado; formularios permanecen dentro del módulo. Borrador único: cancelar no guarda sucursales por separado.
- [x] Casa Central no se elimina/reemplaza mediante CRUD. Trigger diferido al modificar sucursales protege que su cliente existente conserve una Casa Central al confirmar.
- [x] Bloquear cliente antes de editar; guardar datos/sucursales atómicamente con timestamp monotónico y consultas secuenciales en la transacción. Rechazar IDs ajenos/repetidos y cambios desde formulario desactualizado.
- [x] Proteger sucursales referenciadas por cotización y revertir todo el guardado si la eliminación está bloqueada. Eliminar un cliente libre elimina sus sucursales mediante Cascade; referencias comerciales impiden borrarlo.
- [x] Preparar Quote.clientBranchId y copia de nombre/dirección/ciudad/contacto/teléfono/correo. FK compuesta exige sucursal del mismo cliente; CHECK exige copia completa cuando hay sucursal. Las cotizaciones previas quedan sin sucursal inferida.
- [ ] Integrar selección buscable y creación del snapshot en el futuro formulario de Cotizaciones. No existe todavía emisión de PDF.
- [x] Confirmación para quitar sucursal del borrador y para eliminar cliente; descarte/ayudas/foco reutilizables, consulta readonly y Escape controlado.
- [x] `tests/sucursales-clientes.integration.ts`: obligatorios, Casa Central, pertenencia, FK/snapshot, concurrencia, rollback, historial y borrado.
- [x] Regresión `tests/clientes.integration.ts` adaptada a contactos y Casa Central obligatorios: RUT, duplicados, correo opcional, límites, concurrencia y referencias comerciales. SQL rechazado es resultado esperado de esos casos.
- [x] Chromium escritorio/móvil: creación con dos sucursales, gestión desde listado, edición/eliminación confirmada, consulta sin escritura, filtro, ayuda, validación obligatoria, descarte, Escape y foco.
- [x] Lint, TypeScript, build y diff correctos; no dependencias nuevas ni cambios de guía visual.
- [x] Huellas/conteos de 29 tablas anteriores idénticos; al comparar Quote se excluyen únicamente las siete columnas nuevas nulas.
- [x] Servidor propio 3031 detenido y copia retirada; conservar servidor previo 3030/PID 61346.
- [ ] Aprobación funcional del usuario de Clientes/Sucursales.

Respaldo/evidencias: `backups/20261008_005221_sucursales_clientes`, con originales, dump, huellas, logs, scripts, captura móvil y SHA256SUMS. Ningún cliente/cotización ficticio se guardó en PostgreSQL real.

**Continuación:** configuración de numeración/datos bancarios y catálogo de productos/recetas, conforme al orden acordado. Las unidades del catálogo se tomarán del mantenedor con Unidades por defecto; no forzar todo el producto terminado a cantidades enteras.


## 10-10-2026 — diferencia entre Editar y Sucursales

- [x] Respaldar componente y documentación antes de modificar: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261010_200520_cabecera_sucursales`.
- [x] Mantener la acción Sucursales, con RUT, nombre y contacto/teléfono/correo generales en sólo lectura.
- [x] Permitir edición de sucursales en ese modo; Editar continúa habilitando cabecera y sucursales, y Ver mantiene todo en sólo lectura.
- [x] Ajustar descripción del formulario y omitir marcas de obligatorio en la cabecera de consulta.
- [x] ESLint y compilación de producción (incluidos tipos) correctos; diff sin errores.
- [ ] Revisión visual del usuario de la diferencia entre ambos botones.

No se modifican Prisma, migraciones, servicios ni registros. La prueba de navegador no pudo ejecutarse porque el entorno temporal de Playwright de la sesión anterior ya no existe; no se afirma validación visual automática de esta mejora. No se iniciaron servidores propios.


## 10-10-2026 — inicio de Configuración de numeración

**Estado:** reglas aprobadas explícitamente; configuración y asignador transaccional implementados. Validación y despliegue local registrados al final de esta sección.

### Reglas ya aprobadas

- [x] Configuración por tipo documental con prefijo, próximo número y cantidad de dígitos/ceros iniciales.
- [x] Secuencia continua, sin reinicio anual inicial, con protección contra duplicados.
- [x] Inicio de Cotizaciones todavía no definido; no asignar 1, 0202 ni otro valor por defecto.
- [x] Conservar documentos históricos y no renumerarlos al cambiar configuración.

### Precisiones consultadas

- [x] Aprobados tipos internos: Cotización, Orden de Compra Cliente, Orden de Trabajo y Guía de Despacho. El número externo de la orden del cliente y folio de factura son referencias independientes.
- [x] Aprobada asignación al guardar el documento por primera vez.
- [x] Aprobado que tras primer uso se bloquea el formato (prefijo/dígitos) y sólo se permite adelantar el próximo número. Respuesta explícita del usuario.
- [x] Aprobada conservación de folios consumidos ante eliminación/anulación; no reciclar ni retroceder.

### Etapa N1 — esquema, respaldo y migración

- [x] Revisar Git, estado real del esquema, menú y decisiones existentes; conservar cambios previos de Clientes.
- [x] Respaldar documentos antes de registrar esta preparación.
- [x] Respaldar archivos de código y PostgreSQL antes de editar/aplicar migración.
- [x] Diseñar configuración única por tipo confirmado, versión y próximo número sin valor inicial inventado.
- [x] Diseñar registro persistido de asignaciones con tipo, número, formato histórico y clave estable de operación.
- [x] Garantizar unicidad por tipo/número, folio histórico y clave de reintento; definir índices y restricciones de positivos/límites.
- [x] Preservar compatibilidad con documentos anteriores sin deducir sus folios del ID ni del PDF de muestra.
- [x] Generar SQL versionado, revisar/probar en copia, validar Prisma y generar cliente; aplicar sólo tras validación.

### Etapa N2 — servicio y concurrencia

- [x] Guardar configuración con control de versión y validación de formato/entero positivo; no convertir números largos a number.
- [x] Permitir estado sin configurar y bloquear asignaciones hasta completar configuración por el usuario.
- [x] Mostrar vista previa sin reservar ni consumir folio.
- [x] Preparar asignador con bloqueo transaccional de secuencia; contrato exige que el futuro módulo guarde el documento en esa misma transacción. La integración documental sigue pendiente.
- [x] Reintentos reconocidos por clave estable antes de consumir otro número; fallo de guardado revierte asignación/avance.
- [x] Resolver límites de secuencia, longitud y cambios de configuración según respuestas; no depender sólo de la interfaz.
- [ ] Integrar asignación en cada módulo cuando se implemente, no al consultar ni al abrir un formulario.

### Etapa N3 — interfaz en Configuración

- [x] Ruta propuesta `/configuracion/numeracion`, añadida al menú centralizado.
- [x] Tabla con filtro, tipo, estado, prefijo, próximo número y formato de ejemplo; consulta/edición sobre el listado.
- [x] Tipo fijo confirmado, sin mantenedor libre que cree tipos de documentos inexistentes.
- [x] Formulario con ayudas, campos explícitos sin inicio por defecto, controles de formato y advertencia de cambios irreversibles/saltos según reglas aprobadas.
- [x] Confirmación/avisos/descarte reutilizables, teclado/foco, cursor y revisión móvil.

### Etapa N4 — validación y cierre

- [x] Validar sin configurar, ceros iniciales, prefijos, límite/agotamiento, caracteres y valores inválidos.
- [x] Probar asignaciones concurrentes, reintentos y fallo posterior a reservar número sin asignaciones huérfanas.
- [x] Probar conservación de folio histórico y restricciones de cambio de configuración.
- [x] Probar navegador escritorio/móvil, carga/vacíos/errores y control de versión.
- [x] Ejecutar lint/build, revisar diff y documentación; no marcar asignación integrada a Cotizaciones antes de desarrollarla.
- [x] Comparar tablas anteriores y retirar copias/servidores propios; verificar puertos preservando procesos del usuario.
- [x] Aprobación funcional del usuario de Numeración.

El usuario aprobó ambas precisiones. El número inicial se elegirá en el módulo: las cuatro configuraciones se crean sin próximo número ni dígitos definidos. No se infiere ningún inicio de documentos externos.


### Entrega técnica — 10-10-2026

- [x] Migración `20261011001000_numeracion_documental` validada en copia y aplicada a PostgreSQL local; estado de migraciones actualizado.
- [x] `DocumentNumbering`: cuatro tipos fijos sin inicio supuesto, versión y contador BigInt. `DocumentFolio`: historial permanente, UUID único y formato copiado; restricciones SQL de formato, rango, avance y protección de registros utilizados.
- [x] `/configuracion/numeracion`: filtro, Ver/Configurar, formularios sobre listado, ayudas «i», vista previa y confirmación de guardado/saltos; descarte reutilizable y campos bloqueados al primer uso.
- [x] Prueba de integración en copia: no configurado, formato, versión, asignaciones concurrentes, reintentos, rollback, saltos, histórico, SQL y agotamiento.
- [x] Chromium escritorio/móvil: consulta, campos bloqueados, guardado confirmado, validación, descarte, filtro y ayuda; sin errores de página.
- [x] Prisma format/validate/generate, TypeScript, lint y build correctos.
- [x] Las 30 tablas anteriores conservan exactamente sus conteos y huellas. Base real: cuatro configuraciones sin próximo número/dígitos y cero folios asignados.
- [x] Servidor propio 3031 detenido. Servidor previo 3030/PID 13696 conservado. Copia descartable retirada al cierre.
- [x] Revisión funcional del usuario de Configuración de numeración.

**Límites técnicos:** número positivo de hasta 18 dígitos; prefijo opcional de hasta 20 caracteres (letras ASCII, números, punto, guion, barra o guion bajo). Dígitos mínimos entre 1 y 18: los números mayores que ese ancho no se truncan. El contador interno admite un valor adicional exclusivamente para representar agotamiento después del último folio.

**Uso futuro del servicio:** `asignarFolio(tx, tipo, UUID)` se invoca dentro de la transacción que crea el documento; no tiene una acción pública de reserva. El módulo debe validar el contenido e idempotencia de su documento y guardar su folio/vínculo en esa misma transacción. Reutilizar el UUID para reintentos; un fallo posterior revierte asignación y contador. Cotizaciones/órdenes/guías existentes no se renumeran ni reciben vínculos inferidos. Esta dependencia no implementa sus formularios ni emisión de PDF.

**Respaldo:** `backups/20261010_211026_numeracion_documental`, con originales, dump PostgreSQL válido, huellas, logs, scripts, captura móvil y SHA256SUMS. El primer intento de captura binaria falló y fue corregido antes de modificar archivos o datos; el archivo identificado como `respaldo_fallido_no_utilizar.dump` no sirve para restaurar.

**Próxima dependencia:** datos bancarios de Empresa y catálogo/productos/recetas, según el orden del hito; requieren sus definiciones antes de implementar. El número inicial se elegirá manualmente desde esta nueva pantalla.


El usuario validó el funcionamiento de Configuración de numeración. Se cierra esta dependencia; la integración del asignador con los documentos comerciales permanece pendiente. Continúa la configuración bancaria de Empresa, antes del catálogo y Cotizaciones.


## Cuentas bancarias de Empresa — definición y etapas

**Estado:** ambas precisiones aprobadas explícitamente. Configuración bancaria implementada y validada técnicamente; revisión funcional del usuario aprobada; integración del selector en Cotizaciones pendiente.

- [x] Permitir varias cuentas bancarias de la empresa.
- [x] Identificar una principal, utilizada por defecto, y permitir elegir otra al registrar una cotización.
- [x] Datos bancarios opcionales: no crear cuentas ficticias ni copiar automáticamente datos del PDF.
- [x] Preservar copia histórica de la cuenta seleccionada en el documento emitido.
- [x] Aprobados campos obligatorios y titular: banco, tipo de cuenta, número como texto, nombre y RUT propio del titular; correo opcional.
- [x] Aprobada baja mediante desactivación para cuentas utilizadas, conservando referencias/histórico, y elección explícita de nueva principal antes de desactivar la vigente.

### B1 — estructura y migración

- [x] Respaldar archivos afectados y PostgreSQL.
- [x] Incorporar cuentas relacionadas con Empresa, principal única y control de versión/concurrencia; no exigir cuentas para configurar otros datos de Empresa.
- [x] Validar RUT del titular y conservar número de cuenta como texto, incluidos ceros iniciales.
- [x] Preparar referencia y copia histórica bancaria para Cotizaciones, sin inferir datos en documentos anteriores.
- [x] Agregar índices/restricciones y probar migración en copia antes de aplicar; validar Prisma y generar cliente.

### B2 — configuración e interfaz

- [x] Gestionar cuentas dentro de Configuración de Empresa: listado, filtro, Crear/Ver/Editar y baja según regla aprobada.
- [x] Permitir marcar principal con confirmación y control transaccional, sin dos principales concurrentes.
- [x] Formularios sobre el listado, ayudas y alertas/descarte reutilizables.
- [x] Preparar consulta de cuentas activas y servicio de snapshot: principal por defecto, alternativa elegible y opción sin cuenta.
- [ ] Integrar selector buscable en el futuro formulario de Cotizaciones.

### B3 — validación y cierre

- [x] Probar obligatorios, RUT, números como texto, principal, conflictos y conservación histórica.
- [x] Probar interfaz escritorio/móvil, consulta readonly, confirmaciones y errores.
- [x] Ejecutar lint/build, comparar datos anteriores y actualizar documentación.
- [x] Retirar copias/servidores propios y verificar puertos, preservando procesos previos.
- [x] Revisión funcional del usuario de cuentas bancarias.


### Entrega bancaria — 10-10-2026

- [x] Respaldar originales y PostgreSQL en `backups/20261010_231031_cuentas_bancarias`.
- [x] Migración `20261011023500_cuentas_bancarias_empresa` probada en copia y aplicada a PostgreSQL local; esquema validado y cliente generado.
- [x] CompanyBankAccount relacionada con el perfil único; principal única, activa y requerida desde la primera cuenta. No crear perfil/cuentas automáticamente durante consultas o migración.
- [x] Campos obligatorios: Banco, Tipo de cuenta, Número, Titular y RUT; correo opcional. Banco/tipo son texto libre por ahora, con ejemplos en ayuda, sin inventar un catálogo fijo de bancos.
- [x] Número como texto, conservando ceros iniciales; identidad banco/tipo/número única sin distinguir mayúsculas/espacios exteriores. RUT normalizado y DV validado en formulario, servicio y SQL, incluidos K y 0.
- [x] Cambios bajo bloqueo Empresa → cuentas, versión entera y principal anterior esperada; cambio de principal atómico, con rollback ante error.
- [x] Primera cuenta principal; para desactivarla elegir otra antes. Baja lógica para todas las cuentas, incluso sin uso, conservando historial; reactivación disponible. No hay borrado físico.
- [x] Empresa incorpora tabla/filtro y Crear/Ver/Editar, Principal y Desactivar/Activar; formularios sobre listado, ayudas por campo, confirmaciones/descarte reutilizables y errores.
- [x] Quote prepara FK Restrict y siete campos bancarios históricos; CHECK exige snapshot completo cuando hay cuenta. Documentos existentes permanecen con campos nuevos nulos.
- [x] `datosBancariosParaCotizacion` captura datos bajo bloqueo dentro de la transacción del futuro documento; ID omitido propone principal, ID explícito exige cuenta activa y null omite datos bancarios.
- [x] `tests/cuentas-bancarias.integration.ts` en copia local: obligatorios, RUT/K/0, ceros, duplicados, versiones, principal, concurrencia, rollback, baja/reactivación y conservación de snapshots/referencias.
- [x] Chromium escritorio/móvil: crear, validar RUT, consulta readonly sin guardar con Enter, descarte, cambio de principal, baja/reactivación, filtro/vacío, cursor, ayuda y edición.
- [x] Prisma format/validate/generate, TypeScript, lint y build correctos; sin nuevas dependencias del proyecto.
- [x] Conteos/huellas de 32 tablas anteriores iguales; en Quote se excluyen sólo las siete columnas nuevas, que quedan nulas en documentos anteriores.
- [x] Copia descartable retirada y servidor propio 3031 detenido. Se conserva servidor previo 3030/PID 13696.
- [x] Revisión funcional del usuario de las cuentas bancarias.
- [ ] Integración del selector buscable y guardado del snapshot en Cotizaciones; no hay emisión de PDF implementada.

Para usarlo, ingresar en **Configuración → Empresa → Cuentas bancarias**. Si no existe perfil, guardarlo primero; la configuración bancaria continúa siendo opcional. La principal se aplica a cotizaciones nuevas, sin alterar documentos previos.

**Siguiente dependencia:** catálogo de productos y recetas, con unidades del mantenedor y definición de producción/stock terminado antes de habilitar escrituras de inventario.


## Continuación — catálogo y recetas

- [x] Revisar estado real y preparar [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md), con etapas y decisiones pendientes.
- [x] Recibir confirmación de campos, receta por unidad, productos sin receta y bloqueo de unidad antes de implementar.
- [x] Implementar/validar catálogo, recetas e imágenes siguiendo ese checklist; catálogo validado funcionalmente; P5 de terminado implementado con revisión funcional pendiente.

La preparación anterior se continúa con la implementación descrita en HITO-PRODUCTOS. Los envíos a GitHub quedan a cargo del usuario.


## 11-10-2026 — precisiones de productos

- [x] Campos/unidad/precio, receta por unidad, producto sin receta y bloqueo de unidad aprobados; código automático UUID en lugar de código manual opcional.
- [x] Agregar una o varias imágenes por producto y carga inicial de terminado sin consumo de materia prima.
- [x] Confirmar almacenamiento local reemplazable y elegibilidad de carga inicial según [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).

Catálogo, recetas e imágenes implementados y validados funcionalmente; revisión visual de la reorganización pendiente. Los checks se registran en HITO-PRODUCTOS. Clasificación de bodegas aprobada e implementada; stock inicial de terminado implementado y validado técnicamente en P5 de HITO-PRODUCTOS; revisión funcional pendiente. Integración del catálogo en el formulario de Cotizaciones pendiente.


### Dependencia P5 — inventario inicial de terminado

- [x] Stock por bodega, ingreso inicial y Kardex propios implementados; no consumen materia prima. Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).
- [x] Validación funcional del usuario de P5.
- [ ] Producción/consumo y salidas de terminado: no habilitados por la carga inicial.
- [ ] Integración de catálogo en Cotizaciones y emisión de documentos.


### Correcciones del inventario terminado — P6

- [x] Implementar ajustes de conteo final y correcciones vinculadas sin borrar inventario inicial ni consumir materias primas.
- [x] Revisión funcional del usuario de P6; solicita revisar la interfaz de Clientes/Sucursales antes de continuar Cotizaciones.

Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md). Fabricación y salidas de terminado todavía pendientes.


### Sucursales en grilla — 11-10-2026

- [x] Aplicar a Sucursales el patrón de grilla/modal de la receta de Productos; Crear/Editar/Sucursales/Ver conservan su alcance.
- [x] Validar borrador, Enter, descarte/foco, persistencia conjunta, referencias protegidas y escritorio/móvil; sin cambios en la estructura ni servicios.
- [ ] Revisión del usuario de la nueva presentación.

Checklist y respaldo en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md). Cotizaciones siguen pendientes; esta reorganización no emite documentos ni altera sus copias históricas.
