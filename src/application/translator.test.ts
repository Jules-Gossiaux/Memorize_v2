import { afterEach, describe, expect, it, vi } from "vitest";
import { myMemoryTranslator, TranslationError } from "./translator";

const request = {
  text: "Hello",
  sourceLanguage: "en",
  targetLanguage: "fr",
  context: "",
  url: "https://example.test",
};

describe("myMemoryTranslator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("extrait une traduction valide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            responseStatus: 200,
            responseData: { translatedText: "Bonjour" },
            quotaFinished: false,
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(myMemoryTranslator.translate(request)).resolves.toBe(
      "Bonjour",
    );
  });

  it("refuse les entrées hors limites et les erreurs de quota", async () => {
    await expect(
      myMemoryTranslator.translate({ ...request, text: "a".repeat(501) }),
    ).rejects.toBeInstanceOf(TranslationError);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ responseStatus: 200, quotaFinished: true }),
            { status: 200 },
          ),
        ),
    );
    await expect(myMemoryTranslator.translate(request)).rejects.toThrow(
      "quota",
    );
  });

  it("transforme une panne réseau en erreur métier", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(myMemoryTranslator.translate(request)).rejects.toThrow(
      "inaccessible",
    );
  });
});
