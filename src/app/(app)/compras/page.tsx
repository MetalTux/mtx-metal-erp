import { Compras } from "@/components/compras/compras";
import { catalogosCompra, listarCompras } from "@/lib/servicios/compras";
import { filtrosCompraSchema } from "@/lib/validaciones/compra";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const valid = filtrosCompraSchema.safeParse(raw);
  const filtros = valid.success ? valid.data : filtrosCompraSchema.parse({});
  const [catalogos, consulta] = await Promise.all([
    catalogosCompra(),
    listarCompras(raw),
  ]);
  return (
    <Compras catalogos={catalogos} consulta={consulta} filtros={filtros} />
  );
}
