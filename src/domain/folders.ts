import type { AppData, Folder, VocabularyEntry } from "./model";

export const ROOT_FOLDER_ID = "root";

export function ensureLanguageFolder(
  data: AppData,
  language: string,
  now = new Date().toISOString(),
): Folder {
  const existing = data.folders.find(
    (folder) =>
      folder.parentId === ROOT_FOLDER_ID && folder.language === language,
  );
  if (existing) return existing;
  const folder: Folder = {
    id: `language-${language}`,
    name: language,
    language,
    parentId: ROOT_FOLDER_ID,
    createdAt: now,
    updatedAt: now,
  };
  data.folders.push(folder);
  data.folderEntries[folder.id] ??= [];
  return folder;
}

export function addFolder(
  data: AppData,
  name: string,
  language: string,
  parentId: string,
  now = new Date().toISOString(),
): Folder {
  const parent = data.folders.find((folder) => folder.id === parentId);
  if (!parent || parent.language !== language)
    throw new Error(
      "Un dossier doit appartenir à un dossier de la même langue.",
    );
  const folder: Folder = {
    id: crypto.randomUUID(),
    name: name.trim(),
    language,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  if (!folder.name) throw new Error("Le nom du dossier est obligatoire.");
  data.folders.push(folder);
  data.folderEntries[folder.id] = [];
  return folder;
}

export function moveEntry(
  data: AppData,
  entryId: string,
  folderId: string,
): void {
  if (!data.vocabulary.some((entry) => entry.id === entryId))
    throw new Error("Vocabulaire introuvable.");
  if (!data.folders.some((folder) => folder.id === folderId))
    throw new Error("Dossier introuvable.");
  for (const ids of Object.values(data.folderEntries)) {
    const index = ids.indexOf(entryId);
    if (index >= 0) ids.splice(index, 1);
  }
  data.folderEntries[folderId] ??= [];
  data.folderEntries[folderId].push(entryId);
}

export function entriesInFolder(
  data: AppData,
  folderId: string,
): VocabularyEntry[] {
  const folderIds = new Set([
    folderId,
    ...data.folders
      .filter((folder) => folder.parentId === folderId)
      .map((folder) => folder.id),
  ]);
  const ids = new Set(
    Object.entries(data.folderEntries)
      .filter(([id]) => folderIds.has(id))
      .flatMap(([, entries]) => entries),
  );
  return data.vocabulary.filter((entry) => ids.has(entry.id));
}
