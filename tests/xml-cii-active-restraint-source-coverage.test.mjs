import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stagedGapSourceClaims,
  reconcileActiveRestraintSourceGaps,
} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-source-coverage.js';

const branch='/GLRD-1000-2"-B4110001-93833-01/B1';
const source=JSON.stringify([{type:'BRANCH',name:branch,children:[
  {type:'SUPPORT',attributes:{NAME:'/PS-4102.3.1',MDSSUPPTYPE:'PIPE-REST',SUPPORT_KIND:'REST'}},
  {type:'SUPPORT',attributes:{NAME:'/PS-4102.1.1',MDSSUPPTYPE:'ST572',
    MDSDTXR:'LINE STOP ON BARE PIPE WITH WEAR PAD',SUPPORT_KIND:'REST',CMPSUPGAP:'25MM GAP'}},
  {type:'SUPPORT',attributes:{NAME:'/PS-4128.3.1',MDSSUPPTYPE:'GT571',
    SUPPORT_KIND:'REST',CMPSUPGAP:'5mm GAP'}},
]}]);
const rows=[
  {target:{branch,nodeNumber:'3610',nodeName:'PS-4102.3.1',position:'0 0 0'}},
  {target:{branch,nodeNumber:'3620',nodeName:'PS-4102.1.1',position:'0 0 0'}},
  {target:{branch,nodeNumber:'650',nodeName:'PS-4128.3.1',position:'1 0 0'}},
];
test('independent source census sees explicit source gaps, including generated REST labels',()=>{
  const claims=stagedGapSourceClaims(source);
  assert.equal(claims.length,2);
  assert.deepEqual(claims.map(row=>row.path),['$[0].children[1]','$[0].children[2]']);
  assert.deepEqual(claims.map(row=>row.gapMm),[25,5]);
});
test('two verified original +Y restraints cannot hide missing 25 mm and 5 mm claims',()=>{
  const observed=[
    {target:rows[0].target,status:'VERIFIED',after:{Type:'+Y',Gap:'0'},
      observed:{node:'3610',gap:0},source:{kind:'original-xml'}},
  ];
  const report=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:rows,records:observed});
  assert.deepEqual(report.summary,{sourceClaims:2,inOriginalXml:2,verified:0,unaccounted:2,outsideOriginalXml:0});
  assert.equal(report.status,'UNVERIFIED');
  assert.deepEqual(report.claims.map(row=>row.targetNodes),[['3620'],['650']]);
});
test('coincident neighbor or group aggregation is never exact source ownership',()=>{
  const group={target:rows[1].target,originalTarget:rows[1].target,status:'VERIFIED',
    after:{Type:'LIM',Gap:'25'},observed:{node:'3620',gap:25},
    source:{kind:'staged-json-group',members:[{path:'$[0].children[1]'}]}};
  const report=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:rows,records:[group]});
  assert.equal(report.claims[0].status,'SOURCE_MEMBER_NOT_TRACED');
});
test('exact source member and verified CII gap qualify only that member',()=>{
  const exact={target:rows[1].target,originalTarget:rows[1].target,status:'VERIFIED',
    after:{Type:'LIM',Gap:'25'},observed:{node:'3620',gap:25,blockIndex:10,slotIndex:1,line:7298},
    source:{kind:'staged-json',member:{path:'$[0].children[1]'}}};
  const report=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:rows,records:[exact]});
  assert.equal(report.summary.verified,1);
  assert.equal(report.summary.unaccounted,1);
  assert.equal(report.claims[0].status,'VERIFIED');
  assert.equal(report.claims[1].status,'SOURCE_MEMBER_NOT_TRACED');
});
test('wrong CII gap, duplicate source target and out-of-scope support stay unverified',()=>{
  const exact={target:rows[1].target,originalTarget:rows[1].target,status:'VERIFIED',
    after:{Type:'LIM',Gap:'0'},observed:{node:'3620',gap:0},
    source:{kind:'staged-json',member:{path:'$[0].children[1]'}}};
  const wrong=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:rows,records:[exact]});
  assert.equal(wrong.claims[0].status,'SOURCE_GAP_NOT_VERIFIED');
  const duplicate=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:[...rows,rows[1]],records:[exact]});
  assert.equal(duplicate.claims[0].status,'AMBIGUOUS_XML_OWNER');
  const excluded=reconcileActiveRestraintSourceGaps({stagedJsonText:source,originalRows:rows.slice(0,1)});
  assert.equal(excluded.summary.outsideOriginalXml,2);
  assert.equal(excluded.summary.unaccounted,0);
});
