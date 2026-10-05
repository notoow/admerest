import {ContactDialog} from './contact-dialog.js?v=20261005-records';
import {trackOverlay} from './overlay-navigation.js';
import {DOCTORS,rankRecords} from './records.js';
import {LANDMARKS} from './landmark-data.js';
import {DRAFT_KEY,blankDraft,materialTotals,readCount,validateDraft,previewRecord,draftEnvelope,restoreDraft} from './draft-record.js';

const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],format=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let step=1,preview,loading=null,stored=false;
const contact=new ContactDialog();
function readDraft(){return {name:$('#draft-name').value,clinic:$('#draft-clinic').value,country:$('#draft-country').value,cases:$('#draft-cases').value,materials:Object.fromEntries(all('[data-material]').map(input=>[input.dataset.material,input.value]))};}
function fill(draft){for(const key of ['name','clinic','country','cases'])$('#draft-'+key).value=draft[key];all('[data-material]').forEach(input=>input.value=draft.materials[input.dataset.material]??'');summarize();}
function summarize(){
 const draft=readDraft(),cases=readCount(draft.cases,false);
 $('#summary-name').textContent=draft.name.trim()||'당신의 기록';$('#summary-cases').textContent=cases===null?'—':format.format(cases);
 if(stored)$('#draft-storage-status').textContent='변경한 내용은 저장을 눌러야 이 기기에 남습니다.';
}
function errors(values={}){
 all('.field-error').forEach(el=>{el.hidden=true;el.textContent='';});all('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));$('#record-form-status').textContent='';
 for(const [key,message]of Object.entries(values)){const el=$('#error-'+key);el.textContent=message;el.hidden=false;$('#draft-'+key)?.setAttribute('aria-invalid','true');}
 if(Object.keys(values).length){$('#record-form-status').textContent='표시된 입력 내용을 확인해 주세요.';const first=Object.keys(values)[0];($('#draft-'+first)??$('[data-material]')).focus();}
}
function showStep(next,focus=true){
 step=next;all('[data-step]').forEach(section=>section.hidden=Number(section.dataset.step)!==step);all('.record-steps li').forEach((el,i)=>{el.toggleAttribute('aria-current',i+1===step);if(i+1===step)el.setAttribute('aria-current','step');el.dataset.complete=String(i+1<step);});
 $('#previous-step').hidden=step===1;$('#next-step').hidden=step===2;$('#reveal-draft').hidden=step!==2;$('#next-step').textContent='집도 기록 확인하기 →';
 $('#draft-view-controls').hidden=step!==2;$('#preview-object-labels').hidden=step!==2||!preview;$('#preview-placeholder').hidden=step===2&&!!preview;$('#draft-canvas').hidden=step!==2;
 if(preview)preview.active=step===2;
 if(step===2){review();preparePreview();}
 if(focus){const title=$(`[data-step="${step}"] h2`);title.focus({preventScroll:true});title.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}
}
function review(){
 const {record}=previewRecord(readDraft());if(!record)return;
 $('#review-name').textContent=record.name;$('#review-clinic').textContent=record.clinic||'소속 미입력';$('#review-flag').src=`./assets/${record.country}.svg`;$('#review-flag').alt=record.countryName;
 $('#review-cases').textContent=`${format.format(record.cases)}건`;
 const position=rankRecords([...DOCTORS,record]).find(d=>d.id===record.id).rank;$('#draft-rank-value').textContent=`${position}번째 / 4명`;
 comparison();
}
function comparison(){
 const {record}=previewRecord(readDraft());if(!record)return;const landmark=LANDMARKS[$('#draft-landmark').value];
 $('#preview-cases').textContent=`${format.format(record.cases)}건`;$('#landmark-height').textContent=`${landmark.name} · ${format.format(landmark.height)} m`;
 $('#draft-comparison').textContent=`내 집도 기록을 표현한 탑은 ${landmark.name} 높이의 ${format.format(record.length/landmark.height*100)}%입니다.`;
}
async function preparePreview(){
 $('#reveal-draft').disabled=true;$('#reveal-draft').textContent='3D 준비 중…';
 if(!preview){
  $('#preview-placeholder strong').textContent='내 기록의 탑을 준비하고 있어요.';
  try{loading??=import('./draft-preview.js');const {DraftPreview}=await loading;if(!preview)preview=new DraftPreview($('#draft-canvas'),()=>{$('.draft-preview-card').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});$('#reset-draft-view').focus({preventScroll:true});});}
  catch(error){loading=null;console.warn('Draft preview unavailable:',error.message);$('#preview-placeholder strong').textContent='3D 미리보기를 불러오지 못했습니다.';$('#preview-placeholder>span').textContent='입력과 저장은 가능합니다. 버튼을 눌러 다시 시도하세요.';$('#reveal-draft').textContent='3D 다시 불러오기 ↻';$('#reveal-draft').disabled=false;return;}
 }
 const {record}=previewRecord(readDraft());if(step!==2||!record){preview.active=false;return;}
 preview.setRecord(record);preview.setLandmark($('#draft-landmark').value);preview.resize();$('#preview-placeholder').hidden=true;$('#preview-object-labels').hidden=false;
 $('#reveal-draft').disabled=false;$('#reveal-draft').textContent='내 기록의 순간 감상하기 ▶';
}
$('#record-form').addEventListener('submit',event=>{event.preventDefault();if(step===2)return;const problems=validateDraft(readDraft(),step);errors(problems);if(Object.keys(problems).length)return;showStep(step+1);});
$('#previous-step').addEventListener('click',()=>{errors();showStep(Math.max(1,step-1));});
$('#record-form').addEventListener('input',event=>{
 summarize();const problems=validateDraft(readDraft(),step),key=event.target.id?.replace(/^draft-/,'');
 for(const field of [key,'materials']){const message=$('#error-'+field);if(message&&!problems[field]){message.hidden=true;message.textContent='';$('#draft-'+field)?.removeAttribute('aria-invalid');}}
 if(!all('.field-error').some(el=>!el.hidden))$('#record-form-status').textContent='';
});$('#draft-country').addEventListener('change',summarize);
$('#draft-landmark').addEventListener('change',event=>{preview?.setLandmark(event.target.value);comparison();});$('#reset-draft-view').addEventListener('click',()=>preview?.fit());
$('#reveal-draft').addEventListener('click',()=>{if(!preview){preparePreview();return;}const {record}=previewRecord(readDraft());if(record){preview.setRecord(record);preview.play();}});
$('#fill-example').addEventListener('click',()=>{const draft=blankDraft();draft.name='샘플 전문의';draft.clinic='예시 클리닉';draft.cases='1250';const values=[500,80,120,40,150,70,20,25];Object.keys(draft.materials).forEach((key,i)=>draft.materials[key]=String(values[i]));fill(draft);errors();$('#record-form-status').textContent='가상의 예시를 채웠습니다. 자유롭게 수정해 보세요.';});
$('#save-draft').addEventListener('click',()=>{
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draftEnvelope(readDraft())));stored=true;$('#delete-draft').hidden=false;$('#draft-storage-status').textContent='이 기기에 초안을 저장했습니다. 서버 전송이나 공개 등록은 하지 않았습니다.';}
 catch{$('#draft-storage-status').textContent='이 브라우저에서 저장할 수 없습니다. 현재 입력과 미리보기는 계속 사용할 수 있습니다.';}
});
let leaveDiscard;
function askDiscard(){leaveDiscard=trackOverlay(()=>$('#discard-draft').close());$('#discard-draft').showModal();$('#cancel-discard').focus();}
$('#discard-draft').addEventListener('close',()=>leaveDiscard?.());
$('#delete-draft').addEventListener('click',askDiscard);$('#reset-draft').addEventListener('click',askDiscard);$('#cancel-discard').addEventListener('click',()=>$('#discard-draft').close());
$('#confirm-discard').addEventListener('click',()=>{
 try{localStorage.removeItem(DRAFT_KEY);}catch{$('#discard-draft').close();$('#draft-storage-status').textContent='브라우저가 삭제를 허용하지 않았습니다. 저장 설정을 확인해 주세요.';return;}
 stored=false;fill(blankDraft());errors();$('#restored-notice').hidden=true;$('#delete-draft').hidden=true;$('#draft-storage-status').textContent='초안을 지웠습니다. 새 기록을 입력해 보세요.';$('#discard-draft').close();showStep(1);
});
try{const saved=restoreDraft(localStorage.getItem(DRAFT_KEY));if(saved){fill(saved);stored=true;$('#restored-notice').hidden=false;$('#delete-draft').hidden=false;$('#draft-storage-status').textContent='이 기기에 저장된 초안입니다.';}}catch{$('#draft-storage-status').textContent='브라우저 저장이 제한돼 있습니다. 저장 없이 미리 볼 수 있습니다.';}
showStep(1,false);
if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'get_record_draft_state',description:'Read this local-only record preview, aggregate counts and step. Never returns name or clinic. Does not submit or publish records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({content:[{type:'text',text:JSON.stringify({step,stored,valid:Object.keys(validateDraft(readDraft())).length===0,cases:readCount(readDraft().cases,false),materials:materialTotals(readDraft().materials),visibility:'private-preview',verification:'none',previewReady:!!preview,reveal:preview?.reveal.state()??null})}]})});}catch(error){console.warn('Record preview tool unavailable:',error.message);}}

$('#continue-registration').addEventListener('click',()=>{
 const draft=readDraft(),problems=validateDraft(draft);
 if(Object.keys(problems).length){errors(problems);return;}
 contact.open('verification',$('#continue-registration'),draftEnvelope(draft).draft);
});
