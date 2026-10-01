import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {OrbitControls} from '../dist/vendor/OrbitControls.js';
import {orbitDamping,easeLabelLift,placeLabelBottom} from '../dist/explorer-motion.js';

test('real OrbitControls sweeps the same angle at 30, 60 and 120 fps',()=>{
 const angles=[30,60,120].map(fps=>{
  const camera=new PerspectiveCamera();camera.position.set(0,3,12);
  const controls=new OrbitControls(camera,null);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=.45;
  const advance=seconds=>{for(let i=0;i<fps*seconds;i++){controls.dampingFactor=orbitDamping(1/fps);controls.update(1/fps);}};
  advance(3);const start=controls.getAzimuthalAngle();advance(5);return controls.getAzimuthalAngle()-start;
 });
 for(const angle of angles)assert(Math.abs(angle-(-Math.PI*2/60*.45*5))<.0001);
});

test('overlapping tower labels use available space without clipping above the canvas',()=>{
 const placed=[];
 for(const anchor of [20,48,60,145]){
  const bottom=placeLabelBottom(anchor,120,45,55,430,placed);
  assert(bottom-55>=12&&bottom<=418);
  assert(!placed.some(r=>bottom>r.top-8&&bottom-55<r.bottom+8));
  placed.push({left:75,right:165,top:bottom-55,bottom});
 }
});

test('collision label lifts settle continuously without snapping or overshooting',()=>{
 let lift=0;
 for(let i=0;i<60;i++){const next=easeLabelLift(lift,80,1/60);assert(next>=lift&&next<=80);assert(next-lift<9);lift=next;}
 assert(lift>79);
 for(let i=0;i<60;i++){const next=easeLabelLift(lift,0,1/60);assert(next<=lift&&next>=0);assert(lift-next<9);lift=next;}
 assert(lift<.2);
 const settle=fps=>{let value=0;for(let i=0;i<fps/2;i++)value=easeLabelLift(value,80,1/fps);return value;};
 assert(Math.abs(settle(30)-settle(120))<.01);
});
