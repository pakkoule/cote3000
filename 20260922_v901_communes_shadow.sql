-- Cotation 3000 V9.0.1 — Communes / Lamy — Shadow Mode sécurisé
-- Table privée + recherche RPC authentifiée. La base source V8 n'est utilisée qu'au bootstrap.

create schema if not exists c3k_private;
revoke all on schema c3k_private from public, anon, authenticated;

create table if not exists c3k_private.communes (
  id bigint generated always as identity primary key,
  commune text not null,
  departement text not null,
  lamy text not null,
  distance integer not null,
  distance_color text not null default '',
  search_name text not null,
  source_ordinal integer not null,
  created_at timestamptz not null default now(),
  unique (source_ordinal)
);

alter table c3k_private.communes enable row level security;
revoke all on table c3k_private.communes from public, anon, authenticated;
grant select, insert, update, delete on table c3k_private.communes to service_role;

create index if not exists communes_search_name_trgm_idx
  on c3k_private.communes using gin (search_name public.gin_trgm_ops);
create index if not exists communes_departement_idx on c3k_private.communes (departement);
create index if not exists communes_lamy_idx on c3k_private.communes (lamy);
create index if not exists communes_distance_idx on c3k_private.communes (distance);
create index if not exists communes_source_ordinal_idx on c3k_private.communes (source_ordinal);

create or replace function c3k_private.normalize_city(value text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(extensions.unaccent(coalesce(value,''))), '[^a-z0-9]+', ' ', 'g'),
          '(^| )sainte( |$)', '\\1ste\\2', 'g'
        ),
        '(^| )saint( |$)', '\\1st\\2', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  );
$$;

-- Bootstrap idempotent depuis la version V9.0.0 actuellement déployée.
-- Une fois V9.0.1 validée et la base locale retirée du site, ce bloc n'est plus nécessaire à l'exécution.
do $$
declare
  response extensions.http_response;
  raw text;
  payload jsonb;
begin
  if (select count(*) from c3k_private.communes) = 0 then
    response := extensions.http_get('https://cotation3000.netlify.app/Cotation_3000_V8_communes.js');
    if response.status <> 200 then
      raise exception 'Bootstrap communes impossible: HTTP %', response.status;
    end if;

    raw := split_part(response.content, 'window.C3K_COMMUNE_DATA=', 2);
    raw := regexp_replace(raw, ';[[:space:]]*$', '');
    payload := raw::jsonb;

    insert into c3k_private.communes
      (commune, departement, lamy, distance, distance_color, search_name, source_ordinal)
    select
      elem->>0,
      elem->>1,
      elem->>2,
      (elem->>3)::integer,
      coalesce(elem->>4,''),
      c3k_private.normalize_city(elem->>0),
      ordinality::integer - 1
    from jsonb_array_elements(payload) with ordinality as src(elem, ordinality)
    on conflict (source_ordinal) do nothing;
  end if;
end $$;

create or replace function public.search_cities(
  p_query text default '',
  p_department text default '',
  p_lamy text default '',
  p_distance_bucket text default '',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id bigint,
  source_ordinal integer,
  commune text,
  departement text,
  lamy text,
  distance integer,
  distance_color text,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  q text := c3k_private.normalize_city(p_query);
  safe_limit integer := least(greatest(coalesce(p_limit,100),1),200);
  safe_offset integer := greatest(coalesce(p_offset,0),0);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Empêche un export massif accidentel : sans recherche ni filtre, 200 lignes max et aucun offset.
  if q = '' and coalesce(p_department,'') = '' and coalesce(p_lamy,'') = '' and coalesce(p_distance_bucket,'') = '' then
    safe_offset := 0;
  end if;

  return query
  with filtered as (
    select c.*
    from c3k_private.communes c
    where
      (q = '' or c.search_name like '%' || q || '%')
      and (coalesce(p_department,'') = '' or c.departement = p_department)
      and (coalesce(p_lamy,'') = '' or c.lamy = p_lamy)
      and (
        coalesce(p_distance_bucket,'') = ''
        or (p_distance_bucket = '1-135' and c.distance between 1 and 135)
        or (p_distance_bucket = '136-250' and c.distance between 136 and 250)
        or (p_distance_bucket = '251-500' and c.distance between 251 and 500)
        or (p_distance_bucket = '501-750' and c.distance between 501 and 750)
        or (p_distance_bucket = '751-1000' and c.distance between 751 and 1000)
        or (p_distance_bucket = '1001+' and c.distance >= 1001)
      )
  )
  select
    f.id,
    f.source_ordinal,
    f.commune,
    f.departement,
    f.lamy,
    f.distance,
    f.distance_color,
    count(*) over() as total_count
  from filtered f
  order by
    case when q <> '' and f.search_name = q then 0 else 1 end,
    case when q <> '' and f.search_name like q || '%' then 0 else 1 end,
    f.source_ordinal
  limit safe_limit offset safe_offset;
end;
$$;

revoke all on function public.search_cities(text,text,text,text,integer,integer) from public;
revoke all on function public.search_cities(text,text,text,text,integer,integer) from anon;
grant execute on function public.search_cities(text,text,text,text,integer,integer) to authenticated;
grant execute on function public.search_cities(text,text,text,text,integer,integer) to service_role;

create or replace function public.cities_v9_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'version','9.0.1',
    'rows',(select count(*) from c3k_private.communes),
    'engine','supabase-rpc',
    'direct_table_access',false
  );
end;
$$;

revoke all on function public.cities_v9_status() from public;
revoke all on function public.cities_v9_status() from anon;
grant execute on function public.cities_v9_status() to authenticated;
grant execute on function public.cities_v9_status() to service_role;
