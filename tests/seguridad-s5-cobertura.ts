import assert from "node:assert/strict";
import { readdirSync,readFileSync } from "node:fs";
import ts from "typescript";
import { modelosConAutoria } from "../src/lib/seguridad/autoria";
const modelos=new Set<string>(modelosConAutoria);let puntos=0;
for(const file of readdirSync('src/lib/servicios').filter(f=>f.endsWith('.ts')).map(f=>'src/lib/servicios/'+f)){
 const s=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true);
 function visit(n:ts.Node){
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&ts.isPropertyAccessExpression(n.expression.expression)){
   const model=n.expression.expression.name.text,metodo=n.expression.name.text,tx=n.expression.expression.expression.getText(sf);
   if(tx==='tx'&&modelos.has(model)&&['create','update','delete','upsert'].includes(metodo)){
    let fun:ts.Node|undefined=n.parent;while(fun&&!ts.isFunctionDeclaration(fun))fun=fun.parent;
    if(model==='documentNumbering'&&(fun as ts.FunctionDeclaration)?.name?.text==='asignarFolio')return;
    if(model==='warehouseStock'&&!file.endsWith('/minimos-inventario.ts'))return;
    const parent=ts.isAwaitExpression(n.parent)?n.parent.parent:n.parent;
    assert(ts.isCallExpression(parent)&&parent.expression.getText(sf)==='anotarMutacion',`${file}: mutación ${model}.${metodo} sin autoría atómica`);puntos++;
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);
}
assert.equal(puntos,65);assert(readFileSync('src/lib/seguridad/acceso.ts','utf8').includes('fijarActorTransaccion(tx, actor.id)'));
console.log(`${puntos} puntos de autoría atómica cubiertos; auxiliares automáticos de folio/saldos excluidos explícitamente.`);
