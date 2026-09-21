# Règles du projet

- Ne jamais stocker de secret ou de clé API dans l’extension.
- Valider toutes les données venant de Chrome, du DOM, de l’utilisateur ou d’un réseau.
- Préserver les données existantes et versionner les migrations.
- Utiliser des identifiants stables plutôt que les noms de dossiers comme clés.
- Ajouter un test pour chaque invariant métier modifié.
- Ne pas utiliser `innerHTML` avec des données externes non échappées.
- Travailler sur une branche dédiée et utiliser des commits Conventional Commits.
