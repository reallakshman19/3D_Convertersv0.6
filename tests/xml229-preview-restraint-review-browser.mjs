import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/test.html'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><div id="mc-preview-table-host"></div>');return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':['.js','.mjs'].includes(path.extname(file))?'text/javascript':'application/json'});res.end(data);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 const result=await page.evaluate(async()=>{
  const base='/docs/tabs/xml-cii-2019-standalone/';
  const {openXml229WorkerHeldOriginalWeightReview}=await import(base+'integration/xml229-original-blob-gcpw-client.mjs');
  const {runPreviewButtonSession}=await import(base+'ui-adapted/xml-cii-adapted-preview-facts-button-session.js');
  const {showRestraintReview}=await import(base+'ui-adapted/xml-cii-adapted-preview-failure-notice.js');
  const {parseTraceTableText,buildTraceTableResolverResult}=await import(base+'xml-cii-table-trace-source.js');
  const {traceMemberAssignments}=await import(base+'xml-cii-staged-json-trace-sidecar.js');
  const branch='/SYNTHETIC/P1/B1',sourceId='PUBLIC-RESTRAINT-REVIEW';
  const xml='<PipeStressExport><Pipe><Branch><Branchname>'+branch+'</Branchname>'+
    '<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><Position>0 0 0</Position><OutsideDiameter>60.3</OutsideDiameter></Node>'+
    '<Node><NodeNumber>20</NodeNumber><ComponentType>RIGID</ComponentType><Rigid>2</Rigid><BoreMm>50</BoreMm><ComponentRefNo>R1</ComponentRefNo><Endpoint>2</Endpoint><ElementLengthMm>100</ElementLengthMm><Position>100 0 0</Position><Weight>0</Weight></Node>'+
    '<Node><NodeNumber>140</NodeNumber><NodeName>SL-SYNTH.1.1</NodeName><ComponentType>ANCI</ComponentType><Position>200 0 0</Position><Restraint><Type>+Y</Type><Gap>0</Gap><Stiffness>1000</Stiffness></Restraint></Node>'+
    '</Branch></Pipe></PipeStressExport>';
  const item=(NAME,MDSSUPPFUNC,MDSSUPPTYPE,CMPSUPTYPE,CMPSUPGAP)=>({type:'SUPPORT',attributes:{NAME,POS:{x:200,y:0,z:0},MDSSUPPFUNC,MDSSUPPTYPE,CMPSUPTYPE,CMPSUPGAP,NODETYPE:'14',NODEGAP:'0'}});
  const json=JSON.stringify([{type:'BRANCH',name:branch,children:[
    item('/SL-SYNTH.1.1','PIPE-REST','PIPE-REST','REST',''),
    item('/SL-SYNTH.1.4','AT','AT503','SH-A4-3-CS-950-200',''),
    item('/SL-SYNTH.1.2','ST','ST501','LS-S2-3','GAP=35mm'),
    item('/SL-SYNTH.1.3','GT','GT500','PG-S-3','GAP=10mm')]}]);
  const blob=new Blob([json],{type:'application/json'});
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const receipt={schema:'XML229.OriginalStagedSourceReceipt.v1',phase:'INDEX_COMMITTED',
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,sha256:sha,sourceRevision:'review:sha256:'+sha,
    generationId:'review-gen',sourceRefId:'review-blob',byteLength:blob.size,occurrenceCount:5,pageCount:1};
  const config={dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0},
    resolverJsonTrace:{matchMode:'POS',coordinateTolerance:6}};
  // Actual original-Blob Worker spawns the actual independent Preview child.
  const inputs={xmlText:xml,sourceId,masters:{},config,overrides:{},selection:[{sourceId,selectionRef:'all'}],
    originalStagedBlob:blob,originalStagedSourceReceipt:receipt,requestId:'restraint-review-worker',isCurrent:()=>true};
  const remote=await openXml229WorkerHeldOriginalWeightReview(inputs);
  try{
   const host=document.querySelector('#mc-preview-table-host');
   let rendered=false;
   await runPreviewButtonSession({host,rootEl:document,xmlText:xml,config,
     options:{sourceId,resolveOriginalWorkerPreviewSource:async()=>({blob,receipt,isCurrent:()=>true}),
       openVerifiedEngineeringSession:async()=>remote},
     renderResult:async result=>{rendered=true;host.textContent='Preview rows: '+result.branchRows.length;return result;}});
   const preview=await remote.readPreviewResult(),proof=await remote.readCompletion();
   const facts=await remote.readFacts({limit:100});
   const intent=await remote.readNativeFinalIntent().then(()=>null,e=>e.code);
   const packet=await remote.readNativeFinalPacket().then(()=>null,e=>e.code);
   const attestation=await remote.attestEngineInput({engineInputXmlText:xml}).then(()=>null,e=>e.code);
   // Actual independent O1 worker also finds the conflict before Preview is run.
   const o1=await new Promise((resolve,reject)=>{
     const worker=new Worker(base+'workers/lfj-o1-resolver-domain-worker.mjs',{type:'module'});
     const timer=setTimeout(()=>{worker.terminate();reject(Error('O1 timeout'));},30000);
     let ready,chunks=[],imported,table;
     const identity={schema:'LFJ.O1.DomainWorker.v1',jobId:'review-o1',sourceRefId:'review-blob',sourceSha256:sha,sourceRevision:receipt.sourceRevision};
     const send=(kind,extra={})=>worker.postMessage({...identity,kind,...extra});
     const finish=(err,value)=>{clearTimeout(timer);worker.terminate();err?reject(err):resolve(value);};
     worker.onmessage=({data:m})=>{
       try{
         if(m.kind==='FAILED')return finish(Error(m.code));
         if(m.kind==='READY'){ready=m;send('EXPORT',{type:'sidecar'});}
         if(m.kind==='EXPORT_CHUNK'){chunks.push(m.bytes);send('EXPORT_ACK',{token:m.token});}
         if(m.kind==='EXPORT_END')void new Blob(chunks).text().then(csv=>{
           imported=parseTraceTableText(csv);
           table=buildTraceTableResolverResult({sourceText:xml,rawRows:imported});
           send('COMPARE_SIDECAR',{rows:imported,assignments:traceMemberAssignments(table)});
         }).catch(finish);
         if(m.kind==='COMPARE_SIDECAR')finish(null,{...ready,sidecarRows:imported.length,
           sidecarNames:imported.map(r=>r['Name of the element']),benchmark:m.benchmark});
       }catch(error){finish(error);}
     };
     worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};
     worker.postMessage({schema:'LFJ.O1.DomainWorker.v1',kind:'RUN',jobId:'review-o1',sourceRefId:'review-blob',sourceSha256:sha,
      sourceRevision:receipt.sourceRevision,selectionDigest:'ALL',byteLength:blob.size,committedRoot:{startByte:0,endByteExclusive:blob.size},
      jsonBlob:blob,sourceText:xml,sourceKind:'xml',jsonConfig:config.resolverJsonTrace,supportConfigJson:JSON.stringify(config)});
   });
   const o1host=document.createElement('div');showRestraintReview(o1host,o1.restraintReview);
   return {rendered,notice:host.textContent,review:preview.restraintReview,acceptance:preview.engineeringAcceptance,
     proof,facts:facts.totalCount,intent,packet,attestation,o1:{counts:o1.counts,review:o1.restraintReview,engineeringReady:o1.engineeringReady,notice:o1host.textContent,sidecarRows:o1.sidecarRows,sidecarNames:o1.sidecarNames,benchmark:o1.benchmark}};
  }finally{remote.cancel();}
 });
 assert.equal(result.rendered,true,result.notice);
 assert.match(result.notice,/for review/i);
 assert.doesNotMatch(result.notice,/Preview failed/);
 assert.equal(result.acceptance,'NOT_ASSESSED');
 assert.equal(result.review.engineeringRestraintAcceptance,'HOLD');
 assert.equal(result.review.warnings.length,2);
 assert.equal(result.proof.engineeringRestraintAcceptance,'HOLD');
 assert.equal(result.proof.engineeringFactsVerified,true);
 assert.equal(result.proof.ciiReleaseAuthorized,false);
 assert.ok(result.facts>0);
 for(const code of [result.intent,result.packet,result.attestation])assert.equal(code,'PREFINAL_RESTRAINT_REVIEW_HOLD');
 assert.equal(result.o1.engineeringReady,false);
 assert.ok(result.o1.counts.evidence>0);
 assert.equal(result.o1.review.warnings.length,2);
 assert.match(result.o1.notice,/for review/i);
 assert.equal(result.o1.sidecarRows,4);
 assert.equal(new Set(result.o1.sidecarNames).size,4);
 assert.equal(result.o1.benchmark.complete,true);
 assert.equal(result.o1.benchmark.matched,4);
 assert.deepEqual(errors,[]);
 console.log('Preview/O1 real Worker quarantine, Weight facts and strict native Final RPCs: PASS');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
