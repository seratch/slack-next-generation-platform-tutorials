import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
// Add "deno-slack-source-file-resolver/": "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/" to "imports" in ./import_map.json
import { FunctionSourceFile } from "deno-slack-source-file-resolver/mod.ts";

export const def = DefineFunction({
  callback_id: "echo",
  title: "Echo inputs",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      text: { type: Schema.types.string },
      capitalize: { type: Schema.types.boolean },
    },
    required: ["text"],
  },
  output_parameters: {
    properties: { text: { type: Schema.types.string } },
    required: ["text"],
  },
});

export default SlackFunction(def, ({ inputs }) => {
  const { text, capitalize } = inputs;
  if (capitalize) {
    return { outputs: { text: text.toUpperCase() } };
  } else {
    return { outputs: { text } };
  }
});
