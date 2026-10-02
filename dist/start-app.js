import {BACKEND} from './backend-config.js';
import {replaceRecords} from './records.js';
import {escapeHTML as esc} from './html.js';
const query=new URLSearchParams(location.search),workflow=query.get('demo')==='workflow',explicitDemo=query.get('demo')==='1';
let note='';
if(workflow){const {demoService}=await import('./service-demo.js');replaceRecords(await demoService().publicRecords(),'rehearsal');note='운영 시연 · 이 브라우저에서 승인한 가상 기록입니다. 실제 공개 등록이 아닙니다.';}
else if(BACKEND.url&&BACKEND.publishableKey&&!explicitDemo){
 try{const {publicRecords}=await import('./service-api.js');replaceRecords(await publicRecords(),'live');}
 catch{replaceRecords([],'unavailable');note='공개 기록을 불러오지 못했습니다. 새로고침해 주세요. 기록 체험은 계속 사용할 수 있습니다.';}
}
if(note){const banner=document.createElement('div');banner.className='data-source-notice';banner.innerHTML=`<span>${esc(note)}</span><a href="${workflow?'./admin.html?demo=1':'./'}">${workflow?'심사 시연으로 돌아가기':'다시 불러오기'} ↗</a>`;document.querySelector('#explore').prepend(banner);}
await import('./app.js?v=20261002-service');
