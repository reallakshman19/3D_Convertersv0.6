/** Conservative source mismatch guard for explicit named BRANCH-array exports.
 * No rejection for unscoped/other JSON schemas, partial overlaps, explicit
 * attachment/reference overlap, or shared support identities. XML-only stays
 * on its independent route. No engineering authority is granted here.
 */
import {canonicalStandaloneDtxrBranch,parseStandaloneDtxrXmlNodes} from '../xml-cii-trace-resolution-ledger.js';
const text=v=>String(v??'').trim();
const root=v=>canonicalStandaloneDtxrBranch(v).root.replace(/["']/g,'');
const key=v=>text(v).replace(/^[=/]+/,'').replace(/\s+/g,'').toUpperCase();
const ps=v=>[...text(v).toUpperCase().matchAll(/PS-?\d+/g)].map(m=>m[0].replace('-',''));
export function inspectXml229StagedScope(xmlText,stagedJsonText){
 if(!stagedJsonText)return {status:'XML_ONLY'};
 let source;try{source=JSON.parse(stagedJsonText.replace(/^\uFEFF/,''));}catch{return {status:'UNKNOWN'};}
 if(!Array.isArray(source)||!source.length||!source.every(b=>
   text(b?.type||b?.attributes?.TYPE).toUpperCase()==='BRANCH'&&text(b?.name||b?.attributes?.NAME)&&Array.isArray(b.children)))
   return {status:'UNKNOWN'};
 const jsonRoots=new Set(source.map(b=>root(b.name||b.attributes.NAME)));
 if(jsonRoots.has('/'))return {status:'UNKNOWN'};
 const nodes=parseStandaloneDtxrXmlNodes(xmlText);
 if(!nodes.length||nodes.some(n=>!text(n.xmlBranch)))return {status:'UNKNOWN'};
 const xmlBranches=new Set(nodes.map(n=>canonicalStandaloneDtxrBranch(n.xmlBranch).full));
 const xmlRoots=new Set(nodes.map(n=>root(n.xmlBranch)));
 if([...jsonRoots].some(r=>xmlRoots.has(r)))return {status:'OVERLAP'};
 const xmlKeys=new Set(nodes.flatMap(n=>[n.xmlNodeName,n.componentRefNo,n.psKey]).map(key).filter(Boolean));
 const xmlPs=new Set(nodes.flatMap(n=>ps(n.xmlNodeName||n.psKey)));
 const stack=[...source];
 while(stack.length){
   const value=stack.pop();
   if(!value||typeof value!=='object')continue;
   if(Array.isArray(value)){for(const child of value)stack.push(child);continue;}
   for(const [field,v] of Object.entries(value)){
     if(v&&typeof v==='object'){stack.push(v);continue;}
     if(typeof v!=='string')continue;
     // Exact original identity or an explicit branch link is enough to defer
     // to the existing detailed resolver; never use a substring as approval.
     if(xmlKeys.has(key(v))||ps(v).some(t=>xmlPs.has(t)))return {status:'POSSIBLE_OVERLAP'};
     if(/(?:BRAN|OWNER|COMPRE|REF|PIPE)/i.test(field)&&/\/B\d+$/i.test(v)&&xmlRoots.has(root(v)))return {status:'POSSIBLE_OVERLAP'};
     if(/(?:REF|NAME)/i.test(field)&&[...v.matchAll(/=\d+\/\d+/g)].some(m=>xmlKeys.has(key(m[0]))))return {status:'POSSIBLE_OVERLAP'};
   }
 }
 return {status:'DISJOINT',xmlBranches:xmlBranches.size,jsonBranches:source.length,xmlNodes:nodes.length,
   firstXmlBranch:[...xmlBranches][0],firstJsonBranch:source[0].name||source[0].attributes.NAME};
}
export function assertXml229StagedScope(xmlText,stagedJsonText){
 const report=inspectXml229StagedScope(xmlText,stagedJsonText);
 if(report.status==='DISJOINT'){
   const error=new Error('Staged JSON and XML cover disjoint named piping branches (XML '+report.xmlBranches+
     ', JSON '+report.jsonBranches+'). No branch root, support identity or component reference overlaps. XML example: '+
     report.firstXmlBranch+'; JSON example: '+report.firstJsonBranch+'. Load corresponding JSON or explicitly select XML-only Preview. Source remains HELD.');
   error.code='ENGINEERING_PREVIEW_STAGED_SCOPE_MISMATCH';error.retryable=false;throw error;
 }
 return report;
}
