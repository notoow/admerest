import {trackOverlay} from './overlay-navigation.js';
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

export class VideoRoom {
 constructor(cards,{loadAPI=loadYouTube}={}){
  this.cards=[...cards];this.loadAPI=loadAPI;this.session=0;this.player=null;this.status='closed';
  this.dialog=document.createElement('dialog');this.dialog.className='video-room';this.dialog.setAttribute('aria-labelledby','video-room-title');
  this.dialog.innerHTML=`<header class="video-room-header"><div><span>HIGHST / VIDEO NOTE</span><h2 id="video-room-title"></h2></div><button class="video-room-close" aria-label="영상 닫고 글로 돌아가기">닫기 ×</button></header><div class="video-room-body"><div class="video-room-screen"></div><section class="video-finished" hidden><span>THANKS FOR WATCHING</span><h3>영상, 잘 보셨나요?</h3><p>다시 보거나 다음 이야기를 이어서 볼 수 있어요.</p><button class="video-replay">다시 보기 ↻</button></section></div><footer class="video-room-footer"><p class="video-room-status" role="status" aria-live="polite"></p><div class="video-room-actions"><a class="video-external" target="_blank" rel="noopener">YouTube에서 보기 ↗</a><button class="video-next"></button></div><p class="video-room-tip">플레이어의 전체화면 버튼으로 더 크게 볼 수 있어요.</p></footer>`;
  document.body.append(this.dialog);this.screen=this.dialog.querySelector('.video-room-screen');
  this.dialog.querySelector('.video-room-close').onclick=()=>this.close();
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
  this.dialog.querySelector('.video-replay').onclick=()=>this.open(this.index);
  this.dialog.querySelector('.video-next').onclick=()=>this.open((this.index+1)%this.cards.length);
  this.cards.forEach((card,index)=>card.querySelector('.video-poster').addEventListener('click',()=>this.open(index)));
  addEventListener('pagehide',()=>this.close(false));
 }
 destroyPlayer(){clearTimeout(this.readyTimer);this.player?.destroy();this.player=null;this.screen.replaceChildren();}
 message(text){this.dialog.querySelector('.video-room-status').textContent=text;}
 async open(index){
  const card=this.cards[index],id=card?.dataset.videoId;if(!/^[\w-]{11}$/.test(id??''))return;
  if(!this.dialog.open){this.returnFocus=card.querySelector('.video-poster');this.leaveHistory=trackOverlay(()=>this.close());this.dialog.showModal();document.body.classList.add('video-room-open');}
  const session=++this.session;this.destroyPlayer();this.index=index;this.status='loading';
  const title=card.querySelector('h3').textContent,short=card.dataset.videoFormat==='short';
  this.dialog.dataset.format=short?'short':'wide';this.dialog.querySelector('#video-room-title').textContent=title;
  this.dialog.querySelector('.video-external').href=card.querySelector('.video-links a').href;
  this.dialog.querySelector('.video-next').textContent=`다음: ${this.cards[(index+1)%this.cards.length].querySelector('h3').textContent} →`;
  this.dialog.querySelector('.video-finished').hidden=true;this.screen.hidden=false;
  this.message('영상을 준비하고 있어요.');this.dialog.scrollTop=0;this.dialog.querySelector('.video-room-close').focus({preventScroll:true});
  const frame=document.createElement('iframe');frame.title=`${title} — 하이스트 비뇨의학과 YouTube`;
  const params=new URLSearchParams({autoplay:'1',playsinline:'1',rel:'0',enablejsapi:'1',origin:location.origin,hl:'ko'});
  frame.src=`https://www.youtube-nocookie.com/embed/${id}?${params}`;
  frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';this.screen.append(frame);
  const current=()=>this.session===session&&this.dialog.open;
  this.readyTimer=setTimeout(()=>{if(current()&&this.status==='loading')this.message('재생 버튼을 눌러 보세요. 영상이 열리지 않으면 YouTube에서 볼 수 있어요.');},8000);
  try{
   const YT=await this.loadAPI();if(!current())return;
   this.player=new YT.Player(frame,{events:{
    onReady:()=>{if(!current())return;clearTimeout(this.readyTimer);this.status='ready';this.message('재생이 시작되지 않으면 영상의 ▶ 버튼을 눌러 주세요.');},
    onStateChange:event=>{
     if(!current())return;
     if(event.data===YT.PlayerState.ENDED){this.status='ended';this.destroyPlayer();this.screen.hidden=true;this.dialog.querySelector('.video-finished').hidden=false;this.message('시청을 마쳤습니다.');this.dialog.querySelector('.video-replay').focus({preventScroll:true});}
     else if(event.data===YT.PlayerState.PLAYING){this.status='playing';this.message(short?'세로 영상으로 크게 보고 있어요.':'영상을 보고 있어요.');}
     else if(event.data===YT.PlayerState.PAUSED){this.status='paused';this.message('잠시 멈췄어요. 영상의 ▶ 버튼으로 이어 보세요.');}
    },
    onAutoplayBlocked:()=>{if(current())this.message('영상의 ▶ 버튼을 누르면 재생됩니다.');},
    onError:()=>{if(current()){clearTimeout(this.readyTimer);this.status='error';this.message('이 영상은 여기서 재생할 수 없습니다. YouTube에서 열어 주세요.');}}
   }});
  }catch{if(current()){this.status='direct';this.message('영상의 ▶ 버튼을 눌러 보세요. 열리지 않으면 YouTube에서 볼 수 있어요.');}}
 }
 close(restoreFocus=true){
  if(!this.dialog.open)return;++this.session;this.destroyPlayer();this.dialog.close();document.body.classList.remove('video-room-open');this.status='closed';if(restoreFocus)this.returnFocus?.focus({preventScroll:true});this.leaveHistory?.();
 }
 state(){return {open:this.dialog.open,status:this.status,videoId:this.cards[this.index]?.dataset.videoId??null,format:this.dialog.dataset.format??null,iframeCount:this.screen.querySelectorAll('iframe').length};}
}
