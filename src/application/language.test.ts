import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language";

describe("language detection", () => {
  it("reconnaît les langues courantes dans une phrase", () => {
    expect(detectLanguage("This is a simple English sentence.")).toBe("en");
    expect(detectLanguage("Dit is een Nederlandse zin.")).toBe("nl");
    expect(detectLanguage("Vocabulary")).toBe("en");
  });

  it("ignore un contenu non linguistique", () => {
    expect(detectLanguage("1234 ---")).toBeNull();
  });
});
