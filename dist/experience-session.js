import {SIZES,MAX_QUANTITY} from './measurements.js';

const KEY='admerest:experience:v2';
function snapshot(value){
 if(!value||value.version!==1||!Number.isInteger(value.quantity)||value.quantity<0||value.quantity>MAX_QUANTITY)return null;
 if(!Object.hasOwn(SIZES,value.size)||!['free','tower'].includes(value.playView))return null;
 if(typeof value.towerAdded!=='boolean'||typeof value.towerOpen!=='boolean')return null;
 return {version:1,quantity:value.quantity,size:value.size,playView:value.playView,towerAdded:value.towerAdded,towerOpen:value.towerAdded&&value.towerOpen};
}

// Only anonymous, accepted simulation values survive navigation in this tab.
// No personal record, document, or verification status is stored here.
export function readExperience(storage){
 try{return snapshot(JSON.parse((storage??globalThis.sessionStorage).getItem(KEY)));}catch{return null;}
}
export function saveExperience(value,storage){
 try{const safe=snapshot({...value,version:1});if(!safe)return false;(storage??globalThis.sessionStorage).setItem(KEY,JSON.stringify(safe));return true;}catch{return false;}
}
