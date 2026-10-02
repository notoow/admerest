// CSS pixels are not a physical measurement of the user's display. Calibrate
// against a real ID-1 card, then use the same scale for every specimen.
export const SCREEN_SCALE_KEY='admerest.screen-scale.v1';
export const MIN_SCALE=.5,MAX_SCALE=2.5;
export function validScale(value){return typeof value==='number'&&Number.isFinite(value)&&value>=MIN_SCALE&&value<=MAX_SCALE;}
export function physicalPixels(cm,scale=1){
 if(!Number.isFinite(cm)||cm<=0||!validScale(scale))throw new RangeError('Invalid physical size or display scale');
 return cm*96/2.54*scale;
}
export function screenProfile({width,height,pixelRatio}){return `${width}x${height}@${pixelRatio}`;}
export function readScreenScale(raw,profile){
 try{const data=JSON.parse(raw);return data?.version===1&&data.profile===profile&&validScale(data.scale)?data.scale:null;}catch{return null;}
}
export function writeScreenScale(scale,profile){
 if(!validScale(scale)||typeof profile!=='string')throw new RangeError('Invalid display calibration');
 return JSON.stringify({version:1,scale,profile});
}
