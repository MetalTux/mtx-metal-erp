# Avances de la interfaz

Referencia visual: [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), conservada sin cambios. Última revisión: 06-10-2026.

## 13-10-2026 — Orden de Compra Cliente

- [x] Reemplazar ruta provisional `/ventas/ordenes` por listado con filtros/paginación/orden en servidor y navegación «Órdenes de Compra Cliente».
- [x] Crear/Ver sobre el listado, oferta buscable y entrada de aceptación sobre Cotizaciones con vínculo Ver orden.
- [x] Selección y cantidades aceptadas, contraste oferta/contrato, importes de servidor y revisión de alcance propio.
- [x] Referencias externas literales, emisión PDF ofrecida opcional, contactos/condiciones históricos y cuenta sin registro de pagos.
- [x] Anulación con motivo/confirmación, sin edición/ocultación/borrado de compromisos.
- [x] Errores por línea, confirmación/cancelación sin efectos, UUID estable, teclado/foco/readonly y 320–1440 px; contraste básico de textos computados y ausencia de errores JS/consola en las rutas comprobadas.
- [x] Evitar cambios falsos de contenido al bloquear/desbloquear el editor compartido; conservar revisión/preview/errores.
- [x] Usuario confirma «Funciona correctamente» el 13-10-2026; hito cerrado. Casos técnicos de completa/parcial, descuentos, alcance, consulta y anulación documentados en el hito.

Evidencias, pruebas y respaldo: `docs/HITO-ORDEN-COMPRA-CLIENTE.md`, sección 15, y `backups/20261012_232400_registro_orden_compra_cliente/`. No implica implementación de producción, despacho, abonos ni PDF propio de la orden.

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


## 10-10-2026 — Numeración documental

- [x] Ruta `/configuracion/numeracion` y navegación centralizada en Configuración.
- [x] Tabla filtrable con cuatro tipos fijos, estado, prefijo, próximo número y vista previa.
- [x] Ver/Configurar sobre listado, ayudas por campo, confirmación/saltos y descarte reutilizables.
- [x] Formato readonly tras primer uso; estado sin configurar y agotamiento explícitos.
- [x] Chromium escritorio/móvil y validación de lint/tipos/build.
- [x] Aprobación funcional del usuario de Configuración de numeración.

Ver [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md) para migración, reglas, respaldo e integración pendiente en cada documento.


## 10-10-2026 — Cuentas bancarias en Empresa

- [x] Sección de cuentas bancarias integrada en Configuración → Empresa.
- [x] Tabla/filtro, Crear/Ver/Editar, principal y baja/reactivación lógica.
- [x] Campos con ayudas, validación de RUT, consulta readonly, confirmaciones/descarte y cursor.
- [x] Chromium escritorio/móvil y lint/tipos/build.
- [ ] Selección buscable de cuenta en el futuro formulario de Cotizaciones.
- [x] Aprobación funcional del usuario de cuentas bancarias.

Ver [HITO-EMPRESA.md](HITO-EMPRESA.md) y [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md).

## 11-10-2026 — Productos y recetas

- [x] Ruta `/mantenedores/productos`, navegación centralizada, tabla/filtro y Crear/Ver/Editar/baja lógica.
- [x] Código automático readonly, precio sugerido opcional al peso y selector buscable de unidad.
- [x] Galería múltiple, vista previa, principal y retirada con confirmación reutilizable.
- [x] Receta por unidad con selector buscable de materiales y cantidades decimales; sin escritura de stock.
- [x] Consulta readonly, ayudas, cursor, descarte y errores/versiones.
- [x] Cierre de validación técnica y revisión móvil final, sin desbordamiento horizontal.
- [ ] Revisión funcional del usuario del catálogo/recetas.
- [x] Carga inicial de terminado; revisión funcional pendiente en HITO-PRODUCTOS.
- [ ] Conexión del catálogo con Cotizaciones.

Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md) para esquema, almacenamiento local/futuro S3, respaldo y etapas pendientes.


## 11-10-2026 — Clasificación en Bodegas

- [x] Columna/búsqueda de clasificación y formulario con tres opciones, ayuda y consulta readonly.
- [x] Sin clasificar para bodegas anteriores, selección obligatoria al guardar y bloqueo de uso incompatible.
- [x] Selectores de materia prima excluyen bodegas exclusivas de terminado.
- [x] Chromium escritorio/móvil, pruebas específicas y lint/tipos/build.
- [ ] Revisión completa del usuario; stock inicial de terminado pendiente de desarrollo.

Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).


## 11-10-2026 — Grilla de receta de Producto

- [x] Materias primas en tabla compacta, con acciones Ver/Editar/Quitar.
- [x] Alta/edición en diálogo modal, búsqueda interna, ayuda, cantidad y unidad.
- [x] Botón de agregar al pie y retorno del foco; borrador sin guardar el producto por Enter.
- [x] Cancelación/descarte y confirmaciones reutilizables; pruebas escritorio/móvil y lint/build.
- [ ] Aprobación visual del usuario de la reorganización.

Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).


## 11-10-2026 — Inventario inicial de producto terminado

- [x] Navegación Inventario → Productos terminados y consultas Stock/Ingresos iniciales/Movimientos.
- [x] Filtros, tablas paginadas y selectores con búsqueda interna.
- [x] Formulario modal con revisión de saldo, cantidad/unidad, fecha, observación y confirmación reusable.
- [x] Documento histórico readonly, ayudas y bloqueo de repetición de carga inicial.
- [x] Chromium escritorio/móvil, lint/tipos/build.
- [ ] Revisión funcional del usuario de P5; ajustes/fabricación/salidas pendientes.


## P6 — ajustes de producto terminado

- [x] Acciones Ajustar stock/Ajustar/Corregir con ayudas informativas.
- [x] Formulario modal de conteo físico final y confirmación de saldos/diferencia.
- [x] Motivos y origen con búsqueda, producto/bodega fijos en corrección, documento histórico readonly.
- [x] Consulta Ajustes de terminado, variación con signo y saldo anterior/final; Kardex distingue Entrada inicial/Ajuste.
- [x] Cierre de validación escritorio/móvil, foco, lint/tipos/build y limpieza.
- [x] Revisión funcional del usuario de P6.


## 11-10-2026 — Clientes/Sucursales en grilla

- [x] Grilla compacta con dirección/ciudad, contacto, teléfono/correo y Ver/Editar/Quitar.
- [x] Alta/edición en diálogo sobre Clientes, botón al pie y retorno del foco, consulta readonly.
- [x] Casa Central protegida, obligatorios/duplicados, borrador único y confirmaciones/descarte reutilizables.
- [x] Cabecera readonly en Sucursales y completamente readonly en Ver.
- [x] Chromium escritorio/móvil, Enter/Escape, persistencia, referencias protegidas, legado, lint/tipos/build y puertos.
- [ ] Revisión visual/funcional del usuario de la nueva organización.

Detalle en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).


## 11-10-2026 — Ajuste responsivo de Clientes/Sucursales

- [x] Tabla ajustada al ancho del formulario en escritorio, sin mínimos acumulados.
- [x] Filas apiladas con etiquetas en móvil; acciones accesibles y textos largos ajustables.
- [x] Medición de scroll horizontal interno en diez anchos, con datos largos; formulario general/detalle y Crear/Editar/Ver.
- [x] Regresión de funcionalidades, lint/build, conservación de datos y limpieza del entorno.
- [ ] Revisión visual del usuario.

Ver [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).


- [x] Usuario confirma Clientes/Sucursales responsivos y autoriza retomar Cotizaciones. Checkpoint vigente: C1 en [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md).


## 12-10-2026 — Configuración de IVA

- [x] Ruta /configuracion/iva y navegación centralizada.
- [x] Tabla/filtro, crear/ver/editar/eliminar sobre listado, ayudas, confirmaciones y descarte.
- [x] Programado/Aplicable hoy/Finalizado según fecha; período abierto puede ser futuro.
- [x] Controles readonly de períodos usados, cierre/alta conjunta y mensajes de conflicto/cobertura.
- [x] Chromium escritorio/móvil 320 px, teclado/Enter, lint/tipos/build y limpieza.
- [ ] Revisión funcional del usuario.

Cotizaciones sigue provisional; ver C1-IVA en [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md).


## 12-10-2026 — Cotizaciones

- [x] Reemplazar ruta provisional por listado con filtros/orden/paginación PostgreSQL y acciones con ayudas.
- [x] Formularios sobre listado, líneas en grilla/modal, selectores buscables, vista histórica readonly, importes/confirmación y estados/corrección/baja.
- [x] Editor técnico general con títulos, listas, negrita/cursiva/subrayado/tachado, citas/separadores e imágenes locales históricas.
- [x] Validar foco/Enter/descarte y ausencia de scroll horizontal 320–1440 px con textos largos e imágenes grandes; tooltips informativos no bloquean botones.
- [x] Lint/build y Chromium sobre copia, sin servidores propios al terminar.
- [ ] Revisión funcional del usuario. PDF y conversión quedan fuera de esta entrega.

Estado/reglas/evidencias en [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md), C1–C5.


## 12-10-2026 — redimensionar imágenes de Cotizaciones

- [x] Tiradores en cuatro esquinas, cursor diagonal y arrastre táctil con proporción conservada.
- [x] Ancho porcentual responsivo, menú con tamaños personalizados, Deshacer/Rehacer, Escape y flechas accesibles. Sólo lectura sin tiradores.
- [x] Validar listas/flotantes, teclado, táctil y anchos 320–1440; JSON compatible con el validador actual, lint/build correctos. Sin escrituras de BD ni servidores propios al terminar.
- [ ] Revisión funcional del usuario y guardado/reconsulta del tamaño.

Detalle y respaldo en C6.2 de [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md).


## 12-10-2026 — PDF de Cotizaciones

- [x] Condiciones comerciales opcionales en Crear/Editar/Ver, diferenciadas del plazo de pago.
- [x] Acción PDF sobre listado y consulta, historial por revisión/estado/fecha, visor y descarga del archivo conservado.
- [x] Confirmación reutilizable al emitir; consulta archivada directa, Aviso para errores, carga/procesamiento y retorno de foco.
- [x] Carta y formato enriquecido/imágenes/tablas paginadas; historial/descargas con contenido anterior intacto.
- [x] Chromium escritorio/móvil 320–1440, datos largos, revisión nueva, alerta de emisor incompleto y pruebas técnicas; lint/build correctos.
- [x] Revisión funcional del usuario: generación del PDF aprobada.

Estado y configuración en [HITO-PDF-COTIZACIONES.md](HITO-PDF-COTIZACIONES.md). Actualización explícita del emisor aprobada e implementada; generación del PDF validada por el usuario.

- [x] Cotizaciones: acción explícita «Actualizar emisor desde Empresa» en PDF y versiones, confirmación reutilizable, nueva revisión y conservación de PDF históricos; funcionamiento confirmado por el usuario.

- [ ] Cotizaciones: envío de PDF por correo al contacto de Sucursal; solicitar correo si falta. Pendiente de SMTP y contraseña de aplicación válidas del usuario final; sin implementación ni envíos por ahora.


## 15-10-2026 — Orden de Trabajo: creación y planificación

- [x] Listado con filtros/paginación/orden en servidor; Crear/Ver/Editar sobre listado y enlaces desde OCC.
- [x] Obra propia y compromiso comercial readonly, receta histórica/actualización explícita, distribución por bodegas buscables y revisión del redondeo a cero.
- [x] Guardar borrador/confirmar plan con confirmación; cobertura física/propia/ajena/libre y faltantes, historial y completar/liberar parcialmente con motivo.
- [x] Descarte de formulario sin documentos/folios; versiones, UUID estable y bloqueo de edición ante respuesta incierta.
- [x] Chromium 320/768/1440, creación/edición/reservas, enlace OCC y liberación con coma decimal sin alterar físico/Kardex; lint/build correctos.
- [ ] Revisión funcional del usuario y auditoría formal de accesibilidad del módulo completo.
- [ ] Inicio, producción/avance, reversión/anulación pública, cierre/factura y PDF final.

Requiere configurar numeración OT antes de crear el primer documento. Contrato, pasos de revisión y límites en [HITO-ORDEN-TRABAJO-PRODUCCION.md](HITO-ORDEN-TRABAJO-PRODUCCION.md), entrega OT3/OT4 del 15-10-2026. No se presenta planificación como fabricación.

- [x] OT: «Completar reservas» deshabilitado sin faltantes activos o sin confirmación; mensaje de cobertura explícito. La comparación contempla requerimientos MP y abastecimiento MP/PT por origen, sin mezclar coberturas ni contar filas archivadas.

Validación del ajuste de «Completar reservas»: lint/build correctos. No se iniciaron servidores ni se modificó la base de datos.


## 15-10-2026 — Inicio explícito de OT

- [x] Iniciar OT pendiente con plan confirmado, fecha válida y confirmación visible; sin efectos físicos ni financieros.
- [x] Aviso de registro tardío y reservas pendientes; estado/fecha de inicio e historial visibles.
- [x] Plan fijo en proceso, sin editar/reiniciar; completar/liberar reservas sigue disponible conforme cobertura.
- [x] Cancelación sin escrituras, Chromium 320/768/1440 sin desbordamientos/errores JavaScript, lint/build y tipos correctos.
- [ ] Revisión funcional del usuario final e implementación posterior del registro físico de fabricación/avance.

Contrato y evidencias en [HITO-ORDEN-TRABAJO-PRODUCCION.md](HITO-ORDEN-TRABAJO-PRODUCCION.md), checkpoint OT4 de inicio. EN_PROCESO no acredita fabricación ni consumo.

- [x] Inicio de OT: funcionamiento validado por el usuario.
- [x] Ver OT del listado más visible con borde/acento azul e ícono de ojo decorativo, manteniendo etiqueta textual.

Ajuste visual de Ver OT verificado con lint/build correctos y diff sin errores. Sin cambios de base de datos ni servidores de validación iniciados.


## 15-10-2026 — Producción y avances OT5/M2

- [x] Formulario por línea/lote desde Ver OT en proceso, con cantidad/unidad, fecha y bodega de resultado para catálogo.
- [x] Cargar previsión histórica sin escribir, revisión de redondeo a cero y consumos reales por bodegas buscables; diferencias/omisiones/sustituciones con motivo.
- [x] Previsualizar efectos, confirmar registro atómico y conservar UUID/datos ante resultado incierto; descarte sin documentos.
- [x] Avance, previsión/consumo/resultado e historial visibles; cobertura según demanda pendiente y reserva comercial del resultado fabricado.
- [x] Kardex MP/PT identifica producción y enlaza Ver OT; no ofrece fabricación como inventario inicial ni su corrección mediante ajuste del documento.
- [x] Chromium 320/768/1440, coma decimal, preview/cancelación sin escrituras, confirmación única, físico/finanzas y fecha de Kardex verificados; lint/tipos/build correctos.
- [ ] Validación funcional del usuario final de fabricación parcial/completa, servicio y a medida.
- [ ] OT6/M3 reversión; luego finalización/factura y PDF final.

Detalles operativos, cálculos y límites en [HITO-ORDEN-TRABAJO-PRODUCCION.md](HITO-ORDEN-TRABAJO-PRODUCCION.md), checkpoint OT5/M2.

## Corrección transversal de formato numérico chileno — 15-10-2026

- [x] Cantidades de consulta con punto de miles y coma decimal, sin convertir valores a `number`.
- [x] OT: planificación, disponibilidad, cobertura, reservas, liberaciones, recetas históricas, producción y avances.
- [x] Cotizaciones/OCC: cantidades, precios de consulta e IVA histórico; Productos: receta y precio de consulta; Compras: cantidades de recepciones y cierres históricos.
- [x] Formateador compartido admite también los seis decimales de previsiones/diferencias de producción y decimales con coma procedentes del borrador.
- [x] PDF de cotización reutiliza el formato de cantidades y muestra la tasa con coma decimal. No modifica PDFs ya emitidos.
- [x] Conservados los valores internos, cálculos, persistencia y comportamiento de los campos editables.
- [x] Verificación técnica: nueve casos del formateador (miles, negativos, seis decimales, límites de precisión y entradas con coma), `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` y revisión del diff. Pendiente revisión visual del usuario.

## OT6/M3 — corrección productiva y anulación propia — 15-10-2026

- [x] Ver OT ofrece Revertir registro en producción/avance vigente de una OT en proceso.
- [x] Motivo y fecha, confirmación de restitución física cuando corresponde, preview de cantidades/saldos y confirmación explícita. Distingue error de registro de daño/conteo.
- [x] Previsualizar/cancelar no escribe; reintento incierto conserva UUID/datos, protección ante doble confirmación y descarte de borrador.
- [x] Original marcado Revertido con fecha/motivo/registro; avance/cobertura netos y vínculo opcional del registro correcto al original revertido.
- [x] Kardex MP/PT con origen de reversión y enlace a OT; sin ofrecer corrección productiva como ajuste de documento inicial.
- [x] Anular obra propia sólo pendiente sin inicio: motivo, confirmación, reservas liberadas, folio e historial conservados.
- [x] Chromium a 320/768/1440 sin errores de página ni desbordamiento; efectos físicos, historia y finanzas/folios verificados sobre copia.
- [ ] Validación funcional del usuario final de los límites de reversión y anulación.

Siguiente: OT7/M4, finalización y referencia de factura externa; PDF al final.
- [x] M3 migrada localmente; Prisma/consultas, regresiones, lint/build finales y conservación de datos verificados. Copias descartables y servidor temporal retirados; servidor del usuario conservado.


## 16-10-2026 — Cierre y factura de OT (OT7/M4)

- [x] Finalizar desde Ver OT con fecha, observación, confirmación de preparación y previsualización por línea/bodega.
- [x] Bloquear cierre industrial incompleto y preparación comercial sin reserva física completa; conservar stock/reservas.
- [x] Registrar factura externa después del cierre; corregir con motivo e historial sin editar revisiones previas.
- [x] Consultar importe, abonos, saldo, vencimiento y promesa separados; detalle de pagos e historial de factura.
- [x] Confirmaciones/descarte y UUID estable ante incertidumbre; Chromium 320/768/1440 sin errores ni desbordamiento.
- [x] Aprobación funcional general del módulo, incluidos cierre/factura y M2/M3, registrada el 18-10-2026.
- [x] PDF propio de OT implementado en OT8, conforme D18.

Fuente, reglas y evidencia: `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md`, checkpoint OT7/M4. No se habilitan guías, cobros ni reapertura.


## 16-10-2026 — OT8/OT9: PDF y cierre técnico de OT

- [x] PDF Carta propio por revisión de OT con confirmación, archivo inmutable, historial, vista previa y descarga de bytes verificados.
- [x] Plan/receta/ejecución/reversiones/cierre/factura históricos y recursos locales, sin alterar folio, versión ni inventarios.
- [x] Reintento estable ante incertidumbre; concurrencia y rollback validados en copia.
- [x] Revisión de teclado/foco/Escape, selectores con búsqueda/vacío, readonly, errores de cantidad y 320/375/768/1440.
- [x] Flujo OCC→producción→reversión→cierre/factura/PDF y regresiones de módulos relacionados.
- [x] Manual operativo, recuperación, archivos y contratos para Despacho/Cobranza documentados.
- [x] Usuario aprueba funcionamiento integral el 18-10-2026, después de la corrección del incidente de producción. Aceptación general sin reporte individual por escenario.

Fuente: `HITO-ORDEN-TRABAJO-PRODUCCION.md`, checkpoint OT8/OT9, y `OPERACION-ORDENES-TRABAJO.md`.

## 19-10-2026 — Guías de Despacho G4

- [x] Acción Corregir sobre `/trabajos/despachos`, cantidades aún corregibles por partida/bodega y motivo/fecha.
- [x] Recepción física explícita, previsualización y confirmación; conservar UUID/datos ante resultado incierto.
- [x] Mostrar entregado neto y pendiente al revisar cierre de OT.
- [x] Comprobación Chromium del flujo y anchos 320/375/768/1440 sin desborde estable ni errores JS.
- [x] Documento/PDF, historial detallado e integración contextual implementados en G5.
- [x] Validación exhaustiva G6 y aprobación funcional general del usuario el 20-10-2026.

Detalles y evidencias en `HITO-GUIAS-DESPACHO-ENTREGAS.md`, sección 15. El servidor temporal en 3031 se detuvo; el servidor previo del usuario en 3030 se conservó.

## 19-10-2026 — Guías de Despacho G5

- [x] Consulta de folio sobre el listado: emisor/destino históricos, conformidad, netos e historial de entregas/correcciones con Kardex/reservas.
- [x] Accesos **Guías y entregas** desde OT/OCC, filtro contextual por OT y apertura de documento al confirmar salida/corrección.
- [x] Previsualización explícita de salida; bloqueo de campos e intento estable ante resultado incierto; estados de carga/error y legado sin PDF.
- [x] Emisión confirmada, historial por plantilla, vista previa, impresión y descarga del PDF archivado de entrega/corrección.
- [x] Chromium: foco inicial/Escape, 320/375/768/1440, flujo de entrega/PDF/descarga y navegación OT/OCC sin errores JS.
- [x] Permisos por rol rotulados como futuros, sin presentar protección inexistente.

El documento sigue siendo operativo interno; G6 y aprobación funcional final permanecen pendientes. Referencia: `HITO-GUIAS-DESPACHO-ENTREGAS.md`, sección 16.


## 20-10-2026 — Guías de Despacho G6

- [x] Cobertura pendiente de OT considera entrega neta por origen de reserva, evitando faltantes aparentes tras despachar.
- [x] Formulario rechaza cantidades inválidas aunque haya otras partidas válidas; enlaces de consulta con contraste verificado.
- [x] Chromium en 320/375/768/1440, foco/Tab/Escape y recuperación con el mismo UUID tras perder respuestas de entrega, PDF y corrección ya confirmados.
- [x] Matriz técnica y regresiones G4/G5 en copias descartables, checks correctos y limpieza de entornos/servidor de prueba.
- [x] Manual de operación, recuperación y respaldo en [OPERACION-GUIAS-DESPACHO.md](OPERACION-GUIAS-DESPACHO.md).
- [x] Aprobación funcional general del usuario y cierre del hito el 20-10-2026.

G0–G6 técnicamente completos; ver la sección 17 de [HITO-GUIAS-DESPACHO-ENTREGAS.md](HITO-GUIAS-DESPACHO-ENTREGAS.md). No se implementan permisos por rol sin autenticación.


## 20-10-2026 — Cierre funcional de Guías y seguimiento de usabilidad

Aprobación general del usuario: «Quedó bien». Hito G0–G6 cerrado. Se registra su observación sobre funcionalidades difíciles de identificar: quedan pendientes un manual completo del ERP y una revisión de visibilidad de acciones, ayudas, mensajes y recorridos para distintos niveles de experiencia. Estas mejoras todavía no se implementan; ver sección 18 de [HITO-GUIAS-DESPACHO-ENTREGAS.md](HITO-GUIAS-DESPACHO-ENTREGAS.md).


## 20-10-2026 — Seguridad S1

Preparada estructura de usuarios/roles múltiples/sesiones/factores y contrato de integración. Inventariadas 22 páginas, 87 acciones y seis rutas de archivos. Sin cambios visuales ni login implementado; la protección efectiva corresponde a S2–S4. Checkpoint en sección 18 de [HITO-INICIO-SESION-SEGURIDAD.md](HITO-INICIO-SESION-SEGURIDAD.md).


## 20-10-2026 — Seguridad S2

- [x] Ingreso local, activación y recuperación; formularios accesibles con estados de envío y ayuda.
- [x] Mi acceso: contraseña, reautenticación, factor opcional personal y sesiones.
- [x] Usuarios: listado/búsqueda/paginación y Ver/Crear/Editar sobre listado, confirmaciones y enlace privado.
- [x] Menú muestra identidad y acceso al panel; entrada Mi acceso en navegación centralizada.
- [x] Chromium 320/375/768/1440, invitación/activación y TOTP/respaldo/desactivación propia sin errores JS.
- [ ] Google y autorización integral del ERP, según S3/S4.

Rutas nuevas de S2 protegidas en servidor; los módulos previos conservan acceso anterior hasta S4. No hay aprobación funcional general S7. Referencia: [hito, sección 19](HITO-INICIO-SESION-SEGURIDAD.md#19-checkpoint-de-continuidad--s2-local-completo-20-10-2026).


## 21-10-2026 — Seguridad S4

- [x] Menú lateral, buscador y accesos/indicadores provisionales del Dashboard filtrados por unión de permisos.
- [x] Controles de escritura por rol, consulta de documentos/archivos autorizada y mensaje de acceso denegado con regreso a Inicio.
- [x] Proyección financiera restringida en OCC/OT/productos desde servidor; no depender de ocultar componentes para proteger los importes.
- [x] Chromium con seis roles y combinación Ventas + Cobranza, URL directa/acción directa/pestaña revocada y vistas 375/1440 sin errores JS. Lint/build correctos.

S3 queda pospuesto. S4 sustituye el acceso anterior de los módulos previos descrito en el checkpoint S2; S5–S7 y métricas reales del Dashboard siguen pendientes.


## 21-10-2026 — Seguridad S5

- [x] Visor de auditoría/autoría exclusivo del Administrador, filtros de calendario chileno y paginación.
- [x] Entrada en Administración/menú de usuario/buscador y enlaces a autoría en Cotización, OCC, OT y Guía.
- [x] Identificación de historia sin evidencia como «Sin autoría registrada», sin atribuciones retroactivas.
- [x] Depuración de eventos antiguos con confirmación, estado de respuesta y reautenticación en servidor.
- [x] Chromium con roles/URL/acción directa, enlaces/filtros y 375/1440 sin errores JS; lint/build correctos.

Siguiente: S6 (validación integral y operación), luego S7 (aprobación funcional).

### 22-10-2026 — S6: comprobación y cabeceras de seguridad

- [x] Protección general contra marcos de otros sitios; PDF conservados dentro del ERP y pantallas de seguridad con DENY.
- [x] Ensayo local HTTPS de ingreso al Dashboard/panel, cookies seguras, TOTP, reinicio y anchos 320/375/768/1440 sin errores JavaScript.
- [x] Roles/auditoría en Chromium y regresión completa S6 correctos (48/48); ver `docs/SEGURIDAD-S6-CONTINUIDAD.md`.
- [ ] Verificación del destino HTTPS definitivo y aprobación funcional S7; un ensayo local no las sustituye.


### 23-10-2026 — S7: ajustes de la primera revisión

- [x] Retorno automático al login tras activar o recuperar contraseña, con mensaje visible.
- [x] Avisos emergentes de resultado en acceso, Mi acceso y Usuarios, además del mensaje persistente.
- [x] Diálogo de confirmación de identidad dentro de Usuarios, con formulario conservado y contraseña/factor del titular; confirmación reutilizable cinco minutos.
- [x] Aprobaciones funcionales recibidas: S7-01, S7-02 y S7-05.
- [ ] Revisión de las correcciones S7-02/S7-03/S7-06 y los demás bloques de la guía; cierre S7 pendiente.

- [x] Lint/build/tipos y regresión de acceso con Chromium correctos; servidor propio retirado, datos originales intactos. Evidencia en sección 25 del hito.


### 24-10-2026 — S7-07: aprobación y cierre de sesión visible

El usuario confirmó sesiones simultáneas del mismo usuario en dos navegadores y cierre remoto de la otra sesión: S7-07 aprobado. Se incorpora un botón permanente en la barra superior para cerrar la sesión actual desde cualquier sección del ERP: texto en escritorio, icono de salida con nombre accesible y título en pantallas pequeñas. Usa la operación de cierre existente, impide envíos repetidos mientras responde, notifica errores y recarga el documento hacia el login al confirmar. Mi acceso conserva su botón. Revisión de visibilidad por el usuario pendiente; S7 general sigue abierto.

Validación del ajuste: `pnpm lint`, `pnpm build` y revisión del diff correctos. No se iniciaron servidores ni se modificó la base de datos; revisión visual/funcional del botón por el usuario pendiente.


### 24-10-2026 — Aprobaciones funcionales S7

El usuario confirma S7-02/S7-03/S7-06/S7-07 y aprueba S7-09. Se consideran resueltas las observaciones de retorno al login, avisos visibles, diálogo administrativo y cierre visible de sesión. Con las aprobaciones anteriores, quedan aprobados S7-01/02/03/05/06/07/09. Pendientes S7-04/08/10/11/12 según la [guía](GUIA-PRUEBAS-SEGURIDAD-S7.md); S7 sigue abierto. Esta actualización sólo registra resultados del usuario: revisión de contenido, referencias y diff, sin ejecutar pruebas de aplicación, servidores ni operaciones en base.


### 24-10-2026 — Cobranzas C1

- [x] Pantalla de cuentas con búsqueda, filtros, totales y paginación PostgreSQL; deuda y vencimiento separados.
- [x] Detalle sobre listado con factura, promesa y abonos paginados/anulados; cierre conserva filtros.
- [x] Contenedor relativo para tabla desplazable y barra superior compacta en anchos intermedios, conservando búsqueda/cierre accesibles.
- [x] Lint/build, integración C1, roles S4 y Chromium C1 (320/375/768/1440) correctos. Ver checkpoint en `HITO-COBRANZAS.md`.
- [ ] Revisión funcional C1. Registro/anulación de abonos C2, comprobantes/promesas C3 y cierre C4 pendientes.


### 24-10-2026 — Cobranzas C2

- [x] C1 aprobado por el usuario.
- [x] Registrar abono y anular con motivo desde el detalle, sólo Cobranza/Administrador.
- [x] Revisión antes de confirmar, avisos y datos/UUID conservados con reintento ante respuesta incierta; errores confirmados permiten editar.
- [x] Lint/build/tipos, coberturas de seguridad e integración/Chromium correctos. Evidencia final y guía en sección 8 de HITO-COBRANZAS.md.
- [ ] Aprobación funcional C2. C3 comprobantes/promesas y C4 cierre pendientes.


### 24-10-2026 — Cobranzas C3

- [x] C2 aprobado por el usuario.
- [x] Comprobante opcional al registrar y adjuntos posteriores con conservación de anteriores, revisión/reintento y descarga privada.
- [x] Cambio/quita de promesa con motivo, control de concurrencia e historial paginado, sin alterar vencimiento.
- [x] Lint/build/tipos/Prisma, coberturas S4/S5 y regresiones C1/C2/C3/Chromium correctos en copia; UUID separados para pago y adjunto.
- [x] C1/C2 operativos mientras no exista la migración C3; nuevas funciones protegidas por disponibilidad del esquema.
- [x] Habilitación local: usuario autorizó y se aplicó C3 con respaldo restaurado/verificado y comparación de las 80 tablas previas intactas. Ver sección 9 de HITO-COBRANZAS.md.
- [ ] Aprobación funcional C3 y cierre C4.


### 24-10-2026 — Cobranzas C4

- [x] Enlaces de cuenta desde OCC/OT/guías para perfiles financieros; sin enlace para obra propia ni Producción sin rol financiero.
- [x] Detalle por OCC existente, sin duplicar deuda y conservando historiales/paginación.
- [x] Resumen agregado protegido preparado para Dashboard posterior; pantalla de Dashboard sin implementar aún.
- [x] Guía funcional/operativa de Cobranzas y prueba integral/Chromium con regresiones C1/C2/C3 correctas (2/2), lint/build/coberturas correctos.
- [ ] Revisión funcional C3/C4 y cierre expreso de Cobranzas por el usuario.


### 24-10-2026 — Dashboard real y avisos

- [x] Decisiones D-D01–D-D07 aprobadas, hito y guía de lectura preparados.
- [x] Indicadores reales por permiso, OT activas/borradores, cotizaciones vigentes/vencidas y próximas, deuda desde cuentas y stock bajo por combinación.
- [x] Consumo pendiente/físico/reservas/libre/faltante por material/bodega y movimientos de materia prima/terminado.
- [x] Gráfico de cohortes cotizado/contratado de seis meses con tabla accesible y ceros, sin nuevas dependencias.
- [x] Campana de avisos internos por permisos en layout; sin correos ni estado leído/no leído.
- [x] Lint/build/tipos, escenario Dashboard, cobertura y regresión S4 correctos; seis roles, tablas/gráfico y 320/375/768/1440. Copias/servidores retirados; origen/archivos intactos.
- [ ] Revisión funcional D1–D5, rendimiento con volumen representativo y cierre expreso. Checkpoint en HITO-DASHBOARD.md.


### 24-10-2026 — Manual/usabilidad: primera entrega

- [x] Manual transversal por tarea/perfil, guía de orientación desde README y revisión priorizada con evidencia.
- [x] Crear/Ver trabajo en OCC según permisos productivos de operación/lectura; Preparar otra entrega sólo con operación de guías.
- [x] Lint/build y escenario C4 ampliado/Chromium correctos en copia; enlaces y anclas del manual verificados.
- [ ] Capturas completamente anonimizadas, ayuda integrada en ERP, revisión de acciones/teclado/móvil con usuarios y aprobación funcional.

Continuidad: HITO-MANUAL-USABILIDAD.md y REVISION-USABILIDAD-V1.md. No se da por completada la facilidad de uso sólo por publicar el manual.


### 26-10-2026 — Alta de materia prima en Compras

- [x] Crear materia prima desde un detalle editable mediante formulario compartido y selector buscable de unidad.
- [x] Mantener datos del documento y seleccionar el material recién creado sin navegar al mantenedor.
- [x] Respetar permisos y bloqueo estructural de compra; explicar persistencia del catálogo y ausencia de stock.
- [ ] Aprobación funcional del usuario para este nuevo flujo (ver HITO-COMPRAS.md).


### 26-10-2026 — Proveedores y Clientes desde documentos

- [x] Crear proveedor desde Compras y cliente con sucursales desde Cotizaciones mediante formularios compartidos.
- [x] Selección automática, preservación de borradores y permisos vigentes; consulta y documentos bloqueados sin acciones de alta.
- [ ] Revisión funcional del usuario y comprobación visual de diálogos/sucursales con teclado y móvil.


### 26-10-2026 — Cotizaciones con precios netos

- [x] Etiquetas Precio unitario neto, Subtotal neto, NETO, IVA y TOTAL; descuento sobre neto y vista previa coherente con servidor.
- [x] Avisos para documentos históricos y conversión de precios al corregir una oferta antigua.
- [x] OCC y PDF distinguen modalidad histórica/neto; PDF v2 conserva versiones previas.
- [ ] Revisión funcional/visual del usuario, incluidas cotizaciones nuevas e históricas.


### 27-10-2026 — Detalles de Compras en grilla

- [x] Agregar detalle mediante diálogo, con verificación de servidor e incorporación a grilla legible con cantidades/importes.
- [x] Ver/Editar/Quitar, confirmación al quitar, descarte de edición, foco de retorno y desplazamiento horizontal de tabla.
- [x] Conservar Crear materia prima dentro del detalle y restricciones comerciales de las líneas guardadas/bloqueadas.
- [ ] Revisión del usuario de los flujos, teclado y móvil. El build continúa limitado por permisos internos de Turbopack.


### 27-10-2026 — Inventario transversal de detalles

- [x] Documento [HITO-GRILLAS-DETALLE.md](HITO-GRILLAS-DETALLE.md): grillas existentes, bloques pendientes, prioridades, restricciones y criterios de aceptación.
- [ ] Implementar y validar las etapas propuestas GD1–GD7. Esta actualización no modifica la aplicación.
