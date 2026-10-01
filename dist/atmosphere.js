import * as THREE from 'three';

export function createAtmosphere(scene){
 const sky=new THREE.Mesh(new THREE.SphereGeometry(470,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
 varying vec3 vDirection;
 void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);vec3 color=mix(vec3(.85,.93,.98),vec3(.23,.53,.83),pow(h,.65));float sun=pow(max(dot(d,normalize(vec3(-.45,.45,-.8))),0.0),220.0);color+=vec3(.17,.16,.12)*sun;gl_FragColor=vec4(color,1.0);}` }));
 sky.renderOrder=-10;scene.add(sky);scene.fog=new THREE.FogExp2(0xc5dbee,.0038);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(220,100),new THREE.MeshStandardMaterial({color:0xe4edf5,roughness:.58,metalness:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=0;ground.receiveShadow=true;scene.add(ground);
 const terrain=new THREE.RingGeometry(100,225,100,12);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);p.setY(i,Math.max(0,(r-100)/125)*(9+8*Math.sin(x*.033)*Math.cos(z*.046)+5*Math.sin(z*.11+x*.028)));}terrain.computeVertexNormals();
 const terrainMesh=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({color:0xb9cee0,roughness:1,flatShading:true}));scene.add(terrainMesh);terrainMesh.updateMatrixWorld();
 const groundRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 const rings=new THREE.Group();[11,22,45,80].forEach(r=>{const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.035,120),new THREE.MeshBasicMaterial({color:0x6d99c9,transparent:true,opacity:.3,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.0003;rings.add(ring);});scene.add(rings);
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=cloudCanvas.height=128;const ctx=cloudCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.4,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(cloudCanvas),clouds=new THREE.Group();
 for(let i=0;i<32;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xf4f9ff,transparent:true,opacity:.32,depthWrite:false}));const angle=i*2.39996;const r=35+(i%6)*13;sprite.position.set(Math.sin(angle)*r,16+(i%5)*12,Math.cos(angle)*r-35);sprite.scale.set(24+i%4*8,10+i%3*5,1);clouds.add(sprite);}scene.add(clouds);
 return {groundHeight(x,z){if(Math.hypot(x,z)<99)return 0;groundRay.ray.origin.set(x,130,z);return Math.max(0,groundRay.intersectObject(terrainMesh,false)[0]?.point.y??0);},update(camera,time,reduced){sky.position.copy(camera.position);if(!reduced)clouds.rotation.y=Math.sin(time*.000025)*.025;}};
}
