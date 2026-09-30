import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {towerMaterial,createSheet} from './material.js';

const UNIT=.008;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
export const DOCTORS=[{id:'kim',name:'김하늘',initials:'KH',country:'KR',countryName:'대한민국',length:1240,rank:1},{id:'alex',name:'Alex Kim',initials:'AK',country:'US',countryName:'미국',length:980,rank:2},{id:'haruto',name:'Haruto Sato',initials:'HS',country:'JP',countryName:'일본',length:760,rank:3}];
export const LANDMARKS={lotte:{name:'롯데월드타워',height:555},burj:{name:'부르즈 칼리파',height:828},everest:{name:'에베레스트',height:8848.86}};

export function rendererFor(host){
 const r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;host.append(r.domElement);r.domElement.tabIndex=0;return r;
}
export function lighting(scene){
 scene.add(new THREE.HemisphereLight(0xe8f2ff,0xd4cfc5,1.8));
 const key=new THREE.DirectionalLight(0xfff8eb,2.1);key.position.set(-8,20,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-20,right:20,top:25,bottom:-20,near:1,far:70});key.shadow.bias=-.0005;key.shadow.normalBias=.025;scene.add(key);
 const fill=new THREE.DirectionalLight(0xe1ecff,1.1);fill.position.set(14,8,-10);scene.add(fill);
}
function addBox(group,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}

function tower(height){
 const group=new THREE.Group(),h=Math.max(height*UNIT,.035),w=.92,d=.40;
 const panels=Math.max(1,Math.ceil(h/(w/.70)));
 for(let i=0;i<panels;i++){const panel=createSheet();panel.scale.set(w/.70,h/panels,.13/.024);panel.position.y=(i+.5)*h/panels;group.add(panel);}
 const base=addBox(group,1.14,.045,.72,0,.025,0,new THREE.MeshStandardMaterial({color:0xdfe7f3,roughness:.65}));group.userData={height:h,base};return group;
}
function lotte(){
 const group=new THREE.Group(),h=555*UNIT;const points=[new THREE.Vector2(.42,0),new THREE.Vector2(.42,h*.1),new THREE.Vector2(.34,h*.55),new THREE.Vector2(.24,h*.9),new THREE.Vector2(.075,h)];
 const body=new THREE.Mesh(new THREE.LatheGeometry(points,28),new THREE.MeshStandardMaterial({color:0xa7b8c9,metalness:.55,roughness:.3}));body.castShadow=true;group.add(body);
 const pointsArray=[];for(let i=1;i<80;i++){const y=h*i/80,r=.43-.355*Math.pow(i/80,1.3);for(let j=0;j<24;j++){const a=j/24*Math.PI*2,b=(j+1)/24*Math.PI*2;pointsArray.push(Math.cos(a)*r,y,Math.sin(a)*r,Math.cos(b)*r,y,Math.sin(b)*r);}}
 for(let j=0;j<16;j++){const a=j/16*Math.PI*2;for(let i=0;i<20;i++){const y=h*i/20,y2=h*(i+1)/20,r=.43-.355*Math.pow(i/20,1.3),r2=.43-.355*Math.pow((i+1)/20,1.3);pointsArray.push(Math.cos(a)*r,y,Math.sin(a)*r,Math.cos(a)*r2,y2,Math.sin(a)*r2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pointsArray,3));group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xf0f7ff,transparent:true,opacity:.5})));group.userData.height=h;return group;
}
function burj(){
 const group=new THREE.Group(),h=828*UNIT,mat=new THREE.MeshStandardMaterial({color:0xb3beca,metalness:.7,roughness:.34}),lineMat=new THREE.LineBasicMaterial({color:0xe2e8ef,transparent:true,opacity:.6});
 for(let tier=0;tier<8;tier++){const y=tier*h*.096,th=h*(.10),radius=.49*(1-tier*.105);for(let wing=0;wing<3;wing++){const a=wing*2*Math.PI/3+.3;const geom=new THREE.CylinderGeometry(radius*.62,radius*.69,th,10);const mesh=new THREE.Mesh(geom,mat);mesh.position.set(Math.sin(a)*radius*.45,y+th/2,Math.cos(a)*radius*.45);mesh.castShadow=true;group.add(mesh);for(let f=0;f<5;f++){const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:12},(_,k)=>new THREE.Vector3(Math.sin(k/12*Math.PI*2)*radius*.70,0,Math.cos(k/12*Math.PI*2)*radius*.70))),lineMat);ring.position.copy(mesh.position);ring.position.y=y+f*th/5;group.add(ring);}}}
 const top=new THREE.Mesh(new THREE.CylinderGeometry(.025,.15,h*.12,12),mat);top.position.y=h*.83;group.add(top);const spire=new THREE.Mesh(new THREE.CylinderGeometry(.006,.025,h*.13,8),mat);spire.position.y=h*.935;group.add(spire);group.userData.height=h;return group;
}
function everest(){
 const group=new THREE.Group(),height=8848.86*UNIT,size=95,n=65,g=new THREE.PlaneGeometry(size,size,n,n);g.rotateX(-Math.PI/2);const p=g.attributes.position;const colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const peak=(px,pz,r,h)=>h*Math.pow(Math.max(0,1-Math.hypot((x-px)*.9,(z-pz)*1.18)/r),1.35);const base=Math.max(peak(0,0,45,1),peak(-16,7,28,.53),peak(19,-11,31,.62));const ridge=1+.12*Math.sin(x*.49+z*.24)+.07*Math.cos(z*.73-x*.26)+.035*Math.sin(x*1.3+z*1.1);const y=height*base*ridge;p.setY(i,y);const c=new THREE.Color().setRGB(.36+y/height*.62,.43+y/height*.55,.52+y/height*.46);colors.push(c.r,c.g,c.b);}
 let max=0;for(let i=0;i<p.count;i++)max=Math.max(max,p.getY(i));for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)*height/max);
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));m.receiveShadow=true;group.add(m);group.userData.height=height;return group;
}

export class Explorer{
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.selected='kim';this.auto=false;this.objects=new Map();this.labels=new Map();this.renderer=rendererFor(host);this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.05,1000);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minPolarAngle=.25;this.controls.maxPolarAngle=Math.PI/2-.035;this.controls.minDistance=4;this.controls.maxDistance=400;this.controls.enableZoom=false;this.controls.enablePan=true;this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.controls.enableZoom=true;this.renderer.domElement.style.touchAction='none';this.renderer.domElement.setAttribute('aria-label','탑 탐색: 드래그하여 회전, 휠 또는 두 손가락으로 확대, 더하기·빼기 키로 확대·축소');
  lighting(this.scene);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShadowMaterial({opacity:.10}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.01;this.scene.add(floor);
  this.groundGrid=new THREE.GridHelper(80,80,0xc8d7eb,0xe0e9f5);this.groundGrid.material.transparent=true;this.groundGrid.material.opacity=.25;this.groundGrid.position.y=-.015;this.scene.add(this.groundGrid);
  DOCTORS.forEach((d,i)=>this.addObject(d.id,tower(d.length),[i*2.25-5.1,0,0],d.name,d.length,d.country));
  this.addObject('burj',burj(),[2,0,0],LANDMARKS.burj.name,828);this.addObject('lotte',lotte(),[4.2,0,0],LANDMARKS.lotte.name,555);
  const mountain=everest();this.addObject('everest',mountain,[28,0,-18],LANDMARKS.everest.name,8848.86);mountain.visible=false;
  this.addObject('simulation',tower(140),[-7.5,0,0],'내 체험 탑',140);this.objects.get('simulation').visible=false;
  this.raycaster=new THREE.Raycaster();let down;
  this.renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];this.transition=null;});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=host.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);const hit=this.raycaster.intersectObjects([...this.objects.values()].filter(o=>o.visible),true)[0];if(hit){let obj=hit.object;while(obj.parent!==this.scene&&obj.parent)obj=obj.parent;if(DOCTORS.some(d=>d.id===obj.userData.id))this.onSelect(obj.userData.id);}});
  this.renderer.domElement.addEventListener('keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.overview();else this.zoom(e.key==='-'?1.15:.87);}});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.overview(true);this.markSelected();this.running=true;this.visible=true;new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;},{rootMargin:'150px'}).observe(host);this.loop();host.querySelector('.scene-loading')?.remove();
 }
 addObject(id,obj,position,name,value,country){obj.position.set(...position);obj.userData.id=id;this.scene.add(obj);this.objects.set(id,obj);const label=document.createElement('button');label.className='scene-label';label.dataset.object=id;label.setAttribute('aria-label',`${name}, ${value}미터, 탑 보기`);label.innerHTML=`<span class="label-name">${name}${country?`<img class="flag" src="/assets/${country}.svg" alt="${country}">`:''}</span><div class="label-value">${value.toLocaleString('en-US')} <small>m</small></div>`;label.addEventListener('click',()=>{if(DOCTORS.some(d=>d.id===id))this.onSelect(id);else this.focus(id);});this.host.append(label);this.labels.set(id,label);}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(!this.hasResized){this.hasResized=true;}else if(!this.transition)this.overview(true);}
 zoom(factor){this.transition=null;this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();}
 animateCamera(position,target,instant=false){if(instant||reduced){this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();}else this.transition={start:performance.now(),duration:1000,from:this.camera.position.clone(),to:position.clone(),oldTarget:this.controls.target.clone(),target:target.clone()};}
 overview(instant=false){
  const box=new THREE.Box3();for(const o of this.objects.values())if(o.visible)box.expandByObject(o);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const angle=THREE.MathUtils.degToRad(this.camera.fov/2);const distance=Math.max(size.y/(2*Math.tan(angle)),size.x/(2*Math.tan(angle)*this.camera.aspect))*1.32+size.z*.5;const dir=new THREE.Vector3(this.host.clientWidth<600?.12:.22,.12,1).normalize();this.animateCamera(center.clone().add(dir.multiplyScalar(distance)),center,instant);
 }
 focus(id){const object=this.objects.get(id);if(!object?.visible)return;this.selected=id;this.markSelected();const h=id==='simulation'&&this.simTarget!==undefined?Math.max(.035,this.simTarget*UNIT):object.userData.height,center=object.position.clone().add(new THREE.Vector3(0,h*.48,0));const distance=Math.max(h*2.25,8);this.animateCamera(center.clone().add(new THREE.Vector3(distance*.3,distance*.12,distance)),center);}
 markSelected(){for(const [id,o]of this.objects){const b=o.userData.base;if(b)b.material.color.set(id===this.selected?0x3975ff:0xdfe7f3);this.labels.get(id)?.classList.toggle('selected',id===this.selected);}}
 toggleLandmark(id,on){const obj=this.objects.get(id);if(!obj)return;obj.visible=on;this.overview();}
 showSimulation(){this.objects.get('simulation').visible=true;this.focus('simulation');}
 updateSimulation(meters){this.simTarget=Math.max(0,meters);}
 renderSimulation(){if(this.simTarget===undefined)return;const obj=this.objects.get('simulation'),h=Math.max(.035,this.simTarget*UNIT),old=obj.userData.height,desired=reduced?h:THREE.MathUtils.lerp(old,h,.1);if(Math.abs(old-desired)>.00001){const count=Math.max(1,Math.ceil(desired/(.92/.70)));const panels=obj.children.filter(c=>c!==obj.userData.base);while(panels.length<count){const p=createSheet();obj.add(p);panels.push(p);}panels.forEach((p,i)=>{p.visible=i<count&&this.simTarget>0;if(p.visible){p.scale.set(.92/.70,desired/count,.13/.024);p.position.y=(i+.5)*desired/count;}});obj.userData.height=desired;}this.labels.get('simulation').querySelector('.label-value').innerHTML=`${this.simTarget.toLocaleString('en-US',{maximumFractionDigits:2})} <small>m</small>`;this.labels.get('simulation').setAttribute('aria-label',`내 체험 탑, ${this.simTarget.toFixed(2)}미터, 탑 보기`);}
 loop(){if(!this.running)return;requestAnimationFrame(()=>this.loop());if(!this.visible||document.hidden)return;
  if(this.transition){const t=Math.min(1,(performance.now()-this.transition.start)/this.transition.duration),ease=1-Math.pow(1-t,3);this.camera.position.lerpVectors(this.transition.from,this.transition.to,ease);this.controls.target.lerpVectors(this.transition.oldTarget,this.transition.target,ease);if(t===1)this.transition=null;}
  this.controls.autoRotate=this.auto&&!reduced&&!this.transition;this.controls.autoRotateSpeed=.45;this.controls.update();this.renderSimulation();this.renderer.render(this.scene,this.camera);
  for(const [id,obj]of this.objects){const l=this.labels.get(id),mountainOverview=this.objects.get('everest').visible&&this.camera.position.distanceTo(this.controls.target)>90;if(!obj.visible||(mountainOverview&&id!=='everest'&&id!==this.selected)||(this.host.clientWidth<600&&DOCTORS.some(d=>d.id===id)&&id!==this.selected)){l.style.display='none';continue;}const point=obj.position.clone().add(new THREE.Vector3(0,obj.userData.height+.42,0)).project(this.camera);const visible=point.z<1&&point.z>-1&&Math.abs(point.x)<1.2&&Math.abs(point.y)<1.1;l.style.display=visible?'block':'none';l.style.left=`${(point.x*.5+.5)*this.host.clientWidth}px`;l.style.top=`${(-point.y*.5+.5)*this.host.clientHeight}px`;}
 }
}

export class MaterialPreview{
 constructor(host){this.host=host;this.renderer=rendererFor(host);this.scene=new THREE.Scene();lighting(this.scene);this.camera=new THREE.PerspectiveCamera(34,1,.1,100);this.camera.position.set(2.4,2.8,4.4);this.camera.lookAt(0,.45,0);this.sheet=createSheet();this.sheet.scale.setScalar(2.5);this.sheet.rotation.set(-.75,-.2,.25);this.sheet.position.y=.4;this.scene.add(this.sheet);const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.09}));ground.rotation.x=-Math.PI/2;ground.position.y=-1;ground.receiveShadow=true;this.scene.add(ground);this.enabled=true;new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.draw();}
 resize(){this.renderer.setSize(this.host.clientWidth,this.host.clientHeight);this.camera.aspect=this.host.clientWidth/this.host.clientHeight;this.camera.updateProjectionMatrix();}
 draw(){if(!this.enabled)return;requestAnimationFrame(()=>this.draw());this.sheet.rotation.y=reduced?-.2:-.2+Math.sin(performance.now()*.00025)*.12;this.renderer.render(this.scene,this.camera);}
 stop(){this.enabled=false;this.renderer.dispose();this.renderer.domElement.remove();}
}
