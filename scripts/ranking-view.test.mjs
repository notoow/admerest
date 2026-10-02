import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterRanking,rankingRows} from '../dist/ranking-view.js';
import {RANKED_DOCTORS,rankRecords} from '../dist/records.js';
import {CONTACT_EMAIL,contactDraft} from '../dist/contact-info.js';
test('verified filter composes with country without changing global ranks',()=>{
 assert.deepEqual(filterRanking(RANKED_DOCTORS,{verifiedOnly:true}).map(r=>r.id),['kim']);
 assert.deepEqual(filterRanking(RANKED_DOCTORS,{country:'JP',verifiedOnly:true}),[]);
 assert.deepEqual(filterRanking(RANKED_DOCTORS,{country:'JP'}).map(r=>r.rank),[3]);
 assert.equal(filterRanking([{id:'v',country:'US',verification:'verified'}],{verifiedOnly:true}).length,1);
});
test('ad slots separate records without gaining rank or changing order',()=>{
 const records=rankRecords(Array.from({length:7},(_,i)=>({id:String(i),cases:7-i}))),copy=JSON.stringify(records),rows=rankingRows(records);
 assert.deepEqual(rows.filter(r=>r.type==='record').map(r=>r.record),records);assert.equal(JSON.stringify(records),copy);
 assert.equal(rows.filter(r=>r.type==='advertisement').length,3);assert.equal(rows.at(-1).type,'record');assert.deepEqual(rankingRows([]),[]);assert.equal(rankingRows(records.slice(0,1)).length,1);
});
test('inquiries use the supplied recipient and separate encoded drafts, with no automatic submission',()=>{
 for(const kind of ['verification','advertising']){
  const draft=contactDraft(kind),url=new URL(draft.href);assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,CONTACT_EMAIL);assert.equal(url.searchParams.get('subject'),draft.subject);assert.equal(url.searchParams.get('body'),draft.body);
 }
 assert.notEqual(contactDraft('verification').subject,contactDraft('advertising').subject);
 assert.match(contactDraft('verification').body,/집계 자료만/);
});
