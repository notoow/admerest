import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createLightSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {lighting} from './scene.js';
import {stackPreviewLayout} from './stack-preview-layout.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Shares the playground renderer. Displayed layers summarize large record counts.
export class InlineStack {
 constructor(playground){
  Object.assign(this,{playground,inline:true,kind:'simulation',panels:[],count:0,target:0,size:{width:5,length:6},dirty:true});
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xeaf1fa);lighting(this.scene);
  this.camera=new THREE.PerspectiveCamera(35,playground.camera.aspect,.01,100);
  this.controls=new OrbitControls(this.camera,playground.renderer.domElement);Object.assign(this.controls,{enabled:false,enableDamping:true,enableZoom:false,enablePan:false,minPolarAngle:.3,maxPolarAngle:1.5});
  this.base=new THREE.Mesh(new THREE.BoxGeometry(1,.045,1.2),new THREE.MeshStandardMaterial({color:0x376fe0,roughness:.55}));this.base.position.y=-.025;this.scene.add(this.base);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.052;ground.receiveShadow=true;this.scene.add(ground);this.frame();
 }
 open(){this.playground.presentation=this;this.playground.controls.enabled=false;this.controls.enabled=true;this.playground.resize();this.frame();}
 close(){if(this.playground.presentation===this){this.playground.presentation=null;this.playground.controls.enabled=true;}this.controls.enabled=false;}
 prepare(count,size){this.target=count;this.size={...size};this.dirty=true;this.frame();}
 update(count){this.count=count;this.dirty=true;}
 frame(){
  const h=Math.max(.3,stackPreviewLayout(this.target,this.target).length*.05),width=this.size.width/6,depth=this.size.length/6;
  const distance=Math.max(h/2/Math.tan(THREE.MathUtils.degToRad(17.5)),Math.max(width,depth)/2/Math.tan(THREE.MathUtils.degToRad(17.5))/this.camera.aspect,2)*1.65;
  this.controls.target.set(-width*.35,h*.45,0);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(.35,.3,1).normalize().multiplyScalar(distance));this.controls.update();this.lastAspect=this.camera.aspect;
 }
 step(dt){
  if(this.camera.aspect!==this.lastAspect)this.frame();
  if(this.dirty){
   const layout=stackPreviewLayout(this.count,this.target),width=this.size.width/6,depth=this.size.length/6;
   while(this.panels.length<layout.length){const sheet=createLightSheet();this.scene.add(sheet);this.panels.push(sheet);}
   this.panels.forEach((sheet,i)=>{sheet.visible=i<layout.length;if(!sheet.visible)return;const part=layout[i];sheet.rotation.set(-Math.PI/2,0,Math.sin(i*4.1)*.015);sheet.scale.set(width/MODEL_WIDTH,depth,.05/MODEL_DEPTH);sheet.position.set(Math.sin(i*2.7)*.009,i*.05+.025+(reduced||this.count>=this.target?0:(1-part.fill)*.6),0);});
   this.base.scale.set(Math.max(1,width/.833),1,Math.max(1,depth));this.dirty=false;
  }
  this.controls.update(dt);
 }
}
