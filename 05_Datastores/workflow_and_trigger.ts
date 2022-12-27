import { DefineWorkflow } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "datastore-demo-workflow",
  title: "Datastore Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

import { def as Demo } from "./function.ts";
workflow.addStep(Demo, {});

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook",
  name: "Datastore Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {},
};
export default trigger;
