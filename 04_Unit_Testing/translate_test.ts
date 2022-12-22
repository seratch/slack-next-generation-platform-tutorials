// Add "mock-fetch/": "https://deno.land/x/mock_fetch@0.3.0/" to "imports" in ./import_map.json
import * as mf from "mock-fetch/mod.ts";
import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import { assertEquals } from "std/testing/asserts.ts";
import handler from "./translate.ts";

// After this method call,
// all `globalThis.fetch` calls will be replaced with mock behaviors
mf.install();

// Handles DeepL's text translation API calls
mf.mock("POST@/v2/translate", async (args) => {
  const params = await args.formData();
  if (params.get("auth_key") !== "valid-token") {
    // Invalid auth_key
    return new Response("Unauthorized", { status: 401 });
  }
  // Successful pattern
  const body = JSON.stringify({
    translations: [{ detected_source_language: "EN", text: "こんにちは！" }],
  });
  return new Response(body, { status: 200 });
});

const { createContext } = SlackFunctionTester("my-function");

Deno.test("Translate text successfully", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  const env = { DEEPL_AUTH_KEY: "valid-token" };
  const { outputs } = await handler(createContext({ inputs, env }));
  assertEquals(outputs, { translated_text: "こんにちは！" });
});

Deno.test("Fail to continue if DEEPL_AUTH_KEY is missing", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  //intentionally empty
  const env = {};
  const { outputs, error } = await handler(createContext({ inputs, env }));
  assertEquals(
    error,
    "DEEPL_AUTH_KEY env value is missing! Please add `.env` file for `slack run`. If you've already deployed this app, `slack env add DEEPL_AUTH_KEY (value)` command configures the env variable for you.",
  );
  assertEquals(outputs, undefined);
});

Deno.test("Fail to traslate text with an invalid token", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  const env = { DEEPL_AUTH_KEY: "invalid-token" };
  const { outputs, error } = await handler(createContext({ inputs, env }));
  assertEquals(error, "DeepL API error (status: 401, body: Unauthorized)");
  assertEquals(outputs, undefined);
});
