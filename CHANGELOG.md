# Changelog

## [0.1.0] - 2026-09-21

- Initialisation du socle TypeScript/Vite pour l’extension Chrome MV3.
- Ajout du modèle de données versionné, du stockage et des invariants de dossiers.
- Ajout des scripts de qualité et des premiers tests unitaires.
- Ajout du parcours MVP sélection, traduction MyMemory, sauvegarde, déduplication et historique.
- Séparation de la traduction et de la mémorisation avec statistiques d’essais persistantes.
- Ajout des sous-dossiers, déplacements, renommages et suppressions confirmées avec suppression cohérente des mots contenus.
- Les dossiers utilisateur peuvent maintenant être créés à la racine ; la mémorisation demande le dossier cible et la suppression d’un dossier ou d’un mot conserve l’historique des traductions.
- Interface de vocabulaire allégée et compteur de traductions rendu plus visible.
- Ajout de l’export éditable TXT, CSV et APKG avec séparateur configurable et aperçu en direct.
- Réinjection automatique du content script après rechargement de l’extension et nouvelle direction visuelle plus compacte.
- Suppression du dossier de langue automatique, actions de dossier directement visibles, export multi-dossiers en temps réel et parcours Traduire compacté.
- Ajout du menu contextuel « Traduire avec Memorize » et simplification de l’état vide de traduction.
- Refonte complète de la popup : navigation par vues, cartes de vocabulaire, recherche, thème clair/sombre et glisser-déposer.
