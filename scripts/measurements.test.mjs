import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lengthMeters,compareHeight,towerPanels,MAX_QUANTITY} from '../dist/measurements.js';
test('confirmed long edge drives length while width-only changes preserve it',()=>{
 assert.equal(lengthMeters(2000,'5x6'),120);
 assert.equal(lengthMeters(2000,'4x6'),120);
 assert.equal(lengthMeters(2000,'6x8'),160);
 assert.equal(lengthMeters(MAX_QUANTITY,'6x8'),8000);
});
test('landmark comparisons preserve equal, shorter, taller and empty states',()=>{
 assert.deepEqual(compareHeight(0,555),{percent:0,difference:-555});
 assert.equal(compareHeight(1240,555).difference,685);
 assert.equal(compareHeight(555,555).percent,100);
 assert.equal(compareHeight(414,828).percent,50);
 assert(Math.abs(compareHeight(8000,8848.86).difference+848.86)<1e-9);
});
test('growing tower covers the precise height with no gaps or zero-length panels',()=>{
 assert.deepEqual(towerPanels(0,1.1),[]);
 for(const height of [.0001,.8,1.1,2.2,5.55,64]){
  const panels=towerPanels(height,1.1);
  let end=0;
  for(const p of panels){assert(p.height>0&&p.height<=1.1);assert(Math.abs(p.center-p.height/2-end)<1e-9);end=p.center+p.height/2;}
  assert(Math.abs(end-height)<1e-9);
 }
});
