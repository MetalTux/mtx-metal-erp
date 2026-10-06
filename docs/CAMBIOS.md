# Registro de cambios

## 2026-10-05 (segunda parte): Fechas de registro y migración inicial

Completa los dos puntos que habían quedado pendientes en la revisión anterior (ver más abajo). Con esto, la base de datos local queda al día con el esquema.

### 9. Fechas de registro y vencimiento de la cotización

**Qué cambió:**
- **Todos los modelos** tienen `createdAt` (fecha de registro), que se llena sola al crear el registro y no cambia después.
- **Todos los modelos, salvo `StockMovement`,** tienen `updatedAt` (última modificación), que Prisma actualiza solo en cada cambio. `StockMovement` no lo tiene porque un movimiento de stock no se edita: si hubo un error, se corrige con un nuevo movimiento de tipo `AJUSTE`.
- **`Quote`** tiene un nuevo campo opcional, `validUntil`: la fecha hasta la que se mantiene la oferta.

**Por qué:**
- **Fechas de registro:** no había forma de saber cuándo se creó o se modificó un cliente, un material o una orden de trabajo.
- **Vencimiento:** en estructuras metálicas los precios del acero cambian seguido, así que una cotización sin vencimiento puede obligar a respetar precios desactualizados.

**Para qué sirve:**
- **Ordenar y filtrar:** por ejemplo, "materiales creados este mes" o "órdenes modificadas hoy".
- **Revisión:** detectar registros modificados después de lo esperado.
- **Vencimiento:** mostrar en la cotización "válida hasta" y detectar las vencidas.

**Diferencia entre `date` y `createdAt`:** varios modelos (`Purchase`, `Quote`, `SalesOrder`, `DeliveryNote`, `StockMovement`) ya tenían `date`. Son dos fechas distintas:
- `date` es la **fecha del documento o del hecho**, y se puede indicar a mano. Por ejemplo, una factura de compra del lunes que se ingresa al sistema el miércoles.
- `createdAt` es **cuándo se ingresó al sistema**, y no se puede cambiar.

### 10. Migración inicial

**Qué cambió:** se creó la primera migración, `prisma/migrations/20261006004602_correccion_de_estructura_de_datos_y_uso_de_tipos_de_datos_mas_logicos/`. Prisma convierte el nombre pedido ("Corrección de estructura de datos y uso de tipos de datos más lógicos") a un formato válido para carpetas: sin tildes ni espacios, y con la fecha y hora de creación al inicio.

Para aplicarla se reinició la base local, lo que borró los datos de prueba, y se volvió a ejecutar el seed.

**Por qué:** la base se había creado con `prisma db push`, que aplica el esquema directamente sin dejar registro. Así no había forma de repetir los cambios en otra base (otro computador o el servidor de producción) ni de saber qué versión del esquema tenía cada una.

**Para qué sirve:**
- **Archivo SQL:** cada cambio de esquema queda guardado en `prisma/migrations/` y se sube a git junto con el código.
- **Otras bases:** cualquier base nueva se deja al día con un solo comando:
  ```bash
  pnpm prisma migrate deploy   # en producción: aplica las migraciones pendientes sin borrar datos
  pnpm prisma migrate dev      # en desarrollo: además detecta cambios nuevos en el esquema
  ```

**Cómo se trabaja desde ahora:**
1. Editar `prisma/schema.prisma`.
2. Ejecutar `pnpm prisma migrate dev --name <descripción del cambio>`.
3. Ejecutar `pnpm prisma generate`. **En Prisma 7, `migrate dev` ya no lo hace solo.** Si se omite, el código sigue usando el cliente antiguo. Pasó durante esta migración: el seed falló porque el cliente no conocía `updatedAt`, y funcionó después de regenerarlo.
4. No volver a usar `prisma db push` en esta base, porque deja el historial de migraciones desalineado.

### Cómo se verificó

- **Migración:** `prisma migrate status` indica que la base está al día. El SQL crea las 17 tablas con sus 27 índices, las columnas `DECIMAL` y las fechas `createdAt`/`updatedAt`.
- **Seed:** se ejecutó correctamente (3 roles, 6 unidades, 1 usuario) y las fechas se llenaron solas.
- **Código:** pasaron sin errores `tsc --noEmit`, `pnpm lint` y `pnpm build`.

### Pendientes

- **Seguridad, inicio de sesión y roles:** quedan para una etapa posterior. Esto incluye las contraseñas en texto plano del seed.

---

## 2026-10-05: Revisión del modelo de datos y la configuración base

Esta revisión corrige problemas encontrados en el código inicial, antes de construir pantallas y lógica sobre él. La numeración sigue la de la revisión original. Los puntos 9 (fechas de registro) y 10 (migraciones) quedaron pendientes a propósito.

> **Nota:** los puntos 9 y 10 se completaron después, en la sección "segunda parte" de arriba. La base de datos local ya tiene todos estos cambios.

### Resumen

| # | Cambio | Archivo |
|---|--------|---------|
| 1 | Las órdenes de trabajo pueden ser de obra propia (sin cliente) | `prisma/schema.prisma` |
| 2 | Nuevo modelo `QuoteDetail`: líneas de la cotización | `prisma/schema.prisma` |
| 3 | Compras y consumos indican su bodega | `prisma/schema.prisma` |
| 4 | Nuevo modelo `StockMovement`: historial de stock (kardex) | `prisma/schema.prisma` |
| 5 | Montos y cantidades pasan de `Float` a `Decimal` | `prisma/schema.prisma` |
| 6 | Regla clara de unidades: una unidad por material | `prisma/schema.prisma` |
| 7 | Nombre de unidad de medida único; el seed usa `upsert` | `prisma/schema.prisma`, `prisma/seed.ts` |
| 8 | Índices en todas las claves foráneas | `prisma/schema.prisma` |
| 11 | `dotenv` agregado como dependencia | `package.json`, `prisma/seed.ts` |
| 12 | Cliente de base de datos más robusto | `src/lib/prisma.ts` |
| 13 | Generador `prisma-client` de Prisma 7 | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| 14 | Limpieza de restos de plantilla | `src/app/layout.tsx`, `docker-compose.yml` |

---

### 1. Órdenes de trabajo de obra propia

**Qué cambió:** en `WorkOrder`, el campo `salesOrderId` ahora es opcional. También se agregó `description` (opcional) para detallar el trabajo.

**Por qué:** antes, toda orden de trabajo tenía que colgar de una orden de venta, y esta de una cotización y un cliente. No se podía registrar una estructura fabricada por iniciativa propia, como un trabajo para stock, para uso interno o para un proyecto personal.

**Para qué sirve:**
- Con `salesOrderId` → es un trabajo encargado por un cliente.
- Con `salesOrderId` vacío (`null`) → es una **obra propia**.

Ambos tipos consumen materiales de bodega de la misma forma. Para listar solo las obras propias:

```ts
prisma.workOrder.findMany({ where: { salesOrderId: null } })
```

### 2. Líneas de detalle en la cotización (`QuoteDetail`)

**Qué cambió:** se agregó el modelo `QuoteDetail`, que se relaciona con `Quote` mediante `details`. Cada línea tiene descripción, cantidad, precio unitario y, si corresponde, un material del catálogo.

**Por qué:** `Quote` solo guardaba el monto total. No quedaba registro de qué se había cotizado, y no se podía armar el PDF de la cotización ni saber qué materiales iba a requerir el trabajo.

**Para qué sirve:**
- **Línea con `rawMaterialId`** → un material del catálogo (por ejemplo, "Plancha 3 mm, 2,5 kg").
- **Línea sin `rawMaterialId`** → un ítem libre, como mano de obra, flete, instalación o pintura.
- **Total:** `totalAmount` se mantiene en `Quote`. Al crear la cotización desde la aplicación debe calcularse como la suma de `quantity × unitPrice` de sus líneas.

### 3. Bodega en compras y consumos

**Qué cambió:** se agregó `warehouseId` (obligatorio) a:
- `PurchaseDetail`: la bodega donde **se recibe** el material comprado.
- `WorkOrderDetail`: la bodega de la que **se descuenta** el material usado.

**Por qué:** había varias bodegas, pero ni las compras ni los consumos decían cuál usar. Al recibir una compra no se sabía qué stock aumentar, y al iniciar un trabajo no se sabía qué stock descontar.

**Para qué sirve:** es lo que permite mantener correcto el stock por bodega. Se definió por línea, y no por compra completa, para que una misma compra pueda repartirse en distintas bodegas.

### 4. Historial de movimientos de stock (`StockMovement`)

**Qué cambió:** se agregó el modelo `StockMovement` y el enum `StockMovementType`, con tres tipos:
- `ENTRADA`: compra recibida.
- `SALIDA`: consumo de una orden de trabajo.
- `AJUSTE`: corrección manual, como inventario, merma o pérdida.

Cada movimiento guarda la fecha, la bodega, el material y la cantidad **con signo**: positiva suma y negativa resta. Opcionalmente guarda su origen (`purchaseDetailId` o `workOrderDetailId`) y una nota.

**Por qué:** `WarehouseStock` solo guarda el saldo actual. Si el número no cuadraba con lo que había físicamente en bodega, no había forma de saber qué pasó ni cuándo.

**Para qué sirve:**
- **Kardex:** ver el historial completo de un material en una bodega.
- **Revisión:** cada ajuste queda registrado, con su motivo en `note`.
- **Recálculo:** el stock se puede reconstruir sumando los movimientos.

**Regla para el desarrollo futuro:** cada vez que cambie `WarehouseStock.quantity`, hay que crear el `StockMovement` correspondiente **dentro de la misma transacción** (`prisma.$transaction`). Así el saldo y el historial nunca quedan desalineados.

### 5. `Decimal` en lugar de `Float`

**Qué cambió:** todos los montos y cantidades pasaron a `Decimal`:
- **Dinero** (`totalAmount`, `unitPrice`): `Decimal(14, 2)`, es decir, hasta 12 dígitos enteros y 2 decimales.
- **Cantidades** (`quantity`, `quantityNeeded`): `Decimal(14, 3)`, que permite fracciones como 2,5 m o 0,125 kg.

**Por qué:** `Float` guarda los números de forma aproximada. Por ejemplo, `0.1 + 0.2` da `0.30000000000000004`. Al sumar muchas compras, consumos o líneas de cotización, esos errores se acumulan y aparecen descuadres de centavos o de gramos. Se eligió `Decimal` también para el dinero, en vez de `Int`, para no impedir precios con decimales (por ejemplo, el precio por kilo) ni otras monedas en el futuro.

**Para qué sirve:** las cuentas son exactas. Se comprobó en una base de prueba: `0.1 + 0.2` dio `0.3`.

**Cómo se usa en el código:** Prisma devuelve estos campos como objetos `Prisma.Decimal`, no como `number`.
- **Para escribirlos:** se pueden pasar como texto (`'1050.30'`) o como número.
- **Para operar:** se usan sus métodos (`.plus()`, `.times()`, etc.), no `+` ni `*`.
- **Para mostrarlos:** se usa `.toString()` o `.toNumber()`.

### 6. Una unidad de medida por material

**Qué cambió:** se eliminó el comentario de `WarehouseStock` que decía que la cantidad se guardaba "en la unidad mínima (ej. gramos)". En su lugar, `RawMaterial` documenta la regla.

**Por qué:** ese comentario contradecía el resto del sistema. El catálogo tiene Kilos, Litros y Metros, pero no hay factores de conversión entre unidades.

**Para qué sirve:** la regla queda así: **cada material se maneja siempre en una sola unidad, la de su `unitMeasure`**. Stock, compras, consumos y cotizaciones de ese material se expresan en esa unidad. Por ejemplo, si el perfil "Tubo 40×40" se define en metros, todo lo que tenga que ver con él va en metros.

### 7. Nombre de unidad de medida único

**Qué cambió:** `UnitMeasure.name` ahora es `@unique`. En `prisma/seed.ts`, la búsqueda manual con `findFirst` + `create` se reemplazó por `upsert`, igual que en los roles.

**Por qué:** sin la restricción, la base aceptaba dos unidades llamadas "Kilos". El seed tenía que verificarlo a mano, y la aplicación tendría que haber hecho lo mismo.

**Para qué sirve:** es la base de datos la que impide duplicados, y el seed queda más corto. Se comprobó que el seed puede ejecutarse dos veces seguidas sin duplicar datos.

### 8. Índices en claves foráneas

**Qué cambió:** se agregó `@@index` a todas las claves foráneas, por ejemplo `clientId` en `Quote` y `workOrderId` en `WorkOrderDetail`. `StockMovement` tiene además un índice compuesto (bodega, material, fecha) para consultar el kardex.

**Por qué:** PostgreSQL crea índices automáticamente para las claves primarias y los campos `@unique`, pero **no** para las claves foráneas.

**Para qué sirve:** consultas como "cotizaciones de este cliente" o "materiales de esta orden de trabajo" siguen siendo rápidas cuando hay miles de registros. Con pocos datos no se nota la diferencia; con muchos, sí.

### 11. Dependencia `dotenv`

**Qué cambió:** se instaló `dotenv` como dependencia de desarrollo. Además, `prisma/seed.ts` ahora lo carga al inicio.

**Por qué:**
- `prisma.config.ts` importaba `dotenv/config`, pero el paquete no estaba instalado; funcionaba solo porque Prisma lo resolvía por su cuenta.
- Al ejecutar el seed directamente con `tsx prisma/seed.ts`, sin pasar por `prisma db seed`, `DATABASE_URL` llegaba vacía.

**Para qué sirve:** la carga del archivo `.env` queda garantizada y el seed funciona de las dos formas.

### 12. Cliente de base de datos (`src/lib/prisma.ts`)

**Qué cambió:**
- **Validación de `DATABASE_URL`:** si falta, ahora lanza un error claro: *"Falta la variable de entorno DATABASE_URL. Revisa el archivo .env."*
- **Log según el entorno:** en desarrollo se muestran las consultas SQL; en producción, solo los errores.
- **Conexiones:** el cliente y su conexión se crean una sola vez y se reutilizan en cada recarga en caliente. Antes se creaba un `Pool` nuevo en cada recarga aunque no se usara. Ahora el adaptador `PrismaPg` recibe la cadena de conexión y administra su propio Pool.

**Por qué:**
- **Sin validación:** si faltaba la variable, la aplicación intentaba conectarse a una base por defecto y fallaba con un error confuso.
- **Log de SQL en producción:** llenaba los registros del servidor y podía exponer datos.

**Para qué sirve:** los errores de configuración se detectan al instante, los logs de producción quedan limpios y no se abren conexiones de más durante el desarrollo.

### 13. Generador `prisma-client` (Prisma 7)

**Qué cambió:**
- **Generador:** pasó de `prisma-client-js` a `prisma-client`.
- **Ubicación:** el cliente se genera en `src/generated/prisma/`, carpeta ignorada por git.
- **Imports:** el cliente se importa desde `src/generated/prisma/client` en vez de `@prisma/client`.

**Por qué:** `prisma-client-js` es el generador antiguo, que se mantiene solo por compatibilidad. `prisma-client` es el recomendado en Prisma 7: genera código TypeScript normal, visible dentro del proyecto, y no depende de `node_modules`.

**Para qué sirve:** el proyecto queda alineado con la versión actual de Prisma, lo que evita una migración forzada más adelante.

**Atención:** como el cliente generado no se sube a git, después de clonar el proyecto o de cambiar el esquema hay que ejecutar `pnpm prisma generate`.

### 14. Restos de la plantilla inicial

**Qué cambió:**
- **`src/app/layout.tsx`:** el idioma pasó de `en` a `es`. El título ahora es "MTX Metal ERP" y la descripción explica el propósito del sistema.
- **`docker-compose.yml`:** se eliminó la línea `version: '3.8'`.

**Por qué:**
- **Idioma:** el navegador y los lectores de pantalla usan el idioma declarado para la ortografía, la traducción automática y la pronunciación.
- **Título:** es el que aparece en la pestaña del navegador.
- **`version`:** Docker Compose ya no usa ese campo y muestra una advertencia cada vez que se ejecuta.

**Para qué sirve:** la aplicación se identifica correctamente y Docker deja de mostrar advertencias.

---

### Cómo se verificó

Para no tocar la base de datos actual, se creó una base temporal en el mismo contenedor de PostgreSQL, que se borró al terminar. En ella:

- **Esquema:** se aplicó el nuevo esquema sin errores.
- **Seed:** se ejecutó dos veces (con `tsx` y con `prisma db seed`) sin duplicar datos.
- **Datos de prueba:** se creó una compra con bodega y su movimiento de stock, una cotización con una línea de material y otra de mano de obra, y una orden de trabajo de obra propia.
- **Error de configuración:** se comprobó el mensaje cuando falta `DATABASE_URL`.

Además, pasaron sin errores `prisma validate`, `tsc --noEmit`, `pnpm lint` y `pnpm build`.

### Pendientes (en ese momento)

- **Puntos 9 y 10:** completados en la segunda parte (ver arriba).
- **Seguridad, inicio de sesión y roles:** quedan para una etapa posterior.
