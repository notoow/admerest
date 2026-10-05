export const CONTACT_EMAIL='antcow0706@gmail.com';
export function contactDraft(kind,record){
 const advertising=kind==='advertising';
 const subject=advertising?'[admerest] 광고·제휴 문의':'[admerest] 기록 등록·전문의 인증 신청';
 let body=advertising?
  '안녕하세요. admerest 광고·제휴를 문의드립니다.\n\n브랜드 / 회사명: \n담당자 / 회신 주소: \n광고 내용과 링크: \n희망 기간: \n문의 사항: \n':
  '안녕하세요. admerest 기록 등록·전문의 인증을 신청합니다.\n\n신청 유형: 기록 등록만 / 인증도 함께\n공개할 이름: \n소속: \n국적: \n회신 주소: \n직접 집도 건수: \n집계 기간: \n\n인증 신청 시 첨부 자료\n1. 전문의 자격 확인 자료\n2. CRM 등 집도 건수를 확인할 객관적 집계 자료\n\n환자명·연락처·주민번호 등 불필요한 개인정보를 가리고, 환자별 원본 대신 집계 자료만 첨부해 주세요.\n자료 확인과 사이트 반영은 운영자가 진행합니다.\n';
 if(!advertising&&record){
  const text=(value,max)=>String(value??'').replace(/[\r\n]/g,' ').slice(0,max);
  const countries={KR:'대한민국',US:'미국',JP:'일본'};
  body=body.replace('공개할 이름: ',`공개할 이름: ${text(record.name,40)}`).replace('소속: ',`소속: ${text(record.clinic,80)}`).replace('국적: ',`국적: ${countries[record.country]??''}`).replace('직접 집도 건수: ',`직접 집도 건수: ${text(record.cases,12)}건`);
 }
 return {subject,body,href:`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}
