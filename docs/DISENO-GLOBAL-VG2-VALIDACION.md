# VG2 — Acceso con la identidad global

Fecha: **28-10-2026**. Implementación terminada; pruebas técnicas de interfaz realizadas. Conformidad del usuario y comprobaciones manuales indicadas abajo pendientes.

## Qué cambió

- Cabecera MTX Metal ERP con el mismo símbolo del ERP y selector de apariencia visible antes de autenticarse. Pie discreto. Sin imagen decorativa, sombras ni degradados.
- Ingreso, activación y restablecimiento con superficie plana de 416 px como máximo, títulos de 23 px, texto de contexto de 13 px y campos/acción principal de 40 px. Se permite scroll vertical cuando el contenido supera el alto disponible.
- Correo y contraseñas con etiquetas/identificadores, nombres y autocompletado apropiados. Mostrar/ocultar con nombre accesible y estado presionado; controles nativos conservan pegado y gestores de contraseñas. Requisitos 8–128 sin cambios.
- Respuesta visible junto al formulario, con estado/alerta y foco ante error, además del toast existente. Estado ocupado anunciado y acciones bloqueadas. Recuperación valida el correo antes de enviar.
- Doble factor con instrucciones específicas, aplicación o código personal de respaldo, foco en el código y contraseña eliminada del estado al avanzar. Volver regresa el foco al correo. No permite volver durante una verificación en curso.
- Activación/restablecimiento sin fragmento de enlace muestra cómo solicitar uno nuevo y deshabilita guardar. El token sigue retirándose de la URL y se valida exclusivamente en el servidor. La respuesta genérica de enlace inválido/vencido/usado conserva su texto del servidor.
- Acceso denegado comparte composición y ofrece Volver al Dashboard. Ningún permiso se sustituye por visibilidad.

Archivos: src/components/seguridad/ingreso.tsx y layout/página acceso-denegado en src/app/(auth). No se cambió el cliente HTTP, API de seguridad, servicios, cookies, CSP, origen, sesiones, base de datos ni configuración SMTP. Google continúa pospuesto.

## Pruebas

- `pnpm lint` y `pnpm exec tsc --noEmit`: correctos.
- `pnpm build`: Turbopack bloqueado por el permiso interno de puertos conocido.
- `pnpm exec next build --webpack`: compilación y tipos correctos.
- `pnpm exec tsx tests/diseno-global-vg2.ui.ts`: componentes reales con transporte ficticio; Claro/Oscuro, capturas 360/768/1280, recorrido Tab/Enter, mostrar contraseña, errores/foco, recuperación genérica, segundo factor/código de respaldo, ocupado, retorno, enlace ausente y respuesta inválida, contraseñas distintas, redirección de éxito, configuración ausente y denegación. Se verifican contratos de payload/destino sin enviar datos al servidor real.
- `pnpm exec tsx tests/piloto-visual-next.ui.ts`: páginas públicas reales de producción en 3032 temporal; carga Plex 400/600, arranque/restauración de tema, persistencia entre rutas, borrador al cambiar apariencia, hidratación sin errores, capturas de activar/recuperar/denegado en ambos temas y 360/768/1280. Cero POST. Cierra su servidor y comprueba 3032 libre al terminar. No detiene el servidor del usuario en 3030.
- `pnpm manual:pdf`: manual actualizado.

El nuevo ensayo registra 166 mediciones de texto (mínimo observado 6,23:1) y 30 bordes de campos habilitados (mínimo 4,38:1), frente a objetivos 4,5:1 y 3:1 sobre fondos compuestos reales; no es una auditoría exhaustiva de cada píxel/estado. Foco y jerarquía también revisados en capturas. No se conectó el ensayo a PostgreSQL ni se consumieron tokens reales.

## Evidencia

Resultados/capturas: var/validacion/diseno-global-vg2/resultado.json y PNG del mismo directorio. Producción: var/validacion/piloto-visual/next/next-resultado.json y vg2-*.png. Selección permanente: [capturas VG2](capturas/diseno-global-vg2/). Referencia anterior: [base VG1](DISENO-GLOBAL-VG1-VALIDACION.md), captura ingreso-base-claro.png.

## Pendientes manuales explícitos

- [ ] Conformidad del usuario con las pantallas.
- [ ] Zoom real del navegador a 200% y revisión con lector de pantalla. Los tamaños reducidos del ensayo no se presentan como zoom real.
- [ ] Recorrido autenticado real: entrar al Dashboard, salir y volver a ingresar, conservando apariencia.
- [ ] Activar/restablecer con enlaces reales válidos/vencidos/usados; recuperación SMTP y asistida con cuentas autorizadas.
- [ ] TOTP y código personal de un solo uso reales. El ensayo acredita presentación y payload; no prueba la validación criptográfica, consumo del código ni revocación de sesiones.

Estos pendientes no cambian las reglas de Seguridad ni cierran S7. El siguiente desarrollo visual es **VG3: Mantenedores y Configuración**.
