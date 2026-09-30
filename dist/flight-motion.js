export const FLIGHT_CODES=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight']);
export function flightVector(keys,yaw){
 const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
 const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const up=Number(keys.has('KeyQ'))-Number(keys.has('KeyE'));
 const x=-Math.sin(yaw)*forward+Math.cos(yaw)*right,z=-Math.cos(yaw)*forward-Math.sin(yaw)*right;
 const length=Math.hypot(x,up,z)||1;
 return {x:x/length,y:up/length,z:z/length};
}
export function clampFlightPosition(position){
 return {x:Math.max(-180,Math.min(180,position.x)),y:Math.max(.45,Math.min(120,position.y)),z:Math.max(-180,Math.min(180,position.z))};
}
