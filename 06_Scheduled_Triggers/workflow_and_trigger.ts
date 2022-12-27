import { DefineWorkflow } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "scheduled-trigger-demo-workflow",
  title: "Scheduled Trigger Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "scheduled",
  name: "Trigger a workflow",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {},
  schedule: {
    // This start_time means 30 seconds after you run
    // `slack triggers create` command
    start_time: new Date(new Date().getTime() + 30_000).toISOString(),
    frequency: { type: "once" },
  },
};
export default trigger;
