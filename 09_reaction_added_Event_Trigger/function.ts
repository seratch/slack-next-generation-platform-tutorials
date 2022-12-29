import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

export const def = DefineFunction({
  callback_id: "reply_to_reaction",
  title: "Reply to a reaction in a channel",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      reaction: { type: Schema.types.string },
      message_ts: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "reaction", "message_ts"],
  },
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    required: ["ts"],
  },
});

export default SlackFunction(def, async ({ inputs, client }) => {
  // https://api.slack.com/methods/conversations.join
  // requires "channels:join" scope in manifest.ts
  const joinResponse = await client.conversations.join({
    channel: inputs.channel_id,
  });
  if (joinResponse.error) {
    const error = `Failed to join the channel due to ${joinResponse.error}`;
    return { error };
  }
  // https://api.slack.com/methods/conversations.history
  // requires "channels:history" scope in manifest.ts
  const historyResponse = await client.conversations.history({
    channel: inputs.channel_id,
    latest: inputs.message_ts,
    inclusive: true,
    limit: 1,
  });
  if (historyResponse.error) {
    const error =
      `Failed to fetch the channel content due to ${joinResponse.error}`;
    return { error };
  }
  const messageText = (historyResponse.messages[0].text ||
    "(Failed to fetch the message text)").replaceAll("\n", "\n>");
  const replyText =
    `Hey <@${inputs.user_id}>, thanks for adding :${inputs.reaction}: to the following message:\n>${messageText}`;
  // https://api.slack.com/methods/chat.postMessage
  // requires "chat:write" scope in manifest.ts
  const replyResponse = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: replyText,
  });
  if (replyResponse.error) {
    const error = `Failed to post a message due to ${replyResponse.error}`;
    return { error };
  }
  return { outputs: { ts: replyResponse.ts } };
});
