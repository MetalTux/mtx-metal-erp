import Link from "next/link";
export default function AccesoDenegado() {
  return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-semibold">Acceso no permitido</h1><p>Tu sesión no tiene permiso para esta tarea. Si necesitas acceso, consulta al Administrador.</p><Link href="/" className="text-info-foreground underline">Volver al Dashboard</Link></main>;
}
