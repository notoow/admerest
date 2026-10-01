import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {FlightControls} from '../dist/flight.js';
import {EYE_HEIGHT} from '../dist/flight-motion.js';
class Element extends EventTarget{
 constructor(){super();this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.captured=new Set();this.attributes={};}
 querySelector(){return this.knob??=new Element();}
 getBoundingClientRect(){return {left:0,top:0,width:120,height:120};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 setAttribute(k,v){this.attributes[k]=v;}
 focus(){document.activeElement=this;}
}
const send=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);};
function setup(){
 const elements=new Map(),lift=new Element();lift.dataset.flightKey='KeyQ';
 const doc=new EventTarget();doc.querySelector=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};doc.querySelectorAll=()=>[lift];doc.exitPointerLock=()=>{doc.pointerLockElement=null;send(doc,'pointerlockchange');};
 globalThis.document=doc;globalThis.window=new EventTarget();globalThis.matchMedia=()=>({matches:false});
 const camera=new PerspectiveCamera();camera.position.set(0,EYE_HEIGHT,5);const canvas=new Element();
 const controls=new FlightControls(camera,canvas);controls.setEnabled(true);controls.setWalking(true);
 return {camera,canvas,controls,joystick:doc.querySelector('#flight-joystick'),lift};
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
