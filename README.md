# Cotation 3000 V8.0.3 DEV

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

## V8.0.3 DEV
- bloc compte en blanc/doré ;
- boutons Se connecter / Créer un compte sur une même ligne ;
- nombre de connectés sur une seconde ligne ;
- fenêtre Compte Cotation 3000 centrée dans la fenêtre.

## V8.0.3 DEV
- Alignement strict du bloc compte avec la recherche universelle.
- Largeur extérieure commune sur desktop, modes compact/ultra-compact et mobile.
- Boutons Connexion / Création de compte en colonnes 50/50 parfaitement symétriques.
- Ligne du nombre de connectés sur toute la largeur intérieure.
