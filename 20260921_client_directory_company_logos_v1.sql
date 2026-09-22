-- Cotation 3000 V8.0.39 — logos sociétés de l’annuaire
alter table public.client_companies
  add column if not exists logo_url text,
  add column if not exists logo_source_url text,
  add column if not exists logo_credit text,
  add column if not exists logo_license text;

comment on column public.client_companies.logo_url is
  'Logo principal de la société. Tous les contacts affiliés héritent visuellement de cette image.';
comment on column public.client_companies.logo_source_url is
  'Source facultative du logo lorsqu il provient d une ressource externe.';
comment on column public.client_companies.logo_credit is
  'Crédit facultatif associé au logo.';
comment on column public.client_companies.logo_license is
  'Licence facultative associée au logo.';
