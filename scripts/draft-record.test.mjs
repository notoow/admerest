import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankDraft,readCount,materialTotals,validateDraft,previewRecord,draftEnvelope,restoreDraft} from '../dist/draft-record.js';
import {isTowerPublished,DOCTORS,rankRecords} from '../dist/records.js';

function example(){const d=blankDraft();d.name='테스트 전문의';d.cases='1,250';d.materials['5x6-hydrated']='500';d.materials['5x8-dry']='120';d.materials['5x10-hydrated']='10';d.materials['6x12-dry']='3';return d;}
test('all eight size/type bins aggregate independent of surgery cases, in integer centimeters',()=>{
 const d=example(),totals=materialTotals(d.materials);assert.equal(totals.sheets,633);assert.equal(totals.length,40.96);assert.equal(totals.rows.length,4);
 d.cases='9999';assert.equal(materialTotals(d.materials).length,40.96);const result=previewRecord(d);assert.equal(result.record.cases,9999);assert.equal(result.record.sheets,633);assert.equal(result.record.length,599.94);
 for(const key of Object.keys(d.materials))d.materials[key]='1';assert.equal(materialTotals(d.materials).length,.72);assert.equal(materialTotals(d.materials).sheets,8);
});
test('blank, fractional, negative, nonfinite, malformed grouped and excessive counts are rejected before preview',()=>{
 assert.equal(readCount(''),0);assert.equal(readCount('',false),null);assert.equal(readCount('10,000'),10000);
 for(const text of ['-1','1.2','NaN','Infinity','1e3','1,2','100001','<img>'])assert.equal(readCount(text),null);
 const d=example();assert.deepEqual(validateDraft(d),{});d.cases='';assert(validateDraft(d).cases);d.cases='2';d.materials['5x6-hydrated']='100000';assert(validateDraft(d).materials);
 const empty=blankDraft();empty.name='테스트';empty.cases='1';assert.deepEqual(validateDraft(empty),{});assert.deepEqual(validateDraft(empty,1),{});
});
test('local draft restore strips privilege fields and never publishes or changes demo ranking',()=>{
 const d={...example(),verification:'verified',id:'kim',preview:false};const before=JSON.stringify(DOCTORS);const restored=restoreDraft(JSON.stringify(draftEnvelope(d)));
 assert(!Object.hasOwn(restored,'verification'));assert(!Object.hasOwn(restored,'id'));
 const record=previewRecord(restored).record;assert.equal(record.id,'local-preview');assert.equal(record.verification,'none');assert.equal(record.preview,true);assert.equal(isTowerPublished(record),false);
 assert.equal(rankRecords([...DOCTORS,record]).length,4);assert.equal(JSON.stringify(DOCTORS),before);
 for(const bad of ['null','{',JSON.stringify({version:99,draft:d}),' '.repeat(6001)])assert.equal(restoreDraft(bad),null);
});
test('unsupported countries and oversized text cannot become a preview record',()=>{
 const d=example();d.country='../../evil';assert(validateDraft(d).country);d.country='KR';d.name='x'.repeat(41);assert.equal(previewRecord(d).record,null);
 d.name='테스트';d.clinic='x'.repeat(81);assert(validateDraft(d).clinic);
});

test('case-only records do not require a material ledger and use the common 5x6 scale',()=>{
 const d=blankDraft();d.name='예시';d.cases='100';assert.deepEqual(validateDraft(d),{});assert.equal(previewRecord(d).record.length,6);
 d.materials['6x12-dry']='500';assert.equal(previewRecord(d).record.length,6,'product sizes never change case height');
});
