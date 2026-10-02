import {BACKEND} from './backend-config.js';
import {createClient} from './vendor/supabase.js';
import {publicRecord,evidenceError} from './service-model.js';
import {submissionListRequest} from './service-queries.js';
export const configured=!!(BACKEND.url&&BACKEND.publishableKey);
export const registrationOpen=configured&&BACKEND.registrationOpen;
let client;
export function backend(){
 if(!configured)throw new Error('온라인 접수를 준비 중입니다. 운영 시연 또는 이메일 신청을 이용해 주세요.');
 return client??=createClient(BACKEND.url,BACKEND.publishableKey,{auth:{flowType:'pkce',storageKey:'admerest.auth',persistSession:true,detectSessionInUrl:true}});
}
function unwrap({data,error}){if(error)throw error;return data;}
export function friendlyError(error){
 const code=error?.code,text=error?.message??'';
 if(code==='23505')return '작성 중이거나 심사 중인 신청이 이미 있습니다. 내 신청을 새로고침해 주세요.';
 if(code==='42501'||text.includes('row-level security'))return '접근 권한이 없습니다. 로그인 상태를 확인해 주세요.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
 if(code==='email_address_not_authorized')return '로그인 메일 발송 설정을 준비 중입니다. 이메일 문의를 이용해 주세요.';
 if(text.includes('Failed to fetch')||text.includes('Network'))return '연결이 끊겼습니다. 입력을 유지하고 있으니 다시 시도해 주세요.';
 if(text.includes('locked')||text.includes('pending')||text.includes('Independent'))return '이미 처리됐거나 현재 계정으로 처리할 수 없는 신청입니다. 새로고침해 주세요.';
 return text||'요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
export async function session(){if(!configured)return null;return unwrap(await backend().auth.getSession()).session;}
export async function signIn(email){
 if(!registrationOpen)throw new Error('온라인 접수 개설 후 로그인할 수 있습니다. 지금은 운영 시연을 이용해 주세요.');
 unwrap(await backend().auth.signInWithOtp({email,options:{emailRedirectTo:new URL('./account.html',location.href).href}}));
}
export async function signOut(){unwrap(await backend().auth.signOut({scope:'local'}));}
export async function reviewerAccess(){return !!unwrap(await backend().rpc('admerest_reviewer_access'));}
export async function publicRecords(){
 if(!configured)return [];
 // Fetch in pages; do not silently stop at the API's default row limit.
 const rows=[];for(let offset=0;;offset+=500){const page=unwrap(await backend().from('admerest_public_records').select('*').order('cases',{ascending:false}).order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(12000)));rows.push(...page);if(page.length<500)break;}
 return rows.map(publicRecord);
}
export async function listSubmissions(offset=0,ownerId=null){return unwrap(await submissionListRequest(backend(),{offset,ownerId}).abortSignal(AbortSignal.timeout(12000)));}
export async function saveSubmission(payload,row){
 const request=row?backend().from('admerest_submissions').update(payload).eq('id',row.id).eq('version',row.version):backend().from('admerest_submissions').insert(payload);
 const result=unwrap(await request.select().maybeSingle());if(!result)throw new Error('다른 화면에서 기록이 변경됐습니다. 새로고침 후 다시 확인해 주세요.');return result;
}
export async function documents(id){return unwrap(await backend().from('admerest_documents').select('*').eq('submission_id',id).order('created_at'));}
export async function events(id){return unwrap(await backend().from('admerest_review_events').select('*').eq('submission_id',id).order('created_at'));}
export async function uploadEvidence(row,kind,file){
 const problem=evidenceError(file);if(problem)throw new Error(problem);
 const user=(await session())?.user;if(!user)throw new Error('다시 로그인해 주세요.');
 const ext=({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'})[file.type];
 const path=`${user.id}/${row.id}/${crypto.randomUUID()}.${ext}`;
 unwrap(await backend().storage.from('admerest-evidence').upload(path,file,{contentType:file.type,upsert:false}));
 try{return unwrap(await backend().from('admerest_documents').insert({submission_id:row.id,kind,object_path:path,filename:file.name.slice(0,180),mime_type:file.type,size_bytes:file.size}).select().single());}
 catch(error){await backend().storage.from('admerest-evidence').remove([path]);throw error;}
}
export async function removeEvidence(document){
 unwrap(await backend().from('admerest_documents').delete().eq('id',document.id));
 unwrap(await backend().storage.from('admerest-evidence').remove([document.object_path]));
}
export async function evidenceURL(document){return unwrap(await backend().storage.from('admerest-evidence').createSignedUrl(document.object_path,60)).signedUrl;}
export async function hideRecord(){unwrap(await backend().rpc('admerest_hide_my_record'));}
export async function myPublicRecord(){const rows=unwrap(await backend().rpc('admerest_my_public_record').abortSignal(AbortSignal.timeout(12000)));return rows[0]?publicRecord(rows[0]):null;}
