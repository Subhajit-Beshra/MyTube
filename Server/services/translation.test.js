import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedTranslationLanguage,
  translateText,
  TranslationConfigurationError,
  TranslationProviderError,
} from "./translation.js";

test("translation language validation allows configured languages only", () => {
  assert.equal(isSupportedTranslationLanguage("hi"), true);
  assert.equal(isSupportedTranslationLanguage("en"), true);
  assert.equal(isSupportedTranslationLanguage("xx"), false);
  assert.equal(isSupportedTranslationLanguage(undefined), false);
});

test("translation request keeps credentials server-side and returns provider output", async () => {
  const previous = process.env.GOOGLE_TRANSLATE_API_KEY;
  process.env.GOOGLE_TRANSLATE_API_KEY = "test-translation-key";
  let requestUrl;
  let requestOptions;
  try {
    const result = await translateText("नमस्ते", "en", async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({
          data: {
            translations: [
              { translatedText: "Hello", detectedSourceLanguage: "hi" },
            ],
          },
        }),
      };
    });
    assert.equal(requestUrl.hostname, "translation.googleapis.com");
    assert.equal(requestUrl.searchParams.get("key"), "test-translation-key");
    assert.deepEqual(JSON.parse(requestOptions.body), {
      q: "नमस्ते",
      target: "en",
      format: "text",
    });
    assert.deepEqual(result, { translatedText: "Hello", detectedSourceLanguage: "hi" });
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY;
    else process.env.GOOGLE_TRANSLATE_API_KEY = previous;
  }
});

test("translation fails explicitly for missing credentials and provider errors", async () => {
  const previous = process.env.GOOGLE_TRANSLATE_API_KEY;
  try {
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
    await assert.rejects(translateText("Hello", "hi"), TranslationConfigurationError);
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-translation-key";
    await assert.rejects(
      translateText("Hello", "hi", async () => ({ ok: false, status: 500 })),
      TranslationProviderError,
    );
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY;
    else process.env.GOOGLE_TRANSLATE_API_KEY = previous;
  }
});
