# AGENTS.md

Instrucciones para Codex y otros agentes que trabajen en este repositorio. Aplican a todo el proyecto.

## Contexto y forma de trabajar

- **Proyecto:** MTX Metal ERP, para fabricación de estructuras metálicas por encargo o para obra propia. Organiza bodegas, materia prima, compras, cotizaciones, producción y entregas.
- **Idioma:** responde en español. Escribe comentarios, textos visibles y datos de ejemplo en español; conserva los nombres existentes de modelos, campos y APIs. Los valores de los enums del dominio están en español.
- **Stack:** Next.js 16 con App Router, React 19 con React Compiler, TypeScript estricto, Tailwind CSS v4 y Prisma 7 sobre PostgreSQL 15.
- **Estado actual:** el tema oscuro y el layout del ERP ya están implementados con shadcn/ui: sidebar responsive, barra superior, buscador de secciones y rutas provisionales. El Dashboard tiene estructura visual sin consultas. Unidades de medida, Bodegas, Proveedores, Clientes y Materias primas ya tienen CRUD completo con Server Actions y Prisma; Empresa también tiene consulta/configuración, carga local de logo y cuentas bancarias con principal y baja/reactivación lógica; Stock por bodega y Movimientos tienen consultas de sólo lectura con paginación/orden en PostgreSQL; Stock también permite configurar mínimos y filtrar reposición sin alterar existencias. Compras tiene listado, registro de documentos y recepciones parciales que generan entradas de stock/Kardex; cierre/anulación de compras también están implementados. Inventario incorpora ajustes, carga inicial y traslados inmediatos con correcciones vinculadas; traslados espera revisión funcional. Clientes admite contacto general y sucursales con Dirección/Ciudad y contacto propios, incluida Casa Central; Condiciones de Pago también tiene CRUD con bases Al día/30/60/90 días; Configuración de numeración documental también está implementada; su integración con documentos futuros sigue pendiente. Catálogo de productos incorpora CRUD con código UUID automático, recetas e imágenes locales múltiples; stock/Kardex e inventario inicial de terminado implementados y validados funcionalmente; ajustes/correcciones de terminado implementados y validados funcionalmente en P6. Cotizaciones, consumos de producción, autenticación y métricas reales siguen pendientes.
- Antes de editar, revisa `git status --short` y los archivos afectados. Conserva los cambios previos del usuario y limita la edición al alcance solicitado.
- Los envíos a GitHub quedan a cargo del usuario; no hacer push.
- Usa **pnpm** y conserva `pnpm-lock.yaml`. Consulta `package.json` para verificar scripts y dependencias disponibles.

## Fuentes de referencia

| Archivo | Cuándo consultarlo |
| --- | --- |
| `prisma/schema.prisma` | Modelos, relaciones, enums, precisión e índices reales |
| `prisma.config.ts` | Conexión, ubicación de migraciones y comando del seed |
| `src/lib/prisma.ts` | Instancia compartida del cliente de base de datos |
| `docs/GUIA-INTERFAZ.md` | Diseño visual, navegación, Dashboard y fases propuestas; leer antes de trabajar en la interfaz |
| `docs/AVANCES-INTERFAZ.md` | Checklist del tema, layout, verificaciones y trabajo pendiente de la interfaz |
| `docs/MANTENEDORES-DATOS.md` | Orden y checklist de los CRUD básicos; requisitos de tablas, formularios y confirmaciones |
| `docs/HITO-EMPRESA.md` | Etapas de Configuración de Empresa implementada, almacenamiento local de logo/futuro S3 y validaciones; revisión funcional pendiente |
| `docs/HITO-INVENTARIO.md` | Mínimos y ajustes/carga inicial aprobados; traslados implementados, validaciones/checks y revisión funcional pendiente |
| `docs/HITO-PRODUCTOS.md` | Catálogo/recetas/imágenes implementados; clasificación de bodegas implementada; stock inicial de terminado validado y ajustes/correcciones P6 con revisión funcional pendiente |
| `docs/HITO-COTIZACIONES.md` | Reglas comerciales aprobadas, Orden de Compra Cliente, catálogo/stock terminado, anticipos y vencimiento por factura; Condiciones de Pago implementadas, demás dependencias pendientes |
| `docs/HITO-ORDEN-COMPRA-CLIENTE.md` | D1–D10 aprobadas; registro/consulta/anulación implementados, detalle/importes propios y cuenta única; validación funcional aprobada y contratos de Producción posteriores |
| `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md` | Plan vigente, M1/MR y creación/consulta/edición/confirmación del plan con reservas implementadas y migradas; inicio y producción/avances implementados; reversión, cierre/factura y PDF pendientes |
| `docs/HITO-COMPRAS.md` | Consultas de Stock/Kardex implementadas y etapas de Compras; reglas pendientes de respuestas explícitas |
| `docs/PROPUESTAS-DOMINIO.md` | Alternativas, decisiones y checklists de stock mínimo, empresa y cobranza; consultar antes de implementar esos temas |
| `diseno-01.jpeg`, `diseno-02.jpeg` | Referencias visuales de la guía |
| `docs/CAMBIOS.md` | Decisiones y registro de cambios de esquema o arquitectura |
| `CLAUDE.md` | Documento original de las reglas del proyecto |

Distingue el estado real del código de las propuestas de la guía. Si encuentras una discrepancia, explícala y no presentes una funcionalidad planeada como implementada. Leer la guía no autoriza a implementarla completa ni a modificarla.

## Comandos

Ejecuta los comandos desde la raíz. El desarrollo usa el puerto **3030**; `pnpm start` usa el puerto predeterminado de Next.js salvo configuración de entorno.

```bash
pnpm install                  # instalar dependencias
pnpm dev                      # http://localhost:3030
pnpm build                    # compilación de producción y comprobación de tipos
pnpm start                    # servir una compilación de producción existente
pnpm lint                     # ESLint 9: next core-web-vitals + TypeScript
pnpm exec tsc --noEmit         # comprobación de tipos independiente

# PostgreSQL local: elegir una de las dos configuraciones
docker compose up -d
docker compose -f docker-compose.fedora.yml up -d

# Prisma
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev --name <descripcion>
pnpm prisma migrate status
pnpm prisma migrate deploy    # aplicar migraciones existentes en el entorno de destino
pnpm prisma db seed           # usa npx tsx prisma/seed.ts, según prisma.config.ts
pnpm prisma studio
```

- `.env` proporciona `DATABASE_URL`. No copies secretos al código, a documentación ni a la respuesta.
- El Compose estándar contiene credenciales locales fijas. La variante Fedora lee `POSTGRES_PASSWORD` desde `.env` y expone PostgreSQL solo en `127.0.0.1:5432`. Ambas usan el mismo nombre de contenedor; no las levantes simultáneamente.
- No ejecutes migraciones, seed ni despliegues solo para revisar documentación. Verifica el entorno de destino antes de cualquier escritura en la base.

## Arquitectura de aplicación y Prisma

- `src/app/` contiene rutas, layouts y estilos globales del App Router. `@/*` apunta a `src/*`.
- Mantén el acceso a la base de datos en el servidor. Usa Server Components para lecturas y limita `"use client"` a componentes que requieran interacción o APIs del navegador.
- Importa la instancia compartida con `import { prisma } from "@/lib/prisma"`. **Solo `src/lib/prisma.ts` crea `PrismaClient`**; reutiliza la instancia en desarrollo sólo si coincide el constructor del cliente generado. Al regenerar/HMR, sustituye una instancia antigua y desconecta su pool. Administra conexiones mediante `PrismaPg` de `@prisma/adapter-pg`.
- La conexión se configura en `prisma.config.ts`, que carga `dotenv/config` y lee `DATABASE_URL`. La URL no va en `schema.prisma`. El cliente compartido también exige esa variable y registra consultas SQL únicamente fuera de producción.
- El generador es `prisma-client`, con salida en `src/generated/prisma/`, ignorada por git. Importa los tipos y enums del servidor desde `@/generated/prisma/client`, no desde `@prisma/client`. No edites ni subas el código generado.
- Ejecuta `pnpm prisma generate` después de clonar o cambiar el esquema. En Prisma 7, `migrate dev` no regenera el cliente.
- Cambia el esquema mediante migraciones versionadas en `prisma/migrations/`: editar esquema → `pnpm prisma migrate dev --name <descripcion>` → `pnpm prisma generate`. **No uses `prisma db push`**.
- No reinicies ni borres bases o volúmenes sin consentimiento explícito del usuario. Si Prisma exige `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`, usa únicamente la confirmación real del usuario para esa acción; nunca inventes su contenido ni eludas el bloqueo.
- En las consultas de inventario con `RepeatableRead`, carga las relaciones mediante lotes escalares con `await` secuencial usando el mismo cliente de transacción. Los `select`/`include` con relaciones hermanas pueden provocar consultas internas simultáneas en un único cliente `pg`; no uses `Promise.all` sobre ese cliente. Las consultas independientes fuera de la transacción pueden ejecutarse en paralelo con el pool compartido.
- El seed carga `dotenv/config` antes de importar el cliente compartido y usa `upsert` para los datos base. Actualmente incluye una contraseña en texto plano: la autenticación y el uso de bcrypt son trabajo pendiente.
- `.claude/skills/`, `.agents/skills/` y `.windsurf/skills/` contienen skills de Prisma administradas mediante `skills-lock.json`. No las edites a mano. Usa la skill correspondiente cuando trabajes en consultas, CLI, conexión o cambios específicos de Prisma.

## Dominio y reglas obligatorias

Flujo principal: **Cotización → Orden de venta → Orden de trabajo → Guía de despacho**.

| Área | Modelos y relaciones principales |
| --- | --- |
| Autenticación | `Role` → `User` |
| Materiales | `UnitMeasure` → `RawMaterial` |
| Inventario | `Warehouse`, `WarehouseStock`, `StockMovement` |
| Compras | `Supplier`/`DocumentType` → `Purchase` → `PurchaseDetail`, `PurchaseReceipt`/`PurchaseReceiptDetail`, `PurchasePendingClosure` y `PurchaseOperation` |
| Ventas | `Client` → `Quote` → `QuoteDetail` y `SalesOrder` |
| Producción y entregas | `WorkOrder` → `WorkOrderDetail` y `DeliveryNote` |
| Empresa | `CompanyProfile`: perfil único de la empresa que usa el ERP |
| Cobranza | `SalesOrder` → `AccountReceivable` (máximo una) → `Payment` (abonos) |

- **Cambio de unidad:** en Materias primas sólo se permite si no hay registros de stock (incluso cero), movimientos, compras, trabajos, cotizaciones ni recetas de productos. Otros campos siguen editables. La comprobación se realiza en el servidor dentro de una transacción que bloquea la fila antes de revisar referencias.
- **Unidad única:** todas las cantidades de un material usan su `unitMeasure`; no hay conversiones entre unidades. `UnitMeasure.name` es único.
- **Precisión:** dinero en `Decimal(14,2)` y cantidades en `Decimal(14,3)`. Calcula con `Prisma.Decimal` y métodos como `.plus()` y `.times()`; no uses `+`, `*` ni conversiones a `number` para cálculos del dominio.
- **Stock y kardex:** cada cambio en `WarehouseStock.quantity` debe crear su `StockMovement` en la misma `prisma.$transaction`, usando el cliente de esa transacción para ambas operaciones. El saldo debe coincidir con la suma de movimientos para la misma bodega y material.
- **Stock único:** conserva `@@unique([warehouseId, rawMaterialId])` en `WarehouseStock`.
- **Stock mínimo:** `WarehouseStock.minStock` es `Decimal(14,3)` opcional por material y bodega. `null` significa sin configurar; cero es válido. El CHECK `WarehouseStock_minStock_nonnegative_check` rechaza negativos y `NaN`; está definido en la migración SQL y debe conservarse. Cambiar el mínimo no altera cantidades ni genera movimientos. Consulta/configuración de mínimos y aviso/filtro de reposición en Stock están implementados; KPI/Dashboard/notificaciones siguen pendientes; ajustes y traslados se implementaron en el Hito de Inventario.
- **Empresa:** `CompanyProfile` admite como máximo un registro con `id = 1`, garantizado por PK y el CHECK SQL `CompanyProfile_singleton_check`; no usa autoincremento. Sus datos son opcionales para permitir configuración gradual y la migración no crea un perfil ficticio. El formulario valida/normaliza el RUT; los requisitos de emisión deben implementarse en los módulos futuros. No uses los datos actuales del perfil para alterar documentos históricos ya emitidos.
- **Cobranza:** `AccountReceivable.salesOrderId` es único; el importe acordado es `Decimal(14,2)` no negativo. Cada `Payment` tiene importe positivo, medio no vacío y `idempotencyKey` UUID obligatorio y único, sin default: reutilizar la misma clave en reintentos. Los CHECK SQL rechazan `NaN` y exigen fecha y motivo no vacío juntos al anular cuentas o pagos. Conservar esas restricciones y las FK con `onDelete: Restrict`.
- **Saldo y vencimiento:** calcular el saldo desde el importe menos los pagos no anulados; excluir cuentas anuladas del total por cobrar. `dueDate` y `paymentPromiseDate` son fechas de calendario (`@db.Date`) independientes. No guardar estados/saldos duplicados ni usar el total de cada guía como deuda. El control transaccional de sobrepagos, la idempotencia del servicio, las anulaciones y los permisos siguen pendientes del módulo; la estructura no los implementa por sí sola.
- **Transición de cobranza:** `DeliveryNote.paymentStatus`, `paymentPromiseDate` y `voucherUrl` son campos heredados conservados. Las nuevas operaciones usarán cuentas y abonos. No deduzcas pagos antiguos solo por el estado de una guía ni retires esos campos sin revisar la transición.
- **Signo de movimientos:** `ENTRADA` suma, `SALIDA` resta y `AJUSTE` puede sumar o restar. Vincula compras y consumos con sus detalles de origen cuando corresponda. No edites movimientos históricos; corrige errores con un nuevo `AJUSTE`.
- **Bodega:** Compras tiene una bodega de recepción en `Purchase.warehouseId`; las líneas coinciden mediante FK compuesta. Producción conserva bodega por línea en `WorkOrderDetail.warehouseId`. Traslados entre bodegas aún pendientes.
- **Cotizaciones:** precios finales en pesos enteros con IVA incluido; redondear cada línea al peso, sumar subtotal y aplicar descuento global antes del desglose neto/IVA con la tasa histórica. Usa calcularImportesCotizacion y Prisma.Decimal. QuoteDetail.kind diferencia MATERIA_PRIMA, PRODUCTO y SERVICIO; rawMaterialId null por sí solo no identifica un servicio.
- **Obra propia:** `WorkOrder.salesOrderId = null` significa fabricación sin cliente. También consume materiales; no fuerces una orden de venta ni un cliente ficticio.
- **Fechas:** todos los modelos tienen `createdAt`; todos salvo `StockMovement` tienen `updatedAt`. `date` es la fecha del documento o hecho, que puede indicarse manualmente; `createdAt` es la fecha de registro. `Quote.validUntil` es el vencimiento opcional de la oferta.
- **Índices:** toda clave foránea nueva debe quedar cubierta por un índice apropiado. Sigue el patrón de `@@index` existente y considera la cobertura de índices compuestos o únicos.
- **Logo de Empresa:** carga local en `var/empresa/logos/` o `EMPRESA_LOGO_DIR`, con contrato `AlmacenLogo` para futuro S3. Respaldar esa carpeta junto con PostgreSQL. No borrar versiones anteriores automáticamente ni aceptar rutas/URLs libres desde el formulario. Ver `docs/HITO-EMPRESA.md`.
- **Archivos:** `SalesOrder.pdfUrl` y `DeliveryNote.voucherUrl` son campos para URLs; la integración con AWS S3 todavía está prevista para más adelante.

## Base de la interfaz

La fuente detallada es `docs/GUIA-INTERFAZ.md`, cuyas fases de tema y layout ya están implementadas; consulta el estado detallado en `docs/AVANCES-INTERFAZ.md`. Respeta las decisiones posteriores del usuario al desarrollar cada fase.

- **Dirección visual propuesta:** `diseno-02` como base, tema oscuro grafito con tinte azul, acento azul para acciones y naranjo para detalles de marca. De `diseno-01` se contempla solo un toque metálico opcional en cabeceras de tarjetas. Se excluye el visualizador del producto.
- **Sistema visual:** shadcn/ui sobre Tailwind v4, tokens CSS en `.dark` registrados en `@theme inline`, Inter como fuente principal, Geist Mono para códigos e iconos de `lucide-react`. Usa `tabular-nums` para cifras, badges con texto y barras de stock acompañadas de números. Verifica contraste y foco al implementar; no asumas que todos los valores propuestos ya cumplen accesibilidad.
- **Estructura:** sidebar contraíble a iconos en escritorio y panel lateral en móvil; barra superior con breadcrumbs, buscador `Ctrl+K`, notificaciones y usuario. Dashboard en `/`, con KPIs, requerimientos frente a stock, órdenes activas, gráfico de cotizaciones, vencimientos y últimos movimientos.
- **Navegación propuesta:** Mantenedores, Inventario, Compras, Ventas y Trabajos. Administración se incorpora cuando exista el login. Centraliza menú, rutas e iconos en `src/config/navegacion.ts`.
- **Organización propuesta:** `src/app/(app)/` para el ERP; `(auth)` para el futuro login; `src/components/layout/` para sidebar y barra superior; `src/components/` para componentes compartidos; `src/lib/consultas/`, `src/lib/validaciones/` y `src/lib/formato.ts` para consultas, validación y formato.
- **Datos y formularios:** consultas del Dashboard en el servidor, con agregaciones en lugar de cargar todas las filas. Envía `Decimal` como texto a componentes cliente; normaliza fechas a ISO cuando el contrato de datos lo requiera. La guía propone Server Actions y esquemas zod compartidos para formularios futuros.
- **Formato chileno:** `es-CL`, moneda CLP, cantidades con hasta tres decimales y unidad, fechas `dd-MM-yyyy`, horas `HH:mm` y RUT con puntos y guion.
- **Estado de las propuestas:** están implementadas y migradas las estructuras de Stock Mínimo (`WarehouseStock.minStock`), Empresa (`CompanyProfile`) y Cobranza (`AccountReceivable` y `Payment`); consulta `docs/PROPUESTAS-DOMINIO.md`. La paleta, los grupos del menú y las rutas provisionales ya están implementados, incluyendo Cobranza y Configuración → Empresa. Las escrituras de Compras y sus recepciones están implementadas; los restantes procesos, las alertas y los indicadores con datos reales siguen pendientes. La guía mantiene su propuesta original; para estas estructuras usa el esquema actual y las decisiones registradas.
- **Secuencia propuesta:** tema → layout y navegación → componentes compartidos → Dashboard → mantenedores → procesos → autenticación y roles. Instala dependencias al abordar la fase correspondiente y verifica la documentación oficial vigente de shadcn/ui antes de usar su CLI o elegir componentes.

## Mantenedores de datos

- Sigue `docs/MANTENEDORES-DATOS.md`: Unidades de medida → Bodegas → Proveedores → Clientes → Materias primas, un módulo a la vez, comenzando por sus datos existentes.
- Cada CRUD usa tabla con filtro superior y acciones Crear, Ver, Editar y Eliminar. Los formularios se muestran sobre el listado, sin navegar fuera de él, con título acorde y modo de consulta de solo lectura.
- Todo selector de datos que dependa de otro mantenedor debe incluir búsqueda interna para filtrar sus opciones rápidamente, con manejo de teclado y estados sin coincidencias.
- Usa componentes reutilizables para confirmación de eliminación y alertas del sistema. Nunca uses los diálogos nativos de JavaScript (`alert`, `confirm`, `prompt`).
- Antes de continuar con una decisión que requiera aclaración del usuario, pregunta y espera su respuesta. Actualiza los checks únicamente para funciones implementadas y validadas.

## Validación y cierre

- Después de cada validación, detén los servidores de aplicación que hayas iniciado para comprobar el cambio y verifica que sus puertos queden libres (desarrollo: 3030). Revisa los procesos existentes antes de iniciar la validación; no detengas servidores del usuario ni procesos ajenos. Si el puerto sigue ocupado por un proceso previo, informa de ello. No dejes un servidor de validación ejecutándose al terminar, salvo petición explícita del usuario.
- Para cambios de código, ejecuta `pnpm lint` y `pnpm build`. Añade comprobaciones específicas cuando la lógica del dominio lo requiera; actualmente no hay framework de pruebas ni script `test`.
- Para cambios de esquema, valida Prisma, genera el cliente y verifica la migración en el entorno autorizado antes de las comprobaciones de aplicación.
- Para cambios solo de documentación, revisa contenido, rutas y diff; no es necesario ejecutar build, levantar servicios ni tocar la base de datos.
- Documenta cambios de esquema o arquitectura en `docs/CAMBIOS.md`: qué cambió, por qué y para qué sirve. La guía también pide registrar cada fase implementada de interfaz.
- Al terminar, revisa el diff y explica en español qué cambió, cómo se verificó y cualquier limitación real. No afirmes haber ejecutado comprobaciones que no realizaste.

## Consultas de inventario y continuación

- Stock y Kardex son de sólo lectura: no crear combinaciones al consultar, no editar movimientos históricos y no sumar cantidades de unidades diferentes.
- `src/lib/consultas/inventario.ts` valida filtros, pagina/ordena en servidor y lee total/filas con `RepeatableRead`. Los catálogos usan los selectores buscables existentes; sus opciones se cargan completas por ahora.
- `src/lib/formato.ts` recibe cantidades como texto decimal. `src/lib/fechas-chile.ts` calcula días completos de Santiago; no usar un desplazamiento horario fijo ni suponer que todos los días duran 24 horas.
- Compras tiene reglas principales aprobadas: recepción parcial, una bodega por compra, precio por presentación y factor histórico, identidad proveedor/tipo/número, redondeo por línea, bloqueo estructural tras primera recepción y cierre de pendientes con motivo. Ver `docs/HITO-COMPRAS.md` para checklist y precisiones pendientes; no asumir respuestas por silencio. La estructura de Tipos de documentos/recepciones está migrada, con compra vacía como precondición de la migración. Tipos de documentos es catálogo fijo (Factura de Compra, Boleta de Compra y Guía de Compra), sin CRUD por ahora. Listado/formulario y registro de Compras ya están implementados, con precio inmutable, confirmación, versiones e idempotencia de creación/eliminación. Recepciones parciales operativas implementadas; cierre/anulación implementados; traslados implementados con revisión funcional pendiente.

- **Compras, estructura vigente:** `quantity` del detalle es total en unidad de inventario; `purchasedQuantity` y `unitFactor` conservan la presentación histórica. CHECK exige equivalencia exacta e importe por línea redondeado a dos decimales con empates hacia arriba. Trigger impide cambiar `unitPrice` desde guardar. Preservar CHECK/trigger al trabajar con Prisma.
- **Compras, operaciones implementadas:** Confirmación, RUT/snapshots, suma decimal, bloqueo estructural tras recepción o cierre, recepciones/cierres/anulación idempotentes y escritura atómica de stock están implementados en `src/lib/servicios/compras.ts`. Los servicios verifican consumo/traslado/ajuste negativo antes de anular; preservar estas reglas, porque el esquema por sí solo no las ejecuta. Eliminación es lógica sólo tras anular; no borrar documentos/movimientos históricos ni liberar su identidad.

- **Catálogo documental fijo:** usar `src/config/tipos-documento-compra.ts` como opciones permitidas de Compras. `pnpm exec tsx prisma/seed.ts --documentos` carga sólo esos tipos; no ejecutar el seed general para actualizar únicamente documentos. No usar sus códigos internos como códigos tributarios.

- **Compras, interfaz:** `/compras` lista/pagina/ordena en servidor y abre formularios sobre el listado. Guardar registra únicamente documento/líneas; no sumar stock. Eliminar sólo oculta compras previamente anuladas. La creación/eliminación es idempotente; edición usa versión. `tests/compras.integration.ts` exige copia local; no conservar fixtures en la base real.


## Continuación de Compras: recepción implementada

- La etapa 5 de `docs/HITO-COMPRAS.md` está implementada y validada. La acción Recibir registra parte o algunas líneas en la bodega de compra; confirma equivalencias en servidor y actualiza Stock/Kardex atómicamente.
- `recibirCompra` en `src/lib/servicios/compras.ts` conserva factor/precio/mínimo; usa bloqueos Compra → materiales ascendentes → saldos ordenados y evita consultas paralelas dentro de tx. Reintentos con UUID/huella se reconocen antes de comprobar la versión, incluso después de esperar bloqueos.
- `tests/compras-recepciones.integration.ts` requiere copia local `mtx_validacion_recepciones_*`; crea fixtures y un trigger temporal para probar rollback, por lo que se debe retirar esa copia al terminar. Nunca ejecutar sobre la base real.
- Cierre/anulación completos y validados; falta la revisión funcional final del usuario para cerrar el hito.


## Compras: cierre técnico completo

- Etapas 6 y validación técnica 7 implementadas; sólo queda aprobación funcional del usuario en `docs/HITO-COMPRAS.md`.
- `cerrarPendienteCompra` cierra todo el pendiente de una línea con motivo e idempotencia sin tocar stock. Por decisión explícita, primera recepción **o primer cierre** bloquean identidad/bodega/líneas; sólo fecha editable.
- `anularCompra` verifica referencias de entrada, salidas/ajustes negativos posteriores usando ID de Kardex, stock suficiente y suma de movimientos. Revierte recibido con ajustes vinculados en la misma tx de stock/anulación/operación; conserva historial y permite eliminación lógica posterior.
- Los futuros consumos/traslados deben insertar movimientos después de bloquear materiales/saldos, conservando el orden ascendente de bloqueos y los IDs históricos: las fechas manuales no establecen el orden de registro.
- `tests/compras-cierre.integration.ts` sólo puede ejecutarse sobre copia local descartable. Incluye trigger temporal para probar rollback, consumos, reposición y concurrencia; retirar copia y servidores al terminar.


## Inventario: etapa 1 implementada

- Stock por bodega admite configurar mínimos existentes o nuevas combinaciones con saldo cero, sin movimientos; quitar mínimo conserva fila/historial. Consultas y Kardex siguen sin escribir.
- `src/lib/servicios/minimos-inventario.ts` bloquea material → stock, valida unidad del catálogo y controla cambios por ID/updatedAt/mínimo anterior. Repetir el mínimo vigente no escribe. No modificar cantidades al configurar ni sobrescribir mínimos creados por otra solicitud.
- Filtro `reposicion` compara quantity < minStock en PostgreSQL antes de contar/paginar. Estados derivados con Decimal; min null y cero distintos. Negativos existentes son incidencia; las nuevas operaciones deben impedir saldos finales negativos.
- `tests/minimos-inventario.integration.ts` exige copia `mtx_validacion_minimos_*`. No modificar esquema para mínimos; el campo/CHECK ya existen. No incluir Dashboard/campana ni avanzar a ajustes/traslados sin resolver sus decisiones en `docs/HITO-INVENTARIO.md`.


## Ajustes e inventario inicial

- `InventoryAdjustment` conserva conteo anterior/final, diferencia, fecha calendario, motivo enum, observación obligatoria y vínculo opcional de corrección. Documento inmutable; nunca editar ni borrar para corregir.
- `InventoryOperation` registra UUID estable, huella y ajuste en la misma transacción que stock/movimiento. Reintentar el mismo contenido antes de evaluar versión; no reutilizar `PurchaseOperation`.
- El usuario indica saldo físico final no negativo; calcular diferencia con Decimal bajo bloqueo material → stock. Verificar versión y saldo = Kardex antes de escribir. Conteo sin diferencia no crea documento, movimiento, stock ni operación.
- Inventario inicial sólo sin movimientos y con saldo cero para material/bodega; una fila cero de mínimos sí lo permite. Las correcciones son nuevos conteos del saldo actual vinculados al ajuste previo, no reversiones automáticas.
- Fecha actual/pasada, nunca futura según Santiago; mínimo intacto y movimiento AJUSTE con signo. Un ajuste negativo posterior bloquea anulación de Compras aun con reposición y fecha manual anterior.
- Ver `docs/HITO-INVENTARIO.md` para avances y revisión funcional de traslados. Revisar funcionalidades contra el código actual, porque las descripciones iniciales anteriores a este hito conservan contexto histórico.


## Traslados entre bodegas

- `InventoryTransfer` documenta un material, origen/destino distintos, cantidad positiva y saldos históricos de ambas bodegas. Traslado inmediato, sin tránsito ni recepción posterior. Motivo fijo y observación obligatoria; fecha actual/pasada sin futuro.
- `InventoryOperation` tiene exactamente un origen: ajuste o traslado, mediante CHECK SQL. Reutilizar UUID/huella en reintentos; reconocer resultado anterior antes de comprobar versiones.
- Bloquear material → filas de stock por ID ascendente. Validar ambas referencias, saldo/Kardex, suficiencia del origen y límite de destino. Conservar mínimos independientes, crear destino nuevo sólo al confirmar. Stock, SALIDA negativa, ENTRADA positiva, documento y UUID se registran juntos.
- Vínculos tipados `outgoingTransferId`/`incomingTransferId` en Kardex y FK compuestas aseguran misma bodega/material. SQL exige ambos movimientos y operación al confirmar; movimientos/documentos de traslado inmutables.
- Corrección: traslado inverso completo vinculado, con saldo suficiente; una corrección directa por documento. Conservar cadena y bloquear duplicados. Trasladar de regreso nunca desbloquea anulación histórica de Compras.
- No editar ni borrar la migración de Ajustes anterior: la migración de Traslados amplía `InventoryOperation`. Ver `docs/HITO-INVENTARIO.md`; aprobación funcional del módulo aún pendiente.

- Las pruebas que escriben en una misma copia PostgreSQL deben ejecutarse secuencialmente: algunas regresiones comparan conteos globales. Para paralelizar, usar copias distintas.


## Continuación comercial

- PaymentCondition tiene CRUD en `/mantenedores/condiciones-pago`, nombre único normalizado y días enteros no negativos. Editar/eliminar verifica versión entera; FK Restrict protege cotizaciones. Quote prepara referencia y copia de nombre/plazo opcionales; no inferir acuerdos para registros existentes ni reescribir snapshots al editar catálogo. Integración con registro de Cotizaciones pendiente.
- El nombre visible futuro de SalesOrder es **Orden de Compra Cliente** y generará una sola Orden de Trabajo. Unicidad de trabajo, catálogo/producción/stock terminado y cálculos de Cotizaciones todavía no se implementaron: seguir checkpoints de HITO-COTIZACIONES.
- Plazo de pago desde fecha de factura registrada al finalizar trabajo; anticipos vinculados a la orden, sin vencimiento ficticio previo. Estado/saldo derivados de abonos.


## Clientes y sucursales

- ClientBranch pertenece a Client. El CRUD guarda cliente/sucursales en una sola transacción con bloqueo y timestamp monotónico; requiere Casa Central y contactos generales/de sucursal con nombre/teléfono, Dirección/Ciudad sin Comuna, correo opcional.
- LegacyIncomplete conserva sólo datos incompletos migrados sin inventarlos; completar campos al guardar y retirar marca. No copiar otra vez el contacto general sobre contactos de sucursales existentes.
- Nombres únicos normalizados por cliente, Casa Central única y trigger diferido al modificar sucursales. El servicio garantiza creación con sucursales; no insertar clientes mediante herramientas externas sin completar su Casa Central.
- Quote prepara FK compuesta (clientBranchId, clientId) y snapshots; integración de selector y creación del documento pendiente. No reescribir snapshots al editar Cliente/sucursal. Restrict protege sucursales referenciadas; Cascade elimina sucursales sólo al eliminar un cliente sin documentos.


## Numeración documental

- `/configuracion/numeracion` configura cuatro tipos internos fijos: Cotización, Orden de Compra Cliente, Orden de Trabajo y Guía de Despacho. `DocumentNumbering` inicia sin número ni dígitos; no inventar inicio ni inferir folios del ID/documentos externos.
- Folio al primer guardado; secuencia continua sin reinicio anual. Tras primer uso, prefijo/dígitos inmutables y próximo número sólo puede adelantarse; nunca reciclar anulados/eliminados. `DocumentFolio` es permanente y sus CHECK/triggers SQL se conservan.
- `asignarFolio` en `src/lib/servicios/numeracion.ts` recibe cliente de transacción y UUID estable. Debe llamarse dentro de la transacción que crea el documento: validar antes su contenido/idempotencia y guardar el folio/vínculo allí. No reservar al consultar/abrir formulario. Integración en módulos comerciales todavía pendiente.
- Contadores BigInt, enviados como texto al cliente; hasta 18 dígitos positivos. Ancho mínimo 1–18 sin truncar; prefijo opcional hasta 20 caracteres. Último número genera estado agotado. Bloqueos UUID → secuencia y versión para configuración, consultas secuenciales en tx.
- `tests/numeracion.integration.ts` sólo en copia local `mtx_validacion_numeracion_*`; conserva asignaciones de prueba porque son inmutables: retirar copia completa al terminar. Ver HITO-COTIZACIONES para avances y límites.


## Cuentas bancarias de Empresa

- CompanyBankAccount pertenece al perfil único (companyId=1); no crear Empresa ni cuentas implícitamente. La primera cuenta es principal; desde entonces debe existir exactamente una principal activa. Cambiarla explícitamente antes de desactivar la actual. Todas las bajas son lógicas, incluidas cuentas sin referencias; no borrar historial.
- Banco/tipo/número/titular/RUT obligatorios, correo opcional; banco/tipo como texto libre. Número como texto preservando ceros; identidad normalizada banco/tipo/número única. Normalizar RUT y validar DV; conservar función/CHECK SQL y triggers de principal/bloqueo.
- Operaciones en `src/lib/servicios/cuentas-bancarias.ts`: bloqueo del perfil antes de cuentas, consultas secuenciales y versión entera. Cambiar principal comprueba también principal anterior esperada; desmarcar/marcar en una sola tx. Formularios y tabla integrados en Empresa.
- Quote.bankAccountId opcional con Restrict y siete campos de snapshot, CHECK de copia completa. `datosBancariosParaCotizacion(tx,id?)` prepara copia en la tx del futuro documento: undefined propone principal, null omite cuenta, ID explícito exige activa. Consultar/editar Empresa no reescribe snapshots. Integración en Cotizaciones aún pendiente; selector futuro debe tener búsqueda interna.
- `tests/cuentas-bancarias.integration.ts` sólo en copia local descartable `mtx_validacion_bancos_*`: crea fixtures y trigger temporal de rollback; retirar copia completa al cerrar. Checkpoints en HITO-EMPRESA/HITO-COTIZACIONES.


## Catálogo de productos y recetas

- Product.code UUID generado por el sistema, único e inmutable; no confundir con creationKey UUID/huella para reintentar creación. Precio sugerido opcional, final con IVA y pesos enteros; guardar no cambia existencias. Baja lógica conserva identidad/archivos y se bloquea si hay cotizaciones.
- Receta por una unidad del producto, materiales únicos y cantidades positivas Decimal(14,3), sin bodega fija. Bloquear materiales ascendentes → producto y usar consultas escalares secuenciales en la transacción. Editar/bajar con versión. Producto sin receta se puede guardar; producción futura deberá exigir receta y conservar su copia histórica.
- Unidad bloqueada por receta/cotizaciones/inventario incluso cero en servicio y SQL. RawMaterial.productRecipes también bloquea cambio de unidad/borrado del material. Stock terminado ya extiende bloqueos de unidad/baja a esas referencias, incluso saldo cero.
- ProductImage usa almacenamiento local `var/productos/imagenes/` o PRODUCTO_IMAGEN_DIR, con contrato AlmacenImagenesProducto reemplazable por S3. Hasta diez PNG/JPG/WebP de 2 MB, validación real, hasta 16 megapíxeles y reprocesado PNG/1600 px; primera imagen principal. Retirada lógica conserva archivos anteriores; limpiar únicamente archivos nuevos de una transacción fallida. Respaldar carpeta con PostgreSQL. API exige clave generada/referencia existente; sin rutas/URLs libres.
- QuoteDetail prepara productId/código/unidad históricos y exclusión de materia prima; integración en Cotizaciones pendiente. No inferir productos en documentos existentes ni reescribir snapshots.
- tests/productos.integration.ts sólo sobre copia local `mtx_validacion_productos_*` y PRODUCTO_IMAGEN_DIR aislado con `imagenes-validacion`. Incluye fixtures, trigger temporal de rollback y archivos: retirar copia y servidor propio al terminar. Ver HITO-PRODUCTOS para evidencia/checks.
- Stock inicial de terminado aprobado sin consumo de materia prima, sólo sin movimientos y saldo cero por producto/bodega. Implementado y validado funcionalmente en P5; P6 agrega conteos y correcciones de terminado. El usuario pedirá un reseteo de compras/productos después; conservar datos hasta esa petición.


## Clasificación de bodegas

- Warehouse.classification usa WarehouseClassification: MATERIA_PRIMA, PRODUCTO_TERMINADO o MIXTA. Nullable sin default sólo preserva legado sin clasificar; el formulario/servicio de Bodegas exige elección explícita al crear/guardar. No reclasificar automáticamente las existentes ni volver una clasificada a null.
- Bodega exclusiva PRODUCTO_TERMINADO no admite referencias/escrituras de materia prima. Selectores actuales de Compras/Inventario la excluyen; triggers SQL protegen WarehouseStock, StockMovement, Purchase/PurchaseDetail, WorkOrderDetail, InventoryAdjustment e InventoryTransfer y serializan cambios de clasificación.
- Referencias de material, incluso stock cero/mínimos/historial, bloquean conversión a terminado exclusivo. Legado sin clasificar sigue operativo; MATERIA_PRIMA/MIXTA son aptas para operaciones actuales. Stock terminado exige PRODUCTO_TERMINADO/MIXTA y protege recíprocamente el cambio de tipo, incluso con saldo cero.
- Tests/bodegas-clasificacion.integration.ts sólo en copia local mtx_validacion_bodegas_*; clasificación no implementa stock inicial/producción de terminado. Ver HITO-PRODUCTOS para avances y revisión pendiente.


## Productos terminados: stock inicial P5

- `/inventario/productos-terminados` consulta stock, ingresos iniciales y Kardex propios. ProductWarehouseStock/ProductInitialStock/ProductStockMovement/ProductInventoryOperation están migrados y operativos; P5/P6 validados funcionalmente. Ver docs/HITO-PRODUCTOS.md.
- `registrarInicialTerminado` usa Decimal(14,3), fecha actual/pasada de Santiago y observación; sólo producto activo y bodega PRODUCTO_TERMINADO/MIXTA. Combinación sin movimientos y saldo cero; receta opcional. Cero no crea documento/stock/movimiento/UUID. Nunca consume materia prima.
- UUID/huella antes de versión y bloqueos UUID → producto → bodega → stock; saldo/documento/ENTRADA/operación en la misma tx, consultas secuenciales. Conservar CHECK/triggers de balance, inmutabilidad, snapshots y documento completo.
- Stock incluso cero bloquea cambiar unidad o dar baja al producto y reclasificar la bodega como exclusiva de materia prima.
- ProductStockMovement admite origen inicial o ajuste mediante XOR y FK compuestas; fabricación/salidas requieren nueva migración y reglas antes de habilitarse. No repetir inicial para corregir ni usar servicios de inventario de materias primas.
- `tests/stock-terminado.integration.ts` escribe sólo en copia local descartable `mtx_validacion_terminado_*`; retirar copia/servidor al terminar.


## Ajustes de producto terminado P6

- ProductInventoryAdjustment guarda saldo anterior/final, diferencia firmada, snapshots, fecha de calendario, motivo y observación. Inmutable; CORRECCION_REGISTRO identifica exactamente un ingreso inicial o ajuste previo del mismo producto/bodega. No revertir a ciegas documentos antiguos.
- `registrarAjusteTerminado` en stock-terminado.ts conserva orden de bloqueo/UUID de P5, compara versión/cantidad/último ID y suma de Kardex; inicial/ajuste comparten espacio de UUID, con huella distinta. Documento/AJUSTE/stock/operación juntos; reintento antes de versión.
- Sólo combinaciones ya registradas con movimientos; primero usar inicial si no hay historial. Conteo final cero válido, sin diferencia no escribe. Cero nunca permite repetir inicial. Fecha futura prohibida según Santiago, observación obligatoria, motivos enum existentes excepto INVENTARIO_INICIAL. No requiere receta ni consume materia prima.
- Vista previa y cantidades en servidor con Decimal; cliente recibe textos. ProductInventoryOperation tiene exactamente un initialStockId o adjustmentId; conservar CHECK/triggers de origen, balance, documento completo e inmutabilidad.
- Ruta existente `/inventario/productos-terminados` incorpora Ajustes de terminado y acciones Ajustar/Corregir; formulario sobre listado y consulta readonly del origen/saldos.
- `tests/ajustes-terminado.integration.ts` exige copia local descartable `mtx_validacion_terminado_ajustes_*`, incluye trigger temporal para probar rollback; ejecutar secuencialmente con regresiones y retirar copia/servidor. Checkpoints P6 en docs/HITO-PRODUCTOS.md.


## Clientes: Sucursales en grilla/modal

- `sucursales-cliente.tsx` muestra grilla y diálogos de Agregar/Editar/Ver; botón agregar al pie, Quitar con confirmación. Todo es borrador de Clientes y persiste en el mismo guardarCliente; no guardar sucursales por separado.
- React Hook Form useFieldArray/useWatch conserva IDs, setValue de fila conserva clave/foco. Detener propagación de submit del portal para que Enter no guarde el cliente. Bloquear cierre/envío principal mientras está activo el detalle/confirmación.
- Casa Central obligatoria/fija sin Quitar; cada detalle valida sucursalClienteSchema y duplicados por nombre dentro del borrador. Servicios/SQL siguen garantizando pertenencia, versión, guardado atómico y protección de cotizaciones.
- Modo Sucursales conserva cabecera readonly; Editar permite ambos y Ver todo readonly. Cancelar detalle/cliente no escribe. Estado y revisión visual pendiente en docs/MANTENEDORES-DATOS.md.


## Formularios responsivos

- En Clientes/Sucursales, desde 768 px usar tabla que reparta el ancho; por debajo, filas apiladas con etiquetas. No restaurar mínimos acumulados que obliguen a desplazar horizontalmente el formulario.
- En nuevos formularios/detalles, comprobar también scrollWidth/clientWidth del diálogo y sus contenedores, no sólo del documento. Usar min-w-0 y texto ajustable; evitar ocultar desbordamientos como sustituto de adaptar contenido.
- Verificar escritorio, móvil estrecho (320 px), breakpoints y datos largos. Mantener acciones con nombre accesible/ayuda y scroll vertical cuando sea necesario.


## IVA por períodos

- VatRatePeriod y /configuracion/iva implementados; inicial 19% desde 2003-10-01, sin fecha hasta. Tasas Decimal(7,4), rango 0–100. Fechas calendario hasta inclusiva, no solapamientos (GiST), exactamente un abierto; abierto futuro no implica tasa aplicable hoy.
- Configuración bloquea catálogo exclusivo pg_advisory_xact_lock(73119) antes de filas; ivaParaDocumento(tx,fecha) usa compartido antes de seleccionar y copiar referencia/Decimal en la misma tx del futuro documento. No crear tasas por defecto al faltar cobertura.
- Crear un abierto cierra el anterior el día previo atómicamente y exige versión de abierto esperado. Editar usado bloquea tasa/desde y conserva cobertura; eliminar sólo cerrado sin uso. Conservar CHECK/triggers/índice parcial y FK Restrict.
- Quote prepara vatRatePeriodId/vatRate nullable; no rellenar históricos. SQL protege copia/rango, conservación física de cotizaciones con IVA y dato tributario/fecha/estado terminal. El servicio completo de Cotizaciones/eliminación lógica/duplicación/importe/futuros documentos sigue pendiente.
- tests/iva.integration.ts sólo copia local mtx_validacion_iva_*, con fallos provocados; retirar copia/servidores. Checkpoint C1-IVA en docs/HITO-COTIZACIONES.md.


## Cotizaciones operativas C1–C5

- `/ventas/cotizaciones` implementa listado/filtros/paginación, registro/consulta/edición de Pendientes, aprobar/rechazar, baja lógica y nueva Pendiente de corrección vinculada con nuevo folio. PDF, conversión y fabricación/cobranza quedan pendientes; seguir el checkpoint final de docs/HITO-COTIZACIONES.md.
- guardarCotizacion en servicios/cotizaciones.ts integra UUID/huella antes de versión, asignarFolio e ivaParaDocumento dentro de la tx del documento; no reservas/stock/deuda. QuoteOperation propia confirma junto a cabecera/líneas. SQL protege importes/suma, identidad, estados terminales y conservación física; no retirar CHECK/triggers.
- IVA compartido antes de filas; materiales ascendentes y productos ascendentes FOR UPDATE para coincidir con QuoteDetail_product y evitar ascensos SHARE→UPDATE. Consultas secuenciales en tx. Copias históricas de cliente/contacto/emisor/sucursal/plazo/banco/unidad/código; vista readonly no usa nombres/unidades actuales para reescribir historia.
- technicalDescription es JSON estructurado con nodos/atributos permitidos y URLs locales verificadas; editor general, líneas breves. Sin HTML arbitrario/base64/imágenes externas. Validar también en servidor; no confiar en totales/tasa del navegador. Vista previa sólo lectura y descartes/confirmaciones reutilizables.
- AlmacenImagenesCotizacion local: var/cotizaciones/imagenes o COTIZACION_IMAGEN_DIR, reemplazable por S3 conservando claves/URLs y transfiriendo los archivos existentes. PNG/JPG/WebP 2 MB/16 MP, reprocesado PNG/1600 px; diez imágenes. Respaldar carpeta con BD. QuoteImageFile/Link conservan archivos históricos; borradores cancelados no tienen purga automática. Ante commit incierto, no borrar archivo hasta comprobar ausencia de referencia.
- tests/cotizaciones.integration.ts sólo copia mtx_validacion_cotizaciones_* con COTIZACION_IMAGEN_DIR aislado que incluya imagenes-validacion. Ejecutar secuencialmente, retirar copia/servidor propios; tests/importes-cotizacion.ts es puro y no conecta a BD.
- SelectorBuscable establece label del Command para dar nombre accesible al buscador. BotonConAyuda es informativo: contenido y contenedor Radix dejan pasar clics; no introducir controles interactivos dentro de esas ayudas.


## Editor de Cotizaciones C6

- TextStyleKit/TextAlign/Table y prepararPegadoCotizacion conservan estilos compatibles de HTML recibido (clases/herencia/etiquetas font), sin insertar HTML arbitrario. JSON valida estilos y estructura de tablas, así como placement/width de imágenes; coordinar siempre editor y validador. No requiere nueva migración por usar technicalDescription Json.
- Imágenes seleccionadas: posición bloque/izquierda/derecha/centro, ancho porcentual y mover antes/después; móviles <640 px apilan texto sin reescribir atributos. Superficie blanca del documento conserva legibilidad de colores copiados.
- No prometer formato ausente del portapapeles (PDF/plaintext), descarga de fuentes ni importación automática de imágenes externas. Límites/formato del upload anterior se conservan. Renderizado PDF futuro deberá respetar estilos/tabla/disposición. Prueba pura tests/texto-cotizacion.ts e integración ampliada; checkpoint C6 en HITO-COTIZACIONES.


## PDF de Cotizaciones

- PDF Carta en cualquier QuoteStatus: fuente HITO-PDF-COTIZACIONES. Quote.commercialTerms opcional (5000 caracteres) no registra pagos ni altera PaymentCondition. Exigir emisor histórico con razón social/RUT/dirección/ciudad; logo/banco opcionales, validar RUT impresos. No completar automáticamente snapshots antiguos; actualización explícita de emisor en Pendientes aprobada e implementada: `actualizarEmisorCotizacion` copia sólo Empresa, exige datos mínimos completos, bloquea versión/estado/orden y crea revisión + QuoteOperation EDITAR atómicamente con UUID estable. Acción en PDF y versiones con confirmación; nunca altera emisiones archivadas.
- QuotePdfEmission es inmutable: revisión/estado/folio, snapshot completo de Quote/QuoteDetail/DocumentFolio y recursos, archivo/huella/versión de plantilla. QuotePdfRequest UUID estable propio; reconocer antes de comprobar versión. Unique por quoteId/quoteVersion/templateVersion y CHECK/triggers/FK Restrict se conservan.
- Emitir: captura RepeatableRead secuencial → render fuera de tx → UUID/serialización y Quote FOR SHARE → comprobar versión/huella y archivar emisión/solicitud. No cambiar Quote.version al emitir, reservar folios ni escribir inventario/cobranza. Descartar archivos nuevos sólo tras verificar que no quedó referencia; conservar ante commit incierto.
- AlmacenPdfCotizacion local en var/cotizaciones/pdfs o COTIZACION_PDF_DIR, futuro S3 mediante fábrica. Respaldar con BD/recursos; sin purga automática. GET /api/cotizaciones/pdfs/[emision] entrega bytes originales comprobando SHA-256, incluso si cambió/ocultó la cotización.
- Playwright/Chromium instalado como dependencia del proyecto; pnpm exec playwright install chromium al preparar otra máquina, con dependencias del sistema necesarias. COTIZACION_CHROMIUM_PATH opcional. Runtime Node; HTML controlado desde JSON, texto escapado, PNG embebido, JS deshabilitado y red bloqueada; cerrar navegador tras render.
- Incrementar VERSION_PLANTILLA_PDF al cambiar una plantilla publicada; no regenerar PDFs anteriores al consultar. SnapshotVersion debe versionarse al evolucionar estructura. No se reconstruyen revisiones antiguas que nunca fueron emitidas ni hay restauración/edición de archivos históricos.
- tests/pdfs-cotizacion.integration.ts sólo copia mtx_validacion_cotizaciones_* y COTIZACION_PDF_DIR con pdfs-validacion, imágenes aisladas; pruebas secuenciales. Incluye fallos y simulaciones de concurrencia/commit incierto. Retirar copia y servidores propios; generación de PDF validada expresamente por el usuario.

- **Envío de PDF por correo (P6): pendiente por instrucción del usuario hasta recibir datos SMTP y contraseña de aplicación válidas del usuario final.** Leer correo actual del contacto de la sucursal seleccionada desde su mantenedor; si falta, solicitarlo al enviar. No implementar ni enviar ahora. No registrar credenciales en documentos/git. Al retomar, consultar si el correo ingresado debe persistir en Sucursal o sólo usarse para el envío; no asumir. Checkpoint: `docs/HITO-PDF-COTIZACIONES.md`.

## Orden de Compra Cliente — registro implementado

- Fuente: `docs/HITO-ORDEN-COMPRA-CLIENTE.md`, D1–D10 aprobadas. OCC1–OCC5 completos, con validación funcional del usuario y hito cerrado el 13-10-2026. SalesOrder.quoteId/WorkOrder.salesOrderId únicos e inversas singulares opcionales; obras propias NULL conservadas. No crear OT automáticamente.
- Registrar acepta cantidades positivas hasta lo cotizado, sin agregar/cambiar precios/unidades; usa Decimal, IVA/precios históricos, porcentaje conservado y monto fijo prorrateado. Snapshot completo y detalle propio; no recortar oferta ni alterar PDF/stock. Cuenta automática por total aceptado incluso cero, sin vencimiento ni pagos; folio/orden/detalle/operación/cuenta y aprobación pendiente en la misma tx. UUID/huella antes de versión; bloqueo UUID → IVA compartido → Quote → folio. Aprobadas previas sin orden admitidas aunque vencidas; Pendientes vencidas/incompletas protegidas.
- Referencia externa opcional guardada literalmente; clave interna PostgreSQL por espacios/mayúsculas (también no separadores/tipográficos), única por cliente incluso anulada y sin reinicio anual. `acceptanceDate @db.Date` para nueva aceptación actual/pasada de Santiago no anterior a la oferta; timestamp date/pdfUrl legados conservados. No inferir aceptación/importes/fechas históricas; campos nuevos opcionales sólo para legado y SQL exige documento nuevo completo.
- Anulación con motivo/versiones/UUID, bloqueo Quote → orden → cuenta, sólo sin trabajo/abonos incluidos anulados ni hitos de cuenta. Anula orden/cuenta conjuntamente y conserva origen/folio/referencia; no editar/ocultar/borrar. SQL protege copias/importe/detalles/operaciones, cuenta inicial sin vencimiento, abonos e identidad del trabajo; no desvincularlos para permitir anulación.
- `/ventas/ordenes` lista/filtra/pagina/ordena en servidor y abre Crear/Ver; Cotizaciones acepta sobre listado y ofrece Ver orden. La acción pública APROBAR independiente se bloquea; `aprobarCotizacionEnTransaccion` recibe tx para confirmación coordinada. Alcance propio revisado, sin nuevas subidas; PDF original de revisión opcional, sin adjunto/PDF propio. Editor compartido bloquea con `setEditable(..., false)` para no emitir cambios falsos ni borrar preview/errores/revisión.
- `leerCompromisoParaTrabajo(tx, referencia)` prepara sólo líneas contratadas/importe/alcance de orden confirmada y actual sin trabajo previo, bajo Quote → orden; no genera trabajo/consumo/folio. Factura/vencimiento, producción/despacho, pagos/sobrepagos y correo siguen pendientes de sus módulos.
- Repetir scripts/auditar-ordenes-compra-cliente.ts antes de nuevas migraciones. Integraciones vigentes ordenes-compra-cliente, adicional e integridad exigen copia local mtx_validacion_occ_* y ejecución secuencial por copia; retirar copia/servidores. ordenes-cardinalidad.integration.ts sólo cubre esquema inicial anterior al registro. Las migraciones detienen duplicados/claves que requieran conciliación, sin modificar historia automáticamente.

## Orden de Trabajo y Producción — estructura inicial M1

- Fuente vigente: docs/HITO-ORDEN-TRABAJO-PRODUCCION.md. D01–D08 y R01–R03 resueltas; D10/D17/D13 y D09/D12/D19/D20 aprobadas. Factura externa con folio/fecha en OT y plazo desde fecha de factura ratificada; D14 aprobada: finalizar sin factura y vencimiento nulo hasta registrar folio/fecha. D15 aprobada: folio único por RUT emisor sin reinicio anual, texto literal. D16 aprobada: corrección con motivo/historial incluso con abonos, recalculando sólo vencimiento. D11 aprobada el 14-10-2026: ejecución completa y preparación respaldada por reservas completas para finalizar. D18: PDF propio de OT al final del desarrollo del módulo. No habilitar adjuntos/firma sin contrato expreso.
- Migración 20261013184612_estructura_orden_trabajo aplicada tras validar copias: WorkOrder con contrato/folio/UUID/version/fecha/snapshots y propósito propio; WorkOrderLine, WorkOrderRecipeMaterial, WorkOrderSupplyPlan, WorkOrderOperation y ampliación nullable de WorkOrderDetail. Folios/operaciones/snapshots completos y fuente aceptada protegidos por SQL. Nuevos campos de legado no se rellenan ficticiamente.
- M1 es la base inicial; las entregas posteriores MR/OT3 habilitan reservas e interfaz pública de planificación en /trabajos/ordenes. Inicio habilitado en OT4; producción/cierre siguen pendientes de M2–M4. No usar StockMovement.workOrderDetailId para consumir requerimientos nuevos sin documento real.
- Receta histórica completa y revisiones de operación se conservan al editar catálogo/plan. referencias-plan-trabajo.ts y triggers protegen catálogos también por snapshots históricos; no liberar unidades/materiales/bodegas al borrar componentes actuales del plan. snapshot_plan_trabajo serializa cantidades como texto y valida tipos al cotejar copias.
- Requerimientos y cobertura pura en servicios/requerimientos-produccion.ts, Decimal propio precision40, HALF_UP a tres decimales y requiresReview para positivo que queda cero. No escribe ni reserva stock. Reservas aprobadas MP/PT, parcial al confirmar plan, sin caducidad automática y resultado comercial reservado al fabricar; los escritores existentes ya protegen las reservas de planificación; consumo y reserva del resultado fabricado implementados en M2; ver checkpoint OT5 posterior.
- normalizar_referencia_orden_cliente llama al helper con esquema public explícito para restauración de dump con search_path vacío; algoritmo original intacto, sin editar migraciones OCC. Ver evidencia de restauración por etapas de respaldo antiguo y directa de dump corregido.
- tests/ordenes-trabajo-estructura.integration.ts sólo copia local mtx_validacion_trabajo_*. tests/fixtures/trabajo-comercial.ts adapta fixtures positivos de OCC al esquema M1; no es servicio de aplicación. Pruebas de una misma copia secuenciales, retirada al terminar. Sin push.


## Reservas de stock — base MR de planificación

- Migración 20261014183729_reservas_stock implementa StockReservationAllocation/Event inmutables y reservationSnapshot en WorkOrderOperation. Reservado activo se deriva; no modificar cantidades históricas ni crear Kardex por reservar/liberar. UUID/huella/versiones y snapshot exacto en la misma tx. FK a operación diferidas preservan creación conjunta.
- servicios/reservas-stock.ts completa reservas parcialmente y libera con motivo sobre plan pendiente. reservarPlanTrabajoEnTransaccion prepara integración con CREAR/EDITAR_PLAN sin confirmar tx ni registrar operación por su cuenta. Mantener OT → materiales ascendentes → productos ascendentes → bodegas → saldos. No usar reservas de otra línea aunque sea misma OT.
- Ajustes MP/PT, Traslados y anulación de Compra protegen reservado activo; triggers SQL también. En UPSERT el BEFORE INSERT puede ver saldo provisional: si existe combinación, verificar cobertura en UPDATE efectivo. Conservar controles históricos, mínimos, versiones y saldo/Kardex.
- Producción implementada posteriormente en M2: CONSUMIR exige documento físico tipado, y resultado comercial se reserva con su entrada. Despacho sigue pendiente; no presentar reserva del plan como fabricación.
- tests/reservas-stock.integration.ts sólo copia local mtx_validacion_reservas_*. Pruebas por copia secuenciales; sin fixtures reales. Evidencia en backups/20261014_reservas_stock; esquema validado, cliente generado, 25 migraciones al día, lint/build y regresiones correctos.


## Orden de Trabajo — creación y planificación pública OT3/OT4

- Migración 20261014191938_revisiones_plan_trabajo aplicada; 26 migraciones al día. retiredAt archiva receta/requerimiento/abastecimiento sin borrar referencias. WorkOrderLine.roundingReview exige cantidad positiva/motivo para necesidad positiva redondeada a cero. CREAR/EDITAR_PLAN nuevos exigen planConfirmed explícito y EDITAR_PLAN motivo; flags nulos históricos no se rellenan.
- guardarPlanTrabajo integra folio/plan/reservas/operación con UUID/huella/versiones en una tx. Conservar origen aceptado completo, alcance/cantidades comerciales y cuenta única. Obra propia catálogo fabrica toda su cantidad; a medida no crea producto ficticio. Descubrir receta, bloquear materiales/productos ascendentes y releer composición; abortar ante componente nuevo no bloqueado, sin invertir locks.
- Guardar borrador libera reservas con motivo; confirmar exige distribución completa y reserva parcialmente stock libre. Conciliar libera exceso/orígenes retirados y conserva cobertura válida. Completar reservas rechaza borrador explícito después de reconocer reintento. No consumir ni ingresar terminado al planificar.
- /trabajos/ordenes lista/filtra/pagina/ordena en servidor y abre Crear/Ver/Editar; enlaces desde OCC. Catálogos buscables y receta histórica/actualización explícita; coberturas propias/ajenas/libres, historial, completar/liberar parcial. Líneas guardadas se conservan en esta primera UI. Respuesta incierta conserva solicitud/UUID y bloquea edición hasta reconocer resultado. Numeración OT local configurada por el usuario; en otros entornos exigir configuración sin inventar inicio/dígitos.
- tests/ordenes-trabajo-plan.integration.ts sólo copia local mtx_validacion_plan_*. Regresiones M1/MR/OCC y prueba pura correctas, Chromium 320/768/1440, liberación con coma y stock/Kardex intactos, lint/build/Prisma sin diferencias. 55 tablas previas con huellas conservadas al migrar. Evidencias en backups/20261014_planificacion_trabajo/. Revisión funcional del usuario pendiente.
- M2 de fabricación/avance implementado después; siguiente reversión, cierre/factura y PDF al final. Anulación pública de OT tampoco está habilitada. No declarar producción disponible por existir planificación/reservas.


## Inicio de OT — OT4

- Migración SQL 20261015200647_inicio_orden_trabajo aplicada, 27 al día. Reutiliza startedDate/EN_PROCESO/INICIAR existentes, sin nuevos campos ni datos inferidos. iniciarTrabajo exige plan confirmado explícito, versión y fecha calendario entre OT y hoy de Santiago. Inicio cambia sólo estado/fecha/versión; guarda operación/snapshots sin tocar físico/Kardex/reservas/cuentas/folios.
- SQL protege transición exacta, snapshot anterior y reservas intactas; en proceso el plan/receta/fecha quedan fijos. No se ofrece editar/iniciar de nuevo ni volver a pendiente. Completar/liberar admite pendiente/en proceso; CONSUMIR ahora exige documento físico M2; no habilitarlo para otro origen. Plan/reservas/inicio comparten advisory UUID 91357 y claves canónicas, reconociendo reintentos antes de versión/estado.
- Interfaz Iniciar OT con fecha, aviso de registro tardío/faltantes y confirmación; consulta estado/fecha/historial. Tests de inicio sólo en copia local mtx_validacion_inicio_*, incluidos rollback/carreras/SQL, físico/finanzas sin cambios y reservas en proceso. Regresiones M1/MR/plan, Chromium 320/768/1440, lint/build/Prisma correctos. Evidencias backups/20261015_inicio_trabajo/. Revisión funcional final pendiente; fabricación/avance implementado en el checkpoint OT5/M2 posterior.


## Producción y avances — OT5/M2

- Migración 20261015211304_registros_produccion aplicada, 28 al día. ProductionRecord/Consumption/Output inmutables, FK/índices/CHECK y orígenes únicos en StockMovement/ProductStockMovement y WorkOrderOperation. Sólo producción en OT EN_PROCESO; documento completo y operación/versiones/efectos físicos juntos. Sin reversión, cierre ni despacho aún.
- servicios/produccion.ts prepara/previsualiza sin escribir y registra con advisory UUID 91357 → OT → materias primas ascendentes → producto → bodegas → saldos. Reconocer UUID/huella antes de estado/versión. Cantidades Decimal; stock y Kardex atómicos. Consumo real usa primero reserva propia de esa línea/recurso/bodega y luego libre, nunca reserva ajena. Resultado comercial crea reserva completa junto con la entrada; propia deja PT libre. Servicio/a medida sin resultado ficticio.
- necesidades_produccion calcula lote desde receta histórica o proporción a medida, distribución determinista, HALF_UP y revisión positiva/motivo para cero. expectedSnapshot guarda previsión/revisiones; receta/plan completos en snapshot de operación según planVersion. Diferencias/omisiones/materiales adicionales/cambio de bodega exigen motivo global del registro. No registrar ceros ni doble merma.
- demanda_pendiente_requerimiento deriva menor entre pendiente por consumo real y previsión del avance restante. Liberar excedente al producir y completar sólo pendientes; nunca volver a reservar lo ejecutado. Al implementar M3, adaptar a avance/consumo netos de reversión, sin editar hechos originales. Snapshot de reservas omite productionOutputId/productionConsumptionId nulos para mantener forma histórica previa.
- Fecha de documento/PT @db.Date; SALIDA MP usa inicioDiaChile y SQL verifica mismo día de Santiago. Conservar IDs de Kardex como orden histórico. No utilizar ajustes/inventario inicial para registrar fabricación. Un movimiento productivo bloquea carga inicial posterior en esa combinación.
- Formulario por línea con previsión histórica, consumos reales, preview/confirmación, unidades y motivo; resultados e historia en Ver OT. Kardex MP/PT enlaza OT/registro y distingue orígenes productivos. No ofrecer corrección de fabricación como corrección de documento de ajuste/inicial.
- tests/produccion.integration.ts sólo copia mtx_validacion_produccion_*; fixtures y triggers de fallos nunca en base real. Pruebas secuenciales por copia. Integración, carreras con stock/ajustes/Compras, regresiones plan/MR/inicio/terminado, Chromium 320/768/1440 y lint/build/Prisma correctos. Evidencias backups/20261015_produccion/. Validación funcional de Producción pendiente. Siguiente OT6/M3 reversión; después cierre/factura y PDF final.

## Correcciones productivas — OT6/M3

- Migración `20261016004629_reversiones_produccion`: ProductionReversal y detalles inmutables, una reversión completa por registro; FK compuestas, cantidades/copias originales, completitud diferida y AJUSTE positivo MP/negativo PT con orígenes tipados. No editar originales ni movimientos. Este bloque amplía las notas históricas de M2: la reversión ya está implementada; cierre/factura y despacho siguen pendientes.
- `servicios/reversiones-produccion.ts`: preview readonly; UUID advisory 91357 → OT → registro → materiales ascendentes → producto → bodegas → saldos. Recuperar misma intención antes de versión/estado. Error de registro, no daño/reproceso: exigir restitución física confirmada para fabricación/a medida. Fecha no anterior al original ni futura; sólo EN_PROCESO sin despacho ni reversión previa.
- Bloquear por cualquier salida/ajuste negativo posterior a la entrada original del producto/bodega por ID, aun con reposición. Proteger reservas ajenas; liberar sólo las del resultado revertido. Devolver MP exacta, retirar PT exacto, mantener mínimos/versiones/Kardex. Devolver MP no desbloquea la anulación de Compra impedida por su consumo histórico.
- Avance/demanda netos excluyen registros revertidos; `demanda_pendiente_requerimiento` y los servicios/UI usan este criterio. Reconstruir reservas de requerimientos de la línea con asignaciones nuevas hasta demanda/libre disponibles, sin reactivar eventos consumidos. Completar reservas excluye resultados revertidos. `correctsProductionRecordId` enlaza registro nuevo al original revertido de la misma línea/OT; no único. Huellas M2 conservadas si es nulo.
- Anulación sólo propia PENDIENTE sin inicio, ejecución, movimientos heredados ni despacho; motivo obligatorio, liberar reservas y conservar plan/folio. SQL impide cambiar plan al anular y exige motivo coherente de operación. No anular OT comercial ni iniciada, aunque se haya revertido toda su producción.
- `tests/produccion-reversiones.integration.ts` exige copia `mtx_validacion_produccion_reversiones_*`; nunca ejecutar fixtures/triggers de fallo sobre base real. Pruebas por copia secuenciales; copias distintas para regresiones independientes. Evidencias ignoradas en `backups/20261015_reversiones/`. Validación funcional de M2/M3 pendiente del usuario. Próximo OT7/M4; PDF al final.
- Cierre técnico local M3: 29 migraciones aplicadas y checksums/esquema verificados; conservación de las 58 tablas anteriores por columnas originales, sin fixtures en tablas nuevas. Consultas locales/lint/build correctos. Cuatro copias descartables retiradas y 3031 libre, manteniendo el servidor previo del usuario en 3030. No confundir este cierre técnico con validación funcional del usuario.
