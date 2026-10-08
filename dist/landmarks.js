import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/loaders/DRACOLoader.js';
import {LANDMARKS} from './landmark-data.js';

const decoder=new DRACOLoader().setDecoderPath(new URL('./vendor/libs/draco/gltf/',import.meta.url).href).setWorkerLimit(1);
const loader=new GLTFLoader().setDRACOLoader(decoder),cache=new Map();
function load(id){
 if(!cache.has(id))cache.set(id,loader.loadAsync(new URL(`./assets/models/${LANDMARKS[id].model}`,import.meta.url).href).then(gltf=>{
  gltf.scene.traverse(node=>{
   if(!node.isMesh)return;
   node.castShadow=id!=='human';node.receiveShadow=id!=='human';
   for(const mat of Array.isArray(node.material)?node.material:[node.material]){
    // Preserve authored surfaces while avoiding mirror aliasing at phone resolution.
    mat.roughness=Math.max(mat.roughness??.35,.28);mat.envMapIntensity=.85;
    if(id==='eiffel'){mat.color.set(0x8d7968);mat.roughness=.48;mat.metalness=.65;}
    if(id==='human'){mat.metalness=0;mat.roughness=Math.max(mat.roughness,.65);mat.envMapIntensity=.4;if(!/hair|eyewear/i.test(mat.name)){mat.transparent=false;mat.alphaTest=.4;}}
   }
  });
  return gltf.scene;
 }));
 return cache.get(id);
}

export function hydrateLandmark(group,id){
 const height=LANDMARKS[id].height*.008;
 group.userData.height=height;group.userData.assetStatus='loading';
 load(id).then(template=>{
  const model=template.clone(true);model.scale.setScalar(height);
  // Detach only fallback children. Shared authored geometry and textures stay cached.
  for(const child of [...group.children]){
   child.traverse(node=>{node.geometry?.dispose();if(node.material)for(const mat of Array.isArray(node.material)?node.material:[node.material])mat.dispose();});
   group.remove(child);
  }
  group.add(model);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(template),size=box.getSize(new THREE.Vector3());
  group.userData.halfWidth=size.x*height/2;group.userData.halfDepth=size.z*height/2;
  group.userData.assetStatus='ready';
 }).catch(error=>{group.userData.assetStatus='fallback';console.warn(`Landmark ${id}: using fallback`,error.message);});
 return group;
}

export function extraLandmark(id){
 const h=LANDMARKS[id].height*.008,group=new THREE.Group();
 if(id==='human'){
  const material=new THREE.MeshStandardMaterial({color:0x537593,roughness:.8});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(h*.13,h*.58,4,8),material);
  body.position.y=h*.42;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(h*.09,12,8),material);head.position.y=h*.91;group.add(head);
  group.userData={height:h,halfWidth:h*.2,halfDepth:h*.12,assetStatus:'idle',load:()=>{if(group.userData.assetStatus==='idle')hydrateLandmark(group,id);}};
  return group;
 }
 const material=new THREE.MeshStandardMaterial({color:id==='eiffel'?0x8d7968:0xa1b5c4,roughness:.5,metalness:.4});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(id==='eiffel'?.02:.15,id==='eiffel'?.45:.22,h,12),material);
 body.position.y=h/2;body.castShadow=true;group.add(body);
 return hydrateLandmark(group,id);
}
