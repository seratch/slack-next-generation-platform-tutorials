// ----------------
// Workflow Definition
// ----------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "modal-demo-workflow",
  title: "Modal Demo Workflow",
  input_parameters: {
    properties: { interactivity: { type: Schema.slack.types.interactivity } },
    required: ["interactivity"],
  },
});

// Add your custom function to open and handle a modal
import { def as ModalDemo } from "./function.ts";
workflow.addStep(ModalDemo, {
  interactivity: workflow.inputs.interactivity,
});

// ----------------
// Trigger Definition
// ----------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut", // link trigger
  name: "Modal Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // Modal interactions require `interactivity` input parameter.
    // As of this writing, only link triggers can provide the value.
    interactivity: { value: "{{data.interactivity}}" },
  },
};
export default trigger;
