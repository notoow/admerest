import {isTowerPublished} from './records.js';

export function filterRanking(records,{country='all',verifiedOnly=false}={}){
 return records.filter(record=>(country==='all'||record.country===country)&&(!verifiedOnly||isTowerPublished(record)));
}

// Ads are presentation rows, never records: ranks and aggregate counts stay intact.
export function rankingRows(records){
 return records.flatMap((record,index)=>{
  const rows=[{type:'record',record}];
  if((index+1)%2===0&&index<records.length-1)rows.push({type:'advertisement',slot:`after-${record.id}`});
  return rows;
 });
}
