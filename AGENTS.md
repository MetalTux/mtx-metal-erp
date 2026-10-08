# AGENTS.md

Instrucciones para Codex y otros agentes que trabajen en este repositorio. Aplican a todo el proyecto.

## Contexto y forma de trabajar

- **Proyecto:** MTX Metal ERP, para fabricación de estructuras metálicas por encargo o para obra propia. Organiza bodegas, materia prima, compras, cotizaciones, producción y entregas.
- **Idioma:** responde en español. Escribe comentarios, textos visibles y datos de ejemplo en español; conserva los nombres existentes de modelos, campos y APIs. Los valores de los enums del dominio están en español.
- **Stack:** Next.js 16 con App Router, React 19 con React Compiler, TypeScript estricto, Tailwind CSS v4 y Prisma 7 sobre PostgreSQL 15.
- **Estado actual:** el tema oscuro y el layout del ERP ya están implementados con shadcn/ui: sidebar responsive, barra superior, buscador de secciones y rutas provisionales. El Dashboard tiene estructura visual sin consultas. Unidades de medida, Bodegas, Proveedores, Clientes y Materias primas ya tienen CRUD completo con Server Actions y Prisma; Empresa también tiene consulta/configuración y carga local de logo; Stock por bodega y Movimientos tienen consultas de sólo lectura con paginación/orden en PostgreSQL; Stock también permite configurar mínimos y filtrar reposición sin alterar existencias. Compras tiene listado, registro de documentos y recepciones parciales que generan entradas de stock/Kardex; cierre/anulación de compras también están implementados. Inventario incorpora ajustes, carga inicial y traslados inmediatos con correcciones vinculadas; traslados espera revisión funcional. Clientes admite contacto general y sucursales con Dirección/Ciudad y contacto propios, incluida Casa Central; Condiciones de Pago también tiene CRUD con bases Al día/30/60/90 días; Cotizaciones, catálogo de productos, consumos de producción, autenticación y métricas reales siguen pendientes.
- Antes de editar, revisa `git status --short` y los archivos afectados. Conserva los cambios previos del usuario y limita la edición al alcance solicitado.
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
| `docs/HITO-COTIZACIONES.md` | Reglas comerciales aprobadas, Orden de Compra Cliente, catálogo/stock terminado, anticipos y vencimiento por factura; Condiciones de Pago implementadas, demás dependencias pendientes |
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

- **Cambio de unidad:** en Materias primas sólo se permite si no hay registros de stock (incluso cero), movimientos, compras, trabajos ni cotizaciones. Otros campos siguen editables. La comprobación se realiza en el servidor dentro de una transacción que bloquea la fila antes de revisar referencias.
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
- **Cotizaciones:** calcula `Quote.totalAmount` como la suma de `quantity × unitPrice` de sus detalles. `QuoteDetail.rawMaterialId = null` representa un ítem libre, como mano de obra o flete.
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
