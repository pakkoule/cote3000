# Cotation 3000 V9.0.1.2.6

## V9.0.1 — socle sécurisé

Première étape de la roadmap V9. Cette version conserve volontairement les référentiels statiques actuels pour éviter toute régression, mais prépare leur sortie progressive du frontend.

### Principales évolutions
- clé Google retirée du navigateur ; calcul Europe via Function Netlify authentifiée ;
- nouveau socle réseau/cache/erreurs `Cotation_3000_V9_core.js` ;
- quota serveur Google par utilisateur ;
- RLS auditée sur les tables `public` ;
- accès anonyme supprimé de `reference_overrides` et `fuel_base_history` ;
- tables techniques V9 déplacées dans le schéma privé Supabase ;
- headers HTTP renforcés ;
- aucun changement fonctionnel volontaire sur Communes/Lamy, Ports, Maritime, ADR, Douane, Annuaire, cotation ou favoris.

### Configuration obligatoire Netlify
Dans **Site configuration → Environment variables**, ajouter :
- `GOOGLE_MAPS_API_KEY` = nouvelle clé Google serveur ;
- `SUPABASE_SERVICE_ROLE_KEY` = clé service-role Supabase (uniquement côté Netlify).

`SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` peuvent aussi être définies, mais la Function contient déjà les valeurs publiques de secours.

Après configuration, redéployer le site. La clé Google historiquement exposée dans les versions V8 doit être **rotatée/révoquée dans Google Cloud**.

### Structure du dépôt
Tout reste à la racine comme auparavant, à l'exception de `netlify/functions/google-route.js`, sous-dossier techniquement nécessaire à Netlify Functions.

### Sécurité
Voir `SECURITY_V9.0.1.md` et `20260922_v9_security_verify.sql`.


## V9.0.1 — Communes / Lamy
Moteur Supabase privé + RPC authentifiée + cache navigateur + Shadow Mode de comparaison avec le moteur local. Voir `SECURITY_V9.0.1.md` et `20260922_v901_communes_shadow.sql`.


## V9.0.1.1 — Société libre + répertoire interne

- lors de la création/modification d’un contact, le champ Société accepte désormais une saisie libre avec suggestions ;
- si la société saisie n’existe pas, elle est créée automatiquement dans `client_companies` puis liée au contact ;
- contrôle anti-doublon normalisé côté PostgreSQL ;
- nouvel onglet **Interne** dans l’annuaire, visible uniquement aux membres authentifiés ;
- entrée initiale : **Standard — Ligne 11 — 02 35 13 01 81** ;
- création/modification/désactivation des lignes internes réservée au superadmin ;
- migration : `20260922_v9011_client_company_internal_directory.sql`.


## V9.0.1.2 — Badges services + recherche universelle privée

- chaque ligne interne possède désormais une **couleur de badge** et une **icône personnalisée** ;
- palette rapide + sélecteur de couleur libre ;
- icône personnalisable par emoji/symbole court, avec presets ;
- le champ **Service** propose les services déjà utilisés et reprend leur couleur/icône lors de la sélection ;
- les cartes de lignes internes affichent le **numéro de ligne en grand dans un carré** reprenant la couleur du service ;
- le service est affiché sous forme de badge coloré avec son icône ;
- lorsque l’utilisateur est connecté, la **recherche universelle** retourne aussi les contacts, sociétés et lignes internes ;
- recherche des lignes internes également par numéro de ligne ou numéro de téléphone, y compris en saisie numérique compacte ;
- un résultat privé ouvre directement le bon onglet de l’annuaire avec le filtre correspondant ;
- migration : `20260922_v9012_internal_directory_badges.sql`.


## V9.0.1.2.1 — Badge de ligne dans la recherche universelle

- les résultats de type **ligne interne** n'affichent plus `Ligne 11` comme simple texte à droite ;
- le numéro (`11`) est affiché dans un **grand badge carré** avec la mention `LIGNE` ;
- le fond du badge reprend exactement la valeur `badge_color` enregistrée dans la fiche de l'annuaire interne ;
- la couleur du texte est calculée automatiquement pour conserver un contraste lisible ;
- le badge conserve en infobulle le libellé complet de la ligne ;
- aucun changement de schéma Supabase n'est nécessaire pour ce correctif.


## V9.0.1.2.3 — Correctif Tronçon Europe / Failed to fetch

- appel navigateur principal déplacé vers `/api/route-distance` ;
- rewrite Netlify interne vers `/.netlify/functions/google-route` ;
- déclaration moderne du dossier Functions via `[functions].directory` ;
- fallback automatique vers l’ancien endpoint si l’alias n’est pas disponible ;
- timeout et gestion des erreurs réseau renforcés côté Function ;
- les erreurs réseau ne remontent plus sous la forme brute `Failed to fetch` ;
- `GET /api/route-distance` sert de contrôle de santé léger après déploiement.


## V9.0.1.2.4 — Étiquettes visuelles des membres

- SUPERADMIN : création/modification d’une étiquette visuelle pour chaque membre, y compris lui-même.
- Intitulé libre, icône/emoji, couleur unie ou dégradé.
- 12 variations proposées + couleurs personnalisées et orientation du dégradé.
- Affichage de l’étiquette dans la liste des membres en ligne et dans le registre des comptes.
- Le rôle technique reste séparé et continue seul à gérer les permissions.
- `♛ PREMIUM` doré reste le rendu par défaut du SUPERADMIN.
- Supabase : table `member_role_labels`, RLS lecture authentifiée et écriture SUPERADMIN uniquement.


## V9.0.1.2.5 — 10 nouveaux avatars camion + fin des avatars personnalisés

- ajout de **10 nouvelles variations de camions** à la galerie d’avatars ;
- le choix d’avatar repose désormais uniquement sur une **galerie prédéfinie** de camions ;
- la possibilité d’**importer un avatar personnalisé** est supprimée de l’éditeur de profil ;
- l’affichage des profils et des membres en ligne n’utilise plus les anciens avatars uploadés ;
- l’enregistrement du profil force désormais `avatar_kind = base` et vide `avatar_url`.


## V9.0.1.2.6 — Import annuaire interne

- import des **31 lignes internes** du fichier `telephones.xlsx` ;
- 18 lignes disposent d’un numéro direct et 13 utilisent uniquement leur numéro de ligne interne ;
- remplacement de l’ancienne entrée d’exemple `Standard — Ligne 11` par `EMILIE — Ligne 11 — 02 35 13 01 81` ;
- le champ téléphone direct de l’annuaire interne devient facultatif ;
- aucune catégorie de service n’est inventée : les nouvelles lignes restent génériques jusqu’à attribution par le SUPERADMIN ;
- migration : `20260922_v90126_internal_directory_telephones.sql`.
