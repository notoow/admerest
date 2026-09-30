import * as THREE from 'three';
import {FLIGHT_CODES,flightVector,clampFlightPosition} from './flight-motion.js';

// Drag-to-look keeps the pointer available for controls and does not require pointer lock.
export class FlightControls {
 constructor(camera,canvas){
  this.camera=camera;this.canvas=canvas;this.enabled=false;this.keys=new Set();this.velocity=new THREE.Vector3();this.speed=1;this.yaw=0;this.pitch=0;
  canvas.addEventListener('keydown',e=>{
   if(!this.enabled||!FLIGHT_CODES.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
   e.preventDefault();if(!this.keys.has(e.code)){this.keys.add(e.code);this.step(.035,true);}
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  canvas.addEventListener('blur',()=>this.clear());window.addEventListener('blur',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  canvas.addEventListener('pointerdown',e=>{
   if(!this.enabled||e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
   if(!this.enabled||this.drag?.id!==e.pointerId)return;
   this.yaw-=(e.clientX-this.drag.x)*.004;this.pitch=Math.max(-1.48,Math.min(1.48,this.pitch-(e.clientY-this.drag.y)*.004));this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};this.orient();
  });
  const end=e=>{if(this.drag?.id===e.pointerId)this.drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  document.querySelectorAll('[data-flight-key]').forEach(button=>{
   const release=()=>{this.keys.delete(button.dataset.flightKey);button.classList.remove('held');};
   button.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();canvas.focus({preventScroll:true});button.setPointerCapture(e.pointerId);this.keys.add(button.dataset.flightKey);button.classList.add('held');this.step(.05,true);});
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,release));
   button.addEventListener('click',e=>{if(this.enabled&&e.detail===0){this.keys.add(button.dataset.flightKey);this.step(.16,true);release();}});
  });
 }
 clear(){this.keys.clear();this.velocity.set(0,0,0);this.drag=null;document.querySelectorAll('[data-flight-key]').forEach(b=>b.classList.remove('held'));}
 setEnabled(on){this.enabled=on;this.clear();if(on){this.syncAngles();this.canvas.focus({preventScroll:true});}}
 syncAngles(){const dir=this.camera.getWorldDirection(new THREE.Vector3());this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.asin(Math.max(-1,Math.min(1,dir.y)));this.orient();}
 orient(){this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));}
 step(dt,immediate=false){
  if(!this.enabled)return;dt=Math.min(dt,.05);const vector=flightVector(this.keys,this.yaw),boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?3:1;
  const target=new THREE.Vector3(vector.x,vector.y,vector.z).multiplyScalar(3.5*this.speed*boost);
  this.velocity.lerp(target,immediate?1:1-Math.exp(-dt*14));this.camera.position.addScaledVector(this.velocity,dt);
  const next=clampFlightPosition(this.camera.position);this.camera.position.set(next.x,next.y,next.z);this.orient();
 }
}
