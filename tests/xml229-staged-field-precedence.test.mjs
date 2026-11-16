import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {stagedFieldKindDecision} from '../converters/xml-cii2019-core/support-kind-precedence.js';
import {migrateSupportMappingConfig} from '../converters/xml-cii2019-core/support-mapping-config.js';
import {nativeTestPython} from './helpers/native-python.mjs';
installWeightBasisXmlDom(globalThis);
const branch='/SYNTHETIC/P1/B1';
const XML='<PipeStressExport><Branch><Branchname>'+branch+'</Branchname><Node><NodeNumber>140</NodeNumber><NodeName>SL-SYNTH.1.1</NodeName><ComponentType>ANCI</ComponentType><Position>0 0 0</Position></Node></Branch></PipeStressExport>';
const member=(name,func,code,catalogue,gap)=>({type:'SUPPORT',attributes:{
 NAME:name,MDSSUPPFUNC:func,MDSSUPPTYPE:code,CMPSUPTYPE:catalogue,CMPSUPGAP:gap,
 NODETYPE:'14',NODEGAP:'0',NODESTIFF:'999',NODEFRICTION:'0.3',POS:{x:0,y:0,z:0}}});
const input=()=>[{type:'BRANCH',name:branch,children:[
 member('/SL-SYNTH.1.1','PIPE-REST','PIPE-REST','REST','GAP=0mm'),
 member('/SL-SYNTH.1.2','ST','ST501','LS-S2-3','GAP=35mm'),
 member('/SL-SYNTH.1.3','GT','GT500','PG-S-3','GAP=10mm')]}];
const cfg={dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0},resolverJsonTrace:{matchMode:'POS',coordinateTolerance:6},defaultStiffness:'123456',defaultFriction:'0.3'};
const all={...cfg,xml229SourceFieldPrecedence:{type:true,gap:true,stiffness:true,friction:true}};
all.supportMapping=migrateSupportMappingConfig(all);
all.supportMapping.kindProfiles.GUIDE.gap='12';
all.supportMapping.kindProfiles.LINESTOP.stiffness='777';
all.supportMapping.kindProfiles.GUIDE.frictionMode='fixed';
all.supportMapping.kindProfiles.GUIDE.fixedFriction='0';
const fields=['Type','Gap','Stiffness','Friction'];
const rows=doc=>[...doc.getElementsByTagName('Restraint')].map(r=>fields.map(k=>r.getElementsByTagName(k)[0].textContent));
const stage=(src,config,purpose='final')=>prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:JSON.stringify(src),config,policy:purpose});
const native=(source,config)=>JSON.parse(execFileSync(nativeTestPython,['-c',[
'import json,sys,xml.etree.ElementTree as ET',
'sys.path.insert(0,"converters/scripts")',
'from xml229_prefinal_restraints import kinds,append_profile',
'd=json.load(sys.stdin)',
'def require(condition,code):',
' if not condition: raise ValueError(code)',
'entries=[dict(attrs=m["attributes"],desc="") for m in d["source"][0]["children"]]',
'selected=kinds(entries,require,d["config"])',
'n=ET.Element("Node")',
'for k in ("REST","GUIDE","LINESTOP"):',
' if k in selected: append_profile(n,k,selected[k],d["config"])',
'print(json.dumps([[r.findtext(k) for k in ("Type","Gap","Stiffness","Friction")] for r in n.findall("Restraint")]))'
].join('\n')],{input:JSON.stringify({source,config}),encoding:'utf8'}).trim().split('\n').at(-1));
const numericRows=rs=>rs.map(([t,...v])=>[t,...v.map(Number)]);
test('explicit type precedence resolves the physical ST/GT conflict without changing source; exact native parity',async()=>{
 const source=input(),before=JSON.stringify(source);
 await assert.rejects(stage(source,cfg),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const review=await stage(source,cfg,'preview');assert.equal(review.restraintReview.status,'FOR_REVIEW');
 const got=await stage(source,all);
 assert.equal(got.restraintReview.warnings.length,0);
 const expected=[['+Y',0,123456,.3],['GUI',10,123456,0],['LIM',35,777,-1.0101]];
 assert.deepEqual(numericRows(rows(got.document)),expected);
 assert.deepEqual(numericRows(native(source,all)),expected);
 assert.equal(JSON.stringify(source),before);
 assert.equal(got.proof.restraintAudit.recordedConfig.xml229SourceFieldPrecedence.type,true);
 const guide=got.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guide.decision.source,'explicit-staged-field-precedence');
 assert.equal(guide.source.member.fields.NODETYPE,'14');
});
test('gap policy chooses catalogue clearance over nonzero NODEGAP, profile only if catalogue absent; numeric source fields win',async()=>{
 const source=input();
 const guide=source[0].children[2].attributes;
 guide.CMPSUPGAP='';guide.NODEGAP='99';guide.STIFFNESS='321';guide.FRICTION='0';
 const stop=source[0].children[1].attributes;stop.NODEGAP='88';
 const got=await stage(source,all);
 assert.deepEqual(numericRows(rows(got.document)),[['+Y',0,123456,.3],['GUI',12,321,0],['LIM',35,777,-1.0101]]);
 assert.deepEqual(numericRows(native(source,all)),numericRows(rows(got.document)));
 await assert.rejects(stage(source,{...all,xml229SourceFieldPrecedence:{type:true}}),{code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS'});
 const gapless=input();gapless[0].children[2].attributes.CMPSUPGAP='';
 await assert.rejects(stage(gapless,{...all,xml229SourceFieldPrecedence:{type:true}}),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const conflict=input();conflict[0].children[2].attributes.CMPSUPGAP_POS='20mm';
 await assert.rejects(stage(conflict,all),{code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS'});
});
test('saved Step 7 rules decide field preference; ambiguous priorities and unsupported profiles remain fatal',async()=>{
 const attrs={NODETYPE:'14',SKEY:'CUSTOM'};
 const custom=structuredClone(all);
 custom.supportMapping.rules.push({id:'user-custom',field:'SKEY',source:'staged-json',priority:1,enabled:true,match:'equals',pattern:'CUSTOM',kind:'GUIDE'});
 assert.equal(stagedFieldKindDecision(attrs,custom).kind,'GUIDE');
 assert.equal(stagedFieldKindDecision({...attrs,SKEY:'',SUPPORT_KIND:'GUIDE'},custom),null);
 custom.supportMapping.rules.push({id:'user-tie',field:'SKEY',source:'staged-json',priority:1,enabled:true,match:'equals',pattern:'CUSTOM',kind:'LINESTOP'});
 assert.throws(()=>stagedFieldKindDecision(attrs,custom),{code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
 await assert.rejects(stage(input(),{...all,xml229PhysicalVertexPrefinal:true}),{code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
});

test('raw SOURCE_NODETYPE cannot be silently hidden by a proposed effective NODETYPE',async()=>{
 const source=input();
 const guide=source[0].children[2].attributes;guide.SOURCE_NODETYPE='14';guide.NODETYPE='8';
 const stop=source[0].children[1].attributes;stop.SOURCE_NODETYPE='14';stop.NODETYPE='9';
 await assert.rejects(stage(source,cfg),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const result=await stage(source,all,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(rows(result.document)),numericRows(native(source,all)));
 const guideAudit=result.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guideAudit.decision.rule.originalNodeType,'14');
 assert.equal(guideAudit.source.member.fields.SOURCE_NODETYPE,'14');
});
