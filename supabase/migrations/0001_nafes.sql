-- نافس باجتهاد — قاعدة البيانات (Supabase / Postgres)
-- كل الوصول يمر عبر دوال RPC (security definer) تتحقق من رمز الجلسة؛ الجداول مغلقة تمامًا أمام المفتاح العام.

create extension if not exists pgcrypto with schema extensions;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create sequence public.nafes_username_seq start 1001;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pin_hash text not null,
  role text not null check (role in ('admin', 'parent', 'student')),
  family_id uuid references public.families(id) on delete cascade,
  student_id text,                -- للطالب: معرّف سجل الطالب
  name text not null,
  relationship text,              -- لولي الأمر: صفة القرابة
  phone text,
  link_code text unique,          -- للطالب: رمز ربط ولي الأمر
  active boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_login timestamptz
);
create index accounts_family_idx on public.accounts(family_id);

create table public.sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '90 days'
);
create index sessions_account_idx on public.sessions(account_id);

-- سجلات مرنة: student | task | exam | log | goal | part | agreement (مرتبطة بأسرة)
-- و challenge | content | settings (عامة، family_id = null)
create table public.records (
  id text primary key,
  family_id uuid references public.families(id) on delete cascade,
  student_id text,
  kind text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index records_family_idx on public.records(family_id);
create index records_student_idx on public.records(student_id);

alter table public.families enable row level security;
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.records enable row level security;
revoke all on public.families, public.accounts, public.sessions, public.records from anon, authenticated;
revoke all on sequence public.nafes_username_seq from anon, authenticated;

/* ---------- دوال داخلية ---------- */
create or replace function public._nafes_me(p_token text) returns public.accounts
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts;
begin
  select ac.* into a from public.sessions s join public.accounts ac on ac.id = s.account_id
   where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and s.expires_at > now();
  if a.id is null then raise exception 'NAFES_AUTH'; end if;
  if not a.active then raise exception 'NAFES_AUTH'; end if;
  return a;
end $$;

create or replace function public._nafes_session(p_account uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  delete from public.sessions where expires_at < now();
  insert into public.sessions(token_hash, account_id) values (encode(digest(t, 'sha256'), 'hex'), p_account);
  return t;
end $$;

create or replace function public._nafes_check_pin(p_pin text) returns void
language plpgsql set search_path = public as $$
begin
  if coalesce(p_pin, '') !~ '^[0-9]{4,8}$' then raise exception 'الرقم السري يجب أن يكون من 4 إلى 8 أرقام'; end if;
end $$;

create or replace function public._nafes_code() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(chars, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1); end loop;
    exit when not exists (select 1 from public.accounts where link_code = c);
  end loop;
  return c;
end $$;

create or replace function public._nafes_pub(ac public.accounts) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', ac.id, 'username', ac.username, 'role', ac.role, 'name', ac.name,
    'relationship', ac.relationship, 'phone', ac.phone, 'familyId', ac.family_id, 'studentId', ac.student_id,
    'linkCode', ac.link_code, 'active', ac.active, 'createdAt', ac.created_at, 'lastLogin', ac.last_login)
$$;

create or replace function public._nafes_new_student(p_fam uuid, p jsonb) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare sid text := 'st_' || substr(md5(gen_random_uuid()::text), 1, 12);
begin
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'اسم الطالب مطلوب'; end if;
  insert into public.records(id, family_id, student_id, kind, data) values (sid, p_fam, sid, 'student',
    jsonb_build_object('id', sid, 'familyId', p_fam::text, 'name', left(trim(p->>'name'), 60),
      'grade', left(coalesce(p->>'grade', ''), 40),
      'age', case when coalesce(p->>'age', '') ~ '^[0-9]{1,2}$' then (p->>'age')::int end,
      'school', left(coalesce(p->>'school', ''), 100),
      'goals', case when jsonb_typeof(p->'goals') = 'array' then p->'goals' else '[]'::jsonb end,
      'goalNote', left(coalesce(p->>'goalNote', ''), 200),
      'avatar', left(coalesce(p->>'avatar', '🦁'), 8),
      'targetMin', case when coalesce(p->>'targetMin', '') ~ '^[0-9]{1,3}$' then (p->>'targetMin')::int else 45 end,
      'active', true, 'createdAt', now()));
  return sid;
end $$;

create or replace function public._nafes_new_account(p_role text, p_fam uuid, p_sid text, p_name text, p_rel text, p_phone text, p_pin text)
returns public.accounts
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts;
begin
  perform public._nafes_check_pin(p_pin);
  if coalesce(trim(p_name), '') = '' then raise exception 'الاسم مطلوب'; end if;
  insert into public.accounts(username, pin_hash, role, family_id, student_id, name, relationship, phone, link_code)
  values ('NAFES' || nextval('public.nafes_username_seq'), crypt(p_pin, gen_salt('bf')), p_role, p_fam, p_sid,
          left(trim(p_name), 60), left(nullif(trim(coalesce(p_rel, '')), ''), 30), left(nullif(trim(coalesce(p_phone, '')), ''), 20),
          case when p_role = 'student' then public._nafes_code() end)
  returning * into a;
  return a;
end $$;

/* ---------- واجهة عامة ---------- */
create or replace function public.nafes_register(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r text := p->>'role'; fam uuid; sid text; a public.accounts; v_code text;
begin
  perform public._nafes_check_pin(p->>'pin');
  if r = 'student' then
    insert into public.families default values returning id into fam;
    sid := public._nafes_new_student(fam, p);
    a := public._nafes_new_account('student', fam, sid, p->>'name', null, null, p->>'pin');
  elsif r = 'parent' then
    if coalesce(trim(p->>'name'), '') = '' then raise exception 'اسم ولي الأمر مطلوب'; end if;
    v_code := upper(trim(coalesce(p->>'code', '')));
    if v_code <> '' then
      select family_id into fam from public.accounts where link_code = v_code and role = 'student';
      if fam is null then raise exception 'رمز الربط غير صحيح، تأكد منه من حساب ابنك'; end if;
    else
      insert into public.families default values returning id into fam;
      perform public._nafes_new_student(fam, p->'child');
    end if;
    a := public._nafes_new_account('parent', fam, null, p->>'name', p->>'relationship', p->>'phone', p->>'pin');
  else
    raise exception 'نوع الحساب غير صحيح';
  end if;
  return jsonb_build_object('token', public._nafes_session(a.id), 'username', a.username, 'role', a.role);
end $$;

create or replace function public.nafes_login(p_username text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts; bad constant text := 'اسم المستخدم أو الرقم السري غير صحيح';
begin
  select * into a from public.accounts where username = upper(trim(coalesce(p_username, '')));
  if a.id is null then return jsonb_build_object('error', bad); end if;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('error', 'محاولات كثيرة، حاول بعد ' || ceil(extract(epoch from a.locked_until - now()) / 60) || ' دقيقة');
  end if;
  if not a.active then return jsonb_build_object('error', 'هذا الحساب معطّل، تواصل مع إدارة الأكاديمية'); end if;
  if a.pin_hash <> crypt(coalesce(p_pin, ''), a.pin_hash) then
    update public.accounts set
      locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' else locked_until end,
      failed = case when failed + 1 >= 5 then 0 else failed + 1 end
    where id = a.id;
    return jsonb_build_object('error', bad);
  end if;
  update public.accounts set failed = 0, locked_until = null, last_login = now() where id = a.id;
  return jsonb_build_object('token', public._nafes_session(a.id), 'role', a.role, 'username', a.username);
end $$;

create or replace function public.nafes_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from public.sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function public.nafes_load(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token); recs jsonb; glob jsonb; mem jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'data', data)), '[]') into glob from public.records where family_id is null;
  if a.role = 'admin' then
    select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'data', data)), '[]') into recs from public.records where family_id is not null;
    select coalesce(jsonb_agg(public._nafes_pub(ac) order by ac.created_at desc), '[]') into mem from public.accounts ac where ac.role <> 'admin';
  elsif a.role = 'parent' then
    select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'data', data)), '[]') into recs from public.records where family_id = a.family_id;
    select coalesce(jsonb_agg(public._nafes_pub(ac)), '[]') into mem from public.accounts ac where ac.family_id = a.family_id;
  else
    select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'data', data)), '[]') into recs
      from public.records where family_id = a.family_id and student_id = a.student_id;
    select coalesce(jsonb_agg(public._nafes_pub(ac)), '[]') into mem from public.accounts ac
      where ac.family_id = a.family_id and (ac.role = 'parent' or ac.id = a.id);
  end if;
  return jsonb_build_object('me', public._nafes_pub(a), 'records', recs, 'global', glob, 'accounts', mem);
end $$;

create or replace function public.nafes_sync(p_token text, p_ups jsonb, p_dels jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token); r jsonb; k text; d jsonb; sid text; fam uuid; rid text; n int := 0;
begin
  if jsonb_array_length(coalesce(p_ups, '[]')) > 1000 or jsonb_array_length(coalesce(p_dels, '[]')) > 1000 then raise exception 'دفعة كبيرة جدًا'; end if;
  for r in select value from jsonb_array_elements(coalesce(p_ups, '[]')) order by (value->>'kind') <> 'student' loop
    k := r->>'kind'; d := r->'data'; rid := d->>'id';
    if rid is null or length(rid) > 64 or k is null or jsonb_typeof(d) <> 'object' or length(d::text) > 20000 then continue; end if;
    if k in ('challenge', 'content', 'settings') then
      if a.role <> 'admin' then continue; end if;
      insert into public.records(id, family_id, student_id, kind, data) values (rid, null, null, k, d)
        on conflict (id) do update set data = excluded.data, updated_at = now()
        where records.family_id is null and records.kind = excluded.kind;
      n := n + 1; continue;
    end if;
    if k not in ('student', 'task', 'exam', 'log', 'goal', 'part', 'agreement') then continue; end if;
    sid := case when k = 'student' then rid else d->>'studentId' end;
    fam := null;
    if a.role = 'admin' then
      -- الإدارة تعدّل طلابًا موجودين فقط (الإنشاء عبر nafes_admin)
      select family_id into fam from public.records where id = sid and kind = 'student';
    else
      if a.role = 'student' and sid is distinct from a.student_id then continue; end if;
      if k <> 'student' and not exists (select 1 from public.records where id = sid and kind = 'student' and family_id = a.family_id) then continue; end if;
      fam := a.family_id;
    end if;
    if fam is null then continue; end if;
    if k = 'student' then d := d || jsonb_build_object('familyId', fam::text); end if;
    insert into public.records(id, family_id, student_id, kind, data) values (rid, fam, sid, k, d)
      on conflict (id) do update set data = excluded.data, student_id = excluded.student_id, updated_at = now()
      where records.family_id = excluded.family_id and records.kind = excluded.kind
        and (a.role <> 'student' or records.student_id = a.student_id);
    n := n + 1;
  end loop;

  for rid in select value #>> '{}' from jsonb_array_elements(coalesce(p_dels, '[]')) loop
    if a.role = 'admin' then delete from public.records where id = rid;
    elsif a.role = 'parent' then delete from public.records where id = rid and family_id = a.family_id;
    else delete from public.records where id = rid and family_id = a.family_id and student_id = a.student_id and kind <> 'student';
    end if;
  end loop;

  if jsonb_array_length(coalesce(p_dels, '[]')) > 0 and a.role <> 'student' then
    -- تنظيف: سجلات وحسابات طلاب محذوفين
    delete from public.records r2 where r2.family_id is not null and r2.kind <> 'student'
      and (a.role = 'admin' or r2.family_id = a.family_id)
      and not exists (select 1 from public.records s where s.id = r2.student_id and s.kind = 'student');
    delete from public.accounts ac where ac.role = 'student' and (a.role = 'admin' or ac.family_id = a.family_id)
      and not exists (select 1 from public.records s where s.id = ac.student_id and s.kind = 'student');
  end if;
  return jsonb_build_object('ok', true, 'n', n);
end $$;

-- ربط ولي الأمر بابن مسجّل عبر رمز الربط (يدمج الأسرتين)
create or replace function public.nafes_link(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token); old uuid;
begin
  if a.role <> 'parent' then raise exception 'الربط متاح لولي الأمر فقط'; end if;
  select family_id into old from public.accounts where link_code = upper(trim(coalesce(p_code, ''))) and role = 'student';
  if old is null then raise exception 'رمز الربط غير صحيح'; end if;
  if old = a.family_id then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.records set family_id = a.family_id,
    data = case when kind = 'student' then data || jsonb_build_object('familyId', a.family_id::text) else data end
    where family_id = old;
  update public.accounts set family_id = a.family_id where family_id = old;
  delete from public.families where id = old;
  return jsonb_build_object('ok', true);
end $$;

-- إنشاء حساب دخول لابن أضافه ولي الأمر
create or replace function public.nafes_child_account(p_token text, p_student text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token); st record; c public.accounts;
begin
  select * into st from public.records where id = p_student and kind = 'student';
  if st.id is null or (a.role <> 'admin' and (a.role <> 'parent' or st.family_id <> a.family_id)) then raise exception 'غير مسموح'; end if;
  if exists (select 1 from public.accounts where student_id = p_student) then raise exception 'لهذا الطالب حساب دخول مسبقًا'; end if;
  c := public._nafes_new_account('student', st.family_id, p_student, st.data->>'name', null, null, p_pin);
  return jsonb_build_object('username', c.username, 'linkCode', c.link_code);
end $$;

create or replace function public.nafes_change_pin(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token);
begin
  if a.pin_hash <> crypt(coalesce(p_old, ''), a.pin_hash) then raise exception 'الرقم السري الحالي غير صحيح'; end if;
  perform public._nafes_check_pin(p_new);
  update public.accounts set pin_hash = crypt(p_new, gen_salt('bf')) where id = a.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nafes_admin(p_token text, p_action text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.accounts := public._nafes_me(p_token); v_pin text; fam uuid; c public.accounts;
begin
  if a.role <> 'admin' then raise exception 'للإدارة فقط'; end if;
  if p_action = 'reset_pin' then
    v_pin := lpad(((get_byte(gen_random_bytes(1), 0) * 256 + get_byte(gen_random_bytes(1), 0)) % 9000 + 1000)::text, 4, '0');
    update public.accounts set pin_hash = crypt(v_pin, gen_salt('bf')), failed = 0, locked_until = null where id = (p->>'id')::uuid and role <> 'admin';
    delete from public.sessions where account_id = (p->>'id')::uuid;
    return jsonb_build_object('pin', v_pin);
  elsif p_action = 'toggle' then
    update public.accounts set active = not active where id = (p->>'id')::uuid and role <> 'admin';
  elsif p_action = 'delete_account' then
    delete from public.accounts where id = (p->>'id')::uuid and role <> 'admin';
  elsif p_action = 'delete_family' then
    delete from public.families where id = (p->>'id')::uuid;
  elsif p_action = 'create_parent' then
    v_pin := lpad(((get_byte(gen_random_bytes(1), 0) * 256 + get_byte(gen_random_bytes(1), 0)) % 9000 + 1000)::text, 4, '0');
    insert into public.families default values returning id into fam;
    perform public._nafes_new_student(fam, p->'child');
    c := public._nafes_new_account('parent', fam, null, p->>'name', p->>'relationship', p->>'phone', v_pin);
    return jsonb_build_object('username', c.username, 'pin', v_pin);
  else
    raise exception 'إجراء غير معروف';
  end if;
  return jsonb_build_object('ok', true);
end $$;

/* ---------- الصلاحيات: المفتاح العام يستدعي دوال الواجهة فقط ---------- */
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on function public.nafes_register(jsonb), public.nafes_login(text, text), public.nafes_logout(text),
  public.nafes_load(text), public.nafes_sync(text, jsonb, jsonb), public.nafes_link(text, text),
  public.nafes_child_account(text, text, text), public.nafes_change_pin(text, text, text),
  public.nafes_admin(text, text, jsonb) to anon, authenticated;
