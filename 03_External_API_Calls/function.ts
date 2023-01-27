import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

// The metadada definition for the translator function
export const def = DefineFunction({
  callback_id: "translate",
  title: "Translate",
  description: "Translate text using DeepL's API",
  // This path needs to be a relative path from the directory you place manifest.ts
  source_file: "function.ts",
  input_parameters: {
    properties: {
      text: { type: Schema.types.string },
      source_lang: { type: Schema.types.string }, // optional
      target_lang: { type: Schema.types.string },
    },
    required: ["text", "target_lang"],
  },
  output_parameters: {
    properties: { translated_text: { type: Schema.types.string } },
    required: ["translated_text"],
  },
});

export default SlackFunction(def, async ({ inputs, env }) => {
  // When running a dev version of your app,
  // placing `.env` file with variables is the way to configure `env`.
  // As for the deployed prod one, you need to run
  // `slack env add DEEPL_AUTH_KEY (value)` before running the app's workflow.
  const authKey = env.DEEPL_AUTH_KEY;
  if (!authKey) {
    // Since it's not possible to continnue in this case, this function returns an error.
    const error =
      "DEEPL_AUTH_KEY env value is missing! Please add `.env` file for `slack run`. If you've already deployed this app, `slack env add DEEPL_AUTH_KEY (value)` command configures the env variable for you.";
    return { error };
  }
  // Build an HTTP request towards DeepL's text translation API
  const subdomain = authKey.endsWith(":fx") ? "api-free" : "api";
  const deeplApiUrl = `https://${subdomain}.deepl.com/v2/translate`;
  const body = new URLSearchParams();
  body.append("auth_key", authKey);
  body.append("text", inputs.text);
  if (inputs.source_lang) { // this input is optional
    body.append("source_lang", inputs.source_lang.toUpperCase());
  }
  body.append("target_lang", inputs.target_lang.toUpperCase());
  // When there is no Deno library to perform external API calls,
  // simply using the built-in `fetch` function is the recommended way.
  const response = await fetch(deeplApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });
  const status = response.status;
  if (status != 200) {
    const body = await response.text();
    const error = `DeepL API error (status: ${status}, body: ${body})`;
    return { error };
  }
  // When the translation succeeds, the response body is JSON data.
  const result = await response.json();
  if (!result || result.translations.length === 0) {
    const error = `Translation failed: ${JSON.stringify(result)}`;
    return { error };
  }
  // When it's successful, the outputs must include "translated_text" as it's required.
  return { outputs: { translated_text: result.translations[0].text } };
});
