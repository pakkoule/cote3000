# Cotation 3000 V8.0.35 DEV

Version de développement splittée de Cotation 3000, prête pour GitHub + Netlify.

## V8.0.35 — correctif boutons Ajouter des gros référentiels
- Ports mondiaux SMDG, Compagnies maritimes et Douane : le bouton `+ Ajouter` dispose maintenant de sa propre largeur et ne chevauche plus la croix de fermeture.
- Le titre reste flexible et les deux actions restent séparées.
- Sur petit écran, `+ Ajouter` devient un bouton compact `+`.

## Fichiers runtime
- `index.html` — application principale
- `Cotation_3000_V8_communes.js` — dataset communes externalisé
- `Cotation_3000_V8_account.js` / `.css` — comptes, profils, présence, signalements et administration
- `Cotation_3000_V8_adr.js` / `.css` — référentiel ADR / IMDG
- `Cotation_3000_V8_ports_world.js` / `.css` — référentiel mondial Ports & Terminaux SMDG
- `Cotation_3000_V8_maritime_companies.js` / `.css` — compagnies maritimes / filiales / navires Le Havre
- `Cotation_3000_V8_customs.js` / `.css` — référentiel Douane / ICS2 / NCTS V2
- `Cotation_3000_V8_reference_editor.js` / `.css` — couche d’édition ADMIN/SUPERADMIN
- `Cotation_3000_V8_legacy_references.js` — pont des référentiels historiques vers la couche d’overrides Supabase
- `adr-icons/` — pictogrammes ADR
- `netlify.toml` — publication statique depuis la racine

## V8.0.35 DEV — édition fiabilisée + base des villes
- Fenêtre d’édition portée au-dessus de tous les référentiels ouverts.
- Boutons **✏ Modifier** fiabilisés via gestion déléguée des clics.
- Les boutons d’édition n’élargissent plus les tableaux : retour à la ligne forcé et largeur des tableaux contenue dans la fenêtre.
- **Lexique**, **TRM/LOTI** et **TVA** : ajout d’entrées disponible pour SUPERADMIN. Les nouveaux IDs Lexique et LOTI sont préremplis automatiquement.
- **TVA** : une nouvelle destination peut être classée **INTRACOM** ou **HORS INTRACOM**, avec codes ISO et liste ports/villes.
- **Base des villes** : modification des communes existantes et ajout d’une ville par SUPERADMIN, avec choix du département, de la **Zone Lamy** et de la distance. La source GitHub des 40 793 communes reste intacte ; Supabase stocke les overrides.
- Entêtes du **Lexique transport** recolorés en doré clair avec texte sombre pour corriger leur lisibilité.
- `reference_overrides` accepte désormais la famille `communes`, toujours avec RLS et journalisation dans `data_change_log`.

Les ADMIN peuvent modifier les entrées existantes. Les SUPERADMIN peuvent en plus ajouter les entrées autorisées et restaurer la version source.

### Garde-fous
- Base des villes : suppression désactivée pour cette première version ; modification et ajout sont autorisés.
- TVA : ajout autorisé, suppression toujours désactivée pour préserver le découpage historique.
- Surcharges carburant : les taux mensuels sont éditables séparément des lignes clients ; l’ajout concerne les lignes clients.
- Les fichiers source GitHub restent intacts : Supabase agit comme couche d’overrides jusqu’au futur export consolidé XLSX/JSON.

## Sources référentielles embarquées
- `Referentiel_ADR_IMDG_Cotation3000_V3.xlsx`
- `Referentiel_Ports_Conteneurs_SMDG_V2.xlsx`
- `Referentiel_Compagnies_Maritimes_2026_V5.xlsx`
- `Referentiel_Douane_ICS2_NCTS_V2.xlsx`

## Référentiels déjà éditables
- ADR / IMDG
- Ports mondiaux SMDG
- Compagnies maritimes
- Douane / ICS2 / NCTS
- ISO des conteneurs
- TVA intracommunautaire
- Surcharges carburant
- TRM pratique / LOTI
- Lexique transport
- Comptes TVA
- Lieux portuaires
- Base des villes / communes (Zone Lamy)

## Fonctions V8 conservées
- Authentification Supabase et rôles USER / CONTRIBUTOR / EDITOR / ADMIN / SUPERADMIN.
- Favoris et préférences synchronisés au compte.
- Signalements Bug / Suggestion / Manque base / Correction référentiel.
- Historique **Modifications BDD** dans le registre administrateur.
- Upload de logos compagnies dans Supabase Storage.
- Recherche universelle synchronisée après édition.
- Mode Empilement avec option **Aller-retour** et contrôle Retour masqué.

## Déploiement Netlify
Aucune commande de build. Publier la racine (`.`).

### V8.0.35 — correctif boutons Modifier base des villes
- Correction structurelle de la duplication récursive des boutons `Modifier` dans le tableau des communes.
- Les boutons d'action utilisent désormais des attributs dédiés (`data-c3k-edit-*`) et ne peuvent plus être rescannés comme des fiches éditables.
- Nettoyage automatique des anciens boutons imbriqués éventuellement déjà présents dans le DOM.
- Un seul bouton `Modifier` est conservé par ligne, y compris après recherche, filtre, pagination ou rafraîchissement des référentiels.


## V8.0.35 — synchro des communes ajoutées
- Corrige l’injection des nouvelles communes Supabase dans la table principale.
- Les lignes historiques sont désormais reconnues par leur clé stable `base-<index>` lors des synchronisations.
- Reconstruction immédiate des index de recherche/filtres/pagination après ajout ou modification.
- Après ajout, la nouvelle commune est automatiquement recherchée et affichée dans le tableau.


## V8.0.35 DEV
- Header : les vagues sont abaissées et masquées sous le bloc de connexion, puis réapparaissent sous sa base pour une intégration plus propre.


## V8.0.35 — fiches navires enrichies
- Cadre photo navire avec upload Supabase.
- IMO modifiable grâce à une clé interne stable.
- Base ISO 3166-1 de 249 pavillons avec drapeaux.
- Longueur totale, année de construction, VesselFinder/MarineTraffic et favicon.
- Choix de la rubrique avant ajout (groupes/filiales/navires, ports/terminaux/opérateurs, etc.).
