import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stackPreviewLayout} from '../dist/stack-preview-layout.js';
test('preview starts empty, fills monotonically and stays bounded for large inputs',()=>{
 for(const target of [0,1,10,231,3100,100000]){
  assert.deepEqual(stackPreviewLayout(0,target),[]);
  let previous=0;
  for(let i=0;i<=100;i++){const layers=stackPreviewLayout(target*i/100,target);assert(layers.length>=previous);assert(layers.length<=72);assert(layers.every(p=>p.fill>0&&p.fill<=1));previous=layers.length;}
  const final=stackPreviewLayout(target,target);assert.equal(final.length,Math.ceil(target/Math.max(1,Math.ceil(target/72))));
 }
});
