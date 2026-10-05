import * as THREE from 'three';
import {createSheet} from './material.js';
import {lotte,burj,lighting} from './scene.js';
import {deviceProfile,sceneSuspended} from './render-budget.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

export class ScrollJourney {
 constructor(section){
  this.section=section;this.stage=section.querySelector('.journey-stage');this.host=section.querySelector('.journey-canvas');this.progress=0;this.visible=true;
  this.copy=[...section.querySelectorAll('.journey-copy')];this.steps=[...section.querySelectorAll('[data-journey-step]')];
  const profile=deviceProfile();this.renderer=new THREE.WebGLRenderer({antialias:!profile.compact,alpha:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(profile.pixelRatio,1.5));this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.host.append(this.renderer.domElement);
  this.scene=new THREE.Scene();lighting(this.scene,this.renderer);this.camera=new THREE.PerspectiveCamera(34,1,.1,100);this.camera.position.set(0,0,13);
  this.sheets=Array.from({length:9},(_,i)=>{const sheet=createSheet(i===0);this.scene.add(sheet);return sheet;});
  this.city=new THREE.Group();const a=lotte(),b=burj();a.position.set(1.8,-2.6,-1.5);b.position.set(3.25,-2.6,-2.6);a.scale.setScalar(.68);b.scale.setScalar(.68);this.city.add(a,b);this.scene.add(this.city);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);
  this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;},{rootMargin:'120px'});this.observer.observe(section);
  this.header=document.querySelector('.site-header');
  this.updateProgress=()=>this.readScrollProgress();
  const relayout=()=>{cancelAnimationFrame(this.layoutFrame);this.layoutFrame=requestAnimationFrame(()=>{this.fitLayout();this.updateProgress();});};
  this.layoutObserver=new ResizeObserver(relayout);this.layoutObserver.observe(this.stage);if(this.header)this.layoutObserver.observe(this.header);
  window.addEventListener('scroll',this.updateProgress,{passive:true});window.addEventListener('resize',relayout,{passive:true});
  this.steps.forEach((button,index)=>button.addEventListener('click',()=>this.selectChapter(index)));
  this.fitLayout();this.resize();this.updateProgress();this.loop();
 }
 fitLayout(){
  const previousFlow=this.flow,rect=this.stage.getBoundingClientRect();
  this.headerHeight=this.header?.getBoundingClientRect().height??0;
  const wasInView=rect.bottom>this.headerHeight&&rect.top<innerHeight;
  this.section.style.setProperty('--journey-header-height',`${this.headerHeight}px`);
  // If text cannot fit below the header, use ordinary page flow. No nested scroll
  // or hidden controls; chapter buttons continue to work without a scroll track.
  this.flow=this.stage.getBoundingClientRect().height>innerHeight-this.headerHeight+2;
  this.section.dataset.layout=this.flow?'flow':'sticky';
  if(previousFlow!==undefined&&previousFlow!==this.flow&&wasInView){
   const start=window.scrollY+this.section.getBoundingClientRect().top-this.headerHeight;
   window.scrollTo({top:Math.max(0,start+(this.flow?0:(this.section.offsetHeight-this.stage.offsetHeight)*this.progress)),behavior:'instant'});
  }
  this.updateHint();
 }
 readScrollProgress(){
  if(this.flow)return;
  const rect=this.section.getBoundingClientRect();this.progress=clamp((this.headerHeight-rect.top)/Math.max(1,this.section.offsetHeight-this.stage.offsetHeight));
 }
 selectChapter(index){
  if(this.flow){this.progress=[0,.5,1][index];this.stage.scrollIntoView({block:'start',behavior:'instant'});return;}
  const start=window.scrollY+this.section.getBoundingClientRect().top-this.headerHeight;
  window.scrollTo({top:Math.max(0,start+(this.section.offsetHeight-this.stage.offsetHeight)*[0,.5,1][index]),behavior:'instant'});
 }
 updateHint(){
  this.section.querySelector('.journey-scroll span').textContent=this.flow?'장면을 선택해 둘러보세요':this.phase===2?'이제 아래에서 탑을 만나보세요':'스크롤해서 올라가세요';
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.mobile=w<760;}
 loop(){
  requestAnimationFrame(()=>this.loop());if(!this.visible||sceneSuspended('journey'))return;
  const p=this.progress,t=performance.now()*.001,assemble=smooth((p-.12)/.34),summit=smooth((p-.57)/.3),x=this.mobile?0:2.8;
  const phase=p<.32?0:p<.73?1:2;
  if(this.phase!==phase){this.phase=phase;this.section.dataset.phase=String(phase);this.updateHint();this.copy.forEach((copy,i)=>{copy.classList.toggle('active',i===phase);copy.inert=i!==phase;copy.setAttribute('aria-hidden',String(i!==phase));});this.steps.forEach((button,i)=>{button.classList.toggle('active',i===phase);button.setAttribute('aria-pressed',String(i===phase));});}
  if(this.lastProgress!==p){
   this.stage.style.setProperty('--alpine-opacity',String(.16+summit*.84));this.stage.style.setProperty('--panorama-shift',`${(1-p)*4}%`);
   this.section.querySelector('#journey-progress-bar').style.transform=`scaleX(${p})`;this.host.style.opacity=String(1-summit);this.lastProgress=p;
  }
  this.city.visible=phase===1;this.city.scale.setScalar(this.mobile?.65:1);this.city.position.set(this.mobile?-1.3:0,this.mobile?-1.3:0,0);
  this.sheets.forEach((sheet,i)=>{
   const phaseOffset=i*.79,fall=reduced?0:((t*.11+phaseOffset)%1-.5)*1.8;
   const startX=x+(i===0?.15:Math.sin(i*2.4)*3.6),startY=(i===0?.15:Math.cos(i*1.8)*3.4)+fall;
   const targetX=x-(this.mobile?.6:2),targetY=this.mobile?-2.2+i*.415:-2.5+i*.55;
   sheet.position.set(THREE.MathUtils.lerp(startX,targetX,assemble),THREE.MathUtils.lerp(startY,targetY,assemble)-(this.mobile?.85:0),THREE.MathUtils.lerp(i===0?1.7:-1-(i%3)*.8,-.5,assemble));
   const scale=THREE.MathUtils.lerp(i===0?3.35:1.1+(i%3)*.23,.56,assemble)*(1-summit*.08)*(this.mobile?.75:1);
   sheet.scale.setScalar(scale);sheet.rotation.set(THREE.MathUtils.lerp(-.16+Math.sin(phaseOffset+t*.17)*.16,0,assemble),THREE.MathUtils.lerp(-.5+Math.sin(phaseOffset)*.8,0,assemble),THREE.MathUtils.lerp(-.32+Math.sin(phaseOffset)*.5,0,assemble));
   // The model stays unchanged: only the presentation transform animates.
   if(reduced&&!assemble)sheet.rotation.set(-.15,-.45,-.2+i*.12);
   sheet.visible=!(summit>.2&&i>5);
  });
  this.renderer.render(this.scene,this.camera);
 }
}
