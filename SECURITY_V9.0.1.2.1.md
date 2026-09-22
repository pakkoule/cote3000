# Cotation 3000 V9.0.1.2.1 — Correctif visuel recherche annuaire interne

Cette version ne modifie ni le schéma Supabase, ni les politiques RLS, ni les privilèges.

Le badge affiché dans la recherche universelle utilise uniquement les champs `line_number` et `badge_color` déjà chargés après authentification depuis `internal_directory_lines`.

- `anon` reste sans droit de lecture sur `internal_directory_lines` ;
- les résultats d'annuaire privé restent absents lorsque l'utilisateur est déconnecté ;
- aucune donnée privée supplémentaire n'est embarquée dans le frontend ;
- aucune nouvelle clé ou variable sensible n'est ajoutée.
