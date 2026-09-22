-- Cotation 3000 V8.0.38 DEV — Annuaire clients privé
-- Structure : Sociétés / Contacts / Suggestions de nouveaux contacts

begin;

create extension if not exists pgcrypto;

create table if not exists public.client_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commercial_name text,
  account_number text,
  generic_email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text,
  notes text,
  logo_url text,
  logo_source_url text,
  logo_credit text,
  logo_license text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.client_companies(id) on delete set null,
  display_name text not null,
  first_name text,
  last_name text,
  job_title text,
  email text,
  phone text,
  mobile text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_contact_suggestions (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  company_name text,
  contact_name text,
  email text,
  phone text,
  mobile text,
  source_quote jsonb not null default '{}'::jsonb,
  reported_by uuid references auth.users(id) on delete set null,
  reported_role public.c3k_app_role,
  status text not null default 'new' check (status in ('new','approved','ignored')),
  occurrences integer not null default 1 check (occurrences > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_contact_id uuid references public.client_contacts(id) on delete set null
);

create index if not exists idx_client_companies_active_name on public.client_companies (is_active, lower(name));
create index if not exists idx_client_contacts_active_name on public.client_contacts (is_active, lower(display_name));
create index if not exists idx_client_contacts_company on public.client_contacts (company_id);
create index if not exists idx_client_contacts_email on public.client_contacts (lower(email)) where email is not null;
create index if not exists idx_client_suggestions_status_seen on public.client_contact_suggestions (status, last_seen_at desc);

create or replace function public.c3k_touch_client_directory()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_client_companies_touch on public.client_companies;
create trigger trg_client_companies_touch
before update on public.client_companies
for each row execute function public.c3k_touch_client_directory();

drop trigger if exists trg_client_contacts_touch on public.client_contacts;
create trigger trg_client_contacts_touch
before update on public.client_contacts
for each row execute function public.c3k_touch_client_directory();

alter table public.client_companies enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_contact_suggestions enable row level security;

-- Tous les membres connectés peuvent consulter l'annuaire.
drop policy if exists client_companies_select_authenticated on public.client_companies;
create policy client_companies_select_authenticated on public.client_companies
for select to authenticated
using (true);

drop policy if exists client_contacts_select_authenticated on public.client_contacts;
create policy client_contacts_select_authenticated on public.client_contacts
for select to authenticated
using (true);

-- La maintenance de l'annuaire est réservée au SUPERADMIN.
drop policy if exists client_companies_insert_superadmin on public.client_companies;
create policy client_companies_insert_superadmin on public.client_companies
for insert to authenticated
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_companies_update_superadmin on public.client_companies;
create policy client_companies_update_superadmin on public.client_companies
for update to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role)
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_companies_delete_superadmin on public.client_companies;
create policy client_companies_delete_superadmin on public.client_companies
for delete to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_contacts_insert_superadmin on public.client_contacts;
create policy client_contacts_insert_superadmin on public.client_contacts
for insert to authenticated
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_contacts_update_superadmin on public.client_contacts;
create policy client_contacts_update_superadmin on public.client_contacts
for update to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role)
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_contacts_delete_superadmin on public.client_contacts;
create policy client_contacts_delete_superadmin on public.client_contacts
for delete to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

-- Les suggestions sont visibles et administrables uniquement par le SUPERADMIN.
drop policy if exists client_suggestions_select_superadmin on public.client_contact_suggestions;
create policy client_suggestions_select_superadmin on public.client_contact_suggestions
for select to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists client_suggestions_update_superadmin on public.client_contact_suggestions;
create policy client_suggestions_update_superadmin on public.client_contact_suggestions
for update to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role)
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

-- RPC appelée par USER / ADMIN lors d'une cotation avec un contact inconnu.
create or replace function public.submit_client_contact_suggestion(
  p_contact_name text,
  p_company_name text,
  p_email text,
  p_phone text,
  p_mobile text,
  p_quote_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.c3k_app_role := private.current_app_role();
  v_email text := nullif(lower(trim(coalesce(p_email,''))), '');
  v_contact text := nullif(trim(coalesce(p_contact_name,'')), '');
  v_company text := nullif(trim(coalesce(p_company_name,'')), '');
  v_existing uuid;
  v_fingerprint text;
  v_suggestion public.client_contact_suggestions%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if v_role not in ('user'::public.c3k_app_role,'admin'::public.c3k_app_role) then
    return jsonb_build_object('status','ignored_role');
  end if;

  if v_contact is null and v_email is null then
    return jsonb_build_object('status','empty');
  end if;

  -- 1) e-mail exact prioritaire.
  if v_email is not null then
    select c.id into v_existing
    from public.client_contacts c
    where c.is_active and lower(trim(coalesce(c.email,''))) = v_email
    limit 1;
  end if;

  -- 2) sinon Nom + Société.
  if v_existing is null and v_contact is not null then
    select c.id into v_existing
    from public.client_contacts c
    left join public.client_companies co on co.id=c.company_id
    where c.is_active
      and lower(trim(c.display_name)) = lower(v_contact)
      and (
        v_company is null
        or lower(trim(coalesce(co.name,''))) = lower(v_company)
        or lower(trim(coalesce(co.commercial_name,''))) = lower(v_company)
      )
    limit 1;
  end if;

  if v_existing is not null then
    return jsonb_build_object('status','known','contact_id',v_existing);
  end if;

  v_fingerprint := md5(
    coalesce(v_email,'') || '|' ||
    lower(coalesce(v_contact,'')) || '|' ||
    lower(coalesce(v_company,''))
  );

  insert into public.client_contact_suggestions(
    fingerprint,company_name,contact_name,email,phone,mobile,source_quote,
    reported_by,reported_role,status,occurrences,first_seen_at,last_seen_at
  ) values (
    v_fingerprint,v_company,v_contact,nullif(trim(coalesce(p_email,'')),''),
    nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_mobile,'')),''),
    coalesce(p_quote_context,'{}'::jsonb),v_uid,v_role,'new',1,now(),now()
  )
  on conflict (fingerprint) do update set
    company_name=coalesce(excluded.company_name,public.client_contact_suggestions.company_name),
    contact_name=coalesce(excluded.contact_name,public.client_contact_suggestions.contact_name),
    email=coalesce(excluded.email,public.client_contact_suggestions.email),
    phone=coalesce(excluded.phone,public.client_contact_suggestions.phone),
    mobile=coalesce(excluded.mobile,public.client_contact_suggestions.mobile),
    source_quote=excluded.source_quote,
    reported_by=excluded.reported_by,
    reported_role=excluded.reported_role,
    status=case when public.client_contact_suggestions.status='ignored' then 'new' else public.client_contact_suggestions.status end,
    occurrences=public.client_contact_suggestions.occurrences+1,
    last_seen_at=now(),
    resolved_by=null,
    resolved_at=null
  returning * into v_suggestion;

  return jsonb_build_object('status','reported','suggestion_id',v_suggestion.id,'occurrences',v_suggestion.occurrences);
end;
$$;

revoke all on function public.submit_client_contact_suggestion(text,text,text,text,text,jsonb) from public;
grant execute on function public.submit_client_contact_suggestion(text,text,text,text,text,jsonb) to authenticated;

commit;
