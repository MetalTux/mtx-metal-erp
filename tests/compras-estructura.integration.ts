// Validación de restricciones SQL exclusivamente sobre copia local; rollback de los datos de prueba.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_"), "Usar copia local temporal.");
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  const prefijo = `C-${Date.now()}`;
  const one = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows[0];
  const fail = async (code: string, sql: string, values: unknown[] = []) => {
    await db.query("SAVEPOINT restriccion");
    try { await assert.rejects(db.query(sql, values), (e: unknown) => (e as {code?: string}).code === code); }
    finally { await db.query("ROLLBACK TO SAVEPOINT restriccion"); await db.query("RELEASE SAVEPOINT restriccion"); }
  };
  try {
    await db.query("BEGIN");
    const tipo = (await one('INSERT INTO "DocumentType" (code,name,"updatedAt") VALUES ($1,$1,now()) RETURNING id', [prefijo])).id;
    const proveedor = (await one('INSERT INTO "Supplier" (rut,name,"updatedAt") VALUES ($1,$1,now()) RETURNING id', [prefijo])).id;
    const bodega = (await one('INSERT INTO "Warehouse" (name,"updatedAt") VALUES ($1,now()) RETURNING id', [prefijo])).id;
    const otraBodega = (await one('INSERT INTO "Warehouse" (name,"updatedAt") VALUES ($1,now()) RETURNING id', [prefijo+' Otra'])).id;
    const unidad = (await one('INSERT INTO "UnitMeasure" (name,abbreviation,"updatedAt") VALUES ($1,\'un\',now()) RETURNING id', [prefijo])).id;
    const material = (await one('INSERT INTO "RawMaterial" (code,name,"unitMeasureId","updatedAt") VALUES ($1,$1,$2,now()) RETURNING id', [prefijo,unidad])).id;
    const purchaseSQL = 'INSERT INTO "Purchase" ("supplierId","supplierRut","documentTypeId","documentTypeCode","documentNumber","documentNumberNormalized","warehouseId","totalAmount","updatedAt") VALUES ($1,\'11111111-1\',$2,$3,$4,$5,$6,5.03,now()) RETURNING id';
    const args = (number: string, normalized = number) => [proveedor,tipo,prefijo,number,normalized,bodega];
    const compra = (await one(purchaseSQL,args('00a1','00A1'))).id;
    await fail('23505',purchaseSQL,args('00A1','00A1'));
    const otraCompra = (await one(purchaseSQL,args('0A1'))).id; // Ceros iniciales preservados.
    await fail('23514',purchaseSQL,args(' a2 ','A2'));
    await fail('23514',purchaseSQL,args('a2','a2'));
    const lineSQL = 'INSERT INTO "PurchaseDetail" ("purchaseId","warehouseId","rawMaterialId",quantity,"purchasedQuantity",presentation,"unitFactor","unitPrice","lineAmount","updatedAt") VALUES ($1,$2,$3,$4,$5,\'Caja\',$6,$7,$8,now()) RETURNING id';
    const detalle = (await one(lineSQL,[compra,bodega,material,'10','0.5','20','10.05','5.03'])).id;
    await fail('23503',lineSQL,[compra,otraBodega,material,'10','0.5','20','10.05','5.03']);
    await fail('23514',lineSQL,[compra,bodega,material,'10','0.5','20','10.05','5.02']);
    await fail('23514',lineSQL,[compra,bodega,material,'0.001','0.001','0.001','1','0']); // Equivalente no representable.
    await fail('23514',lineSQL,[compra,bodega,material,'NaN','1','1','1','1']);
    await fail('23514','UPDATE "PurchaseDetail" SET "unitPrice"=11 WHERE id=$1',[detalle]);
    const receiptSQL = 'INSERT INTO "PurchaseReceipt" ("purchaseId","updatedAt") VALUES ($1,now()) RETURNING id';
    const recepcion = (await one(receiptSQL,[compra])).id;
    const otraRecepcion = (await one(receiptSQL,[otraCompra])).id;
    const rdSQL = 'INSERT INTO "PurchaseReceiptDetail" ("purchaseId","receiptId","purchaseDetailId","receivedQuantity","inventoryQuantity","updatedAt") VALUES ($1,$2,$3,$4,$5,now()) RETURNING id';
    await fail('23503',rdSQL,[compra,otraRecepcion,detalle,'0.25','5']);
    await fail('23514',rdSQL,[compra,recepcion,detalle,'0','5']);
    const recibido = (await one(rdSQL,[compra,recepcion,detalle,'0.25','5'])).id;
    await fail('23505',rdSQL,[compra,recepcion,detalle,'0.25','5']);
    const cierre = (await one('INSERT INTO "PurchasePendingClosure" ("purchaseId","purchaseDetailId",quantity,reason,"updatedAt") VALUES ($1,$2,0.25,\'Proveedor no entregará resto\',now()) RETURNING id',[compra,detalle])).id;
    await fail('23514','INSERT INTO "PurchasePendingClosure" ("purchaseId","purchaseDetailId",quantity,reason,"updatedAt") VALUES ($1,$2,0.25,\' \',now())',[compra,detalle]);
    const opSQL = 'INSERT INTO "PurchaseOperation" ("idempotencyKey",type,"requestHash","purchaseId","receiptId","closureId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())';
    const key=randomUUID(), hash='a'.repeat(64);
    await db.query(opSQL,[key,'RECIBIR',hash,compra,recepcion,null]);
    await fail('23505',opSQL,[key,'RECIBIR',hash,compra,recepcion,null]);
    await fail('23503',opSQL,[randomUUID(),'RECIBIR',hash,compra,otraRecepcion,null]);
    await fail('23514',opSQL,[randomUUID(),'RECIBIR',hash,compra,null,null]);
    await db.query(opSQL,[randomUUID(),'CERRAR_PENDIENTE',hash,compra,null,cierre]);
    const movSQL = 'INSERT INTO "StockMovement" (type,quantity,"warehouseId","rawMaterialId","purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId") VALUES ($1,$2,$3,$4,$5,$6,$7)';
    await fail('23514',movSQL,['SALIDA','5',bodega,material,detalle,recibido,null]);
    await db.query(movSQL,['ENTRADA','5',bodega,material,detalle,recibido,null]);
    await fail('23505',movSQL,['ENTRADA','5',bodega,material,detalle,recibido,null]);
    await db.query(movSQL,['AJUSTE','-5',bodega,material,detalle,null,recibido]);
    await fail('23514','UPDATE "Purchase" SET "deletedAt"=now() WHERE id=$1',[compra]);
    await fail('23514','UPDATE "Purchase" SET "voidedAt"=now(),"voidReason"=\' \',"deletedAt"=now() WHERE id=$1',[compra]);
    await db.query('UPDATE "Purchase" SET "voidedAt"=now(),"voidReason"=\'Anulación de prueba\',"deletedAt"=now() WHERE id=$1',[compra]);
    await fail('23505',purchaseSQL,args('00A1'));
    await fail('23503','DELETE FROM "Purchase" WHERE id=$1',[compra]);
    await fail('23503','DELETE FROM "DocumentType" WHERE id=$1',[tipo]);
    assert.equal((await one('SELECT count(*)::int AS n FROM "StockMovement" WHERE "purchaseDetailId"=$1',[detalle])).n,2);
    console.log('Correcto: documentos/ceros/normalización/duplicados incluso eliminados, factor y fracciones exactas, empate 5.025→5.03, precio inmutable, recepción/compra coherente, origen único, cierre, idempotencia/FK y eliminación lógica con historial.');
  } finally { await db.query("ROLLBACK"); await db.end(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
