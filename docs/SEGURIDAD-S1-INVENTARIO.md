# S1 — Inventario técnico de entradas a proteger

Inventario inicial: 20-10-2026; conectado en S4 el 21-10-2026. **Las entradas de este inventario ya comprueban sesión y permisos en servidor**. Permisos del catálogo `src/lib/seguridad/permisos.ts`. Cada escritura incluye corrección/anulación de su área; además conserva sus validaciones de negocio. Revisar este inventario si se agregan exports o rutas.

## Páginas del ERP

| Ruta | Capacidad de entrada |
| --- | --- |
| `/compras` | `compras.leer` |
| `/configuracion/empresa` | `configuracion.leer` |
| `/configuracion/iva` | `configuracion.leer` |
| `/configuracion/numeracion` | `configuracion.leer` |
| `/inventario/ajustes` | `ajustes.leer` |
| `/inventario/movimientos` | `inventario.leer` |
| `/inventario/productos-terminados` | `inventario.leer` |
| `/inventario/stock` | `inventario.leer` |
| `/inventario/traslados` | `traslados.leer` |
| `/mantenedores/bodegas` | `catalogos.leer` |
| `/mantenedores/clientes` | `clientes.leer` |
| `/mantenedores/condiciones-pago` | `configuracion.leer` |
| `/mantenedores/materiales` | `catalogos.leer` |
| `/mantenedores/productos` | `catalogos.leer` |
| `/mantenedores/proveedores` | `proveedores.leer` |
| `/mantenedores/unidades` | `catalogos.leer` |
| `/` | Sesión completa; indicadores filtrados por permisos. |
| `/trabajos/despachos` | `guias.leer` |
| `/trabajos/ordenes` | `trabajos.leer` |
| `/ventas/cobranza` | `cobranza.leer` |
| `/ventas/cotizaciones` | `cotizaciones.leer` |
| `/ventas/ordenes` | `ordenes_cliente.leer` |

En páginas/consultas, sólo enviar los datos de cada rol. Un destino interno no autorizado se rechaza aunque el menú lo oculte.

## Server Actions

Lecturas y listas requieren permiso de lectura. Previsualizaciones de una operación y emisión de PDF son parte de operar; descargar un archivo ya archivado es lectura autorizada del documento. Las acciones que mezclan lectura/escritura aplicarán ambas necesidades por rama.

| Archivo | Export | Permiso requerido |
| --- | --- | --- |
| `app/(app)/compras/actions.ts` | `obtenerCompra` | `compras.leer` |
| `app/(app)/compras/actions.ts` | `calcularDatosCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `guardarDatosCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `eliminarDatosCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `registrarRecepcionCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `calcularRecepcionCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `cerrarDatosPendienteCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `anularDatosCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `calcularEquivalenciaCompra` | `compras.operar` |
| `app/(app)/compras/actions.ts` | `calcularDetalleCompra` | `compras.operar` |
| `app/(app)/configuracion/empresa/actions.ts` | `consultarPerfilEmpresa` | `configuracion.leer` |
| `app/(app)/configuracion/empresa/actions.ts` | `guardarPerfilEmpresa` | `configuracion.operar` |
| `app/(app)/configuracion/empresa/cuentas-actions.ts` | `consultarCuentasEmpresa` | `configuracion.leer` |
| `app/(app)/configuracion/empresa/cuentas-actions.ts` | `guardarCuentaEmpresa` | `configuracion.operar` |
| `app/(app)/configuracion/empresa/cuentas-actions.ts` | `cambiarPrincipalEmpresa` | `configuracion.operar` |
| `app/(app)/configuracion/empresa/cuentas-actions.ts` | `cambiarEstadoCuentaEmpresa` | `configuracion.operar` |
| `app/(app)/configuracion/iva/actions.ts` | `guardarIva` | `configuracion.operar` |
| `app/(app)/configuracion/iva/actions.ts` | `eliminarIva` | `configuracion.operar` |
| `app/(app)/configuracion/numeracion/actions.ts` | `guardarNumeracion` | `configuracion.operar` |
| `app/(app)/inventario/ajustes/actions.ts` | `obtenerSaldoAjuste` | `ajustes.leer` |
| `app/(app)/inventario/ajustes/actions.ts` | `prepararConfirmacionAjuste` | `ajustes.operar` |
| `app/(app)/inventario/ajustes/actions.ts` | `guardarDatosAjuste` | `ajustes.operar` |
| `app/(app)/inventario/productos-terminados/actions.ts` | `revisarSaldoTerminado` | `inventario.leer` |
| `app/(app)/inventario/productos-terminados/actions.ts` | `ingresarInicialTerminado` | `inventario.operar` |
| `app/(app)/inventario/productos-terminados/actions.ts` | `ajustarTerminado` | `inventario.operar` |
| `app/(app)/inventario/productos-terminados/actions.ts` | `prepararConfirmacionTerminado` | `inventario.operar` |
| `app/(app)/inventario/stock/actions.ts` | `obtenerConfiguracionMinimo` | `inventario.leer` |
| `app/(app)/inventario/stock/actions.ts` | `guardarDatosMinimo` | `inventario.operar` |
| `app/(app)/inventario/traslados/actions.ts` | `obtenerSaldosTraslado` | `traslados.leer` |
| `app/(app)/inventario/traslados/actions.ts` | `prepararConfirmacionTraslado` | `traslados.operar` |
| `app/(app)/inventario/traslados/actions.ts` | `guardarDatosTraslado` | `traslados.operar` |
| `app/(app)/mantenedores/bodegas/actions.ts` | `obtenerBodega` | `catalogos.leer` |
| `app/(app)/mantenedores/bodegas/actions.ts` | `guardarDatosBodega` | `catalogos.operar` |
| `app/(app)/mantenedores/bodegas/actions.ts` | `eliminarDatosBodega` | `catalogos.operar` |
| `app/(app)/mantenedores/clientes/actions.ts` | `obtenerCliente` | `clientes.leer` |
| `app/(app)/mantenedores/clientes/actions.ts` | `guardarDatosCliente` | `clientes.operar` |
| `app/(app)/mantenedores/clientes/actions.ts` | `eliminarDatosCliente` | `clientes.operar` |
| `app/(app)/mantenedores/condiciones-pago/actions.ts` | `obtenerCondicion` | `configuracion.leer` |
| `app/(app)/mantenedores/condiciones-pago/actions.ts` | `guardarCondicionPago` | `configuracion.operar` |
| `app/(app)/mantenedores/condiciones-pago/actions.ts` | `eliminarCondicionPago` | `configuracion.operar` |
| `app/(app)/mantenedores/materiales/actions.ts` | `obtenerMaterial` | `catalogos.leer` |
| `app/(app)/mantenedores/materiales/actions.ts` | `guardarDatosMaterial` | `catalogos.operar` |
| `app/(app)/mantenedores/materiales/actions.ts` | `eliminarDatosMaterial` | `catalogos.operar` |
| `app/(app)/mantenedores/productos/actions.ts` | `obtenerProducto` | `catalogos.leer` |
| `app/(app)/mantenedores/productos/actions.ts` | `guardarDatosProducto` | `catalogos.operar` |
| `app/(app)/mantenedores/productos/actions.ts` | `eliminarDatosProducto` | `catalogos.operar` |
| `app/(app)/mantenedores/proveedores/actions.ts` | `obtenerProveedor` | `proveedores.leer` |
| `app/(app)/mantenedores/proveedores/actions.ts` | `guardarDatosProveedor` | `proveedores.operar` |
| `app/(app)/mantenedores/proveedores/actions.ts` | `eliminarDatosProveedor` | `proveedores.operar` |
| `app/(app)/mantenedores/unidades/actions.ts` | `obtenerUnidad` | `catalogos.leer` |
| `app/(app)/mantenedores/unidades/actions.ts` | `guardarUnidadMedida` | `catalogos.operar` |
| `app/(app)/mantenedores/unidades/actions.ts` | `eliminarUnidadMedida` | `catalogos.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `previsualizarSalida` | `guias.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `confirmarSalida` | `guias.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `previsualizarCorreccion` | `guias.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `confirmarCorreccion` | `guias.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `emitirDocumentoGuia` | `guias.operar` |
| `app/(app)/trabajos/despachos/actions.ts` | `consultarDocumentosGuia` | `guias.leer` |
| `app/(app)/trabajos/ordenes/actions.ts` | `guardar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `consultar` | `trabajos.leer` |
| `app/(app)/trabajos/ordenes/actions.ts` | `preparar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `completar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `liberar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `iniciar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `prepararLote` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `previsualizarLote` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `registrarLote` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `previsualizarReversion` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `revertir` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `anularPropia` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `previsualizarCierre` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `finalizar` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `facturar` | `facturas.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `emitirPdfTrabajo` | `trabajos.operar` |
| `app/(app)/trabajos/ordenes/actions.ts` | `consultarPdfsTrabajo` | `trabajos.leer` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `guardar` | `cotizaciones.operar` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `resolver` | `cotizaciones.operar` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `consultar` | `cotizaciones.leer` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `subirImagen` | `cotizaciones.operar` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `previsualizar` | `cotizaciones.operar` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `emitirPdf` | `cotizaciones.operar` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `consultarPdfs` | `cotizaciones.leer` |
| `app/(app)/ventas/cotizaciones/actions.ts` | `actualizarEmisor` | `cotizaciones.operar` |
| `app/(app)/ventas/ordenes/actions.ts` | `consultarOferta` | `ordenes_cliente.leer` |
| `app/(app)/ventas/ordenes/actions.ts` | `consultarOrden` | `ordenes_cliente.leer` |
| `app/(app)/ventas/ordenes/actions.ts` | `registrar` | `ordenes_cliente.operar` |
| `app/(app)/ventas/ordenes/actions.ts` | `anular` | `ordenes_cliente.operar` |
| `app/(app)/ventas/ordenes/actions.ts` | `previsualizar` | `ordenes_cliente.operar` |

## Rutas de archivos

| Ruta | Capacidad y relación a comprobar |
| --- | --- |
| `/api/empresa/logo/[archivo]` | Sesión completa + referencia histórica o perfil visible. No abrir almacén completo con una clave arbitraria. Logo público del login, si se necesita, mediante recurso estático separado. |
| `/api/productos/imagenes/[archivo]` | `catalogos.leer`, o documento autorizado que use esa imagen; sólo sus referencias. |
| `/api/cotizaciones/imagenes/[archivo]` | `cotizaciones.leer` + acceso al documento y su referencia. |
| `/api/cotizaciones/pdfs/[emision]` | `cotizaciones.leer` + `precios.leer`, emisión vinculada y archivo íntegro. |
| `/api/trabajos/pdfs/[emision]` | `trabajos.leer` + emisión de esa OT; comprobar datos financieros incluidos antes de permitir al perfil operativo. No editar bytes históricos para ocultar datos. |
| `/api/guias/pdfs/[emision]` | `guias.leer` + emisión de esa guía y archivo íntegro. |

## Servicios, consultas y DTO

Las entradas anteriores delegan en `src/lib/servicios/` y `src/lib/consultas/`; deben aceptar/obtener contexto de sesión confiable y exigir permiso en servidor, no confiar en un actor enviado por cliente. La comprobación del layout no sustituye la de acciones ni la del servicio antes de confirmar. Los módulos compartidos de importes, fechas y render no obtienen sesión por sí solos; reciben sólo datos ya autorizados.

| Familia de servicios/consultas | Capacidad | Consideración |
| --- | --- | --- |
| `unidades-medida, bodegas, materiales, productos` | `catalogos` | Escrituras Compras/Bodega; lecturas mínimas para otras áreas. |
| `clientes` | `clientes` | Ventas opera; Producción/Cobranza consultan referencias sin alterar. |
| `proveedores, compras` | `proveedores / compras` | Compras/Bodega y Administrador; compras y Kardex deben preservar sus transacciones. |
| `empresa, cuentas-bancarias, iva, numeracion, condiciones-pago` | `configuracion` | Sólo Administrador escribe; lectura comercial limitada y selectores de tarea separados. |
| `inventario, minimos-inventario, stock-terminado` | `inventario` | Ocultar precios/costos salvo permisos; cantidades y mínimos no son dinero. |
| `ajustes-inventario, ajustes-terminado, traslados-inventario` | `ajustes / traslados` | Corregir/anular en área, mínimos/stock/Kardex atómicos. |
| `cotizaciones, imagenes-cotizacion, pdfs-cotizacion` | `cotizaciones` | Precio, importes y condiciones históricas sólo con precios.leer. |
| `ordenes-compra-cliente` | `ordenes_cliente` | Producción puede leer referencia operativa sin cuenta/importes completos. |
| `ordenes-trabajo, reservas-stock, produccion, reversiones-produccion` | `trabajos` | Crear/planificar/iniciar/fabricar/reservar/revertir son operar; no mostrar finance a taller. |
| `cierre-trabajo` | `trabajos / facturas` | Finalización: trabajos.operar. Factura/corrección: facturas.operar, aunque la acción esté en pantalla OT. |
| `guias-despacho, pdfs-guia` | `guias` | Emitir/corregir: operar; lectura e historial conservan contexto OT/OCC. |
| `pdfs-trabajo` | `trabajos` | Emitir requiere operar; descarga según contenido y rol. |
| `Cobranza futura` | `cobranza` | Abonos/anulaciones por Cobranza cuando se implemente; no inventar servicio actual. |

### Campos sensibles y permisos combinados

- `costos.leer`: precios/importes de Compras y datos de costo que se incorporen a reportes. Compras/Bodega, Consulta/Gerencia y Administrador.
- `precios.leer`: precios/importes comerciales, deuda/abonos/factura y resúmenes financieros. Ventas, Cobranza, Consulta/Gerencia y Administrador; ver una cuenta sigue requiriendo el recurso correspondiente.
- DTO de OT para Producción/Despacho: líneas, materiales, cantidades, ejecución/reservas y destino/contacto necesarios; excluir finance, importes de OCC, datos bancarios y facturas no necesarias.
- DTO mínimos de catálogos (por ejemplo unidades para Ventas o condición de pago en cotización) se entregan desde la tarea autorizada, no otorgando lectura integral de configuración.
- Consulta/Gerencia no consulta auditoría de seguridad ni usuarios, pese a su lectura de negocio.
- El Administrador no recibe una excepción a titularidad del TOTP; `esTitularDelFactor` exige actor y titular iguales.
- La unión de permisos permite que una persona de Producción con Ventas vea también datos comerciales; no hay denegaciones particulares que anulen lo otorgado por otro rol.

## Cobertura y continuación

Inventario actual: 87 Server Actions, 22 páginas del ERP y 6 rutas de archivos. No cubre futuras rutas; S4 debe automatizar la detección de entradas nuevas sin política y probar positivos/negativos de cada perfil. No se cuentan como protegidas por estar en esta lista.

## Ampliación S2 — entradas nuevas (20-10-2026)

El inventario anterior describe S1. S2 no agrega Server Actions: agrega estas entradas ya protegidas, que S4 debe conservar al extender la autorización al resto:

| Entrada | Política S2 |
| --- | --- |
| `/ingresar`, `/activar`, `/recuperar` | Públicas sólo para su función; credenciales/token/desafío se validan en servidor, sin registro público. |
| `/mi-acceso` | Sesión completa y activa; operaciones siempre sobre el titular obtenido de cookie. |
| `/administracion/usuarios` | Sesión completa + `usuarios.administrar`; escrituras con reautenticación reciente y revisión. |
| `POST /api/seguridad` | Origen/cuerpo/tamaño estrictos; política por acción en servicio. Operaciones anónimas limitadas a login, desafío, recuperación y consumo de invitación/token. Las demás exigen sesión, y las administrativas rol correspondiente. |
| CLI de provisión/recuperación | Sin ruta HTTP, terminal interactiva y PostgreSQL local; no es un bypass del factor. |

Las 87 acciones y seis rutas de archivos anteriores siguen pendientes de integración S4. No trasladar automáticamente al resto del ERP la protección de estas entradas nuevas. Detalles y operación en [OPERACION-SEGURIDAD.md](OPERACION-SEGURIDAD.md).


## Conexión S4 — 21-10-2026

Cobertura ejecutable en `tests/seguridad-s4-cobertura.ts`: 24 páginas, 87 acciones con permiso/origen, seis rutas de archivos y 119 entradas asíncronas de consultas/servicios. `consultarOferta` valida lectura en la acción y exige además operar OCC y leer precios en `obtenerOfertaParaOrden`; su selector de creación sólo se carga para quien puede operar. El contexto operativo de una OCC sin precios se proyecta sin información financiera; el acceso comercial conserva sus importes. Las funciones puras de cálculo y auxiliares internos que reciben una transacción no se exponen como Server Actions. No agregar exports nuevos sin extender inventario y cobertura.

Referencia de arquitectura consultada: [autenticación y autorización de Next.js](https://nextjs.org/docs/app/guides/authentication), controles próximos a los datos y comprobación independiente en Server Actions; el layout no sustituye esas comprobaciones.


## Ampliación S5

| Archivo | Export | Permiso requerido |
| --- | --- | --- |
| `app/(app)/administracion/auditoria/actions.ts` | `depurarEventos` | `auditoria.leer` |

La depuración exige además origen válido, Administrador y reautenticación de menos de cinco minutos dentro de la transacción. `/administracion/auditoria` y sus consultas exigen `auditoria.leer`. El visor distingue eventos con retención y autoría permanente; no expone tokens ni claves de idempotencia. Las rutas de archivos no cambian.


## Cobranzas C2 — entradas nuevas (24-10-2026)

| Archivo | Acción | Permiso |
| --- | --- | --- |
| `app/(app)/ventas/cobranza/actions.ts` | `registrar` | `cobranza.operar` |
| `app/(app)/ventas/cobranza/actions.ts` | `anular` | `cobranza.operar` |

| `app/(app)/ventas/cobranza/actions.ts` | `adjuntar` | `cobranza.operar` |
| `app/(app)/ventas/cobranza/actions.ts` | `prometer` | `cobranza.operar` |
