# VG9.5 — Adaptación responsive

Fecha: **29-10-2026**. **Comprobaciones técnicas realizadas en Claro y Oscuro. Revisión en dispositivos físicos y aceptación final pendientes.** VG9.4 conserva su pendiente de lector de pantalla real.

## Cambios

Se mantiene DESIGN.md y la dirección aprobada: IBM Plex Sans, paletas minerales, densidad compacta y componentes compartidos. No se redujo la fuente para hacer caber más columnas ni se ocultó el desborde de toda la página.

| Ubicación | Hallazgo y solución |
| --- | --- |
| `src/components/page-header.tsx:6` | Referencias extensas sin espacios en título/descripción podían desbordar el documento. El texto puede partirse cuando falta ancho. |
| `src/components/layout/app-topbar.tsx:53` | Un nombre de usuario extenso competía con las acciones de la barra. Se limita su ancho y se trunca visualmente; el nombre completo se conserva en el atributo title. |
| `src/components/data-table/data-table.tsx:36` | Se permite enfocar y nombrar la región de desplazamiento horizontal, con indicador visible, igual que en TablaConsulta. |
| `src/components/ui/table.tsx:10` | En tablet, una acción al extremo derecho podía recibir foco y permanecer parcialmente recortada. Al enfocar un control interior se desplaza lo necesario para mostrarlo completo, conservando el scroll contenido en la tabla. |
| `src/components/formularios/selector-buscable.tsx:32` | Opciones con referencias sin espacios quedaban recortadas horizontalmente. Se permite partir esas palabras dentro de cada opción; el panel se limita a la altura disponible y su lista puede encogerse y desplazarse. |

Sin cambios en servicios, permisos, importes, stock, sesiones, esquema, datos ni documentos históricos. No se conectaron ni escribieron fixtures en PostgreSQL.

## Prueba específica

`tests/diseno-global-vg9-5.ui.ts` monta el layout real con PageHeader, DataTable, TablaConsulta, buscador, diálogos y selector reales. Las consultas de layout y el router están simulados. Se rechaza importar Prisma y sólo se admiten solicitudes GET al origen ficticio.

| Tamaño CSS | Uso comprobado | Temas |
| --- | --- | --- |
| 360 × 800 | Móvil; controles, tablas, diálogo, menú y pulsaciones táctiles emuladas | Claro/Oscuro |
| 768 × 1000 | Tablet con navegación lateral | Claro/Oscuro |
| 1280 × 900 | Escritorio | Claro/Oscuro |
| 1440 × 900 | Escritorio amplio | Claro/Oscuro |
| 640 × 360 | Ventana horizontal de poca altura | Claro/Oscuro |

Son **10 combinaciones** con contenido exigente: nombre de usuario de varios cientos de caracteres, referencias sin separadores, 30 filas ficticias y una consulta extensa. Los viewports de esta etapa **no representan zoom real**; el zoom de navegador de VG9.4 tiene evidencia independiente.

- [x] Sin desborde horizontal del documento, conservando el desplazamiento interior de las tablas.
- [x] Botones visibles de la barra superior dentro de la ventana y de al menos 24 × 24 px en estos escenarios. No equivale a certificar todos los objetivos táctiles del ERP.
- [x] Ambas regiones de tabla alcanzables con Tab, desplazables mediante flecha y con foco visible.
- [x] Acción al extremo derecho alcanzable, visible por completo y operativa con Enter.
- [x] Buscador global: campo y última opción visibles al recorrer con End, incluso con poca altura.
- [x] Diálogo contenido; selector con opciones largas legibles y panel dentro de la ventana tras estabilizar el cálculo de posición de Radix; pie de acciones alcanzable mediante teclado.
- [x] Pulsaciones táctiles emuladas a 360 px: abrir/cerrar menú y abrir/cerrar documento sin guardar.

## Galerías repetidas

Se ejecutaron durante esta etapa, con consultas/acciones ficticias y evidencia nueva en `var/validacion/diseno-global-vg9-5/`, sin sustituir los archivos de fases previas:

| Suite | Área | Entradas de evidencia |
| --- | --- | ---: |
| VG2 | Inicio de Sesión, activación y recuperación | 26 |
| VG3 | Diez pantallas de Mantenedores y Configuración | 160 |
| VG4 | Inventario | 130 |
| VG5 | Cotizaciones y OCC | 92 |
| VG6 Trabajos | Listado, consulta y planificación de OT | 54 |
| VG6 Producción/Despacho | Consumos, fabricación y entregas | 78 |
| VG7 | Cobranzas | 88 |
| VG8 | Cuenta, Administración, navegación y estados | 330 |
| Piloto | Dashboard y Compras | 22 |

**958 entradas de galerías VG2–VG8 y 22 del piloto**, todas correctas. Estas galerías se ejecutaron antes del último límite de altura del selector. Después de ese ajuste se repitieron la prueba exigente VG9.5, la prueba de teclado/AX/zoom real VG9.4 y la compilación; no se atribuyen las capturas previas a una nueva ejecución posterior. Las galerías conservan sus combinaciones existentes: normalmente 360/768/1280 px, con variantes y diálogos; el piloto incluye 1440 px. Las diez combinaciones exigentes nuevas completan la revisión común a 1440 px y en ventana baja. No significa que cada formulario de cada ruta haya sido probado en todos los tamaños posibles.

- [x] `pnpm lint`, sin advertencias.
- [x] `pnpm build`, correcto con Turbopack, tipos y generación de rutas.
- [x] Regresión VG9.4 tras el ajuste final del selector: teclado, foco, AX y zoom real de navegador al 200% correctos; informe separado en `accesibilidad/`.
- [x] Diff sin errores de espacios y huellas SHA-256 vigentes de las fuentes registradas.

## Evidencia y reproducción

Informe específico y huellas: `var/validacion/diseno-global-vg9-5/resultado.json`. Índice de regresiones: `regresion.json`. Los subdirectorios contienen informes y PNG; los diagnósticos anteriores a las correcciones se conservan en `antes/` y no describen el resultado final.

```bash
pnpm exec tsx tests/diseno-global-vg9-5.ui.ts
DISENO_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-5/vg3 pnpm exec tsx tests/diseno-global-vg3.ui.ts
DISENO_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-5/piloto pnpm exec tsx tests/piloto-visual.ui.ts
VG8_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-5/vg8 pnpm exec tsx tests/diseno-global-vg8.ui.ts
pnpm lint
pnpm build
```

VG2–VG7, VG9.4 y piloto admiten ahora `DISENO_EVIDENCIA_DIR`, conservando sus destinos predeterminados. VG8 conserva su variable propia. No cambia el funcionamiento de los componentes a través de esas variables.

Capturas ficticias seleccionadas:

- [Clientes Claro, 360 px](capturas/diseno-global-vg9-5/claro-clientes-360.png).
- [Compras Oscuro, 360 px](capturas/diseno-global-vg9-5/compras-oscuro-360.png).
- [Contenido exigente Oscuro, 1440 px](capturas/diseno-global-vg9-5/oscuro-1440-tablas.png).
- [Diálogo Claro, ventana 640 × 360](capturas/diseno-global-vg9-5/claro-640-dialogo.png).

## Límites y continuidad

Las pruebas usan Chromium y eventos táctiles emulados; no sustituyen una revisión en teléfonos físicos, Safari/iOS, otros motores ni la aceptación del usuario. No prueban flujos autenticados ni guardados reales, y no certifican accesibilidad integral. La pauta de lector real AT-01–AT-07 de VG9.4 sigue pendiente. Los pasos funcionales del manual no cambian; edición/exportación final corresponde a VG9.10.

No se iniciaron servidores de aplicación para estos fixtures y los navegadores se cerraron. Al finalizar, 3031/3032 estaban libres; el servidor previo del usuario en 3030 (PID 106156) se conservó.

**Siguiente: VG9.6 — Estados y perfiles**, sin cerrar por arrastre las validaciones funcionales anteriores.
