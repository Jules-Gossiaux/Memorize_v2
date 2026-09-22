import "./style.css";
import {
  addFolder,
  deleteFolder,
  entriesInFolder,
  moveEntry,
  moveFolder,
  removeLegacyLanguageFolders,
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
  createAnkiPackage,
  downloadBlob,
  parseSerializedEntries,
  serializeEntries,
  type ExportFormat,
} from "../application/export";
import {
  myMemoryTranslator,
  type TranslationRequest,
} from "../application/translator";
import { detectLanguage } from "../application/language";
import type { AppData, Folder, VocabularyEntry } from "../domain/model";
import { chromeStorage } from "../infrastructure/storage";

interface SelectionResponse {
  text: string;
  url: string;
  context: string;
  pageLanguage?: string | null;
  pageText?: string;
}
type ViewName = "translate" | "vocabulary" | "history";
type FolderDialogMode = "create" | "rename";

let selectedFolderId: string | null = null;
let pendingTranslation: {
  request: TranslationRequest;
  translation: string;
} | null = null;
let pendingSelection: SelectionResponse | null = null;
let folderDialogMode: FolderDialogMode = "create";
let saveAfterFolderCreation = false;
let exportFolderIds = new Set<string>();

void run();

async function run(): Promise<void> {
  const data = await chromeStorage.load();
  selectedFolderId = ROOT_FOLDER_ID;
  if (removeLegacyLanguageFolders(data)) await chromeStorage.save(data);
  applyTheme(data.preferences.theme);
  bindNavigation(data);
  bindTranslation(data);
  bindSelectionUpdates();
  bindFolders(data);
  bindHistory(data);
  bindTheme(data);
  renderAll(data);

  pendingSelection = await readPendingSelection();
  const selection = pendingSelection ?? (await readSelection());
  renderSelection(selection);
  if (pendingSelection?.text) {
    window.setTimeout(
      () => getElement<HTMLButtonElement>("translate").click(),
      0,
    );
  }
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
  getElement<HTMLButtonElement>("translate").addEventListener(
    "click",
    async () => {
      let selection = pendingSelection ?? (await readSelection());
      pendingSelection = null;
      for (let attempt = 0; !selection.text && attempt < 2; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 60));
        selection = await readSelection();
      }
      if (!selection.text)
        return setStatus("Sélectionne un mot ou une phrase sur la page.", true);
      const detectedLanguage = detectLanguage(selection.text);
      let sourceLanguage = source.value.trim().toLowerCase();
      let targetLanguage = target.value.trim().toLowerCase();
      if (detectedLanguage) {
        if (detectedLanguage === targetLanguage) {
          [sourceLanguage, targetLanguage] = [targetLanguage, sourceLanguage];
        } else {
          sourceLanguage = detectedLanguage;
        }
        source.value = sourceLanguage;
        target.value = targetLanguage;
      }
      const request: TranslationRequest = {
        ...selection,
        sourceLanguage,
        targetLanguage,
      };
      data.preferences.sourceLanguage = request.sourceLanguage
        .trim()
        .toLowerCase();
      data.preferences.targetLanguage = request.targetLanguage
        .trim()
        .toLowerCase();
      setBusy("translate", true, "Traduction…", "Traduire");
      try {
        const translation = await myMemoryTranslator.translate(request);
        const count = recordTranslationAttempt(data, request, translation);
        await chromeStorage.save(data);
        pendingTranslation = { request, translation };
        getElement<HTMLParagraphElement>("translation").textContent =
          translation;
        getElement<HTMLElement>("translation-count-number").textContent =
          String(count);
        getElement<HTMLElement>("translation-count").classList.remove("hidden");
        getElement<HTMLButtonElement>("memorize").classList.remove("hidden");
        getElement<HTMLButtonElement>("memorize").disabled = false;
        getElement<HTMLDivElement>("translation-result").classList.remove(
          "empty-result",
        );
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

function bindSelectionUpdates(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "memorize:selection-changed") return;
    const selection = message.selection;
    if (!isSelectionResponse(selection) || !selection.text) return;
    pendingSelection = selection;
    renderSelection(selection);
    setStatus("Sélection prête.", false);
  });
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
        selectedFolderId =
          data.folders.find(
            (folder) =>
              folder.language === data.preferences.targetLanguage &&
              folder.id !== selectedFolderId,
          )?.id ?? null;
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
    async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.dataset.folderId)
        return;
      selectedFolderId = target.dataset.folderId;
      if (target.dataset.folderAction === "rename") {
        openFolderDialog(data, "rename");
        return;
      }
      if (target.dataset.folderAction === "delete") {
        if (
          !window.confirm(
            "Supprimer ce dossier, ses sous-dossiers et ses mots ?",
          )
        )
          return;
        try {
          deleteFolder(data, selectedFolderId);
          selectedFolderId = ROOT_FOLDER_ID;
          await chromeStorage.save(data);
          renderAll(data);
          setStatus("Dossier supprimé.", false);
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Suppression impossible.",
            true,
          );
        }
        return;
      }
      renderAll(data);
    },
  );
  getElement<HTMLDivElement>("folder-tree").addEventListener(
    "dragover",
    (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".folder-node",
      );
      event.preventDefault();
      target?.classList.add("drag-over");
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
      const destinationId = target?.dataset.folderId ?? ROOT_FOLDER_ID;
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
  bindExportDialog(data);
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
          const folderLanguage = pendingTranslation?.request.targetLanguage
            .trim()
            .toLowerCase();
          const created = addFolder(
            data,
            name,
            folderLanguage || data.preferences.targetLanguage,
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

function openFolderDialog(
  data: AppData,
  mode: FolderDialogMode,
  language = data.preferences.targetLanguage,
): void {
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
        folder.language === language.trim().toLowerCase() &&
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
    if (isSelectionResponse(response) && response.text) return response;
    throw new Error("Selection indisponible dans le content script.");
  } catch {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          const selectionObject = window.getSelection();
          const text = selectionObject?.toString().trim() ?? "";
          const parentText =
            selectionObject?.anchorNode?.parentElement?.innerText ??
            document.body?.innerText ??
            "";
          const index = parentText
            .toLocaleLowerCase()
            .indexOf(text.toLocaleLowerCase());
          return {
            text,
            url: window.location.href,
            context:
              !text || !parentText
                ? ""
                : index < 0
                  ? parentText.slice(0, 500)
                  : parentText.slice(
                      Math.max(0, index - 220),
                      index + text.length + 220,
                    ),
            pageLanguage:
              document.documentElement.lang
                .trim()
                .toLocaleLowerCase()
                .split(/[-_]/)[0] || null,
            pageText: (document.body?.innerText?.trim() ?? "").slice(0, 20_000),
          };
        },
      });
      const response = results.find((item) => item.result?.text)?.result;
      return isSelectionResponse(response)
        ? response
        : { text: "", url: tab.url ?? "", context: "" };
    } catch {
      return { text: "", url: tab.url ?? "", context: "" };
    }
  }
}

async function readPendingSelection(): Promise<SelectionResponse | null> {
  const stored = await chrome.storage.local.get("memorize:pending-selection");
  await chrome.storage.local.remove("memorize:pending-selection");
  const value = stored["memorize:pending-selection"];
  return isSelectionResponse(value) && value.text ? value : null;
}

function renderSelection(selection: SelectionResponse): void {
  applyDetectedLanguage(
    selection.pageLanguage ??
      detectLanguage(selection.pageText ?? selection.text),
  );
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

function applyDetectedLanguage(languageOrText: string | null): void {
  const detectedLanguage =
    languageOrText && languageOrText.length === 2
      ? languageOrText
      : detectLanguage(languageOrText ?? "");
  if (!detectedLanguage) return;
  const source = getElement<HTMLInputElement>("source");
  const target = getElement<HTMLInputElement>("target");
  let sourceLanguage = source.value.trim().toLowerCase();
  let targetLanguage = target.value.trim().toLowerCase();
  if (detectedLanguage === targetLanguage)
    [sourceLanguage, targetLanguage] = [targetLanguage, sourceLanguage];
  else sourceLanguage = detectedLanguage;
  source.value = sourceLanguage;
  target.value = targetLanguage;
}

function renderAll(data: AppData): void {
  const root =
    selectedFolderId === ROOT_FOLDER_ID
      ? undefined
      : (data.folders.find((folder) => folder.id === selectedFolderId) ??
        data.folders.find(
          (folder) =>
            folder.language === data.preferences.targetLanguage &&
            folder.parentId === ROOT_FOLDER_ID,
        ));
  if (selectedFolderId !== ROOT_FOLDER_ID)
    selectedFolderId = root?.id ?? ROOT_FOLDER_ID;
  renderFolderTree(data);
  renderVocabulary(data);
  renderHistory(data);
  const active = data.folders.find((folder) => folder.id === selectedFolderId);
  getElement<HTMLElement>("active-folder-name").textContent =
    active?.name ??
    (selectedFolderId === ROOT_FOLDER_ID ? "Racine" : "Vocabulaire");
  getElement<HTMLElement>("vocabulary-total").textContent =
    `${entriesInFolder(data, selectedFolderId ?? ROOT_FOLDER_ID).length} mots`;
}

function renderFolderTree(data: AppData): void {
  const container = getElement<HTMLDivElement>("folder-tree");
  const roots = data.folders.filter(
    (folder) =>
      folder.parentId === ROOT_FOLDER_ID &&
      folder.language === data.preferences.targetLanguage,
  );
  const root = document.createElement("div");
  root.className = "folder-node root-node";
  root.dataset.folderId = ROOT_FOLDER_ID;
  const rootButton = document.createElement("button");
  rootButton.type = "button";
  rootButton.className =
    selectedFolderId === ROOT_FOLDER_ID
      ? "folder-button selected"
      : "folder-button";
  rootButton.dataset.folderId = ROOT_FOLDER_ID;
  const rootDot = document.createElement("span");
  rootDot.className = "folder-dot root-dot";
  const rootText = document.createElement("span");
  rootText.textContent = "Racine";
  rootButton.append(rootDot, rootText);
  root.append(rootButton);
  const rootChildren = document.createElement("div");
  rootChildren.className = "folder-children root-children";
  rootChildren.append(...roots.map((folder) => renderFolderNode(data, folder)));
  root.append(rootChildren);
  container.replaceChildren(root);
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
  if (!isSystemLanguageFolder(folder)) {
    const actions = document.createElement("span");
    actions.className = "folder-actions";
    for (const action of ["rename", "delete"] as const) {
      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = `folder-action ${action === "delete" ? "danger-text" : ""}`;
      actionButton.dataset.folderId = folder.id;
      actionButton.dataset.folderAction = action;
      actionButton.setAttribute(
        "aria-label",
        action === "rename" ? "Renommer le dossier" : "Supprimer le dossier",
      );
      actionButton.title = action === "rename" ? "Renommer" : "Supprimer";
      actionButton.textContent = action === "rename" ? "✎" : "🗑";
      actions.append(actionButton);
    }
    wrapper.append(actions);
  }
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
  const entries = entriesInFolder(data, folder?.id ?? ROOT_FOLDER_ID)
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
        : item.original
          ? `${item.original} → ${item.translation ?? ""}`
          : "Traduction supprimée du vocabulaire";
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
  const folders = data.folders.filter((folder) => folder.language === language);
  if (!folders.length) {
    saveAfterFolderCreation = true;
    openFolderDialog(data, "create", language);
    setStatus("Crée un dossier pour mémoriser cette traduction.", false);
    return;
  }
  const select = getElement<HTMLSelectElement>("memorize-folder");
  select.replaceChildren(
    ...folders.map((folder) => {
      const option = document.createElement("option");
      option.value = folder.id;
      const label = isSystemLanguageFolder(folder)
        ? `Général · ${folder.name}`
        : folder.name;
      option.textContent = `${"  ".repeat(folderDepth(data, folder.id))}${label}`;
      return option;
    }),
  );
  getElement<HTMLDivElement>("memorize-empty").classList.add("hidden");
  getElement<HTMLLabelElement>("memorize-folder-label").hidden = false;
  getElement<HTMLDialogElement>("memorize-dialog").showModal();
}

function bindExportDialog(data: AppData): void {
  const dialog = getElement<HTMLDialogElement>("export-dialog");
  const close = () => dialog.close();
  getElement<HTMLButtonElement>("export-folder").addEventListener("click", () =>
    openExportDialog(data),
  );
  getElement<HTMLButtonElement>("export-dialog-close").addEventListener(
    "click",
    close,
  );
  getElement<HTMLButtonElement>("export-dialog-cancel").addEventListener(
    "click",
    close,
  );
  getElement<HTMLSelectElement>("export-format").addEventListener(
    "change",
    () => {
      const format = getElement<HTMLSelectElement>("export-format")
        .value as ExportFormat;
      getElement<HTMLElement>("delimiter-label").hidden = format === "apkg";
      updateExportPreview(data);
    },
  );
  getElement<HTMLSelectElement>("export-delimiter").addEventListener(
    "change",
    () => {
      getElement<HTMLElement>("custom-delimiter-label").classList.toggle(
        "hidden",
        getElement<HTMLSelectElement>("export-delimiter").value !== "custom",
      );
      updateExportPreview(data);
    },
  );
  getElement<HTMLInputElement>("custom-delimiter").addEventListener(
    "input",
    () => updateExportPreview(data),
  );
  getElement<HTMLDivElement>("export-folder-list").addEventListener(
    "change",
    (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.folderId)
        return;
      if (input.checked) exportFolderIds.add(input.dataset.folderId);
      else exportFolderIds.delete(input.dataset.folderId);
      updateExportPreview(data);
    },
  );
  getElement<HTMLButtonElement>("export-copy").addEventListener(
    "click",
    async () => {
      await navigator.clipboard.writeText(
        getElement<HTMLTextAreaElement>("export-preview").value,
      );
      setStatus("Aperçu copié.", false);
    },
  );
  getElement<HTMLFormElement>("export-form").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const format = getElement<HTMLSelectElement>("export-format")
        .value as ExportFormat;
      const entries = getExportEntries(data);
      if (!entries.length)
        return setStatus(
          "Sélectionne au moins un dossier contenant un mot.",
          true,
        );
      if (format === "apkg") {
        const packageData = await createAnkiPackage(
          parseSerializedEntries(
            getElement<HTMLTextAreaElement>("export-preview").value,
            getExportDelimiter(format),
            entries,
          ),
        );
        downloadBlob(packageData, "memorize-export.apkg", "application/zip");
      } else {
        const text = getElement<HTMLTextAreaElement>("export-preview").value;
        downloadBlob(
          text,
          `memorize-export.${format}`,
          "text/plain;charset=utf-8",
        );
      }
      close();
      setStatus("Export téléchargé.", false);
    },
  );
}

function openExportDialog(data: AppData): void {
  if (!data.folders.length) return setStatus("Crée d’abord un dossier.", true);
  exportFolderIds = new Set(selectedFolderId ? [selectedFolderId] : []);
  const list = getElement<HTMLDivElement>("export-folder-list");
  list.replaceChildren(
    ...data.folders.map((folder) => {
      const label = document.createElement("label");
      label.className = "export-folder-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.folderId = folder.id;
      input.checked = exportFolderIds.has(folder.id);
      const name = document.createElement("span");
      name.textContent = `${"  ".repeat(folderDepth(data, folder.id))}${folder.name}`;
      label.append(input, name);
      return label;
    }),
  );
  getElement<HTMLSelectElement>("export-format").value = "txt";
  getElement<HTMLSelectElement>("export-delimiter").value = ",";
  getElement<HTMLElement>("delimiter-label").hidden = false;
  getElement<HTMLElement>("custom-delimiter-label").classList.add("hidden");
  updateExportPreview(data);
  getElement<HTMLDialogElement>("export-dialog").showModal();
}

function updateExportPreview(data: AppData): void {
  const format = getElement<HTMLSelectElement>("export-format")
    .value as ExportFormat;
  const delimiter = getExportDelimiter(format);
  const entries = getExportEntries(data);
  const preview = getElement<HTMLTextAreaElement>("export-preview");
  const copyButton = getElement<HTMLButtonElement>("export-copy");
  const isAnkiPackage = format === "apkg";
  preview.readOnly = isAnkiPackage;
  copyButton.hidden = isAnkiPackage;
  preview.value = isAnkiPackage
    ? `Un paquet Anki sera généré au téléchargement.\n\n${entries.length} ${entries.length === 1 ? "carte" : "cartes"} avec les champs Word et Translation.`
    : serializeEntries(entries, delimiter, format === "csv");
  getElement<HTMLElement>("export-count").textContent =
    `${entries.length} ${entries.length === 1 ? "mot" : "mots"}`;
}

function getExportDelimiter(format: ExportFormat): string {
  const selected = getElement<HTMLSelectElement>("export-delimiter").value;
  if (format === "csv" && selected === ",") return ", ";
  return selected === "custom"
    ? getElement<HTMLInputElement>("custom-delimiter").value || "|"
    : selected;
}

function getExportEntries(data: AppData): VocabularyEntry[] {
  const ids = new Set<string>();
  for (const folderId of exportFolderIds)
    for (const entry of entriesInFolder(data, folderId)) ids.add(entry.id);
  return data.vocabulary.filter((entry) => ids.has(entry.id));
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
  getElement<HTMLButtonElement>("memorize-new-folder").addEventListener(
    "click",
    () => {
      dialog.close();
      saveAfterFolderCreation = true;
      const language =
        pendingTranslation?.request.targetLanguage.trim().toLowerCase() ??
        data.preferences.targetLanguage;
      openFolderDialog(data, "create", language);
    },
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
        activateView("translate");
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
