-- Cotation 3000 V8.0.22 — étend la couche d'overrides aux référentiels historiques
alter table public.reference_overrides
  drop constraint if exists reference_overrides_reference_key_chk;

alter table public.reference_overrides
  add constraint reference_overrides_reference_key_chk
  check (reference_key in (
    'adr','ports_world','maritime','customs',
    'iso','vat','fuel','loti','lexicon','accounts','port_places'
  ));
