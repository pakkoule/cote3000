# Cotation 3000 V9.0.1 — Communes / Lamy

## État
- 40 793 communes importées dans `c3k_private.communes` sur Supabase.
- La table est dans un schéma non exposé et les rôles `anon` / `authenticated` n'ont aucun accès direct.
- `public.search_cities(...)` est le seul moteur de lecture prévu pour l'interface et exige une session authentifiée.
- Les réponses sont plafonnées à 200 lignes par appel.
- Index trigramme + département + Lamy + distance.
- `public.cities_v9_status()` permet de vérifier le moteur sans exposer la table.

## Shadow Mode
V9.0.1 conserve temporairement `Cotation_3000_V8_communes.js` comme fallback de validation. L'interface reste pilotée par le moteur local V8 ; la V9 exécute en parallèle une recherche Supabase sur les recherches filtrées et mesure la concordance (`window.C3K_V9_CITIES.stats`).

Cette présence locale est volontaire et temporaire : elle respecte le principe zéro big-bang de la roadmap. La suppression définitive du fichier statique intervient une fois la concordance validée, au plus tard dans l'étape de nettoyage V9.0.7.

## Contrôles navigateur
- `C3K_V9_CITIES.status()` : statut du référentiel distant.
- `C3K_V9_CITIES.stats` : requêtes, erreurs, concordances, écarts et dernier temps de réponse.
- événement `c3k:v9-cities-shadow` : résultat de chaque comparaison silencieuse.
