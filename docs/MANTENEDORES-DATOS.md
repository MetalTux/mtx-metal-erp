# Mantenedores de datos: plan y avances

Referencia: esquema actual de Prisma y [guía de interfaz](GUIA-INTERFAZ.md). Fecha de inicio: 06-10-2026.

## Orden de desarrollo

Se termina y valida un mantenedor antes de avanzar al siguiente. Dentro de cada módulo se comienza por consultar y listar los datos existentes; después se incorporan las operaciones del formulario y la eliminación.

1. **Unidades de medida (`UnitMeasure`)** — nombre único y abreviatura. Es el catálogo más pequeño y la dependencia de Materias primas. Ruta: `/mantenedores/unidades`.
2. **Bodegas (`Warehouse`)** — nombre y ubicación opcional. Sus relaciones con stock, movimientos, compras y consumos requieren controlar la eliminación. Ruta: `/mantenedores/bodegas`.
3. **Proveedores (`Supplier`)** — RUT único, nombre y datos opcionales de contacto. Requiere validación de RUT/correo y conservar los proveedores usados en compras. Ruta: `/mantenedores/proveedores`.
4. **Clientes (`Client`)** — RUT único, nombre y datos opcionales de contacto. Comparte complejidad con Proveedores; aprovecha sus validaciones y controla las referencias de cotizaciones. Ruta: `/mantenedores/clientes`.
5. **Materias primas (`RawMaterial`)** — código único, nombre, descripción opcional y unidad obligatoria. Depende del catálogo de unidades y tiene relaciones con inventario y documentos. Ruta: `/mantenedores/materiales`.

El stock mínimo pertenece al material **por bodega** (`WarehouseStock.minStock`); su configuración corresponde a Inventario y no se añadirá como un campo de `RawMaterial`.

## Patrón común de interfaz

- [x] Registrar el orden de desarrollo y los requisitos del usuario.
- [x] Tabla reutilizable con filtro superior, orden y paginación.
- [x] Botón **Crear** en la cabecera y acciones **Ver**, **Editar** y **Eliminar** por registro.
- [x] Formulario dentro de un diálogo o panel sobre el listado, conservando la ruta, filtro y página al abrir/cerrar.
- [x] Títulos específicos: «Crear …», «Ver …» y «Editar …»; modo Ver con controles de solo lectura.
- [x] Componente reutilizable de confirmación con **Cancelar** y **Eliminar**, nombre del registro y foco accesible.
- [x] Componente reutilizable para mensajes de éxito, error y aviso del sistema.
- [x] Evitar `window.alert`, `window.confirm` y `window.prompt` en todas las pantallas.
- [x] Validaciones compartidas entre formulario y servidor, campos obligatorios y errores junto al control.
- [x] Estados de carga, tabla vacía, filtro sin resultados y error de consulta.
- [x] Desactivar acciones durante el guardado/eliminación y actualizar el listado tras una operación exitosa.
- [x] Rechazar eliminaciones de registros relacionados con un mensaje comprensible; no borrar sus dependencias en cascada.
- [x] Validar escritorio, móvil y teclado, respetando la paleta y estructura existente.

## Checklist por mantenedor

| Mantenedor | Listado y filtro | Ver | Crear | Editar | Eliminar y confirmar | Validación final |
| --- | --- | --- | --- | --- | --- | --- |
| Unidades de medida | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bodegas | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Proveedores | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Clientes | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Materias primas | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

### 1. Unidades de medida

- [x] Consulta real, listado y filtro por nombre/abreviatura.
- [x] Ver registro en formulario de solo lectura.
- [x] Crear con validación de nombre único y abreviatura obligatoria.
- [x] Editar con validación y actualización del listado.
- [x] Eliminar con confirmación y bloqueo cuando haya materiales asociados.
- [x] Validar funcionamiento, errores, cancelación y componentes reutilizables.

### 2. Bodegas

- [ ] Consulta real, listado y filtro por nombre/ubicación.
- [ ] Ver registro.
- [ ] Crear registro.
- [ ] Editar registro.
- [ ] Eliminar con confirmación y control de relaciones existentes.
- [ ] Validar CRUD completo.

### 3. Proveedores

- [ ] Consulta real, listado y filtro por nombre/RUT.
- [ ] Ver registro.
- [ ] Crear con normalización y validación de RUT y correo opcional.
- [ ] Editar conservando unicidad de RUT.
- [ ] Eliminar con confirmación y bloqueo si tiene compras.
- [ ] Validar CRUD completo.

### 4. Clientes

- [ ] Consulta real, listado y filtro por nombre/RUT.
- [ ] Ver registro.
- [ ] Crear con normalización y validación de RUT y correo opcional.
- [ ] Editar conservando unicidad de RUT.
- [ ] Eliminar con confirmación y bloqueo si tiene cotizaciones.
- [ ] Validar CRUD completo.

### 5. Materias primas

- [ ] Consulta real, listado y filtro por código/nombre/unidad.
- [ ] Ver registro y unidad.
- [ ] Crear con código único y selección de unidad existente.
- [ ] Editar controlando el cambio de unidad si ya existen operaciones; definir la regla antes de habilitarlo.
- [ ] Eliminar con confirmación y bloqueo si tiene existencias o referencias en movimientos/documentos.
- [ ] Validar CRUD completo.

## Datos maestros fuera de esta primera serie

- **Empresa (`CompanyProfile`)**: perfil único en `/configuracion/empresa`; requiere un formulario de configuración, no un CRUD de varias empresas. Su edición se aborda por separado.
- **Roles (`Role`) y Usuarios (`User`)**: mantenedores administrativos previstos para la fase de autenticación. Usuarios depende de Roles, contraseñas seguras y autorización. No se incluyen todavía en el menú ni en esta primera serie.

Compras, cotizaciones, órdenes, despachos, cuentas por cobrar, pagos, stock y kardex son procesos o registros del dominio, no mantenedores básicos de esta etapa.

## Primera entrega: Unidades de medida

El usuario confirmó el CRUD completo. Implementado y validado en `/mantenedores/unidades`, con los seis registros existentes como base de revisión en una copia temporal de PostgreSQL.

- El formulario limpia espacios y exige nombre de hasta 100 caracteres y abreviatura de hasta 20. La unicidad del nombre mantiene la regla exacta de PostgreSQL (sensible a mayúsculas); no se cambió el esquema.
- Ver y Editar consultan el registro actualizado antes de abrir. Ver es de solo lectura. Las fechas se muestran en `es-CL`, zona `America/Santiago`.
- Guardar y Eliminar comprueban `updatedAt` para detectar un registro cambiado desde su consulta. La FK impide eliminar unidades con materiales, también ante asociaciones concurrentes.
- La tabla conserva filtro, orden y página al abrir/cerrar formularios y actualizar datos; al borrar la última fila de una página muestra la página válida más cercana.
- Filtro y paginación son locales para este catálogo pequeño; el servidor obtiene los registros y el conteo de materiales asociados, sin cargar los materiales completos. Revisar paginación en servidor al abordar catálogos grandes.
- `DataTable`, `ConfirmarEliminacion`, `Aviso` y `Notificaciones` son reutilizables. Los avisos de éxito/error usan Sonner; las confirmaciones usan Radix AlertDialog. No se usan diálogos nativos.
- Pasaron `pnpm lint`, `pnpm build`, pruebas de integración contra PostgreSQL temporal y el ciclo completo en Chromium (escritorio y móvil). Se comprobaron duplicados, campos obligatorios, cancelación, edición concurrente, eliminación protegida, búsqueda sin coincidencias y tabla vacía.
- Prueba de integración versionada: `tests/unidades-medida.integration.ts`. Requiere `DATABASE_URL` de una copia temporal cuyo nombre empiece por `mtx_validacion_`; ejecutar con `pnpm exec tsx tests/unidades-medida.integration.ts`. No carga `.env` automáticamente ni admite la base habitual.
- El servidor de validación utiliza 3031 y se detiene al terminar. El servidor previo del usuario en 3030 se conserva.

El próximo mantenedor es **Bodegas**. Autenticación y autorización siguen pendientes de su fase; este módulo todavía no incorpora protección por usuario/rol.

## Reglas de cierre

Respaldar archivos existentes antes de modificarlos. Registrar las entregas en [CAMBIOS.md](CAMBIOS.md) y actualizar este checklist. Detener los servidores iniciados para validar y comprobar que liberen su puerto; preservar los servidores previos del usuario.
