# Memorize V2 — brief de développement

## Résumé du produit

Memorize est une extension Chrome qui permet de sélectionner un mot ou une phrase sur une page web, de le traduire, puis de le sauvegarder pour l'apprendre plus tard. Les traductions sont organisées dans une arborescence de dossiers, avec un dossier racine par langue. L'extension doit aussi faciliter la création de listes Quizlet à partir du vocabulaire enregistré.

La V2 doit être une réécriture propre, maintenable et présentable sur GitHub. Le projet doit privilégier la fiabilité, la sécurité, les tests et une architecture claire plutôt que la conservation de l'ancienne implémentation.

## Fonctionnalités obligatoires

### Traduction

- Récupérer le texte sélectionné dans l'onglet actif.
- Récupérer l'URL et un contexte autour du texte sélectionné.
- Traduire avec une API externe configurable.
- Permettre de choisir la langue source et la langue cible.
- Afficher clairement le résultat et les erreurs réseau/API.
- Ne pas sauvegarder une traduction vide ou invalide.

### Vocabulaire

- Sauvegarder le texte original, la traduction, la date, l'URL et le contexte.
- Compter le nombre de fois où un mot ou une phrase a été traduit.
- Conserver plusieurs occurrences d'un même élément.
- Éviter les doublons grâce à un identifiant stable et documenté.

### Dossiers

- Posséder un dossier racine global.
- Créer automatiquement un dossier racine pour la langue concernée.
- Interdire les dossiers de vocabulaire en dehors d'un dossier de langue.
- Créer des sous-dossiers imbriqués.
- Déplacer un élément d'un dossier à un autre.
- Afficher l'arborescence des dossiers.
- Afficher dans un dossier les éléments qui lui appartiennent directement et les sous-dossiers, sans doublons.
- Renommer et supprimer les dossiers avec confirmation.
- Ne pas supprimer un mot du vocabulaire global simplement parce qu'il est retiré d'un dossier où il était aussi utilisé ailleurs.

### Historique

- Conserver un historique chronologique séparé des dossiers.
- Afficher cet historique dans une vue dédiée ou clairement identifiable.
- Limiter ou paginer l'historique si nécessaire.
- Permettre de vider l'historique avec confirmation.
- Distinguer clairement « supprimer de l'historique », « supprimer d'un dossier » et « supprimer définitivement du vocabulaire ».

### Sélection et suppression

- Sélectionner un ou plusieurs mots.
- Sélectionner un dossier et, si souhaité, tous ses éléments descendants.
- Afficher le nombre d'éléments sélectionnés.
- Supprimer les éléments sélectionnés après confirmation.
- Mettre à jour immédiatement l'interface et le stockage après chaque opération.

### Quizlet

- Ajouter un mode d'autofill des champs vides sur une page de création de set Quizlet.
- Permettre d'activer ou désactiver l'autofill.
- Ajouter une action « appliquer maintenant ».
- Utiliser les langues choisies dans Memorize.
- Gérer les changements dynamiques de l'interface Quizlet avec `MutationObserver`.
- Ajouter ensuite une fonctionnalité pour compléter une liste Quizlet à partir d'une liste Memorize.
- Prévoir le choix entre export de mots, phrases ou les deux.

### Préférences et interface

- Sauvegarder les langues préférées.
- Sauvegarder le thème clair/sombre.
- Fournir une interface popup simple, lisible et responsive à la taille de la popup Chrome.
- Prévoir des états de chargement, succès, erreur et état vide.
- Éviter les styles inline autant que possible.

## Fonctionnalités à prévoir ensuite

- Export CSV de l'historique ou du vocabulaire.
- Import ou scan de listes de mots.
- Menu contextuel clic droit « traduire et mémoriser ».
- Meilleure API de traduction ou abstraction permettant d'en changer facilement.
- Synchronisation éventuelle entre appareils.
- Internationalisation de l'interface.
- Statistiques d'apprentissage et répétition espacée.


## Contraintes de qualité

- Manifest Chrome Manifest V3.
- Permissions minimales et justifiées.
- Pas de données sensibles stockées.
- Validation de toutes les données venant de pages web, de l'utilisateur ou d'une API.
- Ne pas injecter de données non échappées avec `innerHTML`.
- Vérifier les réponses HTTP et gérer les erreurs proprement.
- Ajouter une validation de schéma et des migrations de données.
- Utiliser des identifiants de dossiers, jamais leur nom comme clé métier.
- Ajouter ESLint, Prettier et une commande de test fonctionnelle.
- La CI doit installer les dépendances et exécuter les tests.
- Documenter l'installation, le chargement de l'extension dans Chrome, l'architecture et les limites connues.

## Critères de réussite de la V2

- Un utilisateur peut sélectionner un texte, le traduire et le retrouver dans le bon dossier de langue.
- Les mots, occurrences, dossiers et historiques restent cohérents après fermeture et réouverture de la popup.
- Les actions de déplacement, suppression et création de dossiers sont testées.
- L'extension fonctionne avec un stockage vide et avec des données existantes migrées.
- Une erreur réseau n'entraîne ni crash ni sauvegarde incohérente.
- L'autofill Quizlet ne bloque pas le reste de l'extension lorsqu'il est indisponible.
- `npm test` fonctionne sur une installation propre.
- Le README permet à une personne externe d'installer, comprendre et essayer le projet.

