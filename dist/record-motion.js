export const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export function revealProgress(seconds,reduced=false){
 const t=reduced?7:seconds;
 return {count:ease((t-.7)/5.5),assemble:ease((t-4.2)/2.2),done:t>=6.4,phase:t<.8?'한 장에서 시작한 기록':t<4.2?'한 건 한 건, 경험이 쌓이다.':t<6.4?'당신의 기록이, 하나의 탑으로.':'기록이 세운 높이.'};
}
