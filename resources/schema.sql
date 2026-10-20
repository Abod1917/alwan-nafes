-- مخطط قاعدة بيانات تنمية الموارد (مشروع Supabase: mishkah-resources)
create table public.records (
  id uuid primary key default gen_random_uuid(),
  collection text not null,            -- اسم الجدول/النموذج: targets, contracts, oct-visits ...
  key text,                            -- للإجابات وقوائم المراجعة (رقم البند)
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index records_collection_key_uq on public.records (collection, key) where key is not null;
create index records_collection_idx on public.records (collection, created_at);

create or replace function public.touch_record() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger records_touch before update on public.records
  for each row execute function public.touch_record();

alter table public.records enable row level security;
-- الوصول لأعضاء اللجنة فقط: العلامة في app_metadata يضعها المسؤول ولا يعدّلها المستخدم
create policy "committee read" on public.records for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'committee') = 'true');
create policy "committee insert" on public.records for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'committee') = 'true');
create policy "committee update" on public.records for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'committee') = 'true')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'committee') = 'true');
create policy "committee delete" on public.records for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'committee') = 'true');
