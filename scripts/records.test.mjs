import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankRecords,recordTotals,isTowerPublished,PUBLIC_DOCTORS,RANKED_DOCTORS} from '../dist/records.js';
test('rank by independent surgery cases, not ADM length; do not mutate source records',()=>{
 const records=[{id:'a',cases:5,length:1000},{id:'b',cases:12,length:40}];
 const ranked=rankRecords(records);assert.deepEqual(ranked.map(d=>d.id),['b','a']);assert.deepEqual(ranked.map(d=>d.rank),[1,2]);
 assert.equal(records[0].id,'a');assert.deepEqual(recordTotals(records),{cases:17,length:1040});
 assert.deepEqual(recordTotals([]),{cases:0,length:0});
});
test('unverified records remain in ranking but have no published tower',()=>{
 assert.equal(RANKED_DOCTORS.length,3);assert.deepEqual(PUBLIC_DOCTORS.map(d=>d.id),['kim']);
 assert(isTowerPublished({verification:'verified',country:'JP'}));
 for(const verification of ['none','pending','rejected',undefined])assert.equal(isTowerPublished({verification,country:'KR'}),false);
});
