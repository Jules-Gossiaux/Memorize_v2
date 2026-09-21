import "./style.css";
import {
  addFolder,
  deleteFolder,
  entriesInFolder,
  ensureLanguageFolder,
  getDescendantFolderIds,
  moveEntry,
  renameFolder,
  ROOT_FOLDER_ID,
} from "../domain/folders";
import {
  clearHistory,
  recordTranslationAttempt,
  saveTranslation,
} from "../application/vocabulary";
import {
  myMemoryTranslator,
  type TranslationRequest,
} from "../application/translator";
import type { AppData, Folder, VocabularyEntry } from "../domain/model";
import { chromeStorage } from "../infrastructure/storage";

interface SelectionResponse {
  text: string;
  url: string;
  context: string;
}

let selectedFolderId: string | null = null;
let pendingTranslation: {
  request: TranslationRequest;
  translation: string;
} | null = null;

void run();

async function run(): Promise<void> {
  const source = getElement<HTMLInputElement>("source");
  const target = getElement<HTMLInputElement>("target");
  const status = getElement<HTMLParagraphElement>("status");
  const data = await chromeStorage.load();
  const languageFolder = ensureLanguageFolder(
    data,
    data.preferences.targetLanguage,
  );
  selectedFolderId = languageFolder.id;
  await chromeStorage.save(data);
  renderAll(data);

  const selection = await readSelection();
  getElement<HTMLParagraphElement>("selection").textContent = selection.text
    ? `Sélection : « ${selection.text} »`
    : "Aucun texte sélectionné.";

  getElement<HTMLButtonElement>("save-preferences").addEventListener(
    "click",
    async () => {
      const sourceLanguage = source.value.trim().toLowerCase();
      const targetLanguage = target.value.trim().toLowerCase();
      if (!sourceLanguage || !targetLanguage) {
        setStatus(status, "Les deux langues sont obligatoires.", true);
        return;
      }
      data.preferences.sourceLanguage = sourceLanguage;
      data.preferences.targetLanguage = targetLanguage;
      selectedFolderId = ensureLanguageFolder(data, targetLanguage).id;
      await chromeStorage.save(data);
      renderAll(data);
      setStatus(status, "Préférences enregistrées.", false);
    },
  );

  getElement<HTMLButtonElement>("translate").addEventListener(
    "click",
    async () => {
      if (!selection.text) {
        setStatus(
          status,
          "Sélectionnez d’abord un mot ou une phrase sur la page.",
          true,
        );
        return;
      }
      const request: TranslationRequest = {
        ...selection,
        sourceLanguage: source.value,
        targetLanguage: target.value,
      };
      setBusy("translate", true, "Traduction…", "Traduire");
      try {
        const translation = await myMemoryTranslator.translate(request);
        const count = recordTranslationAttempt(data, request);
        await chromeStorage.save(data);
        pendingTranslation = { request, translation };
        getElement<HTMLParagraphElement>("translation").textContent =
          `Traduction : ${translation}`;
        getElement<HTMLParagraphElement>("translation-count").textContent =
          `Déjà traduit ${count} fois. Choisissez si vous voulez le mémoriser.`;
        getElement<HTMLButtonElement>("memorize").disabled = false;
        setStatus(status, "Traduction terminée.", false);
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "La traduction a échoué.",
          true,
        );
      } finally {
        setBusy("translate", false, "Traduction…", "Traduire");
      }
    },
  );

  getElement<HTMLButtonElement>("memorize").addEventListener(
    "click",
    async () => {
      if (!pendingTranslation) return;
      try {
        const result = saveTranslation(
          data,
          pendingTranslation.request,
          pendingTranslation.translation,
        );
        await chromeStorage.save(data);
        pendingTranslation = null;
        getElement<HTMLButtonElement>("memorize").disabled = true;
        renderAll(data);
        setStatus(
          status,
          result.created ? "Vocabulaire mémorisé." : "Vocabulaire mis à jour.",
          false,
        );
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "La mémorisation a échoué.",
          true,
        );
      }
    },
  );

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
      renderAll(data);
      setStatus(status, "Historique vidé.", false);
    },
  );

  getElement<HTMLButtonElement>("add-folder").addEventListener(
    "click",
    async () => {
      const name = getElement<HTMLInputElement>("new-folder-name");
      const parent = getElement<HTMLSelectElement>("new-folder-parent");
      try {
        const folder = addFolder(data, name.value, target.value, parent.value);
        selectedFolderId = folder.id;
        name.value = "";
        await chromeStorage.save(data);
        renderAll(data);
        setStatus(status, "Dossier créé.", false);
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "Création impossible.",
          true,
        );
      }
    },
  );

  getElement<HTMLButtonElement>("rename-folder").addEventListener(
    "click",
    async () => {
      if (!selectedFolderId) return;
      try {
        renameFolder(
          data,
          selectedFolderId,
          getElement<HTMLInputElement>("folder-rename").value,
        );
        await chromeStorage.save(data);
        renderAll(data);
        setStatus(status, "Dossier renommé.", false);
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "Renommage impossible.",
          true,
        );
      }
    },
  );

  getElement<HTMLButtonElement>("delete-folder").addEventListener(
    "click",
    async () => {
      if (
        !selectedFolderId ||
        !window.confirm(
          "Supprimer ce dossier et ses sous-dossiers ? Le vocabulaire sera conservé.",
        )
      )
        return;
      try {
        deleteFolder(data, selectedFolderId);
        selectedFolderId = ensureLanguageFolder(data, target.value).id;
        await chromeStorage.save(data);
        renderAll(data);
        setStatus(
          status,
          "Dossier supprimé. Le vocabulaire a été conservé.",
          false,
        );
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "Suppression impossible.",
          true,
        );
      }
    },
  );

  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "click",
    (event) => {
      const targetElement = event.target;
      if (!(targetElement instanceof HTMLButtonElement)) return;
      const folderId = targetElement.dataset.folderId;
      if (!folderId) return;
      selectedFolderId = folderId;
      renderAll(data);
    },
  );

  getElement<HTMLUListElement>("vocabulary").addEventListener(
    "click",
    async (event) => {
      const targetElement = event.target;
      if (
        !(targetElement instanceof HTMLButtonElement) ||
        !targetElement.dataset.entryId
      )
        return;
      const destination = targetElement.parentElement?.querySelector("select");
      if (!(destination instanceof HTMLSelectElement) || !selectedFolderId)
        return;
      const sourceFolderId = findEntryFolder(
        data,
        targetElement.dataset.entryId,
        selectedFolderId,
      );
      if (!sourceFolderId) return;
      try {
        moveEntry(
          data,
          targetElement.dataset.entryId,
          sourceFolderId,
          destination.value,
        );
        await chromeStorage.save(data);
        renderAll(data);
        setStatus(status, "Élément déplacé.", false);
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "Déplacement impossible.",
          true,
        );
      }
    },
  );
}

async function readSelection(): Promise<SelectionResponse> {
  const tab = (
    await chrome.tabs.query({ active: true, currentWindow: true })
  )[0];
  if (tab?.id === undefined)
    return { text: "", url: tab?.url ?? "", context: "" };
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "memorize:get-selection",
    });
    return isSelectionResponse(response)
      ? response
      : { text: "", url: tab.url ?? "", context: "" };
  } catch {
    return { text: "", url: tab.url ?? "", context: "" };
  }
}

function renderAll(data: AppData): void {
  const root =
    data.folders.find((folder) => folder.id === selectedFolderId) ??
    data.folders.find(
      (folder) =>
        folder.language === data.preferences.targetLanguage &&
        folder.parentId === ROOT_FOLDER_ID,
    );
  selectedFolderId = root?.id ?? null;
  renderFolderTree(data);
  renderFolderControls(data);
  renderVocabulary(data, root);
  renderHistory(data);
}

function renderFolderTree(data: AppData): void {
  const container = getElement<HTMLDivElement>("folder-tree");
  const roots = data.folders.filter(
    (folder) => folder.parentId === ROOT_FOLDER_ID,
  );
  container.replaceChildren(
    ...roots.map((folder) => renderFolderNode(data, folder)),
  );
}

function renderFolderNode(data: AppData, folder: Folder): HTMLDivElement {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.folderId = folder.id;
  button.className =
    folder.id === selectedFolderId ? "folder selected" : "folder";
  button.textContent =
    folder.parentId === ROOT_FOLDER_ID
      ? `▾ ${folder.name}`
      : `└ ${folder.name}`;
  wrapper.append(button);
  const children = data.folders.filter(
    (candidate) => candidate.parentId === folder.id,
  );
  if (children.length) {
    const childContainer = document.createElement("div");
    childContainer.className = "folder-children";
    childContainer.append(
      ...children.map((child) => renderFolderNode(data, child)),
    );
    wrapper.append(childContainer);
  }
  return wrapper;
}

function renderFolderControls(data: AppData): void {
  const parentSelect = getElement<HTMLSelectElement>("new-folder-parent");
  const languageFolders = data.folders.filter(
    (folder) => folder.language === data.preferences.targetLanguage,
  );
  parentSelect.replaceChildren(
    ...languageFolders.map((folder) => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = `${"  ".repeat(folderDepth(data, folder.id))}${folder.name}`;
      return option;
    }),
  );
  if (
    selectedFolderId &&
    languageFolders.some((folder) => folder.id === selectedFolderId)
  )
    parentSelect.value = selectedFolderId;
  const selected = data.folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const rename = getElement<HTMLInputElement>("folder-rename");
  const isLanguageRoot = selected?.parentId === ROOT_FOLDER_ID;
  rename.value = selected?.name ?? "";
  rename.disabled = !selected || isLanguageRoot;
  getElement<HTMLButtonElement>("rename-folder").disabled = rename.disabled;
  getElement<HTMLButtonElement>("delete-folder").disabled =
    !selected || isLanguageRoot;
}

function renderVocabulary(data: AppData, folder: Folder | undefined): void {
  const list = getElement<HTMLUListElement>("vocabulary");
  const entries = folder
    ? entriesInFolder(data, folder.id).slice().reverse()
    : [];
  list.replaceChildren(
    ...entries.map((entry) => renderVocabularyItem(data, entry, folder?.id)),
  );
  if (!entries.length)
    list.append(createEmptyItem("Aucun vocabulaire dans ce dossier."));
}

function renderVocabularyItem(
  data: AppData,
  entry: VocabularyEntry,
  selectedId: string | undefined,
): HTMLLIElement {
  const item = document.createElement("li");
  const text = document.createElement("span");
  text.textContent = `${entry.original} → ${entry.translation} (${entry.translatedCount})`;
  item.append(text);
  const sourceFolder = selectedId
    ? findEntryFolder(data, entry.id, selectedId)
    : undefined;
  const destinations = data.folders.filter(
    (folder) =>
      folder.language === entry.targetLanguage && folder.id !== sourceFolder,
  );
  if (sourceFolder && destinations.length) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Destination de ${entry.original}`);
    select.append(
      ...destinations.map((folder) => {
        const option = document.createElement("option");
        option.value = folder.id;
        option.textContent = folder.name;
        return option;
      }),
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary move-button";
    button.dataset.entryId = entry.id;
    button.textContent = "Déplacer";
    item.append(select, button);
  }
  return item;
}

function renderHistory(data: AppData): void {
  const list = getElement<HTMLUListElement>("history");
  const history = data.history.slice(-10).reverse();
  list.replaceChildren(
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
  if (!history.length) list.append(createEmptyItem("Historique vide."));
}

function findEntryFolder(
  data: AppData,
  entryId: string,
  selectedId: string,
): string | undefined {
  return getDescendantFolderIds(data, selectedId).find((folderId) =>
    data.folderEntries[folderId]?.includes(entryId),
  );
}

function folderDepth(data: AppData, folderId: string): number {
  let depth = 0;
  let current = data.folders.find((folder) => folder.id === folderId);
  while (current?.parentId && current.parentId !== ROOT_FOLDER_ID) {
    depth += 1;
    current = data.folders.find((folder) => folder.id === current?.parentId);
  }
  return depth;
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
function setBusy(
  id: string,
  busy: boolean,
  busyText: string,
  readyText: string,
): void {
  const button = getElement<HTMLButtonElement>(id);
  button.disabled = busy;
  button.textContent = busy ? busyText : readyText;
}
