import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderProfile,ResolutionBudget,sceneSuspended} from '../dist/render-budget.js';
test('phones cap raster cost; sustained slow frames reduce resolution without oscillation',()=>{
 assert.equal(renderProfile({compact:true,dpr:3}).pixelRatio,1.2);
 assert.equal(renderProfile({compact:true}).shadows,false);
 const budget=new ResolutionBudget(1.2);for(let i=0;i<400;i++)budget.sample(16.67);assert.equal(budget.ratio,1.2);
 budget.sample(1000);assert.equal(budget.ratio,1.2,'resume must not lower quality');
 for(let i=0;i<400;i++)budget.sample(34);assert.equal(budget.ratio,.75);
 for(let i=0;i<400;i++)budget.sample(16);assert.equal(budget.ratio,.75,'avoid repeatedly reallocating framebuffers');
});
test('fullscreen experiences suspend both unrelated WebGL scenes',()=>{
 const classes=new Set();globalThis.document={hidden:false,body:{classList:{contains:x=>classes.has(x)}}};
 classes.add('flight-open');assert(!sceneSuspended('explorer'));assert(sceneSuspended('playground'));assert(sceneSuspended('journey'));
 classes.clear();classes.add('record-open');assert(!sceneSuspended('playground'));assert(sceneSuspended('explorer'));assert(sceneSuspended('journey'));
 document.hidden=true;assert(sceneSuspended('playground'));
});
