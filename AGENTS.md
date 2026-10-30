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
| `docs/HITO-INICIO-SESION-SEGURIDAD.md` | Propuesta funcional y etapas S0–S7 para acceso, usuarios, roles, sesiones y auditoría; D01–D03 aprobadas: seis roles combinables por unión de permisos, contraseña + Google opcional y uso por Internet con equipos personales. D04–D06 aprobadas: usuarios sólo por Administrador, recuperación por correo con SMTP/asistida y sesión 60 min/8 h. D07/D08/D10 aprobadas: matriz por empresa, TOTP opcional personal y correcciones por área; D09/D08-R aprobadas: auditoría sólo Administrador, IP/navegador y eventos 12 meses conservando autoría; códigos personales TOTP también para Administradores. Google sin gasto adicional. S1 implementado/validado: 11 tablas, permisos y bibliotecas; migración local 37, sin activar credenciales. Continuidad en sección 18 y docs/SEGURIDAD-S1-DISENO.md; S2 local implementado/validado: login, usuarios y panel propio; continuidad sección 19 y docs/OPERACION-SEGURIDAD.md. S3 Google pospuesto por el usuario el 21-10-2026; S4 implementado/validado técnicamente: páginas, acciones, servicios/DTO y archivos con sesión/permisos, navegación filtrada y revocación coordinada con transacciones. S5 implementado/validado: 61 puntos de autoría atómica, visor sólo Administrador, metadatos sin secretos y retención 12 meses con UI/CLI; sin backfill ni migraciones. Continuidad breve en docs/SEGURIDAD-S5-CONTINUIDAD.md y sección 23 del hito. S6 completado en alcance local aprobado: 48/48, HTTPS/restauración locales y despliegue preparado. No hay servidor definitivo; instalación/timer reales diferidos. Continuidad exacta en docs/SEGURIDAD-S6-CONTINUIDAD.md. CLI de revocación tras restaurar y plantillas de despliegue/retención sin instalar; no marcar HTTPS/timer reales como ejecutados. S7 pendiente; guía funcional preparada en docs/GUIA-PRUEBAS-SEGURIDAD-S7.md con estados e incidencias, sin aprobación del usuario. Contraseña 8–128 centralizada; corrección de provisión/configuración local en sección 20 |
| `docs/CIERRE-VERSION-1.md` | Auditoría del 20-10-2026: estado real, faltantes y criterios propuestos para V1; acceso/permisos, Cobranza, Dashboard, usabilidad/manual y preparación operativa. Alcance propuesto, sin aprobación automática de reglas nuevas |
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
| `docs/HITO-GUIAS-DESPACHO-ENTREGAS.md` | G0–G6 completados y aprobación funcional general del usuario el 20-10-2026; hito cerrado. Manual completo del ERP y mejoras de usabilidad/visibilidad de funciones pendientes como trabajo posterior. Operación y respaldo en `docs/OPERACION-GUIAS-DESPACHO.md`. PDF en `var/guias/pdfs/` o `GUIA_PDF_DIR`, respaldar con PostgreSQL/logos. Completar reservas y cierre consideran entrega neta; devolver no desbloquea reversión productiva. |
| `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md` | OT0–OT9 implementados y validados técnicamente; aprobación funcional general del usuario el 18-10-2026. Hito cerrado; Despacho y servicios de Cobranza son entregas separadas |
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
- **Cotizaciones:** desde el 26-10-2026 las nuevas usan precios unitarios netos en pesos enteros: redondear líneas al peso, sumar subtotal, aplicar descuento al neto y calcular IVA sobre neto descontado; TOTAL = NETO + IVA. Quote/SalesOrder.pricesIncludeVat conserva modalidad histórica: true para documentos previos, false para nuevos. No recalcular documentos previos; correcciones nuevas proponen conversión neta explícita con aviso de redondeo. Usa calcularImportesCotizacion y Prisma.Decimal. QuoteDetail.kind diferencia MATERIA_PRIMA, PRODUCTO y SERVICIO; rawMaterialId null por sí solo no identifica un servicio.
- **Obra propia:** `WorkOrder.salesOrderId = null` significa fabricación sin cliente. También consume materiales; no fuerces una orden de venta ni un cliente ficticio.
- **Fechas:** todos los modelos tienen `createdAt`; todos salvo `StockMovement` tienen `updatedAt`. `date` es la fecha del documento o hecho, que puede indicarse manualmente; `createdAt` es la fecha de registro. `Quote.validUntil` es el vencimiento opcional de la oferta.
- **Índices:** toda clave foránea nueva debe quedar cubierta por un índice apropiado. Sigue el patrón de `@@index` existente y considera la cobertura de índices compuestos o únicos.
- **Logo de Empresa:** carga local en `var/empresa/logos/` o `EMPRESA_LOGO_DIR`, con contrato `AlmacenLogo` para futuro S3. Respaldar esa carpeta junto con PostgreSQL. No borrar versiones anteriores automáticamente ni aceptar rutas/URLs libres desde el formulario. Ver `docs/HITO-EMPRESA.md`.
- **Archivos:** `SalesOrder.pdfUrl` y `DeliveryNote.voucherUrl` son campos para URLs; la integración con AWS S3 todavía está prevista para más adelante.

## Base de la interfaz

La fuente detallada es `docs/GUIA-INTERFAZ.md`, cuyas fases de tema y layout ya están implementadas; consulta el estado detallado en `docs/AVANCES-INTERFAZ.md`. Respeta las decisiones posteriores del usuario al desarrollar cada fase.

- **Dirección visual propuesta:** `diseno-02` como base, tema oscuro grafito con tinte azul, acento azul para acciones y naranjo para detalles de marca. De `diseno-01` se contempla solo un toque metálico opcional en cabeceras de tarjetas. Se excluye el visualizador del producto.
- **Sistema visual:** shadcn/ui sobre Tailwind v4, tokens CSS en `.dark` registrados en `@theme inline`, IBM Plex Sans local 400/600 como fuente principal, Geist Mono para códigos e iconos de `lucide-react`. Usa `tabular-nums` para cifras, badges con texto y barras de stock acompañadas de números. Verifica contraste y foco al implementar; no asumas que todos los valores propuestos ya cumplen accesibilidad.
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


## Finalización y factura externa — OT7/M4

- Fuente: `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md`. Migración `20261016184002_finalizacion_factura_trabajo`: WorkOrderCompletion inmutable, WorkOrderInvoiceIdentity permanente por RUT emisor/folio literal y WorkOrderInvoiceReference con sucesión única/puntero vigente. Cada operación tiene documento de la misma OT y snapshots; conservar CHECK/FK/triggers de completitud/vencimiento.
- `servicios/cierre-trabajo.ts` finaliza EN_PROCESO sólo con avance neto completo y reservas completas/físico/Kardex en líneas comerciales de entrega. Conserva stock/reservas; no reabre, despacha ni consume al cerrar. UUID antes de versión/estado; locks Quote → SalesOrder → WorkOrder → AccountReceivable y recursos ascendentes, consultas tx secuenciales.
- Factura externa posterior sólo en comercial FINALIZADO con cuenta vigente; fecha/folio juntos, fecha no futura y vencimiento por días calendario/plazo histórico. Corregir con motivo crea revisión, conserva identidad anterior y emisor histórico; no refrescar desde Empresa ni alterar importe/pagos/promesa, incluso con saldo cero. SQL exige vencimiento igual a factura vigente o nulo antes de ella para OT nuevas.
- Ver OT incorpora cierre, factura/corrección e importe/abonos/saldo/vencimiento/promesa sin ingreso de pagos. `tests/ordenes-trabajo-cierre.integration.ts` sólo copia local `mtx_validacion_finalizacion_*`, con fixtures y fallos inducidos; nunca ejecutar sobre base de uso. M2/M3/M4 incluidos en la aprobación funcional general del 18-10-2026; PDF propio completado en OT8. Despacho/Cobranza separados.


## PDF y cierre técnico de OT — OT8/OT9

- `WorkOrderPdfEmission`/`WorkOrderPdfRequest` conservan una emisión por OT/revisión/plantilla, UUID estable y archivo/snapshot inmutables. Migración `20261017000019_pdf_ordenes_trabajo`; fuente y manual en `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md` y `docs/OPERACION-ORDENES-TRABAJO.md`.
- `servicios/pdfs-trabajo.ts`: captura RepeatableRead secuencial → render sin tx → bloqueo UUID/OT compartido → verificar revisión/huella y archivar solicitud/emisión. No aumenta versión, asigna folio ni cambia stock/reservas/cobranza. Limpiar archivo nuevo sólo tras comprobar ausencia de referencia; conservar ante incertidumbre. No reconstruir revisiones antiguas que nunca se emitieron.
- `AlmacenPdfTrabajo` local en `var/trabajos/pdfs` o `TRABAJO_PDF_DIR`, futuro proveedor mediante fábrica. Respaldar junto con PostgreSQL/logos/imágenes históricas. GET `/api/trabajos/pdfs/[emision]` verifica tamaño/SHA-256, sin regenerar. Chromium/Node con JS/red deshabilitados al render; `TRABAJO_CHROMIUM_PATH` opcional. Incrementar versión de plantilla publicada si cambia contenido/diseño; no purgar historia.
- PDF interno Carta con emisor comercial histórico u Empresa capturada al emitir obra propia, plan/receta/ejecución/reversiones/cierre/factura; no sustituye guía, pago ni emisión tributaria. No habilitar uploads/firma. Tests PDF/carreras de catálogos sólo copia local `mtx_validacion_ot_pdf_*` y `TRABAJO_PDF_DIR` con `pdfs-validacion` para archivos. Regresiones que escriben, secuenciales por copia.
- OT0–OT8 y tareas técnicas OT9 completadas; aprobación funcional general del usuario registrada el 18-10-2026 después de corregir producción. Hito OT cerrado. Despacho, servicios de Cobranza y autenticación/roles son hitos separados.


## Continuidad S7 — revisión parcial, 24-10-2026

- Usuario aprobó S7-01/S7-02/S7-03/S7-05/S7-06/S7-07/S7-09. Pendientes S7-04/S7-08/S7-10/S7-11/S7-12. Estados y pasos en `docs/GUIA-PRUEBAS-SEGURIDAD-S7.md`; checkpoint en sección 25 del hito. No cerrar S7 ni marcar los demás bloques aprobados por inferencia.
- Correcciones: activación/reset vuelven al login con aviso, toasts en acceso/panel/Usuarios y reautenticación administrativa en diálogo dentro de Usuarios. Conserva formulario y requiere confirmar después el cambio; contraseña y factor propio, reutilización cinco minutos. Correcciones S7-02/S7-03/S7-06/S7-07 aprobadas por el usuario el 24-10-2026.
- Validación técnica de estas correcciones: lint/build/tipos y `pnpm seguridad:validar-s6 seguridad-acceso` correctos, con Chromium/modal/avisos y recuperación. Evidencia privada `backups/20261023_seguridad_s6/1792804026138/`; origen intacto y ensayo retirado. No equivale a repetir los 48 escenarios ni a aprobar S7.


## Continuidad Cobranzas — 24-10-2026

- Plan y checkpoint: `docs/HITO-COBRANZAS.md`, C0–C4. Usuario autoriza continuar dejando S7-04/08/10/11/12 pendientes; seguridad no se declara cerrada.
- C-D01–C-D05 aprobadas: Transferencia/Efectivo/Tarjeta/Cheque/Otro, referencia y comprobante opcionales; pagos hasta hoy Santiago, anticipos sin factura, sin sobrepagos; corregir anulando con motivo y nuevo pago por Cobranza/Administrador; promesa opcional con historial independiente del vencimiento. Cheque sólo reduce deuda al cobro efectivo.
- C0/C1 implementados/validados técnicamente: ruta Cobranza con consultas de cuenta única, saldos decimales, filtros/totales/paginación SQL y detalle sobre listado con factura/abonos anulados. Consulta protegida y sin escrituras de cuentas/pagos; no hay migración C1 ni servicio de registro/anulación aún. Aprobación funcional C1 pendiente.
- Lint/build/tipos/cobertura S4 (120 entradas), integración/Chromium C1 y roles S4 correctos. Evidencias exactas y ensayo anterior superado en sección 7 del hito. Copias/servidor propios retirados; servidor previo del usuario en 3030 se conserva.
- Siguiente C2: operación idempotente con huella, bloqueo de cuenta compatible con OCC/factura, abonos/anulación y autoría; C3 comprobantes/promesas, C4 integración/cierre. No releer todo S1–S6 para continuar.


## Continuidad Cobranzas C2 — 24-10-2026

- C1 aprobado expresamente. C2 implementado/validado técnicamente; aprobación funcional pendiente. Fuente vigente: sección 8 de `docs/HITO-COBRANZAS.md`; siguiente C3 adjuntos/promesas.
- `src/lib/servicios/cobranza.ts`: UUID de Payment + comparación canónica de campos originales para alta; reconocer reintento antes de validar saldo/estado actual, incluso tras anular. Anulación idempotente natural por ID/motivo, sin volver a escribir ni cambiar motivo confirmado. Sin tabla nueva ni migración C2.
- Bloquear cuenta antes de calcular/sumar/insertar/anular; no adquirir después bloqueos de OCC/OT. Sobrepago rechazado, fecha hasta hoy Santiago con inicio de día chileno, medios aprobados y Cheque sólo cobrado. No editar/borrar importe, medio, fecha, referencia u origen desde el módulo.
- Nuevas acciones de Cobranza con origen y permiso, formulario con revisión y reintento protegido; autoría Payment en la misma tx. Modelo Payment añadido a cobertura de autoría; referencias en inventario S1. Coberturas actuales: 90 acciones, 122 entradas de servicio/consulta y 63 puntos de autoría.
- Lint/build/tipos, coberturas S4/S5 y pruebas C1/C2/Chromium correctos. Evidencia `backups/20261024_seguridad_s6/1792819206115/`; base/archivos intactos y ensayo retirado. S7 y aprobación funcional C2 permanecen pendientes. No repetir todo el análisis para continuar C3.


## Continuidad Cobranzas C3 — 24-10-2026

- C2 aprobado. C3 implementado y validado en copia, habilitación local pendiente. Fuente exacta: sección 9 de `docs/HITO-COBRANZAS.md`; no declarar disponible localmente hasta aplicar migración autorizada.
- Aprobados JPG/PNG/PDF hasta 5 MB, adjuntos al registrar o después, conservación de anteriores y descargas con permisos de Cobranza. Promesas hoy/futuras o quitar con motivo, fechas históricas conservadas y autoría.
- Migración 38 `20261024053000_cobranza_comprobantes_promesas` con PaymentAttachment/PaymentPromiseChange, CHECK/FK/índices e inmutabilidad SQL; generada y aplicada sólo a copias. Cliente generado/Prisma/lint/build/tipos/coberturas correctos (92 acciones, 124 entradas, siete rutas y 65 puntos de autoría).
- Pago y adjunto usan UUID separados; reutilizar el del pago colisionaba con autoría. Pago se confirma antes de adjunto: fallo de archivo no duplica dinero, UI conserva resultado y reintenta sólo subida. Almacén privado `COBRANZA_COMPROBANTE_DIR` o `var/cobranza/comprobantes/`, incluir en respaldo.
- Promesa usa versión `updatedAt|cantidad de cambios inmutables`, bloqueo de cuenta y motivo, UUID/huella e historial; no cambia vencimiento/factura. No hay backfill.
- Regresión C1/C2/C3 y Chromium correcta, evidencia `backups/20261024_seguridad_s6/1792857793317/`; datos/archivos originales intactos. Copias/servidores/archivos de ensayo retirados, 3030/3031 libres al cierre. C1/C2 conservan modo compatible sin migración.
- Aplicación a `mtx_metal_erp` NO ejecutada: revisión automática rechazó por interpretar restricción de escrituras sólo en copias. Hace falta autorización explícita del usuario antes de reintentar sobre esa base. Verificar `migrate status`, respaldo reciente y datos antes/después al autorizarse. Copia preparatoria C3 ya retirada; no reutilizar conexión antigua. Aprobación funcional C3 y C4 pendientes.


## C3 aplicado localmente — actualización del 24-10-2026

El usuario autorizó explícitamente aplicar C3 evitando pérdida de datos. Se aplicó sólo `20261024053000_cobranza_comprobantes_promesas` a `mtx_metal_erp`: 38 migraciones al día y cliente regenerado. Respaldo reciente restaurado/verificado en copia, 80 tablas previas con filas idénticas después y dos tablas nuevas vacías. Copia retirada; evidencia `backups/20261024_cobranza_c3/aplicacion_1792859912558/`. Sin seed/reset ni datos de ejemplo. El bloqueo automático anterior está resuelto; no volver a pedir esa autorización ni presentar C3 como no habilitado. Pendientes aprobación funcional C3 y C4 según sección 9 del hito.


## Continuidad Cobranzas C4 — 24-10-2026

- C4 técnico completo, sin cerrar funcionalmente Cobranzas. Usuario mantiene C3 pendiente porque no puede probar ahora; C1/C2 aprobados. Checkpoint vigente: sección 10 de `docs/HITO-COBRANZAS.md`; guía por tareas/respaldo en `docs/OPERACION-COBRANZAS.md`.
- Enlace compartido `EnlaceCuenta` desde OCC/OT/guías: exige cobranza.leer + precios.leer. `?orden=id` abre la cuenta existente, no crea deuda; obra propia sin enlace. Respetar bloqueos de navegación.
- `consultarResumenCobranza` protegido y agregado comparte el cálculo del listado, sin cargar filas ni implementar Dashboard. Cobertura S4: 125 entradas de servicio/consulta.
- Lint/build/tipos/coberturas S4/S5 y escenarios cobranza-consultas/cobranza-cierre correctos 2/2. Recorrido integral anticipo→producción/entrega/factura→cobro/corrección→devolución/reentrega y Chromium con permisos; evidencia `backups/20261024_seguridad_s6/1792860383179/`. Origen/archivos intactos, copias/servidores retirados; sin migración C4.
- Pendientes aprobación funcional C3/C4, cierre del hito y otros bloques V1 (Dashboard, manual ERP/usabilidad, S7 y operación definitiva). No releer/reimplementar C1–C4 para continuar; revisar los pendientes concretos.


## Continuidad Dashboard — 24-10-2026

- Usuario aprobó D-D01–D-D07 en `docs/HITO-DASHBOARD.md`. D0–D4 implementados/validados técnicamente; D5 funcional, volumen representativo y cierre expreso pendientes. Guía `docs/OPERACION-DASHBOARD.md`. No repetir preguntas ni reconstruir bloques.
- Cotizaciones pendientes vigentes/vencidas; OT con plan confirmado en preparación + EN_PROCESO, borradores y antiguas sin evidencia aparte; deuda desde `consultarResumenCobranza`; mínimo por material/bodega (null/cero distintos).
- Consumo pendiente por material/bodega con funciones vigentes de producción/reservas; físico, reserva propia, libre global y faltante por reservar, sin sumar unidades diferentes. Cotizado vs contratado en OCC vigente de cohortes de cotizaciones de seis meses; tabla accesible. Movimientos MP/terminado por registro.
- `src/lib/consultas/dashboard.ts`: bloques agregados/limitados y DTO por permisos; errores separados de cero. Campana interna en layout con stock bajo/cotizaciones próximas/cuentas vencidas por permisos; sin correo, leído/no leído ni tiempo real. Sin migraciones/seed/dependencias nuevas.
- Lint/build/tipos, escenario Dashboard 1/1 y regresión S4 1/1 correctos; cobertura 127 entradas. Evidencia exacta en sección 6 del hito. Copias/servidores retirados y origen/archivos intactos. C3/C4 de Cobranzas y S7 conservan aprobaciones pendientes.


## Continuidad Manual/usabilidad — 24-10-2026

- Primera edición textual transversal de 18 capítulos en `docs/MANUAL-USUARIO.md`; README orientado al ERP y enlaces a guías. Hito `docs/HITO-MANUAL-USABILIDAD.md`, revisión priorizada `docs/REVISION-USABILIDAD-V1.md` (U01–U12).
- U01: OCC Crear trabajo depende de trabajos.operar; Ver trabajo existente de trabajos.leer. U02: Preparar otra entrega depende de guias.operar. Reglas/permisos de servidor intactos. Guías OT/Guías ya no afirman ausencia de autenticación y distinguen contratos técnicos históricos.
- Lint/build/cobertura S4 y cobranza-cierre ampliado/Chromium correctos 1/1 (`backups/20261024_seguridad_s6/1792883623974/`); 65 enlaces/anclas locales correctos, datos/archivos intactos y ensayo retirado. Sin migraciones ni datos ficticios en base real.
- Siguiente M2: ayuda integrada dentro del ERP y hallazgos de descubrimiento/mensajes/teclado/móvil; capturas sólo con datos totalmente ficticios/anonimizados. No reescribir todo el manual para retomar. Revisión con usuarios y aprobación pendientes; C3/C4, Dashboard y S7 continúan abiertos funcionalmente.

## Dirección visual vigente — 28-10-2026

Antes de una auditoría, propuesta o cambio visual, leer `PRODUCT.md` y `DESIGN.md`. Contienen el encargo del usuario para Claro/Oscuro: ERP industrial sobrio, legible durante horas, compacto y con identidad propia; sin espaciados excesivos, sombras decorativas ni degradados excesivos. Esta decisión posterior prevalece sobre la dirección metálica/degradados propuesta originalmente.

Skills locales de diseño: `.agents/skills/impeccable/SKILL.md` para crítica/diseño y `.agents/skills/web-design-guidelines/SKILL.md` para auditoría complementaria. Usar modo Operate para pantallas del ERP. Cada agente delegado debe recibir PRODUCT.md, DESIGN.md, alcance concreto y evidencia visual vigente. Mantener reglas, permisos, grillas y documentos históricos. No cambiar las skills de Prisma ni sobrescribir instrucciones de proveedores para personalizarlas: el brief reside en el proyecto. Instalación y versiones en `docs/HERRAMIENTAS-DISENO.md`.

El motor de Impeccable está preparado en caché local ignorada por Git. Usar `scripts/diseno-impeccable.sh <comando>` para mantener cwd en la raíz y establecer IMPECCABLE_HOME en var/herramientas/impeccable; es el mismo motor/lanzador de la skill. No requiere activar hooks para comenzar una revisión.

## Continuidad piloto visual — 28-10-2026

- Piloto Dashboard y Compras autorizado e implementado con IBM Plex Sans local 400/600 y paletas minerales Claro/Oscuro. Estado exacto: docs/HITO-PILOTO-VISUAL.md. Conformidad general del piloto recibida.
- El ámbito temporal del piloto fue retirado en VG1: fuente y tokens residen en :root/.dark y alcanzan todas las rutas/portales. No reintroducir AlcancePiloto ni marcadores por ruta.
- Más contiene acciones secundarias con permisos/bloqueos; Ver/Recibir permanecen visibles. Formularios conservan servicios/UUID y añaden errores/foco. Detalle y recepción conservan sus anchos, no limitar todos los diálogos a 512px.
- tests/piloto-visual.ui.ts usa componentes y mocks restrictivos, prueba temas/teclado/contraste/reflow/coherencia entre rutas. tests/piloto-visual-next.ui.ts sólo GET públicos y fuentes reales en 3032 temporal. No representan flujo autenticado completo. Grillas 7/7 y Webpack/lint/tipos correctos; Turbopack bloqueado por permiso interno.

## Continuidad extensión visual — 28-10-2026

El usuario expresó conformidad general con el piloto real y solicitó la planificación completa para toda la aplicación. Plan vigente: docs/HITO-DISENO-GLOBAL.md (VG0–VG9). VG1 base global implementado; evidencia y límites en docs/DISENO-GLOBAL-VG1-VALIDACION.md. VG2 también implementado: docs/DISENO-GLOBAL-VG2-VALIDACION.md; API ficticia y GET públicos no acreditan flujos reales. Pendientes zoom 200%, lector y sesión/tokens/TOTP/SMTP reales. VG3 implementado con fixtures: docs/DISENO-GLOBAL-VG3-VALIDACION.md. Diez pantallas, 160 escenarios; no acredita CRUD real ni validaciones manuales. VG4 implementado con fixtures: docs/DISENO-GLOBAL-VG4-VALIDACION.md. TablaConsulta.numerica opcional y contenedor horizontal enfocable; no cambia saldos ni servicios. VG5 implementado con fixtures/editor real: docs/DISENO-GLOBAL-VG5-VALIDACION.md. No cambia importes ni PDFs históricos; cabecera diferencia neto/histórico. VG6 por partes: VG6.1 Trabajos implementado, docs/DISENO-GLOBAL-VG6-TRABAJOS-VALIDACION.md; listado/plan/editor de partida, sin servicios. VG6.2 Producción y VG6.3 Despacho implementados el 29-10-2026, docs/DISENO-GLOBAL-VG6-PRODUCCION-DESPACHO-VALIDACION.md: 78 escenarios con fixtures, grillas en ambos temas, lint y Webpack. No cambia servicios ni datos; revisión funcional/zoom/lector/sesiones reales pendientes. Implementación visual VG6 completa. VG7 Cobranzas implementado el 29-10-2026: docs/DISENO-GLOBAL-VG7-VALIDACION.md; listado Table compartida, cifras alineadas, resumen de cuenta y diálogos contenidos; GrillaHistorial/VerDetalleHistorial refinados. Fixtures con cambio de tema y reintentos idénticos, grillas en ambos temas y lint/Webpack; no cambia servicios ni datos. Revisión funcional/zoom/lector/operaciones reales pendientes. VG8 implementado el 29-10-2026: docs/DISENO-GLOBAL-VG8-VALIDACION.md; Mi acceso plano, Usuarios/Auditoría Table compartida, retorno de foco en diálogos, 26 límites de carga/error y not-found.tsx personalizado sin URL nueva. 330 escenarios con API/consultas ficticias, navegación de seis roles y unión, reautenticación conserva payload, foco; grillas en ambos temas, lint/tipos/Webpack y GET 404 real. No cambia seguridad ni servicios; revisión funcional/zoom/lector/sesiones reales pendientes. VG9.1 completado: docs/DISENO-GLOBAL-VG9-1-MATRIZ.md; 29 páginas, 26 límites, 404, ocho rutas HTTP y 224 PNG previos comprobados. Matriz documental, no regeneración ni aceptación; 29 aprobaciones finales pendientes. Informe local var/validacion/diseno-global-vg9-1/resultado.json. VG9.2 completado técnicamente: docs/DISENO-GLOBAL-VG9-2-VALIDACION.md; TC2 estado/bootstrap, ciclo con Ingreso/AppTopbar reales y API ficticia, Next público real con cero POST, lint/Webpack. Pruebas sin cambios de aplicación o datos; autenticación real pendiente. Nuevos resultados var/validacion/diseno-global-vg9-2/ sin sobrescribir los anteriores; servidor temporal detenido. VG9.3 completado técnicamente: docs/DISENO-GLOBAL-VG9-3-VALIDACION.md; foco/error sólidos, controles deshabilitados legibles, bordes outline, iconos y hover destructivo 5%/10%, sin cambiar paleta base ni semántica. 18.268 mediciones con alfa/opacidad, cero fallos; grillas en ambos temas, TC2, lint/Webpack. Fuentes/huellas y resultados var/validacion/diseno-global-vg9-3/. Cambios compartidos invalidan vigencia visual de capturas anteriores hasta regresión final; no marcar todo certificado. VG9.4 comprobado técnicamente: docs/DISENO-GLOBAL-VG9-4-VALIDACION.md; retorno de foco en buscador y menú móvil, foco CommandInput, label español efectivo para listas, avisos sin coincidencias live y diálogos desplazables. Prueba nueva con layout/controles reales y API/consultas/router ficticios; AX y zoom real chrome.tabs.setZoom(2), ventana constante/innerWidth mitad/DPR doble en Claro/Oscuro. Grillas por tema, contraste y VG8, lint y build Turbopack correctos. Sin servidor ni BD. Lector real AT-01–AT-07 pendiente: VG9.4 sigue abierto por ello; no declarar accesibilidad integral. Resultados y huellas var/validacion/diseno-global-vg9-4/. Siguiente desarrollo técnico VG9.5; no ejecutar VG9 entero por esta continuidad. No volver a preguntar identidad, fuente ni paleta: conservar la dirección aprobada; no marcar módulos pendientes como validados sólo por heredar tokens globales.


## Continuidad VG9.5 — 29-10-2026

VG9.5 completado técnicamente: docs/DISENO-GLOBAL-VG9-5-VALIDACION.md y sección 21 del hito global. Cabeceras/opciones con palabras extensas, nombre de usuario acotado, DataTable con región enfocable y Table con scrollIntoView nearest del control enfocado; selector con altura disponible y lista encogible. Nuevo tests/diseno-global-vg9-5.ui.ts: layout/componentes reales con consultas/router ficticios, cinco tamaños por tema (incluye 1440 y 640×360), teclado y toque emulado a 360. Galerías VG2–VG8 958 entradas y piloto 22 correctos antes del ajuste final de altura; después se repitieron VG9.5 y VG9.4/zoom real en directorio independiente. Lint/build Turbopack correctos, sin servidor propio ni BD. Evidencia/huellas var/validacion/diseno-global-vg9-5/. Tests VG2–VG7, VG9.4 y piloto admiten DISENO_EVIDENCIA_DIR conservando valores predeterminados; VG8 mantiene su variable. Lector real VG9.4 y revisión en dispositivos físicos/otros motores siguen pendientes. Siguiente VG9.6 Estados y perfiles; no ejecutar todo VG9 ni cerrar validaciones funcionales anteriores por herencia.


## Continuidad VG9.6 — 29-10-2026

VG9.6 completado técnicamente: docs/DISENO-GLOBAL-VG9-6-VALIDACION.md y sección 22 del hito. Cinco mantenedores adaptan ayuda vacía a usePermiso existente; DataTable y TablaConsulta muestran el mensaje vacío fuera de las columnas desplazables para evitar recorte móvil. Nuevo tests/diseno-global-vg9-6.ui.ts: 92 entradas, Claro/Oscuro, ocho perfiles/combinaciones, 0/1/125 registros, filtros/paginación/reducción y carga/error/reintento; contexto de identidad y lecturas ficticios, escrituras rechazadas/Prisma bloqueado. Matriz explícita de permisos (incluidos costos/precios) y cobertura estática S4; no certifica HTTP/DTO o autenticación real. VG3 repetido 160 escenarios correctos, lint/Webpack correctos. Turbopack habitual se detuvo tras más de 100 s sin progreso en compile; no atribuir EPERM sin evidencia ni cambiar script. Fuentes/huellas/capturas var/validacion/diseno-global-vg9-6/. No servicios, datos, esquema ni PDF modificados. Siguiente VG9.7 Flujos y grillas; pruebas reales de roles/HTTP/campos económicos, lector VG9.4 y dispositivos VG9.5 siguen pendientes.


## Continuidad VG9.7 — 29-10-2026

VG9.7 completado técnicamente: docs/DISENO-GLOBAL-VG9-7-VALIDACION.md y sección 23 del hito. Grillas 7/7 por tema, 30 capturas; Ventas 92 entradas, Cobranzas 88, piloto Compras/Dashboard 22. Borradores, revisión/descarte, respuesta incierta, reintentos con contenido/UUID idéntico y consultas anidadas con acciones simuladas; no transacciones, archivos ni sesiones reales. tests/soporte/grillas-navegador.ts ahora carga Plex Sans local 400/600 y fija preferencia/idioma; captura comprueba fuente y tema. No se cambiaron componentes productivos ni servicios/datos/esquema/PDF. Lint/Webpack correctos; Turbopack habitual limitado a 90 s se agotó en compile (124 del limitador), sin cambiar script. Índice/116 huellas var/validacion/diseno-global-vg9-7/resultado.json, no atribuir ejecución a todos los componentes por estar hasheados. Pendientes integración real/aceptación, lector VG9.4 y dispositivos VG9.5. Siguiente VG9.8 Conservación de reglas y documentos; no avanzar a otros hitos ni cerrar GD7/S7/Cobranzas por estas simulaciones.


## Continuidad VG9.8 — 29-10-2026

VG9.8 completado técnicamente: docs/DISENO-GLOBAL-VG9-8-VALIDACION.md y sección 24 del hito. Nuevo tests/diseno-global-vg9-8-preservacion.ts, sin Prisma/BD, compara 200 fuentes protegidas a d555de5ca086492e727569a7ce7df217a3caa768 y 113 firmas importadas en 102 interfaces por AST; conjunto de llamadas, no control de flujo formal. Nueve pruebas puras correctas. Seis PDF locales regulares (3 cotizaciones, 2 OT, 1 guía) conservados durante auditoría/validaciones con cabecera/tamaño/SHA; no hay manifiesto pre-VG1 ni conciliación con BD, no afirmar preservación histórica retrospectiva absoluta. Modo normal inicia inventario; --comprobar-cierre verifica sin reiniciarlo. Usar VG9_8_BASE con el commit archivado si se necesitan comparar cambios de Git posteriores. Lint/Webpack correctos; Turbopack habitual agotó 90 s, scripts intactos. Evidencia var/validacion/diseno-global-vg9-8/. Sin servicios, esquema, PDFs ni datos modificados; manual PDF excluido de documentos comerciales. Siguiente VG9.9 Comprobaciones técnicas; integración real/aceptación y pendientes previos conservados.


## Continuidad VG9.9 — 29-10-2026

VG9.9 completado técnicamente: docs/DISENO-GLOBAL-VG9-9-VALIDACION.md y sección 25 del hito. Ejecutor scripts/validar-diseno-global.ts, 32 pasos correctos; lint/tsc/build Turbopack correctos en ejecución final, sin necesitar Webpack. Next público real cero POST, servidor temporal cerrado; nueve puras, galerías VG2–VG8 958, TC2/ciclo, contraste 18.268, AX/zoom real, responsive 10, estados 92, piloto 22, grillas 7/7 por tema correctos. Conservación y 329 huellas estables. Primer intento propio falló por entorno tipado como ProcessEnv completo; corregido a Partial, abortado y archivado en antes/. Resultado vigente var/validacion/diseno-global-vg9-9/resultado.json, todas las suites regeneradas; no usar antes/ como cierre. Destinos DISENO_EVIDENCIA_DIR extendidos a VG9.2, VG9.3, VG9.5, VG9.6 y auditor VG9.8, predeterminados intactos. No cambios productivos ni BD/servicios/esquema/PDF comercial. Siguiente VG9.10 Documentación final: manual Markdown/PDF, capturas ficticias de esta ejecución, referencias/continuidad; si sólo cambia documentación no repetir build/suites. Lector real VG9.4, dispositivos/motores, integración real y VG9.11 aceptación siguen pendientes.


## Continuidad VG9.10 — 30-10-2026

VG9.10 documental completo: docs/DISENO-GLOBAL-VG9-10-VALIDACION.md y sección 26 de HITO-DISENO-GLOBAL.md. Manual Markdown/PDF edición 30-10, 19 capítulos/26 páginas, ocho capturas ficticias de la ejecución final VG9.9 copiadas sin cambios a docs/capturas/manual-vg9-10/ con manifest de origen/SHA-256. Exportador intacto; exportación, texto, imágenes, rutas/anclas y muestra visual correctos. Sin código, BD, configuración ni PDF comercial modificados. Resumen de CIERRE-VERSION-1 conciliado sin borrar historial. Siguiente VG9.11 aceptación con usuario; lector real VG9.4, dispositivos/motores, integración y validaciones funcionales anteriores conservados. No repetir build/suites sólo por retomar documentación; no afirmar cierre global de VG9/V1.
