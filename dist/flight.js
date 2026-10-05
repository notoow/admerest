import * as THREE from 'three';
import {FLIGHT_CODES,flightVector,joystickVector,clampFlightPosition,EYE_HEIGHT,MOVE_SPEED,MIN_FLIGHT_SPEED,MAX_FLIGHT_SPEED,wheelFlightSpeed} from './flight-motion.js';
export class FlightControls {
 constructor(camera,canvas,{groundHeight=()=>0,blocked=()=>false,onInteract=()=>{}}={}){
  Object.assign(this,{camera,canvas,groundHeight,blocked,enabled:false,speed:1,yaw:0,pitch:0,walking:true,unlockedAt:0});
  this.keys=new Set();this.touchKeys=new Set();this.stick={x:0,y:0};this.velocity=new THREE.Vector3();this.target=new THREE.Vector3();
  this.joystick=document.querySelector('#flight-joystick');this.knob=this.joystick.querySelector('i');
  this.lookPad=document.querySelector('#flight-look-pad');
  canvas.closest('.explorer-main').addEventListener('wheel',e=>{
   if(!this.enabled||e.ctrlKey||e.target.closest('input,select'))return;
   e.preventDefault();e.stopPropagation();this.setSpeed(wheelFlightSpeed(this.speed,e.deltaY,e.deltaMode));
  },{passive:false,capture:true});
  canvas.addEventListener('keydown',e=>{
   if(this.enabled&&e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)onInteract();return;}
   if(!this.enabled||!FLIGHT_CODES.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
   e.preventDefault();this.keys.add(e.code);
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  canvas.addEventListener('blur',()=>{this.keys.clear();this.velocity.set(0,0,0);this.hover=null;});
  window.addEventListener('blur',()=>this.pause());
  // Mobile browser chrome resizes the viewport during a gesture. Preserve held
  // input; rebase its coordinates instead of requiring both thumbs to start over.
  window.addEventListener('resize',()=>{
   if(!this.enabled)return;
   if(this.lookTouch)this.lookTouch.rebase=true;
  });
  window.addEventListener('orientationchange',()=>{if(this.enabled)this.clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
  document.addEventListener('pointerlockchange',()=>{if(!this.locked){this.clear();this.unlockedAt=performance.now();this.hoverLook=false;}this.updateUI();});
  document.addEventListener('pointerlockerror',()=>this.allowHoverLook());
  document.addEventListener('mousemove',e=>{if(this.enabled&&this.locked)this.look(e.movementX,e.movementY,.0022);});
  for(const surface of [canvas,this.lookPad]){
   surface.addEventListener('pointerdown',e=>{
    if(!this.enabled||(e.pointerType==='mouse'&&e.button!==0))return;
    if(surface===canvas&&e.pointerType==='mouse'){e.preventDefault();this.requestLook();return;}
    if(this.lookTouch)return;e.preventDefault();
    this.lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY,surface};surface.setPointerCapture(e.pointerId);this.lookPad.classList.add('held');
   });
   surface.addEventListener('pointermove',e=>{
    if(!this.enabled||this.locked)return;
    const touch=this.lookTouch;
    if(touch?.id===e.pointerId){
     e.preventDefault();if(!touch.rebase)this.look(e.clientX-touch.x,e.clientY-touch.y,.003);
     touch.x=e.clientX;touch.y=e.clientY;touch.rebase=false;
    }else if(surface===canvas&&e.pointerType==='mouse'&&this.hoverLook&&document.activeElement===canvas){
     if(this.hover)this.look(e.clientX-this.hover.x,e.clientY-this.hover.y,.0022);this.hover={x:e.clientX,y:e.clientY};
    }
   });
   const endLook=e=>{if(this.lookTouch?.id===e.pointerId)this.resetLook();};
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>surface.addEventListener(type,endLook));
  }
  canvas.addEventListener('pointerleave',()=>{this.hover=null;});
  const updateStick=e=>{
   const r=this.stickRect,radius=r.width*.34,x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
   this.stick=joystickVector(x,y,radius);const scale=Math.min(1,radius/(Math.hypot(x,y)||1));this.knob.style.transform=`translate(${x*scale}px,${y*scale}px)`;
  };
  this.joystick.addEventListener('pointerdown',e=>{
   if(!this.enabled||this.stickId!==undefined||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();this.stickId=e.pointerId;
   this.stickRect=this.joystick.getBoundingClientRect();this.joystick.setPointerCapture(e.pointerId);this.joystick.classList.add('held');updateStick(e);
  });
  this.joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId){e.preventDefault();updateStick(e);}});
  const endStick=e=>{if(e.pointerId===this.stickId)this.resetStick();};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.joystick.addEventListener(type,endStick));
  document.querySelectorAll('[data-flight-key]').forEach(button=>{
   const release=()=>{this.touchKeys.delete(button.dataset.flightKey);button.classList.remove('held');};
   button.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);this.touchKeys.add(button.dataset.flightKey);button.classList.add('held');});
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,release));
   button.addEventListener('click',e=>{if(this.enabled&&e.detail===0){this.touchKeys.add(button.dataset.flightKey);this.step(.05,true);release();}});
  });
  document.querySelector('#flight-look').addEventListener('click',()=>this.requestLook());
  document.querySelector('#flight-walk').addEventListener('click',()=>{this.setWalking(true);canvas.focus({preventScroll:true});});
  document.querySelector('#flight-fly').addEventListener('click',()=>{this.setWalking(false);canvas.focus({preventScroll:true});});
 }
 get locked(){return document.pointerLockElement===this.canvas;}
 setSpeed(value){
  if(!Number.isFinite(value))return;
  this.speed=Math.max(MIN_FLIGHT_SPEED,Math.min(MAX_FLIGHT_SPEED,value));
  document.querySelector('#flight-speed').value=String(this.speed);
  document.querySelector('#flight-speed-value').textContent=`×${this.speed.toFixed(1)}`;
  const feedback=document.querySelector('#flight-speed-feedback');feedback.textContent=`이동 속도 ×${this.speed.toFixed(1)}`;feedback.classList.add('visible');
  clearTimeout(this.speedTimer);this.speedTimer=setTimeout(()=>feedback.classList.remove('visible'),1200);
 }
 requestLook(){
  if(!this.enabled||matchMedia('(pointer:coarse), (max-width:760px), (max-width:1000px) and (max-height:550px)').matches)return;this.canvas.focus({preventScroll:true});if(this.locked)return;
  if(!this.canvas.requestPointerLock){this.allowHoverLook();return;}
  try{const request=this.canvas.requestPointerLock();request?.catch(()=>this.allowHoverLook());}catch{this.allowHoverLook();}
 }
 allowHoverLook(){if(!this.enabled||this.locked)return;this.hoverLook=true;this.hover=null;this.updateUI();}
 unlock(){this.hoverLook=false;this.hover=null;if(this.locked)document.exitPointerLock();this.clear();this.updateUI();}
 pause(){this.unlock();}
 resetStick(){const id=this.stickId;this.stickId=undefined;this.stick={x:0,y:0};this.knob.style.transform='';this.joystick.classList.remove('held');if(id!==undefined&&this.joystick.hasPointerCapture(id))this.joystick.releasePointerCapture(id);}
 resetLook(){const touch=this.lookTouch;this.lookTouch=null;this.lookPad.classList.remove('held');if(touch&&touch.surface.hasPointerCapture(touch.id))touch.surface.releasePointerCapture(touch.id);}
 clear(){this.keys.clear();this.touchKeys.clear();this.velocity.set(0,0,0);this.resetStick();this.resetLook();this.hover=null;document.querySelectorAll('[data-flight-key]').forEach(b=>b.classList.remove('held'));}
 setEnabled(on){this.enabled=on;this.clear();if(on){this.syncAngles();this.canvas.focus({preventScroll:true});}else this.unlock();}
 setWalking(on){this.walking=on;this.velocity.y=0;if(on)this.camera.position.y=this.groundHeight(this.camera.position.x,this.camera.position.z)+EYE_HEIGHT;this.updateUI();}
 updateUI(){
  document.querySelector('#flight-walk').setAttribute('aria-pressed',String(this.walking));document.querySelector('#flight-fly').setAttribute('aria-pressed',String(!this.walking));
  document.querySelector('#flight-ground-label').textContent=this.walking?'눈높이 1.7m · 보행':'자유 비행 · Q / E';
  document.querySelector('#flight-look').textContent=this.locked?'마우스 시점 연결됨':this.hoverLook?'마우스 시점 · Esc 메뉴':'클릭하여 마우스 시점 연결';
  document.querySelector('#flight-hud').classList.toggle('mouse-locked',this.locked);
 }
 syncAngles(){const dir=this.camera.getWorldDirection(new THREE.Vector3());this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.asin(Math.max(-1,Math.min(1,dir.y)));this.viewYaw=this.yaw;this.viewPitch=this.pitch;this.orient();}
 look(dx,dy,sensitivity){this.yaw-=dx*sensitivity;this.pitch=Math.max(-1.48,Math.min(1.48,this.pitch-dy*sensitivity));}
 orient(){this.euler??=new THREE.Euler(0,0,0,'YXZ');this.euler.set(this.viewPitch,this.viewYaw,0,'YXZ');this.camera.quaternion.setFromEuler(this.euler);}
 step(dt,immediate=false){
  if(!this.enabled)return;dt=Math.min(dt,.05);
  const lookBlend=1-Math.exp(-dt/0.035);this.viewYaw+=(this.yaw-this.viewYaw)*lookBlend;this.viewPitch+=(this.pitch-this.viewPitch)*lookBlend;
  const keys=new Set([...this.keys,...this.touchKeys]),vector=flightVector(keys,this.viewYaw,this.stick);
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
