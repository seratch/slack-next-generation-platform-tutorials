In this tutorial, you'll learn how to use [event triggers, which do not require channel IDs](https://api.slack.com/future/triggers/event) in your [Slack's next-generation platform](https://api.slack.com/future) apps.

An event trigger can be invoked when a specific event occurs in the connected Slack workspace. Since each type of event trigger has its data schema for inputs, your workflow can receive necessary information from a trigger.

Also, there are two types of event triggers.

The first one is the one that can capture events across a workspace. The example events are `"channel_created"` (A channel was created), `"dnd_updated"` (Do not Disturb settings changed for a member), `"emoji_changed"` (A custom emoji has been added or changed), `"user_joined_team"` (A new member has joined), and so on.

Another is the one that can be invoked when events occur in any of the specified channels. The example events are `"message_posted"` (A message was sent to a channel), `"reaction_added"` (A member has added an emoji reaction to an item), `"user_joined_channel"` (A user joined a public or private channel), `"user_left_channel"` (A user left a public or private channel), and so on.

In this tutorial, you'll learn the latter type of event, `"reaction_added"`.

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
$ cd distracted-bison-253
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

## Define Workflow and Trigger

Let's start with defining a simple demo workflow and its link trigger. As always, save the source code as `workflow_and_trigger.ts`:

```typescript
// ----------------
// Workflow Definition
// ----------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "example-workflow",
  title: "Example Workflow",
  input_parameters: {
    properties: {
      // All the possible inputs from the "reaction_added" event trigger
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "message_ts", "reaction"],
  },
});

// TODO: Add function steps here

// ----------------
// Trigger Definition
// ----------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "event", // Event Trigger
  name: "Trigger the example workflow",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  event: {
    // "reaction_added" event trigger
    event_type: "slack#/events/reaction_added",
    channel_ids: ["C04FB5UF1C2"], // TODO: Update this list
    // The condition to filter events
    filter: {
      version: 1,
      // Start the workflow only when the reaction is :eyes:
      root: { statement: "{{data.reaction}} == eyes" },
    },
  },
  inputs: {
    channel_id: { value: "{{data.channel_id}}" },
    user_id: { value: "{{data.user_id}}" },
    message_ts: { value: "{{data.message_ts}}" },
    reaction: { value: "{{data.reaction}}" },
  },
};
export default trigger;
```

Note that the trigger's `event.event_type` must be `"slack#/events/reaction_added"`. There are five possible input values from the trigger. To learn the latest list of the inputs, refer to the details of the `data` property on [the official documentation page](https://api.slack.com/future/triggers/event#response-object).

Also, the `channel_ids: ["C04DPBYUQUC"], // TODO: Update this list` part needs to be updated. Choose a **public** (note that, as of this writing, only public channels are supported) channel to add this workflow and copy its channel ID in the Slack client UI. When you click the channel name, a popup modal opens. After scrolling down to the bottom, you'll find the channel there:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/9213c801-f18b-c626-3567-cc534ac2fff1.png" width=500 />

And then, add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "distracted-bison-253",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "reactions:read", // required for the "reaction_added" event trigger
    "channels:history", // will use in custom functions later
    "channels:join", // will use in custom functions later
  ],
});
```

Note that not only adding the workflow but also adding the `"reactions:read"` scope to `botScopes` is necessary for this event trigger. When you use a different even trigger in your app, check the required scopes for the trigger [here](https://api.slack.com/future/triggers/event#supported-events).

## Create an Event Trigger

Next, you'll use two terminal windows. One for `slack run` command and another for `slack triggers create` command.

To register the workflow, run `slack run` command on the first terminal window. And then, run `slack triggers create --trigger-def workflow_and_trigger.ts` on another one. You will see the following outputs:

```bash
$ slack triggers create --trigger-def ./example.ts
? Choose an app  seratch (dev)  T03E*****
   distracted-bison-253 (dev) A04FNE*****

⚡ Trigger created
   Trigger ID:   Ft04EJ8*****
   Trigger Type: event
   Trigger Name: Trigger the example workflow
```

## Add :eyes: to A Message in the Channel

Let's see how the workflow works. When you add `:eyes:` emoji reaction to any of the messages in the channel, you will see the following outputs in the `slack run` terminal windows:

```bash
$ slack run
? Choose a workspace  seratch  T03E94MJU
   distracted-bison-253 A04FACHPQ5R

Updating dev app install for workspace "Acme Corp"

⚠️  Outgoing domains
   No allowed outgoing domains are configured
   If your function makes network requests, you will need to allow the outgoing domains
   Learn more about upcoming changes to outgoing domains: https://api.slack.com/future/changelog
✨  seratch of Acme Corp
Connected, awaiting events

2022-12-15 10:03:50 [info] [Fn04FCVD67J8] (Trace=Tr04G077TW80) Function execution started for workflow function 'Example Workflow'
2022-12-15 10:03:50 [info] [Wf04FP576X3K] (Trace=Tr04FP5F70HX) Execution started for workflow 'Example Workflow'
2022-12-15 10:03:51 [info] [Fn04FCVD67J8] (Trace=Tr04G077TW80) Function execution completed for function 'Example Workflow'
2022-12-15 10:03:51 [info] [Wf04FP576X3K] (Trace=Tr04FP5F70HX) Execution completed for workflow 'Example Workflow'
```

Try a different emoji reaction such as `:wave:`. In this case, the workflow won't be invoked.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/d8c21984-6163-d15c-e868-b09a1337af3b.png" width=500 />

## Access The Channel Content

If you're familiar with the existing [Events API](https://api.slack.com/apis/connections/events-api), you may be confused with some differences between this next-generation platform's event triggers and Events API.

Events API consistently requires your app's membership in a channel. So, when your app receives an event, it means that your app always has access to the channel content.

Contrarily, with the next-gen platform's event triggers, your app's workflow can be invoked even when your app's bot user is not invited to the channel where the event happened.

Let's add a simple function, which demonstrates how to enable it to access the channel content, to the workflow.

Add a new file named `function.ts` with the following source code:

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

export const def = DefineFunction({
  callback_id: "reply_to_reaction",
  title: "Reply to a reaction in a channel",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      reaction: { type: Schema.types.string },
      message_ts: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "reaction", "message_ts"],
  },
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    required: ["ts"],
  },
});

export default SlackFunction(def, async ({ inputs, client }) => {
  // https://api.slack.com/methods/conversations.join
  // requires "channels:join" scope in manifest.ts
  const joinResponse = await client.conversations.join({
    channel: inputs.channel_id,
  });
  if (joinResponse.error) {
    const error = `Failed to join the channel due to ${joinResponse.error}`;
    return { error };
  }
  // https://api.slack.com/methods/conversations.history
  // requires "channels:history" scope in manifest.ts
  const historyResponse = await client.conversations.history({
    channel: inputs.channel_id,
    latest: inputs.message_ts,
    inclusive: true,
    limit: 1,
  });
  if (historyResponse.error) {
    const error =
      `Failed to fetch the channel content due to ${joinResponse.error}`;
    return { error };
  }
  const messageText = (historyResponse.messages[0].text ||
    "(Failed to fetch the message text)").replaceAll("\n", "\n>");
  const replyText =
    `Hey <@${inputs.user_id}>, thanks for adding :${inputs.reaction}: to the following message:\n>${messageText}`;
  // https://api.slack.com/methods/chat.postMessage
  // requires "chat:write" scope in manifest.ts
  const replyResponse = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: replyText,
  });
  if (replyResponse.error) {
    const error = `Failed to post a message due to ${replyResponse.error}`;
    return { error };
  }
  return { outputs: { ts: replyResponse.ts } };
});
```

Just to post a message in a public channel, `chat.postMessage` API with `chat:write.public` scope does not require any additional API calls. However, if your app needs to know the message text and some other details, the function calls two Slack APIs (`conversations.join` and `conversations.history`) to fetch the channel content.

And then, add the function step to the workflow in `workflow_and_trigger.ts`:

```typescript
import { def as reply } from "./function.ts";
workflow.addStep(reply, {
  channel_id: workflow.inputs.channel_id,
  user_id: workflow.inputs.user_id,
  reaction: workflow.inputs.reaction,
  message_ts: workflow.inputs.message_ts,
});
```

Try the workflow again. You will see the app's bot user automatically joins the channel and then it posts a message including the whole text data of other message in the channel:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/f6513c25-52aa-6160-4ab3-ef23432941e7.png" width=500 />

## Don't Want to Hard-code the channel_ids?

You may wonder if it's possible to avoid hard-coding the channel ID list in the trigger source code. It's totally understandable as hard-coding such makes the trigger less reusable and hard to manage (you have to re-create the trigger when you add more channels to the list).

Unfortunately, it's not possible to eliminate the channel ID list when you generate a trigger using a source code file. However, there is an alternative way to generate a trigger runtime. You can perform trigger generation/modification API calls in your custom function. Refer to [the official document page](https://api.slack.com/future/triggers/event#create-runtime) for more details. Also, I will publish an article on the topic later in this turorial series.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Define and enable a channel-based event trigger

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/08_channel_created_Event_Trigger

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: