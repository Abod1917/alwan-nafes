-- نافس باجتهاد — مخطط قاعدة بيانات Supabase (للربط لاحقًا)
-- يطابق نموذج البيانات في js/core.js و js/data.js. شغّله في SQL Editor.
-- ملاحظة أمنية: الدخول الحالي (اسم مستخدم + PIN) للتجربة فقط. عند الربط استخدم Supabase Auth
-- (بريد وهمي مشتق من اسم المستخدم) أو Edge Function تتحقق من PIN مُجزَّأ، ولا تخزّن PIN نصًا صريحًا.

create extension if not exists pgcrypto;

create table families (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  username text unique not null,           -- مثال: NAFES1001
  pin_hash text,                           -- crypt(pin, gen_salt('bf'))
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create table students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null, grade text not null, avatar text default '🦁',
  target_min int not null default 45, active boolean not null default true
);
create table tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  exam_id uuid, title text not null, subject text, due_date date not null,
  type text not null default 'homework', minutes int,
  done boolean not null default false, done_on date
);
create table exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null, exam_date date not null, topics text
);
create table study_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  log_date date not null default current_date, minutes int not null, focus int check (focus between 1 and 5), note text
);
create table goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  title text not null, target int not null, progress int not null default 0, due date
);
create table agreements (
  student_id uuid primary key references students(id) on delete cascade,
  student_items jsonb not null default '[]', parent_items jsonb not null default '[]',
  reward text, signed_student date, signed_parent date
);
create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, days int not null default 7, active boolean not null default true
);
create table participations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  days date[] not null default '{}', completed boolean not null default false,
  unique (student_id, challenge_id)
);
create table content (
  id uuid primary key default gen_random_uuid(),
  category text not null, title text not null, body text not null
);
create table settings (key text primary key, value jsonb);   -- مثال: badgesOff

create table admins (user_id uuid primary key references auth.users(id));
create or replace function is_admin() returns boolean language sql stable security definer as
$$ select exists (select 1 from admins where user_id = auth.uid()) $$;
create or replace function my_family() returns uuid language sql stable security definer as
$$ select id from families where auth_user_id = auth.uid() $$;

-- الأمان على مستوى الصفوف
alter table families enable row level security;  alter table students enable row level security;
alter table tasks enable row level security;     alter table exams enable row level security;
alter table study_logs enable row level security; alter table goals enable row level security;
alter table agreements enable row level security; alter table participations enable row level security;
alter table challenges enable row level security; alter table content enable row level security;
alter table settings enable row level security;

create policy fam_own on families for all using (id = my_family() or is_admin()) with check (is_admin());
create policy stu_own on students for all using (family_id = my_family() or is_admin()) with check (family_id = my_family() or is_admin());
do $$ declare t text; begin
  foreach t in array array['tasks','exams','study_logs','goals','agreements','participations'] loop
    execute format($f$create policy %I_own on %I for all
      using (is_admin() or student_id in (select id from students where family_id = my_family()))
      with check (is_admin() or student_id in (select id from students where family_id = my_family()))$f$, t, t);
  end loop;
end $$;
create policy ch_read on challenges for select using (auth.uid() is not null);
create policy ch_admin on challenges for all using (is_admin()) with check (is_admin());
create policy ct_read on content for select using (auth.uid() is not null);
create policy ct_admin on content for all using (is_admin()) with check (is_admin());
create policy set_read on settings for select using (auth.uid() is not null);
create policy set_admin on settings for all using (is_admin()) with check (is_admin());

create index on tasks (student_id, due_date);
create index on study_logs (student_id, log_date);
