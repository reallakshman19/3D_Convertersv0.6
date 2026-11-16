import assert from 'node:assert/strict';
import { run } from '../../tabs/model-converters/converters/rvmattr-to-xml.js';
import { _buildXmlFromStagedJsonText } from '../../tabs/model-converters/converters/stagedjson-to-xml.js';
import { normalizeAttRvmMdsMember } from '../../converters/rmss-attribute-parser.js';

function block(type, name, owner, attrs = {}) {
  return ['NEW '+name,'NAME:= '+name,'TYPE:= '+type,'OWNER:= '+owner,
    ...Object.entries(attrs).map(([k,v])=>k+':= '+v),'END'].join('\n');
}
const site = block('SITE','/SITE','/*');
const z1 = block('ZONE','/SITE/Z1','/SITE');
const z2 = block('ZONE','/SITE/Z2','/SITE');
const p1 = block('PIPE','/SITE/Z1/P1','/SITE/Z1');
const p2 = block('PIPE','/SITE/Z2/P2','/SITE/Z2');
const b1 = block('BRAN','/SITE/Z1/P1/B1','/SITE/Z1/P1',
  {HBOR:'100mm',TBOR:'100mm',HPOS:'0 0 0',TPOS:'100 0 0'});
const b2 = block('BRAN','/SITE/Z2/P2/B2','/SITE/Z2/P2',
  {HBOR:'100mm',TBOR:'100mm',HPOS:'500 0 0',TPOS:'600 0 0'});
const v1 = block('VALV','/SITE/Z1/P1/B1/V1','/SITE/Z1/P1/B1',
  {APOS:'0 0 0',LPOS:'100 0 0',ABORE:'100mm'});
const v2 = block('VALV','/SITE/Z2/P2/B2/V2','/SITE/Z2/P2/B2',
  {APOS:'500 0 0',LPOS:'600 0 0',ABORE:'100mm'});
const m1 = block('SUBE','/SITE/Z1/MEMBER_A','/SITE/Z1',
  {APOS:'0 0 0',LPOS:'70 0 0'});
const m2 = block('SUBE','/SITE/Z2/MEMBER_B','/SITE/Z2',
  {APOS:'500 0 0',LPOS:'570 0 0'});
const att=[site,z1,z2,p1,p2,b1,b2,v1,v2,m1,m2].join('\n');
const selected=await run({
  converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'selected.att',text:att}],
  options:{
    rvmScope:{
      wildcard:'',selectedIds:['branch:/SITE/Z1/P1/B1'],
      nativeScope:{mode:'SELECTED',rules:[['/SITE/Z1',true]],
        selectedNativeCount:5,selectedPipingBranches:1},
    },
  },
});
assert.ok(selected.ok, 'converter must accept ATT-only selected scope');
const xml=selected.outputs.find(x=>x.name.endsWith('.xml'))?.text||'';
const json=selected.outputs.find(x=>x.name.endsWith('.json'))?.text||'';
const step=selected.outputs.find(x=>x.name.endsWith('.stp'))?.text||'';
assert.ok(xml.includes('/SITE/Z1/P1/B1'),'Selected branch must be present in XML');
assert.ok(!xml.includes('/SITE/Z2/P2/B2'),'Unselected branch leaked into XML');
const hierarchy=JSON.parse(json);
assert.deepEqual(hierarchy.map(x=>x.name),['/SITE/Z1/P1/B1']);
assert.ok(step.includes('MEMBER_A'),'Selected structural member absent');
assert.ok(!step.includes('MEMBER_B'),'Unselected zone member leaked into STEP');
const full=await run({
  converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'full.att',text:att}],
  options:{rvmScope:{wildcard:'',selectedIds:[],nativeScope:{mode:'FULL'}}},
});
const all=JSON.parse(full.outputs.find(x=>x.name.endsWith('.json')).text);
assert.equal(all.length,2,'Full-file control must include both branches');
console.log('test-att-native-converter-outputs: PASS selected XML/JSON/STP no sibling zone leakage');

 // Co-located synthetic members: the common assembly reference must never
 // override the individual member's MDS function, catalogue or clearance.
const supportOwner='/SITE/Z1/P1/B1';
const supportAttrs={POS:'50 0 0',CMPSUPREFN:'SYNTH-SL (REF)',NODETYPE:'14',NODEGAP:'0',
  SPRE:'/MDS-Ancillaries/ANCI/SYNTH',SUPPORT_KIND:'REST',SUPPORT_MAPPER_KIND:'REST'};
const guide={...supportAttrs,MDSSUPPFUNC:'GT',MDSSUPPTYPE:'GT500',CMPSUPTYPE:'PG-S-3',CMPSUPGAP:'GAP=10mm'};
const stop={...supportAttrs,MDSSUPPFUNC:'ST',MDSSUPPTYPE:'ST501',CMPSUPTYPE:'LS-S2-3',CMPSUPGAP:'GAP=35mm'};
const rest={...supportAttrs,MDSSUPPFUNC:'PIPE-REST',MDSSUPPTYPE:'PIPE-REST',CMPSUPTYPE:'REST',CMPSUPGAP:'GAP=0mm'};
const gapless={...guide,CMPSUPGAP:''};
const contradictory={...guide,CMPSUPTYPE:'LS-S2-3'};
const rows=[['/SYNTH-SL.1.3',guide],['/SYNTH-SL.1.2',stop],['/SYNTH-SL.2.1',rest],
  ['/SYNTH-SL.3.1',gapless],['/SYNTH-SL.3.2',contradictory]];
const sourceAtt=[site,z1,p1,b1,v1,...rows.map(([name,attrs])=>block('ANCI',name,supportOwner,attrs))].join('\n');
const converted=await run({converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'synthetic.att',text:sourceAtt}],options:{}});
const convertedStage=JSON.parse(converted.outputs.find(x=>x.name.endsWith('_managed_stage.json')).text);
const members=new Map(convertedStage.flatMap(b=>b.children).map(n=>[n.attributes?.NAME,n.attributes]));
for(const [name,type,kind,gap] of [['/SYNTH-SL.1.3','8','GUIDE','GAP=10mm'],
  ['/SYNTH-SL.1.2','9','LINESTOP','GAP=35mm']]){
  const a=members.get(name);
  assert.ok(a,'Full member identity was not preserved');
  assert.equal(a.NODETYPE,type);
  assert.equal(a.SOURCE_NODETYPE,'14');
  assert.equal(a.NODETYPE_CLASSIFICATION_SOURCE,'ATT_RVM_MDS_MEMBER');
  assert.equal(a.CMPSUPGAP,gap);
  assert.equal(a.NODEGAP,'0');
  for(const k of ['SUPPORT_KIND','SUPPORT_TYPE','SUPPORT_MAPPER_KIND'])assert.equal(a[k],kind);
}
for(const name of ['/SYNTH-SL.2.1','/SYNTH-SL.3.1','/SYNTH-SL.3.2']){
  assert.equal(members.get(name).NODETYPE,'14','REST or unresolved member must remain unchanged');
  assert.equal(members.get(name).SOURCE_NODETYPE,undefined);
}
const convertedXml=converted.outputs.find(x=>x.name.endsWith('.xml')).text;
for(const [name,kind] of [['/SYNTH-SL.1.3','GUIDE'],['/SYNTH-SL.1.2','LINESTOP']]){
  const node=convertedXml.split('<Node>').find(s=>s.includes('<NodeName>'+name+'</NodeName>'));
  assert.ok(node?.includes('<ConnectionType>'+kind+'</ConnectionType>'));
}
const convertedStp=converted.outputs.find(x=>x.name.endsWith('.stp')).text;
assert.ok(convertedStp.includes('GUIDE:/SYNTH-SL.1.3'));
assert.ok(convertedStp.includes('LINESTOP:/SYNTH-SL.1.2'));
// Native staged-hierarchy path shares the same normalization; generic
// staged-json conversion must not silently rewrite source NODETYPE.
const staged=JSON.stringify([{type:'BRANCH',name:'/SYNTH/B1',children:rows.map(([NAME,attrs])=>
  ({type:'SUPPORT',attributes:{...attrs,NAME,POS:{x:50,y:0,z:0}}}))}]);
const native=_buildXmlFromStagedJsonText(staged,'synthetic.json',{normalizeAttRvmMdsMembers:true});
const generic=_buildXmlFromStagedJsonText(staged,'synthetic.json',{});
assert.equal(JSON.parse(native.stageJsonText)[0].children[0].attributes.NODETYPE,'8');
assert.equal(JSON.parse(native.stageJsonText)[0].children[1].attributes.NODETYPE,'9');
assert.equal(JSON.parse(generic.stageJsonText)[0].children[0].attributes.NODETYPE,'14');
assert.equal(native.supportMapperStats.correctedMdsNodeTypes,2);
const repeat={...guide};
assert.equal(normalizeAttRvmMdsMember(repeat),'GUIDE');
assert.equal(normalizeAttRvmMdsMember(repeat),'GUIDE');
assert.equal(repeat.SOURCE_NODETYPE,'14');
for(const attrs of [{...guide,NODETYPE:'9'},{...guide,CMPSUPGAP:'GAP=-10mm'},
  {...guide,CMPSUPGAP:'GAP=10mm or 20mm'}, {...guide,CMPSUPGAP:''}]){
  const before={...attrs};
  assert.equal(normalizeAttRvmMdsMember(attrs),'');
  assert.deepEqual(attrs,before);
}
console.log('ATT/RVM MDS member classification: PASS source NODETYPE, member gaps, XML/JSON/STP labels, generic control');
