# VG9.2 — Apariencia y persistencia

Fecha: **29-10-2026**. **Completado técnicamente dentro del alcance descrito.** Recorrido autenticado real y conformidad final pendientes. Siguiente VG9.3.

## Resultado

La apariencia conserva la elección del navegador/origen; no depende de la cuenta. Sin preferencia guardada inicia Oscuro incluso con el sistema claro. Según el sistema requiere elección explícita y responde a cambios del SO; una elección manual tiene prioridad. La sincronización entre pestañas conserva borradores y diálogos abiertos.

No fue necesario modificar la aplicación. Se añadió un ensayo del ciclo de ingreso/salida y se permitió elegir directorio de evidencia en dos ensayos existentes, conservando sus valores predeterminados. Los artefactos previos usados por VG9.1 se preservan. No se cambiaron servicios, esquema, credenciales, sesiones, datos ni manual.

## Matriz comprobada

| Comportamiento | Evidencia ejecutada | Resultado |
| --- | --- | --- |
| Primer acceso Oscuro con SO Claro y sin preferencia | TC2, ciclo y Next público | Correcto |
| Restauración antes del montaje de React | Bootstrap real; Next con chunks bloqueados durante una recarga | Correcto |
| Claro/Oscuro manual y Sistema explícito | Selector real; cambio de media emulada en Chromium | Correcto |
| Elección manual prevalece frente al cambio de SO | TC2 y ciclo | Correcto |
| Recarga y navegación conservan la preferencia | Tres vistas ficticias; cuatro páginas públicas de Next real | Correcto, con alcances separados |
| Ingreso → navegación → salida → reingreso | Ingreso/AppTopbar y redirecciones de documento reales; API y sesión ficticias | Correcto en el cliente; no prueba autenticación de servidor |
| Pestañas comparten elección en el mismo origen | Dos páginas del mismo contexto Chromium | Correcto |
| Cambio desde otra pestaña conserva borrador/diálogo | TC2 y ciclo | Correcto |
| Quitar preferencia o guardar valor inválido | Eventos de almacenamiento y bootstrap | Vuelve a Oscuro |
| Almacenamiento bloqueado o cuota agotada | Fallos simulados del navegador | Cambio temporal y aviso; recarga vuelve a la preferencia disponible |
| Orígenes independientes | localhost frente a 127.0.0.1 en fixture | Preferencias separadas, comportamiento esperado |
| Sin matchMedia | API ausente simulada | Oscuro de respaldo |
| Hidratación y fuentes en producción | Next real, páginas públicas | Correcto; cero POST |

Emular el SO no equivale a cambiar la configuración física del equipo. La navegación del ciclo usa documentos servidos por el ensayo; sus vistas de Dashboard/Compras/Mi acceso son ficticias. No representa navegación autenticada de todos los módulos ni sustituye VG9.6/VG9.7.

## Ensayos y comandos

| Comando | Resultado y alcance |
| --- | --- |
| `TEMAS_TC2_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-2/estado pnpm exec tsx tests/temas-tc2.ui.ts` | 13 categorías de estado, bootstrap, almacenamiento, pestañas y preservación de formulario/diálogo; componentes reales, navegación simulada |
| `pnpm exec tsx tests/diseno-global-vg9-2.ui.ts` | Siete secuencias; cinco ingresos y cuatro salidas ficticios, tres vistas, recarga, media y pestañas. Sin errores de navegador; sólo acciones login/logout simuladas, sin registrar payloads |
| `NEXT_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-2/next pnpm exec tsx tests/piloto-visual-next.ui.ts` | Next real de producción; GET a /ingresar, /activar, /recuperar y /acceso-denegado, seis categorías informadas; cero POST |
| `pnpm lint` | Correcto |
| `pnpm build` | Turbopack bloqueado al crear proceso/puerto interno del entorno |
| `pnpm exec next build --webpack` | Correcto, incluye tipos y generación de rutas |

No hubo conexión del ensayo de componentes a PostgreSQL ni credenciales reales. La prueba de Next no inició sesión ni envió formularios. Su servidor temporal usa 3032, verifica disponibilidad antes de arrancar y lo libera al terminar; no detiene procesos del usuario. No se repitieron suites de dominio ajenas al alcance.

## Evidencia

Informe agregado local: `var/validacion/diseno-global-vg9-2/resultado.json`. Detalle en `estado/resultado.json`, `ciclo/resultado.json` y `next/next-resultado.json`, con capturas y log del servidor temporal. Estos archivos locales están ignorados por Git.

Muestras permanentes, con alcance indicado:

- [Ciclo ficticio: Claro tras reingresar](capturas/diseno-global-vg9-2/ciclo-simulado-claro-1280.png).
- [Ingreso público real en Claro](capturas/diseno-global-vg9-2/publico-ingreso-claro-1280.png).
- [Recuperación pública real en Oscuro, móvil](capturas/diseno-global-vg9-2/publico-recuperar-oscuro-360.png).

## Pendientes

- [ ] Recorrido con sesión real de un usuario autorizado: ingresar, navegar, salir y volver a ingresar. El ciclo ficticio demuestra conservación de apariencia en el cliente, sin acreditar las cookies o validaciones del servidor.
- [ ] Conformidad del usuario y pruebas manuales de comodidad/tecnologías de asistencia correspondientes a las demás etapas.
- [ ] VG9.3: contraste; restantes VG9.4–VG9.11 sin cerrar por arrastre.

Las validaciones funcionales anteriores, incluido S7, conservan su estado. La matriz de VG9.1 registra artefactos históricos y no se convierte en aceptación final por esta nueva regresión.
