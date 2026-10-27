import { tienePermiso, type PermisoSeguridad } from "@/lib/seguridad/permisos";
import {
  CalendarDays, Banknote, Building2, ClipboardList, FileText, Hammer, LayoutDashboard,
  Package, PackageSearch, Ruler, SlidersHorizontal, Truck, Users, Warehouse,
  ShoppingCart, ArrowLeftRight, type LucideIcon,
} from "lucide-react";

export type ElementoNavegacion = {
  titulo: string;
  ruta: string;
  icono: LucideIcon;
  descripcion: string;
  permiso?: PermisoSeguridad;
};

export type GrupoNavegacion = { titulo: string; elementos: ElementoNavegacion[] };

export const navegacion: GrupoNavegacion[] = [
  { titulo: "Inicio", elementos: [
    { titulo: "Dashboard", ruta: "/", icono: LayoutDashboard, descripcion: "Una vista general de tu taller, tus materiales y tus trabajos." },
  ] },
  { titulo: "Mantenedores", elementos: [
    { titulo: "Productos", ruta: "/mantenedores/productos", permiso: "catalogos.leer", icono: Package, descripcion: "Organiza productos terminados, imágenes y recetas de materiales." },
    { titulo: "Materias primas", ruta: "/mantenedores/materiales", permiso: "catalogos.leer", icono: Package, descripcion: "Organiza el catálogo de materiales y sus unidades de medida." },
    { titulo: "Unidades de medida", ruta: "/mantenedores/unidades", permiso: "catalogos.leer", icono: Ruler, descripcion: "Define las unidades utilizadas para medir tus materiales." },
    { titulo: "Bodegas", ruta: "/mantenedores/bodegas", permiso: "catalogos.leer", icono: Warehouse, descripcion: "Organiza las bodegas donde almacenas tus materiales." },
    { titulo: "Proveedores", ruta: "/mantenedores/proveedores", permiso: "proveedores.leer", icono: Truck, descripcion: "Mantén los datos de contacto de tus proveedores." },
    { titulo: "Condiciones de Pago", ruta: "/mantenedores/condiciones-pago", permiso: "configuracion.leer", icono: Banknote, descripcion: "Define los plazos de pago para cotizaciones y órdenes de clientes." },
    { titulo: "Clientes", ruta: "/mantenedores/clientes", permiso: "clientes.leer", icono: Users, descripcion: "Mantén los datos de tus clientes para cotizar y gestionar ventas." },
  ] },
  { titulo: "Inventario", elementos: [
    { titulo: "Productos terminados", ruta: "/inventario/productos-terminados", permiso: "inventario.leer", icono: Package, descripcion: "Consulta stock y movimientos e ingresa existencias iniciales de producto terminado." },
    { titulo: "Stock por bodega", ruta: "/inventario/stock", permiso: "inventario.leer", icono: PackageSearch, descripcion: "Consulta existencias y mínimos de reposición por material y bodega." },
    { titulo: "Movimientos", ruta: "/inventario/movimientos", permiso: "inventario.leer", icono: ArrowLeftRight, descripcion: "Revisa las entradas, salidas y ajustes de materiales en el kardex." },
    { titulo: "Traslados", ruta: "/inventario/traslados", permiso: "traslados.leer", icono: Truck, descripcion: "Traslada materiales entre bodegas conservando su historial." },
    { titulo: "Ajustes de stock", ruta: "/inventario/ajustes", permiso: "ajustes.leer", icono: SlidersHorizontal, descripcion: "Registra correcciones de inventario y sus motivos." },
  ] },
  { titulo: "Compras", elementos: [
    { titulo: "Compras", ruta: "/compras", permiso: "compras.leer", icono: ShoppingCart, descripcion: "Gestiona las compras y la recepción de materiales en cada bodega." },
  ] },
  { titulo: "Ventas", elementos: [
    { titulo: "Cotizaciones", ruta: "/ventas/cotizaciones", permiso: "cotizaciones.leer", icono: FileText, descripcion: "Prepara y revisa las cotizaciones de tus clientes." },
    { titulo: "Órdenes de Compra Cliente", ruta: "/ventas/ordenes", permiso: "ordenes_cliente.leer", icono: ClipboardList, descripcion: "Registra lo contratado de cada cotización y consulta sus importes e historial." },
    { titulo: "Cobranza", ruta: "/ventas/cobranza", permiso: "cobranza.leer", icono: Banknote, descripcion: "Consulta cuentas por cobrar, vencimientos y abonos por venta." },
  ] },
  { titulo: "Trabajos", elementos: [
    { titulo: "Órdenes de trabajo", ruta: "/trabajos/ordenes", permiso: "trabajos.leer", icono: Hammer, descripcion: "Organiza la producción para tus clientes y las obras propias." },
    { titulo: "Guías de despacho", ruta: "/trabajos/despachos", permiso: "guias.leer", icono: Truck, descripcion: "Gestiona las entregas y los documentos de despacho." },
  ] },
  { titulo: "Acceso", elementos: [
    { titulo: "Mi acceso", ruta: "/mi-acceso", icono: Users, descripcion: "Administra tu contraseña, doble factor y sesiones personales." },
  ] },
  { titulo: "Administración", elementos: [
    { titulo: "Usuarios y roles", ruta: "/administracion/usuarios", permiso: "usuarios.administrar", icono: Users, descripcion: "Gestiona las cuentas y sus permisos." },
    { titulo: "Auditoría y autoría", ruta: "/administracion/auditoria", permiso: "auditoria.leer", icono: ClipboardList, descripcion: "Consulta accesos y responsables de operaciones nuevas." },
  ] },
  { titulo: "Configuración", elementos: [
    { titulo: "IVA", ruta: "/configuracion/iva", permiso: "configuracion.leer", icono: CalendarDays, descripcion: "Configura tasas de IVA por fecha de documento y períodos históricos." },
    { titulo: "Numeración", ruta: "/configuracion/numeracion", permiso: "configuracion.leer", icono: FileText, descripcion: "Configura los folios internos de cotizaciones, órdenes y guías." },
    { titulo: "Empresa", ruta: "/configuracion/empresa", permiso: "configuracion.leer", icono: Building2, descripcion: "Configura los datos de tu empresa para cotizaciones y documentos." },
  ] },
];

export const elementosNavegacion = navegacion.flatMap((grupo) => grupo.elementos);

export function rutaEstaActiva(actual: string, destino: string) {
  return destino === "/" ? actual === "/" : actual === destino || actual.startsWith(`${destino}/`);
}

export function obtenerNavegacion(ruta: string) {
  const elemento = elementosNavegacion
    .filter((item) => rutaEstaActiva(ruta, item.ruta))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];
  const grupo = navegacion.find((item) => item.elementos.includes(elemento));
  return { elemento, grupo };
}

export function navegacionPermitida(roles: readonly string[]) {
 return navegacion.map(g => ({...g, elementos: g.elementos.filter(e => !e.permiso || tienePermiso(roles,e.permiso))})).filter(g => g.elementos.length);
}
