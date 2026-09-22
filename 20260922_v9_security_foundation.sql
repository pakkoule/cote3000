-- Cotation 3000 V9.0.0 — socle sécurité
-- Déjà appliqué sur le projet Supabase principal le 22/09/2026.
begin;

create table if not exists private.app_private_secrets (
  secret_key text primary key,
  secret_value text not null,
  updated_at timestamptz not null default now()
);
revoke all on table private.app_private_secrets from public, anon, authenticated;
grant select,insert,update,delete on table private.app_private_secrets to service_role;

create table if not exists private.v9_api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,scope,window_start)
);
revoke all on table private.v9_api_usage from public, anon, authenticated;
grant select,insert,update,delete on table private.v9_api_usage to service_role;
create index if not exists v9_api_usage_updated_at_idx on private.v9_api_usage(updated_at);

create or replace function public.v9_consume_api_quota(
  p_user_id uuid,
  p_scope text,
  p_limit integer default 120,
  p_window_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, auth, pg_temp
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if coalesce(p_scope,'') = '' then raise exception 'scope required'; end if;
  if p_limit < 1 or p_limit > 10000 then raise exception 'invalid limit'; end if;
  if p_window_minutes < 1 or p_window_minutes > 1440 then raise exception 'invalid window'; end if;
  v_window := to_timestamp(floor(extract(epoch from now())/(p_window_minutes*60))*(p_window_minutes*60));
  insert into private.v9_api_usage(user_id,scope,window_start,hits,updated_at)
  values (p_user_id,p_scope,v_window,1,now())
  on conflict (user_id,scope,window_start)
  do update set hits=private.v9_api_usage.hits+1,updated_at=now()
  returning hits into v_hits;
  return jsonb_build_object('allowed',v_hits<=p_limit,'hits',v_hits,'limit',p_limit,'window_start',v_window);
end;
$$;
revoke all on function public.v9_consume_api_quota(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.v9_consume_api_quota(uuid,text,integer,integer) to service_role;

-- Plus aucun accès anonyme aux données métier dynamiques.
drop policy if exists fuel_base_history_select on public.fuel_base_history;
drop policy if exists fuel_base_history_select_authenticated on public.fuel_base_history;
create policy fuel_base_history_select_authenticated on public.fuel_base_history for select to authenticated using (true);
revoke all privileges on table public.fuel_base_history from anon;
grant select on table public.fuel_base_history to authenticated;

-- Les overrides contiennent des enrichissements métier : membres connectés uniquement.
drop policy if exists reference_overrides_select_all on public.reference_overrides;
drop policy if exists reference_overrides_select_authenticated on public.reference_overrides;
create policy reference_overrides_select_authenticated on public.reference_overrides for select to authenticated using (true);
revoke all privileges on table public.reference_overrides from anon;
grant select,insert,update,delete on table public.reference_overrides to authenticated;

commit;

-- Indexes de support des clés étrangères (performance, sans changement fonctionnel)
create index if not exists client_companies_created_by_idx on public.client_companies(created_by);
create index if not exists client_companies_updated_by_idx on public.client_companies(updated_by);
create index if not exists client_contact_suggestions_created_contact_idx on public.client_contact_suggestions(created_contact_id);
create index if not exists client_contact_suggestions_reported_by_idx on public.client_contact_suggestions(reported_by);
create index if not exists client_contact_suggestions_resolved_by_idx on public.client_contact_suggestions(resolved_by);
create index if not exists client_contacts_created_by_idx on public.client_contacts(created_by);
create index if not exists client_contacts_updated_by_idx on public.client_contacts(updated_by);
create index if not exists fuel_base_history_created_by_idx on public.fuel_base_history(created_by);
create index if not exists fuel_base_history_updated_by_idx on public.fuel_base_history(updated_by);
create index if not exists reference_overrides_created_by_idx on public.reference_overrides(created_by);
create index if not exists reference_overrides_updated_by_idx on public.reference_overrides(updated_by);
