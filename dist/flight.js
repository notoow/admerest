import * as THREE from 'three';
import {FLIGHT_CODES,flightVector,joystickVector,clampFlightPosition,EYE_HEIGHT,MOVE_SPEED} from './flight-motion.js';
export class FlightControls {
 constructor(camera,canvas,{groundHeight=()=>0,blocked=()=>false}={}){
  Object.assign(this,{camera,canvas,groundHeight,blocked,enabled:false,speed:1,yaw:0,pitch:0,walking:true,unlockedAt:0});
  this.keys=new Set();this.touchKeys=new Set();this.stick={x:0,y:0};this.velocity=new THREE.Vector3();this.target=new THREE.Vector3();
  this.joystick=document.querySelector('#flight-joystick');this.knob=this.joystick.querySelector('i');
  canvas.addEventListener('keydown',e=>{
   if(!this.enabled||!FLIGHT_CODES.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
   e.preventDefault();if(!this.keys.has(e.code)){this.keys.add(e.code);this.step(.025,true);}
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  canvas.addEventListener('blur',()=>{this.keys.clear();this.velocity.set(0,0,0);this.hover=null;});
  window.addEventListener('blur',()=>this.pause());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
  document.addEventListener('pointerlockchange',()=>{if(!this.locked){this.clear();this.unlockedAt=performance.now();this.hoverLook=false;}this.updateUI();});
  document.addEventListener('pointerlockerror',()=>this.allowHoverLook());
  document.addEventListener('mousemove',e=>{if(this.enabled&&this.locked)this.look(e.movementX,e.movementY,.0022);});
  canvas.addEventListener('pointerdown',e=>{
   if(!this.enabled||e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});
   if(e.pointerType==='touch'||e.pointerType==='pen'){
    if(this.lookTouch)return;this.lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
   }else this.requestLook();
  });
  canvas.addEventListener('pointermove',e=>{
   if(!this.enabled||this.locked)return;
   if(this.lookTouch?.id===e.pointerId){this.look(e.clientX-this.lookTouch.x,e.clientY-this.lookTouch.y,.004);this.lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY};}
   else if(e.pointerType==='mouse'&&this.hoverLook&&document.activeElement===canvas){
    if(this.hover)this.look(e.clientX-this.hover.x,e.clientY-this.hover.y,.0022);this.hover={x:e.clientX,y:e.clientY};
   }
  });
  const endLook=e=>{if(this.lookTouch?.id===e.pointerId)this.lookTouch=null;};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,endLook));
  canvas.addEventListener('pointerleave',()=>{this.hover=null;});
  const updateStick=e=>{
   const r=this.joystick.getBoundingClientRect(),radius=r.width*.34,x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
   this.stick=joystickVector(x,y,radius);const scale=Math.min(1,radius/(Math.hypot(x,y)||1));this.knob.style.transform=`translate(${x*scale}px,${y*scale}px)`;
  };
  this.joystick.addEventListener('pointerdown',e=>{
   if(!this.enabled||this.stickId!==undefined)return;e.preventDefault();this.stickId=e.pointerId;
   this.joystick.setPointerCapture(e.pointerId);this.joystick.classList.add('held');updateStick(e);
  });
  this.joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId){e.preventDefault();updateStick(e);}});
  const endStick=e=>{if(e.pointerId===this.stickId)this.resetStick();};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.joystick.addEventListener(type,endStick));
  document.querySelectorAll('[data-flight-key]').forEach(button=>{
   const release=()=>{this.touchKeys.delete(button.dataset.flightKey);button.classList.remove('held');};
   button.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);this.touchKeys.add(button.dataset.flightKey);button.classList.add('held');this.step(.025,true);});
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,release));
   button.addEventListener('click',e=>{if(this.enabled&&e.detail===0){this.touchKeys.add(button.dataset.flightKey);this.step(.05,true);release();}});
  });
  document.querySelector('#flight-look').addEventListener('click',()=>this.requestLook());
  document.querySelector('#flight-walk').addEventListener('click',()=>{this.setWalking(true);canvas.focus({preventScroll:true});});
  document.querySelector('#flight-fly').addEventListener('click',()=>{this.setWalking(false);canvas.focus({preventScroll:true});});
 }
 get locked(){return document.pointerLockElement===this.canvas;}
 requestLook(){
  if(!this.enabled||matchMedia('(pointer:coarse)').matches)return;this.canvas.focus({preventScroll:true});if(this.locked)return;
  if(!this.canvas.requestPointerLock){this.allowHoverLook();return;}
  try{const request=this.canvas.requestPointerLock();request?.catch(()=>this.allowHoverLook());}catch{this.allowHoverLook();}
 }
 allowHoverLook(){if(!this.enabled||this.locked)return;this.hoverLook=true;this.hover=null;this.updateUI();}
 unlock(){this.hoverLook=false;this.hover=null;if(this.locked)document.exitPointerLock();this.clear();this.updateUI();}
 pause(){this.unlock();}
 resetStick(){const id=this.stickId;this.stickId=undefined;this.stick={x:0,y:0};this.knob.style.transform='';this.joystick.classList.remove('held');if(id!==undefined&&this.joystick.hasPointerCapture(id))this.joystick.releasePointerCapture(id);}
 clear(){this.keys.clear();this.touchKeys.clear();this.velocity.set(0,0,0);this.resetStick();const touch=this.lookTouch;this.lookTouch=null;if(touch&&this.canvas.hasPointerCapture(touch.id))this.canvas.releasePointerCapture(touch.id);this.hover=null;document.querySelectorAll('[data-flight-key]').forEach(b=>b.classList.remove('held'));}
 setEnabled(on){this.enabled=on;this.clear();if(on){this.syncAngles();this.canvas.focus({preventScroll:true});}else this.unlock();}
 setWalking(on){this.walking=on;this.velocity.y=0;if(on)this.camera.position.y=this.groundHeight(this.camera.position.x,this.camera.position.z)+EYE_HEIGHT;this.updateUI();}
 updateUI(){
  document.querySelector('#flight-walk').setAttribute('aria-pressed',String(this.walking));document.querySelector('#flight-fly').setAttribute('aria-pressed',String(!this.walking));
  document.querySelector('#flight-ground-label').textContent=this.walking?'눈높이 1.7m · 보행':'자유 비행 · Q / E';
  document.querySelector('#flight-look').textContent=this.locked?'마우스 시점 연결됨':this.hoverLook?'마우스 시점 · Esc 메뉴':'클릭하여 마우스 시점 연결';
  document.querySelector('#flight-hud').classList.toggle('mouse-locked',this.locked);
 }
 syncAngles(){const dir=this.camera.getWorldDirection(new THREE.Vector3());this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.asin(Math.max(-1,Math.min(1,dir.y)));this.orient();}
 look(dx,dy,sensitivity){this.yaw-=dx*sensitivity;this.pitch=Math.max(-1.48,Math.min(1.48,this.pitch-dy*sensitivity));this.orient();}
 orient(){this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));}
 step(dt,immediate=false){
  if(!this.enabled)return;dt=Math.min(dt,.05);const keys=new Set([...this.keys,...this.touchKeys]),vector=flightVector(keys,this.yaw,this.stick);
  if(vector.y>0&&this.walking)this.setWalking(false);
  const boost=keys.has('ShiftLeft')||keys.has('ShiftRight')?3:1;
  this.target.set(vector.x,this.walking?0:vector.y,vector.z).multiplyScalar(MOVE_SPEED*this.speed*boost);
  this.velocity.lerp(this.target,immediate?1:1-Math.exp(-dt*22));if(this.target.lengthSq()===0)this.velocity.set(0,0,0);
  // Substeps keep fast traversal from skipping landmark footprints.
  const steps=Math.max(1,Math.ceil(this.velocity.length()*dt/.08));
  for(let i=0;i<steps;i++){
   const p=this.camera.position,delta=dt/steps;
   const x=Math.max(-150,Math.min(150,p.x+this.velocity.x*delta)),z=Math.max(-150,Math.min(150,p.z+this.velocity.z*delta));
   if(!this.blocked(x,p.z,p.y))p.x=x;if(!this.blocked(p.x,z,p.y))p.z=z;p.y+=this.velocity.y*delta;
   const ground=this.groundHeight(p.x,p.z),next=clampFlightPosition(p,ground,this.walking);p.set(next.x,next.y,next.z);
   if(!this.walking&&vector.y<0&&p.y<=ground+EYE_HEIGHT+1e-5)this.setWalking(true);
  }
  this.orient();
 }
}
