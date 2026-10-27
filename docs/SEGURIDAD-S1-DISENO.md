# S1 — Contrato técnico de Inicio de Sesión y Seguridad

Fecha: 20-10-2026. Fuente funcional: [hito de seguridad](HITO-INICIO-SESION-SEGURIDAD.md), D01–D10/D08-R aprobadas. S1 prepara estructura y contrato; **no habilita login ni autorización efectiva**. S2–S5 deben implementar los servicios y conectarlos a la aplicación.

## 1. Arquitectura elegida

Servidor Node.js del App Router; interfaz de acceso en `(auth)`, panel propio y Administración dentro del ERP. Identidad interna en `User`; seguridad en modelos separados `UserSecurity` y `Security*`. PostgreSQL existente almacena sesiones revocables, roles y consumos de tokens. No se contrata una plataforma de identidad.

Se eligen bibliotecas por función, en lugar de delegar permisos/sesiones del ERP a una integración con tablas y políticas propias. Las sesiones y permisos son lógica de aplicación explícita; OIDC, TOTP, hashing y cifrado utilizan implementaciones mantenidas, sin diseñar protocolos criptográficos propios.

| Dependencia instalada | Versión S1 | Responsabilidad | Fuente oficial |
| --- | --- | --- | --- |
| `openid-client` | 6.8.8 | Flujo OIDC de Google, código de autorización, PKCE y validaciones del protocolo. | [Repositorio](https://github.com/panva/openid-client) |
| `jose` | 6.2.13 | Cifrado autenticado JWE para estado transitorio OIDC y secreto TOTP, con claves de servidor. | [Paquete y licencia](https://github.com/panva/jose/blob/main/package.json) |
| `@node-rs/argon2` | 2.2.2 | Hash/verificación Argon2id; parámetros iniciales 19 MiB, 2 iteraciones y paralelismo 1, a medir antes del despliegue. | [Repositorio](https://github.com/napi-rs/node-rs/tree/main/packages/argon2) |
| `otplib` | 13.5.0 | Generación/verificación de TOTP y URI de configuración. Replay y consumo concurrente los controla el servicio con PostgreSQL. | [Documentación](https://otplib.yeojz.dev/) |

Las cuatro declaran MIT, sin tarifa de licencia; versiones resueltas en `pnpm-lock.yaml`. Se verificaron imports y operaciones reales sobre Node 24.21.0 del entorno, incluidos PKCE, hash correcto/incorrecto, TOTP y JWE con clave correcta/incorrecta. Esto no acredita todavía el callback real de Google ni el despliegue en otra plataforma. `@node-rs/argon2` usa binario nativo: verificar arquitectura/imagen del destino en S6. Su `const enum` externo no se puede importar como valor con `isolatedModules`; usar el valor documentado de Argon2id (2) y verificar el prefijo del resultado.

No se requieren servicios comerciales de autenticación. La configuración concreta sin gasto de Google sigue siendo una condición a comprobar en S3; tampoco se da por disponible SMTP. Las claves reales, proyecto OAuth y correo no se crean en S1.

## 2. Estructura persistida

Migración: `20261020201416_estructura_seguridad_s1`, aditiva, dentro de una transacción PostgreSQL. No modifica filas de `User`, `Role` ni tablas de negocio. Agrega 11 tablas:

| Modelo | Contrato |
| --- | --- |
| `UserSecurity` | Extensión 1:1 de `User`, correo normalizado único, estado, hash local opcional, métodos permitidos y versión de seguridad. Por defecto pendiente de activación. |
| `UserSecurityRole` | Clave compuesta usuario/rol; códigos de seis roles fijos. Concede la unión, sin denegaciones particulares. |
| `SecurityIdentity` | Google + `subject` únicos globalmente y una identidad Google por usuario. No usa el correo como identidad estable ni almacena access/refresh tokens. |
| `SecuritySession` | UUID interno, hash SHA-256 único del token aleatorio, usuario/versión, autenticación/factor/reautenticación/actividad, máximo absoluto y revocación. |
| `SecurityToken` | Activación/recuperación de contraseña, hash único, expiración y consumo. No sustituye un desafío TOTP. |
| `SecurityChallenge` | Desafío previo de ingreso TOTP, reautenticación o vinculación Google, hash/versión/intentos/expiración. No es una sesión ERP completa. |
| `SecuritySecondFactor` | Configuración pendiente o activa; secreto cifrado y versión de clave; último paso TOTP usado para rechazo de replay. |
| `SecurityRecoveryCode` | Código personal guardado como hash, consumo único. Administrador no lo genera/consulta para otro usuario. |
| `SecurityRateLimit` | Contadores compartidos por clave opaca, ventana/bloqueo/expiración. El servicio usa claves derivadas sin guardar correo/token en texto. |
| `SecurityAuditEvent` | Actor/afectado opcionales, acción/resultado, IP/navegador y referencia limitada. No permite UPDATE; DELETE sólo al superar 12 meses. |
| `SecurityOperationAuthor` | Autor duradero de una operación, UUID y recurso; registro inmutable, único por tipo de recurso/clave. No se depura con eventos de seguridad. |

FK con Restrict e índices en todas las referencias, incluidos actor/afectado. CHECK protegen normalización, revisiones/contadores positivos, formato de hashes, métodos válidos, tiempos, máximo de sesión de 8 horas, estado de preparación TOTP y resultados de eventos. El hash local sólo acepta prefijo Argon2id y fecha de cambio conjunta; el servicio aún deberá comprobar parámetros y usar la biblioteca. El esquema no demuestra que un contenido sea un cifrado válido.

La migración falla completa si hay correos heredados vacíos, excesivos o duplicados al normalizar. No elimina puntos ni sufijos de Gmail. Se incorporan usuarios existentes con correo normalizado, sin hash ni identidades, estado pendiente; se copian sólo roles heredados conocidos: Administrador → ADMINISTRADOR, Ventas → VENTAS, Bodeguero → COMPRAS_BODEGA. Roles desconocidos no conceden permisos. Esta copia no habilita acceso: requiere activación explícita.

`User.password` y `User.roleId` quedan heredados por compatibilidad temporal. **Nunca autenticarse desde ellos ni unir sus roles con los nuevos.** S2 debe escribir los campos heredados obligatorios sólo como compatibilidad (contraseña inutilizable y rol de catálogo representativo), sin usarlos como autoridad. Actualizar correo de User y su extensión en la misma transacción; retirar los campos heredados exige otra migración después de revisar consumidores.

El seed ya no crea el administrador de ejemplo ni una contraseña fija. `--documentos` conserva su salida temprana. El seed general no provisiona seguridad; tampoco se ejecutó en S1.

## 3. Permisos e inventario de integración

Catálogo inicial ejecutable: `src/lib/seguridad/permisos.ts`. Prueba: `tests/seguridad-s1.ts`. Niega roles/permisos desconocidos, suma capacidades de varios roles y distingue leer/operar e importes de costo/venta. La comprobación de titularidad del factor no recibe roles: ni Administrador puede sustituir al titular.

[Inventario S1](SEGURIDAD-S1-INVENTARIO.md) lista cada página, las 87 Server Actions, las seis rutas de archivos y sus familias de servicios/consultas, con permisos y restricciones de DTO. Consultas auxiliares de una tarea entregarán sólo catálogos mínimos desde esa tarea; no conceden acceso completo al módulo relacionado. Facturar tiene permiso de Cobranza aunque su action viva en OT. Generar PDF es escritura; descargar una emisión histórica autorizada es lectura.

**Estos helpers no se conectan a rutas en S1.** Un booleano aislado no constituye una barrera. S4 debe obtener identidad del servidor y aplicar esta política a lecturas, escrituras, archivos y campos. No depender del layout ni de variables enviadas desde navegador.

## 4. Ciclo de sesión y concurrencia a implementar

- Token aleatorio de al menos 256 bits en cookie `HttpOnly`, `Secure` en producción, host-only, `SameSite` compatible con callback. Guardar sólo SHA-256; no entregar el UUID de DB como bearer token ni usar localStorage.
- Crear sesión completa sólo tras terminar el método primario y el factor si está activo. El desafío TOTP tiene cookie/contexto propio corto, sin permiso de leer ERP. Una configuración nueva de factor invalida sesiones previas que no prueben ese factor.
- Cada entrada comprueba estado ACTIVO, sesión no revocada, revisión de seguridad coincidente, expiración absoluta y actividad menor a 60 minutos. Roles se leen de la autoridad vigente, no del cliente.
- Actualizar actividad con reloj servidor sólo por interacción/navegación aceptada, no por polling o tareas de fondo. Throttling de escrituras de actividad sin ampliar las 8 horas. No fiarse de la hora enviada por navegador.
- Logout revoca; cambio de contraseña/roles/métodos/baja incrementa versión y revoca sesiones según el caso, excepto la sesión propia que se renueve expresamente tras reautenticar. Cancelar todos los tokens/desafíos pendientes que ya no correspondan. Modificar correo invalida invitaciones/recuperaciones previas.
- Roles y último Administrador: serializar cambios administrativos con un bloqueo común; bloquear usuarios afectados por ID ascendente y comprobar al final que permanece un Administrador activo y utilizable. No contar cuentas pendientes como respaldo.
- Operaciones de negocio: adquirir primero bloqueo compartido del usuario/versión y permisos actuales; después los bloqueos de dominio existentes. Cambios de seguridad requieren bloqueo exclusivo de ese usuario. Mantener comprobación y escritura en la misma tx para resolver carreras con baja/cambio de roles. No introducir transacciones independientes o consultas hermanas paralelas sobre un único cliente pg.
- Reintentos: exigir acceso actual antes de devolver resultados; preservar UUID original, autor y documento. Expiración de sesión no implica que falló un commit y nunca autoriza emitir otra intención automáticamente.

Los locks y consumos se implementarán en servicios S2–S5; no existen por declarar FK/CHECK.

## 5. Google y vinculación

Elegir Authorization Code Flow OIDC con PKCE, `state` y `nonce`, usando `openid-client`. Origen/callback configurados en servidor, retornos sólo internos; no tomar host/redirección libre de la solicitud. Estado de la solicitud en cookie transitoria JWE de duración acotada (máximo propuesto 5 minutos), asociada al navegador, con PKCE/nonce y propósito. Limpiar al resolver/error y verificar correlación. El código de autorización sólo se canjea mediante la biblioteca; no usar token del navegador sin validación.

Usar scopes básicos y verificar emisor/audiencia/firma/expiración/nonce y datos de correo. El callback no crea usuario ni rol. Primer ingreso de invitación y vinculación requieren propiedad verificada; no fusionar por coincidencia de correo. Vincular a cuenta activa exige sesión/reautenticación reciente y desafío de vinculación del mismo usuario/versión. Un login Google completo continúa a TOTP cuando el titular lo habilitó.

No almacenar tokens para Gmail/Drive ni crear una contraseña local como alternativa automática. Estado en cookie no concede acceso al ERP. Probar cancelación, código repetido, estado sustituido, cookies vencidas y cuentas no autorizadas en S3.

## 6. Factor personal y recuperación

Panel propio; obtener actor de sesión y exigir actor==titular en cada operación, sin override administrativo. Verificar reautenticación y factor actual para cambios sensibles. Configuración pendiente con vencimiento (propuesta 5 minutos), secreto cifrado mediante JWE/A256GCM, clave de servidor y keyId; activación sólo al confirmar código válido. La versión de cifrado permite rotar claves sin publicar secretos.

TOTP: 30 segundos/6 dígitos y tolerancia inicial de un paso; la biblioteca verifica y el servicio determina el paso aceptado, consumiéndolo bajo bloqueo con `lastUsedStep`. No avanzar el contador por código incorrecto, admitir replay ni consumir dos veces por solicitudes concurrentes. Limitar desafíos a propuesta de 5 intentos/5 minutos y aplicar límites por cuenta/origen; afinar sin modificar decisiones funcionales.

Códigos de recuperación aleatorios con al menos 128 bits, mostrados una sola vez, guardados como hash; propuesta inicial 10 códigos. Consumir uno tras verificar el método primario; no elimina el factor por sí solo. Reconfigurar requiere confirmar el nuevo autenticador, invalida el anterior y todos los códigos previos y genera un lote nuevo al titular. Contraseña/SMTP/Administrador nunca evitan el factor. Sin móvil ni códigos no hay desbloqueo administrativo; esta limitación aprobada debe explicarse al activar.

Recuperación de contraseña: ambas vías aprobadas. SMTP opcional con configuración de servidor externa al repo; sin SMTP, Administrador crea un token de uso único y entrega por canal privado tras verificar identidad. Propuesta de expiración 30 minutos. No enviar contraseña permanente ni registrar tokens; al consumir, nuevo hash y revocación, manteniendo TOTP.

Primer administrador: comando CLI restringido al operador del servidor y verificable en local, sin ruta pública; usar bloqueo de provisión/último administrador. Solicitar identidad/datos al operador, no inferir que el usuario del seed es el dueño ni activar automáticamente la cuenta encontrada. No habilitar secreto fijo o formulario público de bootstrap. La herramienta se desarrolla en S2.

## 7. Auditoría, secretos y operación

Eventos de seguridad inmutables, IP/navegador y resultado de longitud acotada; cabeceras de IP sólo desde proxy configurado. No aceptar actor del formulario ni guardar payloads. Depuración a 12 meses por tarea autorizada; autoría de negocio inmutable en tx del documento, no se depura con eventos. Las referencias de autoría son de operaciones/recurso creadas en el servidor, no una FK polimórfica garantizada por PostgreSQL: cada servicio de dominio debe comprobar su origen y unicidad.

Respaldar PostgreSQL y claves de cifrado de forma protegida y separada. Cambiar una clave exige conservar las anteriores mientras existan secretos cifrados con su keyId. Restauración de backup debe revocar sesiones y tokens transitorios y tratar códigos de recuperación que pudieran reaparecer como no consumidos; no reabrir acceso basándose en tokens antiguos. Diseñar procedimiento verificable en S6, sin desactivar TOTP ajeno.

Variables a configurar en S2/S3 (nombres definitivos con su validador): origen HTTPS de confianza, claves de cifrado con identificador activo, client ID/secret Google y SMTP. No se crean valores ficticios en `.env` ni se imprimen secretos. Auditar logs SQL antes de registrar datos de seguridad para evitar filtraciones de tokens/hashes/secretos.

## 8. Migración, comprobaciones y recuperación de S1

1. Auditada base local PostgreSQL 15.19, 36 migraciones previas, un usuario y tres roles. Sin habilitar credenciales heredadas.
2. Respaldo anterior en `backups/20261020_seguridad_s1/base.dump`, junto a esquema/package/lock anteriores (ignorados por git).
3. Copia `mtx_validacion_seguridad_s1_20261020`, generación con `migrate dev --create-only`, revisión SQL, ensayo por `migrate deploy` y 23 rechazos esperados en `tests/seguridad-estructura.integration.ts`.
4. Huellas/conteos de las 69 tablas previas iguales entre copia limpia y base original. Las fixtures del ensayo se ejecutan dentro de rollback; las secuencias técnicas no forman parte de esas huellas.
5. Aplicada la migración a `mtx_metal_erp`: 37 migraciones; 69 tablas previas conservadas exactamente. Un usuario de seguridad pendiente, cero credenciales activadas. Cliente generado y checks indicados en el checkpoint del hito.

La migración es atómica: si falla, no forzar sus precondiciones ni resetear la base. Conciliar la incidencia y el registro de migraciones. Después de una aplicación correcta no bajar el esquema borrando tablas: S1 es aditivo y la versión anterior de aplicación continúa usando tablas previas. Para corregir, migración siguiente; restaurar el dump sólo por procedimiento autorizado, con aplicación detenida y sin descartar hechos posteriores. No ejecutar restauración automática sobre la base de trabajo.

Pruebas reproducibles: `node --import tsx tests/seguridad-s1.ts` sin escrituras y `node --import tsx tests/seguridad-estructura.integration.ts` con `DATABASE_URL` de una copia `mtx_validacion_seguridad_s1_YYYYMMDD`. La guarda rechaza otro destino. Nunca ejecutar esta última sobre datos reales. Errores SQL inducidos son resultados esperados del ensayo.
