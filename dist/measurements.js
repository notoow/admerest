export const MAX_QUANTITY=100000;
export const SIZES={'4x6':{width:4,length:6},'5x6':{width:5,length:6},'6x8':{width:6,length:8}};
export const lengthMeters=(quantity,size)=>quantity*SIZES[size].length/100;
export function compareHeight(meters,landmarkHeight){
 const difference=meters-landmarkHeight;
 return {percent:meters/landmarkHeight*100,difference};
}
// Keep full lower panels at their natural ratio; only the growing last panel is partial.
export function towerPanels(height,panelHeight){
 if(height<=0)return [];
 const count=Math.ceil(height/panelHeight);
 return Array.from({length:count},(_,i)=>{const h=Math.min(panelHeight,height-i*panelHeight);return {height:h,center:i*panelHeight+h/2};});
}
