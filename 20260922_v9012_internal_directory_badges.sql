-- Cotation 3000 V9.0.1.2 — badges services + icônes des lignes internes

alter table public.internal_directory_lines
  add column if not exists badge_color text not null default '#85754e',
  add column if not exists icon_text text not null default '☎';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_directory_badge_color_hex'
      and conrelid = 'public.internal_directory_lines'::regclass
  ) then
    alter table public.internal_directory_lines
      add constraint internal_directory_badge_color_hex
      check (badge_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_directory_icon_text_length'
      and conrelid = 'public.internal_directory_lines'::regclass
  ) then
    alter table public.internal_directory_lines
      add constraint internal_directory_icon_text_length
      check (char_length(icon_text) between 1 and 12);
  end if;
end $$;

update public.internal_directory_lines
set badge_color = coalesce(nullif(badge_color,''),'#85754e'),
    icon_text = coalesce(nullif(icon_text,''),'☎'),
    updated_at = now()
where badge_color is null or badge_color = '' or icon_text is null or icon_text = '';
