# Operación de acceso, usuarios, permisos y auditoría — S2–S6

Fecha de actualización: 23-10-2026. Acceso, permisos y auditoría implementados; S6 completado en el alcance local aprobado, con despliegue preparado y verificación del servidor definitivo diferida. Google S3 continúa pospuesto. S7 requiere la revisión y aprobación funcional del usuario.

Para realizar esa revisión, seguir la [Guía de pruebas funcionales S7](GUIA-PRUEBAS-SEGURIDAD-S7.md): pasos, resultados esperados, estados e incidencias, sin marcar aprobaciones por anticipado.

## Preparar la instalación

Configurar variables en un archivo privado del servidor o gestor de secretos, fuera de git. S2 no modifica `.env`, no inventa una identidad administrativa y no provisiona usuarios reales automáticamente.

| Variable | Uso |
| --- | --- |
| `SEGURIDAD_ORIGEN` | Origen canónico, por ejemplo `https://erp.su-dominio.cl`, sin ruta, usuario o parámetros. HTTP sólo se admite en localhost/127.0.0.1 para comprobaciones. |
| `SEGURIDAD_CLAVES` | Objeto JSON con identificador → clave Base64 de exactamente 32 bytes aleatorios. No usar ejemplos literales como clave. |
| `SEGURIDAD_CLAVE_ACTIVA` | Identificador presente en ese objeto; nuevas configuraciones se cifran con esa clave. Conservar claves anteriores mientras haya factores cifrados con ellas. |
| `SEGURIDAD_CONFIAR_PROXY` | Sólo `1` si un proxy de confianza elimina/sobrescribe las cabeceras recibidas del cliente y es la única entrada. En otro caso no confiar en X-Forwarded-For; IP se registra vacía y los límites usan origen desconocido compartido. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Correo de recuperación opcional; puerto predeterminado 465. |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciales SMTP privadas cuando el servidor las requiere. |
| `SMTP_SECURE` | `true` para TLS desde el inicio; 465 lo usa por defecto. En los demás casos se exige STARTTLS. No se desactiva la validación de certificados. |

Usar un generador criptográfico para las claves, guardarlas de forma privada y respaldarlas separadamente de la base. No pegarlas en issues, conversaciones, capturas ni logs. El valor Base64 debe representar 32 bytes; el validador rechaza claves ausentes o de formato incorrecto. El secreto TOTP cifrado no depende del dominio para poder trasladar la instalación; el estado temporal de configuración sí queda ligado al origen de aplicación.

Si falta configuración, `/ingresar` muestra acceso no disponible y el API falla cerrado. Las guardas S4 protegen también el resto del ERP. Reiniciar sólo procesos propios/autorizados al cambiar configuración. Verificar HTTPS/cookies/proxy en el destino final antes de usarlo con datos reales.

## Primer Administrador

Desde una terminal interactiva del servidor, con conexión PostgreSQL local verificada y variables configuradas:

```bash
pnpm seguridad:administrador
```

Indicar nombre/correo del titular cuya identidad se verificó, confirmar el nombre de base mostrado y escribir `CREAR`. La contraseña se pide sin eco, dos veces, con 8–128 caracteres. No se acepta por argumentos, no hay formulario público de provisión y el comando rechaza crear otro administrador inicial si ya existe uno activo. Puede activar la cuenta heredada pendiente sólo cuando el operador identifica expresamente ese correo; no deduce dueño/contraseña del seed.

Ingresar por `/ingresar`. Para administrar cuentas ir a **Mi acceso → Administrar usuarios** o `/administracion/usuarios`. Una sesión sin permiso no puede consultar ni operar ese módulo por su página o API nuevo.

## Crear, habilitar o dar de baja un usuario

1. Entrar como Administrador y abrir **Usuarios y acceso**. Confirmar identidad mediante el botón o el diálogo que aparece al intentar un cambio sin confirmación reciente. Dura cinco minutos; si está activo el factor, usar contraseña y código nuevo o respaldo personal. No requiere salir a Mi acceso. El formulario se conserva; después de validar, confirmar expresamente el cambio pendiente.
2. Abrir **Usuarios y acceso → Crear usuario**. Indicar nombre, correo y uno o varios roles. Revisar y confirmar.
3. Entregar el enlace privado mostrado sólo al titular verificado. Sirve una vez y vence en 30 minutos. El token va después de `#`, de modo que no se envía al servidor al abrir la página ni se conserva en su URL después de capturarlo.
4. El titular abre el enlace y elige su contraseña; no se habilita una cuenta sólo por aparecer en la lista. En S2 el alta es local; Google y su vinculación se habilitarán en S3.
5. Editar permite nombre, roles y estado. El correo se conserva en esta entrega. Los cambios verifican versión; ante modificación concurrente, actualizar la lista.
6. Desactivar conserva el usuario/historia y revoca sesiones, enlaces y desafíos. La cuenta no se borra. Para reactivar debe tener un método válido; si nunca se activó, dejar pendiente y emitir nueva invitación.

Los roles se suman. El Administrador no puede retirar/desactivar al último Administrador activo con método utilizable, ni hacerlo mediante dos solicitudes concurrentes. Cambiarse sus propios roles revoca también su sesión. El administrador puede operar usuarios, pero no ver/cambiar secretos, factor o códigos de otra persona.

No hay contraseña visible ni eliminación de usuarios en este módulo. Consulta es de sólo lectura; búsqueda/paginación se resuelven en servidor. Reemitir un enlace invalida los enlaces anteriores de esa cuenta y no desactiva el doble factor.

## Ingresar, recuperar contraseña y salir

- `/ingresar`: correo y contraseña; si el factor está activo, completar después el código de aplicación o respaldo. El desafío no es una sesión. Al completar el ingreso se abre el Dashboard (`/`), con o sin doble factor. Para revisar contraseña, factor o sesiones, abrir **Mi acceso** desde el menú de usuario o la navegación.
- Si hay SMTP, **Olvidé mi contraseña** envía un enlace a cuentas locales activas. La respuesta no confirma existencia y también permite pedir asistencia al Administrador. No se revela fallo SMTP, destinatario existente ni token al solicitante anónimo.
- Sin SMTP o con problemas, Administrador confirma su identidad y selecciona **Recuperar acceso** sobre el usuario. Entrega el enlace privado tras verificar al titular.
- Activar/restablecer contraseña no inicia una sesión automáticamente y no elimina TOTP. Restablecer o cambiar contraseña revoca sesiones y enlaces anteriores.
- **Cerrar sesión** está disponible siempre en la barra superior del ERP (icono de salida en pantallas pequeñas o intermedias), además de **Mi acceso**. Revoca sólo la sesión actual y borra su cookie. Varias sesiones están permitidas; se puede cerrar una ajena propia o todas las demás.
- Sesiones: 60 minutos de inactividad y máximo de ocho horas. Leer/pollear el estado no prolonga la sesión; las operaciones explícitas de S2 actualizan actividad. La integración con toda la actividad del ERP corresponde a S4.

Una respuesta perdida no demuestra que falló el cambio. Consultar estado antes de repetir: un alta puede existir y sus enlaces/códigos anteriores pueden quedar invalidados al reemitirlos. Si se pierde la respuesta al activar TOTP, usar la aplicación recién configurada para volver a entrar y generar códigos nuevos. No crear otro usuario para resolver una incertidumbre.

## Doble factor personal

1. **Mi acceso → Confirmar mi identidad**.
2. **Configurar doble factor**. En esta entrega la aplicación se agrega por **clave manual**: cuenta mostrada, tipo basado en tiempo. La clave sólo aparece en esta preparación y no se registra en archivos/logs.
3. Introducir el código de seis dígitos del nuevo autenticador y confirmar. Preparar/cancelar no activa ni reemplaza el factor anterior; vence en cinco minutos.
4. Guardar los diez códigos de respaldo fuera del móvil. Cada uno sirve una vez y no vuelve a mostrarse. Al confirmar se cierran otras sesiones.
5. Para cambiar de móvil, usar la aplicación actual o un código de respaldo para entrar/reautenticar y configurar el nuevo autenticador. Sólo se reemplaza al confirmar el nuevo código.
6. **Generar nuevos códigos** invalida el lote anterior. **Deshabilitar doble factor** exige confirmación de identidad reciente del propio titular.

Códigos TOTP ya utilizados no se aceptan de nuevo. Si se necesita otra operación sensible, esperar un código nuevo o usar otro respaldo. Los códigos de respaldo sustituyen al segundo factor, no a la contraseña/identidad primaria. Restablecer contraseña no los elimina ni permite omitir TOTP. Sin móvil ni respaldo no hay desbloqueo administrativo; rige también para Administradores.

Se comprueban titularidad y permiso en servidor; no hay ID de otro usuario que permita gestionar su factor. Google tendrá que pasar el mismo desafío cuando se implemente S3; todavía no se ofrece ese ingreso.

## Recuperación del Administrador sin SMTP

Un operador autorizado del servidor puede emitir un enlace de recuperación local, después de verificar al titular:

```bash
pnpm seguridad:administrador --recuperar
```

Exige terminal y PostgreSQL local, correo explícito, destino mostrado y confirmación `RECUPERAR`. Sólo admite Administrador activo con acceso local; no asigna roles, no reactiva cuentas, no altera el factor y no suprime sus códigos. El enlace privado aparece en la terminal para entregarlo al titular y vence en 30 minutos. No ejecutarlo desde un sistema que capture/sincronice la salida de terminal con terceros.

El operador no recibe códigos TOTP ni recuperación del segundo factor: el titular conserva esa obligación. Si se perdieron tanto el factor como los respaldos, este comando no lo resuelve. Prever más de un Administrador utilizable sin contradecir la gestión exclusiva del factor propio.

## Límites, auditoría y respaldos

Intentos en ventanas de 15 minutos, persistidos en PostgreSQL: ingreso local 10 por cuenta y 100 por origen; solicitudes de recuperación 3 por cuenta/20 por origen; desafíos de factor 5 por desafío (cinco minutos) y 50 por origen; reautenticación 10 por usuario; operaciones autenticadas 100 por sesión. Proteger además el servicio con límites del proxy en el despliegue; IP desconocida comparte origen. No son límites configurados de módulos antiguos.

Los eventos nuevos de seguridad registran actor/afectado, acción/resultado, IP confiable si está disponible y tipo de navegador. S5 implementa el visor exclusivo de Administrador y la depuración controlada con la retención aprobada. No se crean autorías ficticias para documentos existentes.

Se desactiva el registro automático Prisma de consultas/errores crudos en el pool compartido para no filtrar secretos o argumentos. Los mensajes públicos son controlados. El procedimiento operativo de S6 indica cómo diagnosticar sin registrar payloads ni secretos.

Respaldar base y claves; restaurar una base anterior puede reintroducir sesiones/tokens/códigos que ya se consumieron. No abrir acceso tras restaurar sin el procedimiento de revocación y conciliación de S6 descrito más abajo. No usar una restauración como mecanismo de desactivación del factor ajeno.

## Repetir verificaciones

Todas las pruebas que escriben exigen `mtx_validacion_seguridad_s2_YYYYMMDD` en localhost/127.0.0.1. Crear copia independiente y claves/origen temporales; no usar `.env` real ni ejecutar fixtures sobre producción. Ejecutar secuencialmente:

1. `tests/seguridad-acceso.integration.ts`: ciclo, concurrencia, rollback y fixture privado de navegador.
2. `tests/seguridad-correo.integration.ts`: SMTP TLS local con certificado confiable temporal y `NODE_EXTRA_CA_CERTS`; sin proveedor real.
3. `tests/seguridad-acceso.ui.ts`: servidor temporal 3031 contra esa copia, Chromium, perfiles, cookies, tamaño/CSRF, TOTP y anchos.
4. `tests/seguridad-admin-local.integration.ts`: recuperación administrativa local sin bypass.

Usar `node --import tsx <archivo>`. Los fixtures de navegador y claves en `/tmp/mtx-s2-*.json` son privados (modo 600), sólo de validación. No subirlos. La prueba SMTP usa certificado/clave en `/tmp/mtx-s2-tls/`; retirarlos junto con copia y servidores propios al terminar. Conservar servidores del usuario.

La validación local no acredita una cuenta SMTP real, Google ni el despliegue con cookies HTTPS en el dominio final. Google está pospuesto; el entorno final y la regresión integral corresponden a S6, y la aprobación funcional general a S7. La autorización de los módulos anteriores se incorpora en S4.


## Diagnóstico de provisión y ajuste de contraseña — 20-10-2026

El mínimo vigente es 8 caracteres (máximo 128), también en CLI, activación, cambio y recuperación. El CLI ya no oculta todos los fallos detrás de un mensaje genérico: comprueba origen/claves antes de pedir datos y muestra causas controladas, sin secretos.

En el entorno local de esta revisión faltaban las tres variables de seguridad. Se configuró `SEGURIDAD_ORIGEN=http://localhost:3030` por indicación del usuario y se generaron claves privadas en `.env`, sin publicarlas. Si el servidor estaba abierto antes del cambio, reiniciarlo para asegurar que cargue el entorno nuevo. Después ejecutar nuevamente `pnpm seguridad:administrador` desde la terminal interactiva; no copiar las claves ni la contraseña a esta documentación. Para acceder en este entorno utilizar exactamente `http://localhost:3030`; cambiarlo por 127.0.0.1 o un túnel requiere configurar coherentemente el origen.

No hace falta un símbolo especial ni una combinación de mayúsculas/números: se aplica la longitud acordada. La instalación no genera la contraseña del titular ni activa usuarios desde el seed. El respaldo privado de este ajuste está en `backups/20261020_seguridad_clave8/`, ignorado por git.


## Uso de permisos — S4

- Iniciar sesión abre Dashboard. El menú y `Ctrl+K` muestran las secciones permitidas; una URL escrita manualmente también se comprueba en servidor.
- Los roles se suman: Ventas + Cobranza reúne ambas áreas. Consulta/Gerencia consulta sin crear, editar, corregir o anular. Cada rol operativo conserva las correcciones de su área; factura externa corresponde a Cobranza y Administrador.
- Cambiar roles, dar de baja o revocar sesiones invalida el acceso anterior. Una pestaña abierta puede mostrar lo que ya se había descargado, pero su siguiente consulta/operación debe autenticarse de nuevo. Ningún permiso puede retirar información ya vista o descargada.
- Al vencer la sesión, volver a ingresar. Conservar la solicitud de una operación incierta para reintentar con su misma clave; nunca duplicarla para sortear una denegación.
- Taller/Despacho consulta cantidades, recetas y referencias de OCC sin los importes estructurados de venta, bancos, cuentas ni abonos. Sin permiso de precios, editar catálogo conserva el precio sugerido anterior. Los textos libres y descripciones técnicas deben redactarse pensando en las personas que los consultarán; el sistema no interpreta ni elimina importes escritos manualmente en esos textos.
- PDF e imágenes requieren autorización en cada petición. No compartir sus enlaces como recursos públicos. Una referencia inexistente/no visible devuelve 404; sin sesión, 401; sin capacidad del módulo, 403.

Las pruebas S4 requieren copia local descartable `mtx_validacion_seguridad_s4_YYYYMMDD`. Ejecutar cobertura sin DB, luego integración y navegador secuencialmente. El navegador usa servidor propio 3031 y origen temporal coincidente, con fixtures `/tmp/s4-actores.json` privados; retirarlos y retirar la copia al terminar. Los ensayos antiguos que llaman servicios directamente necesitan una credencial real de fixture mediante el adaptador interno `conCredencialSeguridad`; no desactivar guardas ni usar cuentas reales para ejecutarlos.


## Auditoría y autoría — S5

1. Ingresar como Administrador y abrir **Administración → Auditoría y autoría**. El buscador `Ctrl+K` también encuentra la sección.
2. Elegir **Eventos de seguridad** para consultar accesos, cambios de seguridad, expiraciones y denegaciones relevantes. Filtrar por acción, resultado o fechas de calendario de Santiago; los resultados se paginan de 25 en 25.
3. Elegir **Autoría documental** para consultar responsables de operaciones nuevas. Seleccionar el documento o registro y, si corresponde, su número interno. Los nombres de usuario mostrados son los actuales; su ID conserva la identidad aunque cambie el nombre.
4. Desde Ver Cotización, OCC, OT o Guía, el Administrador puede abrir **Consultar autoría registrada**. Si no hay registros, se muestra **Sin autoría registrada**. Un cambio nuevo en un documento antiguo no demuestra quién lo creó originalmente.

La autoría se confirma en la misma transacción que el hecho. Un fallo revierte ambos; un reintento conserva al autor original, aunque lo haga otra persona autorizada. La sesión debe seguir permitiendo la operación al reintentar. Los PDF históricos conservan sus bytes: no se añaden firmas ni se atribuyen documentos anteriores durante esta incorporación.

El historial de seguridad no guarda contraseñas, tokens, códigos, secretos ni cuerpos de formularios. El tipo de navegador se clasifica, sin conservar el User-Agent crudo; es información auxiliar declarada por el cliente. La IP sólo se toma de `X-Forwarded-For` cuando `SEGURIDAD_CONFIAR_PROXY=1`: habilitarlo únicamente detrás de un proxy controlado que elimine/reemplace encabezados externos. Cuando no hay una fuente confiable, se muestra **No disponible**. Las denegaciones repetidas se limitan por actor/referencia durante cinco minutos; la expiración se registra una vez por sesión.

### Depuración y retención

Se conserva la autoría documental permanentemente. Sólo los eventos de seguridad que hayan cumplido 12 meses son elegibles para depuración, con el mismo criterio temporal del trigger PostgreSQL.

- **Desde el ERP:** confirmar la identidad en Mi acceso, volver al visor dentro de cinco minutos y elegir **Depurar eventos antiguos**. Revisar y confirmar el diálogo. El servidor vuelve a comprobar sesión, permiso y reautenticación dentro de la transacción.
- **Desde el servidor:** `pnpm seguridad:depurar-auditoria` sólo informa cuántos eventos son elegibles. `pnpm seguridad:depurar-auditoria --aplicar` ejecuta la retención aprobada y registra la ejecución como **Proceso del sistema**, sin inventar un Administrador responsable.
- **Operación S6:** programar el comando con `--aplicar` en una tarea diaria del servidor, usando el directorio del proyecto, entorno privado y usuario de servicio adecuados. S5 proporciona el comando, pero no instala un planificador en tu equipo ni en producción.

La depuración no elimina autoría, usuarios, documentos, PDF ni información de respaldos antiguos. Estos últimos necesitan una política de retención independiente.

### Validación y continuidad S5

Checkpoint breve: [SEGURIDAD-S5-CONTINUIDAD.md](SEGURIDAD-S5-CONTINUIDAD.md). Las pruebas que escriben exigen una copia local `mtx_validacion_seguridad_s5_YYYYMMDD`. Ejecutar `tests/seguridad-s5-cobertura.ts`, luego integración y navegador secuencialmente; este último usa los fixtures privados creados por integración y un servidor propio 3031. Los PDF de prueba deben ir a directorios temporales mediante COTIZACION_PDF_DIR/TRABAJO_PDF_DIR/GUIA_PDF_DIR. Retirar copia, credenciales, archivos y servidor al terminar. No ejecutar estos fixtures ni el ensayo de depuración sobre la base real.

## Operación y restauración — S6

Las plantillas de [deploy/seguridad](../deploy/seguridad/README.md) preparan un servicio Next en loopback, proxy HTTPS y retención diaria con systemd. Son ejemplos revisables: no instalan servicios ni sustituyen la validación del servidor definitivo. Ajustar dominio, rutas, usuario, Node, PostgreSQL, permisos y Chromium antes de utilizarlas. Mantener `SEGURIDAD_CONFIAR_PROXY=1` exclusivamente si un proxy confiable reemplaza los encabezados y el backend no admite acceso público directo.

La tarea propuesta ejecuta la depuración a las 03:15 de Santiago, con recuperación de ejecuciones omitidas. Primero probar la simulación y el servicio contra una copia; luego habilitar y verificar el timer en el destino autorizado. Revisar código de salida y última ejecución con `systemctl list-timers` y `journalctl -u mtx-erp-retencion.service`. Un timer instalado sin ejecución comprobada no acredita la retención. El comando conserva la autoría histórica y sólo elimina eventos anteriores al corte de 12 meses calculado por PostgreSQL.

### Respaldo coherente

1. Cerrar escrituras durante la captura, o usar un mecanismo equivalente que garantice coherencia entre PostgreSQL y archivos. Conservar revisión de código, migraciones aplicadas y manifiestos de integridad.
2. Respaldar PostgreSQL, configuración privada y **todas las claves históricas** que aún cifren factores. No reemplazar las claves al restaurar ni enviarlas por correo/chat.
3. Respaldar juntos los seis almacenes: logos de empresa, imágenes de productos, imágenes de cotizaciones, PDF de cotizaciones, PDF de trabajos y PDF de guías. Respetar las ubicaciones configuradas por sus variables `*_DIR`.
4. Guardar las copias con acceso restringido, fuera del directorio público y de git. La retención de respaldos es independiente de la depuración de eventos; definir calendario, responsables y prueba periódica de recuperación para el destino definitivo. No borrar automáticamente respaldos por este hito.

### Restaurar sin reabrir accesos antiguos

1. Mantener acceso público cerrado y restaurar primero en aislamiento. Comparar base, archivos y manifiestos; comprobar claves y reloj del servidor. Registrar la restauración como incidente operativo.
2. Ejecutar `pnpm seguridad:revocar-restauracion`: simula y muestra sólo cantidades. Revisar el destino privado de la conexión antes de continuar.
3. Ejecutar `pnpm seguridad:revocar-restauracion --aplicar` en la instalación restaurada. Revoca todas las sesiones, elimina enlaces/desafíos, incrementa la revisión de seguridad y registra un evento de sistema en la misma transacción. No cambia contraseñas, roles, estado, factores, códigos personales ni autoría. Ante error mantener el acceso cerrado; el fallo no debe dejar una revocación parcial.
4. Conciliar las bajas, permisos y cambios personales de factor realizados después de la fecha del respaldo con evidencia operativa confiable. El respaldo podría recuperar una cuenta que se había desactivado o un factor anterior: la revocación de sesiones no reconstruye esas decisiones posteriores. Un Administrador revisa roles/bajas; cada titular gestiona su propio factor. Mantener cerradas las cuentas que no puedan conciliarse.
5. Los códigos personales recuperados desde la copia podrían figurar disponibles aunque se hubieran consumido después. Antes de reabrir al público, cada titular debe regenerarlos desde su panel usando su autenticador vigente y reautenticación, mediante un acceso de mantenimiento controlado. Esto incluye Administradores. No entregar códigos ajenos ni desactivar factores para resolver el incidente. Si no conserva autenticador ni respaldo personal verificable, no hay bypass aprobado.
6. Verificar ingreso, segundo factor, permisos, archivos, autoría y retención en el destino. Reabrir sólo al completar la conciliación y registrar qué copia se restauró y quién autorizó la reapertura, sin registrar secretos.

### Incidencias y registros

- Si falla el ingreso para todos, comprobar origen exacto, configuración/claves, reloj, conectividad PostgreSQL y estado del servicio. No crear otro administrador inicial ni ejecutar el seed como solución.
- Si se pierde una contraseña, usar recuperación por correo o asistencia administrativa; eso conserva el segundo factor. Si el incidente afecta sólo permisos, corregirlos desde Usuarios: las sesiones anteriores quedan revocadas y se exige nuevo ingreso.
- Si falla la tarea de retención, revisar el código de salida y conexión/configuración, corregir la causa y repetirla; es segura ante repetición y no elimina autoría. No eliminar eventos recientes mediante SQL.
- En solicitudes de soporte registrar hora, ruta, tipo de operación y resultado controlado. No adjuntar cookies, claves, contraseñas, códigos, enlaces privados, cuerpos HTTP ni el contenido de `.env`. Mantener los logs operativos y las evidencias de ensayo con acceso restringido.

### Ensayo repetible

`pnpm seguridad:validar-s6` ejecuta escenarios secuenciales en copias locales independientes, con credencial real para los servicios de negocio; admite nombres de escenarios para repetir sólo los afectados. Requiere Docker/PostgreSQL local, cliente generado, compilación de producción, Chromium y una base local de referencia configurada con empresa, numeración, IVA y datos comerciales. No ejecutarlo mientras alguien escribe en la base de origen: compara huellas antes/después y conserva evidencias privadas en `backups/`.

El respaldo de ensayo incluye datos y configuración reales del origen; sus directorios son privados. Cada prueba recibe almacenes temporales, y las copias se eliminan al terminar. Los escenarios de primera configuración restauran sólo el esquema y preparan sus datos mínimos expresos: no deben ejecutarse sobre una empresa ya operativa. No se debilitan los triggers ni las guardas de destino para ejecutar pruebas antiguas.

El ensayo HTTPS usa certificado efímero y proxy local; acredita el comportamiento local del navegador/backend, sin certificar DNS, TLS público, Nginx instalado, firewall, SMTP real ni un planificador del servidor definitivo. El estado y los pendientes exactos se mantienen en [SEGURIDAD-S6-CONTINUIDAD.md](SEGURIDAD-S6-CONTINUIDAD.md).

Las cabeceras generales impiden incrustar el ERP desde otros sitios (`SAMEORIGIN` y `frame-ancestors 'self'`) y conservan los PDF dentro de los visores del ERP. Las pantallas de acceso, panel y administración mantienen la prohibición completa de marcos (`DENY`). Los cambios de identidad realizan recarga completa para descartar el estado de la sesión anterior en el navegador.


Estado S6 al 22-10-2026: **validación local terminada (48/48), despliegue preparado**. El usuario confirmó que todavía no existe servidor/dominio. No se instalaron servicios públicos ni tareas diarias en este equipo; su instalación/verificación se difiere al destino definitivo. La aprobación funcional general S7 continúa pendiente.


## Revisión funcional S7 — 23-10-2026

El usuario aprobó S7-01, S7-02 y S7-05. S7-03 y S7-06 tienen observaciones corregidas pendientes de nueva revisión; los otros bloques conservan su estado en la guía.

Al guardar contraseña mediante activación o recuperación se regresa automáticamente a `/ingresar`, con aviso visible; todavía se requiere iniciar sesión y completar el factor si corresponde. Ingreso, recuperación, Mi acceso y cambios de usuarios muestran avisos emergentes de resultado, conservando también el texto de estado.

La confirmación administrativa se solicita dentro de Usuarios, con contraseña del titular en sesión y su factor cuando esté habilitado. Se reutiliza durante cinco minutos; no se elimina esta protección. Cancelar o fallar no aplica el cambio, y confirmar identidad no lo guarda automáticamente. El Administrador revisa y confirma después el cambio pendiente.


### 24-10-2026 — Aprobaciones funcionales S7

El usuario confirma S7-02/S7-03/S7-06/S7-07 y aprueba S7-09. Se consideran resueltas las observaciones de retorno al login, avisos visibles, diálogo administrativo y cierre visible de sesión. Con las aprobaciones anteriores, quedan aprobados S7-01/02/03/05/06/07/09. Pendientes S7-04/08/10/11/12 según la [guía](GUIA-PRUEBAS-SEGURIDAD-S7.md); S7 sigue abierto. Esta actualización sólo registra resultados del usuario: revisión de contenido, referencias y diff, sin ejecutar pruebas de aplicación, servidores ni operaciones en base.


### 26-10-2026 — Demostración mediante túnel de VS Code

Configurar `SEGURIDAD_ORIGEN` con la URL HTTPS exacta del túnel (sin ruta), conservar las claves privadas existentes y reiniciar el proceso de desarrollo. Usar esa URL también para la sesión del Administrador y generar desde ella los enlaces de activación/recuperación. En `next.config.ts`, el dominio debe coincidir con `allowedDevOrigins` y el permitido por Server Actions. No usar comodines para todos los túneles.

Dev Tunnels puede reescribir `Origin` a localhost. La comprobación compartida de API de seguridad y Server Actions conserva el origen canónico como regla; exclusivamente con `NODE_ENV=development` y origen HTTPS de `.devtunnels.ms`, admite `http://localhost:3030` o `https://localhost:3030` si el navegador envía `Sec-Fetch-Site: same-origin` y `X-Forwarded-Host` (o Host si falta) coincide exactamente con el host público configurado. Rechaza solicitudes cross-site, otros hosts, listas de hosts y cabeceras ausentes para esta excepción. En producción no existe esa excepción. No cambia permisos, contraseñas ni cookies Secure/HttpOnly/SameSite.

Comprobación específica sin base de datos: `node --import tsx tests/seguridad-origen-tunel.ts`. La validación de ingreso y guardado desde el túnel real debe confirmarse en el navegador; no confundir la comprobación de cabeceras con aceptación funcional remota. Al terminar la demostración, detener el túnel y restaurar el origen local si se vuelve a localhost.
