import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
// Add "deno-slack-source-file-resolver/": "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/" to "imports" in ./import_map.json
import { FunctionSourceFile } from "deno-slack-source-file-resolver/mod.ts";

export const def = DefineFunction({
  callback_id: "my_send_message",
  title: "My SendMessage",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message: { type: Schema.types.string },
    },
    required: ["channel_id", "message"],
  },
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    required: ["ts"],
  },
});

import { Logger } from "./logger.ts";

export default SlackFunction(def, async ({ inputs, client, env }) => {
  const logger = Logger(env.LOG_LEVEL);
  const response = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: inputs.message,
  });
  logger.debug(`chat.postMessage result: ${JSON.stringify(response, null, 2)}`);
  if (response.error) {
    const error = `Failed to post a message due to ${response.error}`;
    return { error };
  }
  return { outputs: { ts: response.ts } };
});
