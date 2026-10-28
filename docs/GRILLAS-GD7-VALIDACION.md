# GD7 — Regresión transversal y entrega para aceptación

Fecha: **27-10-2026**. **Regresión de componentes y documentación entregadas; cierre funcional pendiente.** GD7 no se considera aprobado por el usuario ni demuestra una instalación de producción validada.

## Evidencia ejecutada

- [x] `pnpm grillas:validar`: **7/7** comprobaciones correctas: cálculo puro de requisitos, cobertura S4 y cinco ensayos de navegador GD2–GD6.
- [x] CSS real de `src/app/globals.css` compilado localmente con las dependencias PostCSS/Tailwind instaladas. Componentes React reales, tema oscuro y fuente de sistema de respaldo; consultas, acciones, transporte y router simulados.
- [x] **15 capturas** a 360, 768 y 1280 px. Comprobación de ausencia de desborde horizontal de página y dentro de diálogos en los estados capturados, y de formularios HTML anidados.
- [x] Selección parcial, cantidad inválida, descartes, identidad tras quitar filas, recetas históricas, revisión obligatoria, conformidad, reintentos con contenido/UUID idénticos, consulta por rol, comprobantes históricos, rutas PDF y acciones de sesiones en el alcance simulado de cada ensayo.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, referencias locales y `git diff --check` correctos.
- [x] Manual actualizado y nueva exportación PDF local mediante `pnpm manual:pdf`, con texto seleccionable, índice y tres ejemplos ficticios. Se comprobaron metadatos, texto extraído y muestra visual de impresión.
- [ ] `pnpm build`: ejecutado; falla al crear un proceso/puerto interno de Turbopack (`Operation not permitted`). No se declara compilación exitosa.

Resumen reproducible: [resultado.json](capturas/grillas-gd7/resultado.json). Capturas completas de la ejecución en `var/validacion/grillas-gd7/`, ignoradas por Git. Tres muestras revisadas en [capturas/grillas-gd7](capturas/grillas-gd7/README.md). Los ensayos cierran sus navegadores. No se iniciaron servidores de aplicación ni se accedió/escribió en PostgreSQL.

## Ajustes derivados de la regresión

- Corregir ancho mínimo del fieldset de configuración de partida de OT: en móvil desbordaba el interior del diálogo, desplazando cabecera/campos al enfocar acciones de una tabla. Con `min-w-0` el desplazamiento queda contenido en cada tabla. Comprobado con CSS real y captura móvil.
- Reforzar retorno explícito de foco al botón Ver de los historiales. La prueba espera que termine la animación de apertura antes de enviar Escape, y comprueba el regreso sin cerrar la cuenta contenedora.
- Esperar cierre/retorno de foco de las animaciones en GD2/GD4; adaptar GD2 a las dos tablas actuales de consulta OCC (partidas e historial), conservando sus aserciones.
- Incorporar soporte común de estilos/capturas y ejecutor secuencial. No cambia ningún servicio, cálculo, permiso, esquema ni documento histórico.

## Límites y cierre pendiente

Los ensayos son de componentes, no una navegación completa de Next/RSC ni una prueba HTTP de autenticación. No prueban commit, rollback, concurrencia, descargas reales, saldos financieros, revocación real o permisos de archivos. Los servicios de dominio no se modificaron por esta conversión; las regresiones integrales que requieran BD deben ejecutarse en copia descartable con archivos aislados.

Las capturas usan datos completamente ficticios y montaje aislado, sin layout/menú completo. No certifican teclado completo, contraste, fuente Inter de producción, zoom nativo 200% ni accesibilidad con usuarios. Compras y altas internas de catálogos requieren todavía su recorrido funcional integral.

- [ ] Completar build e integración en un entorno que permita Next/Turbopack.
- [ ] Ejecutar recorridos y pruebas reales que correspondan sobre copia aislada, preservando historia, stock/Kardex/reservas y deuda.
- [ ] Obtener aprobación de los casos GD7-01 a GD7-14 de [GUIA-PRUEBAS-GRILLAS-GD7.md](GUIA-PRUEBAS-GRILLAS-GD7.md).
- [ ] Revisar manual y claridad con usuarios de distintos niveles; completar capturas integrales con datos ficticios si se requieren para la edición definitiva.

Las aprobaciones pendientes de Seguridad S7, Cobranzas, Dashboard y otros módulos conservan sus estados. La generación de un manual no equivale a aceptación funcional del sistema.

## Continuidad rápida

1. Consultar el resumen 7/7 y esta lista de límites; no repetir la exploración de componentes.
2. Recibir resultados de la guía funcional y corregir sólo los casos observados.
3. Repetir `pnpm grillas:validar` tras cambios pertinentes; `pnpm manual:pdf` al cambiar la edición fuente.
4. Marcar GD7 cerrado sólo cuando se completen las validaciones y aprobaciones pendientes.
