import {
  Banknote, Building2, ClipboardList, FileText, Hammer, LayoutDashboard,
  Package, PackageSearch, Ruler, SlidersHorizontal, Truck, Users, Warehouse,
  ShoppingCart, ArrowLeftRight, type LucideIcon,
} from "lucide-react";

export type ElementoNavegacion = {
  titulo: string;
  ruta: string;
  icono: LucideIcon;
  descripcion: string;
  roles?: readonly string[];
};

export type GrupoNavegacion = { titulo: string; elementos: ElementoNavegacion[] };

export const navegacion: GrupoNavegacion[] = [
  { titulo: "Inicio", elementos: [
    { titulo: "Dashboard", ruta: "/", icono: LayoutDashboard, descripcion: "Una vista general de tu taller, tus materiales y tus trabajos." },
  ] },
  { titulo: "Mantenedores", elementos: [
    { titulo: "Materias primas", ruta: "/mantenedores/materiales", icono: Package, descripcion: "Organiza el catálogo de materiales y sus unidades de medida." },
    { titulo: "Unidades de medida", ruta: "/mantenedores/unidades", icono: Ruler, descripcion: "Define las unidades utilizadas para medir tus materiales." },
    { titulo: "Bodegas", ruta: "/mantenedores/bodegas", icono: Warehouse, descripcion: "Organiza las bodegas donde almacenas tus materiales." },
    { titulo: "Proveedores", ruta: "/mantenedores/proveedores", icono: Truck, descripcion: "Mantén los datos de contacto de tus proveedores." },
    { titulo: "Condiciones de Pago", ruta: "/mantenedores/condiciones-pago", icono: Banknote, descripcion: "Define los plazos de pago para cotizaciones y órdenes de clientes." },
    { titulo: "Clientes", ruta: "/mantenedores/clientes", icono: Users, descripcion: "Mantén los datos de tus clientes para cotizar y gestionar ventas." },
  ] },
  { titulo: "Inventario", elementos: [
    { titulo: "Stock por bodega", ruta: "/inventario/stock", icono: PackageSearch, descripcion: "Consulta existencias y mínimos de reposición por material y bodega." },
    { titulo: "Movimientos", ruta: "/inventario/movimientos", icono: ArrowLeftRight, descripcion: "Revisa las entradas, salidas y ajustes de materiales en el kardex." },
    { titulo: "Traslados", ruta: "/inventario/traslados", icono: Truck, descripcion: "Traslada materiales entre bodegas conservando su historial." },
    { titulo: "Ajustes de stock", ruta: "/inventario/ajustes", icono: SlidersHorizontal, descripcion: "Registra correcciones de inventario y sus motivos." },
  ] },
  { titulo: "Compras", elementos: [
    { titulo: "Compras", ruta: "/compras", icono: ShoppingCart, descripcion: "Gestiona las compras y la recepción de materiales en cada bodega." },
  ] },
  { titulo: "Ventas", elementos: [
    { titulo: "Cotizaciones", ruta: "/ventas/cotizaciones", icono: FileText, descripcion: "Prepara y revisa las cotizaciones de tus clientes." },
    { titulo: "Órdenes de venta", ruta: "/ventas/ordenes", icono: ClipboardList, descripcion: "Organiza las ventas confirmadas y sus trabajos asociados." },
    { titulo: "Cobranza", ruta: "/ventas/cobranza", icono: Banknote, descripcion: "Consulta cuentas por cobrar, vencimientos y abonos por venta." },
  ] },
  { titulo: "Trabajos", elementos: [
    { titulo: "Órdenes de trabajo", ruta: "/trabajos/ordenes", icono: Hammer, descripcion: "Organiza la producción para tus clientes y las obras propias." },
    { titulo: "Guías de despacho", ruta: "/trabajos/despachos", icono: Truck, descripcion: "Gestiona las entregas y los documentos de despacho." },
  ] },
  { titulo: "Configuración", elementos: [
    { titulo: "Empresa", ruta: "/configuracion/empresa", icono: Building2, descripcion: "Configura los datos de tu empresa para cotizaciones y documentos." },
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
