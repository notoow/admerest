import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {DOCTORS,LANDMARKS,rendererFor,lighting,tower,lotte,burj,everest} from './scene.js';
import {towerPanels} from './measurements.js';

const UNIT=.008, PANEL_HEIGHT=.92/MODEL_WIDTH;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});

export class Explorer {
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.selected='kim';this.auto=false;
  this.objects=new Map();this.labels=new Map();this.home=new Map();this.simTarget=120;this.simFinalTarget=120;this.simWidth=.92;this.simWidthTarget=.92;
  this.renderer=rendererFor(host);this.scene=new THREE.Scene();lighting(this.scene);
  this.camera=new THREE.PerspectiveCamera(34,1,.05,1000);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);
  Object.assign(this.controls,{enableDamping:true,dampingFactor:.07,minPolarAngle:.25,maxPolarAngle:Math.PI/2-.035,minDistance:4,maxDistance:400,enablePan:true});
  this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.renderer.domElement.style.touchAction='none';
  this.renderer.domElement.setAttribute('aria-label','탑 탐색: 드래그하여 회전, 휠 또는 두 손가락으로 확대. 더하기·빼기 키로 확대·축소, 0 키로 전체 보기.');
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShadowMaterial({opacity:.10}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.01;this.scene.add(floor);
  this.grid=new THREE.GridHelper(80,80,0xc8d7eb,0xe0e9f5);this.grid.material.transparent=true;this.grid.material.opacity=.25;this.grid.position.y=-.015;this.scene.add(this.grid);
  DOCTORS.forEach((d,i)=>this.addObject(d.id,tower(d.length),[i*2.25-5.1,0,0],d.name,d.length,d.country));
  this.addObject('burj',burj(),[2,0,0],LANDMARKS.burj.name,828);
  this.addObject('lotte',lotte(),[4.2,0,0],LANDMARKS.lotte.name,555);
  this.addObject('everest',everest(),[28,0,-18],LANDMARKS.everest.name,8848.86);this.objects.get('everest').visible=false;
  this.addObject('simulation',tower(120),[-7.5,0,0],'내 체험 탑',120);this.objects.get('simulation').visible=false;
  this.guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x5987dc,dashSize:.16,gapSize:.11,transparent:true,opacity:.65}));
  this.guide.visible=false;this.scene.add(this.guide);
  this.raycaster=new THREE.Raycaster();let down;
  this.renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];this.transition=null;});
  this.renderer.domElement.addEventListener('pointerup',e=>{
   if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
   const rect=host.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
   const hit=this.raycaster.intersectObjects([...this.objects.values()].filter(o=>o.visible),true)[0];
   if(hit){let obj=hit.object;while(obj.parent!==this.scene&&obj.parent)obj=obj.parent;if(DOCTORS.some(d=>d.id===obj.userData.id))this.onSelect(obj.userData.id);}
  });
  this.renderer.domElement.addEventListener('keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.host.dispatchEvent(new CustomEvent('overview-request'));else this.zoom(e.key==='-'?1.15:.87);}});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.overview(true);this.markSelected();
  this.visible=true;this.visibilityObserver=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;},{rootMargin:'150px'});this.visibilityObserver.observe(host);
  this.loop();host.querySelector('.scene-loading')?.remove();
 }
 addObject(id,obj,position,name,value,country){
  obj.position.set(...position);obj.userData.id=id;this.scene.add(obj);this.objects.set(id,obj);this.home.set(id,obj.position.clone());
  const label=document.createElement('button');label.className='scene-label';label.dataset.object=id;
  label.setAttribute('aria-label',`${name}, ${number.format(value)}미터, 탑 보기`);
  label.innerHTML=`<span class="label-name">${name}${country?`<img class="flag" src="./assets/${country}.svg" alt="${country}">`:''}</span><div class="label-value">${number.format(value)} <small>m</small></div>`;
  label.addEventListener('click',()=>{if(DOCTORS.some(d=>d.id===id))this.onSelect(id);else if(!this.comparison)this.focus(id);});
  this.host.append(label);this.labels.set(id,label);
 }
 resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  if(this.objects.size)this.frameVisible(true);
 }
 zoom(factor){this.transition=null;this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();}
 animateCamera(position,target,instant=false){
  if(instant||reduced){this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();this.transition=null;}
  else this.transition={start:performance.now(),from:this.camera.position.clone(),to:position.clone(),oldTarget:this.controls.target.clone(),target:target.clone()};
 }
 clearComparison(){
  if(!this.comparison)return;
  for(const [id,o]of this.objects){o.position.copy(this.home.get(id));o.scale.set(1,1,1);o.visible=this.restoreVisibility.get(id);}
  this.comparison=null;this.guide.visible=false;this.host.dataset.view='all';
 }
 frameVisible(instant=false){
  const box=new THREE.Box3();
  for(const [id,o]of this.objects)if(o.visible){
   if(id==='simulation'){
    // Pooled panels remain in the group after shrinking; only frame the visible height.
    const halfWidth=Math.max(.57,this.simWidth/2)*o.scale.x,halfDepth=.36*o.scale.z;
    box.union(new THREE.Box3(o.position.clone().add(new THREE.Vector3(-halfWidth,0,-halfDepth)),o.position.clone().add(new THREE.Vector3(halfWidth,Math.max(.035,this.simTarget*UNIT,this.simFinalTarget*UNIT),halfDepth))));
   }else box.expandByObject(o);
  }
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const angle=THREE.MathUtils.degToRad(this.camera.fov/2);
  const distance=Math.max(size.y/(2*Math.tan(angle)),size.x/(2*Math.tan(angle)*this.camera.aspect))*1.34+size.z*.5;
  const direction=this.comparison?new THREE.Vector3(0,.04,1):new THREE.Vector3(this.host.clientWidth<600?.12:.22,.12,1);
  this.animateCamera(center.clone().add(direction.normalize().multiplyScalar(Math.max(6,distance))),center,instant);
 }
 overview(instant=false){this.clearComparison();this.host.dataset.view='all';this.frameVisible(instant);}
 compare(towerId,landmarkId){
  if(!this.objects.has(towerId)||!LANDMARKS[landmarkId])return;
  if(!this.comparison)this.restoreVisibility=new Map([...this.objects].map(([id,o])=>[id,o.visible]));
  this.comparison={towerId,landmarkId};this.selected=towerId;
  for(const [id,o]of this.objects){o.position.copy(this.home.get(id));o.scale.set(1,1,1);o.visible=id===towerId||id===landmarkId;}
  const mountain=landmarkId==='everest',a=this.objects.get(towerId),b=this.objects.get(landmarkId);
  a.position.set(mountain?-32:-1.7,0,0);b.position.set(mountain?20:1.7,0,0);
  // Widths are illustrative; the vertical scale stays identical for both objects.
  if(mountain){a.scale.set(3,1,2);b.scale.set(.8,1,.8);}
  const y=LANDMARKS[landmarkId].height*UNIT;
  this.guide.geometry.dispose();this.guide.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.position.x-(mountain?3:1),y,.5),new THREE.Vector3(b.position.x,y,.5)]);
  this.guide.computeLineDistances();this.guide.visible=true;this.markSelected();this.host.dataset.view='comparison';this.frameVisible();
 }
 focus(id){
  if(this.comparison&&(DOCTORS.some(d=>d.id===id)||id==='simulation')){this.compare(id,this.comparison.landmarkId);return;}
  const obj=this.objects.get(id);if(!obj?.visible)return;
  this.selected=id;this.markSelected();const h=id==='simulation'?Math.max(.035,this.simFinalTarget*UNIT):obj.userData.height;
  const center=obj.position.clone().add(new THREE.Vector3(0,h*.48,0)),distance=Math.max(h*2.25,8);
  this.animateCamera(center.clone().add(new THREE.Vector3(distance*.3,distance*.12,distance)),center);
 }
 markSelected(){for(const [id,o]of this.objects){if(o.userData.base)o.userData.base.material.color.set(id===this.selected?0x3975ff:0xdfe7f3);this.labels.get(id)?.classList.toggle('selected',id===this.selected);}}
 toggleLandmark(id,on){this.clearComparison();this.objects.get(id).visible=on;this.overview();}
 showSimulation(){
  if(this.comparison){this.restoreVisibility.set('simulation',true);this.compare('simulation',this.comparison.landmarkId);}
  else{this.objects.get('simulation').visible=true;this.focus('simulation');}
 }
 prepareSimulation(meters){this.simFinalTarget=meters;if(this.selected==='simulation'){if(this.comparison)this.frameVisible();else this.focus('simulation');}}
 updateSimulation(meters){this.simTarget=Math.max(0,meters);}
 setSize({width,length}){this.simWidthTarget=PANEL_HEIGHT*width/length;}
 refit(){if(this.comparison)this.frameVisible();else if(this.selected==='simulation')this.focus('simulation');}
 renderSimulation(){
  const obj=this.objects.get('simulation'),height=this.simTarget*UNIT,layout=towerPanels(height,PANEL_HEIGHT),now=performance.now();
  const dt=this.lastFrameTime===undefined?16:Math.min(100,now-this.lastFrameTime);this.lastFrameTime=now;
  this.simWidth+=(this.simWidthTarget-this.simWidth)*(reduced?1:1-Math.exp(-dt/180));
  const panels=obj.children.filter(c=>c!==obj.userData.base);
  while(panels.length<layout.length){const panel=createSheet();panel.userData.born=now;obj.add(panel);panels.push(panel);}
  panels.forEach((p,i)=>{
   const visible=i<layout.length;if(visible&&!p.visible)p.userData.born=now;p.visible=visible;if(!visible)return;
   const part=layout[i],age=p.userData.born===undefined?1:Math.min(1,(now-p.userData.born)/420);
   p.scale.set(this.simWidth/MODEL_WIDTH,part.height,.13/MODEL_DEPTH);
   p.position.y=part.center+(reduced?0:.7*Math.pow(1-age,3));
  });
  obj.userData.height=Math.max(.035,height);
  if(this.lastLabelValue!==this.simTarget){
   this.labels.get('simulation').querySelector('.label-value').innerHTML=`${number.format(this.simTarget)} <small>m</small>`;
   this.labels.get('simulation').setAttribute('aria-label',`내 체험 탑, ${number.format(this.simTarget)}미터, 탑 보기`);this.lastLabelValue=this.simTarget;
  }
 }
 loop(){
  requestAnimationFrame(()=>this.loop());if(!this.visible||document.hidden)return;
  this.renderSimulation();
  if(this.transition){const t=Math.min(1,(performance.now()-this.transition.start)/850),ease=1-Math.pow(1-t,3);this.camera.position.lerpVectors(this.transition.from,this.transition.to,ease);this.controls.target.lerpVectors(this.transition.oldTarget,this.transition.target,ease);if(t===1)this.transition=null;}
  this.controls.autoRotate=this.auto&&!reduced&&!this.transition;this.controls.autoRotateSpeed=.45;this.controls.update();this.renderer.render(this.scene,this.camera);
  for(const [id,obj]of this.objects){
   const label=this.labels.get(id),farMountain=this.objects.get('everest').visible&&this.camera.position.distanceTo(this.controls.target)>90;
   if(!obj.visible||(!this.comparison&&farMountain&&id!=='everest'&&id!==this.selected)||(!this.comparison&&this.host.clientWidth<600&&DOCTORS.some(d=>d.id===id)&&id!==this.selected)){label.style.display='none';continue;}
   const point=obj.position.clone().add(new THREE.Vector3(0,obj.userData.height+.42,0)).project(this.camera);
   label.style.display=point.z<1&&point.z>-1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.1?'block':'none';
   label.style.left=`${(point.x*.5+.5)*this.host.clientWidth}px`;label.style.top=`${(-point.y*.5+.5)*this.host.clientHeight}px`;
  }
 }
}
