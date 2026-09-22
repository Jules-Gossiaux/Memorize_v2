import type { AppData, Folder, VocabularyEntry } from "./model";

export const ROOT_FOLDER_ID = "root";

export function isLanguageFolder(folder: Folder): boolean {
  return folder.id.startsWith("language-");
}

export function removeLegacyLanguageFolders(data: AppData): boolean {
  const legacyFolders = data.folders.filter(isLanguageFolder);
  if (!legacyFolders.length) return false;
  let changed = false;
  for (const legacy of legacyFolders) {
    const entries = data.folderEntries[legacy.id] ?? [];
    const children = data.folders.filter(
      (folder) => folder.parentId === legacy.id,
    );
    for (const child of children) child.parentId = ROOT_FOLDER_ID;
    if (entries.length) {
      let recoveryName = "Mes mots";
      let suffix = 2;
      while (
        data.folders.some(
          (folder) =>
            folder.parentId === ROOT_FOLDER_ID &&
            folder.language === legacy.language &&
            folder.name.toLocaleLowerCase() ===
              recoveryName.toLocaleLowerCase(),
        )
      ) {
        recoveryName = `Mes mots ${suffix++}`;
      }
      const recovery = addFolder(
        data,
        recoveryName,
        legacy.language,
        ROOT_FOLDER_ID,
      );
      data.folderEntries[recovery.id] = entries;
    }
    delete data.folderEntries[legacy.id];
    data.folders = data.folders.filter((folder) => folder.id !== legacy.id);
    changed = true;
  }
  return changed;
}

export function ensureLanguageFolder(
  data: AppData,
  language: string,
  now = new Date().toISOString(),
): Folder {
  const normalizedLanguage = language.trim().toLowerCase();
  const existing = data.folders.find(
    (folder) =>
      folder.parentId === ROOT_FOLDER_ID &&
      folder.language === normalizedLanguage,
  );
  if (existing) return existing;
  const folder: Folder = {
    id: `language-${normalizedLanguage}`,
    name: normalizedLanguage,
    language: normalizedLanguage,
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
  const normalizedName = name.trim();
  const normalizedLanguage = language.trim().toLowerCase();
  const parent =
    parentId === ROOT_FOLDER_ID ? undefined : getFolder(data, parentId);
  if (parent && parent.language !== normalizedLanguage)
    throw new Error(
      "Un dossier doit appartenir à un dossier de la même langue.",
    );
  if (!normalizedName) throw new Error("Le nom du dossier est obligatoire.");
  if (
    data.folders.some(
      (folder) =>
        folder.parentId === parentId &&
        !isLanguageFolder(folder) &&
        folder.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    )
  ) {
    throw new Error("Un dossier portant ce nom existe déjà à cet endroit.");
  }
  const folder: Folder = {
    id: crypto.randomUUID(),
    name: normalizedName,
    language: normalizedLanguage,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  data.folders.push(folder);
  data.folderEntries[folder.id] = [];
  return folder;
}

export function renameFolder(
  data: AppData,
  folderId: string,
  name: string,
  now = new Date().toISOString(),
): Folder {
  const folder = getFolder(data, folderId);
  if (isLanguageFolder(folder))
    throw new Error("Les dossiers de langue ne peuvent pas être renommés.");
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Le nom du dossier est obligatoire.");
  if (
    data.folders.some(
      (candidate) =>
        candidate.id !== folderId &&
        candidate.parentId === folder.parentId &&
        candidate.name.toLocaleLowerCase() ===
          normalizedName.toLocaleLowerCase(),
    )
  ) {
    throw new Error("Un dossier portant ce nom existe déjà à cet endroit.");
  }
  folder.name = normalizedName;
  folder.updatedAt = now;
  return folder;
}

export function deleteFolder(data: AppData, folderId: string): void {
  const folder = getFolder(data, folderId);
  if (isLanguageFolder(folder))
    throw new Error("Un dossier de langue ne peut pas être supprimé.");
  const ids = new Set(getDescendantFolderIds(data, folderId));
  const entryIds = new Set(
    [...ids].flatMap((id) => data.folderEntries[id] ?? []),
  );
  for (const id of ids) delete data.folderEntries[id];
  data.folders = data.folders.filter((candidate) => !ids.has(candidate.id));
  data.vocabulary = data.vocabulary.filter((entry) => !entryIds.has(entry.id));
  data.history = data.history.filter(
    (item) => !entryIds.has(item.vocabularyId),
  );
  for (const entryId of entryIds) delete data.translationStats[entryId];
}

export function moveFolder(
  data: AppData,
  folderId: string,
  targetParentId: string,
  now = new Date().toISOString(),
): void {
  const folder = getFolder(data, folderId);
  const target = getFolder(data, targetParentId);
  if (isLanguageFolder(folder))
    throw new Error("Un dossier de langue ne peut pas être déplacé.");
  if (
    folderId === targetParentId ||
    getDescendantFolderIds(data, folderId).includes(targetParentId)
  )
    throw new Error("Un dossier ne peut pas être déplacé dans lui-même.");
  if (folder.language !== target.language)
    throw new Error("Un dossier ne peut pas changer de langue.");
  if (
    data.folders.some(
      (candidate) =>
        candidate.id !== folderId &&
        candidate.parentId === targetParentId &&
        candidate.name.toLocaleLowerCase() === folder.name.toLocaleLowerCase(),
    )
  )
    throw new Error("Un dossier portant ce nom existe déjà à cet endroit.");
  folder.parentId = targetParentId;
  folder.updatedAt = now;
}

export function moveEntry(
  data: AppData,
  entryId: string,
  fromFolderId: string,
  toFolderId: string,
): void {
  if (!data.vocabulary.some((entry) => entry.id === entryId))
    throw new Error("Vocabulaire introuvable.");
  const from = getFolder(data, fromFolderId);
  const to = getFolder(data, toFolderId);
  if (from.language !== to.language)
    throw new Error("Un élément ne peut pas changer de langue de dossier.");
  if (!data.folderEntries[fromFolderId]?.includes(entryId))
    throw new Error("L’élément n’appartient pas au dossier source.");
  if (fromFolderId === toFolderId) return;
  data.folderEntries[fromFolderId] = data.folderEntries[fromFolderId].filter(
    (id) => id !== entryId,
  );
  data.folderEntries[toFolderId] ??= [];
  if (!data.folderEntries[toFolderId].includes(entryId))
    data.folderEntries[toFolderId].push(entryId);
}

export function entriesInFolder(
  data: AppData,
  folderId: string,
): VocabularyEntry[] {
  const ids = new Set(
    getDescendantFolderIds(data, folderId).flatMap(
      (id) => data.folderEntries[id] ?? [],
    ),
  );
  return data.vocabulary.filter((entry) => ids.has(entry.id));
}

export function getDescendantFolderIds(
  data: AppData,
  folderId: string,
): string[] {
  const result: string[] = [];
  const pending = [folderId];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    for (const folder of data.folders)
      if (folder.parentId === current) pending.push(folder.id);
  }
  return result;
}

function getFolder(data: AppData, folderId: string): Folder {
  const folder = data.folders.find((candidate) => candidate.id === folderId);
  if (!folder) throw new Error("Dossier introuvable.");
  return folder;
}
