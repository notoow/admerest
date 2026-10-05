import {SIZES,MAX_QUANTITY,recordHeightMeters} from './measurements.js';

export const DRAFT_KEY='admerest.record-draft.v1';
export const COUNTRIES={KR:'대한민국',US:'미국',JP:'일본'};
export const TYPES={hydrated:'수화 타입',dry:'건조 타입'};
export const materialKey=(size,type)=>`${size}-${type}`;
const keys=Object.keys(SIZES).flatMap(size=>Object.keys(TYPES).map(type=>materialKey(size,type)));
export function blankDraft(){return {name:'',clinic:'',country:'KR',cases:'',materials:Object.fromEntries(keys.map(key=>[key,'']))};}
export function readCount(raw,blankIsZero=true){
 const text=String(raw??'').trim();
 if(!text)return blankIsZero?0:null;
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text))return null;
 const n=Number(text.replaceAll(',',''));return Number.isSafeInteger(n)&&n>=0&&n<=MAX_QUANTITY?n:null;
}
export function materialTotals(materials={}){
 let sheets=0,centimeters=0;const rows=[];
 for(const [size,dimensions]of Object.entries(SIZES)){
  const hydrated=readCount(materials[materialKey(size,'hydrated')]),dry=readCount(materials[materialKey(size,'dry')]);
  if(hydrated===null||dry===null)return null;
  const count=hydrated+dry;rows.push({size,hydrated,dry,sheets:count,length:count*dimensions.length/100});sheets+=count;centimeters+=count*dimensions.length;
 }
 return {sheets,length:centimeters/100,rows};
}
export function validateDraft(draft,step=2){
 const errors={},name=String(draft.name??'').trim(),clinic=String(draft.clinic??'').trim(),cases=readCount(draft.cases,false);
 if(!name||name.length>40)errors.name='표시 이름을 1–40자로 입력해 주세요.';
 if(clinic.length>80)errors.clinic='소속은 80자 이내로 입력해 주세요.';
 if(!Object.hasOwn(COUNTRIES,draft.country))errors.country='국적을 선택해 주세요.';
 if(cases===null||cases<1)errors.cases='수술 건수를 1–100,000 사이의 정수로 입력해 주세요.';
 if(step>=2){
  for(const key of keys)if(readCount(draft.materials?.[key])===null)errors[key]='0–100,000 사이의 정수를 입력해 주세요.';
  const totals=materialTotals(draft.materials);
  if(totals&&totals.sheets>MAX_QUANTITY)errors.materials='미리보기는 전체 진피 100,000장까지 지원합니다.';
 }
 return errors;
}
export function previewRecord(draft){
 const errors=validateDraft(draft);if(Object.keys(errors).length)return {errors,record:null};
 const totals=materialTotals(draft.materials);
 return {errors:{},record:{id:'local-preview',name:draft.name.trim(),clinic:draft.clinic.trim(),country:draft.country,countryName:COUNTRIES[draft.country],cases:readCount(draft.cases,false),length:recordHeightMeters(readCount(draft.cases,false)),sheets:totals.sheets,verification:'none',preview:true}};
}
// Persist only editable aggregate fields. Imported/local values cannot grant verification.
export function draftEnvelope(draft){
 const clean=blankDraft();clean.name=String(draft.name??'').slice(0,40);clean.clinic=String(draft.clinic??'').slice(0,80);clean.country=Object.hasOwn(COUNTRIES,draft.country)?draft.country:'KR';clean.cases=String(draft.cases??'').slice(0,12);
 for(const key of keys)clean.materials[key]=String(draft.materials?.[key]??'').slice(0,12);
 return {version:1,draft:clean};
}
export function restoreDraft(json){
 try{if(typeof json!=='string'||json.length>6000)return null;const value=JSON.parse(json);if(value.version!==1||!value.draft||typeof value.draft!=='object')return null;return draftEnvelope(value.draft).draft;}catch{return null;}
}
