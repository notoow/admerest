import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {DOCTORS,LANDMARKS,rendererFor,lighting,tower,lotte,burj,everest} from './scene.js';
import {towerPanels} from './measurements.js';
import {FlightControls} from './flight.js';
import {createAtmosphere} from './atmosphere.js';

const UNIT=.008, PANEL_HEIGHT=.92/MODEL_WIDTH;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});

export class Explorer {
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.selected='kim';this.auto=false;
  this.objects=new Map();this.labels=new Map();this.home=new Map();this.simTarget=120;this.simFinalTarget=120;this.simWidth=.92;this.simWidthTarget=.92;
  this.renderer=rendererFor(host);this.scene=new THREE.Scene();lighting(this.scene);this.atmosphere=createAtmosphere(this.scene);
  this.camera=new THREE.PerspectiveCamera(34,1,.05,1000);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);
  Object.assign(this.controls,{enableDamping:true,dampingFactor:.07,minPolarAngle:.25,maxPolarAngle:Math.PI/2-.035,minDistance:4,maxDistance:400,enablePan:true});
  this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.renderer.domElement.style.touchAction='none';
  this.renderer.domElement.setAttribute('aria-label','탑 탐색: 드래그하여 회전, 휠 또는 두 손가락으로 확대. 더하기·빼기 키로 확대·축소, 0 키로 전체 보기.');
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShadowMaterial({opacity:.10}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.01;this.scene.add(floor);
  this.grid=new THREE.GridHelper(80,80,0xc8d7eb,0xe0e9f5);this.grid.material.transparent=true;this.grid.material.opacity=.13;this.grid.position.y=.002;this.scene.add(this.grid);
  DOCTORS.forEach((d,i)=>this.addObject(d.id,tower(d.length),[i*2.25-5.1,0,0],d.name,d.length,d.country));
  this.addObject('burj',burj(),[2,0,0],LANDMARKS.burj.name,828);
  this.addObject('lotte',lotte(),[4.2,0,0],LANDMARKS.lotte.name,555);
  this.addObject('everest',everest(),[55,0,-85],LANDMARKS.everest.name,8848.86);this.objects.get('everest').visible=false;
  this.addObject('simulation',tower(120),[-7.5,0,0],'내 체험 탑',120);this.objects.get('simulation').visible=false;
  this.guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x5987dc,dashSize:.16,gapSize:.11,transparent:true,opacity:.65}));
  this.guide.visible=false;this.scene.add(this.guide);
  this.raycaster=new THREE.Raycaster();let down;
  this.renderer.domElement.addEventListener('pointerdown',e=>{if(this.flight?.enabled)return;down=[e.clientX,e.clientY];this.transition=null;});
  this.renderer.domElement.addEventListener('pointerup',e=>{
   if(this.flight?.enabled||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
   const rect=host.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
   const hit=this.raycaster.intersectObjects([...this.objects.values()].filter(o=>o.visible),true)[0];
   if(hit){let obj=hit.object;while(obj.parent!==this.scene&&obj.parent)obj=obj.parent;if(DOCTORS.some(d=>d.id===obj.userData.id))this.onSelect(obj.userData.id);}
  });
  this.renderer.domElement.addEventListener('keydown',e=>{if(this.flight?.enabled)return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.host.dispatchEvent(new CustomEvent('overview-request'));else this.zoom(e.key==='-'?1.15:.87);}});
  this.flight=new FlightControls(this.camera,this.renderer.domElement);this.bindFlightUI();
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.overview(true);this.markSelected();
  this.visible=true;this.visibilityObserver=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;},{rootMargin:'150px'});this.visibilityObserver.observe(host);
  this.loop();host.querySelector('.scene-loading')?.remove();
 }
 addObject(id,obj,position,name,value,country){
  obj.position.set(...position);obj.userData.id=id;this.scene.add(obj);this.objects.set(id,obj);this.home.set(id,obj.position.clone());
  const label=document.createElement('button');label.className='scene-label';label.dataset.object=id;
  label.setAttribute('aria-label',`${name}, ${number.format(value)}미터, 탑 보기`);
  label.innerHTML=`<span class="label-name">${name}${country?`<img class="flag" src="./assets/${country}.svg" alt="${country}">`:''}</span><div class="label-value">${number.format(value)} <small>m</small></div>`;
  label.addEventListener('click',()=>{if(this.flight?.enabled)return;if(DOCTORS.some(d=>d.id===id))this.onSelect(id);else if(!this.comparison)this.focus(id);});
  this.host.append(label);this.labels.set(id,label);
 }
 resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  if(this.objects.size&&!this.flight?.enabled)this.frameVisible(true);
 }
 bindFlightUI(){
  this.main=this.host.closest('.explorer-main');this.hud=document.querySelector('#flight-hud');
  document.querySelector('#exit-flight').addEventListener('click',()=>this.setFlying(false));
  document.querySelector('#flight-speed').addEventListener('input',e=>{this.flight.speed=Number(e.target.value);document.querySelector('#flight-speed-value').textContent=`×${this.flight.speed.toFixed(1)}`;});
  document.querySelectorAll('[data-flight-destination]').forEach(button=>button.addEventListener('click',()=>{this.visit(button.dataset.flightDestination);this.renderer.domElement.focus({preventScroll:true});}));
  document.addEventListener('keydown',e=>{
   if(!this.flight.enabled)return;
   if(e.key==='Escape'){e.preventDefault();this.setFlying(false);return;}
   if(e.key==='Tab'){
    const items=[...this.main.querySelectorAll('button,input,canvas[tabindex]')].filter(el=>el.tabIndex>=0&&!el.disabled&&el.getClientRects().length),index=items.indexOf(document.activeElement);
    if(e.shiftKey&&index<=0){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&(index===items.length-1||index<0)){e.preventDefault();items[0]?.focus();}
   }
  });
 }
 setFlying(on){
  if(on===this.flight.enabled)return;
  for(const label of this.labels.values()){label.tabIndex=on?-1:0;label.setAttribute('aria-disabled',String(on));}
  this.transition=null;this.auto=false;this.controls.autoRotate=false;document.querySelector('#auto-rotate').setAttribute('aria-pressed','false');
  if(on){
   this.previousFocus=document.activeElement;this.savedScroll=window.scrollY;
   this.placeholder=document.createElement('div');this.placeholder.style.height=`${this.main.offsetHeight}px`;this.main.before(this.placeholder);
   this.controls.enabled=false;this.main.classList.add('is-flying');this.hud.hidden=false;document.body.classList.add('flight-open');
   this.main.setAttribute('role','dialog');this.main.setAttribute('aria-modal','true');this.main.setAttribute('aria-label','3D 자유 탐색');
   this.orbitLabel=this.renderer.domElement.getAttribute('aria-label');this.renderer.domElement.setAttribute('aria-label','자유 탐색: WASD 이동, Q 상승, E 하강, Shift 빠르게. 드래그로 둘러보기. Escape로 종료.');
   this.flight.setEnabled(true);this.camera.fov=58;this.visit('city');
  }else{
   this.flight.setEnabled(false);this.controls.enabled=true;this.controls.target.copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
   this.main.classList.remove('is-flying');this.hud.hidden=true;document.body.classList.remove('flight-open');this.placeholder?.remove();
   this.main.removeAttribute('role');this.main.removeAttribute('aria-modal');this.main.removeAttribute('aria-label');this.camera.fov=34;this.renderer.domElement.setAttribute('aria-label',this.orbitLabel);
   window.scrollTo({top:this.savedScroll,behavior:'instant'});this.previousFocus?.focus({preventScroll:true});
  }
  this.resize();this.host.dispatchEvent(new CustomEvent('flight-mode-change',{detail:{enabled:on}}));
 }
 visit(destination){
  this.flight.clear();
  if(destination==='everest'){const mountain=this.objects.get('everest');this.camera.position.copy(mountain.position).add(new THREE.Vector3(8,71,75));this.camera.lookAt(mountain.position.clone().add(new THREE.Vector3(0,58,0)));}
  else if(destination==='simulation'){
   const o=this.objects.get('simulation');o.visible=true;const h=Math.max(1.5,this.simTarget*UNIT);this.camera.position.copy(o.position).add(new THREE.Vector3(3,h*.65,Math.max(7,h*.9)));this.camera.lookAt(o.position.clone().add(new THREE.Vector3(0,h*.5,0)));
  }else{this.camera.position.set(8,3.2,18);this.camera.lookAt(-1,4,0);}
  this.flight.syncAngles();document.querySelectorAll('[data-flight-destination]').forEach(b=>b.classList.toggle('active',b.dataset.flightDestination===destination));
 }
 navigationState(){return {mode:this.flight.enabled?'flight':'orbit',position:this.camera.position.toArray().map(n=>Number(n.toFixed(4))),speed:this.flight.speed};}
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
 prepareSimulation(meters){this.simFinalTarget=meters;if(this.selected==='simulation'&&!this.flight.enabled){if(this.comparison)this.frameVisible();else this.focus('simulation');}}
 updateSimulation(meters){this.simTarget=Math.max(0,meters);}
 setSize({width,length}){this.simWidthTarget=PANEL_HEIGHT*width/length;}
 refit(){if(this.flight.enabled)return;if(this.comparison)this.frameVisible();else if(this.selected==='simulation')this.focus('simulation');}
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
  requestAnimationFrame(()=>this.loop());const now=performance.now(),dt=Math.min(.05,(now-(this.loopTime??now))/1000);this.loopTime=now;if((!this.visible&&!this.flight.enabled)||document.hidden)return;
  this.renderSimulation();
  if(this.transition){const t=Math.min(1,(performance.now()-this.transition.start)/850),ease=1-Math.pow(1-t,3);this.camera.position.lerpVectors(this.transition.from,this.transition.to,ease);this.controls.target.lerpVectors(this.transition.oldTarget,this.transition.target,ease);if(t===1)this.transition=null;}
  if(this.flight.enabled){
   this.flight.step(dt);if(now-(this.hudTime??0)>100){document.querySelector('#flight-altitude').textContent=number.format(Math.round(this.camera.position.y/UNIT));document.querySelector('#flight-altitude-fill').style.height=`${Math.min(100,this.camera.position.y/(8848.86*UNIT)*100)}%`;const degrees=((this.flight.yaw*180/Math.PI)%360+360)%360;document.querySelector('#flight-heading').textContent=['N','NW','W','SW','S','SE','E','NE'][Math.round(degrees/45)%8];this.hudTime=now;}
  }else{this.controls.autoRotate=this.auto&&!reduced&&!this.transition;this.controls.autoRotateSpeed=.45;this.controls.update();}
  this.atmosphere.update(this.camera,now,reduced);this.renderer.render(this.scene,this.camera);
  for(const [id,obj]of this.objects){
   const label=this.labels.get(id),farMountain=this.objects.get('everest').visible&&this.camera.position.distanceTo(this.controls.target)>90;
   if(!obj.visible||(!this.flight.enabled&&!this.comparison&&farMountain&&id!=='everest'&&id!==this.selected)||(!this.flight.enabled&&!this.comparison&&this.host.clientWidth<600&&DOCTORS.some(d=>d.id===id)&&id!==this.selected)){label.style.display='none';continue;}
   const point=obj.position.clone().add(new THREE.Vector3(0,obj.userData.height+.42,0)).project(this.camera);
   label.style.display=point.z<1&&point.z>-1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.1?'block':'none';
   const halfLabel=label.offsetWidth/2+8;
   label.style.left=`${THREE.MathUtils.clamp((point.x*.5+.5)*this.host.clientWidth,halfLabel,this.host.clientWidth-halfLabel)}px`;label.style.top=`${(-point.y*.5+.5)*this.host.clientHeight}px`;
  }
 }
}
