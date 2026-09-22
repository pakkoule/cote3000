-- Cotation 3000 V9.0.1.2.6 — Import annuaire interne depuis telephones.xlsx
begin;

-- Certaines lignes internes n'ont pas de numéro direct externe : le téléphone devient facultatif.
alter table public.internal_directory_lines
  drop constraint if exists internal_directory_lines_phone_check;

alter table public.internal_directory_lines
  alter column phone drop not null;

alter table public.internal_directory_lines
  add constraint internal_directory_lines_phone_check
  check (phone is null or char_length(btrim(phone)) between 1 and 60);

update public.internal_directory_lines
set phone = null
where phone is not null and btrim(phone) = '';

-- La ligne Standard/Ligne 11 était une entrée d'exemple. La vraie ligne 11 est EMILIE.
delete from public.internal_directory_lines
where lower(btrim(label)) = 'standard'
  and lower(btrim(coalesce(line_number,''))) = 'ligne 11'
  and regexp_replace(coalesce(phone,''), '[^0-9]+', '', 'g') = '0235130181';

-- Met à jour les éventuelles entrées déjà présentes sans écraser leur style/service personnalisé.
with incoming(label,line_number,phone,sort_order) as (
  values
    ('M.DUBOC','Ligne 10',null::text,10),
    ('EMILIE','Ligne 11','02 35 13 01 81',20),
    ('LEA 1 ETAGE','Ligne 27','02 78 34 02 92',30),
    ('ORIANE','Ligne 40',null,40),
    ('SALLE DE REUNION','Ligne 44',null,50),
    ('INFORMATIQUE','Ligne 26','02 78 34 02 97',60),
    ('VERO','Ligne 15','02 78 34 02 99',70),
    ('JENNY','Ligne 20','02 78 34 02 98',80),
    ('COMPTA','Ligne 31',null,90),
    ('AXELLE','Ligne 28','02 78 34 02 93',100),
    ('NOEMIE','Ligne 42',null,110),
    ('BAPTISTE','Ligne 35',null,120),
    ('OLIVIER','Ligne 33',null,130),
    ('ERIC','Ligne 16','02 35 13 01 86',140),
    ('ANTHONY PLANNING 20','Ligne 23','02 35 13 01 85',150),
    ('THIERRY PLANNING 40','Ligne 12','02 35 13 01 82',160),
    ('PRE PLANNING','Ligne 19','02 35 13 01 89',170),
    ('RDV','Ligne 13','02 35 13 01 83',180),
    ('SAISIE 1','Ligne 22','02 35 13 01 87',190),
    ('EXPLOITATION','Ligne 24',null,200),
    ('SAISIE 2','Ligne 35',null,210),
    ('FACTURATION SECURE','Ligne 18','02 78 34 02 94',220),
    ('SECURE','Ligne 29','02 78 34 02 96',230),
    ('ALEX','Ligne 14','02 35 13 01 88',240),
    ('OCEANE','Ligne 36','02 78 34 02 91',250),
    ('VANESSA','Ligne 32',null,260),
    ('LEA 1 FACTURATION','Ligne 37',null,270),
    ('LEA 2','Ligne 25','02 78 34 02 95',280),
    ('RAPH','Ligne 38',null,290),
    ('CHRISTOPHE','Ligne 17','02 78 34 02 90',300),
    ('ATELIER','Ligne 30',null,310)
)
update public.internal_directory_lines d
set phone = i.phone,
    sort_order = i.sort_order,
    is_active = true,
    updated_at = now()
from incoming i
where lower(btrim(d.label)) = lower(btrim(i.label))
  and lower(btrim(coalesce(d.line_number,''))) = lower(btrim(i.line_number));

-- Ajoute les lignes absentes. Aucun service n'est inventé : elles restent en catégorie générique "Interne"
-- jusqu'à ce que le SUPERADMIN leur attribue un service/couleur spécifique.
with incoming(label,line_number,phone,sort_order) as (
  values
    ('M.DUBOC','Ligne 10',null::text,10),
    ('EMILIE','Ligne 11','02 35 13 01 81',20),
    ('LEA 1 ETAGE','Ligne 27','02 78 34 02 92',30),
    ('ORIANE','Ligne 40',null,40),
    ('SALLE DE REUNION','Ligne 44',null,50),
    ('INFORMATIQUE','Ligne 26','02 78 34 02 97',60),
    ('VERO','Ligne 15','02 78 34 02 99',70),
    ('JENNY','Ligne 20','02 78 34 02 98',80),
    ('COMPTA','Ligne 31',null,90),
    ('AXELLE','Ligne 28','02 78 34 02 93',100),
    ('NOEMIE','Ligne 42',null,110),
    ('BAPTISTE','Ligne 35',null,120),
    ('OLIVIER','Ligne 33',null,130),
    ('ERIC','Ligne 16','02 35 13 01 86',140),
    ('ANTHONY PLANNING 20','Ligne 23','02 35 13 01 85',150),
    ('THIERRY PLANNING 40','Ligne 12','02 35 13 01 82',160),
    ('PRE PLANNING','Ligne 19','02 35 13 01 89',170),
    ('RDV','Ligne 13','02 35 13 01 83',180),
    ('SAISIE 1','Ligne 22','02 35 13 01 87',190),
    ('EXPLOITATION','Ligne 24',null,200),
    ('SAISIE 2','Ligne 35',null,210),
    ('FACTURATION SECURE','Ligne 18','02 78 34 02 94',220),
    ('SECURE','Ligne 29','02 78 34 02 96',230),
    ('ALEX','Ligne 14','02 35 13 01 88',240),
    ('OCEANE','Ligne 36','02 78 34 02 91',250),
    ('VANESSA','Ligne 32',null,260),
    ('LEA 1 FACTURATION','Ligne 37',null,270),
    ('LEA 2','Ligne 25','02 78 34 02 95',280),
    ('RAPH','Ligne 38',null,290),
    ('CHRISTOPHE','Ligne 17','02 78 34 02 90',300),
    ('ATELIER','Ligne 30',null,310)
)
insert into public.internal_directory_lines
  (label,line_number,phone,service,notes,sort_order,is_active,badge_color,icon_text)
select
  i.label,
  i.line_number,
  i.phone,
  null,
  'Import telephones.xlsx — 22/09/2026',
  i.sort_order,
  true,
  '#0891B2',
  '☎'
from incoming i
where not exists (
  select 1
  from public.internal_directory_lines d
  where lower(btrim(d.label)) = lower(btrim(i.label))
    and lower(btrim(coalesce(d.line_number,''))) = lower(btrim(i.line_number))
);

commit;
