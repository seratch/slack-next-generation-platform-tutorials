import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

// Define the metadata of the function:
// No need to be `def`. Any names work for you
export const def = DefineFunction({
  callback_id: "my_send_message",
  title: "My SendMessage",
  // Pass the relative path to this file from the project root directory:
  // If you place this under functions/ directory, the string can be funtions/my_send_message.ts
  // source_file: "my_send_message_with_comments.ts",

  // A 3rd party module "deno_slack_source_file_resolver" automatically resolves the relative path
  source_file: FunctionSourceFile(import.meta.url),

  // Define all the possible inputs with thier names and types:
  // Having description too would be helpful for long-term maintenance but it's optional.
  // You can access the properties inside your function handler code.
  input_parameters: {
    properties: {
      // When setting `Schema.slack.types.channel_id` as the type here,
      // the workflow engine verifies the format of given data.
      // If it's not a channel string, the workflow execution can be terminated as a failure.
      channel_id: { type: Schema.slack.types.channel_id },
      // This general string type accepts any string data,
      message: { type: Schema.types.string },
    },
    // Having the property names ensures they're always available for the handler execution.
    required: ["channel_id", "message"],
  },
  // Define all the possible outputs when the function execution succeeds:
  // When it fails and you'd like to immediately terminate the workflow execution, your function code should return an error string instead outputs.
  // Otherwise, it's also a good approach to include some error state in outputs,
  // and then let the following functions handle the error outcome.
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    // When a property is listed here, your handler code must return the property as part of outputs. TS compiler verifies this for you.
    required: ["ts"],
  },
});

// The default export of the `SlackFunction()` call result is required to make it available for workflows.
// You can pass the above "definition" object as the first argument.
// The second argument is the handler function, which executes the function's logic.
// Also, it needs ot be compatible with the definition's inputs/outputs.
export default SlackFunction(def, async ({
  // All the possible arguments as of this writing
  event, // all the metadata on this function execution event
  inputs, // the properties defined in input_parameters
  env, // we don't use this time but you can set secrets by slack env command
  team_id, // The connected workspace's ID
  enterprise_id, // The connected Enterprise Grid Org's ID (if that's not the case, this property can be an empty string)
  client, // Slack API client -- if you need a direct access to its bot token, you can have `token` here too
}) => {
  // Print everyting just to use all the arguments
  console.log(JSON.stringify({ event, inputs, env, team_id, enterprise_id }));
  // Call chat.postMessage API to post a message in a channel
  const response = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: inputs.message,
  });
  console.log(`chat.postMessage result: ${JSON.stringify(response, null, 2)}`);
  if (response.error) {
    // Terminate the workflow execution due to this error
    const error = `Failed to post a message due to ${response.error}`;
    return { error };
  }
  // Return a successful result in the outputs
  return { outputs: { ts: response.ts } };
});
