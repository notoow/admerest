import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {LANDMARKS} from '../dist/landmark-data.js';
import {recordHeightMeters} from '../dist/measurements.js';

test('a 30-case tower matches the 180 cm human, fits a close camera, and restores the world on exit',()=>{
 const source=readFileSync(new URL('../dist/explorer.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export class Explorer','class Explorer');
 const context=vm.createContext({THREE,LANDMARKS,DOCTORS:[],WORLD_UNIT:.008,MODEL_WIDTH:5/6,matchMedia:()=>({matches:true})});
 vm.runInContext(source+'\nthis.Explorer=Explorer;',context);
 const view=Object.create(context.Explorer.prototype),tower=new THREE.Group(),human=new THREE.Group();
 const towerHeight=recordHeightMeters(30)*.008,humanHeight=LANDMARKS.human.height*.008;
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.92,towerHeight,.13));panel.position.y=towerHeight/2;tower.add(panel);
 const base=new THREE.Mesh(new THREE.BoxGeometry(1.14,.045,.72));tower.add(base);tower.userData={height:towerHeight,base};
 const body=new THREE.Mesh(new THREE.BoxGeometry(.005,humanHeight,.003));body.position.y=humanHeight/2;human.add(body);
 let loaded=0;human.userData={height:humanHeight,load(){loaded++;}};human.visible=false;
 tower.position.x=-7.5;human.position.x=-1.5;
 Object.assign(view,{objects:new Map([['simulation',tower],['human',human]]),home:new Map([['simulation',tower.position.clone()],['human',human.position.clone()]]),host:{clientWidth:360,dataset:{view:'all'}},camera:new THREE.PerspectiveCamera(34,360/410,.003,550),controls:{target:new THREE.Vector3(),update(){}},guide:new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial()),simTarget:1.8,simFinalTarget:1.8,simWidth:.92,markSelected(){},ensureDoctor(){}});
 view.compare('simulation','human');
 assert.equal(loaded,1);assert.equal(human.visible,true);assert.equal(base.visible,false,'the decorative 5-meter plinth must not obscure the person');
 assert.equal(towerHeight,humanHeight);assert.equal(tower.scale.y,1);assert.equal(human.scale.y,1,'both retain the same world scale');
 assert(view.camera.position.distanceTo(view.controls.target)<.1,'small subjects must not inherit the building camera minimum');
 assert(view.controls.minDistance<.04);assert(view.camera.near<.001);
 view.focus('human',true);assert.equal(view.selected,'human');assert.equal(view.host.dataset.view,'focus');
 assert(view.camera.position.distanceTo(view.controls.target)<.06);
 view.overview(true);
 assert.equal(base.visible,true);assert.equal(human.visible,false);assert.equal(tower.position.x,-7.5);assert.equal(tower.scale.x,1);assert.equal(view.controls.minDistance,4);assert.equal(view.camera.near,.003);
});

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
