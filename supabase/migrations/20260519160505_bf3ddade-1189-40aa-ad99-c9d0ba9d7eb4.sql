
-- Roles enum + table
create type public.app_role as enum ('admin', 'team_member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  department text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin');
$$;

-- Business areas
create table public.business_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text default '#1e3a8a',
  created_at timestamptz not null default now()
);

-- Institutions
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_area_id uuid not null references public.business_areas(id) on delete cascade,
  location text,
  contact_person text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.institutions(business_area_id);

-- Assignments
create table public.user_business_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_area_id uuid not null references public.business_areas(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (user_id, business_area_id)
);

create or replace function public.user_has_business_area(_user_id uuid, _ba_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_business_areas
    where user_id = _user_id and business_area_id = _ba_id
  );
$$;

-- Weekly reports
create type public.report_status as enum ('draft','submitted','reviewed','pending','overdue');
create type public.priority_level as enum ('low','medium','high','critical');

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  business_area_id uuid not null references public.business_areas(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  reporting_week date not null,
  business_prospect text,
  competitor_insight text,
  industry_insight text,
  action_register text,
  other_info text,
  follow_up_date date,
  priority priority_level not null default 'medium',
  status report_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.weekly_reports(institution_id);
create index on public.weekly_reports(submitted_by);
create index on public.weekly_reports(reporting_week);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_institutions_updated before update on public.institutions for each row execute function public.touch_updated_at();
create trigger trg_weekly_reports_updated before update on public.weekly_reports for each row execute function public.touch_updated_at();

-- Auto-create profile on signup; first user becomes admin, rest team_member
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'team_member');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.business_areas enable row level security;
alter table public.institutions enable row level security;
alter table public.user_business_areas enable row level security;
alter table public.weekly_reports enable row level security;

-- profiles
create policy "profiles select all signed-in" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles admin update any" on public.profiles for update to authenticated using (public.is_admin(auth.uid()));
create policy "profiles admin insert" on public.profiles for insert to authenticated with check (public.is_admin(auth.uid()) or id = auth.uid());

-- user_roles
create policy "user_roles select own" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "user_roles admin all" on public.user_roles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- business_areas (readable by all signed in, mutable by admin)
create policy "ba select" on public.business_areas for select to authenticated using (true);
create policy "ba admin all" on public.business_areas for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- user_business_areas
create policy "uba select self or admin" on public.user_business_areas for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "uba admin all" on public.user_business_areas for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- institutions: admin sees all, team members see only their assigned BAs
create policy "inst select assigned or admin" on public.institutions for select to authenticated using (
  public.is_admin(auth.uid()) or public.user_has_business_area(auth.uid(), business_area_id)
);
create policy "inst admin all" on public.institutions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- weekly_reports
create policy "wr select own or admin" on public.weekly_reports for select to authenticated using (
  public.is_admin(auth.uid()) or submitted_by = auth.uid()
);
create policy "wr insert own assigned" on public.weekly_reports for insert to authenticated with check (
  submitted_by = auth.uid() and (
    public.is_admin(auth.uid()) or public.user_has_business_area(auth.uid(), business_area_id)
  )
);
create policy "wr update own draft or admin" on public.weekly_reports for update to authenticated using (
  public.is_admin(auth.uid()) or (submitted_by = auth.uid())
) with check (
  public.is_admin(auth.uid()) or (submitted_by = auth.uid())
);
create policy "wr delete own draft or admin" on public.weekly_reports for delete to authenticated using (
  public.is_admin(auth.uid()) or (submitted_by = auth.uid() and status = 'draft')
);
