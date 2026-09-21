# Décisions

## 2026-09-21 — TypeScript, Vite et stockage local

Le projet cible Chrome MV3. TypeScript strict limite les erreurs aux frontières Chrome et API. Vite fournit un build reproductible sans imposer de framework UI. `chrome.storage.local` est retenu pour un MVP local-first ; la synchronisation sera une décision ultérieure.

## 2026-09-21 — Traduction gratuite, sécurité et absence de scraping

### Réponses produit retenues

- **Coût et limites :** le budget cible est de 0 €. L’extension ne doit pas dépendre d’un service payant, d’une carte bancaire ou d’un serveur à démarrer par l’utilisateur. MyMemory est retenu comme premier fournisseur public : son quota officiel est de 5 000 caractères/jour anonymement, 50 000 avec le paramètre e-mail, et 500 octets maximum par requête. Une solution gratuite peut donc être limitée et indisponible au-delà de son quota.
- **Clé API et sécurité :** aucune clé privée ne sera embarquée dans l’extension, commitée ou stockée dans `chrome.storage`. Si un fournisseur exige une clé secrète, il faudra un backend contrôlé par le projet ou une saisie explicite de l’utilisateur, avec les risques documentés. Le MVP privilégie un endpoint sans secret côté client.
- **Support des langues :** MyMemory accepte des paires utilisant des noms ISO ou RFC3066, mais la disponibilité et la qualité dépendent de la mémoire de traduction et de la paire demandée. L’interface devra valider la paire et afficher une erreur explicite plutôt que promettre toutes les langues. Les codes ISO et la paire source/cible seront conservés dans chaque entrée.
- **CORS et backend :** les requêtes de traduction partiront d’un contexte d’extension contrôlé, idéalement du service worker, avec une permission d’hôte limitée à l’endpoint configuré. Chrome autorise les requêtes cross-origin d’une extension avec `host_permissions`, mais un endpoint distant doit tout de même être disponible et correctement sécurisé. Aucun backend payant n’est prévu pour le MVP.
- **Format de réponse :** l’adaptateur traduira une réponse fournisseur vers le contrat interne `Translator`, puis rejettera toute réponse non-JSON, vide ou malformée. Pour MyMemory, le format de référence est `{ "responseData": { "translatedText": "...", "match": number }, "responseStatus": number, "quotaFinished": boolean }`.
- **Hors ligne et erreurs :** aucune traduction distante ne sera tentée hors ligne. L’extension affichera une erreur explicite, ne sauvegardera rien et conservera le texte sélectionné pour permettre une nouvelle tentative. Les traductions déjà enregistrées resteront consultables hors ligne.

### Choix technique

Le fournisseur sera isolé derrière `Translator`. La première implémentation sera MyMemory via son endpoint public `https://api.mymemory.translated.net/get`. Elle ne nécessite ni serveur local ni clé API pour l’usage anonyme. La requête sera limitée à un texte court, la réponse sera validée et le quota sera traité comme une erreur explicite. L’endpoint sera codé comme une constante d’infrastructure autorisée ; aucune URL arbitraire fournie par une page web ne sera exécutée.

LibreTranslate reste une solution de repli possible pour un développeur qui souhaite une instance personnelle, mais elle n’est pas une exigence utilisateur et ne sera pas le chemin par défaut.

Reverso Context ne sera pas scrapé pour le parcours principal. Le site est utile comme service utilisateur et propose une expérience de traduction contextuelle, mais son HTML et ses appels internes ne constituent pas un contrat d’API stable. Le scraping automatisé pourrait casser sans préavis, être bloqué, transmettre du contenu utilisateur à un tiers et entrer en conflit avec les conditions applicables. Une intégration Reverso ne sera envisagée que via une API ou un accord officiellement documenté. À défaut, l’extension pourra seulement ouvrir ou proposer un lien vers Reverso, sans automatiser l’extraction.

### Conséquences

- Le MVP reste local-first et sans dépense obligatoire ni serveur local obligatoire.
- La configuration devra prévoir un endpoint de traduction et un état « fournisseur indisponible ».
- Les permissions Chrome devront rester minimales ; l’endpoint ne devra pas être laissé arbitrairement contrôlable par une page web.
- MyMemory est une dépendance distante gratuite mais non garantie : ses limites, sa disponibilité et ses conditions devront être contrôlées dans l’adaptateur et documentées.

### Références vérifiées

- [Documentation officielle LibreTranslate](https://docs.libretranslate.com/), notamment l’installation autonome, l’API et le format `translatedText`.
- [Spécifications officielles MyMemory](https://mymemory.translated.net/doc/spec.php) et [limites officielles](https://mymemory.translated.net/doc/usagelimits.php), vérifiées le 21 septembre 2026.
- [Présentation officielle de Reverso Context](https://context.reverso.net/translation/about), qui décrit les langues et le fonctionnement contextuel sans fournir de contrat d’API publique pour ce projet.
- [Documentation Chrome sur les requêtes cross-origin des extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), qui impose des `host_permissions` pour les appels depuis le service worker ou les pages de l’extension.
