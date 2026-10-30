"use client";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export function DetalleCuenta({ children, cerrar }: { children: React.ReactNode; cerrar: string }) {
  const router = useRouter();
  return <Dialog open onOpenChange={open => { if (!open) router.replace(cerrar, { scroll: false }); }}><DialogContent className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain sm:max-w-6xl"><DialogHeader><DialogTitle>Detalle de cuenta por cobrar</DialogTitle><DialogDescription>La cuenta pertenece a una OCC; sus entregas no generan deudas adicionales.</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}
