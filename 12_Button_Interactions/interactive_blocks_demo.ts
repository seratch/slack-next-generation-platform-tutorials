import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "demo-workflow",
  title: "Demo Workflow",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
    },
    required: ["channel_id", "user_id"],
  },
});

// Send a message via SendMessage + interactive_blocks
const sendMessageStep = workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: workflow.inputs.channel_id,
  message: `Do you approve <@${workflow.inputs.user_id}>'s time off request?`,
  // Simplified blocks for interactions
  interactive_blocks: [
    {
      "type": "actions",
      "block_id": "approve-deny-buttons",
      "elements": [
        {
          type: "button",
          action_id: "approve",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
        },
        {
          type: "button",
          action_id: "deny",
          text: { type: "plain_text", text: "Deny" },
          style: "danger",
        },
      ],
    },
  ],
});

// Handle the button click events on interactive_blocks
import { def as handleInteractiveBlocks } from "./handle_interactive_blocks.ts";
workflow.addStep(handleInteractiveBlocks, {
  // The clicked action's details
  action: sendMessageStep.outputs.action,
  // For further interactions on a modal
  interactivity: sendMessageStep.outputs.interactivity,
  // The message's URL
  messageLink: sendMessageStep.outputs.message_link,
  // The message's unique ID in the channel
  messageTs: sendMessageStep.outputs.message_ts,
});

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Interaction Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    channel_id: { value: "{{data.channel_id}}" },
    user_id: { value: "{{data.user_id}}" },
  },
};
export default trigger;
