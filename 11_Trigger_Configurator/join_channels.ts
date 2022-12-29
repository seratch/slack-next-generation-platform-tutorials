import { SlackAPIClient } from "deno-slack-api/types.ts";

/**
 * Join all the channels.
 * Even when the app's bot user has joined, the API does not return an error.
 * @param client
 * @param channelIds
 * @returns
 */
export async function joinAllChannels(
  client: SlackAPIClient,
  channelIds: string[],
): Promise<string | undefined> {
  const futures = channelIds.map((c) => _joinChannel(client, c));
  const results = (await Promise.all(futures)).filter((r) => r !== undefined);
  if (results.length > 0) {
    throw new Error(results[0]);
  }
  return undefined;
}

async function _joinChannel(
  client: SlackAPIClient,
  channelId: string,
): Promise<string | undefined> {
  const response = await client.conversations.join({ channel: channelId });
  if (response.error) {
    const error = `Failed to join <#${channelId}> due to ${response.error}`;
    console.log(error);
    return error;
  }
}
