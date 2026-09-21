# Règles de travail du projet Memorize V2

Ce document est la référence de travail pour les agents, contributeurs et outils automatisés qui interviennent dans ce dépôt. Il complète le `README.md`, `CONTRIBUTING.md` et la documentation du dossier `docs/`.

## 1. Mission et priorités

Memorize est une extension Chrome Manifest V3 qui permet de sélectionner un texte sur une page web, de le traduire, puis de conserver le vocabulaire et son historique dans une arborescence de dossiers.

L’objectif est de construire une base fiable, compréhensible, testable et maintenable. Les priorités sont, dans cet ordre :

1. Exactitude et intégrité des données.
2. Sécurité et respect de la vie privée.
3. Fiabilité et comportement prévisible.
4. Maintenabilité et simplicité.
5. Tests et observabilité utiles.
6. Accessibilité et expérience utilisateur.
7. Performance mesurée.
8. Apparence et fonctionnalités secondaires.

Ne jamais sacrifier une priorité supérieure pour livrer plus vite ou ajouter du polish.

## 2. Inspection obligatoire avant toute action

Avant de créer, modifier ou supprimer quoi que ce soit :

1. Identifier le répertoire de travail et l’objectif de la tâche.
2. Lire les règles existantes : `RULES.md`, `AGENTS.md` s’il existe, `CONTRIBUTING.md`, `README.md`, règles de l’IDE et configuration CI.
3. Inspecter l’arborescence, les configurations, les scripts et les dépendances.
4. Vérifier Git : branche courante, état de travail, remotes, derniers commits et worktrees.
5. Vérifier les outils et versions disponibles : Node.js, npm, Git et outils spécifiques utilisés par la tâche.
6. Rechercher les tests, migrations, workflows CI, mécanismes de build et de déploiement.
7. Identifier les modifications déjà présentes. Ne jamais les écraser silencieusement ni reformater des fichiers sans nécessité.
8. Signaler les incohérences entre la documentation, le code, le manifest et le comportement réellement vérifié.

Si le dossier est vide, créer la structure minimale adaptée. S’il contient déjà du code, préserver l’existant et privilégier une migration progressive.

Commencer chaque tâche par un état des lieux synthétique et les premières actions prévues. Ne pas coder avant cette inspection, sauf demande explicite contraire de l’utilisateur.

## 3. Décisions et hypothèses

Avant toute décision structurante, identifier si possible :

- le problème résolu et les utilisateurs concernés ;
- les plateformes et versions ciblées ;
- les données importantes ou sensibles ;
- le caractère local-first, connecté ou hybride ;
- les contraintes de coût, compatibilité et déploiement ;
- le périmètre indispensable du MVP ;
- les limitations acceptées.

Une question non critique ne doit pas bloquer l’avancement. Formuler alors une hypothèse explicite, choisir la solution la plus simple et réversible, puis la documenter dans `docs/DECISIONS.md` si elle influence l’architecture ou le produit.

Ne jamais présenter une possibilité théorique comme une fonctionnalité compatible ou livrée. Toute affirmation de compatibilité, de fonctionnement ou de test doit être appuyée par le code ou une commande réellement exécutée.

## 4. Architecture et code

- Respecter la séparation actuelle : `src/domain` pour les invariants métier, `src/application` pour les ports et cas d’usage, `src/infrastructure` pour Chrome Storage et APIs externes, `src/popup` pour l’interface.
- Garder la logique métier indépendante de l’interface lorsque c’est raisonnable.
- Ne pas placer de règles métier complexes ou de persistance directement dans les composants UI.
- Préférer un code explicite, lisible et facilement supprimable à une abstraction générique sans cas d’usage réel.
- Ne pas dupliquer les sources de vérité.
- Utiliser des identifiants stables pour les dossiers et éléments ; le nom affiché d’un dossier ne doit jamais être une clé métier.
- Utiliser des timestamps ISO 8601 en UTC et documenter toute autre unité ou convention.
- Valider toutes les entrées venant de l’utilisateur, du DOM, du content script, du stockage Chrome, d’un fichier, d’une API ou d’une autre frontière externe.
- Ne pas masquer une erreur importante derrière une valeur silencieuse ou un fallback trompeur.
- Ne pas ajouter de dépendance sans vérifier sa nécessité, sa compatibilité, sa maintenance et sa licence.
- Adapter les choix au TypeScript strict, aux conventions idiomatiques et aux scripts déjà présents.

## 5. Données, stockage et migrations

- Traiter le vocabulaire, les occurrences, les dossiers, les préférences et l’historique comme des données persistantes importantes.
- Décrire les relations importantes dans `docs/ARCHITECTURE.md`.
- Versionner toute modification de schéma et rendre chaque migration rejouable une seule fois.
- Valider et normaliser les données chargées avant de les utiliser.
- Définir le comportement en cas de donnée manquante, invalide, dupliquée ou interrompue.
- Préserver les occurrences et l’historique lorsque le produit le requiert.
- Ne jamais supprimer silencieusement une donnée persistante.
- Séparer clairement la suppression d’un dossier, le retrait d’un élément d’un dossier, la suppression de l’historique et la suppression définitive du vocabulaire.
- Utiliser des opérations cohérentes pour les modifications multi-étapes et éviter les états partiellement sauvegardés.
- Tester les migrations, les doublons, les données vides et les reprises après interruption lorsque le comportement est concerné.

## 6. Sécurité et vie privée

- Ne jamais commiter de secret, token, clé API, certificat privé ou donnée utilisateur.
- Ne jamais stocker une clé API privée dans l’extension ou dans `chrome.storage`.
- Réduire les permissions Chrome au strict nécessaire et documenter leur justification.
- Vérifier les URLs, origines, réponses HTTP, statuts, types de contenu et formats JSON des services externes.
- Ne pas injecter de données non échappées avec `innerHTML`.
- Préférer `textContent`, la création DOM explicite ou un rendu sûr pour les données externes.
- Ne pas transmettre plus de contexte ou de contenu de page que nécessaire au fonctionnement demandé.
- Réduire les logs au strict nécessaire ; ne jamais logger de contenu sensible, de token ou de données utilisateur complète.
- Documenter les variables d’environnement et utiliser un fichier d’exemple sans secret si nécessaire.
- Vérifier les permissions, endpoints, fichiers importés et entrées provenant de pages web.

## 7. Traduction et intégrations externes

- Isoler chaque fournisseur de traduction derrière l’interface `Translator`.
- Ne jamais sauvegarder une traduction vide, invalide ou non vérifiée.
- Gérer explicitement les erreurs réseau, timeouts, statuts HTTP, limites de quota et réponses inattendues.
- Ne pas rendre toute l’extension inutilisable si un fournisseur externe est indisponible.
- Tester les contrats de réponse et prévoir un comportement local compréhensible lorsque le service est inaccessible.
- Avant toute API Chrome, navigateur, cloud ou service externe, vérifier la faisabilité réelle, les permissions, le cycle de vie, les limites et la solution de repli.
- Documenter les résultats de cette vérification avant de transformer une hypothèse en code produit.

## 8. Interface et accessibilité

- Prévoir les états de chargement, succès, erreur et état vide.
- Afficher des messages d’erreur compréhensibles sans exposer de détails sensibles.
- Maintenir une interface lisible et responsive à la taille d’une popup Chrome.
- Utiliser des contrôles accessibles : labels associés, focus visible, rôles appropriés et messages d’état.
- Demander confirmation pour les actions destructives.
- Mettre à jour l’interface et le stockage de manière cohérente après chaque opération.
- Ne pas bloquer le reste de l’extension si Quizlet ou une intégration optionnelle est indisponible.

## 9. Tests et qualité

Maintenir une pyramide de tests adaptée au projet :

- tests unitaires pour la logique déterministe et les invariants métier ;
- tests d’intégration pour le stockage, les migrations et les frontières Chrome ;
- tests de contrat pour les APIs de traduction et formats externes ;
- tests d’interface ou end-to-end pour les parcours critiques.

Tout comportement observable important doit couvrir, lorsque pertinent :

- le cas nominal ;
- les erreurs et données invalides ;
- les valeurs vides et limites ;
- les doublons ;
- les permissions refusées et états hors ligne ;
- les dates, fuseaux et changements de jour ;
- la reprise après interruption ;
- les régressions connues.

Les commandes standard du projet sont :

```text
npm install
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Si une commande échoue, corriger la cause lorsqu’elle appartient au changement. Sinon, documenter précisément l’échec et ne jamais déclarer la validation réussie.

## 10. Git et GitHub

- Ne jamais travailler directement sur `main` ou `master`.
- Créer une branche dédiée par tâche : `feat-*`, `fix-*`, `docs-*`, `refactor-*`, `test-*` ou `chore-*`.
- Utiliser un worktree si plusieurs agents ou tâches travaillent en parallèle.
- Ne jamais toucher aux modifications d’un autre agent.
- Ne jamais utiliser `git reset --hard`, force-push ou supprimer une branche/worktree sans autorisation explicite.
- Ne jamais perdre de travail local pour obtenir un état propre.
- Garder des commits petits, cohérents et conformes à Conventional Commits.
- Une pull request doit représenter une unité révisable et testable.
- Une PR doit préciser le contexte, le comportement attendu, les changements, les tests, les limites et les captures si l’interface change.
- Vérifier la CI avant de merger.
- Après merge, synchroniser la branche de travail avec la branche principale et ne supprimer que les branches ou worktrees appartenant à la tâche terminée.

## 11. Workflow obligatoire pour chaque changement

1. Décrire le besoin et les critères d’acceptation.
2. Inspecter l’implémentation concernée.
3. Identifier le plus petit changement vérifiable.
4. Identifier les risques : données, compatibilité, sécurité, scheduling, import/export, permissions, UX et régressions.
5. Implémenter sans élargir inutilement le périmètre.
6. Ajouter ou mettre à jour les tests pertinents.
7. Exécuter formatage, lint, typecheck, tests ciblés, suite complète et build lorsque possible.
8. Relire le diff et rechercher les fichiers ou changements accidentels.
9. Mettre à jour la documentation et le changelog si le comportement visible change.
10. Créer un commit ciblé sur la branche dédiée.
11. Pousser la branche et ouvrir ou mettre à jour la PR lorsque le workflow GitHub est utilisé.
12. Donner un compte rendu exact : changements, commandes, résultats, limites et prochaine étape.

## 12. Fin de tâche

Une tâche est terminée uniquement si :

- le code est compréhensible et limité au besoin ;
- les tests pertinents existent et passent, ou leurs limites sont signalées ;
- typage, lint et formatage sont validés lorsqu’ils sont disponibles ;
- la documentation reflète le comportement réel ;
- les limites et hypothèses sont explicites ;
- le diff ne contient pas de changement sans rapport ;
- le commit est créé sur la bonne branche ;
- la PR est prête à être relue lorsque le dépôt utilise des PR ;
- aucun résultat n’est présenté comme vérifié sans avoir été réellement exécuté.
