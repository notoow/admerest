export const WORLD_UNIT=.008;
export const EYE_HEIGHT=1.7*WORLD_UNIT;
export const MOVE_SPEED=9;
export const FLIGHT_CODES=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight']);
export function joystickVector(x,y,radius){
 const length=Math.hypot(x,y),amount=Math.min(1,length/radius);
 if(amount<=.12)return {x:0,y:0};
 const strength=(amount-.12)/.88;return {x:x/length*strength,y:y/length*strength};
}
export function flightVector(keys,yaw,stick={x:0,y:0}){
 const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))-stick.y;
 const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+stick.x;
 const up=Number(keys.has('KeyQ'))-Number(keys.has('KeyE'));
 const x=-Math.sin(yaw)*forward+Math.cos(yaw)*right,z=-Math.cos(yaw)*forward-Math.sin(yaw)*right;
 const length=Math.max(1,Math.hypot(x,up,z));return {x:x/length,y:up/length,z:z/length};
}
export function clampFlightPosition(position,ground=0,walking=false){
 return {x:Math.max(-150,Math.min(150,position.x)),y:walking?ground+EYE_HEIGHT:Math.max(ground+EYE_HEIGHT,Math.min(120,position.y)),z:Math.max(-150,Math.min(150,position.z))};
}
