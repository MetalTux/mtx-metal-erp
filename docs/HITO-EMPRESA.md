# Próximo hito: Configuración de Empresa

Fecha de planificación: 06-10-2026. Estado: **plan preparado; desarrollo pendiente**.

Referencias: [Mantenedores](MANTENEDORES-DATOS.md), [propuesta de Empresa](PROPUESTAS-DOMINIO.md#2-datos-de-la-empresa), [avances de interfaz](AVANCES-INTERFAZ.md) y `prisma/schema.prisma`.

## Objetivo y motivo del orden

Permitir consultar y configurar los datos de la empresa que utiliza el ERP en `/configuracion/empresa`. Los cinco mantenedores básicos están completos y el usuario confirmó su funcionamiento. Empresa completa los datos de identificación que los futuros documentos comerciales utilizarán.

Este es el siguiente hito recomendado. Planificarlo no inicia su desarrollo. La estructura `CompanyProfile` y su migración ya existen; la ruta aún muestra una página provisional.

## Alcance propuesto

Formulario de un único perfil, con consulta, edición, guardado y cancelación. Si no existe, mostrar «Configurar empresa» sin inventar datos ni crear un registro al visitar la página. No necesita tabla de varias empresas ni eliminación de perfiles.

Conservar la ubicación actual **Configuración → Empresa** y la paleta/componentes de la guía. El formulario puede agrupar Identificación, Dirección, Contacto e Identidad visual. Mostrar «Perfil incompleto» como aviso de configuración gradual, sin impedir guardar datos parciales ni afirmar que está habilitada la emisión tributaria.

| Grupo | Campos existentes | Comportamiento propuesto |
| --- | --- | --- |
| Identificación | `legalName`, `tradeName`, `rut`, `businessActivity` | Textos opcionales; validar DV si se ingresa RUT, normalizar al guardar y formatear al mostrar |
| Dirección | `address`, `commune`, `city` | Textos opcionales; comuna y ciudad no son selectores de otro catálogo en el modelo actual |
| Contacto | `email`, `phone` | Correo opcional válido y teléfono opcional con prefijos/separadores |
| Identidad visual | `logoUrl` | Propuesta inicial: URL HTTPS opcional y vista previa con estado de error; acordar esta opción antes de implementarla |
| Registro | `createdAt`, `updatedAt` | Sólo lectura; sirven también para controlar ediciones concurrentes |

La carga de archivos/S3 queda para una entrega posterior. Si se prefiere carga de logo en este hito, redefinir su alcance antes de desarrollar esa parte. Los requisitos definitivos de emisión, PDFs y conservación de copias históricas se resolverán con Ventas; no bloquean configurar el perfil.

## Estados de avance

`[x]` significa realizado y comprobado; `[ ]` significa pendiente. Una etapa se cierra sólo al cumplir sus criterios, y se avanza en el orden indicado.

| Etapa | Estado actual | Entrega |
| --- | --- | --- |
| 0. Revisión y planificación | Completada | Dependencias y alcance propuesto documentados |
| 1. Reglas y preparación | Pendiente | Validaciones y opción de logo acordadas; respaldos previos al desarrollo |
| 2. Consulta | Pendiente | Datos reales y estados sin perfil/carga/error |
| 3. Formulario | Pendiente | Edición, validaciones y cancelación |
| 4. Persistencia | Pendiente | Guardado del perfil único y protección concurrente |
| 5. Validación y cierre | Pendiente | Pruebas, revisión del usuario y checks documentados |

### Etapa 0: Revisión y planificación

- [x] Revisar cierre de los cinco mantenedores y confirmación del usuario.
- [x] Revisar campos y relaciones reales de `CompanyProfile`.
- [x] Revisar la decisión de perfil único: `id = 1`, sin autoincremento, garantizado por PK y CHECK SQL.
- [x] Verificar que la ruta actual sigue siendo provisional y distinguir esquema implementado de módulo pendiente.
- [x] Definir etapas y criterios de finalización en este documento.
- [x] Respaldar los documentos existentes modificados en esta planificación.

### Etapa 1: Reglas y preparación

- [ ] Revisar el estado del repositorio y respaldar los archivos afectados antes de implementar; respaldar PostgreSQL antes de validar escrituras.
- [ ] Definir límites de longitud para cada texto y mensajes de campo, sin convertir campos opcionales del esquema en obligatorios para guardar configuración.
- [ ] Reutilizar la validación compartida del RUT: vacío como `null`; si tiene contenido, rechazar DV/formato incorrectos en cliente y servidor.
- [ ] Definir normalización de espacios y valores vacíos, validación de correo y tratamiento de teléfono.
- [ ] Acordar si se incluye URL del logo en esta entrega o se deja pendiente junto con su almacenamiento.
- [ ] Registrar que la autenticación/permisos siguen pendientes y que el perfil no sustituye esas funciones.

**Criterio de cierre:** reglas registradas y cualquier duda que afecte a la implementación resuelta antes de continuar con esa parte.

### Etapa 2: Consulta de datos existentes

- [ ] Crear servicio de consulta con la instancia compartida de Prisma y fechas serializadas para el cliente.
- [ ] Mostrar los datos reales cuando exista el perfil.
- [ ] Mostrar estado inicial «Configurar empresa» si no existe, sin inserción automática.
- [ ] Incorporar carga y error con reintento mediante componentes reutilizables.
- [ ] Mostrar fechas de registro/modificación como datos de consulta.

**Criterio de cierre:** se puede consultar el perfil o reconocer claramente su ausencia sin modificar la base.

### Etapa 3: Formulario e interfaz

- [ ] Implementar secciones y controles correspondientes, con títulos acordes al estado inicial o de edición.
- [ ] Incorporar validación compartida con errores junto a los controles.
- [ ] Implementar Guardar y Cancelar; cancelar recupera los datos persistidos y no escribe.
- [ ] Evitar pérdida accidental de cambios pendientes, con confirmación reutilizable cuando corresponda.
- [ ] Desactivar acciones durante el guardado y mantener cursor, foco, teclado y diseño móvil.
- [ ] Implementar vista previa del logo y estado de URL/imagen inválida sólo si se acordó incluirlo.
- [ ] Si se incorpora algún selector dependiente, usar el componente con búsqueda interna; los campos actuales no lo requieren.

**Criterio de cierre:** el formulario permite introducir y cancelar datos parciales, rechaza RUT/correo incorrectos y mantiene la estructura visual del ERP.

### Etapa 4: Guardado y protección de datos

- [ ] Crear Server Action que valide de nuevo todos los datos y delegue en el servicio.
- [ ] Crear el perfil con `id = 1` sólo ante un guardado explícito; conservar PK y CHECK de la base.
- [ ] Actualizar el perfil existente comprobando `updatedAt`, sin sobrescribir una edición posterior.
- [ ] Manejar dos primeras creaciones concurrentes: conservar el perfil creado y solicitar recarga; evitar un `upsert` que sobrescriba silenciosamente los datos del otro formulario.
- [ ] Revalidar la ruta y mostrar resultado con los componentes reutilizables de avisos/notificaciones.
- [ ] Conservar datos y errores del formulario si falla el guardado.
- [ ] No modificar registros históricos, esquema, migraciones ni seed para implementar el formulario, salvo una necesidad concreta revisada previamente.

**Criterio de cierre:** crear y editar funcionan sobre el único perfil y los conflictos no producen pérdida de datos.

### Etapa 5: Validación y cierre

- [ ] Pasar `pnpm lint` y `pnpm build`.
- [ ] Probar en PostgreSQL temporal: ausencia inicial, creación, consulta, edición, campos vacíos/parciales y perfil único.
- [ ] Probar RUT con DV numérico, `K` y `0`, formato equivalente y rechazo de errores también al invocar el servidor directamente.
- [ ] Probar correo inválido, límites, cancelación, conflicto de edición y dos primeras creaciones concurrentes.
- [ ] Probar escritorio/móvil, teclado, foco, avisos reutilizables y errores de conexión; comprobar que no hay diálogos nativos ni errores de JavaScript.
- [ ] Comprobar logo y su fallo de carga si se incluyó.
- [ ] Revisar funcionamiento desde el túnel de desarrollo cuando esté disponible.
- [ ] Comparar los datos originales antes/después, conservar evidencias y retirar la copia temporal de pruebas.
- [ ] Detener los servidores iniciados para validar y comprobar sus puertos; preservar procesos anteriores del usuario.
- [ ] Registrar implementación y verificaciones en CAMBIOS y AVANCES-INTERFAZ.
- [ ] Obtener revisión funcional del usuario antes de continuar al siguiente hito.

**Criterio de cierre:** perfil usable, datos preservados, comprobaciones documentadas y revisión funcional completada.

## Secuencia propuesta después de Empresa

Se mantiene como propuesta el orden de procesos de la guía; cada hito tendrá su propio detalle antes de desarrollarlo.

- [ ] **Compras:** listado y documentos con líneas, selectores buscables de proveedor/material/bodega, importes decimales y entrada de stock/kardex en una transacción. Antes de implementar, definir impuestos, edición/anulación e idempotencia.
- [ ] **Inventario:** consulta de stock, kardex, configuración de mínimos y ajustes trazables; saldos coherentes con movimientos.
- [ ] **Ventas:** cotizaciones y órdenes de venta; datos de Empresa, importes y documentos históricos.
- [ ] **Trabajos:** órdenes, consumos y guías de despacho.
- [ ] **Cobranza:** cuentas, abonos, anulaciones y vencimientos.

Dashboard, autenticación/roles y carga de archivos siguen en sus fases pendientes. Esta planificación no inicia ninguno de esos módulos.
