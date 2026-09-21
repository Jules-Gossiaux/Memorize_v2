import { describe, expect, it } from "vitest";
import { saveTranslation } from "./vocabulary";
import { createEmptyData } from "../domain/model";

const request = {
  text: " hello ",
  sourceLanguage: "en",
  targetLanguage: "fr",
  context: "A short context",
  url: "https://example.test/article",
};

describe("saveTranslation", () => {
  it("crée un vocabulaire, un dossier de langue et un historique", () => {
    const data = createEmptyData();
    const result = saveTranslation(
      data,
      request,
      "bonjour",
      "2026-09-21T20:00:00.000Z",
    );
    expect(result.created).toBe(true);
    expect(data.vocabulary).toHaveLength(1);
    expect(data.folders[0]?.language).toBe("fr");
    expect(data.history[0]?.vocabularyId).toBe(result.entry.id);
    expect(data.folderEntries[result.languageFolderId]).toEqual([
      result.entry.id,
    ]);
  });

  it("met à jour l'entrée stable sans créer de doublon", () => {
    const data = createEmptyData();
    const first = saveTranslation(
      data,
      request,
      "bonjour",
      "2026-09-21T20:00:00.000Z",
    );
    const second = saveTranslation(
      data,
      { ...request, context: "New context" },
      "salut",
      "2026-09-21T20:01:00.000Z",
    );
    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(data.vocabulary).toHaveLength(1);
    expect(data.vocabulary[0]?.translatedCount).toBe(2);
    expect(data.history).toHaveLength(2);
    expect(data.folderEntries[first.languageFolderId]).toEqual([
      first.entry.id,
    ]);
  });

  it("refuse une traduction vide ou une URL invalide", () => {
    const data = createEmptyData();
    expect(() => saveTranslation(data, request, "   ")).toThrow(
      "La traduction est obligatoire.",
    );
    expect(() =>
      saveTranslation(data, { ...request, url: "not-a-url" }, "bonjour"),
    ).toThrow("L'URL est invalide.");
    expect(data.vocabulary).toHaveLength(0);
  });
});
