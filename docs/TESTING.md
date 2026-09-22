# Tests

Les invariants déterministes des dossiers, la sauvegarde/déduplication du vocabulaire et l’adaptateur MyMemory sont testés avec Vitest. Les tests de l’adaptateur simulent les réponses valides, le quota épuisé, les limites d’entrée et la panne réseau.

Le test manuel est : sélectionner un mot de moins de 500 octets sur une page HTTP(S), ouvrir la popup, vérifier la nouvelle interface et cliquer sur « Traduire ». Vérifier la traduction et le compteur mis en évidence sans apparition immédiate dans le vocabulaire, puis cliquer sur « Mémoriser cette traduction ». S’il n’existe aucun dossier utilisateur, vérifier que la création est proposée ; sinon vérifier le choix du dossier. Dans l’onglet Vocabulaire, créer un dossier à la racine, créer deux niveaux de sous-dossiers, renommer et déplacer un dossier, glisser une carte de vocabulaire sur un autre dossier, supprimer un mot, puis supprimer un dossier et vérifier que ses mots disparaissent. Tester le thème clair/sombre et l’onglet Historique. Vérifier aussi qu’une panne réseau ou un quota épuisé n’ajoute aucune entrée.

Depuis un dossier contenant des mots, ouvrir « Exporter », modifier l’aperçu, tester les séparateurs virgule, point-virgule, tabulation et personnalisé, copier l’aperçu, télécharger un TXT et un CSV, puis télécharger un APKG et l’ouvrir dans Anki. Après mémorisation, vérifier que la popup reste sur l’onglet Traduire.

Les tests d’intégration Chrome et end-to-end automatisés restent à ajouter.
