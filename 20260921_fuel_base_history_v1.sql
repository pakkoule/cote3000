-- Cotation 3000 V8.0.40 — Archives des taux de base carburant
-- Migration idempotente. Les taux clients ne sont volontairement pas stockés ici.

begin;

create table if not exists public.fuel_base_history (
  fuel_type text not null check (fuel_type in ('diesel','gnl','hvo')),
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  normal_rate numeric(10,4),
  reduced_rate numeric(10,4),
  status text not null default 'available' check (status in ('available','pending')),
  source_sheet text,
  source_file text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (fuel_type, year, month)
);

create index if not exists idx_fuel_base_history_period
  on public.fuel_base_history (year desc, month desc, fuel_type);

create or replace function public.c3k_touch_fuel_base_history()
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

drop trigger if exists trg_fuel_base_history_touch on public.fuel_base_history;
create trigger trg_fuel_base_history_touch
before update on public.fuel_base_history
for each row execute function public.c3k_touch_fuel_base_history();

alter table public.fuel_base_history enable row level security;

drop policy if exists fuel_base_history_select on public.fuel_base_history;
create policy fuel_base_history_select on public.fuel_base_history
for select to anon, authenticated using (true);

drop policy if exists fuel_base_history_insert_admin on public.fuel_base_history;
create policy fuel_base_history_insert_admin on public.fuel_base_history
for insert to authenticated
with check (private.current_app_role() = any (array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]));

drop policy if exists fuel_base_history_update_admin on public.fuel_base_history;
create policy fuel_base_history_update_admin on public.fuel_base_history
for update to authenticated
using (private.current_app_role() = any (array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]))
with check (private.current_app_role() = any (array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]));

drop policy if exists fuel_base_history_delete_admin on public.fuel_base_history;
create policy fuel_base_history_delete_admin on public.fuel_base_history
for delete to authenticated
using (private.current_app_role() = any (array['admin'::public.c3k_app_role,'superadmin'::public.c3k_app_role]));

revoke all on table public.fuel_base_history from anon, authenticated;
grant select on table public.fuel_base_history to anon, authenticated;
grant insert, update, delete on table public.fuel_base_history to authenticated;

insert into public.fuel_base_history
(fuel_type,year,month,normal_rate,reduced_rate,status,source_sheet,source_file) values
('diesel',2023,3,31.5,5.61,'available','MARS 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,3,31.5,0.0,'available','03-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,4,28.0,3.99,'available','AVRIL 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,4,28.0,0.0,'available','04-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,5,29.0,4.04,'available','MAI 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,5,29.0,0.0,'available','05-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,6,26.5,2.48,'available','JUIN 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,6,26.5,0.0,'available','06-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,7,24.0,0.18,'available','JUILLET 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,7,24.0,0.0,'available','07-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,8,24.5,0.48,'available','AOUT 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,8,24.5,0.0,'available','08-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,9,26.0,1.24,'available','SEPT 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,9,26.0,0.0,'available','09-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,10,29.5,4.27,'available','OCT 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,10,29.5,0.0,'available','10-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,11,31.0,5.86,'available','NOV 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,11,31.0,0.0,'available','11-2023','Surcharge GNL(1).xlsx'),
('diesel',2023,12,29.5,4.9,'available','DEC 2023','Surcharge DIESEL(1).xlsx'),
('gnl',2023,12,29.5,0.0,'available','12-2023','Surcharge GNL(1).xlsx'),
('diesel',2024,1,27.5,3.29,'available','JAN 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,1,27.5,0.0,'available','01-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,2,26.5,2.16,'available','FEV 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,2,26.5,0.0,'available','02-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,3,26.5,1.98,'available','MARS 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,3,26.5,0.0,'available','03-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,4,28.0,3.44,'available','AVRIL 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,4,28.0,0.0,'available','04-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,5,27.0,2.77,'available','MAI 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,5,27.0,0.0,'available','05-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,6,27.0,2.53,'available','JUIN 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,6,27.0,0.0,'available','06-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,7,25.0,1.11,'available','JUILLET 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,7,25.0,0.0,'available','07-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,8,25.0,0.93,'available','AOUT 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,8,25.0,0.0,'available','08-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,9,25.0,1.04,'available','SEPT 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,9,25.0,0.0,'available','09-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,10,23.5,0.0,'available','OCT 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,10,23.5,0.0,'available','10-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,11,21.5,0.0,'available','NOV 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,11,21.5,0.0,'available','11-2024','Surcharge GNL(1).xlsx'),
('diesel',2024,12,23.0,0.0,'available','DEC 2024','Surcharge DIESEL(1).xlsx'),
('gnl',2024,12,23.0,0.0,'available','12-2024','Surcharge GNL(1).xlsx'),
('diesel',2025,1,23.5,0.0,'available','JAN 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,1,23.5,0.0,'available','01-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,2,23.5,0.0,'available','FEV 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,2,23.5,0.0,'available','02-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,3,25.5,1.09,'available','MAR 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,3,25.5,0.0,'available','03-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,4,25.0,0.96,'available','AVRIL 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,4,25.0,0.0,'available','04-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,5,23.0,0.0,'available','MAI 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,5,23.0,0.0,'available','05-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,6,21.0,0.0,'available','JUIN 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,6,21.0,0.0,'available','06-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,7,20.5,0.0,'available','JUILLET 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,7,20.5,0.0,'available','07-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,8,22.0,0.0,'available','AOUT 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,8,22.0,0.0,'available','08-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,9,23.5,0.0,'available','SEPT 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,9,23.5,0.0,'available','09-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,10,22.0,0.0,'available','OCT 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,10,22.0,0.0,'available','10-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,11,22.5,0.0,'available','NOV 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,11,22.5,0.0,'available','11-2025','Surcharge GNL(1).xlsx'),
('diesel',2025,12,23.0,0.0,'available','DEC 2025','Surcharge DIESEL(1).xlsx'),
('gnl',2025,12,23.0,0.0,'available','12-2025','Surcharge GNL(1).xlsx'),
('diesel',2026,1,24.5,0.34,'available','JANV 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,1,24.5,0.0,'available','01-2026','Surcharge GNL(1).xlsx'),
('diesel',2026,2,22.0,0.0,'available','FEV 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,2,22.0,0.0,'available','02-2026','Surcharge GNL(1).xlsx'),
('diesel',2026,3,23.5,0.0,'available','MARS 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,3,23.5,0.0,'available','03-2026','Surcharge GNL(1).xlsx'),
('diesel',2026,4,24.5,0.46,'available','AVRIL 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,4,24.5,0.0,'available','04-2026','Surcharge GNL(1).xlsx'),
('diesel',2026,5,38.0,8.09,'available','MAI 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,5,38.0,5.56,'available','05-2026','Surcharge GNL(1).xlsx'),
('diesel',2026,6,40.5,11.07,'available','JUIN 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,6,40.5,2.06,'available','06-2026','Surcharge GNL(1).xlsx'),
('hvo',2026,6,50.5,21.07,'available','06-2026','Surcharge HVO(1).xlsx'),
('diesel',2026,7,35.5,8.36,'available','JUIL 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,7,35.5,3.06,'available','07-2026','Surcharge GNL(1).xlsx'),
('hvo',2026,7,45.5,18.36,'available','07-2026','Surcharge HVO(1).xlsx'),
('diesel',2026,8,31.5,5.43,'available','AOU 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,8,31.5,2.06,'available','08-2026','Surcharge GNL(1).xlsx'),
('hvo',2026,8,39.75,13.68,'available','08-2026','Surcharge HVO(1).xlsx'),
('diesel',2026,9,35.5,7.26,'available','SEPT 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,9,35.5,6.56,'available','09-2026','Surcharge GNL(1).xlsx'),
('hvo',2026,9,45.81,17.57,'available','09-2026','Surcharge HVO(1).xlsx'),
('diesel',2026,10,40.0,10.56,'available','OCT 2026','Surcharge DIESEL(1).xlsx'),
('gnl',2026,10,40.0,10.56,'available','10-2026','Surcharge GNL(1).xlsx'),
('hvo',2026,10,NULL,NULL,'pending','10-2026','Surcharge HVO(1).xlsx')
on conflict (fuel_type,year,month) do update set
  normal_rate=excluded.normal_rate,
  reduced_rate=excluded.reduced_rate,
  status=excluded.status,
  source_sheet=excluded.source_sheet,
  source_file=excluded.source_file,
  updated_at=now();

commit;
