# Décisions

## 2026-09-21 — TypeScript, Vite et stockage local

Le projet cible Chrome MV3. TypeScript strict limite les erreurs aux frontières Chrome et API. Vite fournit un build reproductible sans imposer de framework UI. `chrome.storage.local` est retenu pour un MVP local-first ; la synchronisation sera une décision ultérieure.

## 2026-09-21 — Traduction gratuite, sécurité et absence de scraping

### Réponses produit retenues

- **Coût et limites :** le budget cible est de 0 €. L’extension ne doit pas dépendre d’un service payant, d’une carte bancaire ou d’un quota implicite. Une solution gratuite peut toutefois avoir des limites de débit, de caractères, de disponibilité ou nécessiter un service local lancé par l’utilisateur.
- **Clé API et sécurité :** aucune clé privée ne sera embarquée dans l’extension, commitée ou stockée dans `chrome.storage`. Si un fournisseur exige une clé secrète, il faudra un backend contrôlé par le projet ou une saisie explicite de l’utilisateur, avec les risques documentés. Le MVP privilégie un endpoint sans secret côté client.
- **Support des langues :** les langues réellement disponibles seront déterminées par le fournisseur configuré. L’interface devra récupérer ou valider cette liste plutôt que promettre toutes les langues. Les codes ISO et la paire source/cible seront conservés dans chaque entrée.
- **CORS et backend :** les requêtes de traduction partiront d’un contexte d’extension contrôlé, idéalement du service worker, avec une permission d’hôte limitée à l’endpoint configuré. Chrome autorise les requêtes cross-origin d’une extension avec `host_permissions`, mais un endpoint distant doit tout de même être disponible et correctement sécurisé. Aucun backend payant n’est prévu pour le MVP.
- **Format de réponse :** l’adaptateur traduira une réponse fournisseur vers le contrat interne `Translator`, puis rejettera toute réponse non-JSON, vide ou malformée. Pour LibreTranslate, le format de référence est `{ "translatedText": "..." }`.
- **Hors ligne et erreurs :** aucune traduction distante ne sera tentée hors ligne. L’extension affichera une erreur explicite, ne sauvegardera rien et conservera le texte sélectionné pour permettre une nouvelle tentative. Les traductions déjà enregistrées resteront consultables hors ligne.

### Choix technique

Le fournisseur sera isolé derrière `Translator`. La première implémentation de référence sera compatible avec une instance LibreTranslate auto-hébergée ou locale : le logiciel est libre et peut être exécuté sans coût de licence, mais l’utilisateur doit fournir l’instance et accepter son coût éventuel en ressources/hébergement. L’endpoint sera configurable et limité à une origine autorisée ; aucune clé ne sera ajoutée au dépôt.

Reverso Context ne sera pas scrapé pour le parcours principal. Le site est utile comme service utilisateur et propose une expérience de traduction contextuelle, mais son HTML et ses appels internes ne constituent pas un contrat d’API stable. Le scraping automatisé pourrait casser sans préavis, être bloqué, transmettre du contenu utilisateur à un tiers et entrer en conflit avec les conditions applicables. Une intégration Reverso ne sera envisagée que via une API ou un accord officiellement documenté. À défaut, l’extension pourra seulement ouvrir ou proposer un lien vers Reverso, sans automatiser l’extraction.

### Conséquences

- Le MVP reste local-first et sans dépense obligatoire.
- La configuration devra prévoir un endpoint de traduction et un état « fournisseur indisponible ».
- Les permissions Chrome devront rester minimales ; l’endpoint ne devra pas être laissé arbitrairement contrôlable par une page web.
- Un fournisseur public gratuit pourrait être ajouté plus tard comme option, mais ses limites et sa disponibilité ne pourront pas être promises sans contrat vérifié.

### Références vérifiées

- [Documentation officielle LibreTranslate](https://docs.libretranslate.com/), notamment l’installation autonome, l’API et le format `translatedText`.
- [Présentation officielle de Reverso Context](https://context.reverso.net/translation/about), qui décrit les langues et le fonctionnement contextuel sans fournir de contrat d’API publique pour ce projet.
- [Documentation Chrome sur les requêtes cross-origin des extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), qui impose des `host_permissions` pour les appels depuis le service worker ou les pages de l’extension.
