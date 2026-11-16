import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {migrateSupportMappingConfig,applySupportMappingRowPatch,supportMappingRowsForTable} from '../converters/xml-cii2019-core/support-mapping-config.js';
import {restraintEntriesFromSupportKind} from '../converters/xml-cii2019-core/support-mapping.js';
import {nativeTestPython} from './helpers/native-python.mjs';

function savedStep7() {
 const config={defaultGap:99,defaultStiffness:123456};
 const guideRow=supportMappingRowsForTable(config).find(row=>row.kind==='GUIDE');
 const restRow=supportMappingRowsForTable(config).find(row=>row.kind==='REST');
 assert.ok(guideRow?.id && restRow?.id);
 applySupportMappingRowPatch(config,guideRow.id,{gap:'7'});
 applySupportMappingRowPatch(config,restRow.id,{gap:'4.5'});
 return config;
}

test('Step 7 editable Gap survives save, migration and JSON reload, independently of global defaultGap',()=>{
 const saved=savedStep7();
 assert.equal(saved.supportMapping.kindProfiles.GUIDE.gap,'7');
 assert.equal(saved.supportMapping.kindProfiles.REST.gap,'4.5');
 const reloaded=JSON.parse(JSON.stringify(saved));
 assert.equal(migrateSupportMappingConfig(reloaded).kindProfiles.GUIDE.gap,'7');
 assert.equal(supportMappingRowsForTable(reloaded).find(row=>row.kind==='GUIDE').gap,'7');
 assert.equal(migrateSupportMappingConfig(reloaded).kindProfiles.REST.gap,'4.5');
});

test('source CMPSUPGAP, NODEGAP and explicit zero outrank Step 7; absent source uses Step 7 only',()=>{
 const config=savedStep7();
 for(const [attrs,expected] of [
  [{CMPSUPGAP:6},6],
  [{CMPSUPGAP:'10mm GAP',NODEGAP:0},10],
  [{CMPSUPGAP:0},0],
  [{NODEGAP:0},0],
  [{NODEGAP:8.5},8.5],
  [{},7],
 ]) {
  const entry=restraintEntriesFromSupportKind('GUIDE',attrs,null,config)[0];
  assert.equal(Number(entry.gap),expected,JSON.stringify(attrs));
 }
 assert.equal(Number(restraintEntriesFromSupportKind('REST',{},null,config)[0].gap),4.5);
 assert.equal(Number(restraintEntriesFromSupportKind('REST',{},null,{defaultGap:99})[0].gap),0);
});

test('invalid Step 7 gaps fail closed; global defaultGap is not accepted as substitute',()=>{
 const config=savedStep7(),row=supportMappingRowsForTable(config).find(r=>r.kind==='GUIDE');
 for(const invalid of ['-1','Infinity','seven','7 mm']){
  assert.throws(()=>applySupportMappingRowPatch(config,row.id,{gap:invalid}),
    {code:'SUPPORT_MAPPER_GAP_INVALID'});
  assert.equal(config.supportMapping.kindProfiles.GUIDE.gap,'7');
 }
});

test('native pre-Final uses same source > Step 7 > zero precedence',()=>{
 const config=savedStep7();
 const script=[
  'import sys,json,xml.etree.ElementTree as ET',
  'sys.path.insert(0,"converters/scripts")',
  'from xml229_prefinal_restraints import append_profile',
  'config=json.load(sys.stdin)',
  'result=[]',
  'for attrs in [{"CMPSUPGAP":6},{"CMPSUPGAP":0},{"NODEGAP":0},{}]:',
  ' node=ET.Element("Node")',
  ' append_profile(node,"GUIDE",attrs,config)',
  ' result.append(float(node.findtext("Restraint/Gap")))',
  'node=ET.Element("Node")',
  'append_profile(node,"REST",{},config)',
  'result.append(float(node.findtext("Restraint/Gap")))',
  'node=ET.Element("Node")',
  'append_profile(node,"GUIDE",{},{"defaultGap":99})',
  'result.append(float(node.findtext("Restraint/Gap")))',
  'print(json.dumps(result))',
 ].join('\n');
 const result=JSON.parse(execFileSync(nativeTestPython,['-c',script],{
  encoding:'utf8',input:JSON.stringify(config),
 }));
 assert.deepEqual(result,[6,0,0,7,4.5,0]);
});
