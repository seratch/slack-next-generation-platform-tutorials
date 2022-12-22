In this tutorial, you'll learn how to get started with [Slack's next-generation platform](https://api.slack.com/future) in 5 minutes. 

You may already know that, when creating a new app using `slack create` command, you can go with the official "Hello World" project template. The project template code is available at https://github.com/slack-samples/deno-hello-world 

The template is excellent for learning the platform! However, the project covers many things (app manifest, triggers, workflows, the built-in form function, your custom function, the built-in message function, the standard directory structure, and so on) at a time.

In this tutorial, you'll learn only the minimum building blocks, meaning app manifest, triggers, workflows, and the built-in message function. Understanding everything one by one may look like a detour, but it's a shortcut.

## Prerequisites

If you're new to Slack's next-generation platform, head to [the official quick start guide](https://api.slack.com/future/quickstart) first. As the quick start guide mentions, you must set up the Slack CLI and connect the tool with your paid Slack workspace.

https://api.slack.com/future/quickstart

Also, as of this writing (December 2022), the new platform feature is still in open beta. Therefore, your workspace admins need to turn the beta feature on in [admins' workspace settings page](https://my.slack.com/admin/settings#permissions).

OK, now you're ready to build your first app. Let's get started!

## Create a blank project

When you start a new project, you can run `slack create` command:

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

Although you'll see "Hello World" template in the list, select "Blank project" this time.

Once the project is generated, let's check if `slack run` command works without any issues. This command installs a "dev" version of your new app into your connected Slack workspace. Now your app's bot user is in the workspace, and your app has its bot token for API calls.

```bash
$ cd dreamy-gazelle-453
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

If you see `Connected, awaiting events` log message, the app is successfully connected to Slack! You can hit "Ctrl + C" to terminate the local app process if you want to stop the app.

This app is still empty. So, let's add some files to the project. As you may already notice, Slack's next-generation platform apps run on [Deno runtime](https://deno.land/), a novel JavaScript runtime. Thus, for coding and editing files in your project, using [VS Code](https://code.visualstudio.com/) along with [the official Deno plugin](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) is the best recommended. 

## Hello World with Webhook Trigger

Your app on the next-generation platform can have multiple workflows. Also, each workflow can have its triggers. A trigger is a way to start its associated workflow. It is one of the key differences from the existing Slack platform features.

To learn how a trigger works, let's try an Incoming Webhooks Trigger as the first one. We're going to go through the following steps:

* Create `workflow_and_trigger.ts`, which includes a workflow and its trigger
* Grab a channel ID in your Slack workspace and embed it in the code
* Add the workflow to `manifest.ts`
* Re-install the app with the latest settings by running `slack run`
* Create a trigger by running `slack triggers create --trigger-def ./workflow_and_trigger.ts`
* Send a POST request to the webhook URL to start the workflow

### Create `workflow_and_trigger.ts`, which includes a workflow and its trigger

Create a new file named `workflow_and_trigger.ts` and then save the following code.

```typescript
// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

// Don't forget to add this workflow to manifest.ts!
export const workflow = DefineWorkflow({
  callback_id: "hello-world-workflow",
  title: "Hello World Workflow",
  input_parameters: { properties: {}, required: [] },
});

// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: "C03E94MKS", // TODO: Grab the ID in Slack UI
  message: "Hello World!",
});

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";
// This trigger starts the workflow when the webhook URL receives an HTTP request
const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook", // Incoming Webhooks
  name: "Hello World Trigger",
  // Need to embed the workflow's callback_id here
  workflow: `#/workflows/${workflow.definition.callback_id}`,
};

// As long as the trigger object is default exported,
// you can generate a trigger with this code:
// $ slack triggers create --trigger-def ./workflow_and_trigger.ts
export default trigger;
```

This source file does two things:

* Define a new workflow for this app
* Define a new Webhook trigger, which can start the workflow

There are still a few steps to reflect these changes for your app. So move on to the next.

#### Grab a channel ID in your Slack workspace and embed it in the code

You may notice a TODO comment in `workflow_and_trigger.ts`:

>`channel_id: "C03E94MKS", // TODO: Grab the ID in Slack UI`

To resolve this, pick up a **public** channel to use for testing (Note that, as of this writing, the beta platform supports only public channels; Private channels will be supported when the feature is GAed). 

The easiest way to know a channel ID is to click a channel name in the Slack client UI, scroll down to the bottom in the popup modal, and then copy the string starting with a "C" letter.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/bf6df9a2-8ca7-6c43-578c-65debcfdbea9.png" width=200 />

Alternatively, you can click "Copy link" in the message menu of any messages in a channel and then extract the "C" prefix part from the URL `https://my.slack.com/archives/..`.

Either way, edit your `workflow_and_trigger.ts` with the channel ID string.

### Add the workflow to `manifest.ts`

Next, add the workflow to `manifest.ts` as below. Then, import the `workflow` constant in `manifest.ts` and add the reference to the object in the `workflows` array.

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
// Import the workflow you've just created
import { workflow as HelloWorld } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "dreamy-gazelle-453",
  description: "Hello World!",
  icon: "assets/default_new_app_icon.png",
  // Add the imported workflow here
  workflows: [HelloWorld],
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

### Re-install the app with the latest settings by running `slack run`

All the necessary file changes are done! If you've stopped the `slack run` command execution in a terminal, run the same command again. If you don't see any errors in the outputs, everything should be great.

It's OK to stop `slack run` command, but for the following steps, you will use a terminal window to run a different command. So opening a new one for the following steps and keeping this `slack run` window would be smooth.

### Create a trigger by running `slack triggers create --trigger-def ./workflow_and_trigger.ts`

Now that the workflow is available on the Slack cloud hosting infra side, you can generate its webhook trigger. This situation may need to be clarified; Just adding a workflow to your app's manifest does not automatically create the workflow's triggers. Thus, you need to generate a trigger on your own.

You can run `slack triggers create` command to generate a trigger with prepared source code. 

You'll see two options on the screen. Select the latter one with `(dev)` suffix this time.

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  [Use arrows to move, type to filter]
   seratch  T03E94MJU
   App is not installed to this workspace

>  seratch (dev)  T03E94MJU
   dreamy-gazelle-453 (dev) A04DHV08MPF
```

If you encounter a "workflow not found" error, it means either that you might forget adding the workflow to `manifest.ts` or that you haven't re-installed the app with the latest manifest data.

When it succeeds, you'll see the following output. The generated webhook URL can start your workflow. There is no authentication for the HTTP requests. Please don't share the URL publicly to avoid abuse by strangers.

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   dreamy-gazelle-453 (dev) A04DHV08MPF

⚡ Trigger created
   Trigger ID:   Ft04DLR5XXXX
   Trigger Type: webhook
   Trigger Name: Hello World Trigger
   Webhook URL:  https://hooks.slack.com/triggers/T11111/22222/xxxxx
```

### Send a POST request to the webhook URL to start the workflow

It's time to run your first-ever workflow! You can send an HTTP POST request towards the webhook URL:

```bash
curl -XPOST https://hooks.slack.com/triggers/T11111/22222/xxxxx
```

It is successful if you receive `{"ok":true}` in the output! Next, head to the connected Slack workspace and visit the channel you chose for testing.

You should see a "Hello World!" message in the channel. Congratulations! :tada::tada::tada:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/211e350d-b9e1-3551-026d-63dddeca25ad.png" width=300 />

All the things you've done here are:

* Create a blank project
* Add `workflow_and_trigger.ts` to define a simple workflow and its webhook trigger
* Add the workflow to `manifest.ts`
* Re-install the dev app using `slack run` command
* Create a trigger by `slack triggers create` command
* Send an HTTP request to run the trigger

You needed to go through a few steps, but I hope you felt this is much simpler and easier than you expected.

By the way, if you stopped the `slack run` command before testing the trigger, you might be surprised to see that the whole workflow still works. Indeed, this is a surprising but interesting behavior of the new platform infra, unlike the existing Slack apps. This is because the workflow engine, which handles triggers and workflows, runs on the Slack cloud infra side, not as part of your local app process. Therefore, as long as your workflow does not have any custom functions (I will guide you on this in a different tutorial), keeping `slack run` is not mandatory to run a dev version of your app.

## Hello World with Link Trigger

You've learned how to generate and use a webhook trigger. Next, let's try a "link" trigger, which enables people to start interactive workflows by clicking a "link" in the Slack client UI.

Edit `workflow_and_trigger.ts` as below:

```typescript
// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

// Don't forget to add this workflow to manifest.ts!
export const workflow = DefineWorkflow({
  callback_id: "hello-world-workflow",
  title: "Hello World Workflow",
  input_parameters: {
    properties: {
      // The channel ID passed from the link trigger
      channel_id: { type: Schema.slack.types.channel_id },
    },
    required: ["channel_id"],
  },
});

// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  // Set the channel ID given by trigger -> workflow
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";
// This trigger starts the workflow when an end-user clicks the link
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Hello World Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // The channel where you click the link trigger
    channel_id: { value: "{{data.channel_id}}" },
  },
};

// As long as the trigger object is default exported,
// you can generate a trigger with this code:
// $ slack triggers create --trigger-def ./workflow_and_trigger.ts
export default trigger;
```

As you can see, many things are changed. Here is the list of the changes:
* The workflow takes `channel_id` input parameter
* `SendMessage` function uses the given `channel_id` input parameter instead of hard-coded channel ID
* The `type` of the new trigger is `shortcut`, which means a link trigger
* The trigger has `channel_id` in its inputs to pass it to the workflow

Check if there is no error with `slack run` command process' outputs.

And then, create a new link trigger by running `slack triggers create --trigger-def ./workflow_and_trigger.ts`:

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   dreamy-gazelle-453 (dev) A04DHV08MPF

⚡ Trigger created
   Trigger ID:   Ft04DEBXXXX
   Trigger Type: shortcut
   Trigger Name: Hello World Trigger
   URL: https://slack.com/shortcuts/Ft04DEBXXXXX/YYYY
```

The `https://slack.com/shortcuts/Ft04DEBXXXXX/YYYY` is a link URL, which can be valid only inside the connected Slack workspace. You can share the URL either as a message with the URL or as one of the channel bookmark items. Once the link is shared, you'll see the button either in the unfurled message or as a select menu item in the channel's bookmark area. 

Let's click the link! You'll see a "Hello World!" message in the channel shortly.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/e736f119-4eac-4a5b-a3be-aaf5ec89615e.png" width=500 />

### Wrapping Up

You've learned the following points with this hands-on tutorial:

* Create a workflow from scratch
* Enable the workflow in `manifest.ts`
* Create a webhook trigger to start a workflow
* Create a link trigger to start a workflow

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/01_The_Simplest_Hello_World

To make things as simple as possible, I've used a single source file named `workflow_and_trigger.ts` to define a workflow and a trigger. It works! But it's generally recommended to organize your files in the following structure:

```bash
$ tree
.
├── manifest.ts
├── triggers
│   ├── link.ts
│   └── webhook.ts
└── workflows
    └── hello_world.ts
```

To learn the standard project structure, you can generate projects using other templates such as "Hello World" and "Scaffold project". 

Also, you can use templates available under [`github.com/slack-samples` organization](https://github.com/orgs/slack-samples/repositories?q=deno-&type=public&language=&sort=) too! For instance, you can use https://github.com/slack-samples/deno-request-time-off as a template this way:

```bash
slack create my-time-off-app -t slack-samples/deno-request-time-off
```

I hope you enjoy this tutorial! I'll publish a few more tutorials on the next-generation platform. If you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: