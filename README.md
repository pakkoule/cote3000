# Cotation 3000 V8.0.6 DEV

Version de développement splittée de Cotation 3000.

## Fichiers
- `index.html` : application principale
- `Cotation_3000_V8_communes.js` : dataset communes extrait du HTML
- `Cotation_3000_V8_account.js` : comptes, profil, favoris synchronisés, présence et signalements Supabase
- `Cotation_3000_V8_account.css` : styles du module compte
- `netlify.toml` : publication statique depuis la racine

## Déploiement Netlify
Aucune commande de build. Publier la racine du dépôt.

## Auth Supabase après déploiement
Dans Supabase > Authentication > URL Configuration :
- définir `Site URL` sur l'URL de production Netlify ;
- ajouter cette URL aux Redirect URLs ;
- ajouter les URL de Deploy Preview si elles doivent accepter les confirmations d'e-mail.

## Backend
Supabase — projet Cotation 3000 V8.

> DEV : le dataset communes n'est plus visible via Ctrl+U mais reste téléchargeable comme ressource statique. La migration complète de la base métier vers Supabase sera la prochaine étape pour une protection serveur réelle.

## V8.0.6 DEV
- bloc compte aligné avec la recherche universelle ;
- connecté : le bouton `Créer un compte` devient `Se déconnecter` ;
- déconnecté : retour automatique au bouton `Créer un compte` ;
- signalement rapide avec 4 catégories : Bug, Suggestion, Manque dans la base, Correction de référentiel ;
- placeholder adapté automatiquement au type de signalement ;
- contexte de recherche et module actif joints automatiquement au signalement ;
- registre administrateur avec libellés de catégories lisibles en français ;
- message de confirmation de compte simplifié, sans mention de Supabase ;
- redirection de confirmation d’e-mail forcée vers `https://cotation3000.netlify.app` pour éviter tout retour vers `localhost`.
- cloche administrateur visible uniquement pour ADMIN/SUPERADMIN ;
- point rouge lorsqu’au moins un signalement est `Nouveau` ou `En cours` ;
- actualisation automatique des notifications toutes les 30 secondes ;
- espace visuel ajouté entre la recherche universelle et le bloc compte ;
- intégration du bloc compte aux vagues du header avec halo translucide et prolongement courbe.
