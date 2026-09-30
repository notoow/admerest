import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createSheet} from './material.js';
import {rendererFor,lighting} from './scene.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
export class PhysicsPlayground {
 constructor(host){
  this.host=host;this.renderer=rendererFor(host);this.scene=new THREE.Scene();lighting(this.scene);
  this.camera=new THREE.PerspectiveCamera(35,1,.1,100);this.camera.position.set(6.8,7.1,9.5);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1,0);this.controls.enableDamping=true;this.controls.enableZoom=false;this.controls.enablePan=false;this.controls.minPolarAngle=.3;this.controls.maxPolarAngle=1.3;this.controls.update();
  this.renderer.domElement.setAttribute('aria-label','진피 낙하 체험: 드래그하여 진피의 관통 구멍과 옆면 살펴보기');
  this.scene.background=new THREE.Color(0xf4f7fc);this.pieces=[];this.queue=0;this.size={width:5,length:7};this.displaySize={width:5,length:7};this.visible=false;this.ready=false;this.logicalCount=2000;
  this.tray();
  // A full-size specimen remains easy to inspect while the physics engine loads.
  this.specimen=createSheet();this.specimen.scale.setScalar(2.6);this.specimen.position.set(0,2.3,0);this.specimen.rotation.set(-.7,-.2,.15);this.scene.add(this.specimen);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
  new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;if(this.visible&&!this.loading)this.init();},{rootMargin:'200px'}).observe(host);
  this.previous=performance.now();this.accumulator=0;this.loop();
 }
 tray(){
  const floorMat=new THREE.MeshStandardMaterial({color:0xf9f8f2,roughness:.85});const rimMat=new THREE.MeshStandardMaterial({color:0x164cc2,roughness:.4,metalness:.08});
  const box=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;this.scene.add(m);};
  box(6.4,.16,4.7,0,-.08,0,floorMat);box(6.6,.32,.13,0,.08,-2.4,rimMat);box(6.6,.32,.13,0,.08,2.4,rimMat);box(.13,.32,4.7,-3.25,.08,0,rimMat);box(.13,.32,4.7,3.25,.08,0,rimMat);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.ShadowMaterial({opacity:.10}));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;this.scene.add(floor);
 }
 async init(){
  this.loading=true;
  try{
   const {default:R}=await import('./vendor/rapier.mjs');await R.init();this.R=R;this.world=new R.World({x:0,y:-9.81,z:0});this.world.timestep=1/60;
   const fixed=(x,y,z,hx,hy,hz)=>this.world.createCollider(R.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z).setFriction(.8));
   fixed(0,-.08,0,3.3,.08,2.5);fixed(0,.6,-2.4,3.3,.7,.08);fixed(0,.6,2.4,3.3,.7,.08);fixed(-3.25,.6,0,.08,.7,2.4);fixed(3.25,.6,0,.08,.7,2.4);
   this.ready=true;this.seed(this.logicalCount);this.host.dataset.physics='ready';
  }catch(error){console.error('Physics unavailable',error);this.host.dataset.physics='unavailable';this.host.dispatchEvent(new CustomEvent('physics-unavailable'));}
 }
 dimensions(){return {w:this.displaySize.width*.23,l:this.displaySize.length*.23,t:.057};}
 spawn(falling=true,index=0){
  if(!this.ready)return;
  if(this.pieces.length>=48){const oldest=this.pieces.shift();this.world.removeRigidBody(oldest.body);this.scene.remove(oldest.mesh);}
  const R=this.R,{w,l,t}=this.dimensions();const x=falling?(Math.random()-.5)*3.9:(index%3-1)*1.5,z=falling?(Math.random()-.5)*2.1:(Math.floor(index/3)%2-.5)*1.8,y=falling?4.7+Math.random()*.8:.12+Math.floor(index/6)*.13;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(falling?(Math.random()-.5)*.7:0,(Math.random()-.5)*.9,falling?(Math.random()-.5)*.5:0));
  const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,y,z).setRotation(q).setLinearDamping(.4).setAngularDamping(1.3).setCcdEnabled(true));
  const collider=this.world.createCollider(R.ColliderDesc.cuboid(w/2,t/2,l/2).setDensity(1).setFriction(.7).setRestitution(.035),body);
  if(falling)body.setAngvel({x:(Math.random()-.5)*1.5,y:(Math.random()-.5)*1.5,z:(Math.random()-.5)*1.5},true);
  const mesh=new THREE.Group(),sheet=createSheet();sheet.rotation.x=-Math.PI/2;sheet.scale.set(w/.70,l,t/.024);mesh.add(sheet);mesh.position.set(x,y,z);mesh.quaternion.copy(q);this.scene.add(mesh);this.pieces.push({body,collider,mesh,sheet});
 }
 seed(count){this.logicalCount=count;if(!this.ready)return;this.queue=0;for(const p of this.pieces){this.world.removeRigidBody(p.body);this.scene.remove(p.mesh);}this.pieces=[];const n=Math.min(24,count);for(let i=0;i<n;i++)this.spawn(false,i);this.specimen.visible=count>0;}
 burst(delta,count){this.logicalCount=count;if(!this.ready)return;if(reduced){this.seed(count);return;}this.specimen.visible=false;this.queue=Math.min(60,this.queue+Math.min(delta,48));this.nextDrop=performance.now();}
 setSize(size){this.size=size;for(const p of this.pieces)p.body.wakeUp();}
 setInspect(on){this.inspect=on;this.specimen.visible=on&&this.logicalCount>0;for(const p of this.pieces)p.mesh.visible=!on;this.cameraTransition={from:this.camera.position.clone(),targetFrom:this.controls.target.clone(),to:new THREE.Vector3(...(on?[3.1,3.8,6]:[6.8,7.1,9.5])),targetTo:new THREE.Vector3(0,on?2.1:1,0),start:performance.now()};}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 loop(){
  requestAnimationFrame(()=>this.loop());const now=performance.now(),dt=Math.min((now-this.previous)/1000,.05);this.previous=now;if(!this.visible||document.hidden)return;
  if(this.cameraTransition){const a=this.cameraTransition,t=reduced?1:Math.min(1,(now-a.start)/650),k=1-Math.pow(1-t,3);this.camera.position.lerpVectors(a.from,a.to,k);this.controls.target.lerpVectors(a.targetFrom,a.targetTo,k);if(t===1)this.cameraTransition=null;}
  const f=reduced?1:Math.min(1,dt*7);this.displaySize.width=THREE.MathUtils.lerp(this.displaySize.width,this.size.width,f);this.displaySize.length=THREE.MathUtils.lerp(this.displaySize.length,this.size.length,f);
  const {w,l,t}=this.dimensions();this.specimen.scale.set(w/.70*1.8,l*1.8,t/.024*1.8);
  if(this.ready){
   if(this.queue>0&&now>=this.nextDrop){this.spawn();this.queue--;this.nextDrop=now+48;}
   const resizing=Math.abs(this.displaySize.width-this.size.width)>.005||Math.abs(this.displaySize.length-this.size.length)>.005;
   for(const p of this.pieces){if(resizing){p.sheet.scale.set(w/.70,l,t/.024);p.collider.setHalfExtents({x:w/2,y:t/2,z:l/2});p.body.wakeUp();}}
   this.accumulator+=dt;while(this.accumulator>=1/60){this.world.step();this.accumulator-=1/60;}
   for(const p of this.pieces){p.mesh.position.copy(p.body.translation());p.mesh.quaternion.copy(p.body.rotation());p.mesh.visible=!this.inspect;}
  }
  if(!reduced)this.specimen.rotation.y=-.2+Math.sin(now*.0003)*.12;
  this.controls.update();this.renderer.render(this.scene,this.camera);
 }
}
