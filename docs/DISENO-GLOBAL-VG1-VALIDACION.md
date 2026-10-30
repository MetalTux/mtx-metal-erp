# VG1 — Base visual global

Fecha: **28-10-2026**. Implementado y validado técnicamente. Revisión funcional del usuario pendiente.

## Cambios

- IBM Plex Sans local 400/600 como fuente global, precargada; retirado Inter de la raíz. Geist Mono se conserva para códigos.
- Paletas minerales aprobadas en `:root/.dark`, heredadas por rutas públicas, ERP y portales. Eliminado `AlcancePiloto` y su marcador; navegar ya no recupera la base visual anterior.
- Cabeceras planas de sección, títulos compartidos de 23 px, contexto de 13 px y tablas compactas. Texto de trabajo 14 px; las clases particulares de módulos se revisan en sus hitos.
- Radios discretos, superpuestos delimitados con borde sin sombra ornamental, Sonner plano, botones con transición de color y contraste destructivo corregido en Oscuro. Búsqueda Command con borde de campo visible.
- Menú activo con los mismos tokens; barra, breadcrumbs, buscador, campana, usuario y salida conservan nombres, permisos y acciones. Panel móvil conserva su comportamiento.
- Diálogos conservan límites específicos (detalle de Compras 672 px y recepción 768 px); formulario principal ancho y scroll contenido. No se impone un ancho universal.
- Documento técnico blanco conservado. Sus tiradores/selección usan el verde oscuro aprobado para seguir contrastando sobre blanco en ambos temas.
- Manual Markdown/PDF y contexto de diseño actualizados.

No se modificaron servicios, consultas de dominio, esquema, migraciones, datos, autenticación ni PDFs históricos.

## Verificación reproducible

| Comando | Resultado y alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Turbopack bloqueado por permiso interno de puertos; no es un error TypeScript |
| `pnpm exec next build --webpack` | Correcto; incluye comprobación TypeScript y rutas de producción. Primera ejecución aislada falló al consultar showConfig; ejecución autorizada fuera del aislamiento correcta |
| `pnpm exec tsx tests/temas-tc1.ui.ts` | Tokens, texto/hover, campos, series gráficas, cabecera plana y diálogo en ambos temas |
| `pnpm exec tsx tests/temas-tc2.ui.ts` | Oscuro predeterminado, preferencia/Sistema, almacenamiento restringido, pestañas y borradores |
| `pnpm exec tsx tests/temas-tc3.ui.ts` | Dashboard, Stock, mantenedor, usuarios/reautenticación, editor, avisos, buscador/selectores, menú móvil y contraste representativo |
| `pnpm exec tsx tests/piloto-visual.ui.ts` | Dashboard/Compras, anchos, formulario, errores, teclado/foco, ambos temas, coherencia al cambiar ruta con contenido conservado |
| `pnpm grillas:validar var/validacion/diseno-global-vg1/grillas` | 7/7: requerimientos, cobertura S4 y grillas GD2–GD6; Oscuro |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg1/grillas-claro` | 7/7; Claro |
| `pnpm exec tsx tests/piloto-visual-next.ui.ts` | Producción real: GET de ingreso/recuperación, Plex 400/600 cargada, restauración antes de React, navegación e hidratación sin errores, cero POST |
| `pnpm manual:pdf` | PDF regenerado |

Pruebas con datos/acciones ficticios, sin conexión de los ensayos a PostgreSQL. El ensayo público inicia y detiene su servidor en 3032, comprueba el puerto libre antes/después y no envía credenciales. Al cierre, 3032 libre; el proceso preexistente del usuario en 3030 se conserva.

## Evidencia y alcance

Resultados detallados/capturas en `var/validacion/temas-tc1`, `temas-tc2`, `temas-tc3`, `piloto-visual` y `diseno-global-vg1`. Selección permanente en [capturas VG1](capturas/diseno-global-vg1/). Comparación anterior: [auditoría previa](AUDITORIA-VISUAL-DASHBOARD-COMPRAS.md) y `capturas/auditoria-visual-20261028/`.

Muestras de familias: Dashboard/Compras; Unidades y Stock; Cotizaciones/OCC (GD2), planificación OT (GD3), producción (GD4), guías/devoluciones (GD5), cobranza y seguridad (GD6), usuarios/reautenticación y acceso público. Incluye revisión estática de colores particulares: imagen de Producto conserva fondo blanco y el ingreso conserva su sombra particular para VG2. No acredita todos los formularios de cada familia.

Se midieron pares representativos con mínimos 4,5:1 para texto y 3:1 para controles/gráficos/foco. Las pruebas esperan las animaciones de apertura y restauración asíncrona del foco; la tabla mensual se despliega antes de medir su texto. No se descartan errores de contraste de contenido visible para hacer pasar los ensayos.

Tamaños 360/768/1280–1440 px; las tablas anchas desplazan dentro de su contenedor. El ensayo de reflujo a 640 px **no equivale a zoom real 200%**. Revisión con lector de pantalla, zoom real, flujos autenticados completos y aceptación por módulo siguen para VG2–VG9. La auditoría global exhaustiva no se da por terminada.

## Continuación

**VG2 — Inicio de Sesión, activación y recuperación.** Ya heredan fuente/paleta, pero falta adaptar su composición y estados particulares. No avanzar a VG3 ni cerrar validaciones de Seguridad/Cobranzas/otros hitos por este cambio de base.
