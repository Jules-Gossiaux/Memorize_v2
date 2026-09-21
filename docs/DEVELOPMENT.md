# Développement

Node.js 20+ et npm 10+ sont recommandés. Installez les dépendances avec `npm install`. Les commandes disponibles sont `npm run dev`, `npm run dev:extension`, `npm run build`, `npm run lint`, `npm run format`, `npm run typecheck` et `npm test`.

Le fournisseur gratuit cible du MVP est MyMemory : l’extension l’appellera directement et l’utilisateur n’aura pas à démarrer de serveur. Les limites connues sont documentées dans `docs/DECISIONS.md`. LibreTranslate peut servir de solution locale facultative pour le développement, mais n’est pas requis. Ne placez jamais de clé API dans `.env`, le manifest, le code client ou `chrome.storage`.
