import {createElement,downloadTextFile} from './xml-cii-adapted-dom.js';
import {restraintAuditRows,restraintAuditSourceGapRows,restraintAuditCsv,restraintAuditHtml} from '../xml-cii-restraint-audit-export.js';
import {digestUtf8} from '../../../contracts/gc-pw-v1/contract.mjs';
import {getXml229VerifiedEngineeringEntry} from '../integration/xml229-engineering-basis-authority.mjs';
import {captureXml229NativeRunContext} from './xml229-native-run-context.mjs';
import {readXml229NativeFinalObservation} from '../integration/xml229-native-final-observation.mjs';

export function restraintAuditFromResult(result) {
  if(result?.restraintAudit)return result.restraintAudit;
  if(result?.xml229NativeOutput?.restraintAudit)return result.xml229NativeOutput.restraintAudit;
  const stage=result?.diagnostics?.restraintClosureAudit;
  return stage?{schema:'XML229.RestraintAuditResult.v1',status:'XML_RECORDED',
    scope:'compatibility closure stage only; complete original-source/CII proof not recorded',
    privateOwnerLocalOnly:true,recorded:stage,records:stage.records}:null;
}

const snapshot=state=>({source:state.sourceText,file:state.sourceFile,json:state.stagedJsonText,
  jsonFile:state.stagedJsonFile,config:state.supportConfigJson,options:JSON.stringify(state.options||{}),result:state.result});
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);

export async function currentRestraintAudit(stateRef,report) {
  const state=stateRef.current,initial=snapshot(state);
  const saved=restraintAuditFromResult(state.result);
  if(saved!==report&&saved?.recorded!==report.recorded)return false;
  if(!report.run)return report.status==='XML_RECORDED'&&same(initial,snapshot(stateRef.current));
  const session=getXml229VerifiedEngineeringEntry(stateRef)?.session;
  const context=captureXml229NativeRunContext({stateRef,session,
    liveWorker:()=>getXml229VerifiedEngineeringEntry(stateRef)?.session});
  if(!context?.isCurrent())return false;
  const observation=await readXml229NativeFinalObservation(session,context.isCurrent);
  if(observation.stale||observation.completion?.basisId!==report.run.basisId||
    observation.finalIntent?.intentSha256!==report.run.finalIntentSha256)return false;
  if(report.output?.ciiSha256&&await digestUtf8(state.result.ciiText||'')!==report.output.ciiSha256)return false;
  return context.isCurrent()&&same(initial,snapshot(stateRef.current));
}

function renderRows(parent,rows) {
  parent.replaceChildren();
  const table=createElement('table','','model-converters-workflow-table'),head=createElement('tr');
  for(const label of ['Node','Source member','Field','Before','Enriched XML','CII value','CII address','Status'])
    head.appendChild(createElement('th',label));
  table.appendChild(head);
  for(const row of rows.slice(0,200)) {
    const tr=createElement('tr');
    for(const cell of [row.node,row.source,row.field,row.before,row.after,row.actual,
      row.ciiBlock?`Block ${row.ciiBlock}, slot ${row.ciiSlot}, line ${row.ciiLine}`:'not verified',row.status])
      tr.appendChild(createElement('td',cell==null?'—':String(cell)));
    const detail=createElement('details'),summary=createElement('summary','Source and rule');
    detail.append(summary,createElement('pre',JSON.stringify(row,null,2)));
    tr.children[1].appendChild(detail);table.appendChild(tr);
  }
  const scroll=createElement('div','','model-converters-workflow-table-wrap');
  scroll.style.overflowX='auto';scroll.appendChild(table);
  parent.append(createElement('p',`Showing ${Math.min(rows.length,200)} of ${rows.length} field records. Downloads include all records.`),scroll);
}

function renderSourceGapRows(parent,report) {
  const claims=restraintAuditSourceGapRows(report);
  if(!report.sourceGapCoverage)return;
  const summary=report.sourceGapCoverage.summary||{};
  parent.appendChild(createElement('p',
    'Original JSON gap-source reconciliation: '+(summary.inOriginalXml||0)+
    ' in original XML, '+(summary.verified||0)+' verified in CII, '+
    (summary.unaccounted||0)+' UNACCOUNTED. Source claims are not automatic engineering approvals.'));
  if(!claims.length)return;
  const table=createElement('table','','model-converters-workflow-table');
  const header=createElement('tr');
  for(const label of ['XML node','Source member','Source gap','CII gap','Coverage status','Original path'])
    header.appendChild(createElement('th',label));
  table.appendChild(header);
  for(const claim of claims.slice(0,200)){
    const tr=createElement('tr');
    for(const value of [claim.node,claim.nodeName,claim.raw,claim.actual,claim.status,claim.sourcePath])
      tr.appendChild(createElement('td',value==null?'—':String(value)));
    table.appendChild(tr);
  }
  const wrap=createElement('div','','model-converters-workflow-table-wrap');
  wrap.style.overflowX='auto';wrap.appendChild(table);parent.appendChild(wrap);
}

function downloadSavedDiagnostic(panel,report,status) {
  const button=createElement('button','Download saved audit JSON (historical, not current proof)');
  button.type='button';button.dataset.action='download-restraint-audit-saved-json';
  button.addEventListener('click',()=>{
    try {
      const payload={...report,exportStatus:'SAVED_DIAGNOSTIC_ONLY',
        exportNotice:'Saved historical evidence; current source/configuration/output identity NOT revalidated. No engineering release authority.'};
      downloadTextFile('xml-cii-restraint-audit-SAVED-DIAGNOSTIC.json',
        JSON.stringify(payload,null,2),'application/json;charset=utf-8');
      status.textContent='Saved diagnostic exported. It is not a current-run verification or engineering approval.';
    }catch(error){status.textContent='Saved audit diagnostic export failed: '+String(error?.message||error);}
  });
  panel.appendChild(button);
}

function downloadButton(panel,label,kind,report,stateRef,status,initial,isCurrentAudit) {
  const button=createElement('button',label);button.type='button';
  button.dataset.action='download-restraint-audit-'+kind;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try {
      if(!same(initial,snapshot(stateRef.current))||!await isCurrentAudit(stateRef,report))throw new Error('stale');
      const text=kind==='json'?JSON.stringify(report,null,2):kind==='csv'?restraintAuditCsv(report):restraintAuditHtml(report);
      const mime=kind==='json'?'application/json;charset=utf-8':kind==='csv'?'text/csv;charset=utf-8':'text/html;charset=utf-8';
      downloadTextFile('xml-cii-restraint-audit.'+kind,text,mime);
      status.textContent='Audit downloaded for the recorded conversion.';
    }catch{status.textContent='Audit is stale or unavailable. Run again for the current source and Final review.';}
    finally{button.disabled=false;}
  });
  panel.appendChild(button);
}

export function renderRestraintAuditPanel(parent,{stateRef,isCurrentAudit=currentRestraintAudit}) {
  const panel=createElement('section'),title=createElement('h3','Restraint enrichment audit');
  panel.dataset.restraintAudit='true';panel.appendChild(title);parent.appendChild(panel);
  const report=restraintAuditFromResult(stateRef.current.result);
  if(!report||report.status==='NOT_RECORDED') {
    panel.appendChild(createElement('p','No saved restraint decisions for this run. Rebuild Preview/Final and run again to record the audit.'));
    return;
  }
  const status=createElement('p',`Saved run status: ${report.status}. ${report.scope||'Source XML/JSON restraints'}.`);
  status.setAttribute('role','status');panel.appendChild(status);
  if(report.summary)panel.appendChild(createElement('p',
    `${report.summary.verified} of ${report.summary.recorded} recorded restraints verified; ${report.summary.failed} failed.`));
  for(const error of report.errors||[])panel.appendChild(createElement('p',error.code||'Audit verification failed.'));
  const initial=snapshot(stateRef.current);
  isCurrentAudit(stateRef,report).then(current=>{
    if(same(initial,snapshot(stateRef.current))&&!current)
      status.textContent='STALE — this audit belongs to an earlier source, configuration, Final review or output.';
  }).catch(()=>{status.textContent='Audit currency could not be verified.';});
  panel.appendChild(createElement('p','Saved source → rule → XML → CII evidence. Audit downloads contain private selected source values.'));
  for(const [kind,label] of [['json','Download audit JSON'],['csv','Download audit CSV'],['html','Download readable audit']])
    downloadButton(panel,label,kind,report,stateRef,status,initial,isCurrentAudit);
  downloadSavedDiagnostic(panel,report,status);
  renderSourceGapRows(panel,report);
  const search=createElement('input');search.type='search';search.placeholder='Search node, source member, field or rule';
  search.setAttribute('aria-label','Search restraint audit');panel.appendChild(search);
  const body=createElement('div'),rows=restraintAuditRows(report);panel.appendChild(body);
  const update=()=>{const query=search.value?.trim().toLowerCase()||'';
    renderRows(body,query?rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query)):rows);};
  search.addEventListener('input',update);update();
}
