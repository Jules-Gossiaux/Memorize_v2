import { describe, expect, it } from "vitest";
import {
  addFolder,
  entriesInFolder,
  ensureLanguageFolder,
  moveEntry,
  ROOT_FOLDER_ID,
} from "./folders";
import { createEmptyData, type VocabularyEntry } from "./model";

describe("folders", () => {
  it("crée une racine de langue et refuse un parent d'une autre langue", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const en = ensureLanguageFolder(data, "en");
    expect(fr.parentId).toBe(ROOT_FOLDER_ID);
    expect(() => addFolder(data, "Voyage", "fr", en.id)).toThrow();
  });

  it("déplace un élément sans le dupliquer", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const child = addFolder(data, "Voyage", "fr", fr.id);
    const entry: VocabularyEntry = {
      id: "e1",
      original: "hello",
      translation: "bonjour",
      sourceLanguage: "en",
      targetLanguage: "fr",
      url: "https://example.test",
      context: "",
      translatedCount: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    data.vocabulary.push(entry);
    moveEntry(data, entry.id, child.id);
    moveEntry(data, entry.id, fr.id);
    expect(entriesInFolder(data, fr.id)).toHaveLength(1);
  });
});
