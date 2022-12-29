import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "webhook_configurator",
  title: "Webhook Configurator",
  input_parameters: {
    properties: {
      channel_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.channel_id },
      },
    },
    required: ["channel_ids"],
  },
});

import { def as Configure } from "./configure.ts";
import { workflow as MainWorkflow } from "./main_workflow.ts";
workflow.addStep(Configure, {
  // The callback_id here must be the one for "Main" workflow!
  workflowCallbackId: MainWorkflow.definition.callback_id,
  channelIds: workflow.inputs.channel_ids,
});

// Trigger to invoke the "Configurator" workflow
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook",
  name: "Webhook Configurator Trigger",
  // The callback_id here must be the one for "Configurator" workflow!
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: { "channel_ids": { "value": "{{data.channel_ids}}" } },
};
export default trigger;
