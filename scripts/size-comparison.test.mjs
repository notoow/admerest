import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SIZES} from '../dist/measurements.js';
import {EVERYDAY_OBJECTS,comparisonDimensions} from '../dist/size-comparison.js';
import {physicalPixels,screenProfile,readScreenScale,writeScreenScale} from '../dist/screen-scale.js';

test('every sheet and everyday object retains both dimensions on a shared scale',()=>{
 for(const [sizeKey,sheet]of Object.entries(SIZES))for(const [objectKey,object]of Object.entries(EVERYDAY_OBJECTS)){
  const view=comparisonDimensions(sizeKey,objectKey);
  assert(Math.abs(view.sheet.width/view.object.width-sheet.width/object.width)<1e-10);
  assert(Math.abs(view.sheet.height/view.object.height-sheet.length/object.height)<1e-10);
  assert.equal(Number(view.heightPercent.toFixed(1)),Number((sheet.length/object.height*100).toFixed(1)));
 }
 assert.equal(comparisonDimensions('5x6','iphone').heightPercent.toFixed(1),'40.7');
 assert.equal(comparisonDimensions('6x12','card').heightPercent.toFixed(1),'222.3');
 assert.throws(()=>comparisonDimensions('4x4','iphone'),RangeError);
});

test('ID-1 card and every sheet retain physical proportions at all calibration scales',()=>{
 assert.equal(EVERYDAY_OBJECTS.card.width,8.56);assert.equal(EVERYDAY_OBJECTS.card.height,5.398);
 assert(Math.abs(physicalPixels(2.54)-96)<1e-10);
 for(const scale of [.5,1,1.375,2.5]){
  const cardWidth=physicalPixels(EVERYDAY_OBJECTS.card.width,scale);
  for(const sheet of Object.values(SIZES)){
   assert(Math.abs(physicalPixels(sheet.width,scale)/cardWidth-sheet.width/8.56)<1e-10);
   assert(Math.abs(physicalPixels(sheet.length,scale)/physicalPixels(sheet.width,scale)-sheet.length/sheet.width)<1e-10);
  }
 }
 for(const scale of [NaN,Infinity,-1,0,.49,2.51,'1'])assert.throws(()=>physicalPixels(8.56,scale),RangeError);
});

test('saved calibration restores only for the matching display environment and valid payload',()=>{
 const profile=screenProfile({width:1920,height:1080,pixelRatio:1});
 const saved=writeScreenScale(1.337,profile);assert.equal(readScreenScale(saved,profile),1.337);
 assert.equal(readScreenScale(saved,screenProfile({width:1920,height:1080,pixelRatio:1.25})),null);
 assert.equal(readScreenScale(saved,screenProfile({width:2560,height:1440,pixelRatio:1})),null);
 for(const raw of [null,'','invalid','{}','null',JSON.stringify({version:2,profile,scale:1}),JSON.stringify({version:1,profile,scale:100})])assert.equal(readScreenScale(raw,profile),null);
 assert.throws(()=>writeScreenScale(NaN,profile),RangeError);
});
