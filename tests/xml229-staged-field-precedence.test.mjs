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

function regenerated(){
 const source=input();
 for(const [index,code,rule] of [[1,'9','builtin-ls'],[2,'8','builtin-pg']]){
   const attrs=source[0].children[index].attributes;
   Object.assign(attrs,{SOURCE_NODETYPE:'14',SOURCE_NODEGAP:'0',NODETYPE:code,
     NODETYPE_CODES:[code],NODETYPE_CLASSIFICATION_SOURCE:'STEP7_SUPPORT_MAPPING',
     SUPPORT_EFFECTIVE_NODETYPE:code,SUPPORT_MAPPING_RULE_ID:rule,
     SUPPORT_MAPPING_STATUS:'FOR_REVIEW_SOURCE_NODETYPE_CORRECTED',
     SUPPORT_MAPPING_REQUIRES_ENGINEERING_APPROVAL:true});
 }
 return source;
}
test('regenerated export: original type custody, actual current policy receipt and native verification',async()=>{
 const source=regenerated(),before=JSON.stringify(source);
 const off=await stage(source,cfg,'preview');
 assert.equal(off.restraintReview.status,'FOR_REVIEW');
 assert.deepEqual(off.restraintReview.policySummary.warningReasons,{STEP7_TYPE_PRECEDENCE_OFF:2});
 const accepted=await stage(source,all,'preview');
 assert.equal(accepted.restraintReview.status,'CLEAR');
 assert.equal(accepted.restraintReview.policySummary.typeDecisionOccurrences,2);
 assert.equal(accepted.restraintReview.policySummary.uniqueTypeDecisionMembers,2);
 assert.equal(accepted.restraintReview.policySummary.flags.type,true);
 assert.match(accepted.restraintReview.policySummary.configSha256,/^[a-f0-9]{64}$/);
 const guide=accepted.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guide.decision.rule.resolutionStatus,'RESOLVED_BY_STEP7_POLICY');
 assert.equal(guide.decision.rule.exportedProposalVerified,true);
 assert.equal(guide.source.member.fields.SOURCE_NODETYPE,'14');
 assert.deepEqual(numericRows(native(source,all)),numericRows(rows(accepted.document)));
 assert.equal(JSON.stringify(source),before);
 const gapless=regenerated();gapless[0].children[2].attributes.CMPSUPGAP='';
 const typeOnly=await stage(gapless,{...all,xml229SourceFieldPrecedence:{type:true}},'preview');
 assert.deepEqual(typeOnly.restraintReview.policySummary.warningReasons,{STEP7_GAP_POLICY_OR_SAVED_GAP_REQUIRED:1});
 const gap=await stage(gapless,all,'preview');
 assert.equal(gap.restraintReview.status,'CLEAR');
 assert.equal(numericRows(rows(gap.document)).find(r=>r[0]==='GUI')[1],12);
 const stale=regenerated();stale[0].children[2].attributes.NODETYPE_CODES=['14'];
 const held=await stage(stale,all,'preview');
 assert.deepEqual(held.restraintReview.policySummary.warningReasons,{STEP7_RULE_OR_EXPORTED_PROPOSAL_MISMATCH:1});
 await assert.rejects(stage(stale,all),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 assert.throws(()=>native(stale,all),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
});
test('actual independent O1 Worker recomputes the review against its own config, no global Preview status',async()=>{
 const source=regenerated(),json=JSON.stringify(source),blob=new Blob([json]);
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
 const old={onmessage:globalThis.onmessage,postMessage:globalThis.postMessage,close:globalThis.close};
 try{
   globalThis.onmessage=null;globalThis.close=()=>{};
   const messages=[];globalThis.postMessage=m=>messages.push(m);
   await import('../tabs/xml-cii-2019-standalone/workers/lfj-o1-resolver-domain-worker.mjs');
   const run=async(config,id)=>{
     messages.length=0;
     await globalThis.onmessage({data:{schema:'LFJ.O1.DomainWorker.v1',kind:'RUN',jobId:id,
       sourceRefId:'synthetic',sourceSha256:sha,sourceRevision:'v1',selectionDigest:'ALL',
       byteLength:blob.size,committedRoot:{startByte:0,endByteExclusive:blob.size},jsonBlob:blob,
       sourceText:XML,sourceKind:'xml',jsonConfig:cfg.resolverJsonTrace,supportConfigJson:JSON.stringify(config)}});
     const ready=messages.find(m=>m.kind==='READY');
     assert.ok(ready,JSON.stringify(messages));
     await globalThis.onmessage({data:{schema:'LFJ.O1.DomainWorker.v1',kind:'CANCEL'}});
     return ready;
   };
   const off=await run(cfg,'off'),on=await run({...all,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}},'on');
   assert.equal(off.restraintReview.status,'FOR_REVIEW');
   assert.equal(on.restraintReview.status,'CLEAR');
   assert.equal(on.restraintReview.policySummary.typeDecisionOccurrences,2);
   assert.equal(on.restraintReview.policySummary.mappedCodeDecisionOccurrences,2);
   assert.equal(on.restraintReview.sourceBasis.jsonSha256,sha);
   assert.equal(on.engineeringReady,false);
 }finally{Object.assign(globalThis,old);}
});

test('JSON Trace mapped-code checkbox alone resolves verified type conflicts and records its distinct authority',async()=>{
 const source=regenerated(),config={...all,xml229SourceFieldPrecedence:{mappedCodes:true}};
 const result=await stage(source,config,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.equal(result.restraintReview.policySummary.flags.type,false);
 assert.equal(result.restraintReview.policySummary.flags.mappedCodes,true);
 assert.equal(result.restraintReview.policySummary.mappedCodeDecisionOccurrences,2);
 assert.deepEqual(numericRows(rows(result.document)),numericRows(native(source,config)));
 const guide=result.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.deepEqual(guide.decision.rule.mappedCodes,['8']);
 assert.equal(guide.decision.rule.policy,'xml229SourceFieldPrecedence.mappedCodes');
 assert.equal(guide.source.member.fields.SOURCE_NODETYPE,'14');
 const gapless=regenerated();gapless[0].children[2].attributes.CMPSUPGAP='';
 const held=await stage(gapless,config,'preview');
 assert.deepEqual(held.restraintReview.policySummary.warningReasons,{STEP7_GAP_POLICY_OR_SAVED_GAP_REQUIRED:1});
 const both={...config,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}};
 const cleared=await stage(gapless,both,'preview');
 assert.equal(cleared.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(rows(cleared.document)),numericRows(native(gapless,both)));
 for(const invalid of [undefined,[],['9'],['8','9'],['99']]){
   const stale=regenerated();
   if(invalid===undefined)delete stale[0].children[2].attributes.NODETYPE_CODES;
   else stale[0].children[2].attributes.NODETYPE_CODES=invalid;
   const review=await stage(stale,both,'preview');
   assert.equal(review.restraintReview.status,'FOR_REVIEW');
   await assert.rejects(stage(stale,both),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
   assert.throws(()=>native(stale,both),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
 }
 await assert.rejects(stage(source,{...config,xml229PhysicalVertexPrefinal:true}),{code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
});
test('real JSON Trace checkbox writes the shared support config and persists its authority',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {installMiniDom,MiniElement}=require('./helpers/mini-dom.js');
 const {renderMappedCodePrecedence}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js');
 const {createXmlCiiAdaptedWorkflowState}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js');
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage;
 try{
   installMiniDom();
   const store=new Map();
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
   const ref={current:createXmlCiiAdaptedWorkflowState()};
   let renders=0;const panel=new MiniElement('section');
   renderMappedCodePrecedence(panel,ref,()=>renders++);
   const checkbox=panel.querySelector('[data-field="xml229-source-field-precedence-mapped-codes"]');
   assert.ok(checkbox);assert.equal(checkbox.checked,false);
   checkbox.checked=true;checkbox.dispatch('change');
   assert.equal(JSON.parse(ref.current.supportConfigJson).xml229SourceFieldPrecedence.mappedCodes,true);
   assert.equal(JSON.parse(store.get('xml-cii-import-masters-v1')).config.xml229SourceFieldPrecedence.mappedCodes,true);
   assert.equal(renders,1);
   checkbox.checked=false;checkbox.dispatch('change');
   assert.equal(JSON.parse(ref.current.supportConfigJson).xml229SourceFieldPrecedence.mappedCodes,false);
 }finally{
   globalThis.document=oldDoc;
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:oldStorage});
 }
});

test('failed mapped proposal cannot fall through to generated scalar outside physical ST/GT detector',async()=>{
 const source=regenerated(),attrs=source[0].children[2].attributes;
 attrs.MDSSUPPFUNC='OTHER';
 attrs.NODETYPE_CODES=['9'];
 const config={...all,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}};
 const review=await stage(source,config,'preview');
 assert.equal(review.restraintReview.status,'FOR_REVIEW');
 await assert.rejects(stage(source,config),{code:'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'});
 assert.throws(()=>native(source,config),/NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS/);
});
