-- Immutable published snapshots; edits are reviewed separately. No patient records.
create schema if not exists admerest_private;
revoke all on schema admerest_private from public, anon, authenticated;
grant usage on schema admerest_private to authenticated;

create table admerest_private.reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table admerest_private.reviewers enable row level security;
create function admerest_private.is_reviewer() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from admerest_private.reviewers where user_id=auth.uid());
$$;
revoke all on function admerest_private.is_reviewer() from public, anon;
grant execute on function admerest_private.is_reviewer() to authenticated;
create function public.admerest_reviewer_access() returns boolean
language sql stable security invoker set search_path = '' as $$select admerest_private.is_reviewer();$$;
revoke all on function public.admerest_reviewer_access() from public, anon;
grant execute on function public.admerest_reviewer_access() to authenticated;

create function admerest_private.material_sheets(data jsonb) returns integer
language plpgsql immutable set search_path = '' as $$
declare item record; total integer:=0;
begin
 if jsonb_typeof(data) is distinct from 'object' or (select count(*) from jsonb_object_keys(data))<>8 then raise exception 'Eight material counts are required'; end if;
 for item in select * from jsonb_each(data) loop
  if item.key !~ '^(5x6|5x8|5x10|6x12)-(hydrated|dry)$' or jsonb_typeof(item.value)<>'number' or item.value::text !~ '^[0-9]{1,6}$' then raise exception 'Invalid material count'; end if;
  total:=total+(item.value::text)::integer;
 end loop;
 if total<1 or total>100000 then raise exception 'Material total must be 1 to 100000'; end if;
 return total;
end;$$;
create function admerest_private.material_length(data jsonb) returns numeric
language sql immutable set search_path = '' as $$
 select sum((value::text)::numeric * (split_part(split_part(key,'-',1),'x',2))::numeric)/100 from jsonb_each(data);
$$;
revoke all on function admerest_private.material_sheets(jsonb),admerest_private.material_length(jsonb) from public,anon;
grant execute on function admerest_private.material_sheets(jsonb),admerest_private.material_length(jsonb) to authenticated;

create table public.admerest_submissions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 1 and 40), clinic text not null default '' check(length(clinic)<=80),
 country text not null check(country in ('KR','US','JP')), cases integer not null check(cases between 1 and 100000),
 materials jsonb not null, sheets integer generated always as (admerest_private.material_sheets(materials)) stored,
 length_m numeric generated always as (admerest_private.material_length(materials)) stored,
 period_end date not null check(period_end>='1900-01-01'), verification_requested boolean not null default false,
 status text not null default 'draft' check(status in ('draft','submitted','changes_requested','approved','rejected','withdrawn')),
 version integer not null default 1, review_note text not null default '' check(length(review_note)<=2000),
 credential_checked boolean not null default false, records_checked boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), submitted_at timestamptz, reviewed_at timestamptz
);
create unique index admerest_one_open_submission on public.admerest_submissions(owner_id) where status in ('draft','submitted','changes_requested');
create index admerest_submission_owner on public.admerest_submissions(owner_id,created_at desc);
create index admerest_review_queue on public.admerest_submissions(status,submitted_at);
alter table public.admerest_submissions enable row level security;
grant select,insert,update on public.admerest_submissions to authenticated;
revoke all on public.admerest_submissions from anon;
create policy submissions_read on public.admerest_submissions for select to authenticated using(owner_id=(select auth.uid()) or (select admerest_private.is_reviewer()));
create policy submissions_insert on public.admerest_submissions for insert to authenticated with check(owner_id=(select auth.uid()));
create policy submissions_update on public.admerest_submissions for update to authenticated using(owner_id=(select auth.uid()) or (select admerest_private.is_reviewer())) with check(owner_id=(select auth.uid()) or (select admerest_private.is_reviewer()));

create table public.admerest_documents (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.admerest_submissions(id) on delete cascade,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check(kind in ('credential','records')), object_path text not null unique,
 filename text not null check(length(filename) between 1 and 180), mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 size_bytes integer not null check(size_bytes between 1 and 10485760), created_at timestamptz not null default now(), unique(submission_id,kind)
);
alter table public.admerest_documents enable row level security;
grant select,insert,delete on public.admerest_documents to authenticated;
revoke all on public.admerest_documents from anon;
create index admerest_documents_owner on public.admerest_documents(owner_id);
create policy documents_read on public.admerest_documents for select to authenticated using(owner_id=(select auth.uid()) or (select admerest_private.is_reviewer()));
create policy documents_insert on public.admerest_documents for insert to authenticated with check(
 owner_id=(select auth.uid()) and object_path like owner_id::text||'/'||submission_id::text||'/%'
 and exists(select 1 from public.admerest_submissions s where s.id=submission_id and s.owner_id=(select auth.uid()) and s.status in ('draft','changes_requested'))
);
create policy documents_delete on public.admerest_documents for delete to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.admerest_submissions s where s.id=submission_id and s.status in ('draft','changes_requested')));

create table public.admerest_public_records (
 id uuid primary key default gen_random_uuid(), display_name text not null, clinic text not null, country text not null,
 cases integer not null, sheets integer not null, length_m numeric not null, period_end date not null,
 verification text not null check(verification in ('none','verified')), verified_at timestamptz,
 updated_at timestamptz not null default now(), published boolean not null default true
);
alter table public.admerest_public_records enable row level security;
grant select on public.admerest_public_records to anon,authenticated;
revoke insert,update,delete on public.admerest_public_records from anon,authenticated;
create policy published_records on public.admerest_public_records for select to anon,authenticated using(published);
create index admerest_public_ranking on public.admerest_public_records(cases desc,id) where published;
create table admerest_private.publication_owners (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 record_id uuid not null unique references public.admerest_public_records(id) on delete cascade,
 submission_id uuid not null references public.admerest_submissions(id)
);
alter table admerest_private.publication_owners enable row level security;

create table public.admerest_review_events (
 id bigint generated always as identity primary key, submission_id uuid not null references public.admerest_submissions(id) on delete cascade,
 status text not null, note text not null default '', created_at timestamptz not null default now()
);
alter table public.admerest_review_events enable row level security;
grant select on public.admerest_review_events to authenticated;
revoke insert,update,delete on public.admerest_review_events from anon,authenticated;
create index admerest_events_submission on public.admerest_review_events(submission_id,created_at);
create policy events_read on public.admerest_review_events for select to authenticated using(exists(select 1 from public.admerest_submissions s where s.id=submission_id and (s.owner_id=(select auth.uid()) or (select admerest_private.is_reviewer()))));

-- RLS controls rows; this trigger controls transitions and immutable privileged columns.
create function admerest_private.guard_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare is_owner boolean; is_review boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if new.period_end>current_date then raise exception 'Future reporting dates are not allowed'; end if;
 if tg_op='INSERT' then
  if new.owner_id<>auth.uid() or new.status<>'draft' or new.review_note<>'' or new.credential_checked or new.records_checked then raise exception 'Invalid initial submission'; end if;
  new.version:=1; new.created_at:=now(); new.updated_at:=now(); new.submitted_at:=null; new.reviewed_at:=null;
  return new;
 end if;
 if new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'Immutable identity'; end if;
 is_owner:=old.owner_id=auth.uid(); is_review:=admerest_private.is_reviewer() and not is_owner;
 if is_owner then
  if new.review_note<>old.review_note or new.credential_checked<>old.credential_checked or new.records_checked<>old.records_checked or new.reviewed_at is distinct from old.reviewed_at then raise exception 'Only a reviewer can change review fields'; end if;
  if old.status not in ('draft','changes_requested') and not(old.status='submitted' and new.status='withdrawn') then raise exception 'This submission is locked'; end if;
  if new.status not in ('draft','submitted','changes_requested','withdrawn') or (new.status='changes_requested' and old.status<>'changes_requested') then raise exception 'Invalid owner transition'; end if;
  if old.status='submitted' and (new.display_name,new.clinic,new.country,new.cases,new.materials,new.period_end,new.verification_requested) is distinct from (old.display_name,old.clinic,old.country,old.cases,old.materials,old.period_end,old.verification_requested) then raise exception 'Withdraw without changing submitted data'; end if;
  if new.status='submitted' then
   if new.verification_requested and (select count(distinct d.kind) from public.admerest_documents d join storage.objects o on o.bucket_id='admerest-evidence' and o.name=d.object_path where d.submission_id=new.id)<>2 then raise exception 'Both evidence documents are required'; end if;
   new.submitted_at:=now();
  else new.submitted_at:=old.submitted_at; end if;
 elsif is_review then
  if old.status<>'submitted' or new.status not in ('approved','changes_requested','rejected') then raise exception 'Only pending submissions can be reviewed'; end if;
  if (new.display_name,new.clinic,new.country,new.cases,new.materials,new.period_end,new.verification_requested) is distinct from (old.display_name,old.clinic,old.country,old.cases,old.materials,old.period_end,old.verification_requested) then raise exception 'Reviewers cannot change submitted records'; end if;
  if new.status<>'approved' and length(trim(new.review_note))<3 then raise exception 'Review explanation is required'; end if;
  if new.status='approved' and new.verification_requested and (not new.credential_checked or not new.records_checked or (select count(distinct kind) from public.admerest_documents where submission_id=new.id)<>2) then raise exception 'Verification requires credentials and objective records'; end if;
  new.reviewed_at:=now(); new.submitted_at:=old.submitted_at;
 else raise exception 'Review access denied'; end if;
 new.version:=old.version+1; new.created_at:=old.created_at; new.updated_at:=now(); return new;
end;$$;
revoke all on function admerest_private.guard_submission() from public,anon,authenticated;
create trigger admerest_guard before insert or update on public.admerest_submissions for each row execute function admerest_private.guard_submission();

create function admerest_private.publish_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare public_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if tg_op='INSERT' or new.status is distinct from old.status then
  insert into public.admerest_review_events(submission_id,status,note) values(new.id,new.status,case when new.status in ('approved','changes_requested','rejected') then new.review_note else '' end);
 end if;
 if new.status='approved' and old.status='submitted' then
  if not admerest_private.is_reviewer() or new.owner_id=auth.uid() then raise exception 'Independent reviewer required'; end if;
  select record_id into public_id from admerest_private.publication_owners where owner_id=new.owner_id for update;
  if public_id is null then public_id:=gen_random_uuid(); end if;
  insert into public.admerest_public_records(id,display_name,clinic,country,cases,sheets,length_m,period_end,verification,verified_at,updated_at)
  values(public_id,new.display_name,new.clinic,new.country,new.cases,new.sheets,new.length_m,new.period_end,case when new.verification_requested then 'verified' else 'none' end,case when new.verification_requested then now() else null end,now())
  on conflict(id) do update set display_name=excluded.display_name,clinic=excluded.clinic,country=excluded.country,cases=excluded.cases,sheets=excluded.sheets,length_m=excluded.length_m,period_end=excluded.period_end,verification=excluded.verification,verified_at=excluded.verified_at,updated_at=excluded.updated_at,published=true;
  insert into admerest_private.publication_owners values(new.owner_id,public_id,new.id) on conflict(owner_id) do update set submission_id=excluded.submission_id;
 end if;
 return new;
end;$$;
revoke all on function admerest_private.publish_review() from public,anon,authenticated;
create trigger admerest_publish after insert or update on public.admerest_submissions for each row execute function admerest_private.publish_review();

-- Owner can remove their published snapshot without an admin. API wrapper is invoker.
create function admerest_private.hide_my_record() returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.admerest_public_records set published=false,updated_at=now() where id=(select record_id from admerest_private.publication_owners where owner_id=auth.uid());
end;$$;
revoke all on function admerest_private.hide_my_record() from public,anon;
grant execute on function admerest_private.hide_my_record() to authenticated;
create function public.admerest_hide_my_record() returns void language sql security invoker set search_path = '' as $$select admerest_private.hide_my_record();$$;
revoke all on function public.admerest_hide_my_record() from public,anon;
grant execute on function public.admerest_hide_my_record() to authenticated;

create function admerest_private.my_public_record() returns setof public.admerest_public_records
language sql stable security definer set search_path = '' as $$
 select r.* from public.admerest_public_records r join admerest_private.publication_owners p on p.record_id=r.id where auth.uid() is not null and p.owner_id=auth.uid() and r.published;
$$;
revoke all on function admerest_private.my_public_record() from public,anon;
grant execute on function admerest_private.my_public_record() to authenticated;
create function public.admerest_my_public_record() returns setof public.admerest_public_records language sql stable security invoker set search_path = '' as $$select * from admerest_private.my_public_record();$$;
revoke all on function public.admerest_my_public_record() from public,anon;
grant execute on function public.admerest_my_public_record() to authenticated;

-- Files are private, with a narrowly limited path and no overwrite permission.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admerest-evidence','admerest-evidence',false,10485760,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy admerest_evidence_upload on storage.objects for insert to authenticated with check(
 bucket_id='admerest-evidence' and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.admerest_submissions s where s.id::text=split_part(name,'/',2) and s.owner_id=(select auth.uid()) and s.status in ('draft','changes_requested'))
);
create policy admerest_evidence_read on storage.objects for select to authenticated using(
 bucket_id='admerest-evidence' and (split_part(name,'/',1)=(select auth.uid())::text or (select admerest_private.is_reviewer()))
);
create policy admerest_evidence_delete on storage.objects for delete to authenticated using(
 bucket_id='admerest-evidence' and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.admerest_submissions s where s.id::text=split_part(name,'/',2) and s.owner_id=(select auth.uid()) and s.status in ('draft','changes_requested'))
 and not exists(select 1 from public.admerest_documents d where d.object_path=name)
);

-- Evidence metadata must name a real uploaded object. Serializes against submit/review.
create function admerest_private.guard_document() returns trigger
language plpgsql security definer set search_path = '' as $$
declare item public.admerest_submissions; path text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into item from public.admerest_submissions where id=coalesce(new.submission_id,old.submission_id) for update;
 if item.owner_id is distinct from auth.uid() or item.status not in ('draft','changes_requested') then raise exception 'Evidence is locked'; end if;
 if tg_op='INSERT' then
  path:=new.object_path;
  if new.owner_id<>auth.uid() or path not like auth.uid()::text||'/'||item.id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='admerest-evidence' and name=path) then raise exception 'Uploaded evidence not found'; end if;
  new.created_at:=now(); return new;
 end if;
 return old;
end;$$;
revoke all on function admerest_private.guard_document() from public,anon,authenticated;
create trigger admerest_document_guard before insert or delete on public.admerest_documents for each row execute function admerest_private.guard_document();
