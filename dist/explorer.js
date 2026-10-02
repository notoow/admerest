import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createWorldSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {ResolutionBudget,sceneSuspended} from './render-budget.js';
import {DOCTORS,LANDMARKS,rendererFor,lighting,tower,lotte,burj,everest} from './scene.js';
import {towerPanels} from './measurements.js';
import {FlightControls} from './flight.js';
import {WORLD_UNIT} from './flight-motion.js';
import {createAtmosphere} from './atmosphere.js';
import {extraLandmark} from './landmarks.js';
import {orbitDamping,easeLabelLift,placeLabelBottom} from './explorer-motion.js';
import {PUBLIC_DOCTORS} from './records.js';

const UNIT=WORLD_UNIT, PANEL_HEIGHT=.92/MODEL_WIDTH;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});

export class Explorer {
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.selected='kim';this.auto=false;
  this.objects=new Map();this.labels=new Map();this.home=new Map();this.simCases=2000;this.simTarget=120;this.simFinalTarget=120;this.simWidth=.92;this.simWidthTarget=.92;
  this.labelMetrics=new Map();this.labelLifts=new Map();this.labelPoint=new THREE.Vector3();
  this.labelObserver=new ResizeObserver(entries=>{for(const {target}of entries){const {width,height}=target.getBoundingClientRect();if(width&&height)this.labelMetrics.set(target.dataset.object,{width,height});}});
  this.renderer=rendererFor(host);this.scene=new THREE.Scene();lighting(this.scene,this.renderer);this.atmosphere=createAtmosphere(this.scene);
  this.beaconButton=document.createElement('button');this.beaconButton.className='secret-orb';this.beaconButton.setAttribute('aria-label','주황색 구슬 살펴보기');this.beaconButton.hidden=true;this.beaconButton.addEventListener('click',()=>this.discover());host.append(this.beaconButton);this.beaconPoint=new THREE.Vector3();
  // Orbiting changes the camera, not the sun or buildings. Reuse their shadow map.
  this.renderer.shadowMap.autoUpdate=false;
  this.budget=new ResolutionBudget(this.renderer.getPixelRatio());
  this.camera=new THREE.PerspectiveCamera(34,1,.003,550);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);
  Object.assign(this.controls,{enableDamping:true,dampingFactor:.07,minPolarAngle:.25,maxPolarAngle:Math.PI/2-.035,minDistance:4,maxDistance:400,enablePan:true});
  this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.renderer.domElement.style.touchAction='none';
  this.renderer.domElement.setAttribute('aria-label','탑 탐색: 드래그하여 회전, 휠 또는 두 손가락으로 확대. 더하기·빼기 키로 확대·축소, 0 키로 전체 보기.');
  // The atmosphere has one receiving ground surface. Coplanar shadow/grid planes
  // used to fight in the depth buffer, especially at human eye height on phones.
  PUBLIC_DOCTORS.forEach((d,i)=>this.addObject(d.id,tower(d.length),[i*2.25-2.5,0,0],d.name,d.length,d.country));
  this.addObject('burj',burj(),[2,0,0],LANDMARKS.burj.name,828);
  this.addObject('lotte',lotte(),[4.2,0,0],LANDMARKS.lotte.name,555);
  this.addObject('shanghai',extraLandmark('shanghai'),[6.4,0,0],LANDMARKS.shanghai.name,632);
  this.addObject('eiffel',extraLandmark('eiffel'),[8.8,0,0],LANDMARKS.eiffel.name,330);
  this.addObject('everest',everest(),[55,0,-85],LANDMARKS.everest.name,8848.86);this.objects.get('everest').visible=false;
  this.addObject('simulation',tower(120),[-7.5,0,0],'내 체험 탑',120);this.objects.get('simulation').visible=false;
  this.guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x5987dc,dashSize:.16,gapSize:.11,transparent:true,opacity:.65}));
  this.guide.visible=false;this.scene.add(this.guide);
  this.raycaster=new THREE.Raycaster();let down;
  this.renderer.domElement.addEventListener('pointerdown',e=>{if(this.flight?.enabled)return;down=[e.clientX,e.clientY];this.transition=null;});
  this.renderer.domElement.addEventListener('pointerup',e=>{
   if(this.flight?.enabled||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
   const rect=host.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
   if(this.raycaster.intersectObject(this.atmosphere.beacon,true).length){this.discover();return;}
   const hit=this.raycaster.intersectObjects([...this.objects.values()].filter(o=>o.visible),true)[0];
   if(hit){let obj=hit.object;while(obj.parent!==this.scene&&obj.parent)obj=obj.parent;if(DOCTORS.some(d=>d.id===obj.userData.id))this.onSelect(obj.userData.id);}
  });
  this.renderer.domElement.addEventListener('keydown',e=>{if(this.flight?.enabled)return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.host.dispatchEvent(new CustomEvent('overview-request'));else this.zoom(e.key==='-'?1.15:.87);}});
  this.flight=new FlightControls(this.camera,this.renderer.domElement,{groundHeight:(x,z)=>this.groundHeight(x,z),blocked:(x,z,y)=>this.blocked(x,z,y)});this.bindFlightUI();
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.overview(true);this.markSelected();
  this.visible=true;this.visibilityObserver=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;},{rootMargin:'150px'});this.visibilityObserver.observe(host);
  this.loop();host.querySelector('.scene-loading')?.remove();
 }
 addObject(id,obj,position,name,value,country){
  obj.position.set(...position);obj.userData.id=id;this.scene.add(obj);this.objects.set(id,obj);this.home.set(id,obj.position.clone());
  const label=document.createElement('button');label.className='scene-label';label.dataset.object=id;
  const doctor=DOCTORS.find(d=>d.id===id);
  label.setAttribute('aria-label',`${name}, ${doctor?`수술 ${number.format(doctor.cases)}건, `:''}${number.format(value)}미터, 탑 보기`);
  label.innerHTML=`<span class="label-name">${name}${country?`<img class="flag" src="./assets/${country}.svg" alt="${country}">`:''}${doctor?.verification==='demo'?'<span class="verify-badge" title="데모 인증 표시 · 실제 심사 이력 아님" aria-hidden="true">✓</span>':''}</span><div class="label-value">${number.format(doctor?doctor.cases:id==='simulation'?this.simCases:value)} <small>${doctor||id==='simulation'?'건':'m'}</small></div>${doctor||id==='simulation'?`<span class="label-length">진피 ${number.format(value)} m</span>`:''}`;
  label.addEventListener('click',()=>{if(this.flight?.enabled)return;if(DOCTORS.some(d=>d.id===id))this.onSelect(id);else if(!this.comparison)this.focus(id);});
  this.host.append(label);this.labels.set(id,label);this.labelObserver.observe(label);
 }
 resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  if(this.viewWidth===w&&this.viewHeight===h)return;this.viewWidth=w;this.viewHeight=h;
  this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  if(this.objects.size&&!this.flight?.enabled){if(this.host.dataset.view==='focus')this.focus(this.selected,true);else this.frameVisible(true);}
 }
 bindFlightUI(){
  this.main=this.host.closest('.explorer-main');this.hud=document.querySelector('#flight-hud');
  document.querySelector('#exit-flight').addEventListener('click',()=>this.setFlying(false));
  document.querySelector('#flight-settings').addEventListener('click',e=>{const on=this.hud.classList.toggle('settings-open');e.currentTarget.setAttribute('aria-pressed',String(on));});
  document.querySelector('#discover-light').addEventListener('click',()=>this.discover());
  document.querySelector('#flight-speed').addEventListener('input',e=>{this.flight.speed=Number(e.target.value);document.querySelector('#flight-speed-value').textContent=`×${this.flight.speed.toFixed(1)}`;});
  document.querySelectorAll('[data-flight-destination]').forEach(button=>button.addEventListener('click',()=>{this.visit(button.dataset.flightDestination);this.renderer.domElement.focus({preventScroll:true});}));
  document.addEventListener('keydown',e=>{
   if(!this.flight.enabled)return;
   if(e.key==='Escape'){e.preventDefault();if(this.flight.locked||this.flight.hoverLook){this.flight.unlock();return;}if(performance.now()-this.flight.unlockedAt>250)this.setFlying(false);return;}
   if(e.key==='Tab'){
    this.flight.unlock();
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
   this.orbitLabel=this.renderer.domElement.getAttribute('aria-label');this.renderer.domElement.setAttribute('aria-label','보행 탐색: WASD 이동, 마우스로 둘러보기, Shift 가속. Q 상승, E 하강. Escape로 마우스 해제, 다시 Escape로 종료.');
   this.flight.setEnabled(true);this.camera.fov=65;this.visit('city');this.flight.requestLook();
  }else{
   this.flight.setEnabled(false);this.controls.enabled=true;this.controls.target.copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
   this.main.classList.remove('is-flying');this.hud.hidden=true;document.body.classList.remove('flight-open');this.placeholder?.remove();
   this.main.removeAttribute('role');this.main.removeAttribute('aria-modal');this.main.removeAttribute('aria-label');this.camera.fov=34;this.renderer.domElement.setAttribute('aria-label',this.orbitLabel);
   window.scrollTo({top:this.savedScroll,behavior:'instant'});this.previousFocus?.focus({preventScroll:true});
  }
  this.resize();this.host.dispatchEvent(new CustomEvent('flight-mode-change',{detail:{enabled:on}}));
 }
 discover(){
  if(this.atmosphere.unlocked)return;this.atmosphere.unlock();document.querySelector('#discover-light').hidden=true;
  const message=document.createElement('div');message.className='egg-toast';message.setAttribute('role','status');message.innerHTML='✦ 노을을 발견했습니다.<small>조금 돌아가면, 보이는 것도 달라지죠. · notoow</small>';this.main.append(message);setTimeout(()=>message.remove(),5500);
 }
 groundHeight(x,z){
  let height=this.atmosphere.groundHeight(x,z);
  const mountain=this.objects.get('everest');
  if(mountain?.visible){
   const mesh=mountain.children[0],p=mesh.geometry.attributes.position,n=mesh.geometry.parameters.widthSegments,width=mesh.geometry.parameters.width;
   const localX=(x-mountain.position.x)/mountain.scale.x,localZ=(z-mountain.position.z)/mountain.scale.z;
   const u=(localX+width/2)/width*n,v=(localZ+width/2)/width*n;
   if(u>=0&&u<n&&v>=0&&v<n){
    const ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,a=iz*(n+1)+ix;
    const tl=p.getY(a),tr=p.getY(a+1),bl=p.getY(a+n+1),br=p.getY(a+n+2);
    const y=fx+fz<=1?tl*(1-fx-fz)+tr*fx+bl*fz:br*(fx+fz-1)+tr*(1-fz)+bl*(1-fx);
    height=Math.max(height,y*mountain.scale.y+mountain.position.y);
   }
  }
  return height;
 }
 blocked(x,z,y){
  for(const [id,o]of this.objects){
   if(!o.visible||id==='everest'||y>o.userData.height+.03)continue;
   const halfX=(o.userData.halfWidth??(id==='lotte'?.44:id==='burj'?.65:.59))*o.scale.x+.012,halfZ=(o.userData.halfDepth??(id==='lotte'?.44:id==='burj'?.65:.37))*o.scale.z+.012;
   // The Eiffel arch is open: keep four footings solid, allow walking underneath.
   if(id==='eiffel'&&y<.25&&Math.min(Math.abs(x-o.position.x)/halfX,Math.abs(z-o.position.z)/halfZ)<.55)continue;
   if(Math.abs(x-o.position.x)<halfX&&Math.abs(z-o.position.z)<halfZ)return true;
  }
  return false;
 }
 visit(destination){
  this.flight.clear();
  if(destination==='everest'){
   const mountain=this.objects.get('everest');mountain.visible=true;
   this.camera.position.copy(mountain.position).add(new THREE.Vector3(0,0,65));this.flight.setWalking(true);
   this.camera.lookAt(mountain.position.clone().add(new THREE.Vector3(0,25,0)));
  }else if(destination==='simulation'){
   const o=this.objects.get('simulation');o.visible=true;this.camera.position.copy(o.position).add(new THREE.Vector3(1.5,0,4));this.flight.setWalking(true);
   this.camera.lookAt(o.position.clone().add(new THREE.Vector3(0,Math.min(2,this.simTarget*UNIT*.45),0)));
  }else{this.camera.position.set(1,0,10);this.flight.setWalking(true);this.camera.lookAt(-.7,2.6,0);}
  this.flight.syncAngles();document.querySelectorAll('[data-flight-destination]').forEach(b=>b.classList.toggle('active',b.dataset.flightDestination===destination));
 }
 navigationState(){return {mode:this.flight.enabled?'flight':'orbit',locomotion:this.flight.walking?'walk':'fly',position:this.camera.position.toArray().map(n=>Number(n.toFixed(5))),eyeHeightMeters:Number(((this.camera.position.y-this.groundHeight(this.camera.position.x,this.camera.position.z))/UNIT).toFixed(2)),yaw:this.flight.yaw,pitch:this.flight.pitch,pointerLocked:this.flight.locked,lookMode:this.flight.locked?'locked':this.flight.hoverLook?'hover':'paused',joystick:{...this.flight.stick},speed:this.flight.speed};}
 landmarkState(){return Object.fromEntries([...this.objects].filter(([id])=>LANDMARKS[id]?.model).map(([id,o])=>[id,{status:o.userData.assetStatus,heightMeters:o.userData.height/UNIT,visible:o.visible}]));}
 renderingState(){
  const samples=this.frameSamples??[],sorted=samples.map(s=>s.interval).sort((a,b)=>a-b);
  return {inViewport:this.visible,suspended:sceneSuspended('explorer'),target:this.controls.target.toArray(),pixelRatio:this.renderer.getPixelRatio(),compact:this.renderer.userData.profile.compact,shadows:this.renderer.shadowMap.enabled,easterEggFound:this.atmosphere.unlocked,autoRotate:this.auto,samples:samples.length,frameIntervalP95Ms:sorted[Math.floor(sorted.length*.95)]??0,renderCostMeanMs:samples.length?samples.reduce((sum,s)=>sum+s.cost,0)/samples.length:0,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,azimuth:this.controls.getAzimuthalAngle()};
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
 focus(id,instant=false){
  if(this.comparison&&(DOCTORS.some(d=>d.id===id)||id==='simulation')){this.compare(id,this.comparison.landmarkId);return;}
  const obj=this.objects.get(id);if(!obj?.visible)return;
  this.selected=id;this.host.dataset.view='focus';this.markSelected();const h=id==='simulation'?Math.max(.035,this.simFinalTarget*UNIT):obj.userData.height;
  const center=obj.position.clone().add(new THREE.Vector3(0,h*.48,0)),distance=Math.max(h*2.25,id==='simulation'?4:8);
  this.animateCamera(center.clone().add(new THREE.Vector3(distance*.3,distance*.12,distance)),center,instant);
 }
 markSelected(){for(const [id,o]of this.objects){if(o.userData.base)o.userData.base.material.color.set(id===this.selected?0x3975ff:0xdfe7f3);this.labels.get(id)?.classList.toggle('selected',id===this.selected);}}
 toggleLandmark(id,on){this.clearComparison();this.objects.get(id).visible=on;this.overview();}
 showSimulation(instant=false){
  if(this.comparison){this.restoreVisibility.set('simulation',true);this.compare('simulation',this.comparison.landmarkId);if(instant)this.frameVisible(true);}
  else{this.objects.get('simulation').visible=true;this.focus('simulation',instant);}
 }
 prepareSimulation(meters){this.simFinalTarget=meters;if(this.selected==='simulation'&&!this.flight.enabled){if(this.comparison)this.frameVisible();else this.focus('simulation');}}
 updateSimulation(meters,cases=this.simCases){this.simTarget=Math.max(0,meters);this.simCases=cases;}
 setSize({width,length}){this.simWidthTarget=PANEL_HEIGHT*width/length;}
 refit(){if(this.flight.enabled)return;if(this.comparison)this.frameVisible();else if(this.selected==='simulation')this.focus('simulation');}
 renderSimulation(){
  const obj=this.objects.get('simulation'),height=this.simTarget*UNIT,now=performance.now();
  if(!obj.visible)return false;
  if(this.renderedSimTarget===this.simTarget&&Math.abs(this.simWidthTarget-this.simWidth)<.00001&&now>(this.simAnimatingUntil??0)&&this.lastLabelCases===this.simCases)return false;
  const layout=towerPanels(height,PANEL_HEIGHT);
  const dt=this.lastFrameTime===undefined?16:Math.min(100,now-this.lastFrameTime);this.lastFrameTime=now;
  this.simWidth+=(this.simWidthTarget-this.simWidth)*(reduced?1:1-Math.exp(-dt/180));
  if(Math.abs(this.simWidthTarget-this.simWidth)<.00001)this.simWidth=this.simWidthTarget;
  const panels=obj.children.filter(c=>c!==obj.userData.base);
  while(panels.length<layout.length){const panel=createWorldSheet();panel.userData.born=now;this.simAnimatingUntil=now+420;obj.add(panel);panels.push(panel);}
  panels.forEach((p,i)=>{
   const visible=i<layout.length;if(visible&&!p.visible){p.userData.born=now;this.simAnimatingUntil=now+420;}p.visible=visible;if(!visible)return;
   const part=layout[i],age=p.userData.born===undefined?1:Math.min(1,(now-p.userData.born)/420);
   p.scale.set(this.simWidth/MODEL_WIDTH,part.height,.13/MODEL_DEPTH);
   p.position.y=part.center+(reduced?0:.7*Math.pow(1-age,3));
  });
  obj.userData.height=Math.max(.035,height);
  if(this.lastLabelValue!==this.simTarget||this.lastLabelCases!==this.simCases){
   this.labels.get('simulation').querySelector('.label-value').innerHTML=`${number.format(this.simCases)} <small>건</small>`;
   this.labels.get('simulation').querySelector('.label-length').textContent=`진피 ${number.format(this.simTarget)} m`;
   this.labels.get('simulation').setAttribute('aria-label',`내 체험 탑, 수술 ${number.format(this.simCases)}건, ${number.format(this.simTarget)}미터, 탑 보기`);this.lastLabelValue=this.simTarget;this.lastLabelCases=this.simCases;
  }
  this.renderedSimTarget=this.simTarget;return true;
 }
 loop(){
  requestAnimationFrame(()=>this.loop());const now=performance.now(),interval=now-(this.loopTime??now),dt=Math.min(.05,interval/1000);this.loopTime=now;if((!this.visible&&!this.flight.enabled)||sceneSuspended('explorer'))return;
  if(this.renderer.userData.profile.compact){const ratio=this.budget.sample(interval);if(ratio!==null)this.renderer.setPixelRatio(ratio);}
  const simulationChanged=this.renderSimulation();
  if(this.transition){const t=Math.min(1,(performance.now()-this.transition.start)/850),ease=1-Math.pow(1-t,3);this.camera.position.lerpVectors(this.transition.from,this.transition.to,ease);this.controls.target.lerpVectors(this.transition.oldTarget,this.transition.target,ease);if(t===1)this.transition=null;}
  if(this.flight.enabled){
   this.flight.step(dt);document.querySelector('#discover-light').hidden=this.atmosphere.unlocked||this.camera.position.distanceTo(this.atmosphere.beacon.position)>3.5;if(now-(this.hudTime??0)>100){document.querySelector('#flight-altitude').textContent=number.format(Math.round(this.camera.position.y/UNIT*10)/10);document.querySelector('#flight-altitude-fill').style.height=`${Math.min(100,this.camera.position.y/(8848.86*UNIT)*100)}%`;const degrees=((this.flight.yaw*180/Math.PI)%360+360)%360;document.querySelector('#flight-heading').textContent=['N','NW','W','SW','S','SE','E','NE'][Math.round(degrees/45)%8];this.hudTime=now;}
  }else{this.controls.autoRotate=this.auto&&!reduced&&!this.transition;this.controls.autoRotateSpeed=.45;this.controls.dampingFactor=orbitDamping(dt);this.controls.update(dt);}
  const shadowSignature=[...this.objects].map(([id,o])=>`${id}:${o.visible}:${o.userData.assetStatus}:${o.position.toArray()}:${o.scale.toArray()}`).join('|');
  if(simulationChanged||shadowSignature!==this.shadowSignature){this.renderer.shadowMap.needsUpdate=true;this.shadowSignature=shadowSignature;}
  this.atmosphere.update(this.camera,now,reduced);this.renderer.render(this.scene,this.camera);
  const placedLabels=[],width=this.viewWidth,height=this.viewHeight;
  const beacon=this.beaconPoint.copy(this.atmosphere.beacon.position).project(this.camera);
  this.beaconButton.hidden=this.flight.enabled||this.atmosphere.unlocked||Math.abs(beacon.x)>.98||Math.abs(beacon.y)>.94||Math.abs(beacon.z)>1;
  if(!this.beaconButton.hidden)this.beaconButton.style.transform=`translate(${(beacon.x*.5+.5)*width-24}px,${(-beacon.y*.5+.5)*height-24}px)`;
  const farMountain=this.objects.get('everest').visible&&this.camera.position.distanceTo(this.controls.target)>90;
  // Label sizes come from ResizeObserver. No interleaved DOM measurements/writes.
  for(const [id,obj]of this.objects){
   const label=this.labels.get(id),metrics=this.labelMetrics.get(id);
   if(!metrics||!obj.visible||(!this.flight.enabled&&!this.comparison&&farMountain&&id!=='everest'&&id!==this.selected)||(!this.flight.enabled&&!this.comparison&&width<600&&DOCTORS.some(d=>d.id===id)&&id!==this.selected)){label.style.visibility='hidden';this.labelLifts.delete(id);continue;}
   const point=this.labelPoint.copy(obj.position);point.y+=obj.userData.height+.42;point.project(this.camera);
   if(point.z>=1||point.z<=-1||Math.abs(point.x)>=1.15||Math.abs(point.y)>=1.1){label.style.visibility='hidden';this.labelLifts.delete(id);continue;}
   const halfLabel=metrics.width/2+8;
   const left=THREE.MathUtils.clamp((point.x*.5+.5)*width,halfLabel,width-halfLabel),anchor=(-point.y*.5+.5)*height;
   let top=anchor;
   if(!this.flight.enabled){
    top=placeLabelBottom(anchor,left,halfLabel,metrics.height,height,placedLabels);
    placedLabels.push({left:left-halfLabel,right:left+halfLabel,top:top-metrics.height,bottom:top});
   }
   const lift=easeLabelLift(this.labelLifts.get(id),anchor-top,reduced?1:dt);this.labelLifts.set(id,lift);
   top=anchor-lift;label.style.transform=`translate3d(${left}px,${top}px,0) translate(-50%,-100%)`;
   const leader=Math.max(0,lift,-lift-metrics.height);
   label.style.setProperty('--leader-length',`${leader}px`);label.style.setProperty('--leader-top',lift>=0?'100%':`${-leader}px`);label.style.visibility=this.flight.enabled&&top<195?'hidden':'visible';
  }
  this.frameSamples??=[];this.frameSamples.push({interval,cost:performance.now()-now});if(this.frameSamples.length>120)this.frameSamples.shift();
 }
}
