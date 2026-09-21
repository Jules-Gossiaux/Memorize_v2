# Memorize V2

Extension Chrome Manifest V3 pour traduire et mémoriser du vocabulaire depuis une page web.

## État actuel

Le dépôt contient le socle initial : TypeScript strict, build Vite, stockage local versionné, modèle de dossiers/vocabulaire, service worker, content script, popup de préférences et tests unitaires de la logique de dossiers. La traduction externe et l’interface complète restent à implémenter.

## Installation et développement

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Pour charger l’extension : exécutez `npm run build`, ouvrez `chrome://extensions`, activez le mode développeur, puis chargez le dossier `dist/`.

## Architecture

- `src/domain` : modèle de données et invariants métier.
- `src/application` : ports applicatifs, dont l’adaptateur de traduction.
- `src/infrastructure` : persistance Chrome Storage et migrations.
- `src/popup` : interface de la popup.
- `src/background.ts` et `src/content.ts` : frontières Chrome.

Les dates sont des chaînes ISO 8601 en UTC. Les identifiants métier des dossiers sont distincts de leurs noms. Aucune clé API n’est stockée dans l’extension à ce stade.

## Limites connues

La traduction, la gestion complète de l’arborescence, l’historique visible, Quizlet, l’export et la CI sont prévus mais ne sont pas encore livrés. Le fournisseur de traduction devra être ajouté derrière `Translator`, avec validation stricte des réponses et gestion des secrets côté serveur si nécessaire. Le choix documenté pour rester gratuit est une instance LibreTranslate locale ou auto-hébergée ; Reverso Context ne sera pas scrapé.
