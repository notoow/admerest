import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {submissionListRequest} from '../dist/service-queries.js';

test('a reviewer finds their own older application despite 100 newer applications',async()=>{
 const own={id:'mine',owner_id:'reviewer',created_at:'2026-01-01',status:'submitted'};
 const records=[...Array.from({length:101},(_,i)=>({id:`other-${i}`,owner_id:'another-owner',created_at:'2026-02-01'})),own];
 const requests=[];
 const client=createClient('https://admerest-test.invalid','test-publishable-key',{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:async(input)=>{
   const url=new URL(input);requests.push(url);
   assert.equal(url.pathname,'/rest/v1/admerest_submissions');
   const owner=url.searchParams.get('owner_id')?.replace(/^eq\./,'');
   const matching=owner?records.filter(row=>row.owner_id===owner):records;
   const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));
   return new Response(JSON.stringify(matching.slice(offset,offset+limit)),{headers:{'Content-Type':'application/json'}});
  }}
 });
 const personal=await submissionListRequest(client,{ownerId:'reviewer'});
 assert.equal(personal.error,null);assert.deepEqual(personal.data,[own]);
 const queue=await submissionListRequest(client);
 assert.equal(queue.data.length,100);assert(!queue.data.some(row=>row.id==='mine'));
 const older=await submissionListRequest(client,{offset:100});
 assert.deepEqual(older.data.map(row=>row.id),['other-100','mine']);
 assert.equal(requests[0].searchParams.get('owner_id'),'eq.reviewer');
 assert.equal(requests[1].searchParams.get('owner_id'),null);
 assert.equal(requests[0].searchParams.get('order'),'created_at.desc,id.asc');
});
