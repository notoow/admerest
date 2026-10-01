import * as THREE from 'three';
import {deviceProfile} from './render-budget.js';

export function createAtmosphere(scene){
 const profile=deviceProfile();let unlocked=false,warmth=0;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(470,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{warmth:{value:0}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
 uniform float warmth;
 varying vec3 vDirection;
 void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);vec3 low=mix(vec3(.9,.94,.98),vec3(1.,.73,.48),warmth);vec3 high=mix(vec3(.31,.56,.80),vec3(.35,.4,.67),warmth);vec3 color=mix(low,high,pow(h,.65));float sun=pow(max(dot(d,normalize(vec3(-.45,.45,-.8))),0.0),220.0);color+=vec3(.17,.16,.12)*sun;gl_FragColor=vec4(color,1.0);}` }));
 sky.renderOrder=-10;scene.add(sky);scene.fog=new THREE.FogExp2(0xc5dbee,.0038);
 const paving=document.createElement('canvas');paving.width=paving.height=128;const pc=paving.getContext('2d');pc.fillStyle='#e4ebf2';pc.fillRect(0,0,128,128);pc.strokeStyle='#d0dce7';pc.lineWidth=1;pc.strokeRect(.5,.5,127,127);pc.fillStyle='#d8e3eb';pc.fillRect(2,2,2,2);
 const pavement=new THREE.CanvasTexture(paving);pavement.wrapS=pavement.wrapT=THREE.RepeatWrapping;pavement.repeat.set(160,160);pavement.colorSpace=THREE.SRGBColorSpace;
 const ground=new THREE.Mesh(new THREE.CircleGeometry(220,80),new THREE.MeshStandardMaterial({map:pavement,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const terrain=new THREE.RingGeometry(100,225,100,12);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);p.setY(i,Math.max(0,(r-100)/125)*(9+8*Math.sin(x*.033)*Math.cos(z*.046)+5*Math.sin(z*.11+x*.028)));}terrain.computeVertexNormals();
 const terrainMesh=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({color:0xb9cee0,roughness:1,flatShading:true}));scene.add(terrainMesh);terrainMesh.updateMatrixWorld();
 const groundRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 // A distant architectural horizon: 120 buildings in one draw call, with no shadows.
 const city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x8fa9c1,roughness:.85}),120),dummy=new THREE.Object3D();
 for(let i=0;i<120;i++){const a=(i/120)*Math.PI*2,r=30+(i%5)*4,h=.25+(Math.sin(i*7.73)*.5+.5)*2;dummy.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);dummy.scale.set(.3+(i%3)*.14,h,.35);dummy.rotation.y=a;dummy.updateMatrix();city.setMatrixAt(i,dummy.matrix);}scene.add(city);
 const trees=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x789b9d,roughness:1,flatShading:true}),48);
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;dummy.position.set(Math.cos(a)*19,.28,Math.sin(a)*19);dummy.scale.set(.15,.4,.15);dummy.rotation.y=a;dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);}scene.add(trees);
 const beacon=new THREE.Group();beacon.position.set(10.8,.65,3);const orb=new THREE.Mesh(new THREE.SphereGeometry(.22,20,14),new THREE.MeshStandardMaterial({color:0xed623f,roughness:.26,metalness:.1,emissive:0xae3515,emissiveIntensity:.25}));beacon.add(orb);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.37,.008,6,40),new THREE.MeshBasicMaterial({color:0xe9a967}));halo.rotation.x=Math.PI/2;halo.position.y=-.32;beacon.add(halo);scene.add(beacon);
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=cloudCanvas.height=128;const ctx=cloudCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.4,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(cloudCanvas),clouds=new THREE.Group();
 for(let i=0;i<profile.clouds;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xf4f9ff,transparent:true,opacity:.26,depthWrite:false}));const angle=i*2.39996;const r=35+(i%6)*13;sprite.position.set(Math.sin(angle)*r,16+(i%5)*12,Math.cos(angle)*r-35);sprite.scale.set(24+i%4*8,10+i%3*5,1);clouds.add(sprite);}scene.add(clouds);
 return {beacon,unlock(){unlocked=true;},get unlocked(){return unlocked;},groundHeight(x,z){if(Math.hypot(x,z)<99)return 0;groundRay.ray.origin.set(x,130,z);return Math.max(0,groundRay.intersectObject(terrainMesh,false)[0]?.point.y??0);},update(camera,time,reduced){sky.position.copy(camera.position);if(!reduced){clouds.rotation.y=Math.sin(time*.000025)*.025;orb.position.y=Math.sin(time*.0014)*.06;}warmth+=(Number(unlocked)-warmth)*(reduced?1:.025);sky.material.uniforms.warmth.value=warmth;}};
}
