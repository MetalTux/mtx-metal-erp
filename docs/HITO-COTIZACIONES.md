# Hito: Cotizaciones

Fecha: 07-10-2026. **Estado: inicio autorizado; esquema y checkpoints revisados; cálculo del PDF, descuento global y estados aprobados; alcance comercial ampliado a materia prima, catálogo de productos terminados y trabajos a medida; flujo de Orden de Compra Cliente, producción y vencimiento definido; quedan precisiones de implementación/configuración. No hay módulo implementado.**

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
- [ ] Implementar catálogo y copia histórica de condición/plazo por documento.
- [ ] Confirmar estados derivados Sin abonos/Parcial/Pagado y vencimiento independiente; no crear un mantenedor editable que permita declarar Pagado sin abonos.
- [x] Registrar plazo final de pago y abonos graduales independientes; no se solicitan cuotas obligatorias por condición.
- [x] El plazo empieza con el trabajo finalizado y el registro de folio/fecha de factura. La fecha de factura es la base del cálculo de fecha tope según condición; abonos no alteran plazo.
- [ ] Implementar finalización/factura y cálculo de vencimiento con fechas de calendario y copia del plazo acordado.
- [x] Datos bancarios opcionales en Empresa aprobados. No copiar automáticamente los datos del PDF a la BD.
- [ ] Implementar estructura y configuración bancaria tras respaldos/validación.
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
- [ ] Incorporar Condiciones de Pago, configuración de folios y datos bancarios mediante mantenedores/configuración con respaldos.
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
- [ ] Implementar Condiciones de Pago con nombre/plazo y bases aprobadas, sin cuotas vinculadas a cada abono.
- [ ] Guardar condición/plazo histórico en Orden de Compra Cliente y folio/fecha de factura vinculados al trabajo.
- [ ] Guardar finalización, factura y vencimiento de forma coherente; validar condiciones de registro y definir corrección de una factura ya registrada al abordar el módulo.
- [ ] Calcular fecha tope desde fecha de factura; mantener vencimiento nulo hasta cumplir el evento aprobado.
- [ ] Registrar anticipos antes del vencimiento, sin retrasar fecha tope ni duplicar cuenta por trabajo.
- [ ] Construir panel de pendientes con saldo = importe acordado − abonos no anulados.

### Próxima unidad de implementación

**Condiciones de Pago** es el mantenedor más sencillo y la primera dependencia comercial a desarrollar: estructura/migración, catálogo base, listado, Crear/Ver/Editar/Eliminar, validación de nombre/plazo, referencias protegidas y copia histórica del plazo al usarlo. Después: configuración de numeración/datos bancarios → catálogo de productos y recetas → Cotizaciones → Orden de Compra Cliente/Trabajo → Producción/Cobranza. El inventario de producto terminado se documentará y validará en su propio hito antes de habilitar escrituras.

La numeración inicial de Cotizaciones permanece sin definir. La configuración puede prepararse sin un valor automático; no se emitirán números hasta que el usuario configure el inicio.
