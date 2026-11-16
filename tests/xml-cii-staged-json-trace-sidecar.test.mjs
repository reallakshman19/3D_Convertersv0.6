import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStagedJsonTraceSidecar, JSON_TRACE_SIDECAR_COLUMNS,compareStagedJsonTraceSidecar,traceMemberAssignments,compareSidecarXmlAssignments }
  from '../tabs/xml-cii-2019-standalone/xml-cii-staged-json-trace-sidecar.js';
import { parseTraceTableText, autoMapTraceTableFields, headersFromTraceRows }
  from '../tabs/xml-cii-2019-standalone/xml-cii-table-trace-source.js';
import { buildTraceTableResolverResult }
  from '../tabs/xml-cii-2019-standalone/xml-cii-table-trace-source.js';
import { createDefaultTraceTableConfig }
  from '../tabs/xml-cii-2019-standalone/xml-cii-table-trace-config.js';

const BRANCH='/ASIM-1840-3"-S8810389-91261M7-01/B1';
const position={x:1032747.41,y:1991704.95,z:1100};
const xml='<CAESARII><Branch><Branchname>'+BRANCH+'</Branchname><Node>' +
  '<NodeNumber>140</NodeNumber><NodeName>SL-1840203.2.1</NodeName>' +
  '<ComponentType>ANCI</ComponentType><Position>1032747.41 1991704.95 101100</Position>' +
  '</Node></Branch></CAESARII>';
function member(name,func,code,cmp,gap=''){
  return {type:'SUPPORT',attributes:{NAME:name,POS:position,
    TYPE:'ANCI',CMPSUPREFN:'SL-1840203 (REF)',
    MDSSUPPFUNC:func,MDSSUPPTYPE:code,CMPSUPTYPE:cmp,
    CMPSUPGAP:gap,NODETYPE:'14',NODEGAP:'0',
    ATTACHED_COMPONENT_REF:'=1006649732/144815'}};
}
const members=[
 member('/SL-1840203.2.1','PIPE-REST','PIPE-REST','REST'),
 member('/SL-1840203.1.1','AT','AT503','SH-A4-3-CS-950-200'),
 member('/SL-1840203.1.2','ST','ST501','LS-S2-3','GAP=35mm'),
 member('/SL-1840203.1.3','GT','GT500','PG-S-3','GAP=10mm'),
];
const payload=JSON.stringify([{type:'BRANCH',name:BRANCH,children:members}]);
const settings={resolverJsonTrace:{matchMode:'POS',coordinateTolerance:6,
  dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:100000}}};

test('staged JSON build yields complete CSV sidecar with four independent coincident members',()=>{
  const before=payload;
  const out=buildStagedJsonTraceSidecar(payload,settings);
  assert.equal(payload,before);
  assert.equal(out.schema,'XML229.StagedJsonTraceSidecar.v1');
  assert.equal(out.rowCount,4);
  assert.equal(out.positionedRows,4);
  assert.equal(out.memberRows.length,4);
  assert.deepEqual(out.columns,JSON_TRACE_SIDECAR_COLUMNS);
  assert.deepEqual(out.memberRows.map(r=>r['MDSSUPPTYPE']),
    ['PIPE-REST','AT503','ST501','GT500']);
  assert.deepEqual(out.memberRows.map(r=>r['SUPPORT GAP']),
    ['','','GAP=35mm','GAP=10mm']);
  assert.equal(out.memberRows[2]['JSON source path'],'$[0].children[2]');
  assert.equal(out.memberRows[2]['Staged raw position'],
    '{"x":1032747.41,"y":1991704.95,"z":1100}');
  assert.equal(out.memberRows[2]['POS WRT /*'],
    'E=1032747.41 N=1991704.95 EL=101100');
});

test('CSV sidecar re-imports through existing CSV / XLS Trace Source field mapper',()=>{
  const out=buildStagedJsonTraceSidecar(payload,settings);
  const rows=parseTraceTableText(out.csv);
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(row=>row['MDSSUPPTYPE']),
    ['PIPE-REST','AT503','ST501','GT500']);
  const headers=headersFromTraceRows(rows);
  const traceConfig=createDefaultTraceTableConfig();
  const fieldMap=autoMapTraceTableFields(headers,rows,traceConfig);
  assert.equal(fieldMap.dtxrPos,'RTEXT of detailing text');
  assert.equal(fieldMap.position,'POS WRT /*');
  assert.equal(fieldMap.nodeName,'Name of the element');
  assert.equal(fieldMap.branchName,'PIPE');
  const table=buildTraceTableResolverResult({sourceText:xml,rawRows:rows,
    fieldMap,traceConfig});
  assert.equal(table.matchedFacts.length,1);
  const receipt=table.matchedFacts[0].ledgerRecord;
  assert.equal(receipt.positionMembers.length,4);
  assert.deepEqual(receipt.positionMembers.map(m=>m.sourcePath).sort(),out.memberRows.map(r=>r['JSON source path']).sort());
  assert.equal(fieldMap.nodeType,'NODETYPE');
  assert.equal(fieldMap.sourceAttributes,'Source attributes JSON');
  assert.equal(receipt.positionMembers.find(m=>m.mdsType==='ST501').cmpSupGap,'GAP=35mm');
  assert.equal(compareStagedJsonTraceSidecar(out.memberRows,rows).complete,true);
});

test('unpositioned members remain in sidecar without fabricated coordinates',()=>{
  const source=[{type:'BRANCH',name:'/P/B1',children:[
    {type:'SUPPORT',attributes:{NAME:'/PS-12.1',MDSSUPPTYPE:'ST501',CMPSUPGAP:'GAP=7mm'}},
  ]}];
  const out=buildStagedJsonTraceSidecar(source,{});
  assert.equal(out.rowCount,1);
  assert.equal(out.memberRows[0]['POS WRT /*'],'');
  assert.equal(out.memberRows[0]['NODETYPE'],'');
});

test('potential spreadsheet formulas are escaped without losing original PS evidence',()=>{
  const source=[{type:'BRANCH',name:'/P/B1',children:[
    {type:'SUPPORT',attributes:{NAME:'=WEBSERVICE("x")',DTXR:'GUIDE',
      POS:[0,0,0],ComponentRefNo:'=123/456'}},
  ]}];
  const out=buildStagedJsonTraceSidecar(source,{});
  assert.match(out.csv,/','=WEBSERVICE|"'=WEBSERVICE/);
  const rows=parseTraceTableText(out.csv);
  assert.equal(rows.length,1);
  assert.equal(rows[0]['Name of the element'],'=WEBSERVICE("x")');
});

test('exact round trip detects missing, duplicated, extra and edited members independently of XML matches',()=>{
 const input=JSON.parse(payload);
 input[0].children.push({type:'PIPE',attributes:{REF:'=900/1',COMPRE:'=900/2',NAME:'Pipe "quoted"',NOTE:"  line\\n\nsecond  ",NULL:null,NUM:0,BOOL:false}});
 input[0].children.push({type:'GASK',attributes:{}});
 input[0].children[2].attributes.REF='=800/3';
 input[0].children[2].attributes.COMPRE='=800/4';
 const out=buildStagedJsonTraceSidecar(input,settings);
 const rows=parseTraceTableText(out.csv);
 assert.equal(rows.length,6);
 assert.equal(rows[2]['Reference of the element'],'=800/3');
 assert.equal(rows[2]['Attached component REF'],'=800/4');
 assert.equal(rows[4]['Name of the element'],'Pipe "quoted"');
 assert.deepEqual(JSON.parse(rows[4]['Source attributes JSON']),input[0].children[4].attributes);
 assert.deepEqual(JSON.parse(rows[4]['Source member JSON']),input[0].children[4]);
 assert.equal(compareStagedJsonTraceSidecar(out.memberRows,rows.slice().reverse()).matched,6);
 const edited=structuredClone(rows);
 edited[2]['SUPPORT GAP']='GAP=36mm';
 edited[3]['NODETYPE']='8';
 edited[4]['Source attributes JSON']='{}';
 edited.splice(5,1);
 edited.push({...edited[0]},{...edited[1],'JSON source path':'$[0].children[999]'});
 const bad=compareStagedJsonTraceSidecar(out.memberRows,edited);
 assert.equal(bad.complete,false);
 assert.equal(bad.missing,1);assert.equal(bad.duplicates,1);assert.equal(bad.extra,1);assert.equal(bad.changed,3);
 assert.equal(bad.matched,1);
 const assignments=compareSidecarXmlAssignments([{xmlIndex:1,paths:['a','b']}],[{xmlIndex:1,paths:['a']}]);
 assert.equal(assignments.mismatched,1);
});
