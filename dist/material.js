import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/loaders/DRACOLoader.js';
import {admGeometry} from './adm-geometry.js';

// Keep a procedural fallback so a failed model request never blanks the interface.
export const MODEL_WIDTH=5/6;
export const MODEL_DEPTH=.05; // 3 mm / 60 mm, including the rounded lip.
let specimen,detailSpecimen,fallbackGeometry,materials,lightGeometry;
try{
 const draco=new DRACOLoader().setDecoderPath(new URL('./vendor/libs/draco/gltf/',import.meta.url).href).setWorkerLimit(2);
 const gltf=await new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('./assets/models/adm-sheet.glb',import.meta.url).href);
 draco.dispose();
 specimen=gltf.scene.getObjectByName('ADM_Motion');detailSpecimen=gltf.scene.getObjectByName('ADM_Detail');
 if(!specimen||!detailSpecimen)throw new Error('Missing ADM detail or motion model');
 gltf.scene.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;const values=Array.isArray(obj.material)?obj.material:[obj.material];values.forEach(material=>{if(material.map)material.map.anisotropy=8;});}});
 document.documentElement.dataset.admModel='blender';
}catch(error){
 console.warn('ADM model unavailable; using the local procedural mesh.',error.message);
 document.documentElement.dataset.admModel='fallback';
}
function photoMaterials(){
 if(!materials){
  const texture=new THREE.TextureLoader().load(new URL('./assets/adm-front.png',import.meta.url).href);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  materials=[new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.003,color:0xfff9ed,roughness:.88}),new THREE.MeshStandardMaterial({color:0xe9dec7,roughness:.92})];
 }
 return materials;
}
export function createSheet(detailed=false){
 if(specimen){const sheet=new THREE.Group();sheet.add((detailed?detailSpecimen:specimen).clone(true));return sheet;}
 photoMaterials();fallbackGeometry??=admGeometry(MODEL_WIDTH,1,MODEL_DEPTH,'motion');
 const sheet=new THREE.Mesh(fallbackGeometry,materials);sheet.castShadow=true;sheet.receiveShadow=true;return sheet;
}
export function createLightSheet(){
 lightGeometry??=admGeometry(MODEL_WIDTH,1,MODEL_DEPTH,'light');
 const mesh=new THREE.Mesh(lightGeometry,photoMaterials());mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function createWorldSheet(){
 const lod=new THREE.LOD();lod.addLevel(createSheet(),0);lod.addLevel(createLightSheet(),2.5);return lod;
}
