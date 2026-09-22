import { franc } from "franc-min";

const ISO3_TO_ISO2: Record<string, string> = {
  ara: "ar",
  ces: "cs",
  dan: "da",
  deu: "de",
  eng: "en",
  ell: "el",
  fin: "fi",
  fra: "fr",
  heb: "he",
  hin: "hi",
  hun: "hu",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  nor: "no",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tur: "tr",
  ukr: "uk",
  vie: "vi",
  zho: "zh",
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
