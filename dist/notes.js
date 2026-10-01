import {SIZES,lengthMeters} from './measurements.js?v=20261001-material-types';
import {EVERYDAY_OBJECTS,comparisonDimensions} from './size-comparison.js?v=20261001-comparison';
const format=new Intl.NumberFormat('ko-KR');
const sizeButtons=[...document.querySelectorAll('[data-note-size]')];
const objectButtons=[...document.querySelectorAll('[data-compare-object]')];
let selectedSize='5x6',selectedObject='iphone';
const objectArt={
 iphone:'<rect width="71.6" height="147.6" rx="13" fill="#263349"/><rect x="2" y="2" width="67.6" height="143.6" rx="11" fill="url(#phone-screen)"/><path d="M4 112C24 55 49 128 68 31V134Q68 144 58 144H14Q4 144 4 134Z" fill="#93acff" opacity=".45"/><rect x="25" y="8" width="22" height="6.5" rx="3.25" fill="#152237"/><text x="35.8" y="49" text-anchor="middle" style="fill:white;font-size:17px;font-weight:500">9:41</text><path d="M26 140H46" stroke="white" stroke-width="2.2" stroke-linecap="round"/>',
 toothbrush:'<path d="M4 46H11L10 89Q15 128 14 178Q14 190 7.5 190Q1 190 1 178L5 89Z" fill="#448ee0"/><path d="M5 93L4 166Q4 181 7.5 181Q11 181 11 166L10 93Z" fill="#c0e8fb"/><rect width="15" height="48" rx="6" fill="#d2eaf1"/><rect x="2" y="2" width="11" height="43" rx="4" fill="white"/><path d="M3 7H12M3 12H12M3 17H12M3 22H12M3 27H12M3 32H12M3 37H12M3 42H12" stroke="#78beb8" stroke-width="2.5"/>',
 card:'<rect width="86" height="54" rx="4" fill="#e87955"/><path d="M49 0H86V54H35C66 37 66 18 49 0" fill="#efad93" opacity=".6"/><rect x="9" y="19" width="13" height="10" rx="2" fill="#f1d6ac"/><path d="M15.5 19V29M9 24H22" stroke="#b59876" stroke-width=".6"/><text x="9" y="42" style="fill:#fff4ea;font-size:4px;letter-spacing:1px">0000  0000  0000</text><text x="9" y="10" style="fill:#fff4ea;font-size:4px">EVERYDAY CARD</text>'
};
function renderSizeComparison(announce=false){
 const size=SIZES[selectedSize],object=EVERYDAY_OBJECTS[selectedObject],dims=comparisonDimensions(selectedSize,selectedObject);
 const label=size.width+' × '+size.length+' cm';
 for(const button of sizeButtons)button.setAttribute('aria-pressed',String(button.dataset.noteSize===selectedSize));
 for(const button of objectButtons)button.setAttribute('aria-pressed',String(button.dataset.compareObject===selectedObject));
 document.querySelector('#selected-size-label').textContent=label;
 document.querySelector('#note-area').textContent=format.format(size.width*size.length);
 document.querySelector('#note-length').textContent=format.format(lengthMeters(1000,selectedSize));
 document.querySelector('#note-formula').textContent='1,000장 × '+size.length+' cm = '+format.format(lengthMeters(1000,selectedSize))+' m';
 const image=document.querySelector('#comparison-sheet-photo'),x=150-dims.sheet.width/2,y=260-dims.sheet.height;
 for(const [key,value]of Object.entries({x,y,width:dims.sheet.width,height:dims.sheet.height}))image.style[key]=value+'px';
 document.querySelector('#sheet-width-rule').setAttribute('d',`M${x} ${y-10}H${x+dims.sheet.width}M${x} ${y-14}V${y-6}M${x+dims.sheet.width} ${y-14}V${y-6}`);
 const widthText=document.querySelector('#sheet-width-text');widthText.setAttribute('y',y-20);widthText.textContent=size.width+' cm';
 document.querySelector('#sheet-stage-label').textContent='ADM · '+label;
 const art=document.querySelector('#comparison-object');
 if(art.dataset.object!==selectedObject){
  art.innerHTML=`<svg x="${340-dims.object.width/2}" y="${260-dims.object.height}" width="${dims.object.width}" height="${dims.object.height}" viewBox="0 0 ${object.width*10} ${object.height*10}">${objectArt[selectedObject]}</svg><text x="340" y="${260-dims.object.height-15}" text-anchor="middle">${object.height} cm</text>`;
  art.dataset.object=selectedObject;
 }
 document.querySelector('#object-stage-label').textContent=object.name;
 document.querySelector('#comparison-svg-title').textContent=label+' 진피와 '+object.name+'의 같은 축척 크기 비교';
 document.querySelector('#object-ratio').textContent=dims.heightPercent.toFixed(1);
 document.querySelector('#object-ratio-caption').textContent=(selectedObject==='iphone'?'아이폰 16 본체':selectedObject==='card'?'가로로 놓은 카드':object.name)+' 높이의';
 document.querySelector('#object-dimensions').textContent=object.note;
 const source=document.querySelector('#object-source');source.hidden=!object.source;if(object.source)source.href=object.source;
 if(announce)document.querySelector('#note-size-status').textContent=label+' 선택. '+object.name+' 높이의 '+dims.heightPercent.toFixed(1)+'%. 면적 '+size.width*size.length+'제곱센티미터, 1,000장을 이은 길이 '+lengthMeters(1000,selectedSize)+'미터.';
}
for(const button of sizeButtons)button.addEventListener('click',()=>{if(!SIZES[button.dataset.noteSize])return;selectedSize=button.dataset.noteSize;renderSizeComparison(true);});
for(const button of objectButtons)button.addEventListener('click',()=>{if(!EVERYDAY_OBJECTS[button.dataset.compareObject])return;selectedObject=button.dataset.compareObject;renderSizeComparison(true);});
renderSizeComparison();
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

