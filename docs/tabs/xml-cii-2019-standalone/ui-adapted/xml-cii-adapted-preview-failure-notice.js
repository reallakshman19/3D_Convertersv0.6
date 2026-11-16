/** Shared source-bound restraint status between 4 Preview and O1 JSON Trace.
 * A quarantined Preview conflict is a FOR_REVIEW warning, NOT a failed Preview
 * and NEVER authorization for Final CII or replacement source classification.
 */
const EVENT='xml-cii-preview-failure';
let last=null,review=null;
const text=v=>String(v??'');
function emit(){
 try{globalThis.dispatchEvent?.(new CustomEvent(EVENT,{detail:{failure:last,review}}));}
 catch{/* no DOM */}
}
export function recordPreviewFailure(failure){
 last=failure?{
  code:text(failure.code),message:text(failure.message),
  at:new Date().toISOString(),
 }:null;
 emit();
}
export function lastPreviewFailure(){return last;}

export function recordPreviewRestraintReview(value){
 if(value==null){review=null;emit();return;}
 if(value?.schema!=='XML229.PreviewRestraintReview.v1'||
    !['CLEAR','FOR_REVIEW'].includes(value.status)||
    !Array.isArray(value.warnings)||
    (value.status==='FOR_REVIEW')!==(value.warnings.length>0)){
  // A malformed Worker review receipt must not downgrade an earlier hold.
  throw Object.assign(new Error('Invalid source-bound restraint review'),
    {code:'PREVIEW_RESTRAINT_REVIEW_INVALID'});
 }
 review={
  schema:value.schema,status:value.status,
  engineeringRestraintAcceptance:value.engineeringRestraintAcceptance,
  quarantinedXmlNodeCount:value.quarantinedXmlNodeCount,
  warnings:value.warnings.map(w=>({
   code:text(w.code),nodeNumber:text(w.nodeNumber),
   branchName:text(w.branchName),message:text(w.message),
   path:text(w.member?.path),memberName:text(w.member?.name),
   sourcePaths:Array.isArray(w.sourcePaths)?w.sourcePaths.map(text):[],
  })),
 };
 emit();
}
export function lastPreviewRestraintReview(){return review;}

/** Only a completed source-bound quarantine result is a review warning.
 * Never infer review severity from a broad error-code prefix. */
export function showRestraintReview(panel,review) {
  if(!panel)return;
  panel.querySelector('[data-restraint-review]')?.remove();
  if(review?.status!=='HOLD'&&review?.status!=='FOR_REVIEW'&&review?.status!=='REVIEW_BLOCKED')return;
  const section=document.createElement('section');
  section.dataset.restraintReview='true';
  section.setAttribute('role',['HOLD','FOR_REVIEW'].includes(review.status)?'status':'alert');
  section.style.cssText=['HOLD','FOR_REVIEW'].includes(review.status)
    ?'color:#92400e;background:#fffbeb;border:1px solid #d97706;padding:8px;border-radius:5px;'
    :'color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:8px;border-radius:5px;';
  const title=document.createElement('p');
  const warnings=Array.isArray(review.warnings)?review.warnings:[];
  title.textContent=['HOLD','FOR_REVIEW'].includes(review.status)
    ?'FOR REVIEW — '+warnings.length+' source restraint conflict(s). Trace and Preview remain available; independent Weight review may continue. Engineering restraint acceptance and native Final are HELD.'
    :'Restraint review blocked: '+String(review.code||'')+' — '+String(review.error||'');
  section.append(title);
  if(warnings.length){
    const details=document.createElement('details');
    const summary=document.createElement('summary');
    summary.textContent='Source-bound conflicts (XML node / JSON member)';
    details.append(summary);
    const list=document.createElement('ul');
    for(const row of warnings){
      const li=document.createElement('li');
      li.textContent='XML Node '+String(row.nodeNumber||'?')+' — '+String(row.branchName||'')+
        ' — '+String(row.message||row.code||'')+
        (row.member?.path?' — '+row.member.path:'');
      list.append(li);
    }
    details.append(list);section.append(details);
  }
  panel.append(section);
}

function paintStatus(panel){
 if(!panel)return;
 let blocked=panel.querySelector('[data-preview-blocker]');
 const failure=last&&/^PREFINAL_RESTRAINT_/.test(last.code)?last:null;
 if(!failure)blocked?.remove();
 else{
  if(!blocked){
   blocked=document.createElement('p');blocked.dataset.previewBlocker='true';
   blocked.setAttribute('role','alert');
   blocked.style.cssText='color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:7px;border-radius:5px;';
   panel.append(blocked);
  }
  blocked.textContent='Preview blocked: '+failure.code+' — '+failure.message;
 }
 let warning=panel.querySelector('[data-preview-restraint-review]');
 if(review?.status!=='FOR_REVIEW'){warning?.remove();return;}
 if(!warning){
  warning=document.createElement('div');
  warning.dataset.previewRestraintReview='true';
  warning.setAttribute('role','status');
  warning.style.cssText='color:#fde68a;background:#422006;border:1px solid #d97706;padding:8px;border-radius:5px;';
  panel.append(warning);
 }
 const count=review.warnings.length;
 const first=review.warnings.slice(0,5).map(w=>
   (w.nodeNumber?'Node '+w.nodeNumber+': ':'')+
   (w.memberName||w.path||w.sourcePaths[0]||'source member')+' — '+w.code);
 warning.textContent='For Review — '+count+' quarantined restraint source conflict(s), '+
   review.quarantinedXmlNodeCount+' XML node(s). Preview and independent Weight can continue; '+
   'engineering acceptance HOLD, approved Final CII blocked. '+
   first.join(' | ')+(count>5?' | +'+(count-5)+' more':'');
}
export function showPreviewBlocker(panel){
 if(!panel)return;
 paintStatus(panel);
 if(panel.dataset.previewBlockerListener!=='true'){
  panel.dataset.previewBlockerListener='true';
  globalThis.addEventListener?.(EVENT,()=>{
   if(panel.isConnected)paintStatus(panel);
  });
 }
}
export const showPreviewRestraintStatus=showPreviewBlocker;
