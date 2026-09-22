-- Cotation 3000 V9.0.1.2.4 — étiquettes visuelles personnalisées des membres
-- Les étiquettes sont purement visuelles : elles ne modifient jamais le rôle technique ni les permissions.

begin;

create table if not exists public.member_role_labels (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  label_text text not null check (char_length(btrim(label_text)) between 1 and 32),
  icon_text text not null default '★' check (char_length(icon_text) between 1 and 12),
  appearance text not null default 'gradient' check (appearance in ('solid','gradient')),
  color_start text not null default '#FFF7CF' check (color_start ~ '^#[0-9A-Fa-f]{6}$'),
  color_end text not null default '#D6B65A' check (color_end ~ '^#[0-9A-Fa-f]{6}$'),
  gradient_angle smallint not null default 135 check (gradient_angle between 0 and 360),
  created_by uuid references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_role_labels enable row level security;

revoke all on table public.member_role_labels from public, anon;
grant select, insert, update, delete on table public.member_role_labels to authenticated;
grant all on table public.member_role_labels to service_role;

drop policy if exists member_role_labels_select_authenticated on public.member_role_labels;
create policy member_role_labels_select_authenticated
on public.member_role_labels
for select
to authenticated
using (true);

drop policy if exists member_role_labels_insert_superadmin on public.member_role_labels;
create policy member_role_labels_insert_superadmin
on public.member_role_labels
for insert
to authenticated
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists member_role_labels_update_superadmin on public.member_role_labels;
create policy member_role_labels_update_superadmin
on public.member_role_labels
for update
to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role)
with check (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop policy if exists member_role_labels_delete_superadmin on public.member_role_labels;
create policy member_role_labels_delete_superadmin
on public.member_role_labels
for delete
to authenticated
using (private.current_app_role() = 'superadmin'::public.c3k_app_role);

drop trigger if exists member_role_labels_touch_updated_at on public.member_role_labels;
create trigger member_role_labels_touch_updated_at
before update on public.member_role_labels
for each row execute function private.touch_updated_at();

-- Préserve l'aspect PREMIUM historique des SUPERADMIN tout en le rendant désormais éditable.
insert into public.member_role_labels (
  user_id,label_text,icon_text,appearance,color_start,color_end,gradient_angle,created_by,updated_by
)
select p.id,'PREMIUM','♛','gradient','#FFF7CF','#D6B65A',135,p.id,p.id
from public.profiles p
where p.role='superadmin'::public.c3k_app_role
on conflict (user_id) do nothing;

commit;
