# Architecture

Memorize est une extension locale-first. Le domaine manipule `AppData`, les ports applicatifs isolent les API externes et l’infrastructure encapsule `chrome.storage.local`. Le popup ne doit pas contenir d’invariants métier. Les frontières Chrome sont limitées au content script, au service worker et aux permissions déclarées dans le manifest.
