import { SlackAPIClient } from "deno-slack-api/types.ts";

// These need to be consistent with `main_workflow.ts`
const triggerEventType = "slack#/events/reaction_added";
const triggerName = "reaction_added event trigger";
const triggerInputs = {
  userId: { value: "{{data.user_id}}" },
  channelId: { value: "{{data.channel_id}}" },
  messageTs: { value: "{{data.message_ts}}" },
  reaction: { value: "{{data.reaction}}" },
};

/**
 * Check if the target trigger already exists and then return the metadata if it exists.
 * @param client Slack API client
 * @param workflowCallbackId the target workflow's callback_id
 * @returns the existing trigger's metadata (can be undefined)
 */
export async function findTriggerToUpdate(
  client: SlackAPIClient,
  workflowCallbackId: string,
): Promise<Record<string, string> | undefined> {
  // Fetch all the triggers that this app can access
  const listResponse = await client.workflows.triggers.list({ is_owner: true });
  // Find the target trigger in the list
  // If the list contains duplicated items, this function may not work properly
  if (listResponse && listResponse.triggers) {
    for (const trigger of listResponse.triggers) {
      if (
        trigger.workflow.callback_id === workflowCallbackId &&
        trigger.event_type === triggerEventType
      ) {
        return trigger;
      }
    }
  }
  // The target trigger does not exist yet
  return undefined;
}

/**
 * Create or update the target trigger. The operation by this method is not atomic, meaning that duplicated triggers can be generated when the creation is requested simultaneously. Also, when updating the trigger, there is no validation of conflicts.
 * @param client Slack API client
 * @param workflowCallbackId the target workflow's callback_id
 * @param channelIds the list of channel IDs to enable the trigger
 * @param triggerId the existing trigger ID (only for updates)
 */
export async function createOrUpdateTrigger(
  client: SlackAPIClient,
  workflowCallbackId: string,
  channelIds: string[],
  triggerId?: string,
): Promise<void> {
  // Since the Deno SDK type constraints require hard-coding the list of string items, there is no way to pass the method argument for it directly. Thus, we have to bypass the type check here.
  // deno-lint-ignore no-explicit-any
  const channel_ids = channelIds as any;

  if (triggerId) {
    // Update the existing trigger
    const update = await client.workflows.triggers.update({
      trigger_id: triggerId,
      type: "event",
      name: triggerName,
      workflow: `#/workflows/${workflowCallbackId}`,
      event: { event_type: triggerEventType, channel_ids },
      inputs: triggerInputs,
    });
    if (update.error) {
      const error = `Failed to update a trigger! - ${JSON.stringify(update)}`;
      throw new Error(error);
    }
    console.log(`The trigger updated: ${JSON.stringify(update)}`);
  } else {
    // Create a new trigger
    const creation = await client.workflows.triggers.create({
      type: "event",
      name: triggerName,
      workflow: `#/workflows/${workflowCallbackId}`,
      event: { event_type: triggerEventType, channel_ids },
      inputs: triggerInputs,
    });
    if (creation.error) {
      const error = `Failed to create a trigger! - ${JSON.stringify(creation)}`;
      throw new Error(error);
    }
    console.log(`A new trigger created: ${JSON.stringify(creation)}`);
  }
}
