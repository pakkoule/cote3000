# Cotation 3000 V9.0.1.2.2 — correctif réseau Europe

Aucune clé sensible n'est déplacée vers le navigateur.

Le navigateur appelle désormais `/api/route-distance`, réécrit côté Netlify vers la Function `google-route`. Les variables `GOOGLE_MAPS_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` restent exclusivement côté serveur. L'endpoint POST reste authentifié et soumis au quota existant.

Le GET de santé ne retourne aucune clé ni valeur secrète : uniquement l'état de disponibilité du service.
