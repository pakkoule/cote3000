# Cotation 3000 V9.0.1.2.3 — Contact display name

## Changement
- Le champ `Nom affiché` a été retiré de l’éditeur de contact.
- `display_name` reste stocké en base pour compatibilité avec les recherches et les fonctions existantes.
- Sa valeur est désormais générée automatiquement côté application à partir de `Prénom + Nom` lors de chaque création ou modification.
- Le prénom et le nom sont obligatoires dans l’éditeur afin d’éviter un `display_name` vide.

## Sécurité / base
Aucune modification de schéma, de RLS ou de privilège Supabase dans cette version.
