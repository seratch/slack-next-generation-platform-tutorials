import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  createOrUpdateTrigger,
  findTriggerToUpdate,
} from "./manage_triggers.ts";
import { joinAllChannels } from "./join_channels.ts";

export const def = DefineFunction({
  callback_id: "configure_with_modal",
  title: "Configure a trigger using a modal",
  source_file: "configure_interactive.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      workflowCallbackId: { type: Schema.types.string },
    },
    required: ["interactivity", "workflowCallbackId"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(def, async ({ inputs, client }) => {
  const trigger = await findTriggerToUpdate(client, inputs.workflowCallbackId);
  const channelIds = trigger?.channel_ids ?? [];

  const response = await client.views.open({
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      "type": "modal",
      "callback_id": "configure-workflow",
      "title": { "type": "plain_text", "text": "My App" },
      "submit": { "type": "plain_text", "text": "Confirm" },
      "close": { "type": "plain_text", "text": "Close" },
      "blocks": [
        {
          "type": "input",
          "block_id": "channels",
          "element": {
            "type": "multi_channels_select",
            "initial_channels": channelIds,
            "action_id": "action",
          },
          "label": {
            "type": "plain_text",
            "text": "Channels to enable the main workflow",
          },
        },
      ],
    },
  });
  if (response.error) {
    const error =
      `Failed to open a modal in the configurator workflow. Contact the app maintainers with the following information - (error: ${response.error})`;
    return { error };
  }
  return {
    // To continue the interaction, you must return completed: false
    completed: false,
  };
})
  .addViewSubmissionHandler(
    ["configure-workflow"],
    async ({ inputs, client, view }) => {
      const channelIds = view.state.values.channels.action.selected_channels;
      try {
        await createOrUpdateTrigger(
          client,
          inputs.workflowCallbackId,
          channelIds,
          (await findTriggerToUpdate(client, inputs.workflowCallbackId))?.id,
        );
      } catch (e) {
        const error = `Failed to create/update a trigger due to ${e}.`;
        return { error };
      }

      // If you don't need to invite your app's bot user to the channels,
      // you can safely remove the following part:
      const failure = await joinAllChannels(client, channelIds);
      if (failure) {
        const error = `Failed to join channels due to ${failure}.`;
        return { error };
      }

      // Display the completion page
      return {
        response_action: "update",
        view: {
          "type": "modal",
          "callback_id": "completion",
          "title": { "type": "plain_text", "text": "My App" },
          "close": { "type": "plain_text", "text": "Close" },
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text":
                  "*You're all set!*\n\nThe main workflow is now available for the channels :white_check_mark:",
              },
            },
          ],
        },
      };
    },
  );
