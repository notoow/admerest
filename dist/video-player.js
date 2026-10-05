// Load YouTube only after a viewer opens a video. No credentials or API key.
let apiPromise;
function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');let timer;
  const fail=()=>{clearTimeout(timer);script.remove();apiPromise=null;reject(new Error('YouTube player unavailable'));};
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve(window.YT);};
  script.src='https://www.youtube.com/iframe_api';script.onerror=fail;
  timer=setTimeout(fail,12000);document.head.append(script);
 });
 return apiPromise;
}

// A single active player stays inside its original article; no modal or history entry.
export class VideoRoom {
 constructor(cards,{loadAPI=loadYouTube}={}){
  this.cards=[...cards];this.loadAPI=loadAPI;this.session=0;this.player=null;this.status='closed';
  this.views=this.cards.map((card,index)=>{
   const screen=document.createElement('div');screen.className='video-inline-screen';screen.hidden=true;
   const finished=document.createElement('div');finished.className='video-finished';finished.hidden=true;
   const replay=document.createElement('button');replay.className='video-replay';replay.textContent='다시 보기 ↻';replay.onclick=()=>this.open(index);finished.append(replay);
   card.querySelector('.video-stage').append(screen,finished);
   const close=document.createElement('button');close.className='video-inline-close';close.textContent='재생 닫기 ×';close.hidden=true;close.onclick=()=>this.close();card.querySelector('.video-links').append(close);
   const message=document.createElement('p');message.className='video-inline-status';message.setAttribute('role','status');card.querySelector('.video-text').append(message);
   const poster=card.querySelector('.video-poster');poster.addEventListener('click',()=>this.open(index));return {screen,finished,replay,close,message,poster};
  });
  addEventListener('pagehide',()=>this.close(false));
 }
 destroyPlayer(){clearTimeout(this.readyTimer);this.player?.destroy();this.player=null;this.screen?.replaceChildren();}
 message(text){if(this.view)this.view.message.textContent=text;}
 async open(index){
  const card=this.cards[index],id=card?.dataset.videoId;if(!/^[\w-]{11}$/.test(id??''))return;
  this.close(false);const session=++this.session;this.index=index;this.view=this.views[index];this.screen=this.view.screen;this.status='loading';
  this.view.poster.hidden=true;this.view.close.hidden=false;this.view.finished.hidden=true;this.screen.hidden=false;card.classList.add('is-playing');
  const stage=card.querySelector('.video-stage'),rect=stage.getBoundingClientRect(),header=document.querySelector('.site-header')?.getBoundingClientRect().bottom??0;
  if(rect.top<header||rect.bottom>innerHeight)stage.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  const title=card.querySelector('h3').textContent;this.message('영상을 준비하고 있어요.');
  const frame=document.createElement('iframe');frame.title=`${title} — 하이스트 비뇨의학과 YouTube`;
  const params=new URLSearchParams({autoplay:'1',playsinline:'1',rel:'0',enablejsapi:'1',origin:location.origin,hl:'ko'});
  frame.src=`https://www.youtube-nocookie.com/embed/${id}?${params}`;
  frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';this.screen.append(frame);
  const current=()=>this.session===session&&this.status!=='closed';
  this.readyTimer=setTimeout(()=>{if(current()&&this.status==='loading')this.message('영상의 ▶ 버튼을 눌러 주세요. 열리지 않으면 YouTube에서 볼 수 있어요.');},8000);
  try{
   const YT=await this.loadAPI();if(!current())return;
   this.player=new YT.Player(frame,{events:{
    onReady:()=>{if(!current())return;clearTimeout(this.readyTimer);this.status='ready';this.message('재생이 시작되지 않으면 영상의 ▶ 버튼을 눌러 주세요.');},
    onStateChange:event=>{
     if(!current())return;
     if(event.data===YT.PlayerState.ENDED){this.status='ended';this.destroyPlayer();this.screen.hidden=true;this.view.finished.hidden=false;this.message('시청을 마쳤습니다.');}
     else if(event.data===YT.PlayerState.PLAYING){this.status='playing';this.message('');}
     else if(event.data===YT.PlayerState.PAUSED){this.status='paused';this.message('영상의 ▶ 버튼으로 이어 보세요.');}
    },
    onAutoplayBlocked:()=>{if(current())this.message('영상의 ▶ 버튼을 누르면 재생됩니다.');},
    onError:()=>{if(current()){clearTimeout(this.readyTimer);this.status='error';this.message('여기서 재생할 수 없는 영상입니다. YouTube에서 열어 주세요.');}}
   }});
  }catch{if(current()){this.status='direct';this.message('영상의 ▶ 버튼을 눌러 주세요. 열리지 않으면 YouTube에서 볼 수 있어요.');}}
 }
 close(restoreFocus=true){
  ++this.session;this.destroyPlayer();this.status='closed';if(!this.view)return;
  this.cards[this.index].classList.remove('is-playing');this.view.poster.hidden=false;this.view.close.hidden=true;this.view.finished.hidden=true;this.screen.hidden=true;this.message('');if(restoreFocus)this.view.poster.focus({preventScroll:true});
 }
 state(){return {open:this.status!=='closed',inline:true,status:this.status,videoId:this.cards[this.index]?.dataset.videoId??null,format:this.cards[this.index]?.dataset.videoFormat??'wide',iframeCount:this.screen?.querySelectorAll('iframe').length??0};}
}
