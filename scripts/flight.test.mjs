import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flightVector,clampFlightPosition} from '../dist/flight-motion.js';
const keys=(...values)=>new Set(values);
test('WASD moves in camera-relative horizontal directions; QE is independent elevation',()=>{
 const forward=flightVector(keys('KeyW'),0);assert.equal(forward.z,-1);assert.equal(forward.y,0);
 const left=flightVector(keys('KeyA'),0);assert.equal(left.x,-1);
 const turn=flightVector(keys('KeyW'),Math.PI/2);assert(Math.abs(turn.x+1)<1e-10);assert(Math.abs(turn.z)<1e-10);
 assert.equal(flightVector(keys('KeyQ'),1.7).y,1);assert.equal(flightVector(keys('KeyE'),1.7).y,-1);
});
test('opposing keys cancel and diagonal movement cannot multiply speed',()=>{
 const stopped=flightVector(keys('KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE'),.8);assert.equal(Math.hypot(stopped.x,stopped.y,stopped.z),0);
 const diagonal=flightVector(keys('KeyW','KeyD','KeyQ'),.8);assert(Math.abs(Math.hypot(diagonal.x,diagonal.y,diagonal.z)-1)<1e-10);
});
test('free exploration stays above the ground and within the environment',()=>{
 assert.deepEqual(clampFlightPosition({x:190,y:-12,z:-500}),{x:180,y:.45,z:-180});
 assert.equal(clampFlightPosition({x:0,y:200,z:0}).y,120);
 assert.deepEqual(clampFlightPosition({x:3,y:71,z:53}),{x:3,y:71,z:53});
});
