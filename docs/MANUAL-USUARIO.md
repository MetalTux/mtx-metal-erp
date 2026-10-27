# Manual de usuario — MTX Metal ERP

Edición del **24-10-2026**, contrastada con rutas, controles y reglas implementadas. Cubre el sistema actual para una empresa. Las revisiones funcionales pendientes de Cobranzas, Dashboard y Seguridad conservan su estado: este manual no las aprueba por el usuario. Primera edición en texto; capturas con datos anonimizados y revisión con usuarios pendientes.

## Índice por tarea

1. [Orientarse y evitar errores comunes](#1-orientarse-y-evitar-errores-comunes)
2. [Ingresar, salir y cuidar la cuenta](#2-ingresar-salir-y-cuidar-la-cuenta)
3. [Elegir el recorrido según el perfil](#3-elegir-el-recorrido-según-el-perfil)
4. [Preparar la empresa y sus datos](#4-preparar-la-empresa-y-sus-datos)
5. [Mantener catálogos y contactos](#5-mantener-catálogos-y-contactos)
6. [Productos, recetas e imágenes](#6-productos-recetas-e-imágenes)
7. [Comprar y recibir materias primas](#7-comprar-y-recibir-materias-primas)
8. [Consultar y corregir inventario](#8-consultar-y-corregir-inventario)
9. [Cotizar y generar PDF](#9-cotizar-y-generar-pdf)
10. [Registrar lo contratado por el cliente](#10-registrar-lo-contratado-por-el-cliente)
11. [Planificar y ejecutar un trabajo](#11-planificar-y-ejecutar-un-trabajo)
12. [Entregar y corregir una guía](#12-entregar-y-corregir-una-guía)
13. [Cobrar, corregir abonos y adjuntar comprobantes](#13-cobrar-corregir-abonos-y-adjuntar-comprobantes)
14. [Leer el Dashboard y sus avisos](#14-leer-el-dashboard-y-sus-avisos)
15. [Consultar documentos, PDF y autoría](#15-consultar-documentos-pdf-y-autoría)
16. [Resolver bloqueos y respuestas inciertas](#16-resolver-bloqueos-y-respuestas-inciertas)
17. [Recorrer un caso completo](#17-recorrer-un-caso-completo)
18. [Límites actuales y entrega al responsable de operación](#18-límites-actuales-y-entrega-al-responsable-de-operación)

## 1. Orientarse y evitar errores comunes

La barra lateral agrupa Mantenedores, Inventario, Compras, Ventas, Trabajos, Acceso, Administración y Configuración. Cada persona ve las áreas permitidas por sus roles. En escritorio puede contraer el menú; en móvil debe abrirlo con el botón de menú. **Buscar página**, también con **Ctrl+K**, permite encontrar una sección por nombre; dentro de cada listado se usa su filtro propio para localizar documentos.

La barra superior contiene la campana de avisos, el menú de usuario y **Cerrar sesión**. En ventanas estrechas algunas acciones muestran sólo un icono: mantener el puntero o enfocarlo con Tab permite identificar su nombre/ayuda. La ruta de navegación superior ayuda a reconocer la sección actual.

En los mantenedores, **Crear**, **Ver**, **Editar** y **Eliminar** se muestran según permisos y referencias. Los formularios se abren sobre el listado. **Ver** es sólo consulta; **Cancelar** o **Cerrar** permiten volver, salvo una operación pendiente que exija resolver primero su resultado. En compras/cotizaciones y otros procesos varias acciones aparecen como iconos en la columna Acciones; sus ayudas y nombres accesibles identifican su función.

| Acción | Resultado que debes esperar |
| --- | --- |
| Guardar compra | Registra documento; todavía no ingresa existencias |
| Recibir compra | Ingresa la cantidad recibida a la bodega y crea movimientos |
| Guardar cotización | Registra oferta; no reserva ni mueve stock |
| Confirmar OCC | Registra contrato y cuenta única; no fabrica ni entrega |
| Guardar plan como borrador | Conserva planificación; no reserva materiales |
| Confirmar plan | Intenta reservar stock libre; no lo consume |
| Registrar fabricación | Registra avance y, cuando corresponde, consume insumos y produce terminado |
| Finalizar OT | Cierra producción; no equivale a despachar o cobrar |
| Confirmar salida de guía | Acredita entrega y descuenta bienes de la bodega de salida |
| Registrar factura externa | Registra referencia/fecha y calcula vencimiento; no registra pago |
| Registrar abono | Registra dinero recibido y reduce el saldo de la cuenta |

Los importes se muestran en pesos chilenos y las cantidades con su unidad, hasta tres decimales. Las cotizaciones nuevas usan precios unitarios netos: se descuenta sobre el neto, se calcula IVA sobre ese neto y se suma el total. Las cotizaciones históricas conservan su modalidad original. No sumar kilos con metros o unidades. Una fecha escrita en un documento puede ser distinta del momento en que se registró: ambas se conservan cuando corresponde.

## 2. Ingresar, salir y cuidar la cuenta

### Ingreso y activación

1. Abrir la dirección del ERP entregada por el responsable. En este entorno de desarrollo es `http://localhost:3030`; esa dirección no corresponde al computador de otro trabajador.
2. Ingresar correo y contraseña. Las cuentas las habilita el Administrador; no existe inscripción pública.
3. Si recibiste una invitación, abrir su enlace privado, elegir una contraseña de **8 a 128 caracteres** y repetirla. Al guardarla vuelve al formulario de ingreso; aún debes autenticarte.
4. Si tienes doble factor habilitado, completar el código de aplicación o un respaldo personal no utilizado.
5. Al ingresar se abre el **Dashboard**. Para cambios personales, abrir **Mi acceso** desde el menú o la barra lateral.
6. Para salir, pulsar **Cerrar sesión** en la barra superior; también está disponible en Mi acceso. Cierra la sesión de ese navegador.

Una invitación sirve una vez y vence a los treinta minutos. Si no funciona, solicitar al Administrador **Reemitir invitación**; usar sólo el enlace nuevo. No compartir invitaciones, contraseñas ni códigos como evidencia de un problema.

### Contraseña y recuperación

1. En **Mi acceso**, completar **Confirmar mi identidad** con contraseña y, si está habilitado, código propio del segundo factor.
2. En **Cambiar contraseña**, escribir la nueva y pulsar **Guardar contraseña**. La confirmación de identidad dura cinco minutos.
3. Si olvidaste la contraseña, usar **Olvidé mi contraseña** con el correo autorizado; el envío requiere que el responsable haya configurado correo saliente.
4. Como alternativa, pedir recuperación asistida al Administrador, quien verifica al titular y entrega un enlace privado desde **Usuarios y acceso → Recuperar acceso**.
5. Completar el restablecimiento y volver a ingresar. Recuperar contraseña conserva el doble factor y revoca sesiones anteriores al completarse.

### Doble factor y respaldos personales

1. En Mi acceso, confirmar identidad y pulsar **Configurar doble factor**.
2. Agregar la clave de configuración manual a una aplicación autenticadora, tipo basado en tiempo. La interfaz actual muestra clave manual, sin QR.
3. Ingresar el código nuevo en **Código del nuevo autenticador** y confirmar.
4. Guardar los diez códigos personales fuera del móvil antes de cerrar el diálogo. Cada uno sirve una vez.
5. Para reemplazar autenticador, generar respaldos nuevos o deshabilitar el factor, hacerlo desde la propia sesión y con confirmación reciente. Un código TOTP usado no se reutiliza; esperar otro o usar un respaldo vigente.

El Administrador tampoco puede desactivar el factor de otra persona. Las mismas reglas rigen para cuentas administrativas. Perder autenticador y todos los respaldos no tiene un desbloqueo administrativo aprobado: conservar los códigos de forma privada y recuperable.

### Varias sesiones

Puedes mantener la misma cuenta en varios navegadores. En **Mi acceso → Mis sesiones**, identificar **Esta sesión** y **Otra sesión**; usar **Cerrar esta sesión** en una fila ajena propia o **Cerrar las demás sesiones**. Dos pestañas de un mismo perfil comparten sesión.

Se exige nuevo ingreso después de sesenta minutos de inactividad o un máximo de ocho horas. Cambios de contraseña, roles, estado o factor también pueden revocar sesiones. Ingresar en otro navegador, por sí solo, no debe cerrar el primero.

### Administrar usuarios

1. Como Administrador, abrir **Administración → Usuarios y roles**; la pantalla se titula **Usuarios y acceso**.
2. Pulsar **Crear usuario**, completar nombre/correo y uno o más roles, revisar y confirmar. Entregar la invitación únicamente al titular verificado.
3. Para cambiar nombre, roles o estado, usar **Editar**. El correo identifica la cuenta y se conserva en esta entrega.
4. Si falta confirmación reciente, se abre un diálogo en la misma pantalla con contraseña del Administrador en sesión y su factor, si lo tiene. El formulario se conserva; después hay que confirmar el cambio pendiente.
5. Cambiar a Inactivo retira el acceso y conserva historia. Reactivar permite un ingreso nuevo, sin resucitar sesiones anteriores. No se puede retirar al último Administrador utilizable.

## 3. Elegir el recorrido según el perfil

| Rol | Trabajo habitual |
| --- | --- |
| Administrador | Configuración, usuarios, auditoría y operaciones de todas las áreas; su factor sigue siendo personal |
| Ventas | Clientes, cotizaciones y OCC; consulta de trabajos, entregas y cuentas autorizadas |
| Compras y Bodega | Proveedores/catálogos, compras, recepciones e inventario; consulta productiva autorizada |
| Producción y Despacho | Planificar, reservar, fabricar, finalizar y entregar; sin precios/costos por este rol solo |
| Cobranza | Cuentas, abonos, comprobantes, promesas y registro/corrección de factura externa |
| Consulta/Gerencia | Lectura autorizada de la empresa; sin operaciones de modificación ni visor de auditoría administrativa |

Los roles se suman: Ventas + Cobranza puede operar ambas áreas. Ver una sección no significa poder modificarla. Si falta un botón, revisar estado del documento y rol antes de repetir el proceso o crear otro registro.

## 4. Preparar la empresa y sus datos

Este recorrido lo realiza quien tenga permisos de configuración; en los roles iniciales, Administrador.

1. **Configuración → Empresa:** completar los datos reales de la empresa, RUT, contacto y logo cuando corresponda; guardar antes de crear cuentas bancarias. Los requisitos de emisión se comprueban al preparar cada documento.
2. **Cuentas bancarias:** crear las cuentas reales. La primera es principal; para cambiarla usar **Principal** en otra activa. Cambiar de principal antes de desactivar la anterior. Desactivar retira la opción de documentos nuevos y conserva historia; **Activar** la habilita nuevamente.
3. **Configuración → IVA:** crear/revisar períodos por fecha con **Crear período → Revisar y guardar → Guardar período**. Fecha hasta inclusiva. Un nuevo período abierto puede cerrar el anterior el día previo; revisar esa confirmación. Una tasa ya usada queda protegida para no cambiar documentos históricos.
4. **Configuración → Numeración:** revisar el tipo documental y configurar prefijo, longitud y próximo número propuesto. Revisar antes de confirmar; las identidades ya emitidas y sus folios se conservan. No intentar reutilizar folios anteriores.
5. Cargar unidades, bodegas, materias primas/productos, proveedores, clientes/sucursales y condiciones de pago. Registrar saldos iniciales sólo mediante los procesos de Inventario.
6. Crear las cuentas de usuarios con sus roles. La provisión del primer Administrador corresponde al responsable técnico, siguiendo [Operación de seguridad](OPERACION-SEGURIDAD.md).

Cambiar Empresa, cliente, banco o tasa no actualiza retrospectivamente las copias de documentos emitidos. Si una emisión informa datos incompletos, completar el catálogo y revisar las opciones explícitas de actualización/corrección del documento; no reemplazar historia por fuera del ERP.

## 5. Mantener catálogos y contactos

Para cada mantenedor: abrirlo, filtrar para evitar duplicados, elegir **Crear**, completar datos y guardar. Usar **Ver** para consulta, **Editar** para cambios permitidos y **Eliminar** sólo si no tiene referencias que lo impidan. Un bloqueo por uso conserva la relación y debe resolverse sin borrar documentos históricos.

| Sección | Qué revisar al crear o editar |
| --- | --- |
| Unidades de medida | Nombre único y abreviatura comprensible. Todas las cantidades de un material usan una sola unidad; no hay conversiones automáticas |
| Bodegas | Nombre/datos y clasificación Materia prima, Producto terminado o Mixta, según lo que podrá recibir |
| Proveedores | RUT y datos de contacto/dirección del proveedor real; la compra utiliza esa identidad |
| Clientes | Datos generales y contacto; revisar Casa Central y las demás sucursales, cada una con dirección, ciudad y contacto propios |
| Materias primas | Código, nombre y unidad. Cambiar unidad sólo se permite sin stock —incluso cero—, movimientos ni otras referencias |
| Condiciones de Pago | Nombre y plazo de días. El vencimiento comercial usa ese plazo histórico desde factura, no desde guía o abono |

En selectores con búsqueda, escribir parte del nombre y elegir la coincidencia; revisar que corresponda al cliente, sucursal, unidad o bodega correctos. Un catálogo recién creado no genera stock ni deudas por sí solo.

## 6. Productos, recetas e imágenes

1. Abrir **Mantenedores → Productos**, buscar antes de crear y elegir **Crear producto**.
2. Completar nombre y unidad; el código se asigna automáticamente. Revisar imágenes y receta en el formulario.
3. En la receta, indicar las materias primas y cantidades por unidad de producto, cada una en su propia unidad. Guardar no fabrica ni descuenta materiales.
4. Agregar las imágenes mediante los controles de carga; conservar archivos originales cuando sean parte del respaldo operativo.
5. Usar **Ver** para consultar y **Editar** para cambiar datos permitidos. Una receta nueva se propone para trabajos nuevos; las instrucciones históricas de trabajos existentes se conservan.
6. Para existencias que ya están físicamente en bodega, usar **Inventario → Productos terminados**, no aumentar cantidades desde el catálogo.

## 7. Comprar y recibir materias primas

### Registrar el documento

1. Abrir **Compras → Compras** y elegir la acción de crear compra.
2. Seleccionar proveedor, tipo de documento, número, fecha y una bodega de recepción. Si no existe el proveedor, usar **Crear proveedor** junto al selector: al guardar se selecciona sin perder la compra.
3. Pulsar **Agregar detalle de compra**. En el diálogo seleccionar materia prima, presentación, cantidad, contenido por presentación y precio; **Aceptar detalle** verifica los valores y lo incorpora a la grilla inferior. Repetir para cada material. Desde la grilla usar **Ver**, **Editar** o **Quitar** (con confirmación). Cancelar una edición conserva la fila anterior; la compra completa se registra sólo al confirmar el documento. La grilla muestra cantidades, equivalencia de inventario, precio e importe.
4. Revisar importes y pulsar **Confirmar y guardar** cuando se solicite. Guardar registra el documento; todavía no entra stock.
5. Consultar la compra guardada y verificar identidad, bodega y líneas. El precio queda protegido desde guardar; después de la primera recepción o primer cierre también quedan protegidas identidad, bodega y líneas.

Si el material todavía no existe, pulsar **Crear materia prima** junto al selector del detalle. Completar código, nombre, unidad de medida existente y descripción opcional. Al crear, el diálogo se cierra y el material queda seleccionado en esa línea, conservando todos los datos de la compra. Se necesitan permisos para operar Compras y Catálogos (Administrador o Compras y Bodega). La opción no aparece en consulta ni cuando las líneas están bloqueadas por recepción o cierre. Crear el material no ingresa stock y lo conserva en el mantenedor aunque después se cancele la compra.

Ejemplo: dos presentaciones con factor seis representan doce unidades de inventario. El factor es histórico de esa línea, no una conversión general entre unidades de distintos materiales.

### Recibir parcial o totalmente

1. Localizar el documento y usar la acción **Recibir compra [número]** de su fila; puede mostrarse como icono con ayuda.
2. Indicar sólo lo efectivamente recibido en algunas o todas las líneas, hasta el pendiente disponible.
3. Revisar equivalencias y confirmar. La recepción ingresa stock/Kardex en la bodega de compra.
4. Volver a consultar stock y el pendiente de la compra. Una entrega posterior del proveedor se registra como otra recepción del mismo documento.

### Cerrar un pendiente o anular

- Si una cantidad restante no llegará, usar **Cerrar pendiente compra [número]**, elegir la línea e indicar motivo. Cierra todo su pendiente y no crea stock.
- **Anular compra [número]** requiere motivo y comprueba movimientos, dependencias y stock. Cuando corresponde, revierte lo recibido mediante ajustes vinculados y conserva la historia. Un consumo, traslado o ajuste negativo posterior puede impedirla aun si después se repuso stock.
- **Eliminar** retira del listado una compra previamente anulada; no borra historia ni libera su identidad para duplicarla.

La primera recepción o primer cierre bloquea la estructura; la fecha conserva la edición permitida por el módulo. No registrar una compra adicional para encubrir un error de la anterior ni usar ajustes para eludir dependencias de anulación.

## 8. Consultar y corregir inventario

### Stock, movimientos y mínimos

1. Abrir **Inventario → Stock por bodega**, filtrar material/bodega y revisar cantidad, unidad y mínimo.
2. Para configurar reposición, usar el control de mínimo correspondiente, indicar un valor no negativo y confirmar. Puede crearse una combinación con saldo cero sólo para configurar su mínimo.
3. Quitar el mínimo deja de vigilar esa combinación, pero conserva fila e historial. Un mínimo cero es válido y no equivale a no configurarlo. Cambiar mínimo no genera movimientos ni modifica cantidades.
4. Consultar **Inventario → Movimientos** para entradas, salidas y ajustes de materias primas. Para terminado usar sus vistas propias. El orden histórico por registro puede diferir de la fecha manual.

### Carga inicial y ajuste de materias primas

1. Abrir **Inventario → Ajustes de stock** y elegir el proceso de inventario inicial o ajuste según el caso.
2. Seleccionar material y bodega, comprobar unidad y saldo mostrado y contar físicamente.
3. Indicar el **saldo físico final**, fecha, motivo y observación; revisar la diferencia y confirmar.
4. Comprobar el nuevo saldo y movimiento. Si no hay diferencia, no se crea un ajuste ficticio.
5. Para corregir un conteo previo, usar su opción de corrección vinculada y contar el saldo actual; no escribir simplemente el negativo de la diferencia antigua.

La carga inicial de un material/bodega sólo procede sin movimientos previos y con saldo cero. Tener una fila de mínimos en cero no impide por sí solo esa carga. No se admiten saldos finales negativos ni fechas futuras.

### Trasladar materias primas

1. Abrir **Inventario → Traslados**, seleccionar material, bodega de origen y destino distintos y cantidad positiva.
2. Revisar disponibilidad del origen, fecha y observación; confirmar el traslado.
3. Verificar salida del origen y entrada del destino. Es inmediato; no hay tránsito ni una recepción posterior independiente. Los mínimos permanecen propios de cada bodega.
4. Si se registró al revés, usar **Corregir** sobre el traslado: realiza un traslado inverso completo vinculado, con stock suficiente y una corrección directa por documento. No editar ni borrar el original.

Devolver material a la bodega original no elimina el traslado histórico ni desbloquea anulaciones antiguas. El traslado específico de productos terminados no está implementado como este flujo de materias primas.

### Producto terminado

1. Abrir **Inventario → Productos terminados** y elegir **Stock por bodega**, **Ingresos iniciales**, **Ajustes de terminado** o **Movimientos de terminado**.
2. Para carga inicial, elegir producto y bodega apta e informar existencias reales previas mediante su formulario. No usarlo para reemplazar fabricación que debe registrar consumo.
3. Para ajuste, registrar el conteo físico actual con motivo/observación; revisar la diferencia y confirmar. Las correcciones conservan el vínculo al registro anterior.
4. Revisar su Kardex propio; cantidades producidas y salidas se generan desde Producción/Guías, no editando el saldo directamente.

## 9. Cotizar y generar PDF

1. Abrir **Ventas → Cotizaciones → Crear cotización**.
2. Elegir cliente/sucursal, fecha y vencimiento opcional, condición de pago y cuenta bancaria cuando corresponda.
3. Agregar líneas de materia prima, producto o servicio, con descripción, unidad, cantidad y precio unitario neto en pesos enteros.
4. Revisar el detalle técnico, imágenes y condiciones comerciales. El descuento global se aplica al subtotal neto; luego se calcula IVA sobre el neto descontado y TOTAL = NETO + IVA, con la tasa del documento.
5. Guardar y confirmar. El folio se asigna al primer guardado confirmado. Cotizar no reserva materiales ni crea deuda.
6. Desde la fila, usar **PDF cotización [folio]** para generar la revisión guardada y consultar emisiones archivadas. Revisar antes de entregar al cliente.
7. Para una oferta pendiente, editar si está permitido. **Rechazar** conserva y bloquea el contenido; **Corregir** crea una nueva pendiente vinculada al original, con nuevo folio.
8. Para registrar aceptación, usar **Aceptar y registrar orden de cotización [folio]**; si ya está aprobada aparece **Registrar orden de…**. Revisar contratación en el capítulo siguiente.

Una pendiente vencida no se acepta directamente. Una aprobación previa mantiene su contrato de aceptación definido por el módulo. Las revisiones PDF emitidas se conservan; un cambio posterior no reescribe los bytes anteriores. El envío automático de cotizaciones por correo sigue pendiente; descargar y entregar por el canal habitual autorizado.

## 10. Registrar lo contratado por el cliente

1. Desde la cotización usar la acción de aceptar/registrar orden o abrir **Ventas → Órdenes de Compra Cliente** y seleccionar la oferta disponible.
2. Indicar las cantidades realmente contratadas dentro de lo cotizado. Las excluidas no se contratan; no se renegocian cantidades/precios fuera de ese alcance mediante el mismo registro.
3. Revisar fecha, número/fecha de OC externa cuando existan, condición histórica, importes y alcance técnico aceptado. Los descuentos se distribuyen según las reglas del documento; no corregirlos manualmente fuera del ERP.
4. Confirmar. Se guarda OCC y su cuenta única por el importe aceptado, incluso cero. No se crea automáticamente la OT ni el vencimiento de factura.
5. En **Ver**, revisar lo cotizado, contratado y no contratado, cuenta e historia. **Ver cuenta por cobrar** abre Cobranzas con el mismo saldo.
6. Producción puede usar **Crear trabajo** si todavía no existe OT. Si existe, **Ver trabajo** permite consultarla según permisos.

El contrato confirmado es inmutable. La anulación exige motivo y sólo se permite sin trabajo, abonos —incluidos anulados— ni otros hitos posteriores de la cuenta. No se oculta ni borra una OCC para liberar su vínculo a la oferta. Una OCC genera un único trabajo permanente; obra propia se crea por otro recorrido.

## 11. Planificar y ejecutar un trabajo

### Comercial u obra propia

1. Para una OCC: **Ver OCC → Crear trabajo**, con permisos de Producción. Para fabricación interna: **Trabajos → Órdenes de trabajo → Crear OT → Obra propia**.
2. Revisar líneas y cantidades. Para catálogo, distribuir fabricación y cantidades desde stock; para materia prima directa, revisar abastecimiento; para servicio/a medida, revisar modalidad y materiales cuando corresponda.
3. Revisar recetas, materiales, cantidades y bodegas. **Guardar borrador** no reserva. **Confirmar plan** intenta reservar parcialmente el stock libre sin consumirlo.
4. Revisar reservas propias y faltantes. **Completar reservas** intenta cubrir lo faltante; **liberar** requiere cantidad y motivo y no aumenta stock físico.
5. **Iniciar OT** fija el plan e indica su fecha; no fabrica ni entrega. Un faltante pendiente debe resolverse antes de ejecutar una operación que necesite esa cobertura.

### Fabricación o avance

1. En Ver OT, elegir la acción de registrar fabricación/avance de la línea.
2. Indicar fecha y cantidad; revisar consumos previstos, registrar los reales y justificar diferencias cuando se solicite.
3. Para catálogo, elegir la bodega apta de producto terminado. Para servicio puro, registrar avance sin materiales ficticios; a medida consume sus insumos sin crear un producto de catálogo ficticio.
4. Revisar y confirmar. Catálogo registra salida de materias primas y entrada de terminado; las cantidades desde stock y materia prima directa se entregan sin fabricar de nuevo.
5. Revisar avance neto y stock. Repetir por los lotes realmente ejecutados.

**Revertir registro** corrige un error de producción sólo dentro de sus dependencias y antes del cierre. Exige restitución física real cuando corresponde; conserva registro y reversión. Si hubo despacho histórico o consumo posterior que lo bloquee, una devolución o reposición posterior no elimina esa dependencia. Daño o diferencia de conteo corresponde a Ajustes, no a recuperar una receta ficticiamente.

### Finalización, factura y PDF

1. Con ejecución neta completa y preparación/reservas requeridas, elegir **Finalizar OT**, revisar y confirmar. No existe reapertura o cierre parcial en este alcance.
2. Para trabajo comercial finalizado, **Registrar factura externa**: escribir folio literal y fecha juntos. El vencimiento usa esa fecha y el plazo de la OCC. No es emisión tributaria electrónica.
3. **Corregir factura** exige motivo, conserva revisiones y no cambia importe, abonos ni promesa.
4. En **PDF y versiones**, usar **Generar PDF de esta revisión** y consultar/descargar la emisión archivada. Es una copia operativa de plan/ejecución y referencias; no reemplaza guía ni factura.
5. Usar **Ver cuenta por cobrar** para revisar/cobrar con el perfil financiero autorizado.

Finalizar no acredita entrega ni cobro. La anulación productiva disponible corresponde a obra propia pendiente sin inicio/ejecución; no cancela un contrato comercial. Una obra propia no necesita cliente, OCC, factura ni cuenta por cobrar.

## 12. Entregar y corregir una guía

1. Abrir **Trabajos → Guías de despacho** y seleccionar la OT comercial para preparar la entrega. También se puede acceder desde sus documentos relacionados.
2. Indicar fecha y cantidades efectivamente entregadas, sólo de partidas disponibles para esa OT.
3. Para bienes, revisar bodega de salida y respaldo de reserva/stock. Producto fabricado descuenta terminado sin consumir otra vez su receta. Materia prima directa usa su salida comercial propia.
4. Para servicio o a medida, registrar nombre y fecha de conformidad, con ejecución neta suficiente. No se mueve inventario por acreditar esa prestación.
5. Previsualizar y pulsar **Confirmar salida**. Se guarda folio, cantidades, reservas y movimientos; consultar el documento emitido.
6. Generar/descargar su PDF archivado cuando se necesite. Puede haber entregas parciales antes de finalizar OT, dentro de las cantidades y dependencias vigentes.

Para una devolución/corrección: abrir la entrega original, usar **Corregir guía**, indicar cantidades afectadas y motivo. En bienes, confirmar recepción física en las mismas bodegas de salida. Previsualizar y **Confirmar corrección**. No devolver más de lo entregado pendiente de corregir.

La corrección crea otro documento y conserva el original. Repone bienes realmente recibidos y reconstruye reserva propia para reentregar; en prestaciones revierte sólo la entrega acreditada. No cambia deuda, factura ni pagos. **Preparar otra entrega** requiere permiso de Despacho. **Ver cuenta por cobrar** permite al perfil financiero revisar la misma cuenta de OCC.

Un registro **Legado no conciliado** conserva historia, sin demostrar cantidades nuevas ni reconstruir pagos/folios retrospectivos.

## 13. Cobrar, corregir abonos y adjuntar comprobantes

1. Abrir **Ventas → Cobranza**, buscar cliente/OCC/factura y elegir **Ver cuenta**. También se accede desde OCC, OT o guía.
2. Comparar importe, abonos vigentes, saldo, factura, vencimiento y promesa. Las tarjetas de Cobranzas totalizan el filtro completo, no sólo la página visible; anuladas no suman deuda.
3. Como Cobranza o Administrador, **Registrar abono**: importe positivo, fecha de hoy o pasada según Santiago, medio y referencia opcional. Cheque sólo al cobro efectivo. Puede ser anticipo sin factura.
4. Opcionalmente seleccionar JPG, PNG o PDF de hasta 5 MB. **Revisar operación → Confirmar operación** y comprobar saldo/historial.
5. Para corregir dinero registrado, **Anular abono #…** con motivo y luego registrar el pago correcto como uno nuevo. La anulación no ejecuta una devolución bancaria ni cancela la venta.
6. Para documentar un abono existente, **Adjuntar comprobante**, revisar y confirmar. **Descargar [nombre]** entrega el original autorizado. Agregar un archivo corregido conserva los anteriores.
7. **Cambiar promesa** permite hoy/fecha futura o fecha vacía para quitarla, siempre con motivo; revisar el historial. No cambia el vencimiento contractual ni oculta una deuda vencida.

No se permiten sobrepagos. Si sólo falla el adjunto después de confirmar el pago, el mensaje indica que el abono ya quedó registrado: reintentar sólo el archivo o adjuntarlo después. No volver a cobrar para solucionar un comprobante pendiente.

La cuenta del ejemplo de $100.000 con dos guías sigue debiendo $100.000 antes de abonos. Anticipo $30.000 y pago final $70.000 dejan saldo cero, independientemente del número de entregas.

Detalle de tareas y recuperación: [Operación de Cobranzas](OPERACION-COBRANZAS.md).

## 14. Leer el Dashboard y sus avisos

El Dashboard muestra bloques según los roles: cotizaciones pendientes vigentes/vencidas, OT activas con borradores aparte, cuentas por cobrar y mínimos por material/bodega. En caso de error aparece un aviso; no interpretar ese bloque como cero.

La tabla de materiales compara consumo pendiente de planes activos con físico, reservado, libre y faltante. No suma unidades distintas ni representa todas las salidas comerciales pendientes. Para actuar, abrir Stock/OT/Compras según el caso.

El gráfico de seis meses agrupa por fecha de la cotización: **Cotizado** frente a lo **Contratado** en OCC vigentes de esas mismas ofertas. No representa dinero cobrado ni necesariamente contratos emitidos en ese mes. La tabla bajo las barras muestra los importes exactos.

La campana informa mínimos bajos, cotizaciones por vencer hoy o en siete días y cuentas vencidas de las áreas autorizadas. Se actualiza al navegar/recargar; no envía correos ni gestiona leído/no leído.

Detalle de columnas y definiciones: [Operación del Dashboard](OPERACION-DASHBOARD.md). Su aprobación funcional y medición con volumen representativo siguen pendientes.

## 15. Consultar documentos, PDF y autoría

- El **folio interno** identifica el documento del ERP; no confundirlo con la OC externa del cliente, el número de compra del proveedor o el folio literal de factura externa.
- **Ver** permite consultar contenido/historial sin cambiarlo. Un estado final bloquea ediciones para conservar el hecho; usar la corrección habilitada para ese módulo.
- **Generar PDF** archiva una emisión. **Ver/Descargar** obtiene bytes históricos; no los recalcula con el cliente, logo o receta actuales. Un original ausente o alterado debe recuperarse desde respaldo por el responsable.
- Para imprimir, abrir/descargar el PDF y usar la impresión del visor. Revisar documento y versión antes de entregarlo.
- Como Administrador, abrir **Administración → Auditoría y autoría**; distinguir eventos de acceso/seguridad y autoría de operaciones nuevas. Los documentos anteriores sin evidencia no reciben autores inventados.
- Conservar comprobantes y documentos privados en canales autorizados; cerrar sesión no elimina copias descargadas del equipo.

## 16. Resolver bloqueos y respuestas inciertas

| Situación | Qué hacer |
| --- | --- |
| Falta un botón o no aparece una sección | Revisar roles y estado. Solicitar al Administrador el acceso necesario, sin compartir su cuenta |
| Cambió el documento/catálogo/stock | Actualizar, abrir de nuevo y revisar. Otra persona puede haber confirmado una operación mientras se completaba el formulario |
| Falta una unidad, cliente, sucursal o bodega | Crear/corregir primero el mantenedor con un perfil autorizado; no elegir una referencia incorrecta sólo para guardar |
| Saldo o reserva insuficiente | Consultar stock, reservas y hechos reales; recibir, producir o corregir por el proceso que corresponda |
| Cantidad física no coincide con Kardex | Detener y conciliar la incidencia con el responsable antes de confirmar operaciones dependientes |
| Una anulación/reversión está bloqueada | Revisar el movimiento/documento posterior. Reponer stock no borra esa dependencia |
| No llega confirmación tras guardar | Mantener datos/pantalla y **Reintentar misma operación** cuando se ofrezca; consultar historial antes de iniciar otra solicitud |
| El abono quedó guardado y falló el archivo | Reintentar sólo el comprobante o adjuntarlo desde el pago existente |
| La cuenta cambió al editar promesa | Actualizar antes de revisar y volver a confirmar; no sobrescribir una versión antigua |
| PDF o comprobante ausente/alterado | Solicitar recuperación del original al responsable de operación; no reemplazarlo por otro archivo como si fuera el histórico |
| Vuelve al login | Revisar inactividad, máximo de sesión, cambios de seguridad o cierre remoto; volver a ingresar con la cuenta personal |

Los formularios con resultado incierto pueden bloquear edición/cierre para proteger un reintento. Si se perdió la pantalla, consultar primero el historial de documentos/pagos antes de registrar otro. No asumir que una falta de respuesta significa que nada se guardó.

Para informar una incidencia, indicar módulo, acción, documento de prueba/folio, fecha, rol y mensaje. Las capturas deben ocultar contraseñas, códigos, invitaciones, RUT/datos personales innecesarios y comprobantes privados. No ejecutar SQL, seed, restauraciones ni borrar carpetas para resolver errores de usuario.

## 17. Recorrer un caso completo

Caso ilustrativo para una copia de pruebas o capacitación con datos ficticios:

1. Bodega registra una compra y recibe la parte que llegó; comprueba stock/Kardex.
2. Ventas prepara una cotización, revisa PDF y registra la aceptación parcial/completa en OCC.
3. Cobranza recibe un anticipo real de prueba y lo registra en la cuenta de esa OCC, todavía sin factura.
4. Producción crea la OT comercial, confirma plan, revisa/completa reservas e inicia.
5. Registra fabricación/avance con consumos reales y revisa terminado o prestación ejecutada.
6. Despacho confirma una entrega parcial con bodega o conformidad correctas; registra después lo restante.
7. Producción finaliza la OT; Cobranza/Administrador registra la factura externa y comprueba vencimiento histórico.
8. Cobranza registra el pago final y su comprobante. El saldo deriva de los abonos vigentes, sin repetir deuda por guía.
9. Si hubo un error de abono, anula con motivo y registra la corrección. Si hubo devolución de bienes, Despacho registra recepción física en la bodega original y eventual reentrega; la deuda permanece según el contrato.
10. Administrador revisa autoría y el responsable técnico verifica el respaldo de base y archivos.

Para una obra propia, comenzar en **Crear OT → Obra propia**; planificar, producir y finalizar sin inventar cliente/OCC/cuenta. No usar el circuito de despacho comercial para simular una venta inexistente.

No crear pagos, compras o movimientos ficticios en la instalación de trabajo sólo para practicar este manual. Solicitar una copia de capacitación preparada para ello.

## 18. Límites actuales y entrega al responsable de operación

No están disponibles el ingreso con Google pospuesto, emisión tributaria electrónica integrada, envío automático de cotizaciones por correo, traslados específicos de terminado ni alertas por correo/leído/no leído. Las referencias de factura/guía internas no se presentan como emisión electrónica del SII.

El manual describe funciones implementadas; las aprobaciones funcionales C3/C4 de Cobranzas, Dashboard y los bloques restantes de S7 siguen pendientes. Tampoco acredita servidor definitivo, HTTPS/tareas programadas reales o carga representativa. La revisión de usabilidad se registra en [REVISION-USABILIDAD-V1.md](REVISION-USABILIDAD-V1.md).

El responsable de operación debe conservar PostgreSQL **y** logos, imágenes, PDF históricos y comprobantes, además de configuración/claves privadas. Recuperar sólo la base no recupera los archivos. La restauración se ensaya en un destino aislado y sigue el procedimiento de revocación/conciliación de seguridad antes de abrir acceso.

Guías específicas:

- [Seguridad y operación técnica](OPERACION-SEGURIDAD.md).
- [Órdenes de Trabajo](OPERACION-ORDENES-TRABAJO.md).
- [Guías de Despacho](OPERACION-GUIAS-DESPACHO.md).
- [Cobranzas](OPERACION-COBRANZAS.md).
- [Dashboard](OPERACION-DASHBOARD.md).

La instalación, actualizaciones, pruebas y respaldo se encargan al responsable técnico. El uso diario se realiza mediante la interfaz y la cuenta personal; no requiere acceso a PostgreSQL ni al repositorio.


### Altas de clientes durante una venta — 26-10-2026

En una cotización nueva, editable o de corrección, usar **Crear cliente** junto al selector de Cliente. Se abre el formulario del mantenedor, con datos generales y sucursales; completar Casa Central mediante su acción Editar antes de guardar. Al crear, se seleccionan el cliente y Casa Central, conservando fecha, líneas, importes y detalle técnico de la cotización. Cancelar el alta no cambia la selección anterior. Si el cliente ya fue creado, cancelar luego la cotización no lo elimina. No cambia el cliente de una OCC histórica: las ventas comienzan en Cotizaciones.

Crear proveedor exige permisos de operación de Compras y Proveedores; crear cliente, de Cotizaciones y Clientes. Se mantienen validación de RUT, controles de duplicados y permisos de servidor. Los mantenedores completos siguen disponibles para consultar, editar o eliminar según sus reglas. Los accesos dentro del documento permiten crear registros nuevos. El PDF anterior del manual no incorpora todavía estas adiciones.


### Cotizaciones con precios netos — 26-10-2026

Ejemplo: una unidad a $100.000 netos y tasa 19% produce NETO $100.000, IVA $19.000 y TOTAL $119.000. Con descuento de 10%, NETO $90.000, IVA $17.100 y TOTAL $107.100. Se redondea cada línea al peso, se suma, se aplica descuento y se redondea el IVA sobre el neto descontado.

Las cotizaciones anteriores mantienen precios con IVA incluido y muestran un aviso al consultar o editar; no se recalculan por actualizar el sistema. Al corregir una antigua se propone una oferta nueva con precios netos, convirtiendo precios y descuento fijo con la tasa histórica y redondeando al peso; revisar antes de guardar porque el total puede variar por redondeo. La OCC conserva la modalidad y el IVA de su oferta, incluso al aceptar cantidades parciales; su cuenta por cobrar usa el total con IVA. Los PDF ya emitidos conservan sus bytes; las nuevas emisiones identifican Precio neto o Precio con IVA según el documento.

El precio sugerido del catálogo de Productos conserva su definición anterior con IVA incluido: no se copia automáticamente como precio neto en las nuevas líneas; indicar el valor neto correspondiente. El PDF previo de este manual aún no contiene estos cambios.


### Grilla de detalles en Compras — 27-10-2026

La compra nueva comienza sin filas. Usar **Agregar detalle de compra** para ingresar cada material en un diálogo. **Aceptar detalle** sólo actualiza el borrador del documento, sin registrar stock ni la compra. Si el material no existe, **Crear materia prima** está disponible dentro de este diálogo; al crear queda seleccionado y el detalle debe aceptarse para incorporarlo a la grilla. El catálogo creado persiste aunque se descarte ese detalle.

**Editar** abre un borrador de la fila; cancelar o descartar conserva su valor anterior. **Quitar** pide confirmación y se puede quitar la última fila, pero la compra no se puede guardar sin al menos un detalle. Los precios de líneas ya guardadas permanecen protegidos. En consulta o después de recepciones/cierres se permite **Ver**, conservando cantidades recibidas/cerradas/pendientes y vínculo al Kardex para líneas guardadas; no se habilitan edición ni eliminación de líneas bloqueadas.

La tabla permite desplazamiento horizontal en pantallas pequeñas. Estos cambios aún no están en el PDF anterior del manual.
