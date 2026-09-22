import { franc } from "franc-min";

const ISO3_TO_ISO2: Record<string, string> = {
  deu: "de",
  eng: "en",
  spa: "es",
  fra: "fr",
  ita: "it",
  nld: "nl",
  por: "pt",
};
const COMMON_WORDS: Record<string, string> = {
  vocabulary: "en",
  following: "en",
  hello: "en",
  world: "en",
  bonjour: "fr",
  merci: "fr",
  suivre: "fr",
  nederland: "nl",
  hallo: "nl",
};

export function detectLanguage(text: string): string | null {
  const normalized = text.trim();
  if (!normalized || !/[a-zÀ-ÿ]/i.test(normalized)) return null;
  const commonWord = COMMON_WORDS[normalized.toLocaleLowerCase()];
  if (commonWord) return commonWord;
  try {
    const detected = franc(normalized, { minLength: 1 });
    return ISO3_TO_ISO2[detected] ?? null;
  } catch {
    return null;
  }
}
