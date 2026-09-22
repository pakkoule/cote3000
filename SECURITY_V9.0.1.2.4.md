# Cotation 3000 V9.0.1.2.4 — Étiquettes visuelles des membres

## Objectif

Permettre au SUPERADMIN de personnaliser l'étiquette visuelle de chaque membre inscrit, y compris la sienne, sans modifier le rôle technique utilisé pour les permissions.

## Stockage

Table Supabase `public.member_role_labels` :

- `user_id`
- `label_text`
- `icon_text`
- `appearance` (`solid` ou `gradient`)
- `color_start`
- `color_end`
- `gradient_angle`
- métadonnées de création / modification

## Sécurité

- RLS activé.
- Lecture : utilisateurs authentifiés uniquement, nécessaire pour afficher les étiquettes dans la liste des membres en ligne.
- INSERT / UPDATE / DELETE : SUPERADMIN uniquement via les policies RLS fondées sur `private.current_app_role()`.
- Aucun accès `anon`.
- L'étiquette est strictement visuelle et ne modifie jamais `profiles.role`.
- Le rôle technique conserve les protections déjà présentes sur `public.profiles` et le trigger `private.enforce_profile_update_rules()`.

## Compatibilité

Le SUPERADMIN existant reçoit automatiquement l'étiquette historique :

`♛ PREMIUM` — dégradé `#FFF7CF → #D6B65A` à 135°.

La réinitialisation d'une étiquette personnalisée revient au rendu par défaut du rôle concerné.
