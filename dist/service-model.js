import {blankDraft,validateDraft,materialTotals,readCount} from './draft-record.js?v=20261005-records';
export const STATUS={draft:'작성 중',submitted:'심사 대기',changes_requested:'보완 요청',approved:'반영 완료',rejected:'반려',withdrawn:'신청 철회'};
export const EDITABLE=['draft','changes_requested'];
export const EVIDENCE_KINDS={credential:'전문의 자격 확인 자료',records:'직접 집도 건수 집계 기록'};
export const MAX_FILE_SIZE=10*1024*1024;
export function submissionPayload(draft,periodEnd,verificationRequested){
 const errors=validateDraft(draft),today=new Date().toISOString().slice(0,10);
 const timestamp=Date.parse(periodEnd),validDate=Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===periodEnd;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)||periodEnd>today||periodEnd<'1900-01-01'||!validDate)errors.period_end='오늘 또는 이전의 올바른 집계 기준일을 선택해 주세요.';
 if(Object.keys(errors).length)return {errors};
 const clean=blankDraft();
 // Legacy material fields are retained only for stored drafts, never inferred from cases.
 for(const key of Object.keys(clean.materials))clean.materials[key]=readCount(draft.materials?.[key]);
 return {errors:{},payload:{display_name:draft.name.trim(),clinic:draft.clinic.trim(),country:draft.country,cases:readCount(draft.cases),materials:clean.materials,period_end:periodEnd,verification_requested:!!verificationRequested}};
}
export function toDraft(row){return row?{name:row.display_name,clinic:row.clinic,country:row.country,cases:String(row.cases),materials:{...blankDraft().materials,...Object.fromEntries(Object.entries(row.materials??{}).map(([k,v])=>[k,String(v)]))}}:blankDraft();}
export function evidenceError(file){
 if(!file||!['application/pdf','image/jpeg','image/png'].includes(file.type))return 'PDF, JPG, PNG 파일만 사용할 수 있습니다.';
 if(file.size<1||file.size>MAX_FILE_SIZE)return '파일 하나당 10MB 이하로 준비해 주세요.';
 return '';
}
export function canSubmit(row,documents){
 if(!EDITABLE.includes(row?.status))return '작성 중이거나 보완 요청된 기록만 제출할 수 있습니다.';
 if(row.verification_requested&&Object.keys(EVIDENCE_KINDS).some(kind=>!documents.some(d=>d.kind===kind)))return '전문의 자격 자료와 객관적 집계 기록을 각각 첨부해 주세요.';
 return '';
}
export function reviewError(row,decision,note,credential,records){
 if(row?.status!=='submitted')return '이미 처리된 신청입니다. 목록을 새로고침해 주세요.';
 if(!['approved','changes_requested','rejected'].includes(decision))return '심사 결과를 선택해 주세요.';
 if(decision!=='approved'&&String(note).trim().length<3)return '신청자가 확인할 구체적인 사유를 입력해 주세요.';
 if(decision==='approved'&&row.verification_requested&&(!credential||!records))return '전문의 자격과 객관적 기록을 모두 확인한 후 인증할 수 있습니다.';
 return '';
}
export function publicRecord(row){
 return {id:row.id,name:row.display_name,initials:row.display_name.slice(0,2),clinic:row.clinic,country:row.country,countryName:({KR:'대한민국',US:'미국',JP:'일본'})[row.country],cases:Number(row.cases),length:Number(row.length_m),sheets:Number(row.sheets),verification:row.verification,verifiedAt:row.verified_at,periodEnd:row.period_end,updatedAt:row.updated_at};
}
export function materialSummary(row){return materialTotals(row?.materials??{});}
