export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: string;
  url: string;
}

export interface Translator {
  translate(request: TranslationRequest): Promise<string>;
}

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_REQUEST_BYTES = 500;

interface MyMemoryResponse {
  responseData?: { translatedText?: unknown; match?: unknown };
  responseStatus?: unknown;
  quotaFinished?: unknown;
}

export class TranslationError extends Error {}

export const myMemoryTranslator: Translator = {
  async translate(request) {
    const text = request.text.trim();
    if (!text) throw new TranslationError("Le texte à traduire est vide.");
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      throw new TranslationError(
        "Le texte sélectionné dépasse la limite de 500 octets.",
      );
    }
    const source = request.sourceLanguage.trim().toLowerCase();
    const target = request.targetLanguage.trim().toLowerCase();
    if (!isLanguageCode(source) || source === "auto") {
      throw new TranslationError(
        "Choisissez une langue source avant de traduire.",
      );
    }
    if (!isLanguageCode(target) || source === target) {
      throw new TranslationError(
        "Les langues source et cible doivent être différentes.",
      );
    }
    const url = new URL(MYMEMORY_ENDPOINT);
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${source}|${target}`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new TranslationError("Le service de traduction est inaccessible.");
    }
    if (!response.ok) {
      throw new TranslationError(
        `Le service de traduction a répondu ${response.status}.`,
      );
    }
    let payload: MyMemoryResponse;
    try {
      payload = (await response.json()) as MyMemoryResponse;
    } catch {
      throw new TranslationError(
        "La réponse du service de traduction est invalide.",
      );
    }
    if (payload.quotaFinished === true) {
      throw new TranslationError("Le quota gratuit de traduction est épuisé.");
    }
    if (payload.responseStatus !== 200) {
      throw new TranslationError(
        "La paire de langues ou le texte n'est pas accepté.",
      );
    }
    const translation = payload.responseData?.translatedText;
    if (typeof translation !== "string" || !translation.trim()) {
      throw new TranslationError("Aucune traduction valide n'a été retournée.");
    }
    return translation.trim();
  },
};

function isLanguageCode(value: string): boolean {
  return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(value);
}
