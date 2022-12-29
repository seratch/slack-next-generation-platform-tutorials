import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "modal-configurator",
  title: "Modal Configurator",
  input_parameters: {
    properties: { interactivity: { type: Schema.slack.types.interactivity } },
    required: ["interactivity"],
  },
});

import { def as ConfigureWithModal } from "./configure_interactive.ts";
import { workflow as MainWorkflow } from "./main_workflow.ts";
workflow.addStep(ConfigureWithModal, {
  interactivity: workflow.inputs.interactivity,
  // The callback_id here must be the one for "Main" workflow!
  workflowCallbackId: MainWorkflow.definition.callback_id,
});

// Trigger to invoke the "Configurator" workflow
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Modal Configurator Trigger",
  // The callback_id here must be the one for "Configurator" workflow!
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: { interactivity: { value: "{{data.interactivity}}" } },
};
export default trigger;
