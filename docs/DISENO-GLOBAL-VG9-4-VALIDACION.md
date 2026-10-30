# VG9.4 — Teclado, foco, accesibilidad y zoom

Fecha: **29-10-2026**. **Comprobaciones técnicas completadas en el alcance descrito; prueba con lector de pantalla real pendiente. VG9.4 permanece abierto hasta realizarla.**

## Alcance y correcciones

Aplicación de Impeccable en modo Operate y [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas en esta revisión. Se conserva DESIGN.md, la paleta, fuente, densidad y funcionamiento del ERP.

Hallazgos corregidos, con ubicación en la versión comprobada:

- `src/components/layout/command-menu.tsx:16` — El buscador abierto programáticamente perdía el foco al cerrar con Escape. Ahora recuerda el control de origen, tanto desde el botón como desde Ctrl+K, y lo recupera si sigue montado.
- `src/components/ui/sidebar.tsx:71` — El menú móvil abierto programáticamente también perdía el foco. Se conserva el control previo y se recupera al cerrar el panel.
- `src/components/ui/command.tsx:77` — El campo de búsqueda eliminaba el contorno nativo, pero su contenedor sólo reconocía el foco de InputGroupInput. Se añade indicador visible específico para CommandInput.
- `src/components/ui/command.tsx:94` — La biblioteca anunciaba las listas como “Suggestions”. Se usa su propiedad `label` (un `aria-label` suelto no reemplazaba el nombre efectivo). El valor predeterminado es “Opciones disponibles”; el buscador y SelectorBuscable proporcionan nombres concretos en español.
- `src/components/formularios/selector-buscable.tsx:30` — El selector usa ese contrato de nombre accesible. Los mensajes sin coincidencias incorporan `aria-live="polite"` y `aria-atomic`; los iconos decorativos de Command quedan ocultos al árbol AX.
- `src/components/ui/dialog.tsx:64` — Un contenido largo podía dejar las acciones fuera del área visible al ampliar. Se limita la altura al espacio disponible y se permite desplazamiento interior. El buscador conserva el centrado común del diálogo para no exceder la ventana al 200%.

No se modifican servicios, permisos, credenciales, datos ni documentos históricos. No se ejecutaron migraciones ni escrituras en PostgreSQL.

## Comprobaciones ejecutadas

`tests/diseno-global-vg9-4.ui.ts` monta **ApplicationLayout, Ingreso, CommandMenu, AppSidebar, AppTopbar, SelectorBuscable, Dialog y Notificaciones reales**. Consultas de layout, router y respuesta de credenciales se sustituyen por contratos ficticios. Se rechaza cualquier importación de Prisma. No acredita autenticación, autorización ni guardado reales.

En **Claro y Oscuro**:

- [x] Tab al enlace Saltar al contenido; Enter mueve el foco al destino real del layout.
- [x] Buscador por teclado, foco inicial, Escape y retorno al disparador; Ctrl+K desde otro control conserva su origen.
- [x] Búsqueda, flechas y Enter solicitan la ruta correcta mediante el router simulado.
- [x] Selector: apertura con flecha, escritura, selección con Enter, devolución del foco y estado sin coincidencias.
- [x] Indicador visible en ambos campos de búsqueda; referencias ARIA apuntan a elementos existentes.
- [x] Diálogo: Tab permanece dentro, Escape cierra y devuelve foco al disparador.
- [x] Ingreso: mostrar/ocultar clave mediante teclado conserva `aria-pressed`; rechazo ficticio enfoca el mensaje de error.
- [x] Árbol AX de Chromium: título del diálogo, nombres de listas y campos, controles interactivos con nombre, región de avisos con anuncio `polite`. Se guardan árboles completos y resúmenes ARIA.
- [x] Zoom real del navegador al 200%: acceso, shell, menú móvil, buscador y diálogo largo. Las acciones enfocadas son alcanzables y visibles; sin desborde horizontal del documento en esos escenarios.

**Cómo se obtuvo el zoom:** extensión local mínima en un perfil Chromium desechable mediante `chrome.tabs.setZoom(2)`, con el canal Chromium de Playwright. No se instala en el navegador del usuario ni se incorpora a la aplicación. Se comprueba `getZoom() = 2`, ventana exterior constante de 1280 px, `innerWidth` de 1280 a 640 y `devicePixelRatio` de 1 a 2. No se usa CSS zoom, emulación de densidad, pinch zoom ni reducción manual del viewport como sustituto. Perfil y extensión temporales se retiran al cerrar.

Referencias del método: [extensiones en Playwright](https://playwright.dev/docs/chrome-extensions) y [API de pestañas de Chromium](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).

Regresiones:

- [x] `pnpm lint`, sin advertencias al finalizar.
- [x] `pnpm build`, **Turbopack correcto en esta ejecución**, incluida comprobación de tipos y generación de rutas. No fue necesaria la alternativa Webpack utilizada en fases anteriores.
- [x] Grillas: 7/7 en Oscuro y 7/7 en Claro, con transporte ficticio; incluye descarte, reintentos y foco en consultas anidadas.
- [x] Contraste VG9.3 repetido sobre las fuentes actuales: 18.268 mediciones, cero fallos.
- [x] Regresión VG8: 330 escenarios de cuenta, administración, navegación y límites de carga/error con fixtures, correctos; resultado final registrado en el informe local.

## Evidencia y reproducción

```bash
pnpm exec tsx tests/diseno-global-vg9-4.ui.ts
VG8_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-4/vg8 pnpm exec tsx tests/diseno-global-vg8.ui.ts
pnpm grillas:validar var/validacion/diseno-global-vg9-4/grillas
GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg9-4/grillas-claro
pnpm lint
pnpm build
```

Informe específico, zoom, huellas SHA-256 y árboles AX: `var/validacion/diseno-global-vg9-4/resultado.json` y archivos vecinos. Regresiones en `grillas/`, `grillas-claro/`, `contraste/` y `vg8/`. VG8 admite ahora destino configurable; su valor predeterminado se conserva. La repetición de VG9.3 también actualizó su directorio `final/`; se conserva copia del resultado actual en `contraste/` de VG9.4. Las capturas antiguas siguen siendo evidencia histórica, no una certificación automática de los cambios compartidos.

Capturas permanentes con datos ficticios y zoom real:

- [Buscador Oscuro](capturas/diseno-global-vg9-4/oscuro-buscador-zoom200.png).
- [Buscador Claro](capturas/diseno-global-vg9-4/claro-buscador-zoom200.png).
- [Ingreso Oscuro](capturas/diseno-global-vg9-4/oscuro-ingresar-zoom200.png).
- [Acción de diálogo largo Claro](capturas/diseno-global-vg9-4/claro-dialogo-zoom200.png).

No se inició ningún servidor de aplicación para estos fixtures. Los navegadores de validación se cerraron. Al finalizar, 3031/3032 estaban libres; 3030 estaba ocupado por un servidor previo (PID 106156), que no se detuvo.

## Pendiente manual: lector de pantalla

El árbol AX y los atributos live **no prueban lo que escucha una persona** ni la secuencia de anuncios de cada combinación de navegador y lector. No se declara certificación WCAG ni cobertura integral de las 29 rutas o de todos sus formularios. Tampoco se da por aprobada ninguna validación S7 o de negocio.

Realizar con **Orca + Firefox/Chromium** en Linux o **NVDA + Firefox/Chrome** en Windows, con una cuenta de prueba autorizada. Registrar lector, navegador, versión, tema y resultado. Repetir en Claro y Oscuro; no compartir claves, códigos TOTP ni datos privados en capturas.

| Caso | Paso y resultado esperado | Estado |
| --- | --- | --- |
| AT-01 | Recorrer el ingreso con Tab: escuchar Correo, Contraseña y botones con sus nombres; mostrar clave debe anunciar el estado. Provocar un rechazo con credenciales ficticias: escuchar el error y poder volver a los campos. | Pendiente |
| AT-02 | Tras ingresar normalmente, Tab al enlace Saltar al contenido y Enter; recorrer encabezados y navegación por regiones. El foco debe quedar en el contenido. | Pendiente |
| AT-03 | Ctrl+K: escuchar Buscar página y Buscar una sección. Escribir, recorrer opciones con flechas y escuchar la seleccionada; Escape debe devolver al punto de origen. | Pendiente |
| AT-04 | En un formulario autorizado, abrir un selector relacionado: escuchar su nombre, estado expandido, lista y opción activa. Buscar un texto inexistente y comprobar el anuncio sin coincidencias. Cancelar sin guardar. | Pendiente |
| AT-05 | Abrir una consulta y después una consulta anidada disponible: escuchar el título de la ventana activa, sin recorrer el contenido de fondo. Cerrar cada una y comprobar el retorno del foco. | Pendiente |
| AT-06 | Generar un aviso reversible en un entorno de prueba: confirmar que se escucha su contenido sin interrumpir innecesariamente la lectura y que Cerrar aviso es identificable. | Pendiente |
| AT-07 | Al 200% del navegador, repetir navegación y una consulta larga; alcanzar con teclado las acciones y oír nombres/estados correctamente. No confirmar operaciones de negocio sólo para validar la apariencia. | Pendiente |

Formato de devolución: `AT-03 / lector y navegador / tema / aprobado o detalle / anuncio observado`. Si un aviso se oye duplicado o no se oye, anotarlo: la prueba automatizada no resuelve esa diferencia.

**Continuidad:** VG9.4 conserva pendiente esta pauta manual; puede continuarse técnicamente con VG9.5 sin declararla realizada. Manual y PDF finales corresponden a VG9.10.
