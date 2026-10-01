import {SIZES,lengthMeters} from './measurements.js?v=20261001-notes';
const format=new Intl.NumberFormat('ko-KR');
const sizeButtons=[...document.querySelectorAll('[data-note-size]')];
for(const button of sizeButtons)button.addEventListener('click',()=>{
 const key=button.dataset.noteSize,size=SIZES[key];if(!size)return;
 for(const other of sizeButtons)other.setAttribute('aria-pressed',String(other===button));
 const outline=document.querySelector('.size-outline');outline.style.width=size.width*22+'px';outline.style.height=size.length*22+'px';
 document.querySelector('.size-width').textContent=size.width+' cm';
 document.querySelector('.size-length').textContent=size.length+' cm';
 document.querySelector('#note-area').textContent=format.format(size.width*size.length);
 document.querySelector('#note-length').textContent=format.format(lengthMeters(1000,key));
 document.querySelector('#note-formula').textContent='1,000장 × '+size.length+' cm = '+format.format(lengthMeters(1000,key))+' m';
 document.querySelector('#note-size-status').textContent=size.width+' × '+size.length+' cm 선택: 면적 '+size.width*size.length+'제곱센티미터, 1,000장을 이은 길이 '+lengthMeters(1000,key)+'미터';
});
const quizAnswers={
 yes:'다시 생각해 볼까요? 탑은 사용한 재료의 길이를 보여줍니다. 수술의 적합성·결과·만족도를 판정하지 않습니다.',
 no:'맞아요. 진피 누적 길이, 수술 건수, 수술 결과는 서로 다른 정보입니다. 랭킹은 데모 수술 건수만 비교합니다.',
 depends:'함께 볼 자료는 늘어나도, 탑의 높이만으로 수술 실력을 판정할 수는 없습니다. 수술 결과와 합병증, 추적 관찰도 별도로 봐야 합니다.'
};
for(const button of document.querySelectorAll('[data-quiz-answer]'))button.addEventListener('click',()=>{
 document.querySelectorAll('[data-quiz-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 const answer=document.querySelector('#quiz-answer');answer.hidden=false;answer.textContent=quizAnswers[button.dataset.quizAnswer];
});
const videoIds=new Set(['tM3rcIBuNds','sMoM10ZrBmE','zuDulrtI15k','3oIgGvZx4JE']);
function stopVideo(card){
 const frame=card.querySelector('iframe');if(!frame)return;
 frame.remove();card.querySelector('.video-poster').hidden=false;card.querySelector('[data-video-close]').hidden=true;
}
for(const card of document.querySelectorAll('[data-video-id]')){
 const button=card.querySelector('.video-poster');
 button.addEventListener('click',()=>{
  const id=card.dataset.videoId;if(!videoIds.has(id))return;
  document.querySelectorAll('[data-video-id]').forEach(stopVideo);
  const iframe=document.createElement('iframe');
  iframe.title=card.querySelector('h3').textContent+' — 하이스트 비뇨의학과 YouTube';
  iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1&rel=0';
  iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
  button.hidden=true;card.querySelector('.video-stage').append(iframe);card.querySelector('[data-video-close]').hidden=false;iframe.focus();
 });
 card.querySelector('[data-video-close]').addEventListener('click',()=>{stopVideo(card);button.focus();});
}
function openHashArticle(){
 const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);
 if(target?.matches('.note-article')){const detail=target.querySelector('details');if(detail)detail.open=true;}
}
openHashArticle();addEventListener('hashchange',openHashArticle);

