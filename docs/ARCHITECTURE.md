# Architecture

Memorize est une extension locale-first. Le domaine manipule `AppData`, les ports applicatifs isolent les API externes et l’infrastructure encapsule `chrome.storage.local`. Le popup ne doit pas contenir d’invariants métier. Les frontières Chrome sont limitées au content script, au service worker et aux permissions déclarées dans le manifest.

Le popup peut réinjecter le content script avec `chrome.scripting` lorsque l’extension a été rechargée alors que l’onglet était déjà ouvert. Cela évite de devoir recharger manuellement chaque page après un build de développement ; `activeTab` et `scripting` restent limités à l’action initiée par l’utilisateur.

Le service worker crée aussi le menu contextuel « Traduire avec Memorize ». La sélection est transmise via un état temporaire de `chrome.storage.local`, puis le popup secondaire la consomme et lance automatiquement la traduction.

La langue source est détectée localement avant l’appel de traduction. Le content script transmet l’attribut `lang` et un extrait borné du texte visible de la page ; le popup utilise le texte de la page lorsque l’attribut est absent. Si la langue détectée correspond à la langue cible actuelle, les deux langues sont inversées ; sinon seule la source est remplacée.

La traduction est un port applicatif (`Translator`) et non une dépendance directe de l’interface. Le premier adaptateur cible MyMemory via son endpoint public, depuis un contexte d’extension autorisé. Les réponses sont validées avant d’entrer dans le domaine ; une erreur réseau, un quota épuisé ou une réponse vide ne peut pas créer de vocabulaire. Une traduction réussie enregistre uniquement une statistique d’essai ; `saveTranslation` est appelé séparément par l’action explicite de mémorisation et rattache alors l’entrée au dossier choisi et à l’historique.

Les anciennes racines de langue sont migrées vers une hiérarchie utilisateur. Les dossiers peuvent être créés à la racine ou dans une autre langue identique ; ils utilisent des identifiants indépendants de leur nom, peuvent être imbriqués, déplacés et renommés. La suppression d’un dossier supprime sa descendance et ses mots, mais conserve l’historique des traductions et les statistiques. `entriesInFolder` parcourt toute la descendance et déduplique les entrées.

Les nouvelles installations ne créent aucun dossier de langue par défaut. Une migration retire les anciennes racines techniques et récupère leurs mots dans un dossier utilisateur uniquement lorsqu’elles contiennent déjà des données.

L’export est local et isolé dans `src/application/export.ts`. TXT et CSV sont sérialisés avec un séparateur choisi et une prévisualisation modifiable. APKG génère une base SQLite `collection.anki2` et un conteneur ZIP au format de paquet Anki historique, contenant aussi le fichier `media` requis, sans backend ni média. Son aperçu est informatif : le fichier binaire est construit au téléchargement à partir des entrées sélectionnées.
