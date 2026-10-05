import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionPayload,reviewError,canSubmit,evidenceError,publicRecord} from '../dist/service-model.js';
import {examplePayload,demoService} from '../dist/service-demo.js';
import {escapeHTML} from '../dist/html.js';
import {toDraft} from '../dist/service-model.js';
test('payload drops authority fields and keeps cases independent of sheet counts',()=>{
 const row=examplePayload(),draft={...toDraft(row),status:'approved',verification:'verified',owner_id:'someone'};
 const {payload,errors}=submissionPayload(draft,row.period_end,true);assert.deepEqual(errors,{});assert.equal(payload.cases,3100);assert(!Object.hasOwn(payload,'status'));assert(!Object.hasOwn(payload,'owner_id'));
 assert(Object.keys(submissionPayload(draft,'2999-01-01',true).errors).includes('period_end'));
});
test('verification requires two kinds of evidence and both reviewer confirmations',()=>{
 const row={...examplePayload(),status:'draft'};assert(canSubmit(row,[]));assert(canSubmit(row,[{kind:'credential'}]));assert.equal(canSubmit(row,[{kind:'credential'},{kind:'records'}]),'');
 row.status='submitted';assert(reviewError(row,'approved','',true,false));assert.equal(reviewError(row,'approved','',true,true),'');assert(reviewError(row,'rejected','',false,false));
});
test('uploaded files are bounded and display text is escaped at the HTML boundary',()=>{
 assert(evidenceError({type:'text/html',size:123}));assert(evidenceError({type:'application/pdf',size:11*1024*1024}));assert.equal(evidenceError({type:'image/jpeg',size:123}),'');
 assert.equal(escapeHTML('<img src=x onerror="attack">'), '&lt;img src=x onerror=&quot;attack&quot;&gt;');
 const row=publicRecord({id:'test',display_name:'name',country:'KR',cases:3,length_m:'0.12',sheets:2,owner_id:'private',email:'private'});assert(!Object.hasOwn(row,'email'));assert(!Object.hasOwn(row,'owner_id'));assert.equal(row.length,.12);
});
test('rehearsal: request → return for changes → resubmit → approve → stable public link → hide',async()=>{
 const data=new Map();globalThis.sessionStorage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 const owner=demoService(),admin=demoService('admin');let row=await owner.saveSubmission(examplePayload());
 await assert.rejects(()=>owner.saveSubmission({status:'submitted'},row),/자료/);await owner.addDemoEvidence(row);row=await owner.saveSubmission({status:'submitted'},row);
 row=await admin.saveSubmission({status:'changes_requested',review_note:'집계 기준 보완'},row);row=await owner.saveSubmission({status:'submitted'},row);
 row=await admin.saveSubmission({status:'approved',credential_checked:true,records_checked:true,review_note:'시연 확인'},row);
 assert.equal((await owner.publicRecords())[0].cases,3100);assert.equal((await owner.myPublicRecord()).cases,3100);assert.equal((await owner.events(row.id)).length,5);
 assert.equal((await owner.publicRecords())[0].length,186);assert.equal(row.sheets,0,'case visualization must not invent material usage');
 const publicId=(await owner.publicRecords())[0].id;
 let next=await owner.saveSubmission({...examplePayload(),cases:3200,verification_requested:false});assert.equal((await owner.publicRecords())[0].cases,3100);assert.equal((await owner.myPublicRecord()).cases,3100);
 next=await owner.saveSubmission({status:'submitted'},next);await admin.saveSubmission({status:'approved'},next);const result=(await owner.publicRecords())[0];assert.equal(result.id,publicId);assert.equal(result.verification,'none');
 await owner.hideRecord();assert.deepEqual(await owner.publicRecords(),[]);assert.equal(await owner.myPublicRecord(),null);
 let restored=await owner.saveSubmission({...examplePayload(),cases:3500,verification_requested:false});
 restored=await owner.saveSubmission({status:'submitted'},restored);await admin.saveSubmission({status:'approved'},restored);
 assert.equal((await owner.myPublicRecord()).id,publicId);assert.equal((await owner.myPublicRecord()).cases,3500);
 delete globalThis.sessionStorage;
});

test('case-only record entry accepts no material ledger and preserves legacy drafts without fabricating counts',()=>{
 const draft={name:'시연 전문의',clinic:'',country:'KR',cases:'1,250'};
 const {errors,payload}=submissionPayload(draft,'2026-10-01',false);
 assert.deepEqual(errors,{});assert.equal(payload.cases,1250);
 assert(Object.values(payload.materials).every(value=>value===0));
 assert.deepEqual(submissionPayload(toDraft({...payload,materials:undefined}),'2026-10-01',false).errors,{});
 const legacy={...payload,materials:{...payload.materials,'6x12-dry':14}};
 assert.equal(submissionPayload(toDraft(legacy),'2026-10-01',false).payload.materials['6x12-dry'],14);
});
