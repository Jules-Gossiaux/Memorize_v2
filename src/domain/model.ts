export const DATA_VERSION = 1;

export type LanguageCode = string;

export interface Folder {
  id: string;
  name: string;
  language: LanguageCode;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyEntry {
  id: string;
  original: string;
  translation: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  url: string;
  context: string;
  translatedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  vocabularyId: string;
  translatedAt: string;
}

export interface Preferences {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  theme: "light" | "dark";
}

export interface AppData {
  version: number;
  folders: Folder[];
  vocabulary: VocabularyEntry[];
  folderEntries: Record<string, string[]>;
  history: HistoryItem[];
  preferences: Preferences;
}

export const createEmptyData = (): AppData => ({
  version: DATA_VERSION,
  folders: [],
  vocabulary: [],
  folderEntries: {},
  history: [],
  preferences: { sourceLanguage: "auto", targetLanguage: "fr", theme: "light" },
});

export const vocabularyId = (
  original: string,
  sourceLanguage: string,
  targetLanguage: string,
): string =>
  `${sourceLanguage}:${targetLanguage}:${original.trim().toLocaleLowerCase()}`;
