import { describe, expect, it } from "vitest";
import {
  addFolder,
  deleteFolder,
  entriesInFolder,
  ensureLanguageFolder,
  moveEntry,
  moveFolder,
  removeLegacyLanguageFolders,
  renameFolder,
  ROOT_FOLDER_ID,
} from "./folders";
import { createEmptyData, type VocabularyEntry } from "./model";

function entry(id = "e1"): VocabularyEntry {
  return {
    id,
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
}

describe("folders", () => {
  it("crée des sous-dossiers imbriqués dans la même langue", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const travel = addFolder(data, "Voyage", "fr", fr.id);
    const cities = addFolder(data, "Villes", "fr", travel.id);
    expect(fr.parentId).toBe(ROOT_FOLDER_ID);
    expect(cities.parentId).toBe(travel.id);
    expect(() => addFolder(data, "Invalid", "en", fr.id)).toThrow();
  });

  it("affiche récursivement les entrées sans doublons", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const travel = addFolder(data, "Voyage", "fr", fr.id);
    const cities = addFolder(data, "Villes", "fr", travel.id);
    data.vocabulary.push(entry());
    data.folderEntries[cities.id] = ["e1"];
    data.folderEntries[travel.id] = ["e1"];
    expect(entriesInFolder(data, fr.id)).toHaveLength(1);
  });

  it("déplace uniquement depuis le dossier source", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const travel = addFolder(data, "Voyage", "fr", fr.id);
    const work = addFolder(data, "Travail", "fr", fr.id);
    data.vocabulary.push(entry());
    data.folderEntries[travel.id] = ["e1"];
    data.folderEntries[work.id] = ["e1"];
    moveEntry(data, "e1", travel.id, fr.id);
    expect(data.folderEntries[travel.id]).toEqual([]);
    expect(data.folderEntries[work.id]).toEqual(["e1"]);
    expect(data.folderEntries[fr.id]).toEqual(["e1"]);
  });

  it("crée un dossier à la racine et supprime ses mots avec lui", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const travel = addFolder(data, "Voyage", "fr", ROOT_FOLDER_ID);
    const cities = addFolder(data, "Villes", "fr", travel.id);
    data.vocabulary.push(entry());
    data.history.push({
      id: "h1",
      vocabularyId: "e1",
      translatedAt: "2026-01-01",
    });
    data.translationStats.e1 = 2;
    data.folderEntries[cities.id] = ["e1"];
    renameFolder(data, travel.id, "Vacances");
    deleteFolder(data, travel.id);
    expect(data.folders.some((folder) => folder.id === travel.id)).toBe(false);
    expect(data.folders.some((folder) => folder.id === cities.id)).toBe(false);
    expect(data.vocabulary).toHaveLength(0);
    expect(data.history).toHaveLength(1);
    expect(data.translationStats.e1).toBe(2);
    expect(fr.parentId).toBe(ROOT_FOLDER_ID);
  });

  it("déplace un dossier dans un autre sans autoriser les cycles", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    const travel = addFolder(data, "Voyage", "fr", fr.id);
    const cities = addFolder(data, "Villes", "fr", fr.id);
    moveFolder(data, cities.id, travel.id);
    expect(
      data.folders.find((folder) => folder.id === cities.id)?.parentId,
    ).toBe(travel.id);
    expect(() => moveFolder(data, travel.id, cities.id)).toThrow();
    moveFolder(data, cities.id, ROOT_FOLDER_ID);
    expect(
      data.folders.find((folder) => folder.id === cities.id)?.parentId,
    ).toBe(ROOT_FOLDER_ID);
  });

  it("retire les anciens dossiers de langue sans perdre leurs mots", () => {
    const data = createEmptyData();
    const fr = ensureLanguageFolder(data, "fr");
    data.vocabulary.push(entry());
    data.folderEntries[fr.id] = ["e1"];
    expect(removeLegacyLanguageFolders(data)).toBe(true);
    expect(data.folders.some((folder) => folder.id === fr.id)).toBe(false);
    expect(data.vocabulary).toHaveLength(1);
    expect(data.folderEntries[data.folders[0]?.id ?? ""] ?? []).toEqual(["e1"]);
  });
});
