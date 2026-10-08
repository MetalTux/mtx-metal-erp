# Hito: Configuración de Empresa

Fecha de planificación: 06-10-2026. Estado: **implementado y validado localmente; comprobación del túnel y revisión funcional del usuario pendientes**.

Referencias: [Mantenedores](MANTENEDORES-DATOS.md), [propuesta de Empresa](PROPUESTAS-DOMINIO.md#2-datos-de-la-empresa), [avances de interfaz](AVANCES-INTERFAZ.md) y `prisma/schema.prisma`.

## Objetivo y motivo del orden

Permitir consultar y configurar los datos de la empresa que utiliza el ERP en `/configuracion/empresa`. Los cinco mantenedores básicos están completos y el usuario confirmó su funcionamiento. Empresa completa los datos de identificación que los futuros documentos comerciales utilizarán.

El usuario autorizó este desarrollo. Se utiliza la estructura `CompanyProfile` y su migración existentes; la ruta ya consulta y configura datos reales.

## Alcance implementado

Formulario de un único perfil, con consulta, edición, guardado y cancelación. Si no existe, mostrar «Configurar empresa» sin inventar datos ni crear un registro al visitar la página. No necesita tabla de varias empresas ni eliminación de perfiles.

Conservar la ubicación actual **Configuración → Empresa** y la paleta/componentes de la guía. El formulario puede agrupar Identificación, Dirección, Contacto e Identidad visual. Mostrar «Perfil incompleto» como aviso de configuración gradual, sin impedir guardar datos parciales ni afirmar que está habilitada la emisión tributaria.

| Grupo | Campos existentes | Comportamiento propuesto |
| --- | --- | --- |
| Identificación | `legalName`, `tradeName`, `rut`, `businessActivity` | Textos opcionales; validar DV si se ingresa RUT, normalizar al guardar y formatear al mostrar |
| Dirección | `address`, `commune`, `city` | Textos opcionales; comuna y ciudad no son selectores de otro catálogo en el modelo actual |
| Contacto | `email`, `phone` | Correo opcional válido y teléfono opcional con prefijos/separadores |
| Identidad visual | `logoUrl` | Carga local de PNG/JPG/WebP hasta 2 MB, vista previa, reemplazo y retirada; almacenamiento preparado para un adaptador futuro de S3 |
| Registro | `createdAt`, `updatedAt` | Sólo lectura; sirven también para controlar ediciones concurrentes |

**Decisiones explícitas del usuario:** incluir carga de archivos y almacenarlos localmente por ahora; dejar definida la sustitución posterior por AWS S3 o similar. El adaptador S3 queda pendiente. Los requisitos definitivos de emisión, PDFs y conservación de copias históricas se resolverán con Ventas; no bloquean configurar el perfil.

## Estados de avance

`[x]` significa realizado y comprobado; `[ ]` significa pendiente. Una etapa se cierra sólo al cumplir sus criterios, y se avanza en el orden indicado.

| Etapa | Estado actual | Entrega |
| --- | --- | --- |
| 0. Revisión y planificación | Completada | Dependencias y alcance propuesto documentados |
| 1. Reglas y preparación | Completada | Validaciones y opción de logo acordadas; respaldos previos al desarrollo |
| 2. Consulta | Completada | Datos reales y estados sin perfil/carga/error |
| 3. Formulario | Completada | Edición, validaciones y cancelación |
| 4. Persistencia | Completada | Guardado del perfil único y protección concurrente |
| 5. Validación y cierre | Validación local completada; cierre pendiente | Pruebas, revisión del usuario y checks documentados |

### Etapa 0: Revisión y planificación

- [x] Revisar cierre de los cinco mantenedores y confirmación del usuario.
- [x] Revisar campos y relaciones reales de `CompanyProfile`.
- [x] Revisar la decisión de perfil único: `id = 1`, sin autoincremento, garantizado por PK y CHECK SQL.
- [x] Verificar que la ruta actual sigue siendo provisional y distinguir esquema implementado de módulo pendiente.
- [x] Definir etapas y criterios de finalización en este documento.
- [x] Respaldar los documentos existentes modificados en esta planificación.

### Etapa 1: Reglas y preparación

- [x] Revisar el estado del repositorio y respaldar los archivos afectados antes de implementar; respaldar PostgreSQL antes de validar escrituras.
- [x] Definir límites de longitud para cada texto y mensajes de campo, sin convertir campos opcionales del esquema en obligatorios para guardar configuración.
- [x] Reutilizar la validación compartida del RUT: vacío como `null`; si tiene contenido, rechazar DV/formato incorrectos en cliente y servidor.
- [x] Definir normalización de espacios y valores vacíos, validación de correo y tratamiento de teléfono.
- [x] Acordar carga de logo y almacenamiento: archivo local con adaptador reemplazable por S3 en el futuro.
- [x] Registrar que la autenticación/permisos siguen pendientes y que el perfil no sustituye esas funciones.

**Criterio de cierre:** reglas registradas y cualquier duda que afecte a la implementación resuelta antes de continuar con esa parte.

### Etapa 2: Consulta de datos existentes

- [x] Crear servicio de consulta con la instancia compartida de Prisma y fechas serializadas para el cliente.
- [x] Mostrar los datos reales cuando exista el perfil.
- [x] Mostrar estado inicial «Configurar empresa» si no existe, sin inserción automática.
- [x] Incorporar carga y error con reintento mediante componentes reutilizables.
- [x] Mostrar fechas de registro/modificación como datos de consulta.

**Criterio de cierre:** se puede consultar el perfil o reconocer claramente su ausencia sin modificar la base.

### Etapa 3: Formulario e interfaz

- [x] Implementar secciones y controles correspondientes, con títulos acordes al estado inicial o de edición.
- [x] Incorporar validación compartida con errores junto a los controles.
- [x] Implementar Guardar y Cancelar; cancelar recupera los datos persistidos y no escribe.
- [x] Evitar pérdida accidental de cambios pendientes, con confirmación reutilizable cuando corresponda.
- [x] Desactivar acciones durante el guardado y mantener cursor, foco, teclado y diseño móvil.
- [x] Implementar carga/vista previa, reemplazo, retirada y mensajes de imagen inválida o inaccesible.
- [x] Si se incorpora algún selector dependiente, usar el componente con búsqueda interna; los campos actuales no lo requieren.

**Criterio de cierre:** el formulario permite introducir y cancelar datos parciales, rechaza RUT/correo incorrectos y mantiene la estructura visual del ERP.

### Etapa 4: Guardado y protección de datos

- [x] Crear Server Action que valide de nuevo todos los datos y delegue en el servicio.
- [x] Crear el perfil con `id = 1` sólo ante un guardado explícito; conservar PK y CHECK de la base.
- [x] Actualizar el perfil existente comprobando `updatedAt`, sin sobrescribir una edición posterior.
- [x] Manejar dos primeras creaciones concurrentes: conservar el perfil creado y solicitar recarga; evitar un `upsert` que sobrescriba silenciosamente los datos del otro formulario.
- [x] Revalidar la ruta y mostrar resultado con los componentes reutilizables de avisos/notificaciones.
- [x] Conservar datos y errores del formulario si falla el guardado.
- [x] No modificar registros históricos, esquema, migraciones ni seed para implementar el formulario, salvo una necesidad concreta revisada previamente.

**Criterio de cierre:** crear y editar funcionan sobre el único perfil y los conflictos no producen pérdida de datos.

### Etapa 5: Validación y cierre

- [x] Pasar `pnpm lint` y `pnpm build`.
- [x] Probar en PostgreSQL temporal: ausencia inicial, creación, consulta, edición, campos vacíos/parciales y perfil único.
- [x] Probar RUT con DV numérico, `K` y `0`, formato equivalente y rechazo de errores también al invocar el servidor directamente.
- [x] Probar correo inválido, límites, cancelación, conflicto de edición y dos primeras creaciones concurrentes.
- [x] Probar escritorio/móvil, teclado, foco, avisos reutilizables y errores de conexión; comprobar que no hay diálogos nativos ni errores de JavaScript.
- [x] Comprobar logo y su fallo de carga si se incluyó.
- [ ] Revisar funcionamiento desde el túnel de desarrollo cuando esté disponible.
- [x] Comparar los datos originales antes/después, conservar evidencias y retirar la copia temporal de pruebas.
- [x] Detener los servidores iniciados para validar y comprobar sus puertos; preservar procesos anteriores del usuario.
- [x] Registrar implementación y verificaciones en CAMBIOS y AVANCES-INTERFAZ.
- [ ] Obtener revisión funcional del usuario antes de continuar al siguiente hito.

**Criterio de cierre:** perfil usable, datos preservados, comprobaciones documentadas y revisión funcional completada.

## Secuencia propuesta después de Empresa

El usuario autorizó continuar: [consultas de Stock/Kardex implementadas y Compras por etapas](HITO-COMPRAS.md). Las decisiones de compra permanecen pendientes de respuestas explícitas; esta continuación no marca los pendientes de Empresa como completados.

Se mantiene como propuesta el orden de procesos de la guía; cada hito tendrá su propio detalle antes de desarrollarlo.

- [ ] **Compras:** listado y documentos con líneas, selectores buscables de proveedor/material/bodega, importes decimales y entrada de stock/kardex en una transacción. Antes de implementar, definir impuestos, edición/anulación e idempotencia.
- [ ] **Inventario:** consulta de stock, kardex, configuración de mínimos y ajustes trazables; saldos coherentes con movimientos.
- [ ] **Ventas:** cotizaciones y órdenes de venta; datos de Empresa, importes y documentos históricos.
- [ ] **Trabajos:** órdenes, consumos y guías de despacho.
- [ ] **Cobranza:** cuentas, abonos, anulaciones y vencimientos.

Dashboard, autenticación/roles y el adaptador S3 siguen en sus fases pendientes. Esta planificación no inicia ninguno de esos módulos.

## Implementación y reglas verificadas

- Campos opcionales, textos recortados y vacíos como `null`. Límites: razón social/nombre comercial 150, giro 200, dirección 250, comuna/ciudad 100, RUT 20, correo 254 y teléfono 40 caracteres. El teléfono admite prefijos y separadores; el correo y el DV del RUT se comprueban en cliente y servidor.
- Consulta sin inserción, formulario sobre la misma página, aviso de perfil incompleto si falta razón social o RUT, fechas sólo de lectura y confirmación reutilizable al descartar cambios. Se conservan valores y errores si falla el guardado.
- Primera creación explícita con `id = 1`; una creación concurrente no sobrescribe el perfil. La edición compara `updatedAt` y avanza su valor al menos un milisegundo para conservar una referencia distinta incluso entre escrituras muy próximas.
- Logos decodificados con Sharp, máximo 16 megapíxeles; sólo PNG/JPEG/WebP de hasta 2 MB. Se reprocesan a PNG de hasta 512 × 512, sin ampliar ni conservar metadatos. No se aceptan SVG ni archivos disfrazados. El límite de Server Actions es 3 MB para incluir el archivo y el formulario.
- Autenticación/permisos, requisitos de emisión y documentos históricos siguen pendientes de sus módulos. Este perfil no habilita por sí solo emisión tributaria ni modifica documentos existentes.

## Almacenamiento del logo y futura migración

- Ruta predeterminada: `var/empresa/logos/`, excluida de git. `EMPRESA_LOGO_DIR` permite usar una carpeta persistente diferente, con permisos de lectura/escritura para el proceso de Next.js. No guardar en una carpeta efímera al desplegar.
- Prisma conserva una URL lógica `/api/empresa/logo/<uuid>.png`; el endpoint sirve el archivo como PNG, con `nosniff` y caché inmutable. El UUID cambia en cada reemplazo; el nombre original nunca se usa como ruta.
- `src/lib/almacenamiento/logo-empresa.ts` define `AlmacenLogo` con `guardar`, `leer` y `eliminar`. `almacenLogo()` selecciona actualmente el adaptador local. Para S3 se implementará ese contrato y se cambiará la selección en esa fábrica; formularios, servicios y URLs no necesitarán conocer el proveedor.
- **Migrar a S3 requiere trasladar los archivos existentes manteniendo sus claves**, o incorporar una lectura de transición. No basta con cambiar una variable; todavía no se ofrece un adaptador S3 ni se requieren credenciales AWS.
- Reemplazar o quitar un logo conserva las versiones anteriores. Si falla la persistencia, se elimina únicamente el archivo nuevo sin asociar. La retención/purga de versiones deberá definirse antes de automatizarla.
- **Respaldar PostgreSQL y la carpeta de logos juntos.** Restaurar sólo la base puede dejar referencias sin imagen. Para este desarrollo no había perfil ni logos previos; las pruebas usaron exclusivamente una carpeta en `/tmp` y una copia de la base.

## Evidencias y cierre local

Respaldos y resultados: `backups/20261006_191941_modulo_empresa/` (local, excluido de git), con originales, SHA-256, dump PostgreSQL, comparación de datos, integración, scripts y capturas de escritorio/móvil.

Pasaron ESLint, TypeScript, build, integración PostgreSQL y Chromium local. Se probaron perfil vacío/parcial/completo, dos primeras creaciones concurrentes, edición desactualizada, RUT numérico/K/0, correo/límites, carga/reemplazo/retirada del logo, formatos/tamaño inválidos, limpieza tras conflicto, imagen inaccesible, cancelación, teclado/foco/cursor, móvil y recuperación de conexión. No hubo diálogos nativos ni errores de JavaScript en las pruebas locales.

La copia temporal se retiró; 3031 quedó libre y se conservó el servidor previo del usuario en 3030. Los conteos y huellas originales de `CompanyProfile`, `Client`, `Supplier`, `Quote` y `SalesOrder` coinciden antes/después. Prisma, migraciones, seed y GUIA-INTERFAZ permanecen sin cambios.

La revisión automática de permisos rechazó la comprobación del túnel público por posible exposición de datos privados y falta de autorización específica del destino. Se solicitó esa autorización al usuario; el check queda pendiente hasta su respuesta y ejecución efectiva.

Referencias técnicas: [opciones de Sharp](https://sharp.pixelplumbing.com/api-constructor/) y [límite de Server Actions de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).
