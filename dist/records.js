import {recordHeightMeters} from './measurements.js';
// Fictional demonstration records. Height represents cases at one common scale.
export const DOCTORS=[
 {id:'kim',name:'김하늘',initials:'KH',country:'KR',countryName:'대한민국',cases:4123,verification:'demo'},
 {id:'alex',name:'Alex Kim',initials:'AK',country:'US',countryName:'미국',cases:1320,verification:'none'},
 {id:'haruto',name:'Haruto Sato',initials:'HS',country:'JP',countryName:'일본',cases:231,verification:'none'}
].map(d=>({...d,length:recordHeightMeters(d.cases)}));
export function rankRecords(records){return [...records].sort((a,b)=>b.cases-a.cases||a.id.localeCompare(b.id)).map((d,i)=>({...d,rank:i+1}));}
export function recordTotals(records){return records.reduce((total,d)=>({cases:total.cases+d.cases,length:total.length+d.length}),{cases:0,length:0});}
export const RANKED_DOCTORS=rankRecords(DOCTORS);
// Demo approval previews the same publication rule without claiming real credential review.
export function isTowerPublished(record){return record?.verification==='verified'||record?.verification==='demo';}
export const PUBLIC_DOCTORS=RANKED_DOCTORS.filter(isTowerPublished);
export let DATA_SOURCE='demo';
// Preserve live array bindings used by the 3D scene and ranking modules.
export function replaceRecords(records,source='live'){
 const normalized=records.map(d=>({...d,length:recordHeightMeters(d.cases)}));
 DOCTORS.splice(0,DOCTORS.length,...normalized);RANKED_DOCTORS.splice(0,RANKED_DOCTORS.length,...rankRecords(normalized));
 PUBLIC_DOCTORS.splice(0,PUBLIC_DOCTORS.length,...RANKED_DOCTORS.filter(isTowerPublished));DATA_SOURCE=source;
}
