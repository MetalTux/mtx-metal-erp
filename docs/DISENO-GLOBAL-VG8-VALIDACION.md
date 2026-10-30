# VG8 — Cuenta, administración y estados transversales

Fecha: **29-10-2026**. Implementado técnicamente; **conformidad funcional del usuario pendiente**. Siguiente VG9: regresión y cierre.

## Implementación

- Mi acceso: secciones planas separadas por líneas, formularios de identidad/contraseña con ancho contenido, títulos de 23/15 px, ayudas de 13 px y botones TOTP distribuibles. Corrige desborde del configurador en móvil. Sesiones mantienen tabla, datos y acciones.
- Usuarios: Table compartida con desplazamiento horizontal enfocable, correo legible, filtros/campos compactos, roles y acciones conservados. Diálogos de crear/consultar/editar, revisión, reautenticación e invitación con altura limitada y overscroll contenido.
- Auditoría: Table compartida, filtros planos y compactos, referencias largas contenidas y paginación. Retención mantiene explicación, identidad previa y confirmación.
- Foco: Usuarios y diálogos de confirmación/códigos propios recuerdan el control que los abrió. Al cerrar devuelven foco si no hay otro diálogo abierto. Corrige el retorno al documento detectado al consultar usuarios, sin cambiar autorizaciones ni payload.
- Límites existentes de carga/error: ritmo de 16 px y esqueletos/encabezados coherentes; mensajes, reset y avisos se conservan. Se ensayan los 26, incluidos los que ya heredaban correctamente los estilos.
- `src/app/not-found.tsx` sustituye la presentación genérica del límite 404 existente: español, ambos temas y retorno al Dashboard. No crea una URL nueva ni concede acceso al destino.

No cambia servicios, esquema, contraseñas, política 8–128, sesiones, TOTP, códigos, invitaciones, roles, permisos ni doce meses de retención. No escribe en PostgreSQL ni usa cuentas reales. Claves, enlaces y códigos de capturas son ficticios y carecen de validez. No instalar/activar credenciales ni interpretar los fixtures como secretos utilizables.

## Verificaciones ejecutadas

| Comprobación | Resultado / alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm exec tsc --noEmit` | Correcto; compilación final vuelve a comprobar tipos |
| `pnpm build` | Turbopack bloqueado por la restricción de proceso/puerto interno del entorno |
| `pnpm exec next build --webpack` | Correcto: compilación final, tipos y rutas |
| `pnpm exec tsx tests/diseno-global-vg8.ui.ts` | 330 escenarios: 55 superficies/estados × Claro/Oscuro × 360/768/1280 px |
| Contraste compuesto en galería | 3414 mediciones de textos visibles; mínimo 5,37:1. Muestra de textos, títulos, enlaces, celdas y botones habilitados; no auditoría exhaustiva de todos los controles/estados |
| `pnpm grillas:validar var/validacion/diseno-global-vg8/grillas` | 7/7 correctos, Oscuro |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg8/grillas-claro` | 7/7 correctos, Claro |
| GET a dirección inexistente en compilación real, puerto temporal 3032 | HTTP 404, título en español, tema persistido y enlace al Dashboard correctos en Claro/Oscuro a 360 px |
| `pnpm manual:pdf` | Manual/PDF actualizados |

La galería usa componentes reales y reemplaza API/consultas por fixtures; bloquea importación de Prisma. Comprueba documento sin desborde, errores de navegador, foco al cerrar consulta/códigos, cambio de tema durante reautenticación y dos envíos idénticos del cambio pendiente tras confirmar identidad con contraseña/TOTP. No confirma ningún código real.

Navegación: Sidebar/Topbar reales para seis roles y unión Ventas/Cobranza, menú de usuario, Ctrl+K y notificaciones. Compara enlaces del menú con navegación permitida y ausencia de Usuarios en perfiles no administradores. Los permisos de servidor no se acreditan con este render. Regresión GD6 conserva revocación de otras sesiones, consulta histórica, foco e historiales PDF con transporte simulado. Cobertura estática S4 conserva 93 acciones, 25 páginas, siete rutas de archivo y 127 entradas asíncronas autorizadas.

Evidencia completa: `var/validacion/diseno-global-vg8/` y subcarpeta `http/`, ignoradas por Git. Muestras revisadas en [capturas/diseno-global-vg8](capturas/diseno-global-vg8/):

- [Usuarios Claro](capturas/diseno-global-vg8/claro-usuarios-1280.png).
- [Mi acceso Oscuro](capturas/diseno-global-vg8/oscuro-panel-1280.png).
- [Configuración TOTP móvil](capturas/diseno-global-vg8/oscuro-configurar-360.png).
- [Reautenticación móvil](capturas/diseno-global-vg8/oscuro-usuarios-reauth-360.png).
- [Auditoría](capturas/diseno-global-vg8/claro-auditoria-1280.png).
- [Menú de usuario](capturas/diseno-global-vg8/oscuro-nav-menu-1280.png).
- [404 real](capturas/diseno-global-vg8/claro-404-http-360.png).

Se inspeccionaron capturas de usuarios, auditoría, TOTP, reautenticación, menú y 404 real. Servidor temporal detenido; puertos 3030/3031/3032 libres al cierre. No se detuvo ningún servidor ajeno.

## Inventario de páginas existentes

Cobertura de implementación por hito; no equivale a aceptación autenticada de cada ruta. Cada fase conserva su documento de evidencia. No hay páginas provisionales en uso: ModulePlaceholder no tiene referencias desde las páginas actuales.

| Ruta | Hito de revisión visual |
| --- | --- |
| `/administracion/auditoria` | VG8 |
| `/administracion/usuarios` | VG8 |
| `/compras` | Piloto/VG1 |
| `/configuracion/empresa` | VG3 |
| `/configuracion/iva` | VG3 |
| `/configuracion/numeracion` | VG3 |
| `/inventario/ajustes` | VG4 |
| `/inventario/movimientos` | VG4 |
| `/inventario/productos-terminados` | VG4 |
| `/inventario/stock` | VG4 |
| `/inventario/traslados` | VG4 |
| `/mantenedores/bodegas` | VG3 |
| `/mantenedores/clientes` | VG3 |
| `/mantenedores/condiciones-pago` | VG3 |
| `/mantenedores/materiales` | VG3 |
| `/mantenedores/productos` | VG3 |
| `/mantenedores/proveedores` | VG3 |
| `/mantenedores/unidades` | VG3 |
| `/mi-acceso` | VG8 |
| `/` | Piloto/VG1 |
| `/trabajos/despachos` | VG6 |
| `/trabajos/ordenes` | VG6 |
| `/ventas/cobranza` | VG7 |
| `/ventas/cotizaciones` | VG5 |
| `/ventas/ordenes` | VG5 |
| `/acceso-denegado` | VG2/VG8 |
| `/activar` | VG2 |
| `/ingresar` | VG2 |
| `/recuperar` | VG2 |

El límite global 404 es un componente especial, no una ruta adicional. Las siete rutas de archivo/API mantienen protección y presentación documental; no se rediseñan sus bytes.

## Límites de carga/error ensayados

Cada caso se renderiza en ambos temas y tres tamaños. Sus rutas de padre se incluyen en el inventario anterior.

| Caso de galería | Archivo |
| --- | --- |
| `estado-0` | `src/app/(app)/compras/error.tsx` |
| `estado-1` | `src/app/(app)/compras/loading.tsx` |
| `estado-2` | `src/app/(app)/configuracion/empresa/error.tsx` |
| `estado-3` | `src/app/(app)/configuracion/empresa/loading.tsx` |
| `estado-4` | `src/app/(app)/inventario/ajustes/error.tsx` |
| `estado-5` | `src/app/(app)/inventario/ajustes/loading.tsx` |
| `estado-6` | `src/app/(app)/inventario/movimientos/error.tsx` |
| `estado-7` | `src/app/(app)/inventario/movimientos/loading.tsx` |
| `estado-8` | `src/app/(app)/inventario/stock/error.tsx` |
| `estado-9` | `src/app/(app)/inventario/stock/loading.tsx` |
| `estado-10` | `src/app/(app)/inventario/traslados/error.tsx` |
| `estado-11` | `src/app/(app)/inventario/traslados/loading.tsx` |
| `estado-12` | `src/app/(app)/mantenedores/bodegas/error.tsx` |
| `estado-13` | `src/app/(app)/mantenedores/bodegas/loading.tsx` |
| `estado-14` | `src/app/(app)/mantenedores/clientes/error.tsx` |
| `estado-15` | `src/app/(app)/mantenedores/clientes/loading.tsx` |
| `estado-16` | `src/app/(app)/mantenedores/condiciones-pago/error.tsx` |
| `estado-17` | `src/app/(app)/mantenedores/condiciones-pago/loading.tsx` |
| `estado-18` | `src/app/(app)/mantenedores/materiales/error.tsx` |
| `estado-19` | `src/app/(app)/mantenedores/materiales/loading.tsx` |
| `estado-20` | `src/app/(app)/mantenedores/proveedores/error.tsx` |
| `estado-21` | `src/app/(app)/mantenedores/proveedores/loading.tsx` |
| `estado-22` | `src/app/(app)/mantenedores/unidades/error.tsx` |
| `estado-23` | `src/app/(app)/mantenedores/unidades/loading.tsx` |
| `estado-24` | `src/app/(app)/trabajos/despachos/error.tsx` |
| `estado-25` | `src/app/(app)/trabajos/despachos/loading.tsx` |

## Pendientes y continuidad

- [ ] Conformidad visual/funcional del usuario con datos y perfiles de prueba reales.
- [ ] Zoom real 200%, lector de pantalla y recorrido integral con tecnologías de asistencia.
- [ ] Sesiones, reautenticación, TOTP/códigos/invitaciones reales y depuración efectiva sobre copia autorizada, si se requiere renovar evidencia de seguridad. Los mocks y GET 404 no sustituyen esas validaciones ni aprueban S7 pendiente.
- [ ] VG9: matriz final y regresión integral, persistencia/varias pestañas y aceptación final.

**Continuar por VG9.** Conservar la dirección visual y las reglas de seguridad; no volver a auditar desde cero para saber qué se implementó.
