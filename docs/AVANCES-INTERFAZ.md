# Avances de la interfaz

Referencia visual: [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), conservada sin cambios. Última revisión: 06-10-2026.

## Tema y layout

- [x] Inicializar shadcn/ui para Next.js, Radix y Tailwind v4 (`components.json`, preset Nova).
- [x] Aplicar la paleta grafito, azul para acciones y naranjo de marca mediante tokens CSS.
- [x] Usar Inter y conservar Geist Mono; activar el tema oscuro.
- [x] Incorporar cabeceras metálicas discretas, espaciados y tamaños de la guía.
- [x] Crear el layout compartido en `src/app/(app)/layout.tsx`.
- [x] Sidebar de 256 px, contraído de 48 px, panel móvil, grupos e ítem activo.
- [x] Persistir el estado del sidebar en cookie y permitir alternarlo con Ctrl+B.
- [x] Barra superior de 56 px con breadcrumbs, buscador Ctrl+K, notificaciones y menú de usuario.
- [x] Centralizar las 16 rutas, nombres, grupos e iconos en `src/config/navegacion.ts`.
- [x] Crear las páginas provisionales de Mantenedores, Inventario, Compras, Ventas, Trabajos y Empresa.
- [x] Incluir Cobranza y Configuración → Empresa conforme a las decisiones de dominio posteriores a la guía.
- [x] Añadir `PageHeader`, `SectionCard`, `EmptyState` y `ModulePlaceholder` reutilizables.
- [x] Presentar la distribución visual del Dashboard con cuatro indicadores y cinco paneles.
- [x] Incorporar nombres accesibles, foco de teclado, salto al contenido y movimiento reducido.

## Validación de esta entrega

- [x] `pnpm lint`.
- [x] `pnpm exec next typegen` y `pnpm exec tsc --noEmit`.
- [x] `pnpm build`.
- [x] Recorrer las 16 rutas en Chromium: título e ítem activo correctos, sin 404.
- [x] Probar contracción, expansión, cookie al recargar y Ctrl+B.
- [x] Probar Ctrl+K, filtrado por Cobranza, navegación y cierre con Escape.
- [x] Probar notificaciones y enlace a Empresa desde el menú de usuario.
- [x] Revisar escritorio (1440 px), móvil (375 px) y cambio a tablet (768 px), sin desbordamiento horizontal.
- [x] Verificar ausencia de errores de JavaScript e hidratación durante estas pruebas.
- [x] Respaldar originales antes de editar y conservar capturas y resultados de revisión.

Las comprobaciones de navegador se realizaron con un script temporal de Playwright, sin instalar un framework de pruebas en el proyecto. No constituyen una auditoría completa de accesibilidad.

## Pendientes

- [x] Tabla reutilizable con filtro, orden y paginación; confirmaciones y avisos reutilizables.
- [ ] Badges de estado y barras de stock.
- [x] Formato de cantidades sin pérdida de precisión y fechas de Santiago; serialización de consultas de inventario.
- [ ] Formato de montos y contratos adicionales para los procesos futuros.
- [ ] Consultas e indicadores reales del Dashboard, gráfico y estados de carga/error.
- [x] CRUD completo de Unidades de medida, validado contra una copia temporal de PostgreSQL.
- [x] CRUD completo de Bodegas, validado con las cuatro relaciones que impiden su borrado.
- [x] CRUD completo de Proveedores, con validación de RUT/correo y eliminación protegida por compras.
- [x] CRUD completo de Clientes, con RUT validado, persona de contacto y eliminación protegida por cotizaciones.
- [x] CRUD completo de Materias primas, selector de Unidad con filtro interno y bloqueo de cambio de unidad/eliminación por referencias; seguimiento en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).
- [x] Configuración de los datos propios de Empresa, con formulario y logo local.
- [x] Planificar el siguiente hito de Empresa por etapas; [plan y checklist](HITO-EMPRESA.md). Implementación y validación local completadas; revisión del usuario pendiente.
- [ ] Procesos de compras, inventario, ventas, trabajos, despachos y cobranza.
- [ ] Alertas de stock mínimo y vencimientos.
- [ ] Inicio de sesión, protección de rutas, roles y Administración.

Los indicadores muestran «—» y los paneles explican su contenido futuro. El buscador abre secciones; todavía no busca registros. Notificaciones y usuario indican que las alertas y el inicio de sesión están pendientes. Los cinco mantenedores básicos ya consultan y modifican la base de datos; Empresa también está implementada; los procesos continúan pendientes.

## Referencias de implementación

- [Instalación oficial de shadcn/ui para Next.js](https://ui.shadcn.com/docs/installation/next).
- [Sidebar oficial](https://ui.shadcn.com/docs/components/radix/sidebar).
- El hook móvil usa `useSyncExternalStore` para suscribirse al breakpoint de 768 px sin actualizar estado sincrónicamente dentro de un efecto.
- La cookie del sidebar se lee en el servidor, por lo que las rutas del layout se renderizan dinámicamente.
- Respaldos locales: `backups/20261006_142412_layout/`, excluidos de git. No se modificaron Prisma, migraciones, seed ni datos PostgreSQL.

## Configuración de Empresa

- [x] Consulta del perfil único, estado inicial sin inserción, fechas, carga/error y reintento.
- [x] Formulario de identificación, dirección, contacto y logo, validado en cliente y servidor; datos parciales admitidos.
- [x] Crear/editar explícitamente con control de versión y protección de la primera creación concurrente.
- [x] Confirmación de descarte reutilizable, cursor, teclado/foco, móvil y estados pendientes.
- [x] Carga local de PNG/JPG/WebP, vista previa y mensajes de error; adaptador de almacenamiento definido para futura migración a S3.
- [x] ESLint, TypeScript, build, integración PostgreSQL temporal y navegador Chromium local.
- [x] Respaldo y comparación de datos originales; copia temporal retirada y servidor 3031 detenido.
- [ ] Comprobación mediante túnel: esperando autorización específica solicitada tras rechazo de revisión automática.
- [ ] Revisión funcional del usuario.

Detalles y evidencias en [HITO-EMPRESA.md](HITO-EMPRESA.md). No se modificó la guía visual ni el esquema Prisma.

## Consultas de Stock y Kardex

- [x] Stock real por material/bodega, unidad, cantidad y mínimo sin confundir nulo con cero.
- [x] Kardex con fecha, tipo, cantidad con signo, referencias y detalle de motivo/registro.
- [x] Selectores buscables, texto/tipo/fechas, filtros persistidos y conservación de valores tras error.
- [x] Tabla de consulta con paginación/orden en servidor y enlace contextual de Stock a Kardex.
- [x] Carga/error/reintento con consulta nueva, teclado/foco/cursor y diseño móvil.
- [x] Integración PostgreSQL temporal, ESLint/build y Chromium; originales preservados y 3031 libre.
- [x] Documentar [hito de Compras y consultas de inventario](HITO-COMPRAS.md).
- [ ] Revisión funcional del usuario y respuestas a las reglas de Compras.

Los mínimos se consultan; su configuración, alertas y ajustes continúan pendientes. La entrega es de sólo lectura y no cambia Prisma ni la guía visual.

## Corrección del aviso pg en Inventario

- [x] Reproducción y traza del servicio original respaldado.
- [x] Lecturas de relaciones por lotes secuenciales en Stock y Movimientos, manteniendo consistencia transaccional.
- [x] Regresión concurrente y validación estricta ante deprecaciones; ESLint/build aprobados.
- [x] Chromium en desarrollo: filtros, paginación/orden, orígenes, detalles y móvil sin errores de consola.
- [x] Originales respaldados y datos preservados; base de prueba retirada y 3031 libre, servidor 3030 preservado.

Evidencias y explicación en [HITO-COMPRAS.md](HITO-COMPRAS.md), sección de corrección de la deprecación.

## Compras: listado y formulario

- [x] Listado con filtro, orden/paginación de servidor y estado de recepción.
- [x] Crear/Ver/Editar sobre listado; selectores buscables, líneas y cálculos decimales.
- [x] Confirmación de datos/precios inmutables y descarte reutilizables; errores conservan formulario.
- [x] Precio readonly, bloqueo estructural tras recibir, detalle de historial/motivos y enlace al Kardex.
- [x] Eliminación lógica con confirmación sólo de compras ya anuladas.
- [x] Integración en copia, lint/build y Chromium producción/dev; móvil/foco/cursor, sin errores ni deprecaciones.
- [x] Respaldos, datos reales preservados y puertos de validación liberados.
- [ ] Revisión funcional del usuario.
- [ ] Registrar recepciones parciales, cierres y anular compras: próximas etapas de [HITO-COMPRAS.md](HITO-COMPRAS.md).


## 07-10-2026 — Compras: recepción sobre el listado

- [x] Acción Recibir y formulario con bodega fija, pendiente por línea y observación.
- [x] Confirmación reutilizable con equivalencias exactas, mensajes y descarte sin diálogos nativos.
- [x] Recepción parcial/completa, errores conservando datos, edición estructural bloqueada y retorno del foco tras refrescar.
- [x] Validación Chromium escritorio/móvil y consulta de entradas en Stock/Kardex; lint/tipos/build aprobados.
- [ ] Revisión funcional del usuario.
- [ ] Cierre de pendientes y anulación: siguiente etapa.

Ver [HITO-COMPRAS.md](HITO-COMPRAS.md) para reglas, respaldo y evidencias.


## 07-10-2026 — Compras: cierre y anulación

- [x] Cerrar pendiente por línea con selector buscable, motivo y confirmación.
- [x] Anular documento completo, confirmación y mensajes de bloqueo conservando formulario.
- [x] Bloquear estructura desde recepción o cierre; mantener historial y habilitar eliminación tras anular.
- [x] Chromium escritorio/móvil, descarte, foco, Kardex; ESLint/tipos/build y pruebas de dominio aprobados.
- [ ] Revisión funcional final del usuario para cerrar el Hito de Compras.

Ver [HITO-COMPRAS.md](HITO-COMPRAS.md).


## 07-10-2026 — Ayudas y autocompletado en Compras

- [x] Etiquetas comprensibles y ayudas “i” accesibles en cada campo de Compras.
- [x] Presentación con sugerencias mientras se escribe, teclado/táctil y texto nuevo permitido.
- [x] Equivalencia visible calculada con Decimal en servidor.
- [x] Chromium desktop/móvil, pruebas de precisión/regresión, lint/tipos/build y respaldo.
- [ ] Revisión funcional del usuario.

Ver [HITO-COMPRAS.md](HITO-COMPRAS.md).


## 07-10-2026 — Configuración de mínimos y reposición

- [x] Acción Mínimo y configuración de nuevas combinaciones sobre Stock por bodega.
- [x] Unidad/existencias/mínimo actual, selectores buscables, ayudas y retiro con confirmación.
- [x] Situación derivada y filtro Requieren reposición en servidor.
- [x] Escritorio/móvil, validación de datos/conflictos/descarte, foco y cursor; lint/tipos/build y pruebas de dominio.
- [x] Revisión funcional de mínimos aprobada por el usuario el 07-10-2026.
- [x] Ajustes/carga inicial implementados y aprobados funcionalmente.
- [ ] Traslados: resolver decisiones e implementar su etapa.

Ver [HITO-INVENTARIO.md](HITO-INVENTARIO.md).


## 07-10-2026 — ajustes e inventario inicial

- [x] Reemplazar ruta provisional por listado con filtros y paginación/orden en servidor.
- [x] Registrar ajustes y carga inicial con conteo físico, enum fijo de motivos y observación obligatoria.
- [x] Ver documento histórico y corregir mediante nuevo conteo vinculado, sin editar ni eliminar.
- [x] Formularios sobre el listado, selectores buscables, ayudas, confirmación de diferencias y descarte reutilizables.
- [x] Escritorio/móvil, teclado, cursor, conflictos, Kardex, pruebas de dominio y lint/tipos/build.
- [x] Aprobación funcional del usuario de ajustes/carga inicial el 07-10-2026.
- [ ] Traslados aún pendientes.

Ver [HITO-INVENTARIO.md](HITO-INVENTARIO.md) para reglas, respaldos y evidencia.


## 07-10-2026 — traslados entre bodegas

- [x] Ruta y menú Traslados; tabla filtrable, paginada/ordenada en PostgreSQL.
- [x] Registrar, Ver y Corregir sin salir del listado; un material y dos bodegas distintas.
- [x] Selectores buscables, unidad/saldos, ayudas, motivo fijo, observación y confirmación reutilizable.
- [x] Corrección inversa completa, vínculo histórico, errores/conflictos y reintentos sin duplicados.
- [x] Ajustar retorno de foco mediante callback opcional en confirmaciones; teclado, cursores y escritorio/móvil.
- [x] Kardex con origen de traslado; lint/tipos/build, pruebas de dominio y navegador.
- [ ] Revisión funcional del usuario y cierre restante del Hito de Inventario.

Ver [HITO-INVENTARIO.md](HITO-INVENTARIO.md) para reglas, migración, respaldos y evidencia.
