export const CONTACT_EMAIL='antcow0706@gmail.com';
export function contactDraft(kind,record){
 const advertising=kind==='advertising';
 const subject=advertising?'[admerest] 광고·제휴 문의':'[admerest] 기록 등록·전문의 인증 신청';
 let body=advertising?
  '안녕하세요. admerest 광고·제휴를 문의드립니다.\n\n브랜드 / 회사명: \n담당자 / 회신 주소: \n광고 내용과 링크: \n희망 기간: \n문의 사항: \n':
  '안녕하세요. admerest 기록 등록·전문의 인증을 신청합니다.\n\n신청 유형: 기록 등록만 / 인증도 함께\n공개할 이름: \n소속: \n국적: \n회신 주소: \n총 수술 케이스: \n집계 기간: \n규격·타입별 진피 사용 장수: \n\n인증 신청 시 첨부 자료\n1. 전문의 자격 확인 자료\n2. CRM 등 수술 건수·사용 장수를 확인할 객관적 집계 자료\n\n환자명·연락처·주민번호 등 불필요한 개인정보를 가리고, 환자별 원본 대신 집계 자료만 첨부해 주세요.\n자료 확인과 사이트 반영은 운영자가 진행합니다.\n';
 if(!advertising&&record){
  const text=(value,max)=>String(value??'').replace(/[\r\n]/g,' ').slice(0,max);
  const countries={KR:'대한민국',US:'미국',JP:'일본'};
  const rows=['5x6','5x8','5x10','6x12'].flatMap(size=>['hydrated','dry'].map(type=>`${size.replace('x',' × ')} cm · ${type==='hydrated'?'수화':'건조'}: ${text(record.materials?.[`${size}-${type}`]||'0',12)}장`));
  body=body.replace('공개할 이름: ',`공개할 이름: ${text(record.name,40)}`).replace('소속: ',`소속: ${text(record.clinic,80)}`).replace('국적: ',`국적: ${countries[record.country]??''}`).replace('총 수술 케이스: ',`총 수술 케이스: ${text(record.cases,12)}건`).replace('규격·타입별 진피 사용 장수: ',`규격·타입별 진피 사용 장수:\n${rows.join('\n')}`);
 }
 return {subject,body,href:`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}
