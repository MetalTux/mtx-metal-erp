# Propuestas: stock mínimo, empresa y cobranza

Fecha: **2026-10-06**.

Estado: **análisis y propuestas completados; decisiones e implementación pendientes**.

Este documento complementa [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), sin modificarla. Describe recomendaciones a partir del [esquema actual](../prisma/schema.prisma); no implica que los cambios estén aprobados o implementados.

## Seguimiento

- `[x]`: el trabajo descrito en el ítem se completó.
- `[ ]`: pendiente. Una propuesta redactada no equivale a una decisión aprobada.
- Cuando se apruebe una decisión, registrar fecha y criterio. Cuando se implemente, añadir la migración o archivos relevantes y la validación realizada.
- Registrar cambios efectivos de esquema o arquitectura en [CAMBIOS.md](CAMBIOS.md); este documento conserva las propuestas y su seguimiento.

| Tema | Situación actual | Recomendación inicial |
| --- | --- | --- |
| Stock mínimo | Hay saldos por material y bodega; no hay umbrales | Mínimo opcional por material y bodega |
| Empresa | No existe un perfil de la empresa que usa el ERP | Un perfil único para configuración y documentos |
| Cobranza | Hay estado y promesa de pago en la guía, sin montos ni abonos | Cuenta por cobrar asociada a la orden de venta, con historial de pagos |

## 1. Stock mínimo

### Qué problema resuelve

Permite detectar cuándo reponer un material antes de agotarlo. Debe expresarse en la unidad del material: por ejemplo, un mínimo de 20 significa 20 kg si el material está definido en kilos.

La guía propone `RawMaterial.minStock`, comparado con el saldo en cada bodega. Eso aplicaría el mismo mínimo a todas las bodegas. Puede ser útil como valor predeterminado, pero una bodega de producción y una de respaldo podrían necesitar cantidades distintas.

### Opciones

| Opción | Ventaja | Límite |
| --- | --- | --- |
| Mínimo global en `RawMaterial`, comparado con la suma de bodegas | Configuración sencilla por material | Puede ocultar una falta en la bodega que necesita el material |
| Mínimo en `RawMaterial`, aplicado a cada bodega | Un solo valor para configurar | Supone que todas las bodegas deben mantener el mismo mínimo |
| Mínimo en `WarehouseStock` | Cada combinación tiene su propio objetivo | Requiere configurar las combinaciones relevantes |
| Mínimo predeterminado en material y una excepción por bodega | Permite reutilizar valores con flexibilidad | Añade dos niveles de configuración y reglas de precedencia |

**Recomendación:** comenzar con `WarehouseStock.minStock`, opcional y de tipo `Decimal(14,3)`. Aprovecha la combinación única de bodega y material que ya existe. Si la configuración repetida resulta pesada, se puede incorporar después un valor predeterminado en `RawMaterial`.

### Reglas propuestas

- `minStock = null`: reposición sin configurar; no disparar una alerta de stock bajo por esa combinación.
- `minStock >= 0`: valor válido. Rechazar mínimos negativos.
- Saldo positivo menor al mínimo: **Stock bajo**.
- Saldo positivo igual o mayor al mínimo configurado: **Sobre el mínimo**. Esto no garantiza que alcance para los trabajos pendientes.
- Saldo igual a cero: **Sin stock**. Mostrarlo en inventario incluso si no hay mínimo; incluirlo en alertas de reposición cuando el mínimo sea mayor que cero.
- Saldo negativo: destacar una inconsistencia o faltante según la política de stock que se acuerde. La política de permitir stock negativo sigue pendiente.
- No generar alertas para todas las combinaciones posibles entre materiales y bodegas. Configurar solo aquellas donde se espera mantener existencias.
- Si se configura un material sin fila de stock en una bodega, crear su combinación con saldo cero. La configuración del mínimo no debe inventar existencias ni movimientos; cualquier ingreso real conserva la regla de stock y kardex en una transacción.
- Cambiar el mínimo no modifica el saldo ni genera un movimiento de stock.

Ejemplo: Tubo 40×40 en metros, con saldo de 12 m y mínimo de 20 m en Producción: **Stock bajo**. Un saldo de 100 m en otra bodega no elimina esa alerta.

### Interfaz y Dashboard

- Editar el mínimo desde **Inventario → Stock por bodega**, junto al material, unidad y saldo.
- Mostrar “Sin mínimo configurado” cuando corresponda, diferenciándolo del valor cero.
- KPI: contar **materiales distintos** que incumplen el mínimo, y mostrar también cuántas combinaciones de bodega y material requieren atención. Un material afectado en dos bodegas cuenta una sola vez en el KPI de materiales.
- Una barra contra el mínimo puede mostrar `saldo / mínimo`, con relleno visual limitado al 100 %. Para mínimo cero o sin configurar, mostrar el saldo sin porcentaje. No presentar esa barra como capacidad física de la bodega.
- Separar la alerta de reposición del bloque **Requerimiento frente a stock**: este último debe considerar las necesidades aún no consumidas y la bodega indicada en cada línea. No volver a descontar consumos ya registrados ni sumar stock de otras bodegas como si hubiera un traslado disponible.

### Checklist

- [x] Revisar saldos, unidades y unicidad en el esquema actual.
- [x] Comparar mínimo global, por bodega y con valor predeterminado.
- [x] Proponer reglas para valores nulos, cero y límite de alerta.
- [ ] Decidir la ubicación del mínimo y confirmar la regla de igualdad.
- [ ] Definir la política de saldos negativos y las combinaciones que se monitorean.
- [ ] Crear la migración sin alterar los saldos existentes; mínimos iniciales sin configurar.
- [ ] Implementar edición, validación y consultas de alertas.
- [ ] Incorporar el KPI y el detalle por bodega.
- [ ] Verificar: sin mínimo, saldo cero, saldo igual al mínimo, fracciones, dos bodegas y un material contado una sola vez.

## 2. Datos de la empresa

### Qué problema resuelve

El ERP necesita identificar a la empresa que emite sus cotizaciones y documentos. Estos datos pertenecen a la configuración de la aplicación, no al catálogo de clientes o proveedores.

**Recomendación:** agregar `CompanyProfile` con un único perfil en esta etapa. No introducir una arquitectura para varias empresas mientras no exista esa necesidad.

### Campos propuestos

| Campo | Uso | Condición inicial |
| --- | --- | --- |
| `legalName` | Razón social o nombre del emisor | Requerido para emitir documentos |
| `tradeName` | Nombre comercial | Opcional |
| `rut` | Identificación de la empresa | Requerido para emitir documentos |
| `businessActivity` | Giro o actividad | Opcional inicialmente |
| `address`, `commune`, `city` | Dirección | Requeridos según el formato acordado para los documentos |
| `email`, `phone` | Contacto | Opcionales |
| `logoUrl` | Logo para pantalla y PDF | Opcional; almacenamiento por definir |
| `createdAt`, `updatedAt` | Fechas de registro y modificación | Convención existente |

- Guardar el RUT con una representación uniforme y validarlo; aplicar puntos y guion al mostrarlo.
- Permitir iniciar el ERP con el perfil incompleto. Mostrar “Configurar empresa” y exigir los campos acordados antes de emitir un documento definitivo.
- Para garantizar el perfil único, usar un identificador fijo y una restricción de base que solo admita ese identificador; la interfaz edita el registro existente, sin listado ni acción “Nueva empresa”. Un identificador fijo por sí solo no impide crear otros registros.
- No usar el perfil de empresa como sustituto de permisos. La edición debe quedar restringida cuando exista autenticación.
- No guardar información bancaria en la primera versión salvo necesidad explícita. Se podrá agregar después para instrucciones de pago.

### Conservar documentos históricos

Una cotización ya emitida no debe cambiar de emisor o dirección cuando se edite el perfil de empresa. Al emitirla, conservar una copia de los datos usados en el documento o un PDF inmutable con su versión. Si se permitirá regenerar PDFs antiguos, hará falta la copia de datos; leer siempre el perfil actual no basta. El mismo criterio aplica a la identificación del cliente y a los importes aceptados.

La generación de PDFs y la copia histórica pueden implementarse junto con Ventas; no bloquean la creación del mantenedor de empresa.

### Interfaz

- Pantalla de formulario único en **Configuración → Empresa**, ruta propuesta `/configuracion/empresa`.
- Esta ubicación permite configurar la empresa antes de incorporar Usuarios y Roles. El grupo Administración de la guía sigue pendiente del login.
- Mostrar vista previa del logo y una ayuda sobre los datos usados en documentos.
- La alternativa es ubicarla en Administración cuando se implemente autenticación; confirmar la ubicación antes de cambiar el menú.

### Checklist

- [x] Confirmar que no existe un modelo de empresa.
- [x] Proponer perfil único, campos y conservación de documentos históricos.
- [ ] Confirmar que esta versión administrará una sola empresa.
- [ ] Acordar campos requeridos y ubicación en el menú.
- [ ] Crear el modelo, la restricción de perfil único y la migración.
- [ ] Implementar formulario y validación compartida entre servidor e interfaz.
- [ ] Definir almacenamiento del logo e implementar carga cuando corresponda.
- [ ] Integrar perfil y copia histórica al emitir cotizaciones/PDFs.
- [ ] Verificar: perfil incompleto, RUT inválido, segundo perfil rechazado y documentos antiguos tras editar la empresa.

## 3. Cobranza

### Problema del modelo actual

`DeliveryNote` tiene `paymentStatus`, `paymentPromiseDate` y `voucherUrl`, pero no guarda un importe ni varios pagos. Una orden de venta puede tener varias órdenes de trabajo y cada trabajo varias guías.

Por eso, usar el total de la cotización por cada guía puede duplicar o multiplicar la deuda. Incluso una sola guía por trabajo no garantiza exactitud si una venta tiene varios trabajos. Además, este enfoque deja fuera anticipos recibidos antes del despacho.

Ejemplo: una venta de $1.000.000, dos despachos y un abono de $300.000 debe mostrar **$700.000 pendientes**, independientemente de cuántas guías se hayan emitido.

### Opciones

| Opción | Cuándo sirve | Límite |
| --- | --- | --- |
| Añadir importe y pagos a cada guía | Si cada despacho origina una deuda independiente | Los anticipos y la distribución entre guías necesitan reglas adicionales |
| Cuenta por cobrar en la orden de venta, con pagos | Si se cobra el trabajo vendido, aunque se entregue por partes | Hay que separar cobranza de despacho y definir cuándo nace la deuda |
| Documento de cobro independiente con cuotas y asignación de pagos | Si se necesitan varios vencimientos, cobros agrupados o facturación más amplia | Mayor alcance para esta etapa |

**Recomendación:** cuenta por cobrar vinculada a `SalesOrder`, con un historial de pagos. Empezar con una cuenta y un vencimiento por orden de venta; dejar cuotas y pagos que cubren varias ventas para una ampliación posterior.

### Modelos propuestos

| Modelo | Campos principales | Regla |
| --- | --- | --- |
| `AccountReceivable` | `salesOrderId` único, `amount`, `issuedAt`, `dueDate` opcional, `createdAt`, `updatedAt` | Importe acordado y conservado al confirmar la venta |
| `Payment` | `accountReceivableId`, `amount`, `paidAt`, `method`, `reference`, `voucherUrl` opcional, fechas de registro | Cada abono se registra individualmente |

Importes en `Decimal(14,2)`; índices apropiados en las claves foráneas y en las consultas por vencimiento. Los nombres y campos son una propuesta, no un esquema definitivo.

### Reglas de cálculo y registro

- Propuesta de disparador: crear la cuenta al confirmar la orden de venta, una sola vez. Una cotización pendiente no genera deuda.
- Guardar el importe aceptado en la cuenta. No recalcularlo a partir de una cotización que pueda editarse después.
- Definir qué incluye el total acordado antes de implementar: descuentos, impuestos si corresponden y redondeo. El esquema actual no modela esas partes por separado; no inventar una fórmula.
- `saldo = importe acordado − suma de pagos vigentes`. Registrar deuda y abonos; calcular saldo y estado, evitando mantener varios totales independientes.
- Registrar anticipos como pagos de esa cuenta, antes del despacho si es necesario.
- Cada pago debe ser positivo. Inicialmente, rechazar pagos superiores al saldo; créditos a favor y devoluciones requieren otra regla.
- Evitar pagos duplicados al reintentar una solicitud. Una clave única de operación puede dar idempotencia; la referencia bancaria por sí sola no siempre identifica una operación de forma inequívoca.
- Validar el saldo y registrar el pago de forma atómica, con una estrategia de concurrencia que impida que dos abonos simultáneos superen la deuda.
- No eliminar silenciosamente un pago confirmado. Definir anulación con motivo y trazabilidad; solo los pagos vigentes reducen el saldo.
- Las obras propias no generan cuentas por cobrar porque no tienen orden de venta ni cliente.
- Separar `dueDate` (vencimiento acordado) de una eventual fecha prometida por el cliente. Una nueva promesa no debe ocultar que la deuda está vencida.

### Estado visible y Dashboard

Calcular dos dimensiones: **pago** (sin abonos, pago parcial, pagado) y **vencimiento** (sin fecha, vigente, vencido). Un pago parcial también puede estar vencido.

- Pagado: saldo cero.
- Parcial: pagos vigentes mayores que cero y saldo positivo.
- Vencido: saldo positivo y fecha de vencimiento anterior al día actual en `America/Santiago`. Si vence hoy, no marcarlo vencido antes de terminar el día.
- Por cobrar: suma de saldos positivos de cuentas vigentes.
- Vencido: suma de los saldos vencidos, más cantidad de cuentas vencidas; no cantidad de guías.

La definición de cuentas vigentes debe incluir el tratamiento de ventas anuladas. Resolver cancelaciones, devoluciones y ajustes de importe antes de habilitar esas operaciones en la interfaz.

### Navegación y transición

- Mantener **Guías de despacho** en Trabajos.
- Proponer **Cobranza** en Ventas, ruta `/ventas/cobranza`, porque se consulta por cliente y venta. No hace falta crear Finanzas para una sola pantalla.
- Mostrar en el detalle de la venta el importe, abonos, saldo y vencimiento; permitir registrar abonos con fecha, medio y comprobante.
- Dejar de usar el estado de pago en cada guía como fuente de verdad. Se puede mostrar allí un resumen de la cuenta asociada.
- Antes de retirar `DeliveryNote.paymentStatus`, `paymentPromiseDate` y `voucherUrl`, revisar los datos existentes. Un estado PAGADO sin importe o fecha de pago no alcanza para reconstruir automáticamente un historial confiable. Preparar una conciliación y no inventar pagos para completar la migración.

### Checklist

- [x] Analizar las relaciones entre cotizaciones, ventas, trabajos y guías.
- [x] Identificar duplicación de deuda y falta de anticipos/abonos.
- [x] Proponer cuenta por venta, pagos y estados calculados.
- [ ] Confirmar si se cobra por venta completa o por despacho.
- [ ] Confirmar el disparador de deuda, vencimientos y necesidad de anticipos o cuotas.
- [ ] Definir composición del importe, anulaciones, correcciones y sobrepagos.
- [ ] Revisar datos actuales y preparar conciliación de los campos en guías.
- [ ] Crear modelos y migración compatible con la transición.
- [ ] Implementar registro atómico de pagos, idempotencia y trazabilidad de anulaciones.
- [ ] Implementar listado y detalle de cobranza en Ventas.
- [ ] Incorporar indicadores reales de saldo y vencimiento al Dashboard.
- [ ] Verificar: dos guías sin duplicar deuda, varios trabajos, anticipo, pago parcial, vencimiento hoy, sobrepago, reintento y pagos concurrentes.

## 4. Forma de avanzar

1. **Acordar reglas del negocio.** Resolver las decisiones pendientes de cada checklist. Se pueden decidir por tema; no hace falta bloquear toda la interfaz.
2. **Implementar stock mínimo y perfil de empresa.** Son cambios acotados y preparan Inventario y los documentos. Usar migraciones separadas para facilitar revisión.
3. **Construir tema, layout y navegación.** Avanzar con la guía visual en paralelo a las definiciones de cobranza. Mostrar vacíos o “Pendiente de configuración” donde falten datos; no poner cifras ficticias como datos reales.
4. **Implementar cobranza después de definir Ventas.** Crear la cuenta al confirmar la venta y el historial de abonos antes de conectar el KPI “Por cobrar”.
5. **Integrar y verificar.** Conectar los indicadores con consultas reales, completar los escenarios de aceptación y actualizar las checklists y el registro de cambios.

### Checklist general

- [x] Leer el modelo actual y la propuesta de interfaz.
- [x] Registrar alternativas, recomendaciones y criterios de aceptación.
- [ ] Registrar las decisiones del usuario con fecha.
- [ ] Implementar cada cambio aprobado con su migración y documentación.
- [ ] Ejecutar validación de Prisma, generar el cliente y revisar las migraciones en el entorno autorizado.
- [ ] Ejecutar `pnpm lint` y `pnpm build` para los cambios de código.
- [ ] Marcar cada funcionalidad como completada solo después de verificar su comportamiento.

## 5. Registro de decisiones

| Fecha | Tema | Decisión | Motivo / alcance |
| --- | --- | --- | --- |
| — | Stock mínimo | Pendiente | Propuesta: mínimo opcional por material y bodega |
| — | Empresa | Pendiente | Propuesta: perfil único; ubicación en Configuración |
| — | Cobranza | Pendiente | Propuesta: cuenta por orden de venta con abonos |

## 6. Trabajo realizado en este documento

- **2026-10-06:** análisis del esquema y de la guía; alternativas y recomendaciones redactadas; checklists creadas. No se cambió el esquema, no se ejecutaron migraciones y no se modificó la guía de interfaz.
