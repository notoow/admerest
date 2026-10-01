import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flightVector,joystickVector,clampFlightPosition,EYE_HEIGHT,WORLD_UNIT,MOVE_SPEED} from '../dist/flight-motion.js';
const keys=(...values)=>new Set(values);
test('WASD stays camera-relative and horizontal; QE is independent elevation',()=>{
 assert.equal(flightVector(keys('KeyW'),0).z,-1);assert.equal(flightVector(keys('KeyW'),0).y,0);
 assert.equal(flightVector(keys('KeyA'),0).x,-1);
 const turn=flightVector(keys('KeyW'),Math.PI/2);assert(Math.abs(turn.x+1)<1e-10);assert(Math.abs(turn.z)<1e-10);
 assert.equal(flightVector(keys('KeyQ'),1.7).y,1);assert.equal(flightVector(keys('KeyE'),1.7).y,-1);
});
test('opposing keys cancel; combined keyboard and analog diagonal cannot multiply speed',()=>{
 assert.equal(Math.hypot(...Object.values(flightVector(keys('KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE'),.8))),0);
 const diagonal=flightVector(keys('KeyW','KeyD','KeyQ'),.8,{x:1,y:-1});assert(Math.abs(Math.hypot(diagonal.x,diagonal.y,diagonal.z)-1)<1e-10);
});
test('walking maintains 1.7 m above terrain and flying cannot pass below it',()=>{
 assert.equal(EYE_HEIGHT/WORLD_UNIT,1.7);
 for(const ground of [0,.5,32]){
  assert.equal(clampFlightPosition({x:3,y:71,z:53},ground,true).y,ground+EYE_HEIGHT);
  assert.equal(clampFlightPosition({x:3,y:-12,z:53},ground,false).y,ground+EYE_HEIGHT);
 }
 assert.deepEqual(clampFlightPosition({x:190,y:200,z:-500}),{x:150,y:120,z:-150});
 assert(MOVE_SPEED>3.5*2);
});
test('joystick deadzone rejects jitter and partial travel retains proportional speed',()=>{
 assert.deepEqual(joystickVector(2,1,40),{x:0,y:0});
 const partial=joystickVector(0,-20,40),full=joystickVector(0,-80,40);
 assert(partial.y<0&&partial.y>-.5);assert.equal(full.y,-1);
 assert.equal(flightVector(keys(),0,partial).z,partial.y);
 const diagonal=joystickVector(80,80,40);assert(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-10);
 assert.deepEqual(joystickVector(0,0,40),{x:0,y:0});
});
