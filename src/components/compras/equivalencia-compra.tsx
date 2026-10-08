"use client";
import { useEffect, useState } from "react";
import { calcularEquivalenciaCompra } from "@/app/(app)/compras/actions";
import { formatearCantidad } from "@/lib/formato";
/** Retrasar la consulta evita una acción por pulsación; ignorar respuestas de valores anteriores. */
export function EquivalenciaCompra({
  cantidad,
  factor,
  presentacion,
  unidad,
}: {
  cantidad: string;
  factor: string;
  presentacion: string;
  unidad: string;
}) {
  const [resultado, setResultado] = useState<{
    entrada: string;
    texto: string;
  }>();
  const entrada = JSON.stringify([cantidad, factor, unidad]);
  useEffect(() => {
    let vigente = true;
    const timer = setTimeout(async () => {
      try {
        const r = await calcularEquivalenciaCompra({
          purchasedQuantity: cantidad,
          unitFactor: factor,
        });
        if (vigente)
          setResultado({
            entrada: JSON.stringify([cantidad, factor, unidad]),
            texto: r.ok
              ? `${formatearCantidad(r.cantidad)} ${unidad}`
              : r.mensaje,
          });
      } catch {
        if (vigente)
          setResultado({
            entrada: JSON.stringify([cantidad, factor, unidad]),
            texto: "La equivalencia se verificará al revisar la compra.",
          });
      }
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [cantidad, factor, unidad]);
  return (
    <p className="text-sm tabular-nums" aria-live="polite">
      Equivalencia: {cantidad || "—"} {presentacion || "presentaciones"} ×{" "}
      {factor || "—"} {unidad} ={" "}
      {resultado?.entrada === entrada ? resultado.texto : "calculando…"}
    </p>
  );
}
