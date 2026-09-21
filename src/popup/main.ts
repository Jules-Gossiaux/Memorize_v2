import "./style.css";
import { chromeStorage } from "../infrastructure/storage";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Conteneur popup introuvable.");

app.innerHTML = `<h1>Memorize</h1><p class="muted">Sélectionnez un texte sur une page puis ouvrez l’extension.</p><label>Langue source <input id="source" value="auto" maxlength="10"></label><label>Langue cible <input id="target" value="fr" maxlength="10"></label><button id="save">Enregistrer les préférences</button><p id="status" role="status"></p>`;
const source = document.querySelector<HTMLInputElement>("#source");
const target = document.querySelector<HTMLInputElement>("#target");
const status = document.querySelector<HTMLParagraphElement>("#status");
void (async () => {
  const data = await chromeStorage.load();
  if (source) source.value = data.preferences.sourceLanguage;
  if (target) target.value = data.preferences.targetLanguage;
  document
    .querySelector<HTMLButtonElement>("#save")
    ?.addEventListener("click", async () => {
      if (!source?.value.trim() || !target?.value.trim()) return;
      data.preferences.sourceLanguage = source.value.trim();
      data.preferences.targetLanguage = target.value.trim();
      await chromeStorage.save(data);
      if (status) status.textContent = "Préférences enregistrées.";
    });
})();
