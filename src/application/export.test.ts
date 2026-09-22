import { describe, expect, it } from "vitest";
import { parseSerializedEntries, serializeEntries } from "./export";
import type { VocabularyEntry } from "../domain/model";

const entries: VocabularyEntry[] = [
  {
    id: "one",
    original: "hello, world",
    translation: "bonjour",
    sourceLanguage: "en",
    targetLanguage: "fr",
    url: "https://example.test",
    context: "Hello, world!",
    translatedCount: 2,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

describe("vocabulary export", () => {
  it("échappe les champs et conserve les exemples", () => {
    const text = serializeEntries(entries, ",", true);
    expect(text).toContain('"hello, world",bonjour,"Hello, world!"');
    expect(parseSerializedEntries(text, ",", entries)[0]?.original).toBe(
      "hello, world",
    );
  });
});
