In this tutorial, you'll learn how to build [a workflow to configure another workflow's triggers in your [Slack's next-generation platform](https://api.slack.com/future) apps.

[When you learned how to add an event trigger that requires `channel_ids` in its definition](https://dev.to/seratch/slack-next-gen-platform-reactionadded-event-trigger-54i#dont-want-to-hardcode-the-channelids) (If you haven't read the article, reading it first is highly recommended), I've mentioned that hard-coding the list in code could be a difficulty for many use cases.

This tutorial provides a solution for it. When you have a workflow ("Main" workflow) with an event trigger, in the same app, you can have another workflow ("Configurator" workflow), which configures the trigger for the "Main" workflow. You may wonder if this can be complex, but the implementation is relatively simple. Let's get started!

## Prerequisites

If you're new to the platform, please read my [The Simplest "Hello World" tutorial](https://dev.to/seratch/slack-next-gen-platform-the-simplest-hello-world-4ic0) first. In a nutshell, you'll need a paid Slack workspace, and permission to use the beta feature in the workspace. And then, you can connect your Slack CLI with the workspace.

If all the above are already done, you're ready to build your first app. Let's get started!

## Create a Blank Project

When you start a new project, you can run `slack create` command. In this tutorial, you will build an app from scratch. So select "Blank project" from the list:

```bash
$ slack create
? Select a template to build from:

  Hello World
  A simple workflow that sends a greeting

  Scaffolded project
  A solid foundational project that uses a Slack datastore

> Blank project
  A, well.. blank project

  To see all available samples, visit github.com/slack-samples.
```

Once the project is generated, let's check if `slack run` command works without any issues. This command installs a "dev" version of your new app into your connected Slack workspace. Now your app's bot user is in the workspace, and your app has its bot token for API calls.

```bash
$ cd vibrant-orca-513
$ slack run
? Choose a workspace  seratch  T03E94MJU
   App is not installed to this workspace

Updating dev app install for workspace "Acme Corp"

⚠️  Outgoing domains
   No allowed outgoing domains are configured
   If your function makes network requests, you will need to allow the outgoing domains
   Learn more about upcoming changes to outgoing domains: https://api.slack.com/future/changelog
✨  seratch of Acme Corp
Connected, awaiting events
```

If you see `Connected, awaiting events` log message, the app is successfully connected to Slack. You can hit "Ctrl + C" to terminate the local app process.

In this tutorial, we'll build three workflows:

* The "Main" workflow that needs a "reaction_added" event trigger
* The "Configurator" workflow that configures the "Main" workflow's trigger via a webhook request
* The "Configurator" workflow that configures the "Main" workflow's trigger using user inputs sent from a modal dialog

## Add The "Main" Workflow

First off, create a new file named `main_workflow.ts` with the following content:

```typescript
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "main_event_workflow",
  title: "Main event workflow",
  input_parameters: {
    properties: {
      // The list of input properties needs to be consistent with
      // the trigger operation code in `manage_triggers.ts`
      userId: { type: Schema.slack.types.user_id },
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["userId", "channelId", "reaction"],
  },
});

// Send an ephemeral message when an expected reaction is added
workflow.addStep(Schema.slack.functions.SendEphemeralMessage, {
  user_id: workflow.inputs.userId,
  channel_id: workflow.inputs.channelId,
  message: `Thanks for adding :${workflow.inputs.reaction}:!`,
});

// This source file does not have its trigger definition!
// The "reaction_added" event trigger will be created by
// the "Configurator" workflow's custom function.
```

As mentioned at the bottom of the source code, you don't have any trigger definition in this file, as you'll generate a trigger using another workflow.

Also, before forgetting, let's add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as MainWorkflow } from "./main_workflow.ts";

export default Manifest({
  name: "vibrant-orca-513",
  description: "Configurator Demo",
  icon: "assets/default_new_app_icon.png",
  workflows: [MainWorkflow], // Add this
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    // We're going to use "reaction_added" event trigger
    "reactions:read",
  ],
});
```

## Add The Custom Function To Configure Triggers

The next step is to add your custom function that generates a trigger for a different workflow. Note that the "Configurator" workflow itself will be invoked via a trigger that is created using a source code file.

In this part, you will create three source files - `manage_triggers.ts`, `join_channels.ts`, and `configure.ts`.

Let's start with `manage_triggers.ts`, which provides the core logic for trigger management. Save the following code as `manage_triggers.ts`:

```typescript
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
```

The next one is `join_channels.ts`, which provides a utility method to join a lot of channels easily:

```typescript
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
```

The reason to add your app's bot user is that, without a channel membership, your app cannot call many common APIs such as `conversations.history`, `conversations.replies`, and `reactions.get` APIs. To build something meaningful with channel events, these APIs will be used a lot.

Lastly, let's add `configure.ts`, a custom function for your "Configurator" workflow. This code has references to the above two source files:

```typescript
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
```

## Create The "Configurator" Workflow (Webhook Trigger)

Let's create your "Configurator" workflow that uses `configure.ts` for trigger management.

Create a new file named `webhook_configurator.ts`:

```typescript
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
```

Don't forget to add this workflow to `manifest.ts`. Adding the "Configurator" workflow to the `workflows` list, plus a few scopes need to be added to `botScopes`.

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as MainWorkflow } from "./main_workflow.ts";
// Add this
import { workflow as ConfiguratorWorkflow } from "./webhook_configurator.ts";

export default Manifest({
  name: "vibrant-orca-513",
  description: "Configurator Demo",
  icon: "assets/default_new_app_icon.png",
  workflows: [MainWorkflow, ConfiguratorWorkflow], // Add this
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    // We're going to use "reaction_added" event trigger
    "reactions:read",
    // Required for `configure.ts`
    "triggers:read",
    "triggers:write",
    "channels:join",
  ],
});
```

Run `slack triggers create --trigger-def ./webhook_configurator.ts` to generate a webhook trigger:

```bash
$ slack triggers create --trigger-def ./webhook_configurator.ts
? Choose an app  seratch (dev)  T03E94MJU
   vibrant-orca-513 (dev) A04FRL4323G

⚡ Trigger created
   Trigger ID:   Ft04FY7H1AM9
   Trigger Type: webhook
   Trigger Name: Webhook Configurator Trigger
   Webhook URL:  https://hooks.slack.com/triggers/T03E94***/***/***
```

To invoke the "Configurator" workflow, send an HTTP POST request to the webhook URL with `{"channel_ids": ["C03E94MKS"]}` in its request body. To know the channel ID string values, go through [these steps](https://dev.to/seratch/slack-next-gen-platform-the-simplest-hello-world-4ic0#grab-a-channel-id) in the Slack client UI.

```bash
$ curl -XPOST \
  https://hooks.slack.com/triggers/T03E94***/***/*** \
  -d'{"channel_ids": ["C03E94MKS"]}'
{"ok":true}%
```

Check the `slack run` command terminal. If you don't see any errors, it should be successful!

```bash
$ slack run
? Choose a workspace  seratch  T03E94MJU
   vibrant-orca-513 A04FRL4323G

Updating dev app install for workspace "Acme Corp"

⚠️  Outgoing domains
   No allowed outgoing domains are configured
   If your function makes network requests, you will need to allow the outgoing domains
   Learn more about upcoming changes to outgoing domains: https://api.slack.com/future/changelog
✨  seratch of Acme Corp
Connected, awaiting events

2022-12-20 14:14:29 [info] [Fn04GN1S5CP2] (Trace=Tr04FRNYD1QW) Function execution started for workflow function 'Webhook Configurator'
2022-12-20 14:14:29 [info] [Wf04FY7BP8M9] (Trace=Tr04FHQLH3K9) Execution started for workflow 'Webhook Configurator'
2022-12-20 14:14:30 [info] [Wf04FY7BP8M9] (Trace=Tr04FHQLH3K9) Executing workflow step 1 of 1
2022-12-20 14:14:30 [info] [Fn04FVCA06N9] (Trace=Tr04FHQLH3K9) Function execution started for app function 'Configure a trigger'
A new trigger created: {"ok":true,"trigger":{ ... }}
2022-12-20 14:14:32 [info] [Fn04FVCA06N9] (Trace=Tr04FHQLH3K9) Function execution completed for function 'Configure a trigger'
2022-12-20 14:14:32 [info] [Wf04FY7BP8M9] (Trace=Tr04FHQLH3K9) Execution completed for workflow step 'Configure a trigger'
2022-12-20 14:14:33 [info] [Fn04GN1S5CP2] (Trace=Tr04FRNYD1QW) Function execution completed for function 'Webhook Configurator'
2022-12-20 14:14:33 [info] [Wf04FY7BP8M9] (Trace=Tr04FHQLH3K9) Execution completed for workflow 'Webhook Configurator'
```

Head to the channel you passed in the webhook request, and then add a reaction emoji to a message in the channel. If you receive an ephemeral message like the below, the event trigger for the "Main" workflow is properly configured :tada:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/bb3c42ae-0edc-e265-4dcc-f16faf7a0740.gif" width=600 />

## Create The "Configurator" Workflow (Link Trigger + Modal)

The above "Configurator" workflow worked very well, but it's not end-user-friendly. Also, allowing anyone to configure the trigger just by sending an HTTP POST request without any authentication mechanism is not secure enough.

To improve this, let's create a different version of the "Configurator" workflow, which can be invoked via a link trigger and accepts the channel ID list through a modal data submission.

First, add a new function named `configure_interactive.ts`. This function handles modal interactions plus saves the changes to the target trigger.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  createOrUpdateTrigger,
  findTriggerToUpdate,
} from "./manage_triggers.ts";
import { joinAllChannels } from "./join_channels.ts";

export const def = DefineFunction({
  callback_id: "configure_interactive",
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
```

Add `modal_configurator.ts`, which defines the workflow that calls `configure_interactive.ts` function, and the workflow's link trigger.

```typescript
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
```

Lastly, don't forget to add this workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as MainWorkflow } from "./main_workflow.ts";
// Add this
import { workflow as ConfiguratorWorkflow } from "./webhook_configurator.ts";
import { workflow as ModalConfiguratorWorkflow } from "./modal_configurator.ts";

export default Manifest({
  name: "vibrant-orca-513",
  description: "Configurator Demo",
  icon: "assets/default_new_app_icon.png",
  workflows: [MainWorkflow, ConfiguratorWorkflow, ModalConfiguratorWorkflow], // Add this
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    // We're going to use "reaction_added" event trigger
    "reactions:read",
    // Required for `configure.ts`
    "triggers:read",
    "triggers:write",
    "channels:join",
  ],
});
```

OK, the workflow is ready to use. Generate the link trigger by running `slack triggers create --trigger-def modal_configurator.ts`, and then share the link in a channel. When you start the workflow, you can easily configure the channel list in the modal UI:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/f2b3ff8c-04eb-86db-680c-9ef99e3ffa89.gif" width=600 />

Either way works! But for most use cases, I suggest using this modal configurator. Also, if you're interested in the details of the modal interactions, refer to my ["Advanced Modals" tutorial](https://dev.to/seratch/slack-next-gen-platform-advanced-modals-b0a) for more information.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Create a "Configurator" workflow, which manages another workflow's triggers

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/11_Trigger_Configurator

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: