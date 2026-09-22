# Cotation 3000 V9.0.1.2.6

- import des lignes internes depuis `telephones.xlsx` ;
- le téléphone direct devient nullable afin de prendre en charge les extensions internes sans ligne directe ;
- RLS et droits existants inchangés : lecture authentifiée, écriture SUPERADMIN ;
- le frontend normalise une valeur téléphone vide en `NULL`.
