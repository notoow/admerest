export const SHEET_WIDTH=5,SHEET_THICKNESS=.3,PERFECT_MARGIN=.18,STACK_GOAL=50;
export function stackDifficulty(score){
 const level=Math.min(5,1+Math.floor(Math.max(0,score)/10)),speed=3.6+(level-1)*.9;
 return {level,speed,multiplier:Number((speed/3.6).toFixed(2)),gust:level<3?0:.1+(level-3)*.06,nextAt:level<5?level*10:50};
}
export function incomingSpeed(score,elapsed){
 const d=stackDifficulty(score);
 // A smooth gust changes timing, never the landing position or direction.
 return d.speed*(1+d.gust*Math.sin(elapsed*2.1+score*.7));
}
export function assessBalance(stack){
 let sum=0,worst={risk:0,index:0,edge:0,direction:1};
 for(let i=stack.length-1;i>=0;i--){
  sum+=stack[i].x;
  const below=i?stack[i-1].x:0,left=Math.max(stack[i].x,below)-SHEET_WIDTH/2,right=Math.min(stack[i].x,below)+SHEET_WIDTH/2;
  const center=sum/(stack.length-i),half=(right-left)/2,mid=(left+right)/2;
  const risk=half<=0?Infinity:Math.abs(center-mid)/half;
  if(risk>=worst.risk)worst={risk,index:i,edge:center>=mid?right:left,direction:center>=mid?1:-1};
 }
 return {...worst,stable:worst.risk<1-1e-9};
}
export class StackRound{
 constructor(){this.reset();this.status='ready';}
 reset(){this.stack=[];this.score=0;this.perfects=0;this.combo=0;this.risk=0;this.elapsed=0;this.event=null;this.failure=null;this.status='moving';this.spawn();}
 spawn(){const side=this.score%2===0?-1:1;this.incoming={x:side*9,direction:-side,side};this.status='moving';this.elapsed=0;}
 place(){
  if(this.status!=='moving')return false;
  const target=this.stack.at(-1)?.x??0,fromX=this.incoming.x,perfect=Math.abs(fromX-target)<=PERFECT_MARGIN;
  Object.assign(this.incoming,{fromX,x:perfect?target:fromX,perfect});this.status='dropping';this.elapsed=0;return true;
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<=0||['paused','ready','over','clear'].includes(this.status))return;
  dt=Math.min(dt,.05);this.elapsed+=dt;
  if(this.status==='moving'){
   this.incoming.x+=this.incoming.direction*incomingSpeed(this.score,this.elapsed)*dt;
   if(Math.abs(this.incoming.x)>9){this.incoming.x=Math.sign(this.incoming.x)*(18-Math.abs(this.incoming.x));this.incoming.direction*=-1;}
  }else if(this.status==='dropping'&&this.elapsed>=.34){
   const below=this.stack.at(-1)?.x??0;
   if(Math.abs(this.incoming.x-below)>=SHEET_WIDTH){this.failure={reason:'miss',direction:Math.sign(this.incoming.x-below)||1};this.status='over';this.event='miss';return;}
   this.stack.push({x:this.incoming.x});const balance=assessBalance(this.stack);this.risk=balance.risk;
   if(!balance.stable){this.failure={reason:'balance',...balance};this.status='over';this.event='balance';return;}
   this.score++;this.perfects+=Number(this.incoming.perfect);this.combo=this.incoming.perfect?this.combo+1:0;
   this.event=this.incoming.perfect?'perfect':'landed';this.status=this.score>=STACK_GOAL?'clear':'settling';this.elapsed=0;
  }else if(this.status==='settling'&&this.elapsed>=.25)this.spawn();
 }
 pause(){if(['moving','dropping','settling'].includes(this.status)){this.previousStatus=this.status;this.status='paused';return true;}return false;}
 resume(){if(this.status==='paused'){this.status=this.previousStatus;return true;}return false;}
 snapshot(){return {status:this.status,score:this.score,goal:STACK_GOAL,difficulty:stackDifficulty(this.score),speed:Number(incomingSpeed(this.score,this.elapsed).toFixed(3)),perfects:this.perfects,combo:this.combo,heightCm:Number((this.score*SHEET_THICKNESS).toFixed(1)),balanceRisk:Number(Math.min(1,this.risk).toFixed(3)),incomingX:Number(this.incoming.x.toFixed(3)),targetX:this.stack.at(-1)?.x??0,failure:this.failure?.reason??null};}
}
