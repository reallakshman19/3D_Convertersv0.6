/**
 * Last Preview failure, shared read-only with other steps (e.g. JSON Trace)
 * so a blocking source conflict found by Preview is visible where the source
 * is inspected. Display only: it never changes any source, trace or output.
 */
const EVENT = 'xml-cii-preview-failure';
let last = null;

export function recordPreviewFailure(failure) {
  last = failure ? {
    code: String(failure.code || ''),
    message: String(failure.message || ''),
    at: new Date().toISOString(),
  } : null;
  try { globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: last })); } catch { /* no DOM */ }
}

export function lastPreviewFailure() { return last; }

/** Only a completed source-bound quarantine result is a review warning.
 * Never infer review severity from a broad error-code prefix. */
export function showRestraintReview(panel,review) {
  if(!panel)return;
  panel.querySelector('[data-restraint-review]')?.remove();
  if(review?.status!=='HOLD'&&review?.status!=='REVIEW_BLOCKED')return;
  const section=document.createElement('section');
  section.dataset.restraintReview='true';
  section.setAttribute('role',review.status==='HOLD'?'status':'alert');
  section.style.cssText=review.status==='HOLD'
    ?'color:#92400e;background:#fffbeb;border:1px solid #d97706;padding:8px;border-radius:5px;'
    :'color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:8px;border-radius:5px;';
  const title=document.createElement('p');
  const warnings=Array.isArray(review.warnings)?review.warnings:[];
  title.textContent=review.status==='HOLD'
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

/** Render (or clear) the Preview blocker line inside a panel; keeps it current. */
export function showPreviewBlocker(panel) {
  if (!panel) return;
  const paint = () => {
    let line = panel.querySelector('[data-preview-blocker]');
    const failure = last && /^PREFINAL_RESTRAINT_/.test(last.code) ? last : null;
    if (!failure) { line?.remove(); return; }
    if (!line) {
      line = document.createElement('p');
      line.dataset.previewBlocker = 'true';
      line.setAttribute('role', 'alert');
      line.style.cssText = 'color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:7px;border-radius:5px;';
      panel.append(line);
    }
    line.textContent = 'Preview blocked: ' + failure.code + ' — ' + failure.message +
      '. This is a fatal Preview failure, not an O1 source-path failure.';
  };
  paint();
  if (panel.dataset.previewBlockerListener !== 'true') {
    panel.dataset.previewBlockerListener = 'true';
    globalThis.addEventListener?.(EVENT, () => { if (panel.isConnected) paint(); });
  }
}
