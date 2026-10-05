// This small classic script runs before the 3D module graph finishes loading.
(()=>{
 const panel=document.querySelector('#boot-status');if(!panel)return;
 const label=panel.querySelector('[data-boot-label]'),detail=panel.querySelector('[data-boot-detail]'),progress=panel.querySelector('progress');
 const retry=panel.querySelector('[data-boot-retry]'),continueButton=panel.querySelector('[data-boot-continue]');
 let finished=false,dismissed=false;
 function dismiss(){dismissed=true;panel.hidden=true;document.documentElement.classList.remove('app-loading');}
 continueButton.addEventListener('click',dismiss);
 retry.addEventListener('click',()=>location.reload());
 const slow=setTimeout(()=>{if(finished)return;detail.textContent='처음에는 3D 자료를 받는 데 조금 더 걸릴 수 있어요. 아래에서 먼저 둘러볼 수도 있습니다.';retry.hidden=false;},12000);
 addEventListener('admerest-load',({detail:state})=>{
  if(finished)return;
  label.textContent=state.label;
  if(state.total>0){progress.value=state.loaded/state.total;detail.textContent=`진피 모델 다운로드 · ${Math.round(state.loaded/state.total*100)}%`;}else{progress.removeAttribute('value');if(state.detail)detail.textContent=state.detail;}
  if(state.phase==='ready'){
   finished=true;clearTimeout(slow);document.documentElement.dataset.appReady='true';dismiss();
  }else if(state.phase==='error'){
   clearTimeout(slow);panel.dataset.failed='true';retry.hidden=false;detail.textContent='연결을 확인하고 다시 불러오거나, ADM 노트를 먼저 읽어보세요.';
   if(dismissed){panel.hidden=false;document.documentElement.classList.add('app-loading');}
  }
 });
})();
