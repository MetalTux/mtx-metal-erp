# TC2 — Selección y persistencia de apariencia

Fecha: **27-10-2026**. Implementado y comprobado técnicamente; revisión funcional del usuario pendiente. Continúa [el hito de temas](HITO-TEMAS-CLARO-OSCURO.md). TC3 y TC4 mantienen su alcance pendiente.

## Comportamiento entregado

- **Oscuro** por defecto, incluso con sistema operativo claro. Selector **Claro / Oscuro / Según el sistema** en la barra del ERP y en el layout compartido por ingreso, activación y recuperación. Mi acceso usa la barra del ERP.
- Según el sistema es una elección explícita, recuerda esa opción y sigue sus cambios; elegir Claro/Oscuro deja de seguirlos. Sin acceso a la consulta del sistema, respaldo Oscuro.
- Preferencia en `localStorage`, clave `mtx-apariencia`, limitada a tres valores permitidos. Se conserva al cerrar sesión y se comparte entre cuentas del mismo navegador/origen; localhost y túnel son independientes.
- Cambios entre pestañas mediante el evento nativo storage, sin bucles de escritura. Borrar o invalidar la preferencia vuelve a Oscuro.
- Si leer/escribir almacenamiento falla, la elección funciona en memoria durante la visita y el menú informa que no pudo guardarla. La recarga sin preferencia recuperable vuelve a Oscuro.
- Menú de opciones con selección identificada, teclado y nombre accesible; en móvil usa icono con nombre/ayuda. Sonner y controles nativos siguen el tema efectivo.

## Implementación

Sin dependencias nuevas: almacén pequeño con `useSyncExternalStore`, que conserva el árbol de formularios y diálogos. Se prefirió esta alternativa a incorporar una librería porque el alcance sólo requiere preferencia local, media query y eventos del navegador. La opción Sistema usa ese mismo mecanismo.

Un script constante en head restaura clase dark, color-scheme y preferencia antes del contenido visible. El HTML del servidor conserva Oscuro como respaldo; el selector espera la hidratación para habilitarse. `suppressHydrationWarning` se limita al elemento HTML cuyas propiedades modifica deliberadamente el script; no se aplica a formularios. No interpola datos del usuario ni modifica la política de scripts existente. Una futura CSP que restrinja scripts inline deberá autorizar este script mediante hash o nonce.

Archivos principales: `src/lib/tema-config.ts`, `src/components/tema/estado.ts`, `src/components/tema/selector-tema.tsx`, layouts raíz/acceso, barra superior y notificaciones. El botón del buscador usa transición sólo de colores para evitar que una transición de ancho entre escritorio y móvil desborde temporalmente la barra al incorporar el selector.

No cambia autenticación, cookies, endpoints, permisos, sesiones, UUID de operaciones, servicios, esquema ni datos. Cambiar apariencia no navega, envía formularios ni altera los PDF archivados.

## Evidencia y límites

`node --import tsx tests/temas-tc2.ui.ts`: componentes reales con CSS local, navegación simulada y contextos Chromium. Comprueba restauración antes del montaje, prioridad manual/Sistema, cambios del sistema, dos pestañas con storage nativo, borrador y diálogo conservados, teclado, Sonner claro, separación de orígenes, lectura bloqueada, escritura sin cuota, ausencia de matchMedia y anchos 360/768/1280. Resultado correcto; archivos en `var/validacion/temas-tc2/resultado.json` y capturas locales.

`node --import tsx tests/temas-tc2-next.ui.ts`: Next de producción temporal en 127.0.0.1:3032. Sólo GET públicos a ingreso y recuperación; ningún inicio de sesión ni envío de credenciales. Comprueba Oscuro inicial con SO claro, restauración de Claro aun bloqueando los chunks de React, hidratación sin errores, conservación del correo escrito, navegación y móvil/escritorio. El ensayo detiene su propio servidor y comprueba que 3032 quede libre. El servidor del usuario en 3030 no se detiene.

La barra autenticada se prueba como componente con navegación/datos simulados; no se ha recorrido una sesión real autenticada ni operaciones de negocio en ambos temas. Activación y panel personal comparten los layouts modificados, pero sus flujos de seguridad no se dan por revalidados. La auditoría visual de todos los módulos, zoom/lector de pantalla y aceptación humana corresponden a TC3/TC4.

Lint y tipos correctos. `pnpm build` se intentó: Turbopack falla por permisos al abrir su puerto interno. Se valida también la compilación de producción alternativa con `pnpm exec next build --webpack`; el resultado final se registra al pie. Este límite del entorno no cambia el script habitual del proyecto.

Manual actualizado en [Markdown](MANUAL-USUARIO.md) y [PDF](MANUAL-USUARIO.pdf). Las muestras de acceso no contienen cuentas reales; el correo de prueba usa example.invalid. Capturas revisadas en [capturas/temas-tc2](capturas/temas-tc2).

## Cierre técnico

- [x] `pnpm lint` y `pnpm exec tsc --noEmit`.
- [x] `pnpm exec next build --webpack`: compilación, tipos y 23 páginas generadas.
- [x] Ensayo de componentes TC2 y ensayo Next público sobre la compilación final Webpack; cero POST y sin errores de hidratación.
- [x] Servidor temporal detenido; 3032 libre y servidor previo del usuario en 3030 conservado.
- [x] `pnpm manual:pdf`: 19 páginas Carta, índice y nueva sección de apariencia.
- [ ] Aprobación funcional y auditoría global TC3/TC4.
