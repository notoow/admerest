import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {rendererFor,lighting,tower,lotte,burj} from './scene.js';
import {extraLandmark} from './landmarks.js';
import {LANDMARKS} from './landmark-data.js';
import {RecordReveal} from './record-reveal.js';
import {orbitDamping} from './explorer-motion.js';
import {ResolutionBudget} from './render-budget.js';

export class DraftPreview {
 constructor(host,onReturn){
  this.host=host;this.renderer=rendererFor(host);this.renderer.domElement.setAttribute('aria-label','내 기록과 랜드마크 높이 비교. 드래그로 회전, 두 손가락으로 확대. 0 키로 시점 초기화.');
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe3edf8);lighting(this.scene,this.renderer);
  this.scene.environmentIntensity=.35;
  const lamps=this.scene.children.filter(object=>object.isLight);
  lamps[0].intensity=.7;lamps[1].intensity=1.7;lamps[2].intensity=.3;
  lamps[1].position.set(-3,7,5);Object.assign(lamps[1].shadow.camera,{left:-8,right:8,top:10,bottom:-8});lamps[1].shadow.camera.updateProjectionMatrix();
  this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.budget=new ResolutionBudget(this.renderer.getPixelRatio());
  this.camera=new THREE.PerspectiveCamera(37,1,.05,900);this.controls=new OrbitControls(this.camera,this.renderer.domElement);
  Object.assign(this.controls,{enableDamping:true,enablePan:false,minPolarAngle:.15,maxPolarAngle:Math.PI/2-.04,minDistance:3,maxDistance:650});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(140,64),new THREE.MeshStandardMaterial({color:0x91aac7,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;this.scene.add(floor);
  this.landmarks=new Map();this.landmarkId='eiffel';this.active=true;this.visible=true;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.observer=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;},{rootMargin:'80px'});this.observer.observe(host);
  this.renderer.domElement.addEventListener('keydown',e=>{if(e.key==='0'){e.preventDefault();this.fit();}});
  this.reveal=new RecordReveal(this,onReturn);this.setLandmark('eiffel');this.resize();this.loop();
 }
 setRecord(record){
  if(this.record?.length!==record.length){
   if(this.model){this.scene.remove(this.model);this.model.userData.base.geometry.dispose();this.model.userData.base.material.dispose();}
   this.model=tower(record.length);this.model.position.set(-1.2,0,0);this.scene.add(this.model);this.renderer.shadowMap.needsUpdate=true;
  }
  this.record=record;this.active=true;this.fit();
 }
 setLandmark(id){
  if(!['eiffel','lotte','burj','shanghai'].includes(id))return;
  if(!this.landmarks.has(id)){const object=id==='lotte'?lotte():id==='burj'?burj():extraLandmark(id);object.position.set(1.3,0,0);this.landmarks.set(id,object);this.scene.add(object);}
  this.landmarkId=id;this.landmarks.forEach((obj,key)=>obj.visible=key===id);this.renderer.shadowMap.needsUpdate=true;this.fit();
 }
 fit(){
  const height=Math.max((this.record?.length??0)*.008,LANDMARKS[this.landmarkId].height*.008),v=THREE.MathUtils.degToRad(this.camera.fov);
  const distance=Math.max(height/(2*Math.tan(v/2)),4.5/(2*Math.tan(v/2)*this.camera.aspect))*1.42;
  this.controls.target.set(0,height*.43,0);this.camera.position.set(distance*.2,height*.43+distance*.27,distance);this.controls.update();
 }
 resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  if(this.presentation){this.presentation.camera.aspect=w/h;this.presentation.camera.updateProjectionMatrix();}else this.fit();
 }
 play(){if(this.record)this.reveal.open(this.record);}
 loop(){
  requestAnimationFrame(()=>this.loop());const now=performance.now(),delta=now-(this.previous??now),dt=Math.min(.05,delta/1000);this.previous=now;
  if(document.hidden||(!this.presentation&&(!this.visible||!this.active)))return;
  if(this.presentation){this.presentation.step(dt);this.renderer.render(this.presentation.scene,this.presentation.camera);return;}
  if(this.renderer.userData.profile.compact){const ratio=this.budget.sample(delta);if(ratio!==null)this.renderer.setPixelRatio(ratio);}
  // Landmark geometry arrives asynchronously; invalidate its cached shadow once ready.
  const signature=[...this.landmarks].map(([id,obj])=>`${id}:${obj.userData.assetStatus}`).join('|');if(signature!==this.assetSignature){this.assetSignature=signature;this.renderer.shadowMap.needsUpdate=true;}
  this.controls.dampingFactor=orbitDamping(dt);this.controls.update(dt);this.renderer.render(this.scene,this.camera);
 }
}
