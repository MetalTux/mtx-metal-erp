# Guía de interfaz: plan de implementación y sistema visual

> **Estado:** propuesta para revisar, todavía sin implementar.
> **Fecha:** 2026-10-06
> **Referencias visuales:** `diseno-01.jpeg` y `diseno-02.jpeg`, en la raíz del proyecto.

Este documento define cómo se verá la aplicación y los pasos para construir su interfaz con **shadcn/ui**. La interfaz se compone de:

- un menú lateral (sidebar) agrupado por áreas del negocio,
- una barra superior,
- un **Dashboard** como página de inicio.

---

## 1. Lectura de las imágenes de referencia

Las dos imágenes muestran la misma pantalla con dos tratamientos visuales:

| | `diseno-01.jpeg` | `diseno-02.jpeg` |
|---|---|---|
| **Estilo** | "Metal cepillado": las cabeceras de las tarjetas tienen textura metálica con brillo | Plano y oscuro, con colores de acento saturados |
| **Ítem activo del menú** | Gris metálico en relieve | Azul sólido |
| **Acentos** | Apagados (azul grisáceo, cobre) | Azul brillante y naranjo intenso |

**Propuesta:** usar **`diseno-02` como base** porque es más legible, más fácil de mantener con shadcn/ui y funciona bien en pantallas de todo tipo. De `diseno-01` se toma solo un **toque metálico sutil en las cabeceras de las tarjetas**, como identidad visual de una empresa metalúrgica. La textura no se usa en fondos ni en áreas de lectura.

**Lo que se toma de las referencias:**
- Tema **oscuro grafito** con un tinte azulado frío.
- Sidebar fijo a la izquierda, con logo arriba, íconos de línea y el ítem activo resaltado.
- Barra superior con migas de pan (breadcrumb), buscador, notificaciones con un punto naranjo y el usuario con su cargo.
- Título de página grande, con la acción principal a la derecha ("Exportar Blueprint").
- Tarjetas con **cabecera diferenciada** (una franja más clara con el título).
- Tablas con **barras de progreso de stock** y **badges de estado** en forma de píldora con borde.

**Lo que no se toma:**
- **La ilustración del producto:** como pediste, el área central de "Visualizador" no se replica.
- **Los textos de las imágenes:** tienen errores ("Disponiblable", "Warninca", "Werenibio"), así que no deben copiarse.
- **Los switches combinados con checkboxes duplicados:** en las imágenes son confusos; en los formularios se usará un solo control por opción.

---

## 2. Sistema visual

### 2.1 Paleta de colores (tema oscuro)

Los valores base se **midieron directamente en los píxeles de las imágenes** y luego se ajustaron para que cumplan con el contraste mínimo de lectura (WCAG AA: 4,5:1 para texto normal). shadcn/ui con Tailwind v4 usa el formato `oklch`; se incluye también el hexadecimal como referencia.

#### Superficies

| Token | Uso | Hex | OKLCH |
|---|---|---|---|
| `--background` | Fondo general de la página | `#14171E` | `oklch(0.205 0.015 266.9)` |
| `--sidebar` | Fondo del menú lateral | `#181B22` | `oklch(0.222 0.014 266.9)` |
| `--topbar` *(propio)* | Barra superior | `#1F222C` | `oklch(0.253 0.019 271.9)` |
| `--card` / `--popover` | Tarjetas, menús desplegables, diálogos | `#1F232C` | `oklch(0.256 0.018 266.3)` |
| `--card-header` *(propio)* | Franja de título de las tarjetas, cabecera de tablas | `#323640` | `oklch(0.333 0.018 268.1)` |
| `--muted` / `--accent` | Hover de filas e ítems, fondos secundarios | `#2A2E38` | `oklch(0.301 0.019 268.1)` |
| `--border` | Bordes de tarjetas y separadores | `#3B404B` | `oklch(0.371 0.020 266.0)` |
| `--input` | Borde de inputs y selects | `#474D59` | `oklch(0.419 0.021 264.3)` |

#### Texto

| Token | Uso | Hex | OKLCH | Contraste sobre fondo |
|---|---|---|---|---|
| `--foreground` | Texto principal, títulos | `#F3F4F6` | `oklch(0.967 0.003 264.5)` | 16:1 |
| `--muted-foreground` | Labels, migas de pan inactivas, texto secundario | `#9A9FA8` | `oklch(0.701 0.014 262.4)` | 6,7:1 |
| *(placeholder)* | Texto de ejemplo en los inputs | `#7F838D` | `oklch(0.610 0.016 268.4)` | 4,1:1 sobre tarjeta |

#### Acentos y estados

| Token | Uso | Hex | OKLCH |
|---|---|---|---|
| `--primary` | Botones principales, ítem activo del menú, switches activos | `#2F6FD8` | `oklch(0.559 0.174 259.9)` |
| `--ring` | Foco de teclado, borde de input activo, enlaces | `#5B93EE` | `oklch(0.667 0.148 259.7)` |
| `--brand` *(propio)* | Naranjo "soldadura": punto de notificaciones, detalles de marca | `#F26B1D` | `oklch(0.684 0.185 44.9)` |
| `--success` *(propio)* | Disponible, aprobada, pagado, finalizado | `#2EB368` | `oklch(0.679 0.157 153.4)` |
| `--warning` *(propio)* | Stock bajo, pendiente, por vencer | `#FD9C1A` | `oklch(0.775 0.168 65.4)` |
| `--destructive` | Sin stock, rechazada, vencido, eliminar | `#C93A40` | `oklch(0.563 0.179 22.9)` |
| `--info` *(propio)* | En proceso, información | fondo `#2C4059`, texto `#A7C5E7` | `oklch(0.366 0.050 254.5)` / `oklch(0.813 0.058 251.7)` |

> **Ajustes de contraste respecto a la imagen:**
> - **Azul:** el de la imagen (`#3F80E8`) con texto blanco da 3,8:1, por debajo del mínimo. Se oscureció a `#2F6FD8` (4,8:1) para los botones, y se mantiene una variante más clara (`#5B93EE`) para foco y enlaces.
> - **Rojo:** no aparece en las imágenes; se eligió con el mismo criterio de contraste.

#### Colores para gráficos

| Token | Color | Uso sugerido |
|---|---|---|
| `--chart-1` | azul `#5B93EE` | Serie principal (monto cotizado) |
| `--chart-2` | verde `#2EB368` | Aprobado / ingresos |
| `--chart-3` | ámbar `#FD9C1A` | Pendiente |
| `--chart-4` | naranjo `#F26B1D` | Compras / costos |
| `--chart-5` | gris `#9A9FA8` | Otros / comparativo |

#### Toque metálico (opcional, inspirado en `diseno-01`)

Solo para la franja de título de las tarjetas: un degradado suave entre `#3A3E48` y `#2C3039`, con un brillo de 1 px en el borde superior (`rgba(255,255,255,0.06)`). Se descarta si al implementarlo resulta recargado; la alternativa plana es `--card-header`.

### 2.2 Modo oscuro y claro

- **Desde el inicio:** la aplicación será **solo oscura**. Los tokens se definen bajo la clase `.dark` y se fija `className="dark"` en `<html>`.
- **Más adelante:** se puede agregar un tema claro llenando `:root` y un selector con `next-themes`, sin tocar los componentes.

### 2.3 Tipografía

Las imágenes usan una sans-serif geométrica y neutra, muy similar a **Inter**.

- **Fuente principal:** **Inter**, cargada con `next/font/google`. Reemplaza a Geist, que viene de la plantilla.
- **Fuente monoespaciada:** **Geist Mono** (ya incluida), solo para códigos técnicos cuando convenga alinear caracteres, como el código de material o el RUT en tablas.
- **Números:** todas las cifras de tablas, KPIs y montos usan `tabular-nums`, para que los dígitos queden alineados en columna.

| Rol | Tamaño / interlineado | Peso | Clase Tailwind |
|---|---|---|---|
| Título de página (h1) | 30 px / 36 px | 600 | `text-3xl font-semibold tracking-tight` |
| Valor de KPI | 30 px / 36 px | 600 | `text-3xl font-semibold tabular-nums` |
| Título de tarjeta | 16 px / 24 px | 500 | `text-base font-medium` |
| Subtítulo de sección | 15 px / 22 px | 500 | `text-[15px] font-medium` |
| Texto general, tablas, inputs | 14 px / 20 px | 400 | `text-sm` |
| Labels de formulario | 14 px / 20 px | 500 | `text-sm font-medium` |
| Cabecera de tabla | 13 px / 20 px | 500 | `text-[13px] font-medium` |
| Título de grupo del sidebar | 12 px / 16 px | 500, mayúsculas | `text-xs font-medium uppercase tracking-wider` |
| Ayudas, fechas, metadatos | 12 px / 16 px | 400 | `text-xs text-muted-foreground` |

### 2.4 Espaciado y medidas

La escala es de **4 px** (la de Tailwind: `1` = 4 px).

| Elemento | Medida | Tailwind |
|---|---|---|
| Ancho del sidebar expandido | 256 px | `--sidebar-width: 16rem` |
| Ancho del sidebar contraído (solo íconos) | 48 px | `--sidebar-width-icon: 3rem` |
| Alto de la barra superior | 56 px | `h-14` |
| Margen interno del contenido | 24 px (16 px en móvil) | `p-4 md:p-6` |
| Separación entre tarjetas | 24 px | `gap-6` |
| Separación entre título de página y contenido | 24 px | `mb-6` |
| Cabecera de tarjeta | 12 px vertical, 16 px horizontal | `px-4 py-3` |
| Cuerpo de tarjeta | 16 px | `p-4` |
| Ítem del sidebar | 36 px de alto, ícono de 16 px | `h-9`, `size-4` |
| Alto de input, select y botón | 36 px | `h-9` |
| Separación label → input | 8 px | `gap-2` |
| Separación entre campos de formulario | 16 px | `gap-4` |
| Alto de fila de tabla | 44 px | `h-11` |
| Ancho máximo del contenido | sin límite (pantalla completa, como en la referencia) | — |

### 2.5 Bordes, radios y sombras

- **Radio base:** `--radius: 0.5rem` (8 px). Las tarjetas usan 8 px; inputs y botones, 6 px; los badges van en píldora (`rounded-full`).
- **Bordes:** 1 px con `--border` en tarjetas, tablas y separadores.
- **Sombras:** casi ninguna, porque en tema oscuro la profundidad se marca con superficies más claras. Solo los menús desplegables y diálogos llevan `shadow-lg`.

### 2.6 Iconografía

- **Biblioteca:** **lucide-react**, la que usa shadcn/ui. Son íconos de línea, iguales en estilo a los de las referencias.
- **Tamaño:** 16 px en menú, botones y tablas; 20 px en la barra superior.
- **Grosor:** el trazo por defecto (2 px).

### 2.7 Componentes con estilo propio

**Badges de estado.** Píldora con borde y fondo del mismo color con transparencia, como en la tabla de la referencia: `border-<color>/40 bg-<color>/15 text-<color>`.

| Estado en la base de datos | Texto visible | Color |
|---|---|---|
| `QuoteStatus.PENDIENTE` | Pendiente | warning |
| `QuoteStatus.APROBADA` | Aprobada | success |
| `QuoteStatus.RECHAZADA` | Rechazada | destructive |
| `WorkOrderStatus.PENDIENTE` | Pendiente | neutro (gris) |
| `WorkOrderStatus.EN_PROCESO` | En proceso | info |
| `WorkOrderStatus.FINALIZADO` | Finalizado | success |
| `PaymentStatus.PENDIENTE` | Por cobrar | warning |
| `PaymentStatus.PAGADO` | Pagado | success |
| `PaymentStatus.VENCIDO` | Vencido | destructive |
| Stock (calculado) | Disponible / Stock bajo / Sin stock | success / warning / destructive |

**Barra de stock.** Fondo `#363B47`, alto de 8 px y extremos redondeados. El relleno es verde, ámbar o rojo según el nivel de stock. Siempre va acompañada del número, para no depender solo del color.

**Indicador de notificaciones.** Punto naranjo (`--brand`) de 8 px sobre el ícono de campana.

### 2.8 Formato de datos (Chile)

| Dato | Formato | Ejemplo |
|---|---|---|
| Moneda | `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })` | $1.250.000 |
| Cantidades | `es-CL`, hasta 3 decimales, más la abreviatura de la unidad | 2,5 m · 1.000 kg |
| Fechas | `dd-MM-yyyy` (date-fns con locale `es`) | 06-10-2026 |
| Fecha y hora | `dd-MM-yyyy HH:mm` | 06-10-2026 14:30 |
| RUT | Con puntos y guion | 12.345.678-9 |

---

## 3. Estructura de navegación (sidebar)

Pediste los grupos Mantenedores, Compras, Ventas y Trabajos. Al cruzarlos con el modelo de datos actual, propongo agregar **Inventario** y **Administración** (marcados con ➕):

```
MTX Metal ERP
│
├── Inicio
│   └── Dashboard                         /
│
├── Mantenedores
│   ├── Materias primas                   /mantenedores/materiales        (RawMaterial)
│   ├── Unidades de medida                /mantenedores/unidades          (UnitMeasure)
│   ├── Bodegas                           /mantenedores/bodegas           (Warehouse)
│   ├── Proveedores                       /mantenedores/proveedores       (Supplier)
│   └── Clientes                          /mantenedores/clientes          (Client)
│
├── ➕ Inventario
│   ├── Stock por bodega                  /inventario/stock               (WarehouseStock)
│   ├── Movimientos (kardex)              /inventario/movimientos         (StockMovement)
│   └── Ajustes de stock                  /inventario/ajustes             (StockMovement tipo AJUSTE)
│
├── Compras
│   └── Compras                           /compras                        (Purchase + PurchaseDetail)
│
├── Ventas
│   ├── Cotizaciones                      /ventas/cotizaciones            (Quote + QuoteDetail)
│   └── Órdenes de venta                  /ventas/ordenes                 (SalesOrder)
│
├── Trabajos
│   ├── Órdenes de trabajo                /trabajos/ordenes               (WorkOrder + WorkOrderDetail)
│   └── Guías de despacho y cobranza      /trabajos/despachos             (DeliveryNote)
│
└── ➕ Administración  (cuando exista el inicio de sesión)
    ├── Usuarios                          /administracion/usuarios        (User)
    └── Roles                             /administracion/roles           (Role)
```

**Por qué los dos grupos nuevos:**
- **Inventario:** "organizar las bodegas" es uno de los objetivos principales, y el stock y el kardex no son datos básicos ni compras. Es lo que la persona en bodega va a consultar a diario.
- **Administración:** usuarios y roles ya existen en la base. Se dejan fuera del menú hasta que se implemente el inicio de sesión.

**Puntos para que revises:**
1. **Cobranza:** el estado de pago vive en la guía de despacho (`DeliveryNote.paymentStatus`). Por eso la propuse dentro de Trabajos, pero podría ser un grupo **Finanzas** aparte si crece.
2. **Datos de la empresa:** para imprimir una cotización en PDF se necesitan el nombre, el RUT, el logo y la dirección de **tu** empresa. Hoy no existe un modelo para eso. Habría que agregar un mantenedor "Empresa" en Administración.
3. **Stock mínimo por material:** para mostrar alertas de "stock bajo" (ver el Dashboard), `RawMaterial` necesita un campo `minStock`. Es un cambio de esquema pequeño, con su migración.

**Comportamiento del sidebar:**
- **Contraíble:** en escritorio se contrae a solo íconos (botón en la barra superior o `Ctrl+B`), mostrando un tooltip con el nombre.
- **Móvil:** se abre como panel lateral (sheet).
- **Grupos:** se muestran con su título en mayúsculas pequeñas. El grupo de la página actual queda abierto.
- **Ítem activo:** fondo `--primary` y texto blanco, como en `diseno-02`.
- **Pie del sidebar:** el usuario (avatar, nombre y rol), con un menú para "Mi perfil" y "Cerrar sesión" cuando exista el login.

---

## 4. Barra superior

De izquierda a derecha:
1. **Botón** para contraer o expandir el sidebar.
2. **Migas de pan:** por ejemplo, `Ventas › Cotizaciones › #0248`. El último elemento va en `--foreground` y los anteriores en `--muted-foreground`.
3. **Buscador global** (centro-derecha). Al hacer clic o presionar `Ctrl+K` abre una paleta de comandos para saltar a cualquier página o buscar una cotización, un cliente o un material por código.
4. **Notificaciones:** campana con punto naranjo (cotizaciones por vencer, stock bajo).
5. **Usuario:** avatar, nombre y cargo en dos líneas, como en la referencia.

---

## 5. Dashboard (página de inicio)

Todos los indicadores salen de datos que **ya existen en el esquema**, salvo los marcados con ⚠️, que requieren el campo `minStock` (sección 3, punto 3).

### 5.1 Distribución

```
┌──────────────────────────────────────────────────────────────────────┐
│ Dashboard                                         [+ Nueva cotización]│
├────────────────┬────────────────┬────────────────┬────────────────────┤
│ Cotizaciones   │ Órdenes de     │ Por cobrar     │ ⚠️ Materiales con   │
│ pendientes     │ trabajo activas│                │ stock bajo         │
│ 12 · $8.4M     │ 5 en proceso   │ $3.2M          │ 4                  │
│                │ 3 pendientes   │ 2 vencidas     │                    │
├────────────────┴────────────────┴────────┬───────┴────────────────────┤
│ Requerimiento de materiales vs stock     │ Órdenes de trabajo activas │
│ (tabla con barra de stock y estado,      │ (lista con estado, cliente │
│  igual a la tabla de la referencia)      │  u "Obra propia")          │
├──────────────────────────────────────────┼────────────────────────────┤
│ Cotizado vs aprobado, últimos 6 meses    │ Cotizaciones por vencer    │
│ (gráfico de barras)                      │ (próximos 7 días)          │
├──────────────────────────────────────────┴────────────────────────────┤
│ Últimos movimientos de stock (entradas, salidas, ajustes)             │
└───────────────────────────────────────────────────────────────────────┘
```

- **Escritorio:** grilla de 3 columnas (`lg:grid-cols-3`); los bloques anchos ocupan 2.
- **Tablet:** 2 columnas.
- **Móvil:** 1 columna.

### 5.2 Indicadores propuestos

| Bloque | Qué muestra | De dónde sale |
|---|---|---|
| **Cotizaciones pendientes** | Cantidad y monto total; variación respecto al mes anterior | `Quote` con `status = PENDIENTE` |
| **Órdenes de trabajo activas** | Cuántas hay en proceso y cuántas pendientes | `WorkOrder` por `status` |
| **Por cobrar** | Monto pendiente y cantidad de vencidas | `DeliveryNote` con `PENDIENTE` o `VENCIDO`, unida a la cotización de origen |
| **⚠️ Stock bajo** | Materiales bajo su mínimo en alguna bodega | `WarehouseStock` comparado con `RawMaterial.minStock` |
| **Requerimiento vs stock** | Para cada material que piden las órdenes pendientes o en proceso: cantidad necesaria, stock disponible (barra) y estado | Suma de `WorkOrderDetail.quantityNeeded` comparada con `WarehouseStock` |
| **Órdenes de trabajo activas** | Producto, cliente u "Obra propia", estado y antigüedad | `WorkOrder` + `SalesOrder` → `Quote` → `Client` |
| **Cotizado vs aprobado** | Montos por mes de los últimos 6 meses | `Quote.date`, `totalAmount`, `status` |
| **Cotizaciones por vencer** | Las que vencen en los próximos 7 días y siguen pendientes | `Quote.validUntil` |
| **Últimos movimientos** | Los 10 movimientos más recientes, con tipo, material, bodega y cantidad | `StockMovement` ordenado por `date` |

> **Sobre "Por cobrar":** `DeliveryNote` no guarda un monto propio. Mientras no se agregue uno, se usaría el total de la cotización asociada, lo que solo es exacto si cada trabajo se despacha en una sola guía. Es un punto a decidir.

Cuando exista el inicio de sesión, el Dashboard podrá **adaptarse al rol**: en Bodega se priorizarían el stock y los movimientos; en Ventas, las cotizaciones y la cobranza.

---

## 6. Pasos de implementación

Cada fase termina con la aplicación funcionando (`pnpm build` y `pnpm lint` sin errores) y se registra en `docs/CAMBIOS.md`.

### Fase 0: Decisiones previas

Revisar y confirmar:
- **Paleta:** la propuesta de la sección 2, en particular la base `diseno-02` con el toque metálico opcional.
- **Menú:** los grupos de la sección 3, incluidos Inventario y Administración.
- **Cambios de esquema:** si se agregan `RawMaterial.minStock`, el modelo "Empresa" y el monto en `DeliveryNote`.
- **Dashboard:** los indicadores de la sección 5.

### Fase 1: Instalar shadcn/ui y aplicar el tema

1. **Inicializar shadcn/ui:**
   ```bash
   pnpm dlx shadcn@latest init
   ```
   Se elige el color base neutro (se reemplaza después) y variables CSS. El comando crea:
   - `components.json`,
   - `src/lib/utils.ts` (función `cn`),
   - las variables de tema en `src/app/globals.css`.

   Instala `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react` y los paquetes de Radix.
2. **Paleta:** reemplazar las variables de `globals.css` por las de la sección 2.1, bajo `.dark`. Agregar los tokens propios (`--topbar`, `--card-header`, `--brand`, `--success`, `--warning`, `--info`, `--info-foreground`) y registrarlos en `@theme inline` (por ejemplo, `--color-success: var(--success)`) para poder usar clases como `bg-success`.
3. **Modo oscuro y fuente:** en `src/app/layout.tsx`, agregar `className="dark"` a `<html>` y cambiar Geist por Inter (dejando Geist Mono).
4. **Página de prueba:** crear una página temporal con botones, inputs, badges y una tarjeta, para revisar colores y contraste en el navegador. Se elimina al terminar la fase.

### Fase 2: Estructura de la aplicación (layout)

1. **Componentes de shadcn:**
   ```bash
   pnpm dlx shadcn@latest add sidebar breadcrumb button separator tooltip avatar dropdown-menu collapsible sheet skeleton command dialog
   ```
   El bloque oficial `sidebar-07` (sidebar contraíble a íconos) es un buen punto de partida para copiar su estructura.
2. **Rutas:** crear el grupo de rutas `src/app/(app)/` con su propio `layout.tsx`, que contiene `SidebarProvider`, el sidebar, la barra superior y `SidebarInset` para el contenido. Se deja previsto el grupo `src/app/(auth)/` para la futura página de login, que no lleva sidebar.
3. **Menú en un solo archivo:** definir los ítems en `src/config/navegacion.ts` (grupos, título, ruta, ícono de lucide y, a futuro, los roles que pueden verlo). Sidebar, migas de pan y buscador leen ese mismo archivo, así que agregar una página al menú es editar un solo lugar.
4. **Componentes del layout** en `src/components/layout/`:
   - `app-sidebar.tsx` (logo, grupos, ítem activo según la ruta actual, pie con usuario),
   - `app-topbar.tsx`,
   - `app-breadcrumbs.tsx`,
   - `command-menu.tsx` (buscador `Ctrl+K`).
5. **Páginas vacías:** crear todas las rutas de la sección 3 con su título y un estado vacío ("Próximamente"). Así se puede probar la navegación completa desde el inicio.
6. **Revisión:** probar el sidebar contraído, expandido y en móvil.

### Fase 3: Componentes propios reutilizables

1. **Componentes de shadcn:**
   ```bash
   pnpm dlx shadcn@latest add card badge table input label select textarea checkbox switch tabs progress popover calendar alert-dialog scroll-area pagination sonner chart
   ```
2. **Componentes propios** en `src/components/`:
   - **`page-header.tsx`:** título, descripción y acciones a la derecha.
   - **`section-card.tsx`:** tarjeta con la franja de título (`--card-header`) de la referencia.
   - **`stat-card.tsx`:** KPI del Dashboard (título, valor, detalle y variación).
   - **`status-badge.tsx`:** recibe el estado del enum de Prisma y aplica el texto y color de la tabla 2.7. Es el único lugar donde se traducen los estados a texto visible.
   - **`stock-bar.tsx`:** barra de stock con su número.
   - **`data-table/`:** tabla con orden, filtro, paginación y acciones por fila, basada en `@tanstack/react-table` según la guía de shadcn.
   - **`empty-state.tsx`:** para listas vacías.
3. **Formato:** crear `src/lib/formato.ts` con `formatearMonto`, `formatearCantidad`, `formatearFecha` y `formatearRut` (sección 2.8). Requiere `date-fns`.
4. **Datos para componentes cliente:** los valores `Prisma.Decimal` y `Date` **no se pueden pasar tal cual** de un Server Component a un Client Component. Hay que convertirlos antes (`decimal.toString()`, `fecha.toISOString()`). Conviene una función de ayuda en `src/lib/serializar.ts`.

### Fase 4: Dashboard

1. **Consultas:** escribir las de la sección 5.2 en `src/lib/consultas/dashboard.ts`. Usan el cliente de `@/lib/prisma`, con agregaciones (`aggregate`, `groupBy`) en vez de traer todos los registros.
2. **Página:** armar `src/app/(app)/page.tsx` como Server Component con la distribución de la sección 5.1.
3. **Carga y vacíos:** usar `loading.tsx` con `Skeleton` mientras carga, y estados vacíos amigables porque al inicio no habrá datos.
4. **Datos de prueba:** ampliar `prisma/seed.ts` con materiales, bodegas, clientes, cotizaciones y órdenes de trabajo, para ver el Dashboard con contenido real.

### Fase 5: Mantenedores

1. **Formularios:** instalar `react-hook-form`, `zod` y `@hookform/resolvers`, y agregar el componente de formulario de shadcn (`form` o `field`, según la versión vigente).
2. **Validación:** definir los esquemas zod en `src/lib/validaciones/`. Se usan **en el formulario y en el servidor**, para no duplicar reglas (por ejemplo, el RUT válido).
3. **Guardar datos:** usar **Server Actions** para crear, editar y eliminar, con confirmación (`AlertDialog`) y notificación del resultado (`sonner`).
4. **Orden:** primero Unidades de medida y Bodegas (no dependen de nada), luego Materias primas, Proveedores y Clientes.

### Fase 6: Procesos (Inventario, Compras, Ventas, Trabajos)

Pantallas de lista y detalle con formularios de líneas (detalle de compra, de cotización, de orden de trabajo). Se respetan las reglas de `CLAUDE.md`, en especial que **stock y kardex se actualizan en la misma transacción**.

Orden sugerido, siguiendo el flujo del negocio:
1. Compras → genera entradas de stock.
2. Inventario (stock, kardex, ajustes).
3. Cotizaciones → Órdenes de venta.
4. Órdenes de trabajo → genera salidas de stock.
5. Guías de despacho y cobranza.

### Fase 7 (posterior): Inicio de sesión y roles

- Página de login en `(auth)`.
- Protección de las rutas de `(app)`.
- Menú filtrado según el rol, usando el campo de roles ya previsto en `src/config/navegacion.ts`.

---

## 7. Resumen de dependencias nuevas

| Paquete | Para qué | Se instala en |
|---|---|---|
| (shadcn init) `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, Radix | Base de los componentes | Fase 1 |
| `lucide-react` | Íconos | Fase 1 |
| `recharts` (vía `chart`) | Gráficos del Dashboard | Fase 3 |
| `@tanstack/react-table` | Tablas con orden, filtro y paginación | Fase 3 |
| `sonner` | Notificaciones emergentes | Fase 3 |
| `date-fns` | Formato de fechas en español | Fase 3 |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Formularios y validación | Fase 5 |
| `next-themes` *(opcional)* | Solo si más adelante se agrega el tema claro | — |

> **Nota:** shadcn/ui evoluciona rápido. Al iniciar la Fase 1 hay que revisar en [ui.shadcn.com](https://ui.shadcn.com) los nombres actuales de los componentes y bloques (por ejemplo, `form` frente a `field`), y que sean compatibles con Next.js 16, React 19 y Tailwind v4.
