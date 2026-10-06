# Avances de la interfaz

Referencia visual: [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), conservada sin cambios. Última revisión: 06-10-2026.

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
- [ ] Utilidades de formato chileno y contratos de serialización para los módulos.
- [ ] Consultas e indicadores reales del Dashboard, gráfico y estados de carga/error.
- [x] CRUD completo de Unidades de medida, validado contra una copia temporal de PostgreSQL.
- [ ] Bodegas → Proveedores → Clientes → Materias primas; seguimiento en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).
- [ ] Configuración de los datos propios de Empresa.
- [ ] Procesos de compras, inventario, ventas, trabajos, despachos y cobranza.
- [ ] Alertas de stock mínimo y vencimientos.
- [ ] Inicio de sesión, protección de rutas, roles y Administración.

Los indicadores muestran «—» y los paneles explican su contenido futuro. El buscador abre secciones; todavía no busca registros. Notificaciones y usuario indican que las alertas y el inicio de sesión están pendientes. Unidades de medida ya consulta y modifica la base de datos; las demás rutas de mantenedores continúan como páginas provisionales.

## Referencias de implementación

- [Instalación oficial de shadcn/ui para Next.js](https://ui.shadcn.com/docs/installation/next).
- [Sidebar oficial](https://ui.shadcn.com/docs/components/radix/sidebar).
- El hook móvil usa `useSyncExternalStore` para suscribirse al breakpoint de 768 px sin actualizar estado sincrónicamente dentro de un efecto.
- La cookie del sidebar se lee en el servidor, por lo que las rutas del layout se renderizan dinámicamente.
- Respaldos locales: `backups/20261006_142412_layout/`, excluidos de git. No se modificaron Prisma, migraciones, seed ni datos PostgreSQL.
