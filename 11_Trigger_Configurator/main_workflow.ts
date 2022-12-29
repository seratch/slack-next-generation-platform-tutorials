import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "main_event_workflow",
  title: "Main event workflow",
  input_parameters: {
    properties: {
      // The list of input properties needs to be consistent with
      // the trigger operation code in `manage_triggers.ts`
      userId: { type: Schema.slack.types.user_id },
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["userId", "channelId", "reaction"],
  },
});

// Send an ephemeral message when an expected reaction is added
workflow.addStep(Schema.slack.functions.SendEphemeralMessage, {
  user_id: workflow.inputs.userId,
  channel_id: workflow.inputs.channelId,
  message: `Thanks for adding :${workflow.inputs.reaction}:!`,
});

// This source file does not have its trigger definition!
// The "reaction_added" event trigger will be created by
// the "Configurator" workflow's custom function.
