# AGENTS.md

Instrucciones para Codex y otros agentes que trabajen en este repositorio. Aplican a todo el proyecto.

## Contexto y forma de trabajar

- **Proyecto:** MTX Metal ERP, para fabricación de estructuras metálicas por encargo o para obra propia. Organiza bodegas, materia prima, compras, cotizaciones, producción y entregas.
- **Idioma:** responde en español. Escribe comentarios, textos visibles y datos de ejemplo en español; conserva los nombres existentes de modelos, campos y APIs. Los valores de los enums del dominio están en español.
- **Stack:** Next.js 16 con App Router, React 19 con React Compiler, TypeScript estricto, Tailwind CSS v4 y Prisma 7 sobre PostgreSQL 15.
- **Estado actual:** la interfaz sigue siendo la plantilla de Next.js. El dominio está definido principalmente en Prisma; shadcn/ui, autenticación y pantallas del ERP todavía no están implementados.
- Antes de editar, revisa `git status --short` y los archivos afectados. Conserva los cambios previos del usuario y limita la edición al alcance solicitado.
- Usa **pnpm** y conserva `pnpm-lock.yaml`. Consulta `package.json` para verificar scripts y dependencias disponibles.

## Fuentes de referencia

| Archivo | Cuándo consultarlo |
| --- | --- |
| `prisma/schema.prisma` | Modelos, relaciones, enums, precisión e índices reales |
| `prisma.config.ts` | Conexión, ubicación de migraciones y comando del seed |
| `src/lib/prisma.ts` | Instancia compartida del cliente de base de datos |
| `docs/GUIA-INTERFAZ.md` | Diseño visual, navegación, Dashboard y fases propuestas; leer antes de trabajar en la interfaz |
| `docs/PROPUESTAS-DOMINIO.md` | Alternativas, decisiones y checklists de stock mínimo, empresa y cobranza; consultar antes de implementar esos temas |
| `diseno-01.jpeg`, `diseno-02.jpeg` | Referencias visuales de la guía |
| `docs/CAMBIOS.md` | Decisiones y registro de cambios de esquema o arquitectura |
| `CLAUDE.md` | Documento original de las reglas del proyecto |

Distingue el estado real del código de las propuestas de la guía. Si encuentras una discrepancia, explícala y no presentes una funcionalidad planeada como implementada. Leer la guía no autoriza a implementarla completa ni a modificarla.

## Comandos

Ejecuta los comandos desde la raíz. El desarrollo usa el puerto **1657**; `pnpm start` usa el puerto predeterminado de Next.js salvo configuración de entorno.

```bash
pnpm install                  # instalar dependencias
pnpm dev                      # http://localhost:1657
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
- Importa la instancia compartida con `import { prisma } from "@/lib/prisma"`. **Solo `src/lib/prisma.ts` crea `PrismaClient`**; reutiliza la instancia en desarrollo y administra las conexiones mediante `PrismaPg` de `@prisma/adapter-pg`.
- La conexión se configura en `prisma.config.ts`, que carga `dotenv/config` y lee `DATABASE_URL`. La URL no va en `schema.prisma`. El cliente compartido también exige esa variable y registra consultas SQL únicamente fuera de producción.
- El generador es `prisma-client`, con salida en `src/generated/prisma/`, ignorada por git. Importa los tipos y enums del servidor desde `@/generated/prisma/client`, no desde `@prisma/client`. No edites ni subas el código generado.
- Ejecuta `pnpm prisma generate` después de clonar o cambiar el esquema. En Prisma 7, `migrate dev` no regenera el cliente.
- Cambia el esquema mediante migraciones versionadas en `prisma/migrations/`: editar esquema → `pnpm prisma migrate dev --name <descripcion>` → `pnpm prisma generate`. **No uses `prisma db push`**.
- No reinicies ni borres bases o volúmenes sin consentimiento explícito del usuario. Si Prisma exige `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`, usa únicamente la confirmación real del usuario para esa acción; nunca inventes su contenido ni eludas el bloqueo.
- El seed carga `dotenv/config` antes de importar el cliente compartido y usa `upsert` para los datos base. Actualmente incluye una contraseña en texto plano: la autenticación y el uso de bcrypt son trabajo pendiente.
- `.claude/skills/`, `.agents/skills/` y `.windsurf/skills/` contienen skills de Prisma administradas mediante `skills-lock.json`. No las edites a mano. Usa la skill correspondiente cuando trabajes en consultas, CLI, conexión o cambios específicos de Prisma.

## Dominio y reglas obligatorias

Flujo principal: **Cotización → Orden de venta → Orden de trabajo → Guía de despacho**.

| Área | Modelos y relaciones principales |
| --- | --- |
| Autenticación | `Role` → `User` |
| Materiales | `UnitMeasure` → `RawMaterial` |
| Inventario | `Warehouse`, `WarehouseStock`, `StockMovement` |
| Compras | `Supplier` → `Purchase` → `PurchaseDetail` |
| Ventas | `Client` → `Quote` → `QuoteDetail` y `SalesOrder` |
| Producción y entregas | `WorkOrder` → `WorkOrderDetail` y `DeliveryNote` |

- **Unidad única:** todas las cantidades de un material usan su `unitMeasure`; no hay conversiones entre unidades. `UnitMeasure.name` es único.
- **Precisión:** dinero en `Decimal(14,2)` y cantidades en `Decimal(14,3)`. Calcula con `Prisma.Decimal` y métodos como `.plus()` y `.times()`; no uses `+`, `*` ni conversiones a `number` para cálculos del dominio.
- **Stock y kardex:** cada cambio en `WarehouseStock.quantity` debe crear su `StockMovement` en la misma `prisma.$transaction`, usando el cliente de esa transacción para ambas operaciones. El saldo debe coincidir con la suma de movimientos para la misma bodega y material.
- **Stock único:** conserva `@@unique([warehouseId, rawMaterialId])` en `WarehouseStock`.
- **Signo de movimientos:** `ENTRADA` suma, `SALIDA` resta y `AJUSTE` puede sumar o restar. Vincula compras y consumos con sus detalles de origen cuando corresponda. No edites movimientos históricos; corrige errores con un nuevo `AJUSTE`.
- **Bodega por línea:** `PurchaseDetail.warehouseId` identifica dónde se recibe; `WorkOrderDetail.warehouseId`, desde dónde se consume. No supongas una sola bodega para todo el documento.
- **Cotizaciones:** calcula `Quote.totalAmount` como la suma de `quantity × unitPrice` de sus detalles. `QuoteDetail.rawMaterialId = null` representa un ítem libre, como mano de obra o flete.
- **Obra propia:** `WorkOrder.salesOrderId = null` significa fabricación sin cliente. También consume materiales; no fuerces una orden de venta ni un cliente ficticio.
- **Fechas:** todos los modelos tienen `createdAt`; todos salvo `StockMovement` tienen `updatedAt`. `date` es la fecha del documento o hecho, que puede indicarse manualmente; `createdAt` es la fecha de registro. `Quote.validUntil` es el vencimiento opcional de la oferta.
- **Índices:** toda clave foránea nueva debe quedar cubierta por un índice apropiado. Sigue el patrón de `@@index` existente y considera la cobertura de índices compuestos o únicos.
- **Archivos:** `SalesOrder.pdfUrl` y `DeliveryNote.voucherUrl` son campos para URLs; la integración con AWS S3 todavía está prevista para más adelante.

## Base para la futura interfaz

La fuente detallada es `docs/GUIA-INTERFAZ.md`, cuyo estado es **propuesta para revisar, todavía sin implementar**. Respeta las decisiones posteriores del usuario al desarrollar cada fase.

- **Dirección visual propuesta:** `diseno-02` como base, tema oscuro grafito con tinte azul, acento azul para acciones y naranjo para detalles de marca. De `diseno-01` se contempla solo un toque metálico opcional en cabeceras de tarjetas. Se excluye el visualizador del producto.
- **Sistema visual:** shadcn/ui sobre Tailwind v4, tokens CSS en `.dark` registrados en `@theme inline`, Inter como fuente principal, Geist Mono para códigos e iconos de `lucide-react`. Usa `tabular-nums` para cifras, badges con texto y barras de stock acompañadas de números. Verifica contraste y foco al implementar; no asumas que todos los valores propuestos ya cumplen accesibilidad.
- **Estructura:** sidebar contraíble a iconos en escritorio y panel lateral en móvil; barra superior con breadcrumbs, buscador `Ctrl+K`, notificaciones y usuario. Dashboard en `/`, con KPIs, requerimientos frente a stock, órdenes activas, gráfico de cotizaciones, vencimientos y últimos movimientos.
- **Navegación propuesta:** Mantenedores, Inventario, Compras, Ventas y Trabajos. Administración se incorpora cuando exista el login. Centraliza menú, rutas e iconos en `src/config/navegacion.ts`.
- **Organización propuesta:** `src/app/(app)/` para el ERP; `(auth)` para el futuro login; `src/components/layout/` para sidebar y barra superior; `src/components/` para componentes compartidos; `src/lib/consultas/`, `src/lib/validaciones/` y `src/lib/formato.ts` para consultas, validación y formato.
- **Datos y formularios:** consultas del Dashboard en el servidor, con agregaciones en lugar de cargar todas las filas. Envía `Decimal` como texto a componentes cliente; normaliza fechas a ISO cuando el contrato de datos lo requiera. La guía propone Server Actions y esquemas zod compartidos para formularios futuros.
- **Formato chileno:** `es-CL`, moneda CLP, cantidades con hasta tres decimales y unidad, fechas `dd-MM-yyyy`, horas `HH:mm` y RUT con puntos y guion.
- **Decisiones pendientes:** confirmar paleta, grupos del menú e indicadores; `RawMaterial.minStock`, el modelo Empresa y un monto propio en `DeliveryNote` no existen. No añadas esos campos por inferencia. Sumar el total de la cotización por cada guía puede duplicar la cobranza si hay varios despachos; define esa regla antes de presentar el KPI como exacto.
- **Secuencia propuesta:** tema → layout y navegación → componentes compartidos → Dashboard → mantenedores → procesos → autenticación y roles. Instala dependencias al abordar la fase correspondiente y verifica la documentación oficial vigente de shadcn/ui antes de usar su CLI o elegir componentes.

## Validación y cierre

- Para cambios de código, ejecuta `pnpm lint` y `pnpm build`. Añade comprobaciones específicas cuando la lógica del dominio lo requiera; actualmente no hay framework de pruebas ni script `test`.
- Para cambios de esquema, valida Prisma, genera el cliente y verifica la migración en el entorno autorizado antes de las comprobaciones de aplicación.
- Para cambios solo de documentación, revisa contenido, rutas y diff; no es necesario ejecutar build, levantar servicios ni tocar la base de datos.
- Documenta cambios de esquema o arquitectura en `docs/CAMBIOS.md`: qué cambió, por qué y para qué sirve. La guía también pide registrar cada fase implementada de interfaz.
- Al terminar, revisa el diff y explica en español qué cambió, cómo se verificó y cualquier limitación real. No afirmes haber ejecutado comprobaciones que no realizaste.
