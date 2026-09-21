-- Cotation 3000 V8.0.18 — backend d'édition des référentiels
-- Migration déjà appliquée au projet Supabase Cotation 3000.
-- Ce fichier est conservé dans GitHub pour versionner le schéma.

create table if not exists public.reference_overrides (
  id uuid primary key default gen_random_uuid(),
  reference_key text not null,
  collection_key text not null,
  entity_key text not null,
  data jsonb not null default '{}'::jsonb,
  base_snapshot jsonb,
  is_new boolean not null default false,
  is_deleted boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_overrides_reference_key_chk check (reference_key in ('adr','ports_world','maritime','customs')),
  constraint reference_overrides_unique_entity unique(reference_key, collection_key, entity_key)
);

create index if not exists reference_overrides_lookup_idx on public.reference_overrides(reference_key, collection_key, entity_key);
create index if not exists reference_overrides_updated_idx on public.reference_overrides(updated_at desc);
alter table public.reference_overrides enable row level security;
grant select on public.reference_overrides to anon, authenticated;
grant insert, update, delete on public.reference_overrides to authenticated;

-- Les policies utilisent private.current_app_role(), déjà présent dans Cotation 3000.
drop policy if exists reference_overrides_select_all on public.reference_overrides;
create policy reference_overrides_select_all on public.reference_overrides for select to anon, authenticated using (true);
drop policy if exists reference_overrides_insert_admin on public.reference_overrides;
create policy reference_overrides_insert_admin on public.reference_overrides for insert to authenticated
with check (private.current_app_role() = any(array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]));
drop policy if exists reference_overrides_update_admin on public.reference_overrides;
create policy reference_overrides_update_admin on public.reference_overrides for update to authenticated
using (private.current_app_role() = any(array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]))
with check (private.current_app_role() = any(array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]));
drop policy if exists reference_overrides_delete_superadmin on public.reference_overrides;
create policy reference_overrides_delete_superadmin on public.reference_overrides for delete to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('c3k-reference-media','c3k-reference-media',true,2097152,array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Les fonctions/triggers d'audit et les policies Storage sont gérés par les migrations Supabase appliquées.
