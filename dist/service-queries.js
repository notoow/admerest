// Filter at the database before applying the page limit. Reviewers can read
// other applications, but their personal dashboard must still load only theirs.
export function submissionListRequest(client,{offset=0,ownerId=null}={}){
 let request=client.from('admerest_submissions').select('*');
 if(ownerId)request=request.eq('owner_id',ownerId);
 return request.order('created_at',{ascending:false}).order('id').range(offset,offset+99);
}
