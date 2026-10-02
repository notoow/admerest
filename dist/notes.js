import {SIZES,lengthMeters} from './measurements.js?v=20261001-material-types';
import {EVERYDAY_OBJECTS,comparisonDimensions} from './size-comparison.js?v=20261002-physical';
import {PhysicalComparison} from './physical-comparison.js?v=20261002-physical-objects';
import {VideoRoom} from './video-player.js?v=20261002-usability';
const sizeButtons=[...document.querySelectorAll('[data-note-size]')];
const objectButtons=[...document.querySelectorAll('[data-compare-object]')];
let selectedSize='5x6',selectedObject='card';
const objectArt={
 iphone:'<rect width="71.6" height="147.6" rx="13" fill="#263349"/><rect x="2" y="2" width="67.6" height="143.6" rx="11" fill="url(#phone-screen)"/><path d="M4 112C24 55 49 128 68 31V134Q68 144 58 144H14Q4 144 4 134Z" fill="#93acff" opacity=".45"/><rect x="25" y="8" width="22" height="6.5" rx="3.25" fill="#152237"/><text x="35.8" y="49" text-anchor="middle" style="fill:white;font-size:17px;font-weight:500">9:41</text><path d="M26 140H46" stroke="white" stroke-width="2.2" stroke-linecap="round"/>',
 toothbrush:'<path d="M4 46H11L10 89Q15 128 14 178Q14 190 7.5 190Q1 190 1 178L5 89Z" fill="#448ee0"/><path d="M5 93L4 166Q4 181 7.5 181Q11 181 11 166L10 93Z" fill="#c0e8fb"/><rect width="15" height="48" rx="6" fill="#d2eaf1"/><rect x="2" y="2" width="11" height="43" rx="4" fill="white"/><path d="M3 7H12M3 12H12M3 17H12M3 22H12M3 27H12M3 32H12M3 37H12M3 42H12" stroke="#78beb8" stroke-width="2.5"/>',
 card:'<rect width="85.6" height="53.98" rx="3.18" fill="#e87955"/><path d="M49 0H82.42Q85.6 0 85.6 3.18V50.8Q85.6 53.98 82.42 53.98H35C66 37 66 18 49 0" fill="#efad93" opacity=".6"/><rect x="9" y="19" width="13" height="10" rx="2" fill="#f1d6ac"/><path d="M15.5 19V29M9 24H22" stroke="#b59876" stroke-width=".6"/><text x="9" y="42" style="fill:#fff4ea;font-size:4px;letter-spacing:1px">85.60 × 53.98 mm</text><text x="9" y="10" style="fill:#fff4ea;font-size:4px">EVERYDAY CARD</text>'
};
const physicalComparison=new PhysicalComparison(objectArt,()=>{selectedObject='card';renderSizeComparison(true);});
function renderSizeComparison(announce=false){
 const size=SIZES[selectedSize],object=EVERYDAY_OBJECTS[selectedObject];
 const label=size.width+' × '+size.length+' cm';
 for(const button of sizeButtons)button.setAttribute('aria-pressed',String(button.dataset.noteSize===selectedSize));
 for(const specimen of document.querySelectorAll('[data-highlight-size]')){const selected=specimen.dataset.highlightSize===selectedSize;specimen.dataset.selected=String(selected);if(specimen.tagName==='BUTTON')specimen.setAttribute('aria-pressed',String(selected));}
 for(const cell of document.querySelectorAll('[data-size-cell]'))cell.dataset.selected=String(cell.dataset.sizeCell===selectedSize);
 for(const button of objectButtons)button.setAttribute('aria-pressed',String(button.dataset.compareObject===selectedObject));
 for(const key of Object.keys(SIZES)){
  const dims=comparisonDimensions(key,selectedObject);
  document.querySelector(`[data-size-ratio="${key}"]`).innerHTML=dims.heightPercent.toFixed(1)+'<small>%</small>';
 }
 const dims=comparisonDimensions(selectedSize,selectedObject),art=document.querySelector('#comparison-object');
 if(art.dataset.object!==selectedObject){
  art.innerHTML=`<svg x="${565-dims.object.width/2}" y="${260-dims.object.height}" width="${dims.object.width}" height="${dims.object.height}" viewBox="0 0 ${object.width*10} ${object.height*10}">${objectArt[selectedObject]}</svg><text x="565" y="${260-dims.object.height-15}" text-anchor="middle">${object.height} cm</text>`;
  art.dataset.object=selectedObject;
 }
 document.querySelector('#object-stage-label').textContent=object.name;
 document.querySelector('#comparison-svg-title').textContent='5×6, 5×8, 5×10, 6×12cm 진피 네 규격과 '+object.name+'의 같은 축척 크기 비교';
 document.querySelector('#object-ratio-caption').textContent=(selectedObject==='iphone'?'아이폰':object.name)+' 대비';
 document.querySelector('#object-dimensions').textContent=object.note;
 physicalComparison.setObject(selectedObject);physicalComparison.setSize(selectedSize);
 const source=document.querySelector('#object-source');source.hidden=!object.source;if(object.source)source.href=object.source;
 if(announce)document.querySelector('#note-size-status').textContent='네 규격 모두 표시. '+label+' 강조. 비교 물건 '+object.name+'. '+label+'는 '+object.name+' 높이의 '+dims.heightPercent.toFixed(1)+'%, 면적 '+size.width*size.length+'제곱센티미터, 1,000장 길이 '+lengthMeters(1000,selectedSize)+'미터.';
}
function highlightSize(key){if(!SIZES[key])return;selectedSize=key;renderSizeComparison(true);}
for(const button of sizeButtons)button.addEventListener('click',()=>highlightSize(button.dataset.noteSize));
for(const specimen of document.querySelectorAll('[data-highlight-size]'))specimen.addEventListener('click',()=>highlightSize(specimen.dataset.highlightSize));
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
const videoRoom=new VideoRoom(document.querySelectorAll('[data-video-id]'));
if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'get_notes_state',description:'Read selected comparison size/object, display calibration and video room status. No playback changes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({content:[{type:'text',text:JSON.stringify({selectedSize,selectedObject,display:physicalComparison.state(),video:videoRoom.state()})}]})});}catch(error){console.warn('Notes state tool:',error.message);}}
function openHashArticle(){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id);
 if(target?.matches('.note-article')){const detail=target.querySelector('details');if(detail)detail.open=true;}
}
openHashArticle();addEventListener('hashchange',openHashArticle);

