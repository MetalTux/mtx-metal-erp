import { prisma } from "../src/lib/prisma";
import { TIPOS_DOCUMENTO_COMPRA } from "../src/config/tipos-documento-compra";

export async function cargarTiposDocumentoCompra() {
  await prisma.$transaction(async tx => {
    for (const tipo of TIPOS_DOCUMENTO_COMPRA) {
      const actual = await tx.documentType.upsert({ where: { code: tipo.code }, update: {}, create: tipo });
      if (actual.name !== tipo.name) throw new Error(`El código ${tipo.code} ya existe con otro nombre; revisar sin sobrescribir el catálogo.`);
    }
  });
}
