# Architecture

Memorize est une extension locale-first. Le domaine manipule `AppData`, les ports applicatifs isolent les API externes et l’infrastructure encapsule `chrome.storage.local`. Le popup ne doit pas contenir d’invariants métier. Les frontières Chrome sont limitées au content script, au service worker et aux permissions déclarées dans le manifest.

La traduction est un port applicatif (`Translator`) et non une dépendance directe de l’interface. Le premier adaptateur cible MyMemory via son endpoint public, depuis un contexte d’extension autorisé. Les réponses sont validées avant d’entrer dans le domaine ; une erreur réseau, un quota épuisé ou une réponse vide ne peut pas créer de vocabulaire. Une traduction réussie enregistre uniquement une statistique d’essai ; `saveTranslation` est appelé séparément par l’action explicite de mémorisation et rattache alors l’entrée au dossier choisi et à l’historique.

Les dossiers de langue sont des racines système protégées. Les dossiers utilisateur peuvent être créés à la racine ou dans une autre langue identique ; ils utilisent des identifiants indépendants de leur nom, peuvent être imbriqués, déplacés et renommés. La suppression d’un dossier supprime sa descendance, ses mots, leurs occurrences d’historique et leurs statistiques de traduction. `entriesInFolder` parcourt toute la descendance et déduplique les entrées.
