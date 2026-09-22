# Cotation 3000 V9.0.1.2 — Annuaire interne et recherche privée

## Accès
- `internal_directory_lines` reste protégé par RLS.
- `anon` ne dispose pas du droit `SELECT`.
- `authenticated` peut lire les lignes internes.
- les écritures restent limitées au rôle applicatif `superadmin` via les politiques V9.0.1.1.

## Nouveaux champs
- `badge_color` : couleur hexadécimale `#RRGGBB`, contrôlée par une contrainte PostgreSQL.
- `icon_text` : icône texte/emoji courte, limitée à 12 caractères PostgreSQL.

## Recherche universelle
Les contacts, sociétés et lignes internes sont injectés dans la recherche universelle uniquement depuis les données d’annuaire déjà chargées pour une session authentifiée. Lors de la déconnexion, le cache mémoire de l’annuaire est vidé et ces résultats ne sont plus retournés.

Migration : `20260922_v9012_internal_directory_badges.sql`.
