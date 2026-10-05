import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {FlightControls} from '../dist/flight.js';
import {EYE_HEIGHT} from '../dist/flight-motion.js';
class Element extends EventTarget{
 constructor(){super();this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.captured=new Set();this.attributes={};}
 closest(selector){return selector==='.explorer-main'?(this.parent??=new Element()):null;}
 querySelector(){return this.knob??=new Element();}
 getBoundingClientRect(){return {left:0,top:0,width:120,height:120};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 setAttribute(k,v){this.attributes[k]=v;}
 focus(){document.activeElement=this;}
}
const send=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);};
function setup(options={}){
 const elements=new Map(),lift=new Element();lift.dataset.flightKey='KeyQ';
 const doc=new EventTarget();doc.querySelector=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};doc.querySelectorAll=()=>[lift];doc.exitPointerLock=()=>{doc.pointerLockElement=null;send(doc,'pointerlockchange');};
 globalThis.document=doc;globalThis.window=new EventTarget();globalThis.matchMedia=()=>({matches:false});
 const camera=new PerspectiveCamera();camera.position.set(0,EYE_HEIGHT,5);const canvas=new Element();
 const controls=new FlightControls(camera,canvas,options);controls.setEnabled(true);controls.setWalking(true);
 return {camera,canvas,controls,joystick:doc.querySelector('#flight-joystick'),lookPad:doc.querySelector('#flight-look-pad'),lift};
}
test('independent touch pointers allow moving and looking together, and stop on release',()=>{
 const {camera,canvas,controls,joystick}=setup();
 send(joystick,'pointerdown',{pointerId:1,clientX:60,clientY:20});
 send(canvas,'pointerdown',{pointerId:2,pointerType:'touch',button:0,clientX:250,clientY:100});
 send(canvas,'pointermove',{pointerId:2,pointerType:'touch',clientX:300,clientY:110});
 assert(controls.yaw<0);assert(controls.pitch<0);assert(controls.stick.y<0);
 const z=camera.position.z;controls.step(.05,true);assert(camera.position.z<z);assert.equal(camera.position.y,EYE_HEIGHT);
 send(canvas,'pointerup',{pointerId:2});assert(controls.stick.y<0,'releasing look must preserve joystick movement');
 send(joystick,'pointerup',{pointerId:1});const stopped=camera.position.clone();controls.step(.05);assert.deepEqual(camera.position.toArray(),stopped.toArray());
 assert.deepEqual(controls.stick,{x:0,y:0});
});
test('blur cancels all touch and keyboard inputs; Q flies and ground button restores eye height',()=>{
 const {camera,canvas,controls,joystick,lift}=setup();
 send(canvas,'keydown',{code:'KeyQ'});controls.step(1/60);assert.equal(controls.walking,false);assert(camera.position.y>EYE_HEIGHT);
 send(window,'keyup',{code:'KeyQ'});controls.setWalking(true);assert.equal(camera.position.y,EYE_HEIGHT);
 send(joystick,'pointerdown',{pointerId:3,clientX:100,clientY:60});
 send(lift,'pointerdown',{pointerId:4});send(canvas,'keydown',{code:'KeyW'});
 send(window,'blur');assert.equal(controls.keys.size,0);assert.equal(controls.touchKeys.size,0);assert.deepEqual(controls.stick,{x:0,y:0});
 const stopped=camera.position.clone();controls.step(.05);assert.deepEqual(camera.position.toArray(),stopped.toArray());
});
test('touch look is integrated on animation frames with equal smoothing at 30, 60 and 120 fps',()=>{
 const rotations=[];
 for(const fps of [30,60,120]){
  const {camera,controls}=setup(),before=camera.quaternion.clone();controls.look(100,-20,.004);
  assert.deepEqual(camera.quaternion.toArray(),before.toArray(),'pointer events must not jump the camera between frames');
  for(let i=0;i<fps/2;i++)controls.step(1/fps);
  rotations.push(camera.quaternion);
 }
 assert(rotations[0].angleTo(rotations[1])<1e-6);assert(rotations[1].angleTo(rotations[2])<1e-6);
});
test('keyboard repeats cannot add movement outside the animation frame',()=>{
 const {camera,canvas,controls}=setup(),before=camera.position.clone();
 for(let i=0;i<20;i++)send(canvas,'keydown',{code:'KeyW'});
 assert.deepEqual(camera.position.toArray(),before.toArray());controls.step(1/60);assert(camera.position.z<before.z);
});
test('touch cancellation recentres joystick without clearing a separate look gesture',()=>{
 const {canvas,controls,joystick}=setup();
 send(joystick,'pointerdown',{pointerId:7,clientX:110,clientY:60});
 send(canvas,'pointerdown',{pointerId:8,pointerType:'touch',button:0,clientX:250,clientY:100});
 send(joystick,'pointercancel',{pointerId:7});assert.deepEqual(controls.stick,{x:0,y:0});assert.equal(controls.lookTouch.id,8);
 send(canvas,'pointermove',{pointerId:8,pointerType:'touch',clientX:270,clientY:100});assert(controls.yaw<0);
});

test('mobile look layer captures its own pointer and does not steal joystick or third-finger input',()=>{
 const {camera,controls,joystick,lookPad,lift}=setup();
 send(joystick,'pointerdown',{pointerId:11,pointerType:'touch',clientX:60,clientY:20});
 send(lookPad,'pointerdown',{pointerId:12,pointerType:'touch',button:0,clientX:240,clientY:200});
 send(lookPad,'pointerdown',{pointerId:13,pointerType:'touch',button:0,clientX:310,clientY:400});
 send(lookPad,'pointermove',{pointerId:13,pointerType:'touch',clientX:10,clientY:10});
 assert.equal(controls.yaw,0,'an extra finger must not replace or move the look pointer');
 send(lookPad,'pointermove',{pointerId:12,pointerType:'touch',clientX:290,clientY:200});
 const start=camera.position.clone();controls.step(.05,true);
 assert(controls.yaw<0);assert(camera.position.distanceTo(start)>0);assert(lookPad.hasPointerCapture(12));
 send(lift,'pointerdown',{pointerId:14,pointerType:'touch'});controls.step(.05,true);assert.equal(controls.walking,false);
 send(lookPad,'pointercancel',{pointerId:12});assert(!lookPad.hasPointerCapture(12));assert.equal(controls.lookTouch,null);
 assert(controls.stick.y<0);assert(controls.touchKeys.has('KeyQ'));
 send(joystick,'lostpointercapture',{pointerId:11});send(lift,'pointerup',{pointerId:14});
 const stopped=camera.position.clone();controls.step(.05);assert.deepEqual(camera.position.toArray(),stopped.toArray());
});

test('mobile address-bar resize preserves held movement and rebases looking; rotation cancels safely',()=>{
 const {controls,joystick,lookPad,camera}=setup();
 send(joystick,'pointerdown',{pointerId:21,pointerType:'touch',clientX:60,clientY:20});
 send(lookPad,'pointerdown',{pointerId:22,pointerType:'touch',clientX:240,clientY:200});
 const before=camera.position.clone();send(window,'resize');controls.step(.05,true);
 assert(camera.position.distanceTo(before)>0,'resizing must not require a fresh joystick press');
 send(lookPad,'pointermove',{pointerId:22,pointerType:'touch',clientX:300,clientY:100});
 assert.equal(controls.yaw,0,'first coordinate after viewport change should rebase without jumping');
 send(lookPad,'pointermove',{pointerId:22,pointerType:'touch',clientX:320,clientY:110});assert(controls.yaw<0);
 send(window,'orientationchange');assert.equal(controls.lookTouch,null);assert.deepEqual(controls.stick,{x:0,y:0});
 assert(!lookPad.hasPointerCapture(22));assert(!joystick.hasPointerCapture(21));
});

test('leaving touch exploration releases both captures and fresh entry accepts new gestures',()=>{
 const {controls,joystick,lookPad}=setup();
 send(joystick,'pointerdown',{pointerId:31,pointerType:'touch',clientX:90,clientY:60});
 send(lookPad,'pointerdown',{pointerId:32,pointerType:'touch',clientX:240,clientY:200});
 controls.setEnabled(false);assert(!joystick.hasPointerCapture(31));assert(!lookPad.hasPointerCapture(32));
 send(lookPad,'pointermove',{pointerId:32,pointerType:'touch',clientX:300,clientY:100});assert.equal(controls.yaw,0);
 controls.setEnabled(true);send(lookPad,'pointerdown',{pointerId:33,pointerType:'touch',clientX:240,clientY:200});
 send(lookPad,'pointermove',{pointerId:33,pointerType:'touch',clientX:270,clientY:200});assert(controls.yaw<0);
});

test('a held joystick keeps analog speed after viewport relocation and follows new finger deltas',()=>{
 const {controls,joystick}=setup();
 send(joystick,'pointerdown',{pointerId:41,pointerType:'touch',clientX:80,clientY:40});
 const held={...controls.stick};
 joystick.getBoundingClientRect=()=>({left:20,top:90,width:104,height:104});send(window,'resize');
 send(joystick,'pointermove',{pointerId:41,pointerType:'touch',clientX:92,clientY:125});
 assert(Math.abs(controls.stick.x-held.x)<1e-9);assert(Math.abs(controls.stick.y-held.y)<1e-9,'address-bar changes must not reverse or accelerate a held direction');
 send(joystick,'pointermove',{pointerId:41,pointerType:'touch',clientX:102,clientY:125});assert(controls.stick.x>held.x,'subsequent finger motion must still steer');
 send(joystick,'pointerup',{pointerId:41});assert.deepEqual(controls.stick,{x:0,y:0});
 send(joystick,'pointerdown',{pointerId:42,pointerType:'touch',clientX:72,clientY:142});assert.deepEqual(controls.stick,{x:0,y:0},'a fresh press uses the visible pad center');
});

test('wheel adjusts only enabled flight speed, handles all delta modes and keeps HUD synchronized',()=>{
 const {controls,canvas}=setup(),surface=canvas.closest('.explorer-main');
 send(surface,'wheel',{deltaY:-120,deltaMode:0});assert(controls.speed>1);assert.match(document.querySelector('#flight-speed-value').textContent,/×1.3/);
 send(surface,'wheel',{deltaY:120,deltaMode:0});assert(Math.abs(controls.speed-1)<1e-9);
 send(surface,'wheel',{deltaY:-3,deltaMode:1});assert(controls.speed>1);
 controls.setSpeed(100);assert.equal(controls.speed,4);controls.setSpeed(-2);assert.equal(controls.speed,.4);
 controls.setEnabled(false);send(surface,'wheel',{deltaY:-120,deltaMode:0});assert.equal(controls.speed,.4);
 controls.setEnabled(true);send(surface,'wheel',{deltaY:-120,deltaMode:0,ctrlKey:true});assert.equal(controls.speed,.4,'browser pinch zoom is not movement input');clearTimeout(controls.speedTimer);
});

test('F interacts while mouse is locked without cancelling walking, and ignores repeats or inactive flight',()=>{
 let interactions=0;const {controls,canvas}=setup({onInteract:()=>interactions++});document.pointerLockElement=canvas;
 send(canvas,'keydown',{code:'KeyW'});send(canvas,'keydown',{code:'KeyF'});assert.equal(interactions,1);assert(controls.locked);assert(controls.keys.has('KeyW'));
 send(canvas,'keydown',{code:'KeyF',repeat:true});send(canvas,'keydown',{code:'KeyF',ctrlKey:true});assert.equal(interactions,1);
 controls.setEnabled(false);send(canvas,'keydown',{code:'KeyF'});assert.equal(interactions,1);
});
