import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

test('opening or resizing the input panel preserves the focused tower, while overview stays overview',()=>{
 const source=readFileSync(new URL('../dist/explorer.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export class Explorer','class Explorer');
 const context=vm.createContext({THREE,WORLD_UNIT:.008,MODEL_WIDTH:5/6,matchMedia:()=>({matches:false})});
 vm.runInContext(source+'\nthis.Explorer=Explorer;',context);
 const view=Object.create(context.Explorer.prototype);
 const specimen=(x,height)=>{const o=new THREE.Group();o.add(new THREE.Mesh(new THREE.BoxGeometry(1,height,1)));o.position.set(x,height/2,0);o.userData.height=height;return o;};
 Object.assign(view,{host:{clientWidth:335,clientHeight:330,dataset:{view:'focus'}},renderer:{setSize(){}},camera:new THREE.PerspectiveCamera(34),controls:{target:new THREE.Vector3(),update(){}},flight:{enabled:false},objects:new Map([['simulation',specimen(-7.5,.96)],['kim',specimen(2,10)]]),labels:new Map(),selected:'simulation',simFinalTarget:120,simTarget:120,simWidth:.92});
 view.resize();assert.equal(view.controls.target.x,-7.5);assert.equal(view.transition,null);
 view.host.clientWidth=650;view.resize();assert.equal(view.controls.target.x,-7.5);
 view.overview(true);const overview=view.controls.target.x;assert.notEqual(overview,-7.5);
 view.host.clientHeight=400;view.resize();assert.equal(view.controls.target.x,overview);assert.equal(view.host.dataset.view,'all');
 const position=view.camera.position.clone(),target=view.controls.target.clone();
 view.host.clientHeight=700;view.resize(false);
 assert(view.camera.position.equals(position),'return from flight preserves the saved camera');assert(view.controls.target.equals(target));assert.equal(view.camera.aspect,650/700);
});
