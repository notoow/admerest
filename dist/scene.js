import * as THREE from 'three';
import {createSheet,MODEL_WIDTH,MODEL_DEPTH} from './material.js';
import {hydrateLandmark} from './landmarks.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const UNIT=.008;
export {RANKED_DOCTORS as DOCTORS} from './records.js';
export {LANDMARKS} from './landmark-data.js';

export function rendererFor(host){
 const r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;host.append(r.domElement);r.domElement.tabIndex=0;return r;
}
export function lighting(scene,renderer){
 if(renderer){const studio=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer);scene.userData.environmentTarget=generator.fromScene(studio,.04);scene.environment=scene.userData.environmentTarget.texture;studio.dispose();generator.dispose();}
 scene.add(new THREE.HemisphereLight(0xe8f2ff,0xd4cfc5,1.8));
 const key=new THREE.DirectionalLight(0xfff8eb,2.1);key.position.set(-8,20,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-20,right:20,top:25,bottom:-20,near:1,far:70});key.shadow.bias=-.0005;key.shadow.normalBias=.025;scene.add(key);
 const fill=new THREE.DirectionalLight(0xe1ecff,1.1);fill.position.set(14,8,-10);scene.add(fill);
}
function addBox(group,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}

export function tower(height){
 const group=new THREE.Group(),h=Math.max(height*UNIT,.035),w=.92,d=.40;
 const panels=Math.max(1,Math.ceil(h/(w/MODEL_WIDTH)));
 for(let i=0;i<panels;i++){const panel=createSheet();panel.scale.set(w/MODEL_WIDTH,h/panels,.13/MODEL_DEPTH);panel.position.y=(i+.5)*h/panels;group.add(panel);}
 const base=addBox(group,1.14,.045,.72,0,.025,0,new THREE.MeshStandardMaterial({color:0xdfe7f3,roughness:.65}));group.userData={height:h,base};return group;
}
function lotteFallback(){
 const group=new THREE.Group(),h=555*UNIT;const points=[new THREE.Vector2(.42,0),new THREE.Vector2(.42,h*.1),new THREE.Vector2(.34,h*.55),new THREE.Vector2(.24,h*.9),new THREE.Vector2(.075,h)];
 const body=new THREE.Mesh(new THREE.LatheGeometry(points,28),new THREE.MeshStandardMaterial({color:0xa7b8c9,metalness:.55,roughness:.3}));body.castShadow=true;group.add(body);
 const pointsArray=[];for(let i=1;i<80;i++){const y=h*i/80,r=.43-.355*Math.pow(i/80,1.3);for(let j=0;j<24;j++){const a=j/24*Math.PI*2,b=(j+1)/24*Math.PI*2;pointsArray.push(Math.cos(a)*r,y,Math.sin(a)*r,Math.cos(b)*r,y,Math.sin(b)*r);}}
 for(let j=0;j<16;j++){const a=j/16*Math.PI*2;for(let i=0;i<20;i++){const y=h*i/20,y2=h*(i+1)/20,r=.43-.355*Math.pow(i/20,1.3),r2=.43-.355*Math.pow((i+1)/20,1.3);pointsArray.push(Math.cos(a)*r,y,Math.sin(a)*r,Math.cos(a)*r2,y2,Math.sin(a)*r2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pointsArray,3));group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xf0f7ff,transparent:true,opacity:.5})));group.userData.height=h;return group;
}
function burjFallback(){
 const group=new THREE.Group(),h=828*UNIT,mat=new THREE.MeshStandardMaterial({color:0xb3beca,metalness:.7,roughness:.34}),lineMat=new THREE.LineBasicMaterial({color:0xe2e8ef,transparent:true,opacity:.6});
 for(let tier=0;tier<8;tier++){const y=tier*h*.096,th=h*(.10),radius=.49*(1-tier*.105);for(let wing=0;wing<3;wing++){const a=wing*2*Math.PI/3+.3;const geom=new THREE.CylinderGeometry(radius*.62,radius*.69,th,10);const mesh=new THREE.Mesh(geom,mat);mesh.position.set(Math.sin(a)*radius*.45,y+th/2,Math.cos(a)*radius*.45);mesh.castShadow=true;group.add(mesh);for(let f=0;f<5;f++){const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:12},(_,k)=>new THREE.Vector3(Math.sin(k/12*Math.PI*2)*radius*.70,0,Math.cos(k/12*Math.PI*2)*radius*.70))),lineMat);ring.position.copy(mesh.position);ring.position.y=y+f*th/5;group.add(ring);}}}
 const top=new THREE.Mesh(new THREE.CylinderGeometry(.025,.15,h*.12,12),mat);top.position.y=h*.83;group.add(top);const spire=new THREE.Mesh(new THREE.CylinderGeometry(.006,.025,h*.13,8),mat);spire.position.y=h*.935;group.add(spire);group.userData.height=h;return group;
}
export function lotte(){return hydrateLandmark(lotteFallback(),'lotte');}
export function burj(){return hydrateLandmark(burjFallback(),'burj');}
export function everest(){
 const group=new THREE.Group(),height=8848.86*UNIT,size=118,n=140,g=new THREE.PlaneGeometry(size,size,n,n);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),peak=(px,pz,r,h)=>h*Math.pow(Math.max(0,1-(Math.abs(x-px)*.73+Math.abs(z-pz)*.95)/r),1.18);
  const base=Math.max(peak(0,0,48,1),peak(-24,11,28,.43),peak(23,-16,33,.51));
  const fold=.04*Math.sin(x*.30+z*.16)+.022*Math.sin(z*.64-x*.28)+.008*Math.sin(x*1.7+z*.9);
  p.setY(i,height*base*(1+fold));
 }
 let max=0;for(let i=0;i<p.count;i++)max=Math.max(max,p.getY(i));for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)*height/max);
 g.computeVertexNormals();const normal=g.attributes.normal,rock=new THREE.Color(0x54657b),snow=new THREE.Color(0xe9f2f7);
 for(let i=0;i<p.count;i++){
  const altitude=p.getY(i)/height,x=p.getX(i),z=p.getZ(i),vein=Math.sin(x*1.2+z*.7)*Math.cos(z*1.7-x*.5);
  const cover=THREE.MathUtils.clamp((altitude-.25)*1.5+(normal.getY(i)-.5)*1.2+vein*.12,0,.93);
  const c=rock.clone().lerp(snow,cover).multiplyScalar(.78+vein*.05);colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));m.receiveShadow=true;group.add(m);group.userData.height=height;return group;
}
