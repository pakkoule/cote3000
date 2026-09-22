# Cotation 3000 — Security Baseline V9.0.0

## Objectif
V9.0.0 installe le socle avant la sortie progressive des référentiels du frontend. Cette version ne prétend pas encore rendre les fichiers historiques de référence invisibles : les migrations des données statiques sont prévues en V9.0.1 à V9.0.7.

## Réalisé dans V9.0.0
- Clé Google supprimée de `index.html` et du JavaScript navigateur.
- Calcul Google Routes déplacé vers `netlify/functions/google-route.js`.
- La Function exige une session Supabase valide et ne renvoie que le résultat du calcul.
- Quota serveur prévu à 120 appels/utilisateur/heure via RPC service-role.
- Tables techniques quota/secrets placées dans le schéma `private`.
- `reference_overrides` et `fuel_base_history` ne sont plus lisibles par `anon`.
- Toutes les tables métier du schéma `public` ont RLS activé au moment de l'audit V9.0.0.
- La RPC `submit_client_contact_suggestion` reste interdite à `anon`.
- Headers HTTP renforcés dans `netlify.toml`.
- Nouveau socle navigateur `Cotation_3000_V9_core.js` : requêtes authentifiées, timeout, cache et événement d'erreur commun.

## Variables Netlify nécessaires
Créer dans Netlify > Site configuration > Environment variables :
- `GOOGLE_MAPS_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optionnelles car une valeur publique de secours existe dans la Function :
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

**Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` ou la clé Google dans GitHub.**

## Rotation de la clé Google
La clé Google était historiquement présente dans le frontend. Après avoir configuré `GOOGLE_MAPS_API_KEY` dans Netlify, créer/rotater la clé dans Google Cloud puis désactiver l'ancienne. La suppression du code courant ne l'efface pas de l'historique Git déjà publié.

## Limite volontaire de V9.0.0
Les bases statiques historiques (`communes`, ports, ADR, etc.) sont encore présentes dans les fichiers frontend afin de garantir zéro régression. Leur extraction est précisément l'objet des étapes V9.0.1 à V9.0.7.

### Clé Google serveur
Pour cette architecture, privilégier une **nouvelle clé dédiée serveur**. Dans Google Cloud, limiter cette clé aux API nécessaires (Routes API et Geocoding API). Une restriction HTTP Referer conçue pour le navigateur n'est pas adaptée à une Function Netlify côté serveur.
