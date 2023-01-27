import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  createOrUpdateTrigger,
  findTriggerToUpdate,
} from "./manage_triggers.ts";
import { joinAllChannels } from "./join_channels.ts";

export const def = DefineFunction({
  callback_id: "configure",
  title: "Configure a trigger",
  source_file: "configure.ts",
  input_parameters: {
    properties: {
      workflowCallbackId: { type: Schema.types.string },
      channelIds: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.channel_id },
      },
    },
    required: ["workflowCallbackId", "channelIds"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(def, async ({ inputs, client }) => {
  try {
    await createOrUpdateTrigger(
      client,
      inputs.workflowCallbackId,
      inputs.channelIds,
      (await findTriggerToUpdate(client, inputs.workflowCallbackId))?.id,
    );
  } catch (e) {
    const error = `Failed to create/update a trigger due to ${e}.`;
    return { error };
  }

  // If you don't need to invite your app's bot user to the channels,
  // you can safely remove the following part:
  const failure = await joinAllChannels(client, inputs.channelIds);
  if (failure) {
    const error = `Failed to join channels due to ${failure}.`;
    return { error };
  }

  return { outputs: {} };
});
