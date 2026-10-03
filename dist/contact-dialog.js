import {CONTACT_EMAIL,contactDraft} from './contact-info.js?v=20261003-ux2';
import {trackOverlay} from './overlay-navigation.js';

export class ContactDialog {
 constructor(){
  this.dialog=document.createElement('dialog');this.dialog.className='contact-dialog';this.dialog.setAttribute('aria-labelledby','contact-title');
  this.dialog.innerHTML=`<header><span id="contact-kicker"></span><button class="contact-close" aria-label="문의 안내 닫기">닫기 ×</button></header><h2 id="contact-title"></h2><div id="contact-content"></div><div class="contact-address"><span>접수 이메일</span><strong>${CONTACT_EMAIL}</strong><button id="copy-contact-email">주소 복사</button></div><a id="contact-mail" class="contact-primary">이메일 작성하기 ↗</a><p class="contact-status" id="contact-status" role="status">이메일 앱에서 내용을 확인하고 직접 전송해 주세요.</p>`;
  document.body.append(this.dialog);
  this.dialog.querySelector('.contact-close').onclick=()=>this.dialog.close();
  this.dialog.addEventListener('close',()=>{document.body.classList.remove('contact-open');this.opener?.focus({preventScroll:true});this.leaveHistory?.();});
  const preview=document.createElement('details');preview.className='contact-draft';preview.innerHTML='<summary>보낼 내용 확인·복사</summary><textarea readonly aria-label="문의 이메일 초안"></textarea><button type="button">내용 복사</button>';
  this.dialog.querySelector('#contact-mail').before(preview);
  preview.querySelector('button').onclick=async()=>{
   const field=preview.querySelector('textarea');
   try{await navigator.clipboard.writeText(field.value);this.dialog.querySelector('#contact-status').textContent='신청 내용을 복사했습니다. 사용하시는 메일에 붙여 넣어 보내 주세요.';}
   catch{field.focus();field.select();this.dialog.querySelector('#contact-status').textContent='선택된 내용을 직접 복사해 주세요.';}
  };
  this.dialog.querySelector('#copy-contact-email').onclick=async()=>{
   try{await navigator.clipboard.writeText(CONTACT_EMAIL);this.dialog.querySelector('#contact-status').textContent='이메일 주소를 복사했습니다.';}
   catch{this.dialog.querySelector('#contact-status').textContent='주소를 길게 누르거나 선택해 복사해 주세요.';}
  };
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-contact-kind]');if(trigger){event.preventDefault();this.open(trigger.dataset.contactKind,trigger);}});
 }
 open(kind,opener,record){
  const advertising=kind==='advertising',draft=contactDraft(kind,record);this.opener=opener;
  this.dialog.querySelector('#contact-kicker').textContent=advertising?'AD / PARTNERSHIP':'YOUR RECORD, SEEN WORLDWIDE';
  this.dialog.querySelector('#contact-title').textContent=advertising?'이 자리에, 당신의 브랜드를.':'인증하면, 전 세계가 내 탑을 봅니다.';
  this.dialog.querySelector('#contact-content').innerHTML=advertising?
   '<p>전문의 랭킹 사이의 한 줄 광고로 브랜드를 소개하세요.</p><ul><li>브랜드명과 소개할 제품·서비스</li><li>연결할 링크와 희망 노출 기간</li><li>담당자 연락처와 문의 내용</li></ul><p class="contact-fine">광고는 AD로 구분하며, 전문의 순위나 인증 상태에 영향을 주지 않습니다.</p>':
   '<div class="contact-visibility"><div><span>인증 전</span><strong>랭킹 목록에만</strong><small>등록이 반영된 미인증 기록</small></div><div><span>인증 완료 ✓</span><strong>전 세계에 공개되는 내 탑</strong><small>공개 3D 공간 + 파란 인증 배지</small></div></div><p>기록만 먼저 등록할 수도 있어요. 공개할 이름·소속과 집계 기록을 보내고, 인증을 원하면 아래 자료를 함께 첨부해 주세요.</p><ol><li><strong>전문의 자격 확인 자료</strong></li><li><strong>CRM 등 객관적 집계 기록</strong><br>집계 기간, 수술 건수, 규격·타입별 진피 사용 장수</li></ol><p class="contact-fine">환자별 원본 대신 집계 자료를 보내 주세요. 환자명·연락처·주민번호 등 불필요한 개인정보는 가려 주세요.</p><p class="contact-process">메일 접수 → 운영자 자료 확인 → 사이트 반영<br>서류를 보냈다고 즉시 인증되거나 공개되지는 않습니다.</p>';
  const mail=this.dialog.querySelector('#contact-mail');mail.href=draft.href;mail.textContent=advertising?'광고 문의 이메일 작성 ↗':'기록 등록·인증 이메일 작성 ↗';
  this.dialog.querySelector('.contact-draft').open=!!record;
  this.dialog.querySelector('textarea').value=`제목: ${draft.subject}\n\n${draft.body}`;
  this.dialog.querySelector('#contact-status').textContent='이메일 앱에서 내용을 확인하고 직접 전송해 주세요.';
  this.leaveHistory=trackOverlay(()=>this.dialog.close());this.dialog.showModal();this.dialog.scrollTop=0;document.body.classList.add('contact-open');this.dialog.querySelector('.contact-close').focus({preventScroll:true});
 }
}
