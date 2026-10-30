# MTX Metal ERP — Contexto del producto

Actualizado: **29-10-2026**. Contexto para agentes y skills de diseño; complementa AGENTS.md y no sustituye el código ni las reglas del dominio.

## Propósito y usuarios

ERP web de una empresa de fabricación de estructuras metálicas por encargo y obra propia. Personas de Ventas, Compras/Bodega, Producción/Despacho, Cobranza, Administración y Consulta/Gerencia trabajan con distintos permisos combinables. Se usa por Internet, en equipos personales; también hay pruebas locales y por túnel.

El éxito consiste en consultar información y completar operaciones con claridad, rapidez y pocos errores. Hay uso prolongado durante la jornada y distintos niveles de experiencia informática. La interfaz debe permitir identificar acciones sin depender de leer un manual completo.

## Tareas principales

- Mantener clientes, proveedores, materiales, unidades, bodegas y productos.
- Registrar compras y recepciones; consultar stock y Kardex; ajustar o trasladar existencias.
- Cotizar, registrar lo contratado, planificar y ejecutar producción, despachar y corregir entregas.
- Consultar deuda, registrar/anular abonos, adjuntar comprobantes y gestionar promesas de pago.
- Consultar Dashboard, documentos históricos, PDF y autoría; gestionar la cuenta propia y usuarios según permisos.

## Entorno y restricciones

Next.js App Router, React, TypeScript, Tailwind v4 y shadcn/ui. Interfaz en español, formato es-CL, CLP, RUT y fechas chilenas; dinero/cantidades deben conservar su precisión y unidad. Acceso a datos sólo en servidor. Ver AGENTS.md y modelos reales para reglas actualizadas.

Hay una aplicación existente con operaciones y permisos implementados: no es una página de presentación. Los formularios tienen validaciones, versiones e idempotencia que deben conservarse. Las grillas de detalle, búsqueda en selectores y edición sobre listados forman parte del comportamiento acordado.

Claro y Oscuro están implementados; Oscuro es el predeterminado. Preferencia por navegador/origen y opción explícita Según el sistema. TC1–TC3 tienen evidencia técnica; TC4 recibió conformidad general y conserva pendientes complementarios. Ver docs/HITO-TEMAS-CLARO-OSCURO.md. Las validaciones pendientes de otros módulos no se aprueban al rediseñar.

## Encargo vigente del usuario

Aspecto sobrio, profesional, legible y consistente con un ERP industrial; identidad propia sin clichés de interfaces generadas por IA. Buena densidad informativa, texto claro y de tamaño adecuado para trabajar durante horas. Evitar espaciados excesivos, sombras/bordes decorativos y degradados excesivos.

La dirección visual, criterios de aceptación y diferencia entre estado actual y objetivo están en DESIGN.md. Toda delegación de diseño debe recibir ambos documentos y el alcance concreto; no transmitir secretos ni datos personales reales como ejemplos.

## Piloto visual autorizado

La base global VG1 aplica IBM Plex Sans local 400/600, superficies planas y paleta mineral a todas las rutas y portales, sin condicionamiento por ruta. Oscuro sigue por defecto y se conserva la preferencia existente. Dashboard/Compras permanecen como referencia; VG2 adapta las páginas de acceso y conserva sus servicios; VG3 adapta catálogos y Configuración con ensayos ficticios; VG4 adapta Inventario sin cambiar transacciones; VG5 adapta Cotizaciones/OCC sin recalcular documentos; VG6 adapta Trabajos/listado, planificación, Producción y Despacho con fixtures; VG7 adapta Cobranzas con fixtures; VG8 adapta cuenta, administración y estados transversales; revisión funcional pendiente y sigue VG9. Ver docs/HITO-DISENO-GLOBAL.md y docs/DISENO-GLOBAL-VG1-VALIDACION.md.
