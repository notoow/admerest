// Explicit, isolated rehearsal. Never imported by the production API and never grants authority.
import {blankDraft} from './draft-record.js';
import {materialSummary,canSubmit,reviewError,publicRecord} from './service-model.js';
const KEY='admerest.rehearsal.v1';
const clone=value=>structuredClone(value);
export function examplePayload(){const draft=blankDraft();return {display_name:'시연 전문의',clinic:'시연 클리닉',country:'KR',cases:3100,materials:{...Object.fromEntries(Object.keys(draft.materials).map(k=>[k,0])),'5x6-hydrated':2100,'5x8-dry':400,'5x10-hydrated':300,'6x12-dry':100},period_end:'2026-10-01',verification_requested:true};}
function read(){try{const value=JSON.parse(sessionStorage.getItem(KEY));if(value?.version===1)return value;}catch{}return {version:1,rows:[],documents:[],events:[],published:[]};}
function write(state){sessionStorage.setItem(KEY,JSON.stringify(state));}
function event(state,row,note=''){state.events.push({id:crypto.randomUUID(),submission_id:row.id,status:row.status,note,created_at:new Date().toISOString()});}
export function demoService(role='owner'){
 return {
  demo:true,configured:true,registrationOpen:true,
  session:async()=>({user:{id:role==='admin'?'demo-reviewer':'demo-owner',email:role==='admin'?'reviewer@example.invalid':'demo@example.invalid'}}),
  reviewerAccess:async()=>role==='admin',signOut:async()=>{},
  listSubmissions:async()=>clone(read().rows).reverse(),
  saveSubmission:async(payload,old)=>{
   const state=read(),now=new Date().toISOString();let row=old?state.rows.find(s=>s.id===old.id):null;
   if(old&&(!row||row.version!==old.version))throw new Error('시연 기록이 변경됐습니다. 새로고침해 주세요.');
   if(!row){if(state.rows.some(r=>['draft','submitted','changes_requested'].includes(r.status)))throw new Error('진행 중인 신청부터 마쳐 주세요.');row={id:crypto.randomUUID(),owner_id:'demo-owner',status:'draft',version:0,review_note:'',created_at:now,...payload};state.rows.push(row);}
   else if(role==='admin'){
    const error=reviewError(row,payload.status,payload.review_note,payload.credential_checked,payload.records_checked);if(error)throw new Error(error);
    Object.assign(row,payload,{reviewed_at:now});
   }else{
    if(payload.status==='submitted'){const error=canSubmit(row,state.documents.filter(d=>d.submission_id===row.id));if(error)throw new Error(error);}
    else if(!['draft','changes_requested'].includes(row.status)&&payload.status!=='withdrawn')throw new Error('심사 중에는 수정할 수 없습니다.');
    Object.assign(row,payload);if(row.status==='submitted')row.submitted_at=now;
   }
   row.version++;row.updated_at=now;const totals=materialSummary(row);row.sheets=totals.sheets;row.length_m=totals.length;
   if(row.status==='approved')state.published=[{id:state.published[0]?.id??crypto.randomUUID(),...Object.fromEntries(['display_name','clinic','country','cases','sheets','length_m','period_end'].map(k=>[k,row[k]])),verification:row.verification_requested?'verified':'none',verified_at:row.verification_requested?now:null,updated_at:now,published:true}];
   if(!old||old.status!==row.status)event(state,row,row.review_note);write(state);return clone(row);
  },
  documents:async(id)=>clone(read().documents.filter(d=>d.submission_id===id)),events:async(id)=>clone(read().events.filter(e=>e.submission_id===id)),
  addDemoEvidence:async(row)=>{const state=read();for(const kind of ['credential','records'])if(!state.documents.some(d=>d.submission_id===row.id&&d.kind===kind))state.documents.push({id:crypto.randomUUID(),submission_id:row.id,kind,filename:kind==='credential'?'전문의 자격 확인 · 가상 자료':'CRM 집계 기록 · 가상 자료',size_bytes:0,demo:true});write(state);},
  removeEvidence:async(doc)=>{const state=read();state.documents=state.documents.filter(d=>d.id!==doc.id);write(state);},
  publicRecords:async()=>read().published.filter(r=>r.published).map(row=>({...publicRecord(row),simulated:true})),hideRecord:async()=>{const state=read();state.published=[];write(state);},
  reset:()=>sessionStorage.removeItem(KEY)
 };
}
