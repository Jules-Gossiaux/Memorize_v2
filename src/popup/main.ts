import "./style.css";
import { clearHistory, saveTranslation } from "../application/vocabulary";
import {
  myMemoryTranslator,
  type TranslationRequest,
} from "../application/translator";
import { entriesInFolder } from "../domain/folders";
import { chromeStorage } from "../infrastructure/storage";

interface SelectionResponse {
  text: string;
  url: string;
  context: string;
}

void run();

async function run(): Promise<void> {
  const source = getElement<HTMLInputElement>("source");
  const target = getElement<HTMLInputElement>("target");
  const selectionElement = getElement<HTMLParagraphElement>("selection");
  const translationElement = getElement<HTMLParagraphElement>("translation");
  const status = getElement<HTMLParagraphElement>("status");
  const translateButton = getElement<HTMLButtonElement>("translate");
  const data = await chromeStorage.load();

  source.value = data.preferences.sourceLanguage;
  target.value = data.preferences.targetLanguage;
  renderData(data);

  const tab = (
    await chrome.tabs.query({ active: true, currentWindow: true })
  )[0];
  let pageSelection: SelectionResponse = {
    text: "",
    url: tab?.url ?? "",
    context: "",
  };
  if (tab?.id !== undefined) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "memorize:get-selection",
      });
      if (isSelectionResponse(response)) pageSelection = response;
      selectionElement.textContent = pageSelection.text
        ? `Sélection : « ${pageSelection.text} »`
        : "Aucun texte sélectionné.";
    } catch {
      selectionElement.textContent =
        "Cette page ne permet pas de récupérer une sélection.";
    }
  }

  getElement<HTMLButtonElement>("save-preferences").addEventListener(
    "click",
    async () => {
      data.preferences.sourceLanguage = source.value.trim().toLowerCase();
      data.preferences.targetLanguage = target.value.trim().toLowerCase();
      await chromeStorage.save(data);
      setStatus(status, "Préférences enregistrées.", false);
    },
  );

  translateButton.addEventListener("click", async () => {
    if (!pageSelection.text) {
      setStatus(
        status,
        "Sélectionnez d’abord un mot ou une phrase sur la page.",
        true,
      );
      return;
    }
    const request: TranslationRequest = {
      ...pageSelection,
      sourceLanguage: source.value,
      targetLanguage: target.value,
    };
    setBusy(translateButton, true);
    try {
      const translation = await myMemoryTranslator.translate(request);
      translationElement.textContent = `Traduction : ${translation}`;
      const result = saveTranslation(data, request, translation);
      await chromeStorage.save(data);
      renderData(data);
      setStatus(
        status,
        result.created
          ? "Vocabulaire mémorisé."
          : "Occurrence ajoutée à l’historique.",
        false,
      );
    } catch (error) {
      setStatus(
        status,
        error instanceof Error ? error.message : "La traduction a échoué.",
        true,
      );
    } finally {
      setBusy(translateButton, false);
    }
  });

  getElement<HTMLButtonElement>("clear-history").addEventListener(
    "click",
    async () => {
      if (
        !data.history.length ||
        !window.confirm(
          "Vider tout l’historique ? Le vocabulaire sera conservé.",
        )
      )
        return;
      clearHistory(data);
      await chromeStorage.save(data);
      renderData(data);
      setStatus(status, "Historique vidé.", false);
    },
  );
}

function renderData(
  data: Awaited<ReturnType<typeof chromeStorage.load>>,
): void {
  const folder = data.folders.find(
    (item) =>
      item.language === data.preferences.targetLanguage &&
      item.parentId === "root",
  );
  const vocabulary = folder
    ? entriesInFolder(data, folder.id).slice(-10).reverse()
    : [];
  const vocabularyList = getElement<HTMLUListElement>("vocabulary");
  vocabularyList.replaceChildren(
    ...vocabulary.map((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.original} → ${entry.translation} (${entry.translatedCount})`;
      return item;
    }),
  );
  if (!vocabulary.length)
    vocabularyList.append(createEmptyItem("Aucun vocabulaire mémorisé."));

  const historyList = getElement<HTMLUListElement>("history");
  const history = data.history.slice(-10).reverse();
  historyList.replaceChildren(
    ...history.map((item) => {
      const entry = data.vocabulary.find(
        (candidate) => candidate.id === item.vocabularyId,
      );
      const element = document.createElement("li");
      element.textContent = entry
        ? `${entry.original} → ${entry.translation} · ${formatDate(item.translatedAt)}`
        : "Vocabulaire supprimé";
      return element;
    }),
  );
  if (!history.length) historyList.append(createEmptyItem("Historique vide."));
}

function createEmptyItem(text: string): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "muted";
  item.textContent = text;
  return item;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement))
    throw new Error(`Élément #${id} introuvable.`);
  return element as T;
}

function isSelectionResponse(value: unknown): value is SelectionResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.text === "string" &&
    typeof response.url === "string" &&
    typeof response.context === "string"
  );
}

function setStatus(
  element: HTMLElement,
  message: string,
  error: boolean,
): void {
  element.textContent = message;
  element.dataset.state = error ? "error" : "success";
}

function setBusy(button: HTMLButtonElement, busy: boolean): void {
  button.disabled = busy;
  button.textContent = busy ? "Traduction…" : "Traduire et mémoriser";
}
