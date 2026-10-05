import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SIZES,MAX_QUANTITY,recordHeightMeters} from '../dist/measurements.js';

function setup(reduced=false){
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const nodes=new Map(),frames=new Map(),updates=[],visits=[],views=[];let clock=0,id=0;
 const element=selector=>{if(!nodes.has(selector))nodes.set(selector,{style:{},focus(){this.focused=true;}});return nodes.get(selector);};
 const explorer={flight:{enabled:false},selected:'kim',updateSimulation(meters,cases){updates.push({meters,cases});},prepareSimulation(meters){this.finalMeters=meters;},refit(){}};
 const context=vm.createContext({quantity:2000,displayCount:2000,displayLength:120,size:'5x6',animation:null,raf:null,reduced,explorer,document:{activeElement:null},inlineStack:{update(){},prepare(){}},setPlayView(view){views.push(view);},keepPlayInView(){},SIZES,MAX_QUANTITY,recordHeightMeters,$:element,
  format:new Intl.NumberFormat('en-US'),decimal:new Intl.NumberFormat('en-US',{maximumFractionDigits:2}),performance:{now:()=>clock},
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},refreshComparison(){},toast(){},clearError(){},error(message){context.lastError=message;},showSimulation(options){visits.push(options);explorer.selected='simulation';}});
 vm.runInContext(source.slice(source.indexOf('function syncRegisterButton('),source.indexOf('function setSize(')),context);
 const frame=time=>{clock=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));};
 return {context,nodes,updates,visits,views,frames,frame,apply:(count,replay=true)=>context.setQuantity(count,{replay})};
}

test('Apply resets an existing tower to zero, shows it in place and reaches the exact input',()=>{
 const s=setup();s.apply(3100);
 assert.equal(s.context.displayCount,0);assert.equal(s.context.displayLength,0);
 assert.deepEqual(s.updates.at(-1),{meters:0,cases:0});assert.deepEqual(s.views,['tower']);assert.equal(s.visits.length,0,'inline Apply must not move to the explorer');assert.equal(s.context.explorer.finalMeters,186);
 s.frame(400);assert.equal(s.context.displayCount,0,'arrival gives the empty tower a visible frame');
 s.frame(1800);assert(s.context.displayCount>0&&s.context.displayCount<3100);
 s.frame(3650);assert.equal(s.context.displayCount,3100);assert.equal(s.context.displayLength,186);assert.equal(s.context.animation,null);
 assert.equal(s.nodes.get('#build-count').textContent,'3,100');assert.equal(s.nodes.get('#build-status').textContent,'쌓기 완료');
 s.apply(3100);assert.equal(s.context.displayCount,0,'applying the same number replays from zero');
});

test('reapplying during a build replaces its target without creating two animation loops',()=>{
 const s=setup();s.apply(3100);s.frame(1400);s.apply(1320);assert.equal(s.frames.size,1);assert.equal(s.context.displayCount,0);
 s.frame(5050);assert.equal(s.context.displayCount,1320);assert.equal(s.context.displayLength,79.2);assert.equal(s.frames.size,0);
 s.apply(10,false);assert.equal(s.context.displayCount,1320,'quick changes retain their current starting count');s.frame(5700);assert.equal(s.context.displayCount,10);
});

test('zero, maximum, invalid input and reduced motion keep deterministic final counts',()=>{
 const s=setup();assert.equal(s.apply(-1),false);assert.equal(s.apply(1.5),false);assert.equal(s.visits.length,0);
 s.apply(0);s.frame(0);assert.equal(s.context.displayLength,0);assert.equal(s.context.animation,null);
 s.context.size='6x12';s.apply(MAX_QUANTITY);s.frame(3650);assert.equal(s.context.displayCount,MAX_QUANTITY);assert.equal(s.context.displayLength,6000);
 const calm=setup(true);calm.apply(231);calm.frame(0);assert.equal(calm.context.displayCount,231);assert.equal(calm.context.displayLength,13.86);assert.equal(calm.frames.size,0);
});

test('explorer Apply keeps its own surface and never scrolls the page',()=>{
 const s=setup();s.context.setQuantity(231,{replay:true,surface:'explorer'});
 assert.equal(s.visits.length,1);assert.equal(s.visits[0].instant,true);assert.equal(s.visits[0].scroll,false);assert.equal(s.views.length,0);
 s.frame(3650);assert.equal(s.context.displayCount,231);
});

test('registration opens the upper tower only after building a nonzero record',()=>{
 const s=setup();s.apply(3100);assert.equal(s.context.registerBuiltTower(),false);assert.equal(s.nodes.get('#register-tower').disabled,true);assert.equal(s.visits.length,0);
 s.frame(3650);assert.equal(s.nodes.get('#register-tower').disabled,false);assert.equal(s.visits.length,0,'completion alone does not jump upward');
 assert.equal(s.context.registerBuiltTower(),true);assert.equal(s.visits.length,1);assert.equal(s.visits[0].wholeWorld,true,'registration must reveal the tower alongside landmarks');
 s.apply(0);s.frame(3650);assert.equal(s.context.registerBuiltTower(),false);assert.equal(s.nodes.get('#register-tower').disabled,true);
});
test('quick additions use the visible unsubmitted input and reject invalid counts',()=>{
 const s=setup();s.apply(2000);s.nodes.get('#quantity').value='3100';
 assert.equal(s.context.addQuantity(100),true);assert.equal(s.context.quantity,3200);
 assert.equal(s.nodes.get('#quantity').value,'3200');assert.equal(s.context.explorer.finalMeters,192);
 s.nodes.get('#quantity').value='-1';assert.equal(s.context.addQuantity(100),false);assert.equal(s.context.quantity,3200);
 s.nodes.get('#quantity').value='100000';assert.equal(s.context.addQuantity(10),false);assert.equal(s.context.quantity,3200);
});
test('upper tower quick-add uses its own edited input without switching preview or scrolling',()=>{
 const s=setup();s.apply(2000);s.views.length=0;s.nodes.get('#live-quantity').value='3100';
 assert.equal(s.context.addQuantity(100,{surface:'explorer'}),true);assert.equal(s.context.quantity,3200);
 assert.equal(s.nodes.get('#quantity').value,'3200');assert.equal(s.visits.length,0);assert.equal(s.views.length,0);
 s.frame(3000);assert.equal(s.context.displayLength,192);
 s.nodes.get('#live-quantity').value='100000';assert.equal(s.context.addQuantity(10,{surface:'explorer'}),false);assert.equal(s.context.quantity,3200);
});
