# Architecture

Memorize est une extension locale-first. Le domaine manipule `AppData`, les ports applicatifs isolent les API externes et l’infrastructure encapsule `chrome.storage.local`. Le popup ne doit pas contenir d’invariants métier. Les frontières Chrome sont limitées au content script, au service worker et aux permissions déclarées dans le manifest.

La traduction est un port applicatif (`Translator`) et non une dépendance directe de l’interface. L’implémentation devra être exécutée depuis un contexte d’extension autorisé, avec un endpoint explicitement configuré. Les réponses sont validées avant d’entrer dans le domaine ; une erreur réseau ou une réponse vide ne peut pas créer de vocabulaire. Le MVP ne scrape pas Reverso Context et ne stocke aucune clé API privée.
