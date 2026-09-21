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

export const unavailableTranslator: Translator = {
  async translate(_request) {
    throw new Error("Aucun fournisseur de traduction n'est configuré.");
  },
};
