# CLAUDE.md

Este archivo orienta a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Proyecto

MTX Metal ERP es un ERP para empresas o personas que fabrican estructuras metálicas, ya sea por encargo de un cliente o para obra propia. En esta primera etapa el objetivo es ayudar a organizar:

- **Bodegas** y el stock que hay en cada una.
- **Materia prima**: el catálogo de materiales y sus unidades de medida.
- **Cotizaciones** a clientes.
- **Órdenes de trabajo**, con los materiales que consumen.

Usa Next.js 16 (App Router, React 19, React Compiler activado), Tailwind CSS v4 y Prisma 7 sobre PostgreSQL. La interfaz ya cuenta con un tema oscuro y layout responsive en `src/app/(app)/`, componentes shadcn/ui, navegación centralizada en `src/config/navegacion.ts` y páginas provisionales. El Dashboard tiene estructura visual. Unidades de medida, Bodegas, Proveedores, Clientes y Materias primas ya tienen CRUD completo con Server Actions y Prisma; los otros módulos, consultas del Dashboard e inicio de sesión siguen pendientes. Consultar [docs/GUIA-INTERFAZ.md](docs/GUIA-INTERFAZ.md) y el checklist [docs/AVANCES-INTERFAZ.md](docs/AVANCES-INTERFAZ.md) antes de trabajar en la interfaz.

Idioma: los comentarios, los datos del seed y los valores de los enums están en español. El código nuevo debe seguir esa convención, y las respuestas al usuario también deben ser en español.

## Comandos

El gestor de paquetes es pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).

```bash
pnpm dev                      # servidor de desarrollo de Next en http://localhost:3030
pnpm build                    # build de producción (también revisa los tipos)
pnpm lint                     # ESLint 9 (config flat: next core-web-vitals + typescript)

# Base de datos (Postgres 15 en Docker)
docker compose up -d                                   # docker-compose.yml, credenciales fijas en el archivo
docker compose -f docker-compose.fedora.yml up -d      # escucha solo en 127.0.0.1 y lee POSTGRES_PASSWORD desde .env

pnpm prisma generate          # regenerar el cliente después de editar prisma/schema.prisma
pnpm prisma migrate dev --name <nombre>
pnpm prisma db seed           # ejecuta `npx tsx prisma/seed.ts` (configurado en prisma.config.ts)
pnpm prisma studio
```

Todavía no hay framework de pruebas.

Después de cada validación, detén los servidores de aplicación que hayas iniciado para comprobar el cambio y verifica que sus puertos queden libres (desarrollo: 3030). Revisa los procesos existentes antes de iniciar la validación; no detengas servidores del usuario ni procesos ajenos. Si el puerto sigue ocupado por un proceso previo, informa de ello. No dejes un servidor de validación ejecutándose al terminar, salvo petición explícita del usuario.

## Arquitectura

- **Configuración de Prisma 7**: la URL de la base de datos no está en `schema.prisma`. Viene de `prisma.config.ts`, que carga `DATABASE_URL` desde `.env` mediante `dotenv/config`.
- **Migraciones** (`prisma/migrations/`): todo cambio de esquema se hace con `pnpm prisma migrate dev --name <descripción>`, nunca con `db push`. Después hay que ejecutar `pnpm prisma generate`, porque en Prisma 7 `migrate dev` no regenera el cliente. Prisma bloquea `migrate reset` y otros comandos destructivos cuando los ejecuta una IA: requieren la confirmación explícita del usuario en ese momento, entregada en la variable `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.
- **Cliente generado**: el generador es `prisma-client` y crea el cliente en `src/generated/prisma/`, carpeta ignorada por git. Hay que ejecutar `pnpm prisma generate` después de clonar el proyecto o de editar el esquema. Los tipos y enums se importan desde `@/generated/prisma/client`, no desde `@prisma/client`.
- **Cliente de base de datos**: [src/lib/prisma.ts](src/lib/prisma.ts) exporta una única instancia `prisma` y es el único lugar donde se crea `PrismaClient`. Usa el adaptador `@prisma/adapter-pg` (Prisma 7 lo exige) y falla con un mensaje claro si falta `DATABASE_URL`. Las consultas SQL se muestran en el log solo fuera de producción. Se importa con `@/lib/prisma`; el alias `@/*` apunta a `src/*`. El seed usa este mismo cliente y carga `dotenv/config` antes de importarlo.
- **Modelo de dominio** ([prisma/schema.prisma](prisma/schema.prisma)), organizado en secciones numeradas:
  1. Autenticación: `Role` → `User`. Por ahora el seed guarda las contraseñas en texto plano; está previsto usar bcrypt.
  2. Materiales: `UnitMeasure` (unidad de medida, con nombre único) → `RawMaterial` (materia prima).
  3. Bodega: `Warehouse`, `WarehouseStock` (saldo actual, con una sola fila por combinación de bodega y material) y `StockMovement` (kardex: `ENTRADA`, `SALIDA` o `AJUSTE`, con cantidad positiva o negativa).
  4. Compras: `Supplier` (proveedor, identificado por su `rut`) → `Purchase` → `PurchaseDetail`. Cada línea indica la bodega que recibe el material.
  5. Ventas: `Client` (`rut`) → `Quote` (cotización, `QuoteStatus`) → `QuoteDetail` y `SalesOrder` (orden de venta; `pdfUrl` está pensado para guardar archivos en AWS S3 más adelante). Una línea de cotización sin `rawMaterialId` es un ítem libre, como mano de obra o flete.
  6. Producción y entregas: `WorkOrder` (orden de trabajo, `WorkOrderStatus`) → `WorkOrderDetail` (material y bodega de la que se descuenta) y `DeliveryNote` (guía de despacho, con `PaymentStatus` y `voucherUrl`).
  7. Empresa: `CompanyProfile`, perfil único de la empresa que usa el ERP. Sus datos son opcionales para configurarlos gradualmente; la migración crea la tabla vacía.
  8. Cobranza: `SalesOrder` → `AccountReceivable` (máximo una por venta) → `Payment` (abonos). Las tablas comienzan vacías; los campos de pago en `DeliveryNote` se conservan como heredados durante la transición.

  Flujo principal del negocio: Cotización → Orden de venta → Orden de trabajo → Guía de despacho. Una orden de trabajo con `salesOrderId` vacío es una **obra propia**, sin cliente. Las compras suman materia prima al stock y las órdenes de trabajo la consumen.

## Reglas del dominio

- **Una unidad por material:** cada material se maneja siempre en la unidad de su `unitMeasure`, sin conversiones entre unidades.
- **Montos y cantidades en `Decimal`:** el dinero es `Decimal(14,2)` y las cantidades `Decimal(14,3)`. Prisma los devuelve como `Prisma.Decimal`, así que hay que operar con `.plus()`, `.times()`, etc., y nunca con `+` ni `*`.
- **Stock y kardex juntos:** todo cambio en `WarehouseStock.quantity` debe ir acompañado de su `StockMovement`, dentro de la misma `prisma.$transaction`.
- **Stock mínimo por bodega:** `WarehouseStock.minStock` es `Decimal(14,3)` opcional, en la unidad del material. `null` significa sin configurar y cero es válido. La migración SQL define `WarehouseStock_minStock_nonnegative_check`, que rechaza negativos y `NaN`; conservar esta restricción. Configurar el mínimo no cambia el saldo ni crea movimientos. La estructura está implementada; las alertas y pantallas siguen pendientes (ver [docs/PROPUESTAS-DOMINIO.md](docs/PROPUESTAS-DOMINIO.md)).
- **Perfil de empresa único:** `CompanyProfile.id` tiene default `1`, sin autoincremento. La PK y el CHECK SQL `CompanyProfile_singleton_check` garantizan como máximo una fila con ese ID. Conservar la restricción en las migraciones. Configuración → Empresa ya consulta y edita el perfil con RUT validado/normalizado y protección por `updatedAt`. Los requisitos de emisión y documentos históricos siguen pendientes. El logo se carga localmente mediante `AlmacenLogo`, preparado para un adaptador futuro de S3; respaldar PostgreSQL y `var/empresa/logos/` (o `EMPRESA_LOGO_DIR`) juntos.
- **Cobranza por venta:** cuenta única por `salesOrderId`, importe no negativo y abonos estrictamente positivos, todos `Decimal(14,2)` y sin `NaN`. `Payment.idempotencyKey` es UUID único obligatorio, sin default. El medio de pago no puede estar vacío. Las anulaciones usan `voidedAt` y `voidReason` juntos, con motivo no vacío, garantizado mediante CHECK SQL. Conservar las restricciones y las FK con borrado restringido.
- **Cálculo de cobranza:** saldo = importe acordado menos abonos no anulados; las cuentas anuladas no se incluyen en el total por cobrar. Vencimiento y promesa de pago son fechas de calendario independientes. La lógica de sobrepagos, concurrencia, reintentos y anulaciones se implementará en los módulos; todavía no está automatizada. No usar los campos heredados de las guías como fuente para las nuevas cuentas ni inventar pagos al migrar.
- **Total de la cotización:** `Quote.totalAmount` debe ser igual a la suma de `quantity × unitPrice` de sus `QuoteDetail`.
- **Fechas:** todos los modelos tienen `createdAt`, y todos salvo `StockMovement` tienen `updatedAt`. Los movimientos de stock no se editan: un error se corrige con un nuevo `AJUSTE`. El campo `date`, donde existe, es la fecha del documento y puede indicarse a mano; `createdAt` es cuándo se registró. `Quote.validUntil` es el vencimiento de la cotización.
- **Índices:** toda clave foránea nueva lleva su `@@index`, porque PostgreSQL no lo crea solo.
- **Registro de cambios:** los cambios de esquema o de arquitectura se documentan en [docs/CAMBIOS.md](docs/CAMBIOS.md), explicando qué cambió, por qué y para qué sirve.

## Notas del repositorio

- `.claude/skills/`, `.agents/skills/` y `.windsurf/skills/` contienen las mismas skills de Prisma, instaladas desde fuera (las controla `skills-lock.json`). No se deben editar a mano.

## Consultas de inventario y Compras (06-10-2026)

Stock por bodega y Movimientos ya consultan PostgreSQL con filtros buscables y paginación/orden de servidor, sin escrituras. Decimal se serializa como texto y se formatea sin conversión a `number`; los filtros de fechas usan días completos de Santiago. Mínimos/alertas y ajustes siguen pendientes. Compras se planificó en `docs/HITO-COMPRAS.md` y espera respuestas explícitas sobre recepción, importes/documento y correcciones antes de implementar persistencia o modificar Prisma.
