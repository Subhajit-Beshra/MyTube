const supportedLanguages = new Set([
  "ar",
  "bn",
  "de",
  "en",
  "es",
  "fr",
  "hi",
  "ja",
  "ko",
  "pt",
]);

export class TranslationConfigurationError extends Error {}
export class TranslationProviderError extends Error {}

export function isSupportedTranslationLanguage(language) {
  return typeof language === "string" && supportedLanguages.has(language);
}

export async function translateText(text, targetLanguage, fetcher = fetch) {
  if (!isSupportedTranslationLanguage(targetLanguage)) {
    throw new TypeError("Choose a supported translation language.");
  }
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new TranslationConfigurationError("Comment translation is not configured on the server.");
  }

  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", apiKey);

  let response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: targetLanguage, format: "text" }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new TranslationProviderError("The translation provider could not be reached.");
  }
  if (!response.ok) {
    console.error("Translation provider returned status:", response.status);
    throw new TranslationProviderError("The comment could not be translated right now.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new TranslationProviderError("The translation provider returned an invalid response.");
  }
  const translation = result?.data?.translations?.[0];
  if (typeof translation?.translatedText !== "string") {
    throw new TranslationProviderError("The translation provider returned an invalid response.");
  }
  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage:
      typeof translation.detectedSourceLanguage === "string"
        ? translation.detectedSourceLanguage
        : null,
  };
}
