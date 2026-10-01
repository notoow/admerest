// Match the orbit feel at 60 Hz while keeping speed and label easing time-based.
export function orbitDamping(dt){return 1-Math.pow(1-.07,Math.max(0,dt)*60);}
export function easeLabelLift(previous,target,dt){
 if(previous===undefined)return target;
 const next=previous+(target-previous)*(1-Math.exp(-Math.max(0,dt)/.16));
 return Math.abs(next-target)<.05?target:next;
}
export function placeLabelBottom(anchor,left,halfWidth,height,viewportHeight,placed){
 const min=height+12,max=Math.max(min,viewportHeight-12);
 const overlaps=placed.filter(r=>left+halfWidth>r.left&&left-halfWidth<r.right);
 const preferred=Math.max(min,Math.min(max,anchor));
 const candidates=[preferred,...overlaps.flatMap(r=>[r.top-8,r.bottom+8+height])];
 return candidates.filter(top=>top>=min&&top<=max&&!overlaps.some(r=>top>r.top-8&&top-height<r.bottom+8)).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred))[0]??preferred;
}
