In this tutorial, you'll learn how to use [event triggers, which do not require channel IDs](https://api.slack.com/future/triggers/event) in your [Slack's next-generation platform](https://api.slack.com/future) apps.

An event trigger can be invoked when a specific event occurs in the connected Slack workspace. Since each type of event trigger has its data schema for inputs, your workflow can receive necessary information from a trigger.

Also, there are two types of event triggers.

The first one is the one that can capture events across a workspace. The example events are `"channel_created"` (A channel was created), `"dnd_updated"` (Do not Disturb settings changed for a member), `"emoji_changed"` (A custom emoji has been added or changed), `"user_joined_team"` (A new member has joined), and so on.

Another is the one that can be invoked when events occur in any of the specified channels. The example events are `"message_posted"` (A message was sent to a channel), `"reaction_added"` (A member has added an emoji reaction to an item), `"user_joined_channel"` (A user joined a public or private channel), `"user_left_channel"` (A user left a public or private channel), and so on.

In this tutorial, you'll learn the first type of event, `"channel_created"`.

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
      // All the possible inputs from the "channel_created" event trigger
      channel_id: { type: Schema.slack.types.channel_id },
      channel_name: { type: Schema.types.string },
      channel_type: { type: Schema.types.string },
      creator_id: { type: Schema.slack.types.user_id },
      created: { type: Schema.types.string },
    },
    required: ["creator_id"],
  },
});

workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: workflow.inputs.channel_id,
  message:
    `Hi <@${workflow.inputs.creator_id}>, thanks for creating this channel!`,
});

// ----------------
// Trigger Definition
// ----------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "event", // Event Trigger
  name: "Trigger the example workflow",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  // "channel_created" event trigger
  event: { event_type: "slack#/events/channel_created" },
  inputs: {
    channel_id: { value: "{{data.channel_id}}" },
    channel_name: { value: "{{data.channel_name}}" },
    channel_type: { value: "{{data.channel_type}}" },
    creator_id: { value: "{{data.creator_id}}" },
    created: { value: "{{data.created}}" },
  },
};
export default trigger;
```

Note that the trigger's `event.event_type` must be `"slack#/events/channel_created"`. There are five possible input values from the trigger. To learn the latest list of the inputs, refer to the details of the `data` property on [the official documentation page](https://api.slack.com/future/triggers/event#response-object).

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
    "chat:write.public",
    "channels:read", // required for the "channel_created" event trigger
  ],
});
```

Note that not only adding the workflow but also adding the `"channels:read"` scope to `botScopes` is necessary for this event trigger. When you use a different even trigger in your app, check the required scopes for the trigger [here](https://api.slack.com/future/triggers/event#supported-events).

## Create an Event Trigger

Next, you'll use two terminal windows. One for `slack run` command and another for `slack triggers create` command.

To register the workflow, run `slack run` command on the first terminal window. And then, run `slack triggers create --trigger-def workflow_and_trigger.ts` on another one. You will see the following outputs:

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E*****
   distracted-bison-253 (dev) A04FNE*****

⚡ Trigger created
   Trigger ID:   Ft04EJ8*****
   Trigger Type: event
   Trigger Name: Trigger the example workflow
```

## Create a New Public Channel

Now the workflow is ready! To confirm the behavior, let's create a new **public** channel (as of this writing, the next-generation platform is still in beta, so it supports only public channel use cases so far; eventually, private channels will be supported too).

You will see the following outputs in the terminal window:

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

2022-12-15 14:10:28 [info] [Fn04FCVD67J8] (Trace=Tr04F4HN8XQW) Function execution started for workflow function 'Example Workflow'
2022-12-15 14:10:29 [info] [Wf04FP576X3K] (Trace=Tr04G0SD63EC) Execution started for workflow 'Example Workflow'
2022-12-15 14:10:29 [info] [Wf04FP576X3K] (Trace=Tr04G0SD63EC) Executing workflow step 1 of 1
2022-12-15 14:10:30 [info] [Fn0102] (Trace=Tr04G0SD63EC) Function execution started for builtin function 'Send a message'
2022-12-15 14:10:31 [info] [Fn0102] (Trace=Tr04G0SD63EC) Function execution completed for function 'Send a message'
2022-12-15 14:10:31 [info] [Wf04FP576X3K] (Trace=Tr04G0SD63EC) Execution completed for workflow step 'Send a message'
2022-12-15 14:10:32 [info] [Fn04FCVD67J8] (Trace=Tr04F4HN8XQW) Function execution completed for function 'Example Workflow'
2022-12-15 14:10:32 [info] [Wf04FP576X3K] (Trace=Tr04G0SD63EC) Execution completed for workflow 'Example Workflow'
```

Also, you will see the following message in the channel that you just created:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/f0f53255-33a1-1b0a-68e9-dc9331ef56c1.png" width=500 />

This workflow itself may not be so useful, but you can build more meaningful ones such as sharing the tips and rules for channel owners in your worspace.

## A Few Things To Know

If you're familiar with the existing [Events API](https://api.slack.com/apis/connections/events-api), you may be confused with some differences between this next-generation platform's event triggers and Events API.

Events API consistently requires your app's membership in a channel. So, when your app receives an event, it means that your app always has access to the channel content.

Contrarily, with the next-gen platform's event triggers, your app's workflow can be invoked even when your app's bot user is not invited to the channel where the event happened.

The above workflow works without inviting the app's bot user, thanks to [`chat:write.public` scope](https://api.slack.com/scopes/chat:write.public) that enables an app to post a message without joining a public channel. However, if your app needs to fetch the channel's messages, the app must be a member of the channel, plus it must have [`channels:history` scope](https://api.slack.com/scopes/channels:history) for public channels.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Define and enable a workspace-level event trigger

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/08_channel_created_Event_Trigger

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: