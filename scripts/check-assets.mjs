import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {LANDMARKS} from '../dist/landmark-data.js';
const root=new URL('../dist/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
for(const file of ['index.html','app.js','scene.js','landmarks.js','landmark-data.js','explorer.js','measurements.js','flight.js','flight-motion.js','journey.js','atmosphere.js','experience.css','physics.js','material.js']){
 const text=read(file);
 assert(!/(?:["'`])\/(?:assets|vendor|app\.js|styles\.css)/.test(text),`${file}: root-relative URL breaks GitHub project Pages`);
}
for(const asset of ['assets/alpine-panorama.png','assets/adm-front.png','assets/highst-logo.png','assets/KR.svg','assets/US.svg','assets/JP.svg','vendor/three.module.js','vendor/three.core.js','vendor/rapier.mjs','vendor/loaders/GLTFLoader.js','vendor/utils/BufferGeometryUtils.js','vendor/utils/SkeletonUtils.js'])assert(existsSync(new URL(asset,root)),`Missing ${asset}`);
const glb=readFileSync(new URL('assets/models/adm-sheet.glb',root));
assert.equal(glb.readUInt32LE(0),0x46546c67,'GLB magic');
assert.equal(glb.readUInt32LE(4),2,'glTF version');
assert.equal(glb.readUInt32LE(8),glb.length,'GLB length');
const model=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
assert(model.meshes?.length>0,'Model must contain a mesh');
assert(model.images?.every(image=>image.bufferView!==undefined),'Photo must be embedded in GLB');
assert(model.materials?.length>=2,'Photo surface and cut edge materials must exist');
assert(model.extensionsRequired?.includes('KHR_draco_mesh_compression'),'Mesh compression must be preserved');
for(const file of ['vendor/loaders/DRACOLoader.js','vendor/libs/draco/gltf/draco_wasm_wrapper.js','vendor/libs/draco/gltf/draco_decoder.wasm'])assert(existsSync(new URL(file,root)),`Missing bundled decoder ${file}`);
assert(model.nodes.some(n=>n.name==='ADM_Detail'),'Detailed inspection mesh');
assert(model.nodes.some(n=>n.name==='ADM_Motion'),'Motion mesh');
const report=JSON.parse(readFileSync(new URL('../models/model-validation.json',import.meta.url)));
assert.deepEqual(report.reference_size_cm,[5,6]);assert.equal(report.thickness_mm,3);
for(const name of ['detail','motion']){
 assert.equal(report[name].nonmanifold_edges,0,`${name}: closed manifold`);
 assert.equal(report[name].open_apertures,95,`${name}: all photographed openings pass a ray`);
 assert.equal(report[name].euler,-188,`${name}: topology of 95 through holes`);
 assert(report[name].solid_margin_hit,`${name}: material remains solid around openings`);
 assert(Math.abs(report[name].measured_solid_thickness_mm-3)<.02,`${name}: confirmed 3 mm material thickness`);
}
for(const name of ['exported_detail','exported_motion']){
 assert.equal(report[name].open_apertures,95,`${name}: compressed GLB retains every opening`);
 assert(Math.abs(report[name].measured_solid_thickness_mm-3)<.02,`${name}: exported thickness`);
}
console.log(`GitHub Pages paths valid; Blender GLB ${(glb.length/1024).toFixed(0)} KiB, ${model.meshes.length} mesh.`);
const credits=JSON.parse(read('assets/models/credits.json'));
let landmarkBytes=0;
for(const [id,landmark]of Object.entries(LANDMARKS)){
 if(!landmark.model)continue;
 const bytes=readFileSync(new URL(`assets/models/${landmark.model}`,root));landmarkBytes+=bytes.length;
 assert.equal(bytes.readUInt32LE(0),0x46546c67,`${id}: GLB magic`);
 assert.equal(bytes.readUInt32LE(8),bytes.length,`${id}: complete GLB`);
 const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert(asset.meshes?.length>0,`${id}: authored geometry`);
 assert(asset.extensionsRequired.includes('KHR_draco_mesh_compression'),`${id}: compressed geometry`);
 assert(asset.buffers.every(b=>!b.uri)&&(!asset.images||asset.images.every(i=>i.bufferView!==undefined)),`${id}: self-contained asset`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),credits[id].output_sha256,`${id}: matches validated export`);
 assert.equal(credits[id].license,'CC BY 4.0');
 assert(Math.abs(credits[id].bounds_y_up.min[1])<.0001&&Math.abs(credits[id].bounds_y_up.max[1]-1)<.0001,`${id}: normalized and grounded after Draco roundtrip`);
 const doc=read('index.html');
 assert(doc.includes(`data-landmark="${id}"`)&&doc.includes(`<option value="${id}">`),`${id}: visibility and comparison controls`);
 assert(doc.includes(credits[id].source.split('/').at(-1)),`${id}: public attribution`);
}
assert(landmarkBytes<2_000_000,'Four landmark assets under 2 MB');
assert(existsSync(new URL('vendor/RoomEnvironment.js',root)),'Bundled reflection environment');
console.log(`4 licensed, grounded landmark GLBs: ${(landmarkBytes/1024).toFixed(0)} KiB total.`);
