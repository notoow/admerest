import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SIZES} from '../dist/measurements.js';
import {EVERYDAY_OBJECTS,comparisonDimensions} from '../dist/size-comparison.js';

test('every sheet and everyday object retains both dimensions on a shared scale',()=>{
 for(const [sizeKey,sheet]of Object.entries(SIZES))for(const [objectKey,object]of Object.entries(EVERYDAY_OBJECTS)){
  const view=comparisonDimensions(sizeKey,objectKey);
  assert(Math.abs(view.sheet.width/view.object.width-sheet.width/object.width)<1e-10);
  assert(Math.abs(view.sheet.height/view.object.height-sheet.length/object.height)<1e-10);
  assert.equal(Number(view.heightPercent.toFixed(1)),Number((sheet.length/object.height*100).toFixed(1)));
 }
 assert.equal(comparisonDimensions('5x6','iphone').heightPercent.toFixed(1),'40.7');
 assert.equal(comparisonDimensions('6x12','card').heightPercent.toFixed(1),'222.2');
 assert.throws(()=>comparisonDimensions('4x4','iphone'),RangeError);
});
