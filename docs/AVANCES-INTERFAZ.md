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
