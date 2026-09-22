-- Cotation 3000 V9.0.1.1 — Société libre + répertoire interne

create unique index if not exists client_companies_name_normalized_uq
on public.client_companies ((lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))))
where is_active = true;

create or replace function public.resolve_or_create_client_company(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g'), '');
  v_id uuid;
begin
  if v_name is null then return null; end if;
  if private.current_app_role() <> 'superadmin'::public.c3k_app_role then
    raise exception 'Superadmin required' using errcode='42501';
  end if;

  select c.id into v_id
  from public.client_companies c
  where lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = lower(v_name)
     or lower(regexp_replace(btrim(coalesce(c.commercial_name,'')), '\s+', ' ', 'g')) = lower(v_name)
  order by c.is_active desc, c.created_at asc
  limit 1;

  if v_id is not null then
    update public.client_companies
       set is_active = true,
           updated_by = (select auth.uid()),
           updated_at = now()
     where id = v_id and is_active = false;
    return v_id;
  end if;

  insert into public.client_companies(name, is_active, created_by, updated_by)
  values (v_name, true, (select auth.uid()), (select auth.uid()))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    select c.id into v_id
    from public.client_companies c
    where lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = lower(v_name)
    order by c.is_active desc, c.created_at asc
    limit 1;
    return v_id;
end;
$$;

revoke all on function public.resolve_or_create_client_company(text) from public, anon;
grant execute on function public.resolve_or_create_client_company(text) to authenticated, service_role;

create table if not exists public.internal_directory_lines (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  line_number text,
  phone text not null check (char_length(btrim(phone)) between 1 and 60),
  service text,
  notes text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.internal_directory_lines enable row level security;

drop policy if exists internal_directory_select_authenticated on public.internal_directory_lines;
create policy internal_directory_select_authenticated on public.internal_directory_lines
for select to authenticated using (true);

drop policy if exists internal_directory_insert_superadmin on public.internal_directory_lines;
create policy internal_directory_insert_superadmin on public.internal_directory_lines
for insert to authenticated
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists internal_directory_update_superadmin on public.internal_directory_lines;
create policy internal_directory_update_superadmin on public.internal_directory_lines
for update to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role)
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists internal_directory_delete_superadmin on public.internal_directory_lines;
create policy internal_directory_delete_superadmin on public.internal_directory_lines
for delete to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

grant select, insert, update, delete on public.internal_directory_lines to authenticated;
grant all on public.internal_directory_lines to service_role;
revoke all on public.internal_directory_lines from anon;

create index if not exists internal_directory_active_sort_idx
on public.internal_directory_lines (is_active, sort_order, label);

insert into public.internal_directory_lines(label, line_number, phone, service, sort_order, is_active)
select 'Standard', 'Ligne 11', '02 35 13 01 81', 'Standard', 10, true
where not exists (
  select 1 from public.internal_directory_lines
  where lower(btrim(label)) = 'standard'
    and lower(btrim(coalesce(line_number,''))) = 'ligne 11'
    and regexp_replace(phone, '[^0-9]+', '', 'g') = '0235130181'
);
