import {test} from 'node:test';
import assert from 'node:assert/strict';
import {revealProgress} from '../dist/record-motion.js';
test('record reveal finishes on exact independent counts, and reduced motion skips the entire animation',()=>{
 let last=0;
 for(let t=0;t<=7;t+=.05){const p=revealProgress(t);assert(p.count>=last&&p.count<=1);last=p.count;if(p.done)assert.equal(p.count,1);}
 assert.equal(revealProgress(0).count,0);assert.equal(revealProgress(6.4).assemble,1);
 const final=revealProgress(0,true);assert(final.done);assert.equal(final.count,1);assert.equal(final.assemble,1);
 assert.equal(Math.round(4123*final.count),4123);assert.equal(Math.round(1240*final.count),1240);
});
