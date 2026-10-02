// At most 72 visible sheets: counters retain the exact record count.
export function stackPreviewLayout(count,target){
 const group=Math.max(1,Math.ceil(Math.max(0,target)/72));
 const progress=Math.max(0,Math.min(count,target))/group;
 return Array.from({length:Math.ceil(progress)},(_,i)=>({fill:Math.min(1,progress-i)}));
}
