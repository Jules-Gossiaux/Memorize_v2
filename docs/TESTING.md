# Tests

Les invariants déterministes des dossiers, la sauvegarde/déduplication du vocabulaire et l’adaptateur MyMemory sont testés avec Vitest. Les tests de l’adaptateur simulent les réponses valides, le quota épuisé, les limites d’entrée et la panne réseau.

Le test manuel est : sélectionner un mot de moins de 500 octets sur une page HTTP(S), ouvrir la popup, vérifier la nouvelle interface et cliquer sur « Traduire ». Vérifier la traduction et le compteur sans apparition immédiate dans le vocabulaire, puis cliquer sur « Mémoriser cette traduction ». Dans l’onglet Vocabulaire, rechercher une entrée, créer deux niveaux de sous-dossiers, renommer le dossier, glisser une carte de vocabulaire sur un autre dossier, puis supprimer le dossier et vérifier que l’entrée globale est conservée. Tester le thème clair/sombre et l’onglet Historique. Vérifier aussi qu’une panne réseau ou un quota épuisé n’ajoute aucune entrée.

Les tests d’intégration Chrome et end-to-end automatisés restent à ajouter.
