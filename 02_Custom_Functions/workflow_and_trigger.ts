// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
// Don't forget to add this workflow to manifest.ts!
export const workflow = DefineWorkflow({
  callback_id: "custom-function-demo-workflow",
  title: "Custom Function Demo Workflow",
  input_parameters: {
    properties: {
      // The channel ID passed from the link trigger
      channel_id: { type: Schema.slack.types.channel_id },
    },
    required: ["channel_id"],
  },
});

// Replace the built-in function with your own one below
/*
// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  // Set the channel ID given by trigger -> workflow
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});
*/

// Import your own ./my_send_message.ts and use the function instead
import { def as MySendMessage } from "./my_send_message.ts";
workflow.addStep(MySendMessage, {
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";
// This trigger starts the workflow when an end-user clicks the link
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Custom Function Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // The channel where you click the link trigger
    channel_id: { value: "{{data.channel_id}}" },
  },
};

// As long as the trigger object is default exported,
// you can generate a trigger with this code:
// $ slack triggers create --trigger-def ./workflow_and_trigger.ts
export default trigger;
