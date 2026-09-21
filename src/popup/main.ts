import "./style.css";
import {
  addFolder,
  deleteFolder,
  entriesInFolder,
  ensureLanguageFolder,
  moveEntry,
  moveFolder,
  renameFolder,
  ROOT_FOLDER_ID,
  isLanguageFolder as isSystemLanguageFolder,
} from "../domain/folders";
import {
  clearHistory,
  deleteVocabularyEntry,
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
type ViewName = "translate" | "vocabulary" | "history";
type FolderDialogMode = "create" | "rename";

let selectedFolderId: string | null = null;
let pendingTranslation: {
  request: TranslationRequest;
  translation: string;
} | null = null;
let folderDialogMode: FolderDialogMode = "create";
let saveAfterFolderCreation = false;

void run();

async function run(): Promise<void> {
  const data = await chromeStorage.load();
  const rootFolder = ensureLanguageFolder(
    data,
    data.preferences.targetLanguage,
  );
  selectedFolderId = rootFolder.id;
  await chromeStorage.save(data);
  applyTheme(data.preferences.theme);
  bindNavigation(data);
  bindTranslation(data);
  bindFolders(data);
  bindHistory(data);
  bindTheme(data);
  renderAll(data);

  const selection = await readSelection();
  renderSelection(selection);
}

function bindNavigation(data: AppData): void {
  document
    .querySelectorAll<HTMLButtonElement>(".nav-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.view as ViewName | undefined;
        if (!view) return;
        document
          .querySelectorAll(".nav-button")
          .forEach((item) => item.classList.toggle("active", item === button));
        document
          .querySelectorAll<HTMLElement>(".view-panel")
          .forEach((panel) =>
            panel.classList.toggle("hidden", panel.id !== `view-${view}`),
          );
        renderAll(data);
      });
    });
}

function bindTranslation(data: AppData): void {
  const source = getElement<HTMLInputElement>("source");
  const target = getElement<HTMLInputElement>("target");
  source.value = data.preferences.sourceLanguage;
  target.value = data.preferences.targetLanguage;
  getElement<HTMLButtonElement>("swap-languages").addEventListener(
    "click",
    () => {
      const value = source.value;
      source.value = target.value;
      target.value = value;
    },
  );
  getElement<HTMLButtonElement>("save-preferences").addEventListener(
    "click",
    async () => {
      const sourceLanguage = source.value.trim().toLowerCase();
      const targetLanguage = target.value.trim().toLowerCase();
      if (!sourceLanguage || !targetLanguage)
        return setStatus("Les deux langues sont obligatoires.", true);
      data.preferences.sourceLanguage = sourceLanguage;
      data.preferences.targetLanguage = targetLanguage;
      selectedFolderId = ensureLanguageFolder(data, targetLanguage).id;
      await chromeStorage.save(data);
      renderAll(data);
      setStatus("Langues enregistrées.", false);
    },
  );
  getElement<HTMLButtonElement>("translate").addEventListener(
    "click",
    async () => {
      const selection = await readSelection();
      if (!selection.text)
        return setStatus("Sélectionne un mot ou une phrase sur la page.", true);
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
          translation;
        getElement<HTMLElement>("translation-count-number").textContent =
          String(count);
        getElement<HTMLButtonElement>("memorize").disabled = false;
        getElement<HTMLDivElement>("translation-result").classList.remove(
          "empty-result",
        );
        const badge = document.querySelector<HTMLElement>(
          "#translation-result .result-badge",
        );
        if (badge) badge.textContent = "Prêt à mémoriser";
        setStatus("Belle découverte. À toi de décider si tu la gardes.", false);
      } catch (error) {
        setStatus(
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
      openMemorizeDialog(data);
    },
  );
}

function bindFolders(data: AppData): void {
  getElement<HTMLButtonElement>("add-folder").addEventListener("click", () =>
    openFolderDialog(data, "create"),
  );
  getElement<HTMLButtonElement>("rename-folder").addEventListener(
    "click",
    () => {
      if (isLanguageFolder(data, selectedFolderId))
        return setStatus(
          "Les dossiers de langue ne peuvent pas être renommés.",
          true,
        );
      openFolderDialog(data, "rename");
    },
  );
  getElement<HTMLButtonElement>("delete-folder").addEventListener(
    "click",
    async () => {
      if (!selectedFolderId || isLanguageFolder(data, selectedFolderId))
        return setStatus(
          "Les dossiers de langue ne peuvent pas être supprimés.",
          true,
        );
      if (
        !window.confirm(
          "Supprimer ce dossier et ses sous-dossiers ? Tous leurs mots seront supprimés.",
        )
      )
        return;
      try {
        deleteFolder(data, selectedFolderId);
        selectedFolderId = ensureLanguageFolder(
          data,
          data.preferences.targetLanguage,
        ).id;
        await chromeStorage.save(data);
        renderAll(data);
        setStatus("Dossier et mots supprimés.", false);
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Suppression impossible.",
          true,
        );
      }
    },
  );
  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.dataset.folderId)
        return;
      selectedFolderId = target.dataset.folderId;
      renderAll(data);
    },
  );
  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "dragover",
    (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".folder-node",
      );
      if (!target) return;
      event.preventDefault();
      target.classList.add("drag-over");
    },
  );
  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "dragleave",
    (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".folder-node",
      );
      target?.classList.remove("drag-over");
    },
  );
  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "drop",
    async (event) => {
      event.preventDefault();
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".folder-node",
      );
      const entryId = event.dataTransfer?.getData("text/memorize-entry");
      const draggedFolderId = event.dataTransfer?.getData(
        "text/memorize-folder",
      );
      target?.classList.remove("drag-over");
      const destinationId = target?.dataset.folderId;
      if (!destinationId) return;
      if (draggedFolderId) {
        try {
          moveFolder(data, draggedFolderId, destinationId);
          await chromeStorage.save(data);
          renderAll(data);
          setStatus("Dossier déplacé.", false);
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Déplacement impossible.",
            true,
          );
        }
        return;
      }
      if (!entryId) return;
      const sourceId = findAnyFolderForEntry(data, entryId);
      if (!sourceId || sourceId === destinationId) return;
      try {
        moveEntry(data, entryId, sourceId, destinationId);
        await chromeStorage.save(data);
        renderAll(data);
        setStatus("Mot déplacé.", false);
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Déplacement impossible.",
          true,
        );
      }
    },
  );
  getElement<HTMLInputElement>("vocabulary-search").addEventListener(
    "input",
    () => renderVocabulary(data),
  );
  getElement<HTMLUListElement>("vocabulary").addEventListener(
    "click",
    async (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        ".delete-entry",
      );
      const entryId = button?.dataset.entryId;
      if (
        !entryId ||
        !window.confirm("Supprimer définitivement ce mot et son historique ?")
      )
        return;
      try {
        deleteVocabularyEntry(data, entryId);
        await chromeStorage.save(data);
        renderAll(data);
        setStatus("Mot supprimé.", false);
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Suppression impossible.",
          true,
        );
      }
    },
  );
  bindFolderDialog(data);
  bindMemorizeDialog(data);
}

function bindHistory(data: AppData): void {
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
      renderHistory(data);
      setStatus("Historique vidé.", false);
    },
  );
}

function bindTheme(data: AppData): void {
  getElement<HTMLButtonElement>("theme-toggle").addEventListener(
    "click",
    async () => {
      data.preferences.theme =
        data.preferences.theme === "dark" ? "light" : "dark";
      applyTheme(data.preferences.theme);
      await chromeStorage.save(data);
    },
  );
}

function bindFolderDialog(data: AppData): void {
  const dialog = getElement<HTMLDialogElement>("folder-dialog");
  getElement<HTMLButtonElement>("folder-dialog-close").addEventListener(
    "click",
    () => {
      saveAfterFolderCreation = false;
      dialog.close();
    },
  );
  getElement<HTMLButtonElement>("folder-dialog-cancel").addEventListener(
    "click",
    () => {
      saveAfterFolderCreation = false;
      dialog.close();
    },
  );
  getElement<HTMLFormElement>("folder-form").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const name = getElement<HTMLInputElement>("folder-dialog-name").value;
      try {
        if (folderDialogMode === "create") {
          const parentId = getElement<HTMLSelectElement>(
            "folder-dialog-parent",
          ).value;
          const created = addFolder(
            data,
            name,
            data.preferences.targetLanguage,
            parentId,
          );
          selectedFolderId = created.id;
          if (saveAfterFolderCreation && pendingTranslation) {
            const result = saveTranslation(
              data,
              pendingTranslation.request,
              pendingTranslation.translation,
              created.id,
            );
            pendingTranslation = null;
            saveAfterFolderCreation = false;
            getElement<HTMLButtonElement>("memorize").disabled = true;
            setStatus(
              result.created
                ? "Dossier créé et mot mémorisé."
                : "Dossier créé et entrée mise à jour.",
              false,
            );
          }
        } else if (selectedFolderId) {
          renameFolder(data, selectedFolderId, name);
        }
        await chromeStorage.save(data);
        dialog.close();
        renderAll(data);
        setStatus(
          folderDialogMode === "create" ? "Dossier créé." : "Dossier renommé.",
          false,
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Opération impossible.",
          true,
        );
      }
    },
  );
}

function openFolderDialog(data: AppData, mode: FolderDialogMode): void {
  folderDialogMode = mode;
  const dialog = getElement<HTMLDialogElement>("folder-dialog");
  getElement<HTMLHeadingElement>("folder-dialog-title").textContent =
    mode === "create" ? "Nouveau dossier" : "Renommer le dossier";
  getElement<HTMLParagraphElement>("folder-dialog-copy").textContent =
    mode === "create"
      ? "Classe tes mots dans un espace qui te ressemble."
      : "Donne un nom plus juste à cet espace.";
  const name = getElement<HTMLInputElement>("folder-dialog-name");
  const selected = data.folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  name.value =
    mode === "rename"
      ? (selected?.name ?? "")
      : saveAfterFolderCreation
        ? "Mes mots"
        : "";
  const parentLabel = getElement<HTMLLabelElement>("folder-parent-label");
  parentLabel.hidden = mode === "rename";
  if (mode === "create") {
    const parent = getElement<HTMLSelectElement>("folder-dialog-parent");
    const folders = data.folders.filter(
      (folder) =>
        folder.language === data.preferences.targetLanguage &&
        !isSystemLanguageFolder(folder),
    );
    const rootOption = document.createElement("option");
    rootOption.value = ROOT_FOLDER_ID;
    rootOption.textContent = "Racine";
    parent.replaceChildren(
      rootOption,
      ...folders.map((folder) => {
        const option = document.createElement("option");
        option.value = folder.id;
        option.textContent = `${"  ".repeat(folderDepth(data, folder.id))}${folder.name}`;
        return option;
      }),
    );
    if (
      !saveAfterFolderCreation &&
      selectedFolderId &&
      folders.some((folder) => folder.id === selectedFolderId)
    )
      parent.value = selectedFolderId;
    else parent.value = ROOT_FOLDER_ID;
  }
  dialog.showModal();
  name.focus();
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

function renderSelection(selection: SelectionResponse): void {
  const element = getElement<HTMLDivElement>("selection");
  element.replaceChildren();
  const icon = document.createElement("span");
  icon.className = "selection-icon";
  icon.textContent = "⌁";
  const text = document.createElement("span");
  text.textContent = selection.text
    ? `Sélection : « ${selection.text} »`
    : "Aucune sélection détectée.";
  element.append(icon, text);
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
  renderVocabulary(data);
  renderHistory(data);
  const active = data.folders.find((folder) => folder.id === selectedFolderId);
  getElement<HTMLElement>("active-folder-name").textContent =
    active?.name ?? "Vocabulaire";
  getElement<HTMLElement>("vocabulary-total").textContent =
    `${active ? entriesInFolder(data, active.id).length : 0} mots`;
}

function renderFolderTree(data: AppData): void {
  const container = getElement<HTMLDivElement>("folder-tree");
  const roots = data.folders.filter(
    (folder) =>
      folder.parentId === ROOT_FOLDER_ID &&
      folder.language === data.preferences.targetLanguage,
  );
  container.replaceChildren(
    ...roots.map((folder) => renderFolderNode(data, folder)),
  );
}

function renderFolderNode(data: AppData, folder: Folder): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "folder-node";
  wrapper.dataset.folderId = folder.id;
  const button = document.createElement("button");
  button.type = "button";
  button.draggable = !isSystemLanguageFolder(folder);
  button.className =
    folder.id === selectedFolderId ? "folder-button selected" : "folder-button";
  button.dataset.folderId = folder.id;
  button.addEventListener("dragstart", (event) => {
    if (isSystemLanguageFolder(folder)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData("text/memorize-folder", folder.id);
  });
  const dot = document.createElement("span");
  dot.className = "folder-dot";
  const text = document.createElement("span");
  text.textContent = folder.name;
  button.append(dot, text);
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

function renderVocabulary(data: AppData): void {
  const list = getElement<HTMLUListElement>("vocabulary");
  const query = getElement<HTMLInputElement>("vocabulary-search")
    .value.trim()
    .toLocaleLowerCase();
  const folder = data.folders.find((item) => item.id === selectedFolderId);
  const entries = (folder ? entriesInFolder(data, folder.id) : [])
    .filter(
      (entry) =>
        !query ||
        `${entry.original} ${entry.translation}`
          .toLocaleLowerCase()
          .includes(query),
    )
    .slice()
    .reverse();
  list.replaceChildren(...entries.map((entry) => renderVocabularyItem(entry)));
  if (!entries.length)
    list.append(
      createEmptyItem(
        query
          ? "Aucun résultat pour cette recherche."
          : "Ce dossier est encore vide.",
      ),
    );
  getElement<HTMLElement>("vocabulary-total").textContent =
    `${entries.length} ${entries.length === 1 ? "mot" : "mots"}`;
}

function renderVocabularyItem(entry: VocabularyEntry): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "vocabulary-card";
  item.draggable = true;
  item.dataset.entryId = entry.id;
  item.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/memorize-entry", entry.id);
    event.dataTransfer?.setData("text/plain", entry.original);
    item.classList.add("dragging");
  });
  item.addEventListener("dragend", () => item.classList.remove("dragging"));
  const main = document.createElement("div");
  main.className = "entry-main";
  const copy = document.createElement("div");
  const original = document.createElement("div");
  original.className = "entry-original";
  original.textContent = entry.original;
  const translation = document.createElement("div");
  translation.className = "entry-translation";
  translation.textContent = entry.translation;
  copy.append(original, translation);
  const arrow = document.createElement("span");
  arrow.className = "entry-arrow";
  arrow.textContent = "↗";
  main.append(copy, arrow);
  const meta = document.createElement("div");
  meta.className = "entry-meta";
  const count = document.createElement("strong");
  count.textContent = `${entry.translatedCount}× traduit`;
  const date = document.createElement("span");
  date.textContent = formatDate(entry.updatedAt);
  meta.append(count, date);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-entry text-button danger-text";
  remove.dataset.entryId = entry.id;
  remove.textContent = "Supprimer";
  item.append(main, meta, remove);
  return item;
}

function renderHistory(data: AppData): void {
  const list = getElement<HTMLUListElement>("history");
  const history = data.history.slice(-30).reverse();
  list.replaceChildren(
    ...history.map((item) => {
      const entry = data.vocabulary.find(
        (candidate) => candidate.id === item.vocabularyId,
      );
      const element = document.createElement("li");
      element.className = "history-item";
      const text = document.createElement("span");
      text.textContent = entry
        ? `${entry.original} → ${entry.translation}`
        : "Vocabulaire supprimé";
      const time = document.createElement("time");
      time.textContent = formatDate(item.translatedAt);
      element.append(text, time);
      return element;
    }),
  );
  if (!history.length)
    list.append(createEmptyItem("Ton historique est encore vide."));
}

function findAnyFolderForEntry(
  data: AppData,
  entryId: string,
): string | undefined {
  return Object.entries(data.folderEntries).find(([, entries]) =>
    entries.includes(entryId),
  )?.[0];
}

function openMemorizeDialog(data: AppData): void {
  if (!pendingTranslation) return;
  const language = pendingTranslation.request.targetLanguage
    .trim()
    .toLowerCase();
  const folders = data.folders.filter(
    (folder) => folder.language === language && !isSystemLanguageFolder(folder),
  );
  if (!folders.length) {
    saveAfterFolderCreation = true;
    openFolderDialog(data, "create");
    setStatus("Crée un dossier pour mémoriser cette traduction.", false);
    return;
  }
  const select = getElement<HTMLSelectElement>("memorize-folder");
  select.replaceChildren(
    ...folders.map((folder) => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = `${"  ".repeat(folderDepth(data, folder.id))}${folder.name}`;
      return option;
    }),
  );
  getElement<HTMLDivElement>("memorize-empty").classList.add("hidden");
  getElement<HTMLLabelElement>("memorize-folder-label").hidden = false;
  getElement<HTMLDialogElement>("memorize-dialog").showModal();
}

function bindMemorizeDialog(data: AppData): void {
  const dialog = getElement<HTMLDialogElement>("memorize-dialog");
  const close = () => dialog.close();
  getElement<HTMLButtonElement>("memorize-dialog-close").addEventListener(
    "click",
    close,
  );
  getElement<HTMLButtonElement>("memorize-dialog-cancel").addEventListener(
    "click",
    close,
  );
  getElement<HTMLFormElement>("memorize-form").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (!pendingTranslation) return close();
      try {
        const folderId = getElement<HTMLSelectElement>("memorize-folder").value;
        const result = saveTranslation(
          data,
          pendingTranslation.request,
          pendingTranslation.translation,
          folderId,
        );
        await chromeStorage.save(data);
        pendingTranslation = null;
        getElement<HTMLButtonElement>("memorize").disabled = true;
        close();
        activateView("vocabulary");
        renderAll(data);
        setStatus(
          result.created ? "Ajouté à ta bibliothèque." : "Entrée mise à jour.",
          false,
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "La mémorisation a échoué.",
          true,
        );
      }
    },
  );
}
function isLanguageFolder(data: AppData, folderId: string | null): boolean {
  const folder = data.folders.find((candidate) => candidate.id === folderId);
  return Boolean(folder && isSystemLanguageFolder(folder));
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
function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  getElement<HTMLButtonElement>("theme-toggle").textContent =
    theme === "dark" ? "☾" : "☼";
}
function activateView(view: ViewName): void {
  document
    .querySelectorAll<HTMLButtonElement>(".nav-button")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === view),
    );
  document
    .querySelectorAll<HTMLElement>(".view-panel")
    .forEach((panel) =>
      panel.classList.toggle("hidden", panel.id !== `view-${view}`),
    );
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
function setStatus(message: string, error: boolean): void {
  const element = getElement<HTMLElement>("status");
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
