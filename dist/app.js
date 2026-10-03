import {recordTotals,PUBLIC_DOCTORS,isTowerPublished,DATA_SOURCE} from './records.js';
import {escapeHTML as esc,formatDate} from './html.js';
import {DOCTORS,LANDMARKS} from './scene.js';
import {Explorer} from './explorer.js';
import {SIZES,MAX_QUANTITY,lengthMeters,compareHeight} from './measurements.js';
import {PhysicsPlayground} from './physics.js';
import {ScrollJourney} from './journey.js';
import {RecordReveal} from './record-reveal.js';
import {InlineStack} from './inline-stack.js';
import {filterRanking,rankingRows} from './ranking-view.js';
import {ContactDialog} from './contact-dialog.js?v=20261003-ux2';
import {readExperience,saveExperience} from './experience-session.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const format=new Intl.NumberFormat('en-US'),decimal=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let explorer,playground,reveal,inlineStack,selected=PUBLIC_DOCTORS[0]?.id??'simulation',quantity=2000,displayCount=2000,size='5x6',displayLength=120,animation=null,raf=null;
let towerAdded=false;
new ContactDialog();
$('#comparison-source').innerHTML=PUBLIC_DOCTORS.map(d=>`<option value="${esc(d.id)}">${esc(d.name)} · ${esc(d.countryName)}</option>`).join('')+'<option value="simulation">내 체험 탑</option>';
if(DATA_SOURCE!=='demo'){
 $('.demo-tag').textContent=DATA_SOURCE==='live'?'RECORDS OF EXPERIENCE':'REHEARSAL';
 $('.hero-cases>span>b').textContent=DATA_SOURCE==='live'?'PUBLIC':'시연';
 $('.panel-bottom').textContent=DATA_SOURCE==='live'?'인증 완료 기록만 공개':'운영 시연 · 실제 인증 아님';
 $('.cases-overview>p').textContent=DATA_SOURCE==='live'?`공개 기록 ${DOCTORS.length}명 · 수술 건수와 진피 사용량을 별도 집계합니다.`:'운영 시연 기록 · 실제 의료진의 실적이 아닙니다.';
 $('.publication-demo').textContent='등록 신청은 입력 내용 확인 후 랭킹에 반영됩니다. 전문의 자격과 객관적 자료까지 확인되면 공개 탑이 생성됩니다.';
 $('.ranking-note').textContent=DATA_SOURCE==='live'?'수술 건수 순위는 치료 효과나 실력 평가가 아닙니다. 미인증은 본인 제출 기록이며, 인증은 제출된 자격·집계 자료를 확인했다는 뜻입니다.':'이 브라우저에서 승인한 가상 시연 기록입니다. 실제 공개 등록이나 인증이 아닙니다.';
}
const totals=recordTotals(DOCTORS);
all('[data-total-cases]').forEach(el=>el.textContent=format.format(totals.cases));
all('[data-total-length]').forEach(el=>el.textContent=format.format(totals.length));
const badge='<span class="verify-badge" aria-hidden="true">✓</span>';
$('#explorer-canvas').after($('#live-build'));$('.explorer-main').append($('#flight-hud'));
try{new ScrollJourney($('#journey'));}catch(error){console.warn('Scroll scene unavailable:',error.message);$('#journey').classList.add('journey-static');}
function person(d){return `<span class="person-line">${esc(d.name)}<img class="flag" src="./assets/${d.country}.svg" alt="국적 ${d.countryName}">${isTowerPublished(d)?`<button class="verify-trigger" data-verification-id="${d.id}" aria-label="${esc(d.name)} ${d.verification==='demo'?'데모 ':''}인증 정보 보기">${badge}</button>`:''}</span>`;}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),3000);}
function selectDoctor(id){if(!PUBLIC_DOCTORS.some(d=>d.id===id))return;if(explorer?.flight.enabled)explorer.setFlying(false);selected=id;all('.doctor-card').forEach(card=>{const on=card.dataset.doctor===id;card.classList.toggle('selected',on);card.querySelector('.doctor-select').setAttribute('aria-pressed',String(on));});explorer?.focus(id);$('#all-view').classList.toggle('active',!explorer?.comparison);$('#my-tower').classList.remove('active');$('#comparison-source').value=id;$('#live-build').hidden=true;$('#simulation-playback').hidden=true;$('#tower-registration').hidden=true;refreshComparison();}
$('#doctor-list').innerHTML=PUBLIC_DOCTORS.map(d=>`<div class="doctor-card ${d.id===selected?'selected':''}" data-doctor="${d.id}"><button class="doctor-select" aria-label="${esc(d.name)}, 수술 ${format.format(d.cases)}건, ${format.format(d.length)}미터 탑 보기" aria-pressed="${d.id===selected}"></button><div class="doctor-details">${person(d)}<span class="person-value"><small>수술</small><b>${format.format(d.cases)}</b><small>건</small></span><span class="person-length">진피 누적 길이 <b>${format.format(d.length)} m</b></span></div></div>`).join('');
if(!PUBLIC_DOCTORS.length)$('#doctor-list').innerHTML='<p class="empty-public-towers">첫 번째 인증 탑을 기다리고 있습니다.<br>내 기록으로 먼저 체험해 보세요.</p>';
$('#public-tower-count').textContent=String(PUBLIC_DOCTORS.length).padStart(2,'0');
all('.doctor-select').forEach(b=>b.addEventListener('click',()=>selectDoctor(b.closest('[data-doctor]').dataset.doctor)));
function attachBadges(){all('.verify-trigger:not([data-bound])').forEach(b=>{b.dataset.bound='true';b.setAttribute('aria-describedby','verification-popover');const pop=$('#verification-popover');const show=()=>{const doctor=DOCTORS.find(d=>d.id===b.dataset.verificationId),real=doctor?.verification==='verified'&&DATA_SOURCE==='live';pop.querySelector('strong').textContent=real?'전문의·기록 인증':'전문의 인증 · 시연';pop.querySelector('p').textContent=real?'전문의 자격과 제출된 CRM 등 객관적 집계 기록을 확인한 전문의입니다. 치료 결과나 의료진의 실력을 보증하는 표시는 아닙니다.':'자격과 객관적 기록 확인 후 표시되는 인증 배지의 시연입니다. 실제 심사 결과가 아닙니다.';pop.querySelector('small').textContent=real?`인증일 ${formatDate(doctor.verifiedAt)} · 집계 기준 ${formatDate(doctor.periodEnd)}`:'가상 시연 · 실제 인증 아님';const rect=b.getBoundingClientRect();pop.style.left=`${Math.max(12,Math.min(rect.left-90,innerWidth-322))}px`;pop.style.top=`${Math.max(12,Math.min(rect.bottom+12,innerHeight-210))}px`;if(!pop.matches(':popover-open'))pop.showPopover();};b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show();});b.addEventListener('focus',show);b.addEventListener('click',e=>{e.stopPropagation();show();});b.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!b.matches(':focus-visible'))pop.hidePopover();});b.addEventListener('blur',()=>pop.hidePopover());});}
function renderDoctorRow(d){return `<div class="ranking-row" role="row" data-rank-id="${d.id}" tabindex="-1"><span role="cell" class="rank-number rank-${d.rank}">${String(d.rank).padStart(2,'0')}</span><div role="cell" class="ranking-person"><span class="avatar">${esc(d.initials)}</span>${person(d)}</div><span role="cell" class="ranking-value">${format.format(d.cases)}<small>건</small><span class="ranking-length">${format.format(d.length)} m${d.periodEnd?`<small class="data-period">집계 ${formatDate(d.periodEnd)}</small>`:""}</span></span><div role="cell" class="tower-cell">${isTowerPublished(d)?`<span class="publication-label published">${d.verification==='demo'?'탑 공개 · DEMO':'인증 · 탑 공개'}</span><button class="view-tower" data-view="${d.id}" aria-label="${esc(d.name)} 공개 탑 보기">탑 보기 ↗</button><button class="reveal-record" data-record="${d.id}">기록의 순간 ▶</button>`:`<span class="publication-label">미인증 · 랭킹만 표시</span><a class="publication-help" href="#publication-guide">인증 후 탑 공개 ⓘ</a>`}</div></div>`;}
function renderRanking(){
 const doctors=filterRanking(DOCTORS,{country:$('#country-filter').value,verifiedOnly:$('#verified-only').checked});
 const ad='<div class="ranking-ad-row" role="row"><div role="cell" aria-colspan="4"><span class="ranking-ad-label">AD · 광고주 모집</span><strong>당신의 브랜드가 이 자리에.</strong><button data-contact-kind="advertising">광고 문의 ↗</button></div></div>';
 const body=rankingRows(doctors).map(row=>row.type==='record'?renderDoctorRow(row.record):ad).join('');
 $('#ranking-content').innerHTML=`<div class="ranking-table" role="table" aria-label="전문의 총 수술 케이스 순위"><div class="ranking-header" role="row"><span role="columnheader">순위</span><span role="columnheader">전문의</span><span role="columnheader">총 수술 케이스<small>진피 누적 길이</small></span><span role="columnheader">공개 상태</span></div>${body||'<div class="ranking-empty" role="row"><div role="cell" aria-colspan="4"><p>조건에 맞는 인증 사용자가 없습니다.</p><button data-reset-ranking>전체 사용자 보기</button></div></div>'}</div>`;
 $('#rank-filter-status').textContent=`${doctors.length}명 표시 · ${$('#verified-only').checked?(DATA_SOURCE==='demo'?'인증 사용자만 · 데모 인증 포함':'인증 사용자만'):'전체 인증 상태'}`;
 all('.view-tower[data-view]').forEach(b=>b.addEventListener('click',()=>{$('#explore').scrollIntoView({behavior:reduced?'instant':'smooth'});selectDoctor(b.dataset.view);}));
 all('[data-record]').forEach(b=>{b.disabled=!reveal;b.addEventListener('click',()=>openRecord(b.dataset.record));});attachBadges();
}
$('#country-filter').addEventListener('change',renderRanking);$('#verified-only').addEventListener('change',renderRanking);$('#ranking-content').addEventListener('click',event=>{if(event.target.closest('[data-reset-ranking]')){$('#verified-only').checked=false;$('#country-filter').value='all';renderRanking();}});renderRanking();
$('#play-content').innerHTML=`<div class="play-grid"><div class="play-visual"><div class="material-label"><b>THE SMALL PIECE</b><span id="material-dimensions">5 × 6 cm · 3 mm</span></div><div id="play-canvas" class="play-canvas" role="group" aria-label="ADM 낙하 및 재질 체험"></div><div id="material-views" class="material-views" role="group" aria-label="진피 상세 시점" hidden><button data-material-view="front" aria-pressed="false">정면</button><button data-material-view="oblique" aria-pressed="true">사선</button><button data-material-view="back" aria-pressed="false">뒷면</button><button data-material-view="edge" aria-pressed="false">3mm 옆면</button></div><div class="free-play-tools"><span class="free-play-kicker">JUST PLAY · 자유 낙하</span><div><button data-drop="1">한 장 +</button><button data-drop="8">한 움큼 +8</button><button data-drop="40">쏟아붓기 +40</button><button id="empty-tray" aria-label="박스 비우기">비우기 ↻</button></div><p id="free-play-status" role="status">박스에 진피를 떨어뜨려 보세요.</p></div><div class="material-caption"><button id="inspect-material" aria-pressed="false">진피 자세히 보기 ↗</button><span>드래그하여 회전</span></div></div><div class="play-controls"><form id="quantity-form" novalidate><label class="control-title" for="quantity">이번에는, 기록을 계산해 볼까요?<small>0–100,000건</small></label><div class="input-row"><div class="quantity-field"><input id="quantity" type="number" inputmode="numeric" min="0" max="100000" step="1" value="2000" aria-describedby="input-error"><span>건</span></div><button type="submit" class="primary-button">적용</button></div><p id="input-error" class="input-error" role="alert" hidden></p></form><div class="quick-buttons" aria-label="체험 수량 더하기">${[10,100,500,1000].map(n=>`<button data-add="${n}">+${format.format(n)}</button>`).join('')}</div><div class="reset-row"><button id="reset-count">↻ 처음부터 다시</button></div><div class="rule"></div><div class="control-title">진피 사이즈 <small>기준 5×6 · 두께 3mm</small></div><div class="size-options" role="group" aria-label="진피 사이즈">${Object.entries(SIZES).map(([key,s])=>`<button data-size="${key}" aria-pressed="${key===size}" class="${key===size?'active':''}">${s.width} × ${s.length}</button>`).join('')}</div><p class="case-assumption">체험 가정 · 수술 1건당 진피 1장</p><div class="metric-row cases-primary"><div><div class="metric-value"><span id="count-value">2,000</span><small>건</small></div><p class="metric-label">체험 수술 케이스</p></div><div><div class="metric-value"><span id="length-value">120</span><small>m</small></div><p class="metric-label">긴 변으로 이은 길이</p></div></div><p class="formula" id="formula">2,000건 × 1장 × 6 cm = 120 m</p><div class="simulation-status"><span class="progress-track"><i id="sim-progress"></i></span><span id="sim-status" role="status" aria-live="polite">수술 건수를 입력해 탑의 길이를 계산하세요</span></div><button id="compare-sim" class="compare-sim">내 체험 탑을 랜드마크와 비교하기 ↗</button><p class="simulation-disclaimer">기준 모델은 5×6cm · 두께 3mm입니다. 다른 규격은 이 모델의 외곽 비율을 바꾼 예시로, 실제 제품의 천공 형태·두께를 나타내지 않습니다. 체험은 1건당 1장으로 가정합니다. 실제 수술 건수와 진피 사용 장수는 별도로 집계합니다.</p></div></div>`;
const playVisual=$('.play-visual'),playStage=document.createElement('div');playStage.className='play-stage';
const previewTabs=document.createElement('div');previewTabs.className='play-preview-tabs';previewTabs.setAttribute('role','group');previewTabs.setAttribute('aria-label','미리보기 화면');previewTabs.innerHTML='<button data-play-view="free" aria-pressed="true">박스 놀이</button><button data-play-view="tower" aria-pressed="false">내 기록 탑</button>';
playVisual.prepend(previewTabs,playStage);playStage.append($('.material-label'),$('#play-canvas'),$('#material-views'),$('.material-caption'));
const inlineReadout=document.createElement('div');inlineReadout.id='inline-build';inlineReadout.className='inline-build';inlineReadout.hidden=true;inlineReadout.innerHTML='<span id="inline-build-status" role="status">내 기록 탑</span><strong><b id="inline-build-count">2,000</b><small> / <span id="inline-build-target">2,000</span>장</small></strong><span>긴 변으로 이은 길이 <b id="inline-build-length">120 m</b></span><i><b id="inline-build-progress"></b></i><em>쌓기 연출 · 실제 장수는 숫자로 표시</em>';playStage.append(inlineReadout);
const sizeDock=document.createElement('div');sizeDock.className='play-size-dock';const sizeOptions=$('.size-options');sizeDock.append(sizeOptions.previousElementSibling,sizeOptions);const inlineActions=document.createElement('div');inlineActions.className='inline-actions';inlineActions.hidden=true;inlineActions.innerHTML='<button id="replay-inline">다시 쌓기 ↻</button><div class="register-inline"><button id="register-tower">탑에 등록하기 ↑</button><small>내 화면에 추가 · 전체 공개는 인증 후</small></div>';playVisual.append(inlineActions,sizeDock);
const playInputs=document.createElement('div');playInputs.className='play-inputs';playInputs.append($('#quantity-form'),$('.quick-buttons'),$('.reset-row'));
const mobilePlay=matchMedia('(max-width:760px)');
function placePlayInputs(){if(mobilePlay.matches)playVisual.append(playInputs);else $('.play-controls').prepend(playInputs);}
mobilePlay.addEventListener('change',placePlayInputs);placePlayInputs();
let playView='free';
function setPlayView(view){
 playView=view==='tower'?'tower':'free';const tower=playView==='tower';
 if(tower){playground?.setInspect(false);inlineStack?.open();}else inlineStack?.close();
 all('[data-play-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.playView===playView)));
 $('#inline-build').hidden=!tower;$('.free-play-tools').hidden=tower;$('.inline-actions').hidden=!tower;$('.material-caption').hidden=tower;$('.material-label').hidden=tower;
 if(tower){$('#material-views').hidden=true;$('#inspect-material').setAttribute('aria-pressed','false');$('#inspect-material').textContent='진피 자세히 보기 ↗';}
 playVisual.dataset.view=playView;
 playground?.renderer.domElement.setAttribute('aria-label',tower?'내 기록 탑: 드래그하여 회전':'진피 낙하 체험: 드래그하여 회전');
 $('#play-canvas').setAttribute('aria-label',tower?'입력한 수술 기록의 누적 길이 탑':'ADM 낙하 및 재질 체험');
}
all('[data-play-view]').forEach(b=>b.addEventListener('click',()=>setPlayView(b.dataset.playView)));
try{explorer=new Explorer($('#explorer-canvas'),id=>selectDoctor(id));}catch(error){console.error(error);$('#explorer-canvas').innerHTML='<div class="scene-error">3D 화면을 열 수 없습니다.<br>브라우저의 하드웨어 가속을 확인해 주세요.</div>';}
try{playground=new PhysicsPlayground($('#play-canvas'));}catch(error){console.error(error);$('#play-canvas').innerHTML='<div class="scene-error">3D 재질 체험을 불러오지 못했습니다.<br>수량과 길이 계산은 계속 사용할 수 있습니다.</div>';}
if(playground)inlineStack=new InlineStack(playground);
if(playground)reveal=new RecordReveal(playground,id=>{$('#explore').scrollIntoView({behavior:'instant'});selectDoctor(id);});
all('[data-record]').forEach(b=>b.disabled=!reveal);
function openRecord(id){const record=PUBLIC_DOCTORS.find(d=>d.id===id);if(!record||!reveal)return;setPlayView('free');if(explorer?.flight.enabled)explorer.setFlying(false);reveal.open(record);}
all('[data-drop]').forEach(b=>{b.disabled=true;b.addEventListener('click',()=>{setInspection(false);playground?.drop(Number(b.dataset.drop));});});
$('#empty-tray').addEventListener('click',()=>playground?.clear());
$('#play-canvas').addEventListener('playground-change',e=>{all('[data-drop]').forEach(b=>b.disabled=!e.detail.ready||e.detail.queued+Number(b.dataset.drop)>80);$('#free-play-status').textContent=`이번에 떨어뜨린 진피 ${format.format(e.detail.totalDropped)}장${e.detail.queued?` · ${e.detail.queued}장 더 떨어지는 중`:''} · 수술 기록과 별개의 놀이터`;});
$('#play-canvas').addEventListener('physics-unavailable',()=>{$('#sim-status').textContent='물리 연출을 불러오지 못했습니다. 길이 계산은 가능합니다.';});
function error(message){for(const id of ['input-error','live-error']){$('#'+id).textContent=message;$('#'+id).hidden=false;}$('#quantity').setAttribute('aria-invalid','true');$('#live-quantity').setAttribute('aria-invalid','true');}
function clearError(){for(const id of ['input-error','live-error'])$('#'+id).hidden=true;$('#quantity').removeAttribute('aria-invalid');$('#live-quantity').removeAttribute('aria-invalid');}
function syncRegisterButton(){
 $('#register-tower').disabled=!!animation||quantity<1;$('#register-tower').textContent=animation?'쌓는 중…':'탑에 등록하기 ↑';
}
function paintMetrics(progress){
 $('#registered-cases').textContent=format.format(displayCount);$('#registered-length').textContent=decimal.format(displayLength)+' m';
 $('#count-value').textContent=format.format(displayCount);$('#length-value').textContent=decimal.format(displayLength);$('#sim-progress').style.width=`${progress*100}%`;
 explorer?.updateSimulation(displayLength,displayCount);$('#live-cases').innerHTML=`${format.format(displayCount)}<small>건</small>`;$('#live-length').innerHTML=`${decimal.format(displayLength)}<small>m</small>`;
 inlineStack?.update(displayCount);$('#inline-build-count').textContent=format.format(displayCount);$('#inline-build-target').textContent=format.format(quantity);$('#inline-build-length').textContent=decimal.format(displayLength)+' m';$('#inline-build-progress').style.width=`${progress*100}%`;
 $('#build-count').textContent=format.format(displayCount);$('#build-target').textContent=format.format(quantity);$('#build-length').textContent=decimal.format(displayLength)+' m';$('#build-progress').style.width=`${progress*100}%`;refreshComparison();
}
function animateMetrics(duration=1800,{delay=0}={}){
 $('#formula').textContent=`목표 ${format.format(quantity)}건 × 1장 × ${SIZES[size].length} cm = ${decimal.format(lengthMeters(quantity,size))} m`;
 animation={fromCount:displayCount,fromLength:displayLength,toCount:quantity,toLength:lengthMeters(quantity,size),start:performance.now()+(reduced?0:delay),duration:reduced?0:duration};
 inlineStack?.prepare(quantity,SIZES[size]);explorer?.prepareSimulation(lengthMeters(quantity,size));$('#sim-status').textContent=duration>1000?'한 장씩, 길이가 쌓이는 중…':'새로운 길이에 맞추는 중…';$('#build-status').textContent='진피 쌓는 중';$('#inline-build-status').textContent='진피 쌓는 중';syncRegisterButton();
 if(!raf)raf=requestAnimationFrame(tick);
}
function tick(now){
 raf=null;if(!animation)return;const t=animation.duration===0?1:Math.max(0,Math.min(1,(now-animation.start)/animation.duration)),ease=1-Math.pow(1-t,2);
 displayCount=Math.round(animation.fromCount+(animation.toCount-animation.fromCount)*ease);displayLength=animation.fromLength+(animation.toLength-animation.fromLength)*ease;paintMetrics(t);
 if(t<1)raf=requestAnimationFrame(tick);else{
  animation=null;$('#sim-status').textContent=`체험 ${format.format(quantity)}건 · 진피 ${format.format(quantity)}장 · ${decimal.format(displayLength)}m`;$('#build-status').textContent=quantity?'쌓기 완료':'진피 0장 · 새 수량을 입력해 보세요';$('#inline-build-status').textContent=$('#build-status').textContent;syncRegisterButton();
  $('#formula').textContent=`${format.format(quantity)}건 × 1장 × ${SIZES[size].length} cm = ${decimal.format(displayLength)} m`;if(explorer?.selected==='simulation')explorer.refit();
 }
}
function setQuantity(next,{replay=false,surface='inline'}={}){
 if(!Number.isInteger(next)||next<0||next>MAX_QUANTITY){error('0부터 100,000까지의 정수로 입력해 주세요.');return false;}
 clearError();const delta=next-quantity;quantity=next;$('#quantity').value=String(next);$('#live-quantity').value=String(next);
 if(replay){
  if(explorer?.flight.enabled)explorer.setFlying(false);
  displayCount=0;displayLength=0;paintMetrics(0);animateMetrics(next?3200:0,{delay:next?450:0});if(surface==='explorer')showSimulation({instant:true,scroll:false});else setPlayView('tower');
  if(document.activeElement===$('#quantity')||document.activeElement===$('#live-quantity'))document.activeElement.blur();
 }else animateMetrics(delta>0?2400:650);
 return true;
}
function registerBuiltTower(){
 if(animation||quantity<1)return false;
 showSimulation();toast('내 화면에 체험 탑을 추가했습니다. 전체 공개는 서류 확인 후 진행됩니다.');return true;
}
function addQuantity(amount,{surface='inline'}={}){
 const raw=$(surface==='explorer'?'#live-quantity':'#quantity').value.trim(),base=raw===''?quantity:Number(raw);
 if(!Number.isInteger(base)||base<0||base>MAX_QUANTITY){error('0부터 100,000까지의 정수로 입력해 주세요.');return false;}
 if(!setQuantity(base+amount))return false;
 if(surface==='inline')setPlayView('tower');return true;
}
function setSize(key){if(!SIZES[key])return false;size=key;$('#live-size').value=key;all('[data-size]').forEach(b=>{const on=b.dataset.size===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});playground?.setSize(SIZES[key]);explorer?.setSize(SIZES[key]);$('#material-dimensions').textContent=`${SIZES[key].width} × ${SIZES[key].length} cm · 3 mm${key==='5x6'?'':' · 예시'}`;animateMetrics(750);return true;}
$('#register-tower').addEventListener('click',registerBuiltTower);
$('#replay-inline').addEventListener('click',()=>setQuantity(quantity,{replay:true}));
$('#quantity-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('#quantity').value;if(raw.trim()==='')return error('체험할 수술 건수를 입력해 주세요.');setQuantity(Number(raw),{replay:true});});all('[data-add]').forEach(b=>b.addEventListener('click',()=>{addQuantity(Number(b.dataset.add));}));all('[data-size]').forEach(b=>b.addEventListener('click',()=>setSize(b.dataset.size)));$('#reset-count').addEventListener('click',()=>{setQuantity(0);toast('체험 수술 건수를 초기화했습니다.');});$('#inspect-material').addEventListener('click',e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';setInspection(on);});
function setInspection(on){
 if(playView==='tower')setPlayView('free');
 $('#inspect-material').setAttribute('aria-pressed',String(on));$('#inspect-material').textContent=on?'낙하 체험으로 돌아가기 ↙':'진피 자세히 보기 ↗';
 $('#material-views').hidden=!on;$('.free-play-tools').hidden=on;playground?.setInspect(on);
 all('[data-material-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.materialView==='oblique')));
}
all('[data-material-view]').forEach(b=>b.addEventListener('click',()=>{all('[data-material-view]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));playground?.setView(b.dataset.materialView);}));
function refreshComparison(){
 const source=$('#comparison-source').value,landmark=LANDMARKS[$('#comparison-landmark').value];
 const meters=source==='simulation'?displayLength:(DOCTORS.find(d=>d.id===source)?.length??0);
 const info=compareHeight(meters,landmark.height);
 $('#comparison-percent').innerHTML=`${info.percent.toFixed(1)}<small>%</small>`;
 $('#comparison-description').textContent=Math.abs(info.difference)<.005?`${landmark.name}와 같은 높이예요`:`${landmark.name}보다 ${decimal.format(Math.abs(info.difference))}m ${info.difference>0?'높아요':'낮아요'}`;
 $('#comparison-progress').style.width=`${Math.min(100,info.percent)}%`;
 $('#comparison-note').textContent=$('#comparison-landmark').value==='everest'?'에베레스트는 해발고도 기준의 개념 지형입니다. 높이는 같은 비율, 탑의 폭은 확대해 표현합니다.':'같은 기준선에서 높이를 비교합니다. 탑의 폭은 식별을 위해 확대했습니다.';
}
function syncPairButton(){const on=!!explorer?.comparison;$('#compare-pair').setAttribute('aria-pressed',String(on));$('#compare-pair').textContent=on?'전체 공간으로 ↙':'나란히 보기 ↗';}
function showSimulation({instant=false,scroll=true}={}){
 towerAdded=true;
 selected='simulation';$('#tower-registration').hidden=false;explorer?.showSimulation(instant);$('#simulation-playback').hidden=false;$('#comparison-source').value='simulation';$('#live-build').hidden=false;
 all('.doctor-card').forEach(c=>{c.classList.remove('selected');c.querySelector('.doctor-select').setAttribute('aria-pressed','false');});
 $('#all-view').classList.remove('active');$('#my-tower').classList.add('active');refreshComparison();syncPairButton();if(scroll)$('.explorer-main').scrollIntoView({behavior:instant||reduced?'instant':'smooth',block:'start'});
}
function enterComparison(){
 explorer?.compare($('#comparison-source').value,$('#comparison-landmark').value);
 $('#all-view').classList.remove('active');syncPairButton();refreshComparison();$('.explorer-main').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
}
function overview(){if(explorer?.flight.enabled)explorer.setFlying(false);explorer?.overview();$('#live-build').hidden=true;$('#simulation-playback').hidden=true;$('#tower-registration').hidden=true;$('#all-view').classList.add('active');$('#my-tower').classList.remove('active');syncPairButton();}
$('#compare-sim').addEventListener('click',()=>{$('#explore').scrollIntoView({behavior:reduced?'instant':'smooth'});showSimulation();enterComparison();});
$('#all-view').addEventListener('click',overview);$('#reset-camera').addEventListener('click',overview);$('#explorer-canvas').addEventListener('overview-request',overview);
$('#my-tower').addEventListener('click',showSimulation);
$('#compare-pair').addEventListener('click',()=>{if(explorer?.comparison)overview();else enterComparison();});
$('#comparison-source').addEventListener('change',e=>{if(e.target.value==='simulation')showSimulation();else selectDoctor(e.target.value);enterComparison();});
$('#comparison-landmark').addEventListener('change',enterComparison);
$('#auto-rotate').addEventListener('click',e=>{if(!explorer)return;explorer.auto=!explorer.auto;e.currentTarget.setAttribute('aria-pressed',String(explorer.auto));});
function toggleLandmark(id,on){const b=$(`[data-landmark="${id}"]`);if(!b)return;b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);b.querySelector('.chip-check').textContent=on?'✓':'＋';explorer?.toggleLandmark(id,on);syncPairButton();$('#all-view').classList.add('active');$('#my-tower').classList.remove('active');}
all('[data-landmark]').forEach(b=>b.addEventListener('click',()=>toggleLandmark(b.dataset.landmark,b.getAttribute('aria-pressed')!=='true')));
$('#live-quantity-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('#live-quantity').value;if(raw.trim()==='')return error('체험할 수술 건수를 입력해 주세요.');setQuantity(Number(raw),{replay:true,surface:'explorer'});});
all('[data-live-add]').forEach(b=>b.addEventListener('click',()=>addQuantity(Number(b.dataset.liveAdd),{surface:'explorer'})));
$('#live-size').addEventListener('change',e=>setSize(e.target.value));$('#live-reset').addEventListener('click',()=>setQuantity(0));
const flightCues=new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('flight-cue-visible',e.isIntersecting);},{threshold:.8});
all('[data-start-flight]').forEach(button=>{button.disabled=!explorer;flightCues.observe(button);button.addEventListener('click',()=>{if(!explorer)return;explorer.setFlying(true);document.body.classList.add('flight-experienced');syncPairButton();});});
refreshComparison();
$('#compare-pair').disabled=!explorer;$('#comparison-source').disabled=!explorer;$('#comparison-landmark').disabled=!explorer;
const navObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)all('.site-header nav a').forEach(a=>a.classList.toggle('nav-active',a.hash===`#${e.target.id}`));});},{rootMargin:'-10% 0px -60% 0px'});['explore','play','ranking'].forEach(id=>navObserver.observe($('#'+id)));
function state(){return {demo:DATA_SOURCE!=='live',totalCases:totals.cases,totalLengthMeters:totals.length,rankingBasis:"cases",rankingFilter:{country:$('#country-filter').value,verifiedOnly:$('#verified-only').checked},publicTowerIds:PUBLIC_DOCTORS.map(d=>d.id),publicationMode:DATA_SOURCE,playground:playground?.state()??null,recordReveal:reveal?.state()??null,simulationCases:quantity,simulationSheetsPerCase:1,quantity,size,thicknessMm:3,unit:'cm',longEdgeMeters:quantity*SIZES[size].length/100,selectedTower:explorer?.selected??selected,comparison:explorer?.comparison??null,navigation:explorer?.navigationState()??null,rendering:explorer?.renderingState()??null,landmarkModels:explorer?.landmarkState()??null,landmarks:all('[data-landmark][aria-pressed="true"]').map(b=>b.dataset.landmark),ranking:DOCTORS.map(d=>({id:d.id,name:d.name,rank:d.rank,country:d.country,cases:d.cases,lengthMeters:d.length,verification:d.verification,visibility:isTowerPublished(d)?'public-tower':'ranking-only'}))};}
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
if(document.modelContext?.registerTool){
 const register=tool=>{try{document.modelContext.registerTool(tool);}catch(error){console.warn('WebMCP registration:',error.message);}};
 register({name:'get_admerest_state',description:'Read fictional surgery case totals, independent ADM length, simulation cases, navigation and case-based ranking. No real patient records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>result(state())});
 register({name:'set_adm_simulation',description:'Update local simulated surgery cases via quantity, assuming one ADM sheet per case. Does not modify professional case records or ranking.',inputSchema:{type:'object',properties:{quantity:{type:'integer',minimum:0,maximum:100000},size:{type:'string',enum:Object.keys(SIZES)}},additionalProperties:false},execute:async input=>{if(input.quantity!==undefined&&(!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>100000))throw new Error('Invalid quantity');if(input.size!==undefined&&!SIZES[input.size])throw new Error('Unknown size');if(input.quantity!==undefined)setQuantity(input.quantity);if(input.size!==undefined)setSize(input.size);return result(state());}});
 register({name:'focus_professional_tower',description:'Select a fictional professional and move the 3D camera to their tower.',inputSchema:{type:'object',properties:{id:{type:'string',enum:PUBLIC_DOCTORS.map(d=>d.id)}},required:['id'],additionalProperties:false},execute:async({id})=>{if(!PUBLIC_DOCTORS.some(d=>d.id===id))throw new Error('Professional tower is not public');selectDoctor(id);$('#explore').scrollIntoView({behavior:'instant'});return result(state());}});
 register({name:'set_comparison_landmarks',description:'Choose landmarks visible alongside the professional towers.',inputSchema:{type:'object',properties:{landmarks:{type:'array',items:{type:'string',enum:Object.keys(LANDMARKS)},uniqueItems:true}},required:['landmarks'],additionalProperties:false},execute:async({landmarks})=>{if(!Array.isArray(landmarks)||landmarks.some(id=>!LANDMARKS[id]))throw new Error('Unknown landmark');Object.keys(LANDMARKS).forEach(id=>toggleLandmark(id,landmarks.includes(id)));return result(state());}});
}

const previousExperience=readExperience();
if(previousExperience){
 quantity=displayCount=previousExperience.quantity;size=previousExperience.size;displayLength=lengthMeters(quantity,size);
 $('#quantity').value=$('#live-quantity').value=String(quantity);$('#live-size').value=size;
 all('[data-size]').forEach(b=>{const on=b.dataset.size===size;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 playground?.setSize(SIZES[size]);explorer?.setSize(SIZES[size]);explorer?.prepareSimulation(displayLength);inlineStack?.prepare(quantity,SIZES[size]);paintMetrics(1);setPlayView(previousExperience.playView);
 $('#material-dimensions').textContent=`${SIZES[size].width} × ${SIZES[size].length} cm · 3 mm${size==='5x6'?'':' · 예시'}`;
 $('#formula').textContent=`${format.format(quantity)}건 × 1장 × ${SIZES[size].length} cm = ${decimal.format(displayLength)} m`;
 $('#sim-status').textContent='이 탭에서 체험하던 기록을 이어갑니다.';$('#build-status').textContent=$('#inline-build-status').textContent=quantity?'내 기록 탑':'진피 0장 · 새 수량을 입력해 보세요';
 if(previousExperience.towerAdded){showSimulation({instant:true,scroll:false});if(!previousExperience.towerOpen)overview();}
}
syncRegisterButton();
function rememberExperience(){saveExperience({quantity,size,playView,towerAdded,towerOpen:!$('#live-build').hidden});}
addEventListener('pagehide',rememberExperience);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')rememberExperience();});

const linkedId=new URLSearchParams(location.search).get('tower');
if(linkedId){
 const linked=DOCTORS.find(d=>d.id===linkedId);
 if(linked){if(isTowerPublished(linked)){selectDoctor(linked.id);$('#explore').scrollIntoView({behavior:'instant'});}else{const row=all('[data-rank-id]').find(el=>el.dataset.rankId===linked.id);row?.classList.add('linked-record');row?.scrollIntoView({behavior:'instant',block:'center'});row?.focus({preventScroll:true});toast('미인증 기록은 랭킹에서 확인할 수 있습니다.');}}
 else toast('공개 중인 기록을 찾지 못했습니다. 공개가 중지됐거나 링크가 변경됐을 수 있습니다.');
}
