import { createEmptyData, DATA_VERSION, type AppData } from "../domain/model";

const STORAGE_KEY = "memorize:data";

export interface Storage {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
}

export const chromeStorage: Storage = {
  async load() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Partial<AppData> | undefined;
    if (!stored) return createEmptyData();
    return migrate(stored);
  },
  async save(data: AppData) {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  },
};

export function migrate(input: Partial<AppData>): AppData {
  const empty = createEmptyData();
  return {
    ...empty,
    ...input,
    version: DATA_VERSION,
    folders: Array.isArray(input.folders) ? input.folders : [],
    vocabulary: Array.isArray(input.vocabulary) ? input.vocabulary : [],
    folderEntries:
      input.folderEntries && typeof input.folderEntries === "object"
        ? input.folderEntries
        : {},
    history: Array.isArray(input.history) ? input.history : [],
    preferences: { ...empty.preferences, ...(input.preferences ?? {}) },
  };
}
