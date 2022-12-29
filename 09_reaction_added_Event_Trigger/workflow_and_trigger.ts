// ----------------
// Workflow Definition
// ----------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "example-workflow",
  title: "Example Workflow",
  input_parameters: {
    properties: {
      // All the possible inputs from the "reaction_added" event trigger
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "message_ts", "reaction"],
  },
});

import { def as reply } from "./function.ts";
workflow.addStep(reply, {
  channel_id: workflow.inputs.channel_id,
  user_id: workflow.inputs.user_id,
  reaction: workflow.inputs.reaction,
  message_ts: workflow.inputs.message_ts,
});

// ----------------
// Trigger Definition
// ----------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "event", // Event Trigger
  name: "Trigger the example workflow",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  event: {
    // "reaction_added" event trigger
    event_type: "slack#/events/reaction_added",
    channel_ids: ["C04FB5UF1C2"], // TODO: Update this list
    // The condition to filter events
    filter: {
      version: 1,
      // Start the workflow only when the reaction is :eyes:
      root: { statement: "{{data.reaction}} == eyes" },
    },
  },
  inputs: {
    channel_id: { value: "{{data.channel_id}}" },
    user_id: { value: "{{data.user_id}}" },
    message_ts: { value: "{{data.message_ts}}" },
    reaction: { value: "{{data.reaction}}" },
  },
};
export default trigger;
