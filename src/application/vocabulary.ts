import { ensureLanguageFolder } from "../domain/folders";
import {
  type AppData,
  type HistoryItem,
  type VocabularyEntry,
  vocabularyId,
} from "../domain/model";
import type { TranslationRequest } from "./translator";

export interface SaveTranslationResult {
  entry: VocabularyEntry;
  created: boolean;
  languageFolderId: string;
}

export function recordTranslationAttempt(
  data: AppData,
  request: TranslationRequest,
): number {
  const original = requiredText(request.text, "Le texte original");
  const sourceLanguage = requiredText(
    request.sourceLanguage,
    "La langue source",
  );
  const targetLanguage = requiredText(
    request.targetLanguage,
    "La langue cible",
  );
  const id = vocabularyId(original, sourceLanguage, targetLanguage);
  const existing = data.vocabulary.find((entry) => entry.id === id);
  const next =
    Math.max(data.translationStats[id] ?? 0, existing?.translatedCount ?? 0) +
    1;
  data.translationStats[id] = next;
  return next;
}

export function getTranslationCount(
  data: AppData,
  request: TranslationRequest,
): number {
  const id = vocabularyId(
    request.text,
    request.sourceLanguage,
    request.targetLanguage,
  );
  const existing = data.vocabulary.find((entry) => entry.id === id);
  return Math.max(
    data.translationStats[id] ?? 0,
    existing?.translatedCount ?? 0,
  );
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} est obligatoire.`);
  if (normalized.length > 10_000) throw new Error(`${field} est trop long.`);
  return normalized;
}

function safeUrl(value: string): string {
  const url = requiredText(value, "L'URL");
  try {
    new URL(url);
  } catch {
    throw new Error("L'URL est invalide.");
  }
  return url;
}

export function saveTranslation(
  data: AppData,
  request: TranslationRequest,
  translation: string,
  now = new Date().toISOString(),
): SaveTranslationResult {
  const original = requiredText(request.text, "Le texte original");
  const translated = requiredText(translation, "La traduction");
  const sourceLanguage = requiredText(
    request.sourceLanguage,
    "La langue source",
  );
  const targetLanguage = requiredText(
    request.targetLanguage,
    "La langue cible",
  );
  const url = safeUrl(request.url);
  const context = request.context.trim().slice(0, 5_000);
  const id = vocabularyId(original, sourceLanguage, targetLanguage);
  const existing = data.vocabulary.find((entry) => entry.id === id);
  const languageFolder = ensureLanguageFolder(data, targetLanguage, now);
  const translatedCount = Math.max(
    data.translationStats[id] ?? 1,
    existing?.translatedCount ?? 0,
  );

  if (existing) {
    existing.translation = translated;
    existing.url = url;
    existing.context = context;
    existing.updatedAt = now;
    existing.translatedCount = translatedCount;
    addHistory(data, existing.id, now);
    addToFolder(data, languageFolder.id, existing.id);
    return {
      entry: existing,
      created: false,
      languageFolderId: languageFolder.id,
    };
  }

  const entry: VocabularyEntry = {
    id,
    original,
    translation: translated,
    sourceLanguage,
    targetLanguage,
    url,
    context,
    translatedCount,
    createdAt: now,
    updatedAt: now,
  };
  data.vocabulary.push(entry);
  addHistory(data, entry.id, now);
  addToFolder(data, languageFolder.id, entry.id);
  return { entry, created: true, languageFolderId: languageFolder.id };
}

export function clearHistory(data: AppData): void {
  data.history = [];
}

function addHistory(
  data: AppData,
  vocabularyIdValue: string,
  translatedAt: string,
): void {
  const historyItem: HistoryItem = {
    id: crypto.randomUUID(),
    vocabularyId: vocabularyIdValue,
    translatedAt,
  };
  data.history.push(historyItem);
}

function addToFolder(data: AppData, folderId: string, entryId: string): void {
  const entries = (data.folderEntries[folderId] ??= []);
  if (!entries.includes(entryId)) entries.push(entryId);
}
