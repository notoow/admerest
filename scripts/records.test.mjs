import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankRecords,recordTotals} from '../dist/records.js';
test('rank by independent surgery cases, not ADM length; do not mutate source records',()=>{
 const records=[{id:'a',cases:5,length:1000},{id:'b',cases:12,length:40}];
 const ranked=rankRecords(records);assert.deepEqual(ranked.map(d=>d.id),['b','a']);assert.deepEqual(ranked.map(d=>d.rank),[1,2]);
 assert.equal(records[0].id,'a');assert.deepEqual(recordTotals(records),{cases:17,length:1040});
 assert.deepEqual(recordTotals([]),{cases:0,length:0});
});
