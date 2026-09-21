# Tests

Les invariants déterministes des dossiers, la sauvegarde/déduplication du vocabulaire et l’adaptateur MyMemory sont testés avec Vitest. Les tests de l’adaptateur simulent les réponses valides, le quota épuisé, les limites d’entrée et la panne réseau.

Le test manuel du MVP est : sélectionner un mot de moins de 500 octets sur une page HTTP(S), ouvrir la popup, vérifier les langues, cliquer sur « Traduire et mémoriser », puis fermer/réouvrir la popup et vérifier le vocabulaire et l’historique. Vérifier aussi qu’une panne réseau ou un quota épuisé n’ajoute aucune entrée.

Les tests d’intégration Chrome et end-to-end automatisés restent à ajouter.
