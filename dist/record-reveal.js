import * as THREE from 'three';
import {createSheet,createLightSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {lighting} from './scene.js';

import {clamp,revealProgress} from './record-motion.js';
const format=new Intl.NumberFormat('en-US'),decimal=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
export class RecordReveal {
 constructor(playground,onTower){
  this.playground=playground;this.onTower=onTower;this.elapsed=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.dialog=document.createElement('dialog');this.dialog.className='record-dialog';this.dialog.setAttribute('aria-labelledby','record-title');
  this.dialog.innerHTML=`<div class="record-stage"></div><div class="record-grain" aria-hidden="true"></div><button class="record-close" aria-label="기록 연출 닫기">닫기 ×</button><div class="record-copy"><span class="record-kicker">THE MAKING OF A RECORD · DEMO</span><p class="record-person"></p><h2 id="record-title">한 장에서 시작한 기록</h2><div class="record-count" aria-hidden="true"><b>0</b><span>건</span></div><p class="record-sr sr-only" role="status"></p><p class="record-length">진피 누적 길이 <strong>0 m</strong></p><p class="record-note">가상 전문의의 예시 기록 · 진피 소나기는 규모를 표현한 연출입니다.</p></div><div class="record-footer"><span class="record-timeline"><i></i></span><p class="record-hint">작은 한 장들이, 하나의 기록이 되는 순간.</p><div><button class="record-skip">최종 기록 보기</button><button class="record-replay" hidden>다시 감상하기 ↻</button><button class="record-tower" hidden>공개 탑 보러 가기 ↗</button></div></div>`;
  document.body.append(this.dialog);this.stage=this.dialog.querySelector('.record-stage');
  this.dialog.querySelector('.record-close').onclick=()=>this.close();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.querySelector('.record-skip').onclick=()=>{this.elapsed=6.4;this.step(0);};
  this.dialog.querySelector('.record-replay').onclick=()=>{this.elapsed=0;this.announced=false;this.step(0);};
  this.dialog.querySelector('.record-tower').onclick=()=>{const id=this.record.id;this.close();this.onTower(id);};
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x071a36);lighting(this.scene);
  this.scene.add(new THREE.AmbientLight(0xa5bfe9,.65));this.camera=new THREE.PerspectiveCamera(36,1,.1,100);
  this.pieces=Array.from({length:36},(_,i)=>{const mesh=createLightSheet();this.scene.add(mesh);return mesh;});
  this.hero=createSheet(true);this.scene.add(this.hero);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.9,2.05,.16,64),new THREE.MeshStandardMaterial({color:0x174a96,metalness:.25,roughness:.4}));pedestal.position.y=-.14;this.scene.add(pedestal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.12,.018,6,80),new THREE.MeshBasicMaterial({color:0x80c5ff}));ring.rotation.x=Math.PI/2;ring.position.y=-.1;this.scene.add(ring);
  const stars=new Float32Array(90*3);for(let i=0;i<90;i++){stars[i*3]=Math.sin(i*8.3)*7;stars[i*3+1]=(i%23)/23*10;stars[i*3+2]=-2-Math.cos(i*1.9)*4;}
  const dots=new THREE.BufferGeometry();dots.setAttribute('position',new THREE.BufferAttribute(stars,3));this.scene.add(new THREE.Points(dots,new THREE.PointsMaterial({color:0x91c6ff,size:.024,transparent:true,opacity:.6})));
 }
 open(record){
  if(this.dialog.open)return;
  this.record=record;this.elapsed=0;this.announced=false;this.previousFocus=document.activeElement;
  const host=this.playground.host;this.home=host.parentNode;this.next=host.nextSibling;this.placeholder=document.createElement('div');this.placeholder.style.height=`${host.clientHeight}px`;host.before(this.placeholder);
  this.shadowAutoUpdate=this.playground.renderer.shadowMap.autoUpdate;this.playground.renderer.shadowMap.autoUpdate=true;this.playground.renderer.shadowMap.needsUpdate=true;
  document.body.classList.add('record-open');this.dialog.showModal();this.stage.append(host);this.playground.presentation=this;this.playground.controls.enabled=false;this.playground.resize();
  const privatePreview=record.preview===true;
  this.dialog.querySelector('.record-kicker').textContent=privatePreview?'THE MAKING OF YOUR RECORD · PRIVATE PREVIEW':'THE MAKING OF A RECORD · DEMO';
  this.dialog.querySelector('.record-person').textContent=`${record.name} · ${record.countryName} · ${privatePreview?'미인증 · 나만 보기':'데모 인증'}`;
  this.dialog.querySelector('.record-note').textContent=privatePreview?'입력한 기록의 비공개 미리보기 · 진피 소나기는 규모를 표현한 연출입니다.':'가상 전문의의 예시 기록 · 진피 소나기는 규모를 표현한 연출입니다.';
  this.dialog.querySelector('.record-tower').textContent=privatePreview?'내 탑 비교하기 ↗':'공개 탑 보러 가기 ↗';
  this.dialog.querySelector('.record-close').focus();this.step(0);
 }
 close(){
  if(!this.dialog.open)return;
  this.playground.presentation=null;this.playground.controls.enabled=true;this.playground.renderer.shadowMap.autoUpdate=this.shadowAutoUpdate;this.playground.renderer.shadowMap.needsUpdate=true;this.home.insertBefore(this.playground.host,this.next);this.placeholder.remove();this.dialog.close();document.body.classList.remove('record-open');this.playground.resize();this.previousFocus?.focus({preventScroll:true});
 }
 state(){return {open:this.dialog.open,professionalId:this.record?.id??null,elapsedSeconds:this.elapsed,finished:revealProgress(this.elapsed,this.reduced).done};}
 step(dt){
  this.elapsed+=dt;const t=this.elapsed,p=revealProgress(t,this.reduced),mobile=this.camera.aspect<.8;
  const count=Math.round(this.record.cases*p.count),length=p.done?this.record.length:Math.round(this.record.length*p.count*100)/100;
  this.dialog.querySelector('.record-count b').textContent=format.format(count);this.dialog.querySelector('.record-length strong').textContent=`${decimal.format(length)} m`;
  this.dialog.querySelector('#record-title').textContent=p.phase;this.dialog.querySelector('.record-timeline i').style.transform=`scaleX(${(this.reduced?1:clamp(t/6.4))})`;
  this.dialog.querySelector('.record-skip').hidden=p.done;this.dialog.querySelector('.record-replay').hidden=!p.done;this.dialog.querySelector('.record-tower').hidden=!p.done;
  if(p.done&&!this.announced){this.dialog.querySelector('.record-sr').textContent=`${this.record.name}, 총 수술 ${format.format(this.record.cases)}건, 진피 누적 길이 ${decimal.format(this.record.length)}미터. ${this.record.preview?'검증되지 않은 비공개 미리보기입니다.':'가상 예시입니다.'}`;this.announced=true;}
  this.hero.visible=t<1.3&&!this.reduced;this.hero.position.set(0,2.5,0);this.hero.scale.setScalar(2.3);this.hero.rotation.set(.1,-.4+t*.9,-.16);
  this.pieces.forEach((mesh,i)=>{
   const age=t-.75-i*.055;mesh.visible=age>=0||this.reduced;
   const phase=((Math.max(0,age)*.78)%1+1)%1,x=Math.sin(i*5.47)*2.6,z=Math.cos(i*3.83)*1.8,y=8-11*phase*phase;
   // Ballistic rain resolves into representative layers; counts are independent records.
   mesh.position.set(x*(1-p.assemble),THREE.MathUtils.lerp(y,.045+i*.087,p.assemble),z*(1-p.assemble));
   mesh.rotation.set(THREE.MathUtils.lerp(-.9+Math.sin(i+t)*.6,-Math.PI/2,p.assemble),THREE.MathUtils.lerp(i*.4+t*.65,0,p.assemble),THREE.MathUtils.lerp(Math.sin(i*1.7+t)*.4,Math.sin(i)*.025,p.assemble));
   const width=THREE.MathUtils.lerp(.7,1.28,p.assemble);mesh.scale.set(width/MODEL_WIDTH,width*1.2,width*.06/MODEL_DEPTH);
  });
  const drift=this.reduced?0:Math.sin(Math.min(t,6.4)*.3)*.25;
  this.camera.position.set(mobile?6.2:6+drift,mobile?5.7:5.2,mobile?11:9.6);this.camera.lookAt(mobile?0:-1.4,mobile?2.8:1.6,0);
 }
}
