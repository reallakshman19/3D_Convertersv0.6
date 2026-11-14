import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as root from '../converters/xml-cii2019-core/support-kind-precedence.js';
import * as v045 from '../v045/converters/xml-cii2019-core/support-kind-precedence.js';
import { migrateSupportMappingConfig } from '../converters/xml-cii2019-core/support-mapping-config.js';
import { decorateJsonTraceMember } from '../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import { runStandaloneSupportTypeMapper } from '../tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';

const saved = migrateSupportMappingConfig({});
const config = {supportMapping:{...saved,rules:saved.rules.map(r =>
  r.id.startsWith('builtin-gt5-') ? {...r,kind:'REST'} : r)}};
// Independent literal expectations, synthetic members only.
const cases = [
  [{SPRE:'/MDS-Ancillaries/ANCI/ST06',SUPPORT_KIND:'REST'},'LINESTOP','builtin-spre-linestop'],
  [{SPRE:'/MDS-Ancillaries/ANCI/GT01'},'GUIDE','builtin-spre-guide'],
  [{SPRE:'/MDS-Ancillaries/ANCI/AT01'},'REST','builtin-spre-rest'],
  [{SPRE:'/MDS-Ancillaries/ANCI/UNRELATED'},'',null],
  [{NAME:'/WP-1',MDSSUPPTYPE:'GT01'},'GUIDE','builtin-gt-mds'],
  [{MDSSUPPTYPE:'GT572'},'REST','builtin-gt5-mds'],
  [{MDSDTXR:'LINE STOP ON BARE PIPE WITH WEAR PAD',SUPPORT_KIND:'REST'},'LINESTOP','builtin-user-limit'],
  [{NODETYPE:'14',SPRE:'/MDS-Ancillaries/ANCI/ST06'},'REST','builtin-spre-linestop'],
];
test('SPRE mappings, incidental ANCI, saved GT5 and NODETYPE', () => {
  for (const [attrs, expected, ruleId] of cases) for (const impl of [root,v045]) {
    assert.equal(impl.governedSupportKind(attrs,config).kind,expected,JSON.stringify(attrs));
    assert.equal(impl.tableSupportDecision(attrs,config)?.ruleId ?? null,ruleId);
  }
});
test('visible built-in scope migration preserves saved edits', () => {
  const legacy='SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE';
  const rows=saved.rules.map(r=>r.id==='builtin-user-rest'?{...r,field:legacy,priority:35}:r);
  const rest=migrateSupportMappingConfig({supportMapping:{...saved,rules:rows}}).rules.find(r=>r.id==='builtin-user-rest');
  assert.equal(rest.priority,35);
  assert.ok(!rest.field.split(',').includes('SPRE'));
});
test('named project field survives display filtering and reports winning row', () => {
  const custom={supportMapping:{...saved,rules:[...saved.rules,{id:'project-stop',priority:5,
    field:'PROJECT_SUPPORT_CODE',pattern:'STP',match:'equals',kind:'LINESTOP',source:'all'}]}};
  const member=decorateJsonTraceMember({raw:{attributes:{NAME:'/S',PROJECT_SUPPORT_CODE:'STP'}}},
    {...custom,captureFields:['NAME']});
  assert.equal(member.supportEvidence.PROJECT_SUPPORT_CODE,'STP');
  const out=runStandaloneSupportTypeMapper({supportConfig:custom,resolverJsonTraceResult:{
    resolvedFacts:[{xmlNodeNumber:'3610',positionMembers:[member]}]}});
  assert.equal(out.previewRows[0].supportKind,'LINESTOP');
  assert.match(out.previewRows[0].decisionReason,/project-stop.*priority 5.*PROJECTSUPPORTCODE=STP/);
});
test('Python native table evaluator matches JS and literal row IDs', () => {
  const script=['import sys,json','sys.path.insert(0,"converters/scripts")',
    'from xml229_support_type_mapper import table_support_decision,table_support_kind',
    'd=json.load(sys.stdin)',
    'print(json.dumps([[table_support_kind(a,d["config"]),table_support_decision(a,d["config"])] for a in d["cases"]]))'].join('\n');
  const actual=JSON.parse(execFileSync('python',['-c',script],{input:JSON.stringify({config,cases:cases.map(c=>c[0])}),encoding:'utf8'}));
  for(let i=0;i<cases.length;i++){
    const [attrs,,ruleId]=cases[i];
    assert.equal(actual[i][0],root.tableSupportKind(attrs,config));
    assert.equal(actual[i][1]?.ruleId ?? null,ruleId);
  }
});
