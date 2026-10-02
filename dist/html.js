export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const formatNumber=value=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(Number(value)||0);
export function formatDate(value){return value?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium'}).format(new Date(value)):'—';}
