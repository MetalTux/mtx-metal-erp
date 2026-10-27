import type { Prisma } from "@/generated/prisma/client";
/** Permite mantener C1/C2 operativos mientras se aplica la migración aditiva de C3. */
export const esquemaCobranzaC3={
 async disponible(tx:Pick<Prisma.TransactionClient,"$queryRaw">){
  const [r]=await tx.$queryRaw<{disponible:boolean}[]>`SELECT (to_regclass('public."PaymentAttachment"') IS NOT NULL AND to_regclass('public."PaymentPromiseChange"') IS NOT NULL) AS disponible`;
  return r.disponible;
 }
};
