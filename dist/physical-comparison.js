import {SIZES} from './measurements.js';
import {trackOverlay} from './overlay-navigation.js';
import {EVERYDAY_OBJECTS} from './size-comparison.js?v=20261002-physical';
import {SCREEN_SCALE_KEY,MIN_SCALE,MAX_SCALE,physicalPixels,screenProfile,readScreenScale,writeScreenScale} from './screen-scale.js';

export class PhysicalComparison {
 constructor(art,onRequestCard){
  this.art=art;this.objectKey='card';this.mode='overview';this.scale=1;this.confirmed=false;this.persisted=false;
  this.root=document.querySelector('#physical-stage');this.panel=document.querySelector('#screen-calibration');
  this.range=document.querySelector('#screen-scale');this.status=document.querySelector('#screen-scale-status');
  this.dialog=document.querySelector('#physical-dialog');
  this.dialog.addEventListener('close',()=>{this.mode='overview';document.body.classList.remove('physical-open');this.opener?.focus({preventScroll:true});this.leaveHistory?.();});
  document.querySelector('#physical-close').onclick=()=>this.dialog.close();
  for(const button of document.querySelectorAll('[data-open-physical]'))button.onclick=()=>{this.opener=button;if(this.objectKey==='toothbrush')onRequestCard();this.mode='physical';this.leaveHistory=trackOverlay(()=>this.dialog.close());this.dialog.showModal();this.dialog.scrollTop=0;document.body.classList.add('physical-open');document.querySelector('#physical-close').focus({preventScroll:true});};
  this.profile=this.currentProfile();this.restore();
  const specimens=this.root.querySelector('.physical-sheets');
  for(const [key,size]of Object.entries(SIZES)){
   const button=document.createElement('button');button.className='physical-specimen';button.dataset.highlightSize=key;
   button.setAttribute('aria-label',`${size.width} × ${size.length} cm 진피 강조`);button.setAttribute('aria-pressed',String(key==='5x6'));
   const image=document.createElement('img');image.src='./assets/adm-front.png';image.alt='';image.draggable=false;
   const label=document.createElement('span');label.textContent=`${size.width} × ${size.length} cm`;button.append(image,label);specimens.append(button);
  }
  this.range.addEventListener('input',()=>this.changeScale(Number(this.range.value)/100));
  document.querySelector('#scale-smaller').onclick=()=>this.changeScale(this.scale-.001);
  document.querySelector('#scale-larger').onclick=()=>this.changeScale(this.scale+.001);
  document.querySelector('#scale-save').onclick=()=>this.save();
  document.querySelector('#scale-reset').onclick=()=>{
   this.changeScale(1);try{localStorage.removeItem(SCREEN_SCALE_KEY);}catch{}
   this.status.textContent='기본 크기로 되돌렸습니다. 실물 카드에 맞춘 뒤 저장해 주세요.';
  };
  this.panel.addEventListener('toggle',()=>{this.dialog.classList.toggle('is-calibrating',this.panel.open);if(this.panel.open)onRequestCard();});
  addEventListener('resize',()=>this.checkScreen());window.visualViewport?.addEventListener('resize',()=>this.checkScreen());
  this.setObject('card');this.setSize('5x6');
 }
 currentProfile(){return screenProfile({width:screen.width,height:screen.height,pixelRatio:devicePixelRatio});}
 restore(){
  let saved=null;try{saved=readScreenScale(localStorage.getItem(SCREEN_SCALE_KEY),this.profile);}catch{}
  this.scale=saved??1;this.confirmed=saved!==null;this.persisted=this.confirmed;
 }
 setSize(key){if(!SIZES[key])return;for(const button of this.root.querySelectorAll('[data-highlight-size]'))button.hidden=button.dataset.highlightSize!==key;}
 setObject(key){
  if(!EVERYDAY_OBJECTS[key])return;this.objectKey=key;if(key!=='card')this.panel.open=false;const object=EVERYDAY_OBJECTS[key];
  const art=this.root.querySelector('#physical-object-art');
  const markup=this.art[key].replaceAll('phone-screen','physical-phone-screen');
  art.innerHTML=`<svg role="img" aria-label="${object.name}" viewBox="0 0 ${object.width*10} ${object.height*10}"><defs><linearGradient id="physical-phone-screen" x2="1" y2="1"><stop stop-color="#192d4d"/><stop offset="1" stop-color="#668afa"/></linearGradient></defs>${markup}</svg>`;
  this.root.querySelector('#physical-object-label').textContent=key==='card'?'카드 · 85.60 × 53.98 mm':`${object.name} · ${object.width} × ${object.height} cm`;
  this.root.querySelector('#physical-reference-hint').textContent=key==='card'?'실제 카드를 이 도형에 겹쳐 보세요. 모서리가 일치하도록 화면 크기를 맞추면 아래 진피도 같은 배율로 보입니다.':'선택한 진피에도 같은 보정값을 사용합니다. 화면 크기를 다시 맞출 때는 카드로 돌아옵니다.';
  this.render();
 }
 changeScale(scale){this.scale=Math.round(Math.min(MAX_SCALE,Math.max(MIN_SCALE,scale))*1000)/1000;this.confirmed=false;this.persisted=false;this.render();}
 render(){
  const object=EVERYDAY_OBJECTS[this.objectKey],svg=this.root.querySelector('#physical-object-art svg');
  if(svg){svg.style.width=physicalPixels(object.width,this.scale)+'px';svg.style.height=physicalPixels(object.height,this.scale)+'px';}
  for(const button of this.root.querySelectorAll('[data-highlight-size]')){
   const size=SIZES[button.dataset.highlightSize],img=button.querySelector('img');
   img.style.width=physicalPixels(size.width,this.scale)+'px';img.style.height=physicalPixels(size.length,this.scale)+'px';
  }
  this.range.value=(this.scale*100).toFixed(1);document.querySelector('#screen-scale-output').textContent=(this.scale*100).toFixed(1)+'%';
  document.querySelector('#scale-smaller').disabled=this.scale<=MIN_SCALE;document.querySelector('#scale-larger').disabled=this.scale>=MAX_SCALE;
  this.status.textContent=(window.visualViewport?.scale??1)>1.01?'화면 확대를 원래대로 돌린 뒤 카드 크기를 맞춰 주세요.':this.confirmed?(this.persisted?'이 화면에 맞춘 크기를 저장했습니다.':'이 화면에 크기를 맞췄습니다. 저장이 차단되어 이번 방문에만 적용됩니다.'):'화면 보정 전 · 크롬 확대 100%에서 카드 테두리를 맞춰 주세요.';
 }
 save(){
  if((window.visualViewport?.scale??1)>1.01){this.render();return;}
  this.confirmed=true;try{localStorage.setItem(SCREEN_SCALE_KEY,writeScreenScale(this.scale,this.profile));this.persisted=true;}catch{this.persisted=false;}
  this.render();this.panel.open=false;
 }
 checkScreen(){
  const profile=this.currentProfile();if(profile!==this.profile){this.profile=profile;this.restore();this.render();if(!this.confirmed)this.status.textContent='화면 배율이 바뀌었습니다. 크롬 100%로 돌아와 카드 크기를 다시 확인해 주세요.';}
  else this.render();
 }
 state(){return {mode:this.mode,scale:this.scale,calibrated:this.confirmed,saved:this.persisted};}
}
