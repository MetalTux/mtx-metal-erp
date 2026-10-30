# Hitos — Extensión del diseño visual a todo el ERP

Fecha de actualización: **30-10-2026**. **VG1–VG8 implementados técnicamente; revisión funcional pendiente. VG9.1–VG9.3 y VG9.5–VG9.10 completados técnicamente. VG9.4 pendiente de lector real; VG9.11 pendiente.**

El usuario manifestó conformidad con el piloto implementado de Dashboard y Compras y solicitó planificar su extensión, comenzando por **base global** y después **Inicio de Sesión**, la primera pantalla del usuario. No se solicita redefinir la identidad ni crear otra propuesta estética.

Referencias: [dirección visual](../DESIGN.md), [contexto del producto](../PRODUCT.md), [piloto y evidencia](HITO-PILOTO-VISUAL.md), [herramientas de diseño](HERRAMIENTAS-DISENO.md). Impeccable guía la composición y revisión; Web Design Guidelines complementa la comprobación técnica. Las reglas del ERP y las preferencias explícitas del usuario prevalecen.

## 1. Resultado esperado

Una sola identidad en Claro y Oscuro: IBM Plex Sans, paleta mineral aprobada, superficies planas, jerarquía discreta y densidad adecuada para trabajar durante horas. Acciones identificables, grillas comparables y formularios contenidos. Oscuro sigue siendo el tema inicial; Claro y Según el sistema mantienen su elección explícita y persistencia.

La extensión cambia presentación y accesibilidad de interacción. Conserva reglas comerciales, autenticación, roles, permisos de servidor, sesiones, precisiones, stock, importes, versiones e idempotencia. No contempla migraciones, nuevos proveedores de acceso ni servicios de pago.

## 2. Punto de partida del plan (antes de VG1)

- Dashboard y Compras ya utilizan el nuevo diseño y el usuario expresó conformidad con el resultado general.
- IBM Plex Sans 400/600 y su licencia ya están disponibles localmente. Paletas, fuentes y varios ajustes se activan sólo en / y /compras mediante AlcancePiloto y reglas body:has.
- Los demás módulos y las páginas de acceso conservan la base anterior. Hay componentes compartidos y excepciones particulares que requieren revisión después de promover la base global.
- El formulario de ingreso actual conserva tarjeta con shadow-lg y rounded-xl; se adaptará expresamente en VG2. Cambiar tokens en VG1 no elimina por sí solo sus clases particulares.
- La evidencia técnica previa del piloto es reutilizable, pero no acredita todos los módulos, lectores de pantalla ni zoom real. Las validaciones pendientes de otros hitos conservan su estado.

No habrá otra implementación del Dashboard o Compras desde cero. Se usarán como referencia y regresión al cambiar la base compartida.

## 3. Orden y estados

| Hito | Entrega | Dependencia | Estado |
| --- | --- | --- | --- |
| VG0 | Dirección aprobada, inventario y planificación | Piloto existente | Plan preparado; conformidad general registrada |
| VG1 | Base visual global y componentes compartidos | VG0 | Implementado y validado técnicamente; revisión del usuario pendiente |
| VG2 | Inicio de Sesión, activación y recuperación | VG1 | Implementado; ensayos técnicos realizados, comprobaciones manuales pendientes |
| VG3 | Mantenedores, catálogos y Configuración | VG2 | Implementado y validado con fixtures; revisión del usuario pendiente |
| VG4 | Inventario y operaciones de existencias | VG3 | Implementado y validado con fixtures; revisión del usuario pendiente |
| VG5 | Ventas: cotizaciones y OCC | VG4 | Implementado y validado con fixtures; revisión del usuario pendiente |
| VG6 | Trabajos, producción y despacho | VG5 | Implementado técnicamente; revisión del usuario pendiente |
| VG7 | Cobranzas | VG6 | Implementado técnicamente; revisión del usuario pendiente |
| VG8 | Mi acceso, usuarios, auditoría y estados transversales | VG7 | Implementado técnicamente; revisión del usuario pendiente |
| VG9 | Regresión completa, documentación y aceptación | VG1–VG8 | VG9.1–VG9.3 y VG9.5–VG9.10 completos técnicamente; lector real VG9.4 y aceptación VG9.11 pendientes |

Cada hito registrará por separado **implementado**, **validado técnicamente** y **conformidad del usuario**. Activar la paleta global no marca como revisados los módulos pendientes. Las casillas sólo se completarán al ejecutar el trabajo correspondiente.

## 4. Hitos de implementación

### VG0 — Preparación y dirección

- [x] Registrar conformidad general del usuario con el piloto implementado y su solicitud de extensión.
- [x] Mantener IBM Plex Sans y el sistema visual del piloto como referencia.
- [x] Identificar ámbito actual por ruta y páginas reales de acceso.
- [x] Definir orden, dependencias, criterios de término y validaciones sin modificar la aplicación.

No quedan preguntas de identidad, público ni preferencia de tema que sea necesario repetir. Si un cambio posterior modifica funcionamiento y no sólo presentación, se separará del alcance visual antes de implementarlo.

### VG1 — Base global

**Objetivo:** una única fuente de verdad visual para acceso y ERP, sin dos paletas según la ruta.

Archivos principales: src/app/globals.css, src/app/layout.tsx, src/app/(app)/layout.tsx, AlcancePiloto (retirado), componentes de layout/ui, SectionCard y PageHeader.

- [x] Promover los tokens del piloto a :root/.dark y la fuente Plex a la base del ERP; conservar monoespaciada sólo para códigos donde aporte.
- [x] Consolidar estilos comunes y retirar el condicionamiento /-/compras, AlcancePiloto y reglas duplicadas de transición una vez sustituidos. No mantener dos mecanismos visuales activos.
- [x] Mantener el arranque Oscuro, restauración previa a hidratación, almacenamiento, sincronización entre pestañas y selector actual, sin cambiar la clave de preferencia ni borrar elecciones.
- [x] Unificar escala: trabajo alrededor de 14 px, contexto 13 px, metadatos breves 12 px, títulos moderados y cifras tabulares. No forzar una misma altura a toda clase de contenido.
- [x] Unificar cabeceras planas, bordes funcionales, radios discretos, espaciado compacto y estados de foco; retirar sombras/degradados decorativos compartidos sin eliminar indicaciones útiles de foco o separación.
- [x] Revisar Button, Input/Textarea/InputGroup, tablas, selectores, popover, menú, Command, Dialog, AlertDialog, Sheet, Tooltip, avisos y Sonner en ambos temas.
- [x] Adaptar sidebar, barra superior, breadcrumbs, buscador, campana, usuario y cierre de sesión; conservar secciones, permisos, atajos, etiquetas y ayudas.
- [x] Conservar tamaños apropiados de diálogos secundarios; resolver min-width/scroll en la causa, sin aplicar un límite estrecho universal.
- [x] Revisar una muestra de cada familia de pantalla para detectar incompatibilidades inmediatas de tokens/colores antes de entregar la base global. Los detalles específicos se cierran en VG2–VG8.
- [x] Actualizar pruebas: el aislamiento por ruta del piloto deja de ser el resultado esperado; todas las rutas deben heredar la misma base. Mantener pruebas de navegación/caché para comprobar coherencia.
- [x] Regresión de Dashboard/Compras, contraste de pares representativos, lint/tipos/build y evidencia antes/después.

**Término:** acceso y ERP reciben la misma base; no quedan reglas de ámbito piloto necesarias para mostrar el diseño. Las pantallas pendientes de revisión particular quedan enumeradas, no aprobadas automáticamente.

### VG2 — Inicio de Sesión, primera impresión

**Objetivo:** ingreso sencillo y reconocible como parte del ERP, con la identidad aprobada y sin decoración publicitaria.

Rutas: /ingresar, /activar, /recuperar y /acceso-denegado. Componentes: src/app/(auth)/layout.tsx, páginas de esas rutas y src/components/seguridad/ingreso.tsx (Ingreso y recuperación existentes).

- [x] Revisar ambas apariencias con formulario real: identificación MTX Metal ERP, título, instrucciones breves y acción principal evidente.
- [x] Sustituir tarjeta/sombra/radio excesivo por superficie plana de ancho cómodo. Mantener buen espacio para credenciales sin convertir la pantalla de acceso en un formulario excesivamente denso.
- [x] Mantener selector de apariencia visible antes de iniciar sesión, nombre accesible y teclado.
- [x] Revisar correo, contraseña, mostrar/ocultar contraseña, autocompletado, pegado, etiquetas, tamaños, foco y recorrido Enter/Tab; no impedir gestores de contraseñas.
- [x] Revisar estados normal, ocupado, configuración no disponible y error, con mensaje visible/anunciado y siguiente paso útil. Conservar la privacidad de los mensajes del servidor.
- [x] Adaptar el paso de doble factor/código personal de respaldo, cuando la cuenta lo requiera, sin alterar su obligatoriedad ni sus controles.
- [x] Adaptar activación y restablecimiento: dos contraseñas, requisitos actuales, token ausente/inválido/vencido/usado y redirección al login tras éxito.
- [x] Adaptar solicitud de recuperación con y sin SMTP conservando la alternativa asistida existente y respuestas que no revelen cuentas.
- [x] Diseñar acceso denegado con explicación y salida pertinente; mantener la autorización real en el servidor.
- [x] Conservar destino Dashboard y preferencia: contrato de navegación probado con API simulada; persistencia entre rutas públicas comprobada en producción.
- [ ] Repetir entrada/salida/entrada con sesión real autorizada; no se usaron cuentas reales en el ensayo visual.
- [x] Capturas Claro/Oscuro en 360/768/1280 px; teclado, foco, contraste representativo, fuente cargada y ausencia de errores de hidratación en producción.
- [ ] Zoom real 200% y revisión con lector de pantalla; no confundir viewport móvil con zoom.

**Reglas conservadas:** contraseña 8–128, usuarios habilitados sólo por Administrador, sin registro público, sesión 60 min/8 h, TOTP opcional personal, códigos de respaldo y revocación vigentes. No añadir acceso con Google: S3 continúa pospuesto. No modificar cookies, origen permitido, CSP ni recuperación por razones visuales.

**Término:** el conjunto de acceso tiene la identidad global y se puede completar con teclado y móvil. Una prueba sólo con GET anónimos no acredita login, tokens o TOTP completos; esos recorridos se ensayarán con cuentas ficticias y entorno autorizado o quedarán explícitamente pendientes.

### VG3 — Mantenedores, catálogos y Configuración

- [x] Adaptar Unidades, Bodegas, Proveedores, Clientes/sucursales, Materias primas y Condiciones de pago: filtro, acciones, tabla y formularios Crear/Ver/Editar.
- [x] Adaptar Productos, recetas, imágenes y sus diálogos; conservar datos históricos y unidad única.
- [x] Revisar Empresa, cuentas bancarias, numeración y períodos de IVA: agrupación, campos, principal/baja/reactivación y estados.
- [x] Conservar búsqueda de selectores y altas de cliente/proveedor/material desde documentos, sin perder el borrador de origen.
- [x] Revisar vacíos, errores, textos largos, RUT/códigos, acciones deshabilitadas y confirmaciones; priorizar texto para acciones frecuentes y menú sólo donde reduzca carga.
- [x] Conservar logos/fotografías sobre su superficie apropiada; no invertir imágenes por tema.
- [x] Capturas, teclado/contraste y regresión de referencias/permisos relevantes con datos ficticios.

**Término:** todos los catálogos/configuración tienen jerarquía y densidad coherentes, con controles equivalentes y sin alterar su CRUD ni reglas.

### VG4 — Inventario

- [x] Revisar Stock/Kardex de materia prima y terminado: tablas numéricas, unidades, filtros, orden, paginación y estados de reposición.
- [x] Adaptar mínimos, carga inicial, ajustes y traslados; diferenciar consulta, revisión y confirmación sin depender sólo del color.
- [x] Conservar visibilidad simultánea de bodega, material, saldo, cantidad y unidad; formularios contenidos y grillas desplazables de forma explícita.
- [x] Revisar correcciones, motivos obligatorios, bloqueos, errores y resultados inciertos sin perder UUID/versión/borrador.
- [x] Validar teclado, móvil, contraste, lectura de cifras y ausencia de cambios transaccionales accidentales.

**Término:** inventario conserva saldos/Kardex, permisos y trazabilidad; el cambio visual no introduce conversiones ni nuevas operaciones.

### VG5 — Ventas

- [x] Adaptar listados, filtros, creación/consulta/corrección de Cotizaciones y OCC.
- [x] Revisar grillas de materia prima/producto/servicio, totales NETO/IVA/TOTAL y errores; mantener modalidad histórica y cálculo decimal existente.
- [x] Adaptar editor técnico, herramientas e imágenes sin invertir el documento blanco ni modificar sus colores propios.
- [x] Revisar contratación parcial, exclusiones, condiciones de pago, altas relacionadas, confirmaciones y enlaces a trabajo/cuenta según permisos.
- [x] Adaptar historial y controles de PDF; preservar bytes, revisiones, precios y snapshots históricos.
- [x] Regresión de grillas/UUID/foco/descartes en ambos temas y tamaños representativos.

**Término:** las ofertas y contratos se leen y operan con la nueva base sin modificar su contenido comercial ni su historia.

### VG6 — Trabajos, producción y despacho

- [x] **VG6.1 — Trabajos:** adaptar listado/plan de OT, borradores, reservas, recetas históricas y configuraciones por línea.
- [x] Adaptar producción, consumos, terminado, consulta de registros, cierre, factura externa y correcciones existentes.
- [x] Revisar grillas de salida/distribución de guías y devoluciones parciales/completas, con sus motivos y recepción física cuando corresponde.
- [x] Mantener visibles diferencias entre planificar, consumir, fabricar, finalizar, despachar y cobrar; no unificar acciones que representan hechos distintos.
- [x] Adaptar detalle/historia/emisiones PDF, confirmaciones, respuestas inciertas y foco en diálogos anidados.
- [x] Regresión automatizada con fixtures: permisos de interfaz, grillas, borradores/reintentos, teclado y tamaños móviles en Claro/Oscuro.
- [ ] Revisión funcional del usuario, zoom real al 200%, lector de pantalla y recorrido con sesión/documentos reales; no se acreditan con mocks.

**Término:** el flujo productivo y de entrega conserva dependencias, stock/reservas, reversión y autoría; obra propia mantiene su recorrido sin cliente ficticio.

### VG7 — Cobranzas

- [x] Adaptar listado/cuenta, filtros, saldo/vencimiento, enlaces desde OCC/OT/guías y acciones frecuentes.
- [x] Revisar abonos, medios, fechas, comprobantes, promesas e historial; conservar motivos y confirmaciones.
- [x] Mantener cifras alineadas y distinción entre deuda, abono, anulación y promesa, sin apoyarse sólo en color.
- [x] Adaptar adjuntos y descarga/vista previa, paginación y errores; no recolorear documentos ni cambiar acceso a archivos.
- [x] Comprobar borradores, foco, teclado, contraste y regresión pertinente, sin cambiar sobrepagos/idempotencia ni saldo.

**Término:** cuenta e historia coherentes con la identidad global; las validaciones funcionales anteriores de Cobranzas permanecen separadas de esta revisión visual.

- [ ] Revisión funcional del usuario, zoom real al 200%, lector y operación autenticada con datos/archivos reales.

### VG8 — Cuenta, administración y estados transversales

- [x] Adaptar Mi acceso: datos personales, contraseña, sesiones y TOTP/códigos de respaldo, sin cambiar seguridad ni exposición de secretos.
- [x] Adaptar Usuarios/roles, invitaciones, estados y diálogo de reautenticación, con cambios pendientes conservados.
- [x] Revisar auditoría/autoría, filtros, tablas y retención; mantener acceso exclusivo y datos disponibles actuales.
- [x] Completar páginas/estados existentes de no encontrado, denegado, carga, error, vacío y configuración incompleta; no crear rutas sin necesidad funcional.
- [x] Revisar todos los controles superpuestos/avisos y rutas no cubiertas por los hitos anteriores contra el inventario de páginas.
- [x] Verificar navegación por roles, foco tras cerrar diálogos y anuncios de estado, sin acceso excesivo por una simplificación visual.

**Término:** todas las rutas existentes quedan cubiertas y la administración tiene la misma identidad del acceso inicial y el ERP.

- [ ] Revisión autenticada real, lector de pantalla y zoom al 200%; no se aprueban por los fixtures.

### VG9 — Regresión y cierre

- [x] **VG9.1 — Matriz de rutas.** Verificar matriz de rutas: pantalla revisada, ambos temas, escritorio/móvil, evidencia y estado de aceptación.
- [x] **VG9.2 — Apariencia y persistencia.** Primer acceso Oscuro con SO Claro; persistencia y Sistema explícito; navegación, recarga, salida/ingreso y dos pestañas.
- [x] **VG9.3 — Contraste.** Contraste de texto 4,5:1 y controles/gráficos/foco 3:1 sobre fondos reales; incluir hover, selección, error y menús deshabilitados legibles.
- [ ] **VG9.4 — Accesibilidad.** Teclado, foco, árbol AX y zoom real 200% comprobados técnicamente en los componentes compartidos; pendiente prueba con lector de pantalla real. Evidencia y pauta AT-01–AT-07 en [DISENO-GLOBAL-VG9-4-VALIDACION.md](DISENO-GLOBAL-VG9-4-VALIDACION.md).
- [x] **VG9.5 — Adaptación responsive.** Comprobaciones técnicas en Claro/Oscuro, 360/768/1280/1440 px y ventana baja, con contenido largo, tablas contenidas, scroll/foco y controles de barra; evidencia y límites en [DISENO-GLOBAL-VG9-5-VALIDACION.md](DISENO-GLOBAL-VG9-5-VALIDACION.md).
- [x] **VG9.6 — Estados y perfiles.** Estados representativos con 0/1/125 registros, ocho perfiles/combinaciones, lectura/operación y recuperación de errores comprobados en ambos temas. Identidad/lecturas ficticias; pruebas autenticadas pendientes. [Evidencia y límites](DISENO-GLOBAL-VG9-6-VALIDACION.md).
- [x] **VG9.7 — Flujos y grillas.** Recorridos representativos de documentos, borradores, confirmaciones, descartes, reintentos y diálogos anidados comprobados en ambos temas, con acciones simuladas. Integración real pendiente. [Evidencia y límites](DISENO-GLOBAL-VG9-7-VALIDACION.md).
- [x] **VG9.8 — Conservación de reglas y documentos.** 200 fuentes protegidas iguales a Git, 113 llamadas conservadas y nueve pruebas puras correctas; seis PDF locales iguales durante la auditoría. Sin conciliación de BD ni manifiesto PDF pre-rediseño. [Evidencia y límites](DISENO-GLOBAL-VG9-8-VALIDACION.md).
- [x] **VG9.9 — Comprobaciones técnicas.** 32 pasos correctos: lint, tipos, build Turbopack, Next público y regresiones pertinentes; fuentes/PDF conservados al cierre. [Informe y límites](DISENO-GLOBAL-VG9-9-VALIDACION.md).
- [x] **VG9.10 — Documentación final.** Actualizar manual Markdown/PDF, capturas ficticias, avances y continuidad. No duplicar documentación histórica como si describiera el estado nuevo.
- [ ] **VG9.11 — Aceptación y cierre.** Registrar conformidad final del usuario y pendientes reales, sin cerrar por arrastre S7, Cobranzas, inventario u otros hitos.

**Término:** todas las etapas adaptadas y verificadas con evidencia, aceptación registrada y limitaciones explícitas.


## 5. Método de verificación y datos

La primera comprobación será de componentes con CSS y fuentes reales y transporte simulado. Las pruebas de seguridad o transacciones que escriban requieren un entorno de validación autorizado, con datos ficticios; nunca se crean fixtures en la base real por razones de diseño. No se leen ni copian secretos para capturas.

Al modificar código se ejecutan lint/build y comprobaciones pertinentes; no se repiten suites sin cambios o una preocupación nueva que lo justifique. Se registran comandos/resultados y distinción entre revisión de código, componente simulado, Next público y flujo autenticado. Cada servidor iniciado para comprobar el trabajo se detiene al terminar, conservando los procesos del usuario.

Por etapa: revisar fuentes/capturas vigentes, implementar sin alterar reglas, comprobar errores y estados, registrar evidencia, revisar diff y actualizar checklists. Una incidencia visual material se corrige dentro de la etapa antes de extender su patrón.

## 6. Entrega y siguiente paso

- [x] Plan completo creado y referencias revisadas.
- [x] Conformidad del piloto registrada sin inventar pruebas individuales del usuario.
- [x] **VG1 — Base global implementado y validado técnicamente.**
- [x] **VG2 — Inicio de Sesión implementado; comprobaciones manuales pendientes.**
- [x] **VG3 — Mantenedores y Configuración implementado; revisión del usuario pendiente.**
- [x] **VG4 — Inventario implementado; revisión del usuario pendiente.**
- [x] **VG5 — Ventas implementado; revisión del usuario pendiente.**
- [x] **VG6.1 — Trabajos implementado; revisión del usuario pendiente.**
- [x] **VG6.2 — Producción implementado técnicamente.**
- [x] **VG6.3 — Despacho implementado técnicamente.**
- [x] **VG7 — Cobranzas implementado técnicamente; revisión del usuario pendiente.**
- [x] **VG8 — Cuenta, administración y estados transversales implementado técnicamente.**
- [x] **VG9.1 — Matriz de rutas y evidencia completado.**
- [x] **VG9.2 — Apariencia y persistencia completado técnicamente.**
- [x] **VG9.3 — Contraste completado técnicamente.**
- [x] **VG9.4 — Comprobaciones técnicas de teclado/foco/AX/zoom real 200% realizadas.**
- [ ] **VG9.4 — Prueba con lector de pantalla real pendiente; no cerrar por el árbol AX.**
- [x] **VG9.5 — Adaptación responsive comprobada técnicamente.**
- [x] **VG9.6 — Estados y perfiles comprobados técnicamente.**
- [x] **VG9.7 — Flujos y grillas comprobados técnicamente.**
- [x] **VG9.8 — Conservación de reglas/documentos auditada técnicamente.**
- [x] **VG9.9 — Comprobaciones técnicas completadas.**
- [x] **VG9.10 — Documentación final completada.**
- [ ] **Siguiente: VG9.11 — Aceptación y cierre.**

El alcance original fue de planificación. El estado vigente se registra en los checks anteriores y en las secciones de continuidad; la planificación histórica no describe funcionalidades ausentes hoy.


## 8. Continuidad VG1 — 28-10-2026

Base global implementada: IBM Plex Sans local 400/600, paletas minerales en :root/.dark, cabeceras planas, controles y superpuestos compartidos. Retirados AlcancePiloto, Inter y el condicionamiento visual por ruta. Preferencia/arranque conservados. Contraste destructivo en Oscuro corregido y controles del documento blanco independientes del tema.

Ver [validación y límites de VG1](DISENO-GLOBAL-VG1-VALIDACION.md) para comandos, evidencia y continuidad. Las casillas de VG1 corresponden a la base compartida y sus muestras; no acreditan revisión completa ni aceptación de todos los módulos. **Continuidad histórica: VG2**, implementado en la sección siguiente.


## 9. Continuidad VG2 — 28-10-2026

Ingreso, activación, restablecimiento y acceso denegado adaptados a VG1. Cabecera MTX/selector, formulario plano de 416 px, campos de 40 px, mostrar contraseña accesible, alertas/foco y estados de enlace ausente. Doble factor conserva aplicación/código personal, limpia la contraseña y enfoca el código; volver enfoca el correo. Bloqueo de acciones durante solicitudes. Servicios, sesiones, origen, cookies y permisos sin cambios.

Prueba nueva: tests/diseno-global-vg2.ui.ts (API ficticia). Regresión pública de producción ampliada en tests/piloto-visual-next.ui.ts (sólo GET). Evidencia, comandos y límites en [DISENO-GLOBAL-VG2-VALIDACION.md](DISENO-GLOBAL-VG2-VALIDACION.md). No acreditar SMTP, tokens reales, TOTP real o sesiones autenticadas desde estos ensayos. **Siguiente desarrollo VG3**, sin cerrar las comprobaciones manuales anteriores por arrastre.


## 10. Continuidad VG3 — 28-10-2026

Catálogos/Configuración adaptados: listados compactos, ayudas de 13 px, diálogos contenidos, acciones visibles de sucursales/recetas/IVA, códigos de producto completos y grupos de Empresa alineados. Se conservan todos los servicios, referencias, unidades bloqueadas, snapshots, versiones y confirmaciones. Logos/fotos mantienen superficie blanca sin inversión de color.

Prueba nueva tests/diseno-global-vg3.ui.ts: diez pantallas y 160 escenarios con fixtures, 360/768/1280, ambos temas, Crear/Ver/Editar, sucursales/recetas/cuentas anidadas y consulta por rol. Prueba de Compras ampliada para cancelar altas de proveedor/material sin perder borrador; regresión de grillas y Webpack/lint correctos. Evidencia y límites en [DISENO-GLOBAL-VG3-VALIDACION.md](DISENO-GLOBAL-VG3-VALIDACION.md). No equivale a CRUD autenticado real ni aprobación funcional de otros hitos. **Siguiente desarrollo VG4 — Inventario.**


## 11. Continuidad VG4 — 28-10-2026

Stock/Kardex de materia prima y terminado, mínimos, carga inicial, ajustes, traslados y correcciones adaptados. TablaConsulta admite alineación numérica explícita, zona horizontal enfocable y ayuda móvil; filtros/paginación compactos, encabezados moderados, diálogos contenidos y ayudas legibles. Acciones por registro con nombres accesibles. Ningún cambio de transacción, saldo, unidad, UUID o versión.

Ensayo tests/diseno-global-vg4.ui.ts con fixtures: ocho vistas, ambos temas y 360/768/1280, consulta/creación/corrección, vacíos y errores. Regresión de grillas y Dashboard/Compras; lint/tipos y Webpack. Evidencia y límites en [DISENO-GLOBAL-VG4-VALIDACION.md](DISENO-GLOBAL-VG4-VALIDACION.md). No acredita movimientos reales ni saldos en PostgreSQL; aprobación funcional y comprobaciones manuales siguen pendientes. **Siguiente desarrollo VG5 — Ventas.**


## 12. Continuidad VG5 — 28-10-2026

Cotizaciones y OCC adaptadas: filtros, diálogos, grillas, alineación de importes, acciones frecuentes visibles y ayudas de 13 px. Editor técnico conserva superficie blanca y formato/documento. Descripción de modalidad corregida: neto en nuevas/correcciones e IVA incluido en históricos; sin recalcular. Historial PDF mantiene contratos y archivos.

Ensayo tests/diseno-global-vg5.ui.ts con componentes/editor reales y acciones ficticias, netas/históricas, edición/corrección, aceptación, lectura sin precios y alta de Cliente conservando borrador. GD2–GD6 en ambos temas, lint y Webpack. Evidencia y límites en [DISENO-GLOBAL-VG5-VALIDACION.md](DISENO-GLOBAL-VG5-VALIDACION.md). No acredita escrituras reales, emisiones ni cumplimiento de permisos de servidor desde mocks. **Siguiente desarrollo VG6 — Trabajos, producción y despacho.**


## 13. Continuidad VG6.1 — Trabajos, 28-10-2026

Por instrucción del usuario, VG6 se desarrolla por partes. Esta entrega adapta sólo listado/consulta y planificación de OT, obra propia y editor de partidas/distribuciones. Tres archivos: ordenes.tsx, formulario.tsx y editor-linea-plan.tsx; contención del diálogo común también heredada por modos existentes, sin revisión particular de Producción/cierre/factura. No se tocaron esos formularios ni guías.

54 escenarios Claro/Oscuro con fixtures, consulta por rol, plan comercial/propio/lote pequeño y configuración de partidas. GD3 conserva identidad, receta histórica, revisión y reintentos; suites de grillas en ambos temas, lint y Webpack. Evidencia en [DISENO-GLOBAL-VG6-TRABAJOS-VALIDACION.md](DISENO-GLOBAL-VG6-TRABAJOS-VALIDACION.md). **Siguiente parte: VG6.2 Producción; después VG6.3 Despacho. VG6 completo permanece abierto.**


## 14. Continuidad VG6.2 y VG6.3 — 29-10-2026

**VG6.2 Producción:** consulta de ejecución/consumos/reservas, ayudas de 13 px, acciones distribuibles y editor de consumo contenido. Cierre, factura externa y reversión conservan sus componentes/reglas y heredan la base global; se verifican sus formularios con fixtures y sus grillas/confirmaciones mediante regresión GD4. Historial PDF conserva sus emisiones y enlaces.

**VG6.3 Despacho:** cabecera/listado compactos, paginación adaptable, cantidades alineadas y tablas de consulta/preparación enfocables con desplazamiento horizontal; detalle y editor contenidos, trazabilidad legible. Se corrige el aviso obsoleto que afirmaba que no existían permisos: la implementación ya los aplica. Salida, devolución y recepción física mantienen controles y confirmaciones.

Galería de 78 escenarios en Claro/Oscuro y 360/768/1280 px con componentes reales y consultas/acciones simuladas. Regresión completa de grillas en ambos temas; lint y compilación Webpack. Evidencia y límites en [DISENO-GLOBAL-VG6-PRODUCCION-DESPACHO-VALIDACION.md](DISENO-GLOBAL-VG6-PRODUCCION-DESPACHO-VALIDACION.md). No se modificaron servicios, datos, permisos ni PDFs históricos. **Implementación visual de VG6 completa; revisión funcional pendiente. Siguiente desarrollo VG7 Cobranzas.**


## 15. Continuidad VG7 — Cobranzas, 29-10-2026

Listado de cuentas migrado a Table compartida, con cantidades/cabeceras a la derecha, filtros compactos y buscador adaptable, tabla horizontal enfocable y resumen sin tarjetas decorativas. Detalle distingue importe, abonos y saldo con lista de definiciones; mantiene factura, vencimiento y promesa independientes. Diálogos de pagos, adjuntos y promesas contenidos; historia anidada con foco conservado. GrillaHistorial eleva ayudas a 13 px y VerDetalleHistorial incorpora contención/overscroll, también para sus consumidores existentes.

Galería con consultas/acciones simuladas: ambos temas y 360/768/1280 px, lectura, vacíos, cuenta inexistente, configuración incompleta, detalle e historial, pagos, anulación, adjuntos y promesas. Revisión/reintentos con mismo payload/clave, abono ya guardado sin duplicarlo al reintentar comprobante y borradores al cambiar tema mediante el estado real. Regresión completa de grillas en ambos temas, lint y compilación Webpack. Evidencia: [DISENO-GLOBAL-VG7-VALIDACION.md](DISENO-GLOBAL-VG7-VALIDACION.md). Sin servicios, esquema, deuda ni archivos históricos modificados. Manual/PDF actualizados. **Implementación VG7 completa; conformidad funcional pendiente. Siguiente VG8.**


## 16. Continuidad VG8 — Cuenta, administración y estados, 29-10-2026

Mi acceso usa secciones planas y formularios contenidos, acciones TOTP adaptables y metadatos legibles. Usuarios y Auditoría usan Table compartida con scroll enfocable, filtros/campos compactos y paginación conservada. Los diálogos de seguridad devuelven foco al control de origen cuando no hay otro diálogo abierto; el cambio pendiente se conserva durante reautenticación con contraseña/TOTP. No cambian permisos, credenciales, sesión, operaciones de factor o retención.

Se adaptan los estilos de los límites de carga/error existentes y se verifica cada uno de los 26 componentes. Se añade not-found.tsx al límite 404 existente de Next, sin crear URL nueva: español, temas y retorno al Dashboard. No agrega datos ni acceso a áreas protegidas.

330 escenarios con fixtures (55 superficies/estados × dos temas × tres anchos), navegación con seis roles y unión Ventas/Cobranza, menú de usuario/buscador/avisos, foco y conservación del payload tras reautenticar. Grillas en ambos temas, lint, tipos y Webpack correctos. 404 real verificado por GET, servidor temporal detenido. Evidencia e inventario completo: [DISENO-GLOBAL-VG8-VALIDACION.md](DISENO-GLOBAL-VG8-VALIDACION.md). Manual/PDF actualizados. **VG8 implementado técnicamente; revisión funcional pendiente. Siguiente VG9, sin cerrar sus validaciones manuales por arrastre.**


## 17. Continuidad VG9.1 — Matriz de cobertura, 29-10-2026

Inventario cotejado con archivos de App Router y navegación: 29 páginas, 26 límites de carga/error, límite 404 y ocho rutas HTTP (siete archivos y seguridad). Las 25 entradas del menú tienen página; las cuatro páginas públicas de acceso quedan fuera de él. Cada página/estado tiene etapa, fuente y alias de evidencia, ambos temas y móvil/escritorio registrados.

224 PNG previos verificados por existencia, firma y ancho; resultados JSON exitosos y correspondencia de alias, sin incidencias de inventario. No se regeneran capturas ni se certifica su actualidad frente a todas las dependencias compartidas. La regresión final sigue en VG9.9. Conformidad general del piloto para Dashboard/Compras registrada; las 29 aceptaciones finales siguen pendientes.

Matriz: [DISENO-GLOBAL-VG9-1-MATRIZ.md](DISENO-GLOBAL-VG9-1-MATRIZ.md). Informe local detallado con archivos, dimensiones y SHA-256: var/validacion/diseno-global-vg9-1/resultado.json. Sin cambios de aplicación ni datos; revisión documental/enlaces/diff, sin levantar servidores o ejecutar build. **VG9.1 completo; continuar VG9.2. VG9 completo permanece abierto.**


## 18. Continuidad VG9.2 — Apariencia y persistencia, 29-10-2026

Regresión sobre estado/bootstrap reales: Oscuro inicial con SO Claro, elección manual/Sistema explícito, prioridad manual, recarga, sincronización entre pestañas conservando borrador/diálogo, orígenes independientes, valor inválido, almacenamiento bloqueado/cuota y ausencia de matchMedia. Ciclo adicional con Ingreso y AppTopbar reales: cinco ingresos y cuatro salidas con API ficticia, navegación de documento y recarga; las tres preferencias conservadas. No acredita sesiones reales.

Next de producción real: restauración antes de React con chunks bloqueados, fuente local, hidratación y navegación pública correctas; cero POST, servidor temporal 3032 detenido. Lint y Webpack correctos; Turbopack conserva el bloqueo interno de puertos. Sin cambios de aplicación/tema/seguridad, datos o manual. Los ensayos existentes aceptan directorio alternativo para preservar evidencia histórica.

Detalle y límites: [DISENO-GLOBAL-VG9-2-VALIDACION.md](DISENO-GLOBAL-VG9-2-VALIDACION.md). Informe local agregado: var/validacion/diseno-global-vg9-2/resultado.json. **VG9.2 completado técnicamente. Siguiente VG9.3 Contraste; operación autenticada real y aprobación final siguen pendientes.**


## 19. Continuidad VG9.3 — Contraste, 29-10-2026

Barrido renderizado y correcciones de estados compartidos: se retira opacidad que debilitaba texto deshabilitado y se usan pares muted; bordes outline/input y errores definidos; anillos/contornos de foco sólidos; selección de opciones con contorno interior y menús con foco visible. Iconos de búsqueda/selector usan tono legible. Fondo destructivo 5%/10% normal/hover para mantener contraste sobre panel informativo también en Oscuro. Paleta base intacta; disabled/aria-disabled, permisos y handlers se conservan.

18.268 mediciones repetidas entre 72 combinaciones tema/estado, cuatro superficies, hover de seis variantes, foco/error, diálogo/menú, selección, gráficos y deshabilitados: cero fallos. Mínimos globales: texto/placeholder 4,77:1, bordes 3,27:1, gráficos 5,18:1, foco 6,27:1. Grillas 7/7 en cada tema, TC2, lint y Webpack correctos; Turbopack bloqueado por puerto interno. Sin servidor de validación ni escrituras de dominio.

Evidencia, hallazgos confirmados y límites: [DISENO-GLOBAL-VG9-3-VALIDACION.md](DISENO-GLOBAL-VG9-3-VALIDACION.md). Informe con huellas de fuentes: var/validacion/diseno-global-vg9-3/resultado.json. No certifica todas las pantallas, documentos o accesibilidad integral ni actualiza por arrastre las capturas anteriores. **VG9.3 completo técnicamente; seguir VG9.4 teclado/foco/lector/zoom.**


## 20. Continuidad VG9.4 — Accesibilidad, 29-10-2026

- [x] Buscador y menú móvil recuperan foco al cerrar; campo de búsqueda con foco visible.
- [x] Listas de Command con nombres efectivos en español mediante `label`, sin coincidencias live y sin iconos decorativos en AX.
- [x] Diálogos limitados a la altura disponible, desplazamiento interior y buscador centrado; acciones alcanzables al 200%.
- [x] `tests/diseno-global-vg9-4.ui.ts`: componentes reales, consultas/API/router ficticios, sin BD; teclado, foco, nombres/referencias AX, avisos y zoom de navegador real en Claro/Oscuro. Perfil Chromium desechable, ventana 1280 constante, innerWidth 640 y DPR 2; no viewport reducido como sustituto.
- [x] Grillas 7/7 por tema, contraste 18.268 mediciones sin fallos, regresión VG8, lint y `pnpm build` Turbopack correctos. Capturas ficticias y huellas de las cinco fuentes modificadas guardadas; no se inició servidor de aplicación.
- [ ] AT-01–AT-07 con lector real y aceptación final. VG9.4 **sigue abierto por esta prueba manual**, aunque sus comprobaciones técnicas estén realizadas.

Detalle: [DISENO-GLOBAL-VG9-4-VALIDACION.md](DISENO-GLOBAL-VG9-4-VALIDACION.md). Informe local: var/validacion/diseno-global-vg9-4/resultado.json. Siguiente desarrollo técnico VG9.5; no ejecutar las restantes etapas por arrastre. Sin servicios, permisos, datos, migraciones o PDF históricos modificados. Manual/PDF final reservado a VG9.10.


## 21. Continuidad VG9.5 — Responsive, 29-10-2026

- [x] Cabeceras y opciones de selector admiten referencias largas; usuario con ancho acotado en la barra.
- [x] DataTable incorpora región desplazable enfocable; Table muestra completo el control interior al recibir foco.
- [x] Selector limitado al espacio vertical disponible, con lista desplazable; posición comprobada después de estabilizar el cálculo de Radix.
- [x] Prueba específica en 360×800, 768×1000, 1280×900, 1440×900 y 640×360, Claro/Oscuro: diez combinaciones, teclado, contenido extenso y pulsaciones táctiles emuladas en móvil. Sin BD ni API reales.
- [x] Galerías VG2–VG8: 958 entradas correctas; piloto Dashboard/Compras: 22. Tras el último ajuste de altura del selector se repitieron VG9.5 y VG9.4 teclado/AX/zoom real; no se presentan las galerías anteriores a ese ajuste como posteriores.
- [x] Lint, build Turbopack, enlaces, diff y huellas verificados. Capturas ficticias e informes en var/validacion/diseno-global-vg9-5/.
- [ ] Dispositivos físicos, otros motores y aceptación final; lector real VG9.4 continúa pendiente.

Detalle: [DISENO-GLOBAL-VG9-5-VALIDACION.md](DISENO-GLOBAL-VG9-5-VALIDACION.md). Sin cambios de servicios, permisos, datos, migraciones ni PDF históricos. **VG9.5 completo técnicamente. Siguiente VG9.6 Estados y perfiles**, sin ejecutar el resto del plan por arrastre. Manual/PDF final en VG9.10.


## 22. Continuidad VG9.6 — Estados y perfiles, 29-10-2026

- [x] Mensajes vacíos según permiso en Unidades, Bodegas, Materias primas, Clientes y Proveedores, sin cambiar guardas ni conceder permisos.
- [x] DataTable y TablaConsulta separan el mensaje vacío de las columnas desplazables; ayuda legible en móvil.
- [x] `tests/diseno-global-vg9-6.ui.ts`: 92 entradas, Claro/Oscuro, seis roles y combinaciones Ventas+Cobranza/Ventas+Consulta, 0/1/125 registros, filtro/paginación, reducción de lista, carga/error/reintento. Identidad y lecturas ficticias; escrituras sustituidas y Prisma bloqueado.
- [x] Matriz explícita de operación y lectura de precios/costos sobre la función de permisos; no certifica los DTO/HTTP reales.
- [x] Cobertura estática S4: 93 acciones, 25 páginas, siete rutas de archivos, 127 entradas. Galería VG3 repetida tras el cambio compartido: 160 escenarios correctos.
- [x] Lint y compilación Webpack correctos. Turbopack habitual detenido tras quedar sin progreso en compile; no se cambió package.json ni se afirma un error EPERM no observado.
- [ ] Sesiones reales por rol, rechazo HTTP, campos económicos reales y aceptación; lector real VG9.4 y dispositivos físicos VG9.5 pendientes.

Detalle: [DISENO-GLOBAL-VG9-6-VALIDACION.md](DISENO-GLOBAL-VG9-6-VALIDACION.md). Informe y huellas en var/validacion/diseno-global-vg9-6/resultado.json. Sin servicios, permisos de dominio, datos, migraciones o PDF históricos modificados. **Siguiente VG9.7 Flujos y grillas**; no ejecutar las demás etapas por herencia ni cerrar validaciones funcionales anteriores.


## 23. Continuidad VG9.7 — Flujos y grillas, 29-10-2026

- [x] Suite de grillas: 7/7 por tema; 30 capturas a 360/768/1280 px. Recepciones/OCC, OT/recetas, producción, despacho/correcciones, historia/PDF/sesiones con contratos ficticios.
- [x] Recorridos complementarios: Ventas 92 entradas, Cobranzas 88, piloto Compras/Dashboard 22; borradores, confirmaciones, descartes, respuestas inciertas y diálogos anidados.
- [x] Soporte de pruebas con IBM Plex Sans local 400/600, preferencia de tema coherente y aserciones de fuente/tema. Las capturas antiguas con Arial no se presentan como si tuvieran esta condición.
- [x] Lint y compilación Webpack correctos. Turbopack habitual agotó el límite de 90 s en compile; script conservado.
- [x] Índice de evidencia y 116 huellas en var/validacion/diseno-global-vg9-7/resultado.json; las huellas no implican prueba de cada componente.
- [ ] Integración real con Next/PostgreSQL, archivos y sesiones; aceptación, lector real y dispositivos físicos siguen pendientes. No cierre funcional por simulación.

Detalle: [DISENO-GLOBAL-VG9-7-VALIDACION.md](DISENO-GLOBAL-VG9-7-VALIDACION.md). No se cambiaron componentes productivos, servicios, reglas, datos, esquema o PDF históricos. Sólo se reforzó el soporte de pruebas y se registró evidencia nueva. **Siguiente VG9.8 Conservación de reglas y documentos**, sin ejecutar los demás hitos por arrastre. Manual/PDF final en VG9.10.


## 24. Continuidad VG9.8 — Conservación, 29-10-2026

- [x] Auditor reproducible `tests/diseno-global-vg9-8-preservacion.ts`: referencia d555de5ca086492e727569a7ce7df217a3caa768; 200 archivos protegidos idénticos, 102 interfaces examinadas y 113 llamadas importadas con firmas iguales.
- [x] package.json, lockfile y prisma.config.ts sin diferencias, comprobados adicionalmente; ninguna migración/seed/acción de negocio ejecutada.
- [x] Nueve pruebas puras de importes netos/históricos/OCC, texto técnico, producción, seguridad y cobertura/autoría correctas.
- [x] Seis PDF locales (3 cotizaciones, 2 OT, 1 guía), cabecera/tamaño/SHA-256 antes/después y cierre tras las validaciones. No se reemitieron ni modificaron.
- [x] Lint y compilación Webpack correctos. Turbopack habitual agotó el límite de 90 s en compile; scripts intactos.
- [ ] No hay manifiesto PDF pre-rediseño ni conciliación de PostgreSQL: no afirmar preservación retrospectiva completa o integridad de toda la base. Descargas autenticadas, aceptación y pendientes de lector/dispositivos siguen abiertos.

Evidencia y límites: [DISENO-GLOBAL-VG9-8-VALIDACION.md](DISENO-GLOBAL-VG9-8-VALIDACION.md). Informes/huellas en var/validacion/diseno-global-vg9-8/. `--comprobar-cierre` conserva el inventario inicial y verifica el estado final; el modo normal inicia otro inventario. El manual PDF es documentación editable, excluida de PDF comerciales. **Siguiente VG9.9 Comprobaciones técnicas**, sin ejecutar integración en la base real ni cerrar validaciones funcionales por arrastre.


## 25. Continuidad VG9.9 — Cierre técnico, 29-10-2026

- [x] Ejecutor reproducible `scripts/validar-diseno-global.ts`: 32 pasos correctos en la ejecución final, sin fallos; dos trabajadores y evidencia separada por suite.
- [x] Lint, tipos independientes y build Turbopack correctos. Next público real con cero POST; servidor temporal propio cerrado.
- [x] Nueve pruebas puras; galerías VG2–VG8 958 entradas, TC2/ciclo, contraste 18.268, teclado/AX/zoom real, responsive diez combinaciones, estados/perfiles 92, piloto 22 y grillas 7/7 por tema correctos.
- [x] Fuentes/PDF conservados al cierre, 329 huellas de fuentes estables. No se modificaron componentes de aplicación durante el recorrido.
- [x] Corregido tipo del entorno parcial del ejecutor; primer intento interrumpido archivado en antes/. El resultado final de raíz es el vigente, no los logs de antes/.
- [ ] Lector real VG9.4, dispositivos físicos/otros motores, integración autenticada/BD/archivos y aceptación final permanecen pendientes.

Informe: [DISENO-GLOBAL-VG9-9-VALIDACION.md](DISENO-GLOBAL-VG9-9-VALIDACION.md). Resultado/logs/huellas: var/validacion/diseno-global-vg9-9/resultado.json. Reproducción: `pnpm exec tsx scripts/validar-diseno-global.ts [directorio]`; sus regresiones no son pruebas de integración real. **Siguiente VG9.10 Documentación final**; no aprobar VG9.11 ni hitos funcionales por arrastre.


## 26. Continuidad — VG9.10, 30-10-2026

**Documentación final completada.** Manual Markdown y PDF edición 30-10-2026, 19 capítulos y 26 páginas Carta, con ocho capturas de la ejecución final VG9.9 (datos ficticios). Incluye ingreso, Dashboard y compra en Claro/Oscuro, listado móvil y abono; origen/SHA-256 en docs/capturas/manual-vg9-10/manifest.json. Se retiran referencias al PDF desactualizado y se explican teclado, desplazamiento de tablas, borradores, vacíos y apariencia.

Exportación con pnpm manual:pdf y exportador intacto; pdfinfo/pdftotext/pdfimages, rutas/anclas y muestra visual de portada/compra correctos. No se ejecutaron nuevamente build, lint, servidores o pruebas de aplicación al ser cambios documentales. Se conserva el historial de hitos y se concilia el resumen vigente de V1 con Cobranzas, Dashboard y manual ya implementados.

Informe: [DISENO-GLOBAL-VG9-10-VALIDACION.md](DISENO-GLOBAL-VG9-10-VALIDACION.md). **Siguiente VG9.11: aceptación del usuario**, sin cerrar por arrastre VG9.4 lector real, dispositivos/motores, integración, S7, C3/C4, Dashboard, inventario o usabilidad/manual. VG9 completo sigue pendiente hasta resolver o registrar explícitamente esos límites.
