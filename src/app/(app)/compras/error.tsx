"use client";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
export default function ErrorCompras({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <Aviso titulo="No se pudieron consultar las compras">
      <Button
        onClick={() => {
          router.refresh();
          reset();
        }}
        variant="outline"
        className="mt-3"
      >
        Reintentar
      </Button>
    </Aviso>
  );
}
