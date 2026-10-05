import * as THREE from 'three';
import {createSheet} from './material.js';
import {rendererFor,lighting} from './scene.js';
import {StackRound,SHEET_WIDTH,SHEET_THICKNESS,STACK_GOAL,PERFECT_MARGIN,stackDifficulty} from './stack-rules.js?v=20261005-v2';

const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const round=new StackRound(),host=$('#game-canvas'),overlay=$('#game-overlay');
let best=0,storageAvailable=true;
try{best=Math.min(STACK_GOAL,Math.max(0,Number(localStorage.getItem('admerest-stack-best'))||0));}catch{storageAvailable=false;}
let renderer,scene,camera,active,towerGroup,targetFrame,fallGroup;
let visuals=[],lastFrame=performance.now(),cameraY=0,failTime=0,failureStarted=false,feedbackUntil=0,dirty=true,ready=false;
const cameraTarget=new THREE.Vector3();
function sheet(){const item=createSheet();item.rotation.x=-Math.PI/2;item.scale.setScalar(6);return item;}
function writeBest(){if(round.score<=best)return;best=round.score;try{localStorage.setItem('admerest-stack-best',String(best));}catch{storageAvailable=false;}}
function feedback(text){$('#game-feedback').textContent=text;$('#game-feedback').classList.add('visible');feedbackUntil=performance.now()+850;}
function updateUI(){
 const status=round.status,activeRound=['moving','dropping','settling','paused'].includes(status);
 $('#game-score').innerHTML=round.score+'<small>장</small>';$('#game-perfect').textContent=round.perfects;$('#game-best').innerHTML=best+'<small>장</small>';
 if(!storageAvailable)$('#game-best').previousElementSibling.textContent='이번 세션 최고';
 const difficulty=stackDifficulty(round.score);$('#game-level').textContent=`STAGE ${difficulty.level} / 5`;$('#game-speed').textContent=`속도 ×${difficulty.multiplier.toFixed(2)}`;$('#game-next').textContent=round.score>=50?'50장 완성!':difficulty.level===5?'마지막 10장 · 강한 바람':`${difficulty.nextAt-round.score}장 뒤 ${difficulty.level===2?'바람 등장':'속도 UP'}`;$('#game-wind').textContent=difficulty.gust?'바람에 따라 빨라졌다 느려져요':'일정한 속도로 타이밍을 익혀요';$('#stack-stage').dataset.level=String(difficulty.level);
 $('#game-height').textContent=(round.score*SHEET_THICKNESS).toFixed(1)+' cm';$('#game-progress').textContent=round.score+' / '+STACK_GOAL;
 const risk=Math.min(1,round.risk),meter=$('.balance-track');meter.setAttribute('aria-valuenow',Math.round(risk*100));
 $('#game-balance-fill').style.width=risk*100+'%';$('#game-balance-fill').style.background=risk>.78?'#f08764':risk>.5?'#e9c57c':'#82c6b8';
 $('#game-balance-label').textContent=risk>.78?'아슬아슬해요':risk>.5?'중앙을 지켜요':'안정적이에요';
 $('#game-pause').disabled=!activeRound;$('#game-pause').setAttribute('aria-pressed',String(status==='paused'));$('#game-pause').setAttribute('aria-label',status==='paused'?'게임 계속하기':'게임 일시정지');$('#game-pause').textContent=status==='paused'?'▶':'Ⅱ';
 $('#game-action-label').textContent=status==='ready'?'게임 시작':status==='paused'?'계속 쌓기':status==='over'||status==='clear'?'다시 도전':'지금 놓기';
 $('#game-place').disabled=!ready||status==='dropping'||status==='settling'||status==='over'&&failTime<1.15;
 overlay.hidden=!['ready','paused','over','clear'].includes(status)||status==='over'&&failTime<1.15;
 if(!overlay.hidden){
  const copy=status==='ready'?['ONE MORE PIECE','타이밍을 맞춰요.','좌우로 움직이는 진피가 가운데 왔을 때\n스페이스바나 화면을 눌러주세요.\n10장마다 속도 UP · 20장부터 바람 등장','게임 시작']:status==='paused'?['TAKE YOUR TIME','잠시 쉬어가요.','계속하기를 누르면 멈춘 위치에서 이어집니다.','계속하기']:status==='clear'?['50 / 50 · COMPLETE','균형의 달인!','50장을 모두 쌓았어요.\nPERFECT '+round.perfects+'회 · 높이 15.0 cm','한 번 더 도전']:['ONE MORE TRY',round.failure.reason==='miss'?'앗, 빗나갔어요.':'균형이 무너졌어요.',round.score+'장 성공 · PERFECT '+round.perfects+'회\n'+(round.failure.reason==='miss'?'바로 아래 진피와 겹치도록 놓아보세요.':'무게중심이 받쳐주는 면을 벗어났어요.'),'다시 도전'];
  $('#game-overlay-kicker').textContent=copy[0];$('#game-overlay-title').textContent=copy[1];$('#game-overlay-copy').textContent=copy[2];$('#game-start').textContent=copy[3];$('#game-start').disabled=!ready;
 }
 dirty=true;
}
function clearVisuals(){for(const item of visuals)item.removeFromParent();visuals=[];if(fallGroup){scene.remove(fallGroup);fallGroup=null;}towerGroup.rotation.z=0;failureStarted=false;failTime=0;cameraY=0;$('#game-feedback').classList.remove('visible');}
function start(){if(!ready)return;const shell=$('.game-shell');if(innerWidth<=760&&shell.getBoundingClientRect().bottom>innerHeight)shell.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});clearVisuals();round.reset();lastFrame=performance.now();updateUI();renderer.domElement.focus({preventScroll:true});$('#game-status').textContent='게임 시작. 첫 진피가 왼쪽에서 날아옵니다.';}
function action(){
 if(!ready)return false;
 if(round.status==='ready'||round.status==='clear'||round.status==='over'&&failTime>=1.15){start();return true;}
 if(round.status==='paused'){round.resume();lastFrame=performance.now();updateUI();renderer.domElement.focus({preventScroll:true});$('#game-status').textContent='멈춘 위치에서 게임을 이어갑니다.';return true;}
 const placed=round.place();if(placed)updateUI();return placed;
}
function pause(){if(round.pause()){updateUI();$('#game-status').textContent='게임이 일시정지됐습니다.';}}
function syncVisuals(){
 while(visuals.length<round.stack.length){const i=visuals.length,item=sheet();item.position.set(round.stack[i].x,(i+.5)*SHEET_THICKNESS,0);towerGroup.add(item);visuals.push(item);}
}
function beginFailure(){
 failureStarted=true;failTime=0;towerGroup.rotation.z=0;
 if(round.failure.reason==='balance'){
  fallGroup=new THREE.Group();fallGroup.position.set(round.failure.edge,round.failure.index*SHEET_THICKNESS,0);scene.add(fallGroup);
  scene.updateMatrixWorld(true);for(let i=round.failure.index;i<visuals.length;i++)fallGroup.attach(visuals[i]);
 }
 updateUI();$('#game-status').textContent=round.score+'장 성공. '+(round.failure.reason==='miss'?'진피가 받침을 벗어났습니다.':'탑의 무게중심이 지지면을 벗어났습니다.');
}
function resize(){if(!renderer)return;const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height);const aspect=width/height,viewHeight=Math.max(16,23/aspect);Object.assign(camera,{left:-viewHeight*aspect/2,right:viewHeight*aspect/2,top:viewHeight/2,bottom:-viewHeight/2});camera.updateProjectionMatrix();dirty=true;}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(!ready||document.hidden)return;
 const statusBefore=round.status;round.step(dt);syncVisuals();
 if(round.event){writeBest();if(round.event==='perfect')feedback('PERFECT'+(round.combo>1?' ×'+round.combo:''));else if(round.event==='landed')feedback('+'+1+'  ·  '+round.score+'장');if(round.score>0&&round.score<50&&round.score%10===0)feedback(round.score===20?'STAGE 3 · 바람 등장':'STAGE '+stackDifficulty(round.score).level+' · SPEED UP');if(['perfect','landed'].includes(round.event))$('#game-status').textContent=round.score+'장 성공. '+(round.event==='perfect'?'퍼펙트! ':'')+'균형 '+Math.round((1-round.risk)*100)+'퍼센트.';round.event=null;updateUI();}
 if(statusBefore!==round.status)updateUI();
 if(round.status==='over'&&!failureStarted)beginFailure();
 if(round.status==='over'){const prior=failTime;failTime+=dt;if(prior<1.15&&failTime>=1.15)updateUI();}
 if((round.status==='paused'||round.status==='over'&&failTime>1.4||round.status==='clear')&&!dirty)return;
 dirty=false;
 const phase=round.status==='paused'?round.previousStatus:round.status;
 active.visible=['ready','moving','dropping'].includes(phase)||phase==='over'&&round.failure.reason==='miss';
 const y=(round.stack.length+.5)*SHEET_THICKNESS;
 if(phase==='ready'){active.position.set(0,1.1,0);}
 else if(phase==='moving'){active.position.set(round.incoming.x,y+.85,0);active.rotation.z=0;}
 else if(phase==='dropping'){const t=Math.min(1,round.elapsed/.34);active.position.set(THREE.MathUtils.lerp(round.incoming.fromX,round.incoming.x,t),y+.85*(1-t*t),0);}
 else if(phase==='over'&&round.failure.reason==='miss'){active.position.set(round.incoming.x+round.failure.direction*failTime*.7,y-.5-8*failTime*failTime,0);active.rotation.z=-round.failure.direction*failTime;}
 if(fallGroup){fallGroup.rotation.z=-round.failure.direction*Math.min(1.8,failTime*failTime*2.1);fallGroup.position.y=round.failure.index*SHEET_THICKNESS-Math.max(0,failTime-.35)**2*5;fallGroup.position.x=round.failure.edge+round.failure.direction*failTime*.5;}
 else if(!reduced&&phase!=='paused')towerGroup.rotation.z=Math.sin(now*.0035)*Math.min(.016,round.risk*.013);
 if(phase==='ready'||phase==='moving'||phase==='dropping'){targetFrame.visible=true;targetFrame.position.set(round.stack.at(-1)?.x??0,round.stack.length*SHEET_THICKNESS+.012,0);}else targetFrame.visible=false;
 const desired=Math.max(1,round.score*SHEET_THICKNESS*.58);cameraY+=(desired-cameraY)*(1-Math.exp(-dt*3));camera.position.set(9,9+cameraY,16);cameraTarget.set(0,cameraY,0);camera.lookAt(cameraTarget);
 const aligned=phase==='moving'&&Math.abs(round.incoming.x-(round.stack.at(-1)?.x??0))<=PERFECT_MARGIN;
 $('#stack-stage').dataset.aligned=String(aligned);targetFrame.material.color.set(aligned?0xffc28b:0xa8d5f7);
 const direction=aligned?'지금! · 가운데에 맞았어요':phase==='moving'?(round.incoming.side<0?'LEFT → · 중앙에서 멈추세요':'← RIGHT · 중앙에서 멈추세요'):phase==='dropping'?'한 장이 내려앉는 중…':'← LEFT / RIGHT →';
 if($('#game-direction').textContent!==direction)$('#game-direction').textContent=direction;
 if(now>feedbackUntil)$('#game-feedback').classList.remove('visible');
 renderer.render(scene,camera);
}
try{
 renderer=rendererFor(host);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.type=THREE.PCFShadowMap;
 scene=new THREE.Scene();lighting(scene,renderer);scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow){o.shadow.mapSize.set(1024,1024);o.shadow.camera.left=-15;o.shadow.camera.right=15;}});
 camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,100);
 const base=new THREE.Mesh(new THREE.BoxGeometry(5.35,.28,6.35),new THREE.MeshStandardMaterial({color:0x3776cb,roughness:.6}));base.position.y=-.15;base.receiveShadow=true;base.castShadow=true;scene.add(base);
 const plinth=new THREE.Mesh(new THREE.CylinderGeometry(5,5.2,.3,64),new THREE.MeshStandardMaterial({color:0x244663,roughness:.8}));plinth.position.y=-.45;plinth.receiveShadow=true;scene.add(plinth);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.61;floor.receiveShadow=true;scene.add(floor);
 const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>new THREE.Vector3(Math.cos(i/96*Math.PI*2)*6.4,-.58,Math.sin(i/96*Math.PI*2)*6.4))),new THREE.LineBasicMaterial({color:0x588bb4,transparent:true,opacity:.27}));scene.add(ring);
 targetFrame=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-SHEET_WIDTH/2,0,-3),new THREE.Vector3(SHEET_WIDTH/2,0,-3),new THREE.Vector3(SHEET_WIDTH/2,0,3),new THREE.Vector3(-SHEET_WIDTH/2,0,3)]),new THREE.LineBasicMaterial({color:0xa8d5f7,transparent:true,opacity:.6}));scene.add(targetFrame);
 towerGroup=new THREE.Group();scene.add(towerGroup);active=sheet();scene.add(active);
 renderer.domElement.setAttribute('aria-label','탑 쌓기 게임. 스페이스바 또는 클릭으로 진피 놓기. P 또는 Escape로 일시정지.');
 new ResizeObserver(resize).observe(host);resize();ready=true;updateUI();requestAnimationFrame(frame);
}catch(error){console.error('Stack game unavailable:',error);$('#game-overlay-title').textContent='3D 화면을 열지 못했어요.';$('#game-overlay-copy').textContent='브라우저의 하드웨어 가속을 확인하고 새로고침해 주세요.';$('#game-start').textContent='3D 사용 불가';}
$('#game-start').addEventListener('click',action);$('#game-place').addEventListener('click',action);
$('#game-pause').addEventListener('click',()=>round.status==='paused'?action():pause());
host.addEventListener('pointerdown',e=>{if(e.button!==0)return;renderer?.domElement.focus({preventScroll:true});action();});
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(round.status==='paused'&&e.code==='KeyP')action();else pause();}
 if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();action();}
});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
if(document.modelContext?.registerTool){
 const result=()=>({content:[{type:'text',text:JSON.stringify({...round.snapshot(),best,ready,model:document.documentElement.dataset.admModel,leaderboardEffect:'none'})}]});
 document.modelContext.registerTool({name:'get_stack_game_state',description:'Read this local ADM stacking game, current moving position, balance, score and personal best. No professional records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>result()});
 document.modelContext.registerTool({name:'control_stack_game',description:'Use the same start/place, pause and resume actions as the game controls. Only affects the local game and personal best.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['start','place','pause','resume']}},required:['action'],additionalProperties:false},execute:async({action:command})=>{if(command==='start')start();else if(command==='place')action();else if(command==='pause')pause();else if(command==='resume'&&round.status==='paused')action();return result();}});
}
