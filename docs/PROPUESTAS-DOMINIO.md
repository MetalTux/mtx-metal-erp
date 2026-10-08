# Propuestas: stock mínimo, empresa y cobranza

Fecha: **2026-10-06**.

Estado: **estructuras de Stock Mínimo, Empresa y Cobranza implementadas y migradas; Empresa implementada y validada localmente; lógica de Stock Mínimo y Cobranza pendiente**.

Este documento complementa [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), sin modificarla. Describe recomendaciones y avances sobre el [esquema actual](../prisma/schema.prisma). Solo están aprobados e implementados los alcances indicados en las checklists y en el registro de decisiones.

## Seguimiento

- `[x]`: el trabajo descrito en el ítem se completó.
- `[ ]`: pendiente. Una propuesta redactada no equivale a una decisión aprobada.
- Cuando se apruebe una decisión, registrar fecha y criterio. Cuando se implemente, añadir la migración o archivos relevantes y la validación realizada.
- Registrar cambios efectivos de esquema o arquitectura en [CAMBIOS.md](CAMBIOS.md); este documento conserva las propuestas y su seguimiento.

| Tema | Situación actual | Recomendación inicial |
| --- | --- | --- |
| Stock mínimo | `WarehouseStock.minStock` migrado y cliente generado; alertas pendientes | Mínimo opcional por material y bodega |
| Empresa | `CompanyProfile` migrado y cliente generado; tabla inicialmente vacía | Un perfil único para configuración y documentos |
| Cobranza | `AccountReceivable` y `Payment` migrados y cliente generado; campos heredados conservados | Cuenta por orden de venta, con historial de abonos |

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

**Decisión aplicada el 2026-10-06:** `WarehouseStock.minStock`, opcional y de tipo `Decimal(14,3)`, sin valor predeterminado. Aprovecha la combinación única de bodega y material que ya existe. Si la configuración repetida resulta pesada, se puede incorporar después un valor predeterminado en `RawMaterial`.

La migración `20261006150652_stock_minimo_por_bodega` está aplicada en PostgreSQL local y el cliente Prisma está regenerado. El CHECK `WarehouseStock_minStock_nonnegative_check` rechaza mínimos negativos y `NaN`. Esta restricción se conserva en el SQL de la migración; no está representada como atributo en Prisma. Las filas existentes quedan con `minStock = NULL`.

Esta decisión reemplaza la ubicación en `RawMaterial` mencionada en la guía de interfaz, que se conserva como referencia de la propuesta original. El alcance autorizado en esta etapa es estructura, migración, generación del cliente, respaldos y validación; no incluye desarrollar módulos ni consultas de alertas.

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
- [x] Adoptar mínimo por material y bodega; mantener como regla para la futura alerta `saldo < mínimo` (la igualdad no dispara stock bajo).
- [x] Aprobar configuración explícita de combinaciones a monitorear, incluso sin stock previo.
- [ ] Definir la política de saldos negativos para ajustes/salidas.
- [x] Respaldar los archivos afectados, el cliente generado anterior y la base PostgreSQL antes de migrar.
- [x] Crear y aplicar la migración sin alterar los saldos existentes; mínimos iniciales sin configurar.
- [x] Incorporar y verificar el CHECK para mínimos no negativos y distintos de `NaN`.
- [x] Regenerar el cliente Prisma y validar el esquema y su correspondencia con PostgreSQL.
- [x] Verificar estructura: `NULL`, cero, tres decimales, límite numérico, rechazo de negativos/`NaN`, mínimos independientes en dos bodegas y unicidad de material/bodega.
- [x] Comparar datos previos y secuencias en las 17 tablas del dominio después de migrar.
- [x] Implementar edición, validación y consultas de reposición en Stock; notificaciones/Dashboard fuera del alcance aprobado.
- [ ] Incorporar el KPI y el detalle por bodega.
- [x] Verificar sin mínimo, cero, igualdad, fracciones y dos bodegas; consultas de reposición con total/paginación.
- [ ] Verificar material contado una sola vez cuando se implemente el KPI (diferido).

## 2. Datos de la empresa

### Qué problema resuelve

El ERP necesita identificar a la empresa que emite sus cotizaciones y documentos. Estos datos pertenecen a la configuración de la aplicación, no al catálogo de clientes o proveedores.

**Decisión aplicada el 2026-10-06:** `CompanyProfile` admite como máximo un perfil de empresa. La migración `20261006154719_perfil_unico_empresa` está aplicada en PostgreSQL local y el cliente Prisma está regenerado. No se introduce una arquitectura para varias empresas.

El identificador es `Int @id @default(1)`, sin autoincremento. La PK y el CHECK SQL `CompanyProfile_singleton_check` exigen `id = 1` e impiden un segundo perfil. La tabla comienza vacía; no se inventaron datos de empresa ni se modificó el seed.

Los diez campos de datos son `String?`: permiten guardar un perfil incompleto. `createdAt` y `updatedAt` son obligatorios y siguen la convención del proyecto. La siguiente tabla indica los requisitos previstos para **emitir documentos**, que deberán validarse en el módulo futuro; no son restricciones `NOT NULL` actuales.

### Campos incorporados y requisitos previstos

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

- Convención para el futuro módulo: guardar el RUT sin puntos, con guion y dígito verificador en mayúscula; validarlo y aplicar puntos al mostrarlo. La columna actual admite texto opcional; aún no se implementa validación de formato o dígito verificador.
- Permitir iniciar el ERP con el perfil incompleto. Mostrar “Configurar empresa” y exigir los campos acordados antes de emitir un documento definitivo.
- El perfil único ya está garantizado por PK y CHECK en PostgreSQL. La futura interfaz editará ese registro, sin listado ni acción “Nueva empresa”. Conservar el CHECK en el SQL de migraciones; no se representa como atributo del esquema Prisma.
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

- [x] Revisar la ausencia inicial de un modelo de empresa.
- [x] Proponer perfil único, campos y conservación de documentos históricos.
- [x] Adoptar un único perfil de empresa para esta versión.
- [x] Definir campos opcionales en la base para permitir configuración gradual, con fechas de registro y modificación.
- [ ] Acordar requisitos definitivos para emitir documentos y ubicación en el menú.
- [x] Respaldar archivos afectados, migraciones anteriores, cliente generado y base PostgreSQL antes del cambio.
- [x] Crear el modelo y la restricción de perfil único; validar la migración en una tabla temporal antes de aplicarla.
- [x] Aplicar la migración y regenerar el cliente Prisma.
- [x] Verificar perfil incompleto, persistencia de los campos, ID predeterminado, rechazo de segundos perfiles y de cambios a otro ID.
- [x] Verificar la tabla real, la conservación del CHECK de stock mínimo y los datos/secuencias de las 17 tablas previas.
- [x] Validar Prisma, estado y diferencias de migraciones, ESLint y build con comprobación de tipos.
- [x] Implementar formulario y validación compartida entre servidor e interfaz.
- [x] Definir almacenamiento local del logo e implementar carga; contrato preparado para futuro adaptador S3.
- [ ] Integrar perfil y copia histórica al emitir cotizaciones/PDFs.
- [ ] Verificar en los módulos: validación de RUT, requisitos de emisión y conservación de documentos antiguos tras editar la empresa.

## 3. Cobranza

### Problema del modelo anterior

`DeliveryNote` tiene `paymentStatus`, `paymentPromiseDate` y `voucherUrl`, pero no guarda un importe ni varios pagos. Una orden de venta puede tener varias órdenes de trabajo y cada trabajo varias guías.

Por eso, usar el total de la cotización por cada guía puede duplicar o multiplicar la deuda. Incluso una sola guía por trabajo no garantiza exactitud si una venta tiene varios trabajos. Además, este enfoque deja fuera anticipos recibidos antes del despacho.

Ejemplo: una venta de $1.000.000, dos despachos y un abono de $300.000 debe mostrar **$700.000 pendientes**, independientemente de cuántas guías se hayan emitido.

### Opciones

| Opción | Cuándo sirve | Límite |
| --- | --- | --- |
| Añadir importe y pagos a cada guía | Si cada despacho origina una deuda independiente | Los anticipos y la distribución entre guías necesitan reglas adicionales |
| Cuenta por cobrar en la orden de venta, con pagos | Si se cobra el trabajo vendido, aunque se entregue por partes | Hay que separar cobranza de despacho y definir cuándo nace la deuda |
| Documento de cobro independiente con cuotas y asignación de pagos | Si se necesitan varios vencimientos, cobros agrupados o facturación más amplia | Mayor alcance para esta etapa |

**Decisión aplicada el 2026-10-06:** cuenta por cobrar vinculada a `SalesOrder`, con historial de abonos. Se implementó una cuenta y un vencimiento por venta; cuotas y pagos que cubren varias ventas quedan para una ampliación posterior. La migración `20261006155755_cuentas_por_cobrar_y_abonos` está aplicada y el cliente Prisma está regenerado.

### Modelos incorporados

| Modelo | Campos principales | Regla |
| --- | --- | --- |
| `AccountReceivable` | `salesOrderId` único, `amount`, `issuedAt`, `dueDate`, `paymentPromiseDate`, `voidedAt`, `voidReason`, fechas de registro | Importe acordado por venta; vencimiento y promesa opcionales e independientes |
| `Payment` | `accountReceivableId`, `amount`, `paidAt`, `method`, `reference`, `voucherUrl`, `idempotencyKey`, `voidedAt`, `voidReason`, fechas de registro | Cada abono tiene una clave UUID de operación única y permite registrar su anulación |

Importes en `Decimal(14,2)`. La cuenta admite importe cero; los abonos deben ser estrictamente positivos. Los CHECK de PostgreSQL rechazan negativos y `NaN`, exigen un medio de pago no vacío y requieren fecha y motivo no vacío juntos al anular. El medio de pago es texto obligatorio; el catálogo de medios se definirá con el módulo.

`dueDate` y `paymentPromiseDate` usan `@db.Date`: representan días de calendario, no instantes. `reference` y `voucherUrl` son opcionales. `idempotencyKey` es UUID obligatorio y único, sin valor predeterminado; el futuro servicio deberá recibir o generar una clave estable por operación y reutilizarla en los reintentos.

La unicidad de `salesOrderId` indexa la relación con Ventas. Se incorporaron índices en `dueDate` y en `[accountReceivableId, voidedAt, paidAt]`. Las FK tienen borrado restringido: no se puede eliminar una venta con cuenta ni una cuenta con abonos. La estructura permite guardar metadatos de anulación, pero no impide por sí sola borrar un abono, modificar un importe confirmado o exceder el saldo; esos controles, la autoría y los permisos corresponden al futuro módulo.

Las tablas comienzan vacías. No se crean deudas o pagos a partir de cotizaciones o guías existentes. La aplicación deberá calcular saldo, estado y vencimiento; no se añadieron columnas con esos valores derivados ni automatismos para crear cuentas al confirmar ventas.

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
- Revisión del 2026-10-06: la base local tenía **0 guías de despacho**, por lo que no hubo pagos anteriores que conciliar. Se conservaron `DeliveryNote.paymentStatus`, `paymentPromiseDate` y `voucherUrl` como campos heredados para una transición compatible. Antes de retirarlos o migrar otras bases, repetir la revisión. Un estado PAGADO sin importe o fecha no permite reconstruir automáticamente un historial confiable.

### Checklist

- [x] Analizar las relaciones entre cotizaciones, ventas, trabajos y guías.
- [x] Identificar duplicación de deuda y falta de anticipos/abonos.
- [x] Proponer cuenta por venta, pagos y estados calculados.
- [x] Adoptar una cuenta por orden de venta, independiente de los despachos.
- [ ] Confirmar el disparador de deuda, vencimientos y necesidad de anticipos o cuotas.
- [ ] Definir composición del importe, anulaciones, correcciones y sobrepagos.
- [x] Revisar datos actuales: 0 guías locales; sin pagos históricos que conciliar. Conservar campos heredados para la transición.
- [x] Respaldar archivos, migraciones anteriores, cliente generado y base PostgreSQL antes del cambio.
- [x] Crear modelos, índices, FK y restricciones de importes y metadatos de anulación.
- [x] Preparar clave UUID única para operaciones y campos de anulación, sin automatizar la lógica de cobro.
- [x] Validar la migración en tablas temporales antes de aplicarla; generar el cliente Prisma actualizado.
- [x] Verificar estructura real y conservación de las 18 tablas anteriores, sus datos, secuencias y restricciones.
- [x] Verificar cuenta única por venta, claves de operación duplicadas, importes, referencias inválidas, borrado restringido y metadatos de anulación.
- [x] Validar Prisma, migraciones, ESLint y build con comprobación de tipos.
- [ ] Implementar el servicio de registro atómico de pagos, reintentos idempotentes, control de sobrepagos y autorización/trazabilidad de anulaciones.
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
- [x] Registrar la decisión del usuario sobre la estructura de stock mínimo con fecha.
- [x] Implementar el cambio aprobado de estructura de stock mínimo con su migración y documentación.
- [x] Ejecutar validación de Prisma, generar el cliente y revisar la migración de stock mínimo en PostgreSQL local.
- [x] Ejecutar `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build` para el cambio de estructura de stock mínimo.
- [x] Registrar la decisión e implementar la estructura de Empresa con respaldo, migración, cliente generado y documentación.
- [x] Validar Empresa antes y después de aplicar la migración, y completar ESLint y build con comprobación de tipos.
- [x] Registrar e implementar la estructura de Cobranza con respaldo, prueba previa, migración y cliente generado.
- [x] Completar validación posterior de Cobranza en PostgreSQL, Prisma, ESLint y build con comprobación de tipos.
- [ ] Marcar cada funcionalidad como completada solo después de verificar su comportamiento.

## 5. Registro de decisiones

| Fecha | Tema | Decisión | Motivo / alcance |
| --- | --- | --- | --- |
| 2026-10-06 | Stock mínimo | Aprobada e implementada la estructura | `WarehouseStock.minStock` opcional, `Decimal(14,3)`, sin default y con CHECK; migración aplicada, respaldo y cliente generado. Módulos fuera del alcance de esta etapa |
| 2026-10-06 | Empresa | Aprobada e implementada la estructura | `CompanyProfile` con PK y CHECK para `id = 1`, campos opcionales, tabla vacía, respaldo y cliente generado. Menú, formulario, validaciones de emisión y documentos históricos pendientes |
| 2026-10-06 | Cobranza | Aprobada e implementada la estructura | Cuenta única por venta, abonos con UUID de operación, fechas y motivos de anulación; migración compatible y cliente generado. Servicios, reglas de operación y pantallas pendientes |

## 6. Trabajo realizado en este documento

- **2026-10-06:** análisis del esquema y de la guía; alternativas y recomendaciones redactadas; checklists creadas. No se cambió el esquema, no se ejecutaron migraciones y no se modificó la guía de interfaz.
- **2026-10-06 (implementación de estructura):** stock mínimo migrado en PostgreSQL local y cliente Prisma regenerado. Respaldos en `backups/20261006_120436_stock_minimo/` (locales, excluidos de git). Detalle y validaciones en [CAMBIOS.md](CAMBIOS.md). La guía de interfaz y los módulos permanecen sin cambios.
- **2026-10-06 (estructura de Empresa):** `CompanyProfile` migrado y cliente regenerado, con prueba previa sobre tabla temporal y validación posterior. Respaldos en `backups/20261006_124537_empresa/` (locales, excluidos de git). Se conservaron Stock Mínimo, los datos existentes y la guía de interfaz; no se desarrollaron módulos.
- **2026-10-06 (estructura de Cobranza):** `AccountReceivable` y `Payment` migrados tras una prueba en tablas temporales; cliente Prisma regenerado. Respaldos en `backups/20261006_125530_cobranza/`. Se conservaron las 18 tablas previas y los campos heredados de las guías. Los tres puntos quedan preparados a nivel de estructura; los módulos y la lógica de cobro siguen pendientes.

- **2026-10-06 (módulo Empresa):** perfil único configurable y carga local de logo implementados y validados. Ver [etapas, reglas, almacenamiento y evidencias](HITO-EMPRESA.md). Requisitos de emisión y conservación de documentos históricos siguen pendientes de Ventas.

- **2026-10-06 (consultas de inventario):** Stock por bodega y Kardex implementados/validados con filtros y paginación de servidor; consulta del mínimo distingue `null` de cero. La edición de mínimos y sus alertas siguen pendientes. Ver [HITO-COMPRAS.md](HITO-COMPRAS.md) para las etapas siguientes y reglas de Compras aún sin respuesta.


- **07-10-2026 — Inventario etapa 1:** usuario aprobó configurar combinaciones nuevas con saldo cero y avisos/filtro sólo en Stock. Mínimos implementados/validados sin alterar cantidades/Kardex, con control concurrente y unidad protegida. Política de saldos negativos, ajustes/traslados, KPI y Dashboard siguen pendientes. Ver [HITO-INVENTARIO.md](HITO-INVENTARIO.md).
