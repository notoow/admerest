// A small screen should not pay a desktop-sized GPU cost. All scenes share this policy.
export function renderProfile({compact=false,dpr=1}={}){
 return {compact,pixelRatio:Math.min(dpr,compact?1.2:1.7),shadows:!compact,clouds:compact?8:18,pieces:compact?28:44};
}
export function deviceProfile(){return renderProfile({compact:matchMedia('(pointer:coarse), (max-width:760px)').matches,dpr:devicePixelRatio});}
export function sceneSuspended(kind){
 return document.hidden||(document.body.classList.contains('flight-open')&&kind!=='explorer')||(document.body.classList.contains('record-open')&&kind!=='playground');
}
export class ResolutionBudget {
 constructor(max){this.max=max;this.ratio=max;this.elapsed=0;this.slow=0;}
 sample(dt){
  // Ignore resumes and shader compilation; change only after sustained slow frames.
  if(dt<=0||dt>120)return null;
  this.elapsed+=dt;if(dt>23)this.slow+=dt;
  if(this.elapsed<2500)return null;
  const bad=this.slow/this.elapsed>.55;this.elapsed=this.slow=0;
  if(bad&&this.ratio>.75){this.ratio=Math.max(.75,Math.round((this.ratio-.15)*100)/100);return this.ratio;}
  return null;
 }
}
