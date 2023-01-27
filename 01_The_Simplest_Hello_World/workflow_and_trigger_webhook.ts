// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

// Don't forget to add this workflow to manifest.ts!
export const workflow = DefineWorkflow({
  callback_id: "hello-world-workflow",
  title: "Hello World Workflow",
  input_parameters: { properties: {}, required: [] },
});

// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: "C03E94MKS", // TODO: Grab the ID in Slack UI
  message: "Hello World!",
});

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";
// This trigger starts the workflow when the webhook URL receives an HTTP request
const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook", // Incoming Webhooks
  name: "Hello World Trigger",
  // Need to embed the workflow's callback_id here
  workflow: `#/workflows/${workflow.definition.callback_id}`,
};

// As long as the trigger object is default exported,
// you can generate a trigger with this code:
// $ slack triggers create --trigger-def ./workflow_and_trigger.ts
export default trigger;
