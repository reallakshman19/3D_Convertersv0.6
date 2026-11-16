/**
 * Lossless-per-member tabular sidecar of staged JSON traceable source facts.
 * No physical kind is invented and no same-coordinate support is coalesced.
 * The "POS WRT /*" column is aligned to XML's frame exactly once; original
 * coordinate and selected field remain explicit in adjacent provenance columns.
 *
 * This is a review/import sidecar, NOT approved restraint evidence.
 */
import { parseStandaloneDtxrPoint } from './xml-cii-trace-resolution-ledger.js';

export const JSON_TRACE_SIDECAR_COLUMNS = Object.freeze([
  'Reference of the element', 'RTEXT of detailing text', 'Name of the element',
  'POS WRT /*', 'TYPE', 'ISOMETRIC NOTES', 'SUPPORT GAP', 'PIPE',
  'ANCILIARY SUPPORT REFERENCE', 'Component spec reference', 'BORE', 'SITE',
  'Staged raw position', 'Position field', 'Position inherited',
  'NODETYPE', 'NODEGAP', 'MDSSUPPFUNC', 'MDSSUPPTYPE', 'CMPSUPTYPE',
  'MDSLINKREF', 'SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'RAW_TYPE',
  'JSON source path', 'JSON ordinal', 'Grouping mode', 'Tolerance (mm)',
  'Datum X (mm)', 'Datum Y (mm)', 'Datum Z (mm)',
  'Member REF', 'Attached component REF', 'CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS',
  'SOURCE_NODETYPE', 'SOURCE_NODEGAP', 'SUPPORT_TYPE', 'SUPPORT_EFFECTIVE_GAP', 'SUPPORT_GAP_SOURCE',
  'Source attributes JSON', 'Source member JSON',
]);

const text = value => value === null || value === undefined ? '' : String(value).trim();
function attribute(attrs, aliases) {
  for (const alias of aliases) {
    for (const [key,value] of Object.entries(attrs || {})) {
      if (key.toUpperCase() === alias.toUpperCase() && value !== null && value !== undefined &&
          text(value)) return value;
    }
  }
  return '';
}
function coordinateString(point) {
  return point ? 'E=' + point.x + ' N=' + point.y + ' EL=' + point.z : '';
}
function offsetPoint(point, offset) {
  if (!point) return null;
  return {x:point.x+offset.x,y:point.y+offset.y,z:point.z+offset.z};
}
function rawCoord(value) {
  return value === null || value === undefined ? '' :
    typeof value === 'object' ? JSON.stringify(value) : text(value);
}
function projectedCell(value) {return text(value).replace(/\r\n?|\n/g,'\\n');}
function safeCell(value) {
  // Keep the table parseable and safe to open as XLS: prevent CSV formula
  // injection for arbitrary source fields, including '=...' component refs.
  const raw=projectedCell(value);
  const safe=/^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g,'""') + '"' : safe;
}
function configFor(config = {}) {
  const resolver=config.resolverJsonTrace || config.jsonTrace || {};
  const option=resolver.dtxrPositionOffset || config.dtxrPositionOffset || {};
  const enabled=option.enabled===true;
  const value=(key)=>enabled&&Number.isFinite(Number(option[key])) ? Number(option[key]) : 0;
  return {
    offset:{x:value('xOffset'),y:value('yOffset'),z:value('zOffset')},
    matchMode:text(resolver.matchMode || 'POS').toUpperCase(),
    tolerance: Number(resolver.coordinateTolerance ?? 6) || 6,
  };
}

export function buildStagedJsonTraceSidecar(stagedJsonText, config = {}) {
  const source=typeof stagedJsonText==='string' ? JSON.parse(stagedJsonText.replace(/^\uFEFF/,'')) : stagedJsonText;
  if (!source || typeof source!=='object') throw new Error('Staged JSON must be an object or array');
  const policy=configFor(config);
  const rows=[];
  const positionAliases=['SUPPORTCOORD','SUPPORT_COORD','POS','POSI','BPOS',
    'APOS','LPOS','CPOS','HPOS','TPOS','SPOS','EPOS','DTXR_POS'];
  let sequence=0, positionCount=0, inheritedCount=0;
  function walk(value,context,path) {
    if (Array.isArray(value)) {
      value.forEach((item,index)=>walk(item,context,path+'['+index+']'));
      return;
    }
    if(!value||typeof value!=='object')return;
    sequence++;
    const attrs=value.attributes && typeof value.attributes==='object' ?
      value.attributes : {};
    const type=text(value.type || attrs.TYPE).toUpperCase();
    const branch=type==='BRANCH' ?
      text(value.name || attribute(attrs,['OWNER','BRANCH','PIPE']) || context.branch) :
      context.branch;
    let rawPos='',fieldName='',point=null;
    for(const alias of positionAliases) {
      const candidate=attribute(attrs,[alias]);
      const parsed=parseStandaloneDtxrPoint(candidate);
      if(!parsed)continue;
      rawPos=rawCoord(candidate);fieldName=alias;point=offsetPoint(parsed,policy.offset);
      break;
    }
    if(!point) {
      const raw=value.position ?? value.point;
      const parsed=parseStandaloneDtxrPoint(raw);
      if(parsed){rawPos=rawCoord(raw);fieldName='position';point=offsetPoint(parsed,policy.offset);}
    }
    const effectivePoint=point || context.point;
    const inherited=!!(!point && context.point);
    const hasChildren=Array.isArray(value.children)&&value.children.length>0;
    if(type!=='BRANCH') {
      const name=text(attribute(attrs,['NAME','NodeName','SupportTag']) || value.name);
      const explicit=attribute(attrs,['DTXR_POS']);
      const dtxr=(!parseStandaloneDtxrPoint(explicit)&&explicit)||attribute(attrs,['DTXR','DESC','DESCRIPTION','RTEXT','SPRE']);
      const fallback=attribute(attrs,['MDSSUPPTYPE','MDSSUPPFUNC','SUPPORT_KIND']);
      const detail=text(dtxr || (!hasChildren && (value.name || type)) || fallback);
      // Every real source component is a row, even without matching evidence
      // or coordinates. Pure position containers only supply inherited context.
      const coordinateContainer=hasChildren&&!!point&&!name&&!dtxr&&!fallback&&
        !attribute(attrs,['REF','CMPSUPGAP','DTXR_PS','COMPONENTREFNO','COMPRE','ATTACHED_COMPONENT_REF']);
      const hasEvidence=!coordinateContainer&&!!(type||name||Object.keys(attrs).length);
      if(hasEvidence) {
        if(effectivePoint)positionCount++;
        if(inherited)inheritedCount++;
        rows.push({
          'Reference of the element':text(attribute(attrs,['REF','RefNo','ComponentRefNo'])),
          'RTEXT of detailing text':detail,
          'Name of the element':name,
          'POS WRT /*':coordinateString(effectivePoint),
          'TYPE':text(attribute(attrs,['TYPE','RAW_TYPE']) || type),
          'ISOMETRIC NOTES':text(attribute(attrs,['DTXR_PS','DTXRPS','ISONOTE'])),
          'SUPPORT GAP':text(attribute(attrs,['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'])),
          'PIPE':branch,
          'ANCILIARY SUPPORT REFERENCE':text(attribute(attrs,['CMPSUPREFN','SUPPORT_TAG'])),
          'Component spec reference':text(attribute(attrs,['SPRE','CMPSUPTYPE'])),
          'BORE':text(attribute(attrs,['BORE','ABORE','LBORE'])),
          'SITE':text(attribute(attrs,['SITE'])),
          'Staged raw position':rawPos,
          'Position field':fieldName,
          'Position inherited':inherited?'YES':'NO',
          'NODETYPE':text(attribute(attrs,['NODETYPE'])),
          'NODEGAP':text(attribute(attrs,['NODEGAP'])),
          'MDSSUPPFUNC':text(attribute(attrs,['MDSSUPPFUNC'])),
          'MDSSUPPTYPE':text(attribute(attrs,['MDSSUPPTYPE'])),
          'CMPSUPTYPE':text(attribute(attrs,['CMPSUPTYPE'])),
          'MDSLINKREF':text(attribute(attrs,['MDSLINKREF'])),
          'SUPPORT_KIND':text(attribute(attrs,['SUPPORT_KIND'])),
          'SUPPORT_MAPPER_KIND':text(attribute(attrs,['SUPPORT_MAPPER_KIND'])),
          'RAW_TYPE':text(attribute(attrs,['RAW_TYPE'])),
          'JSON source path':path,
          'JSON ordinal':sequence,
          'Grouping mode':policy.matchMode,
          'Tolerance (mm)':policy.tolerance,
          'Datum X (mm)':policy.offset.x,
          'Datum Y (mm)':policy.offset.y,
          'Datum Z (mm)':policy.offset.z,
          'Member REF':text(attribute(attrs,['REF','RefNo','ComponentRefNo'])),
          'Attached component REF':text(attribute(attrs,['COMPRE','ATTACHED_COMPONENT_REF'])),
          'CMPSUPGAP':text(attribute(attrs,['CMPSUPGAP'])),
          'CMPSUPGAP_POS':text(attribute(attrs,['CMPSUPGAP_POS'])),
          'CMPSUPGAP_PS':text(attribute(attrs,['CMPSUPGAP_PS'])),
          'SOURCE_NODETYPE':text(attribute(attrs,['SOURCE_NODETYPE'])),
          'SOURCE_NODEGAP':text(attribute(attrs,['SOURCE_NODEGAP'])),
          'SUPPORT_TYPE':text(attribute(attrs,['SUPPORT_TYPE'])),
          'SUPPORT_EFFECTIVE_GAP':text(attribute(attrs,['SUPPORT_EFFECTIVE_GAP'])),
          'SUPPORT_GAP_SOURCE':text(attribute(attrs,['SUPPORT_GAP_SOURCE'])),
          'Source attributes JSON':JSON.stringify(attrs),
          'Source member JSON':JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>key!=='children'))),
        });
      }
    }
    const next={branch,point:effectivePoint};
    if(Array.isArray(value.children))
      value.children.forEach((child,index)=>walk(child,next,path+'.children['+index+']'));
  }
  walk(source,{branch:'',point:null},'$');
  const csv=[JSON_TRACE_SIDECAR_COLUMNS.map(safeCell).join(','),
    ...rows.map(row=>JSON_TRACE_SIDECAR_COLUMNS.map(key=>safeCell(row[key])).join(','))].join('\n');
  return {
    schema:'XML229.StagedJsonTraceSidecar.v1',
    csv,rowCount:rows.length,positionedRows:positionCount,
    inheritedPositionRows:inheritedCount,
    memberRows:rows,columns:JSON_TRACE_SIDECAR_COLUMNS,config:policy,
  };
}

/** Compare all original member paths, including unmatched XML members. No
 * coordinate or assembly key deduplication, no substring matches. Raw JSON
 * snapshots retain null, zero, whitespace, typed values and all attributes.
 * A duplicate or extra row cannot improve the score. */
export function compareStagedJsonTraceSidecar(expectedRows, importedRows) {
  const expected=Array.isArray(expectedRows)?expectedRows:[];
  const imported=Array.isArray(importedRows)?importedRows:[];
  const byPath=new Map();
  for(const row of imported){
    const path=String(row?.['JSON source path']??'');
    if(!byPath.has(path))byPath.set(path,[]);
    byPath.get(path).push(row);
  }
  const rows=[];let matched=0,missing=0,duplicates=0,extra=0,changed=0;
  const report=(path,status,fields=[])=>{if(rows.length<100)rows.push({sourcePath:path,status,fields,matched:status==='MATCH'});};
  for(const row of expected){
    const path=row['JSON source path'],candidates=byPath.get(path)||[];
    byPath.delete(path);
    if(!candidates.length){missing++;report(path,'MISSING');continue;}
    if(candidates.length!==1){duplicates+=candidates.length-1;report(path,'DUPLICATE');}
    const actual=candidates[0];
    const fields=JSON_TRACE_SIDECAR_COLUMNS.filter(key=>
      !Object.hasOwn(actual,key)||String(actual[key]??'')!==projectedCell(row[key]));
    if(fields.length){changed++;report(path,'FIELD_MISMATCH',fields);}
    else if(candidates.length===1)matched++;
  }
  for(const [path,items] of byPath){extra+=items.length;report(path,'EXTRA');}
  const compared=expected.length+extra+duplicates;
  return {schema:'XML229.StagedJsonSidecarRoundTrip.v1',expected:expected.length,
    imported:imported.length,compared,matched,mismatched:compared-matched,
    missing,extra,duplicates,changed,percent:compared?100*matched/compared:0,
    complete:compared>0&&matched===compared,rows,engineeringReady:false};
}
