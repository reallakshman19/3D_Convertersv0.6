/** Public committed GLRD custody only; never a native CII acceptance oracle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inventoryActiveSourceSupports} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-coverage.js';

const directory='../Benchmarks/XML-CII-2019/revamped/';
const field=(xml,tag)=>String(xml.match(new RegExp('<'+tag+'>([^<]*)</'+tag+'>'))?.[1]||'').trim();
async function authentic() {
  const [xml,json]=await Promise.all([
    readFile(new URL(directory+'GLRD-1000-PSI-02.xml',import.meta.url),'utf8'),
    readFile(new URL(directory+'STF_2026Nov03-0839_managed_stage.json',import.meta.url),'utf8'),
  ]);
  const census=inventoryActiveSourceSupports(json);
  assert.equal(census.status,'RECORDED');
  const gaps=census.sources.filter(source=>String(source.fields.CMPSUPGAP||'').trim());
  const nodes=[...xml.matchAll(/<Node>[\s\S]*?<\/Node>/g)].map(([value])=>({
    number:field(value,'NodeNumber'),name:field(value,'NodeName'),
    position:field(value,'Position'),restraints:(value.match(/<Restraint>/g)||[]).length,
    content:value,
  }));
  return {gaps,nodes};
}

test('public GLRD original JSON includes thirteen explicit source gap claims',async()=>{
  const {gaps,nodes}=await authentic();
  assert.equal(gaps.length,13);
  assert.equal(gaps.filter(s=>s.fields.MDSSUPPTYPE==='ST572').length,1);
  assert.equal(gaps.filter(s=>s.fields.MDSSUPPTYPE==='GT571').length,12);
  for(const source of gaps)assert(nodes.some(node=>node.name===source.name.replace(/^[/]+/,'')),
    'No original XML NodeName for source occurrence '+source.path);
});

test('ST572 25mm gap source is node 3620; coordinate-equal +Y node 3610 is distinct',async()=>{
  const {gaps,nodes}=await authentic();
  const claim=gaps.find(source=>source.name==='/PS-4102.1.1');
  assert(claim);
  assert.equal(claim.path,'$[13].children[42]');
  assert.equal(claim.fields.MDSSUPPTYPE,'ST572');
  assert.equal(claim.fields.CMPSUPGAP,'25MM GAP');
  assert.match(claim.fields.MDSDTXR,/LINE STOP/i);
  const sourceNode=nodes.find(node=>node.name==='PS-4102.1.1');
  const other=nodes.find(node=>node.name==='PS-4102.3.1');
  assert.equal(sourceNode.number,'3620');
  assert.equal(other.number,'3610');
  assert.equal(sourceNode.position,other.position,'Coincident geometry cannot prove source ownership');
  assert.equal(sourceNode.restraints,0,'Original XML node 3620 has no restraint');
  assert.equal(other.restraints,1,'Original XML node 3610 retains one restraint');
  assert.match(other.content,/<Type>\+Y<\/Type>/);
});
