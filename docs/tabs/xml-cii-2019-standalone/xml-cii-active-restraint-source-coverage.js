/**
 * Independent, observational census of explicit staged-source gap claims.
 * A verified output row is NOT proof of full source coverage.
 * Never guesses a node from a coincident position or generated support label.
 */
const str=value=>String(value??'').trim();
const normName=value=>str(value).replace(/^\/+/, '').toUpperCase();
const normBranch=value=>str(value).toUpperCase();
const gapFields=['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'];
const numeric=value=>{
  const match=str(value).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/);
  return match?Number(match[0]):null;
};

function explicitGap(attrs) {
  for(const key of gapFields)if(str(attrs?.[key]))return {field:key,raw:str(attrs[key]),value:numeric(attrs[key])};
  return null;
}

export function stagedGapSourceClaims(stagedJsonText='') {
  if(!str(stagedJsonText))return [];
  const parsed=JSON.parse(stagedJsonText);
  const claims=[];
  function walk(value,path,branch='') {
    if(Array.isArray(value)){
      value.forEach((item,index)=>walk(item,path+'['+index+']',branch));
      return;
    }
    if(!value||typeof value!=='object')return;
    const attrs=value.attributes||{};
    const current=str(value.type).toUpperCase()==='BRANCH'
      ? str(attrs.NAME||value.name||branch):branch;
    const gap=explicitGap(attrs);
    if(gap&&str(value.type).toUpperCase()==='SUPPORT'){
      claims.push({path,branch:current,name:str(attrs.NAME||value.name),
        sourceType:str(attrs.MDSSUPPTYPE),generatedKind:str(attrs.SUPPORT_KIND),
        field:gap.field,raw:gap.raw,gapMm:gap.value});
    }
    if(Array.isArray(value.children))value.children.forEach((child,index)=>
      walk(child,path+'.children['+index+']',current));
  }
  walk(parsed,'$');
  return claims;
}

export function reconcileActiveRestraintSourceGaps({stagedJsonText='',originalRows=[],records=[]}={}) {
  const claims=stagedGapSourceClaims(stagedJsonText).map(source=>{
    // Original branch/name identity is mandatory. Position-only proximity is
    // intentionally insufficient: PS-4102.3.1 and .1.1 are coincident.
    const owners=originalRows.filter(row=>normBranch(row.target?.branch)===normBranch(source.branch)&&
      normName(row.target?.nodeName)===normName(source.name));
    const targetNodes=owners.map(row=>str(row.target.nodeNumber));
    const base={...source,targetNodes};
    if(!owners.length)return {...base,status:'OUTSIDE_ORIGINAL_XML'};
    if(owners.length!==1)return {...base,status:'AMBIGUOUS_XML_OWNER'};
    if(!Number.isFinite(source.gapMm)||source.gapMm<0)
      return {...base,status:'INVALID_SOURCE_GAP'};
    const owner=owners[0].target;
    // Exact chosen source member required. A source group, point match or
    // unrelated preserved +Y does not prove which member owns a LIM/GUI.
    const linked=records.filter(record=>
      normBranch(record.originalTarget?.branch||record.target?.branch)===normBranch(owner.branch)&&
      normName(record.originalTarget?.nodeName||record.target?.nodeName)===normName(owner.nodeName)&&
      record.source?.kind==='staged-json'&&record.source?.member?.path===source.path);
    if(!linked.length)return {...base,status:'SOURCE_MEMBER_NOT_TRACED'};
    const verified=linked.find(record=>record.status==='VERIFIED'&&record.after&&record.observed&&
      numeric(record.after.Gap)===source.gapMm&&
      numeric(record.observed.gap)===source.gapMm);
    return verified?{...base,status:'VERIFIED',cii:{node:verified.observed.node,
      blockIndex:verified.observed.blockIndex,slotIndex:verified.observed.slotIndex,
      line:verified.observed.line,gap:verified.observed.gap},xmlType:verified.after.Type}:
      {...base,status:'SOURCE_GAP_NOT_VERIFIED'};
  });
  const inScope=claims.filter(row=>row.status!=='OUTSIDE_ORIGINAL_XML');
  const verified=inScope.filter(row=>row.status==='VERIFIED').length;
  const unaccounted=inScope.length-verified;
  return {schema:'XMLCII.ActiveGapSourceCoverage.v1',
    status:unaccounted?'UNVERIFIED':inScope.length?'VERIFIED':'NO_IN_SCOPE_GAP_CLAIMS',
    summary:{sourceClaims:claims.length,inOriginalXml:inScope.length,verified,unaccounted,
      outsideOriginalXml:claims.length-inScope.length},
    claims};
}
