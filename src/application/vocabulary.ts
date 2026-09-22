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
  translation = "",
  now = new Date().toISOString(),
): number {
  const original = requiredText(request.text, "Le texte original");
  const sourceLanguage = requiredText(
    request.sourceLanguage,
    "La langue source",
  ).toLowerCase();
  const targetLanguage = requiredText(
    request.targetLanguage,
    "La langue cible",
  ).toLowerCase();
  const id = vocabularyId(original, sourceLanguage, targetLanguage);
  const existing = data.vocabulary.find((entry) => entry.id === id);
  const next =
    Math.max(data.translationStats[id] ?? 0, existing?.translatedCount ?? 0) +
    1;
  data.translationStats[id] = next;
  addHistory(data, id, now, original, translation);
  return next;
}

export function getTranslationCount(
  data: AppData,
  request: TranslationRequest,
): number {
  const id = vocabularyId(
    request.text,
    request.sourceLanguage.trim().toLowerCase(),
    request.targetLanguage.trim().toLowerCase(),
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
  folderIdOrNow?: string,
  now = new Date().toISOString(),
): SaveTranslationResult {
  const legacyTimestamp = folderIdOrNow?.includes("T")
    ? folderIdOrNow
    : undefined;
  const folderId = legacyTimestamp ? undefined : folderIdOrNow;
  if (legacyTimestamp) now = legacyTimestamp;
  const original = requiredText(request.text, "Le texte original");
  const translated = requiredText(translation, "La traduction");
  const sourceLanguage = requiredText(
    request.sourceLanguage,
    "La langue source",
  ).toLowerCase();
  const targetLanguage = requiredText(
    request.targetLanguage,
    "La langue cible",
  ).toLowerCase();
  const url = safeUrl(request.url);
  const context = request.context.trim().slice(0, 5_000);
  const id = vocabularyId(original, sourceLanguage, targetLanguage);
  const existing = data.vocabulary.find((entry) => entry.id === id);
  const languageFolder = ensureLanguageFolder(data, targetLanguage, now);
  const destination = folderId
    ? data.folders.find((folder) => folder.id === folderId)
    : languageFolder;
  if (!destination) throw new Error("Dossier de destination introuvable.");
  if (destination.language !== targetLanguage)
    throw new Error("Le dossier choisi n'appartient pas à la langue cible.");
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
    addToFolder(data, destination.id, existing.id);
    return {
      entry: existing,
      created: false,
      languageFolderId: destination.id,
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
  addToFolder(data, destination.id, entry.id);
  return { entry, created: true, languageFolderId: destination.id };
}

export function deleteVocabularyEntry(data: AppData, entryId: string): void {
  if (!data.vocabulary.some((entry) => entry.id === entryId))
    throw new Error("Vocabulaire introuvable.");
  data.vocabulary = data.vocabulary.filter((entry) => entry.id !== entryId);
  for (const folderId of Object.keys(data.folderEntries))
    data.folderEntries[folderId] = (data.folderEntries[folderId] ?? []).filter(
      (id) => id !== entryId,
    );
}

export function clearHistory(data: AppData): void {
  data.history = [];
}

function addHistory(
  data: AppData,
  vocabularyIdValue: string,
  translatedAt: string,
  original = "",
  translation = "",
): void {
  const historyItem: HistoryItem = {
    id: crypto.randomUUID(),
    vocabularyId: vocabularyIdValue,
    translatedAt,
    original,
    translation,
  };
  data.history.push(historyItem);
}

function addToFolder(data: AppData, folderId: string, entryId: string): void {
  const entries = (data.folderEntries[folderId] ??= []);
  if (!entries.includes(entryId)) entries.push(entryId);
}
