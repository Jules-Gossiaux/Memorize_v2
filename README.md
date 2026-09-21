# Memorize V2

Extension Chrome Manifest V3 pour traduire et mémoriser du vocabulaire depuis une page web.

## État actuel

Le dépôt contient un gestionnaire de vocabulaire local : sélection depuis la page active, traduction via MyMemory, affichage du nombre d’essais, mémorisation explicite, sauvegarde locale versionnée, déduplication, dossier racine par langue, sous-dossiers, déplacement par glisser-déposer, renommage, suppression confirmée, recherche, thème clair/sombre, historique et préférences. Quizlet et l’export restent à implémenter.

## Installation et développement

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Pour le développement continu de l’extension, utilisez `npm run dev:extension`. Vite reconstruit `dist/` après chaque modification ; actualisez ensuite l’extension dans `chrome://extensions`.

Pour charger l’extension : exécutez `npm run build`, ouvrez `chrome://extensions`, activez le mode développeur, puis chargez le dossier `dist/`.

## Architecture

- `src/domain` : modèle de données et invariants métier.
- `src/application` : ports applicatifs, dont l’adaptateur de traduction.
- `src/infrastructure` : persistance Chrome Storage et migrations.
- `src/popup` : interface de la popup.
- `src/background.ts` et `src/content.ts` : frontières Chrome.

Les dates sont des chaînes ISO 8601 en UTC. Les identifiants métier des dossiers sont distincts de leurs noms. Aucune clé API n’est stockée dans l’extension à ce stade.

## Limites connues

Quizlet et l’export ne sont pas encore livrés. MyMemory est un service externe gratuit soumis à ses limites de quota et de disponibilité ; l’extension affiche une erreur et ne sauvegarde rien en cas d’échec. Une traduction réussie n’est pas mémorisée automatiquement : l’utilisateur doit cliquer sur « Mémoriser cette traduction ». LibreTranslate reste optionnel et Reverso Context ne sera pas scrapé.
