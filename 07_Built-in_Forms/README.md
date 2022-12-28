In this tutorial, you'll learn how to use [the built-in forms](https://api.slack.com/future/forms) in your [Slack's next-generation platform](https://api.slack.com/future) apps.

The next-gen platform offers a simple form feature, which is available as a built-in `Schema.slack.functions.OpenForm` function.

After reading this tutorial, you will become a master of the built-in forms :rocket:

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
$ cd frosty-mink-263
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

Let's start with defining a simple demo workflow and its link trigger. To use the built-in forms in a simple way, **you must use a link trigger**. The `OpenForm` function needs the `interactivity (Schema.slack.types.interactivity)` input parameter to continue direct interactions with the end-user. As of this writing, only link triggers supply this input value to a workflow and its functions.

Alternatively, you can use buttons/select menus in a channel message to generate `interactivity` in the middle of a workflow. In this case, you can use `OpenForm` as the succeeding function. I won't cover this topic here, but I will publish a different tutorial on the topic soon!

Let's define an empty workflow and its link trigger as below. As always, save the source code as `workflow_and_trigger.ts`:

```typescript
// ----------------
// Workflow Definition
// ----------------

import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "form-demo-workflow",
  title: "OpenForm Demo Workflow",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      user_id: { type: Schema.slack.types.user_id },
      channel_id: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity", "user_id", "channel_id"],
  },
});

// TODO: Add a step using the built-in form here

// TODO: Confirm the outputs from the above OpenForm function

// ----------------
// Trigger Definition
// ----------------

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Form Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // interactivity is necessary for using OpenForm function
    interactivity: { value: "{{data.interactivity}}" },
    // The following inputs are not necessary for OpenForm
    // You'll use this just for the succeeding functions,
    // which confirm the outputs of OpenForm
    user_id: { value: "{{data.user_id}}" },
    channel_id: { value: "{{data.channel_id}}" },
  },
};
export default trigger;
```

And then, add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "frosty-mink-263",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow], // Add this
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

## Create a Link Trigger

Next, you'll use two terminal windows. One for `slack run` command and another for `slack triggers create` command.

To register the workflow, run `slack run` command on the first terminal window. And then, run `slack triggers create --trigger-def workflow_and_trigger.ts` on another one. You will see the following outputs:

```bash
$ slack triggers create --trigger-def workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   frosty-mink-263 (dev) A04G9S43G2K

⚡ Trigger created
   Trigger ID:   Ft04HGLH426L
   Trigger Type: shortcut
   Trigger Name: Form Demo Trigger
   URL: https://slack.com/shortcuts/***/***
```

As we learned in [the first tutorial](https://dev.to/seratch/slack-next-gen-platform-the-simplest-hello-world-4ic0#hello-world-with-link-trigger), share the link trigger URL in a public channel in the connected Slack workspace. OK, the trigger is ready to use. Let's go back to coding.

## Add OpenForm Function to the Workflow

Add the following two function steps to the workflow you just defined:

```typescript
// Step using the built-in form
const formStep = workflow.addStep(Schema.slack.functions.OpenForm, {
  title: "Send a greeting",
  interactivity: workflow.inputs.interactivity,
  submit_label: "Send greeting",
  fields: {
    // fields.elements will be converted to Block Kit components under the hood
    elements: [
      {
        name: "recipient",
        title: "Recipient",
        type: Schema.slack.types.user_id, // => "users_select"
        default: workflow.inputs.user_id,
      },
      {
        name: "channel",
        title: "Channel to send message to",
        type: Schema.slack.types.channel_id, // => "channels_select"
        default: workflow.inputs.channel_id,
      },
      {
        name: "message",
        title: "Message to recipient",
        type: Schema.types.string, // => "plain_text_input"
        long: true, // => multiline: true
      },
    ],
    required: ["recipient", "channel", "message"],
  },
});

// Confirm the outputs from the above OpenForm function
workflow.addStep(Schema.slack.functions.SendEphemeralMessage, {
  // The name of the element will be the key to access the value
  user_id: formStep.outputs.fields.recipient,
  channel_id: formStep.outputs.fields.channel,
  message: "OpenForm's `outputs.fields`: ```" + formStep.outputs.fields + "```",
});
```

You may not be familiar with [Block Kit](https://api.slack.com/block-kit), Slack's UI framework. With Block Kit, you can build a rich user interface just by defining the UI in pre-defined JSON data format. The same Block Kit UI works nicely for desktop apps, web browsers, and mobile apps (iOS, iPadOS, Android).

The `OpenForm` function offers a much simpler version of the UI definition. When you define the modal UI, the `OpenForm` function generates equivalent Block Kit components under the hood.

If you're interested in using Block Kit directly, I will publish a different tutorial on it. Stay tuned!

## Run The Workflow

Let's run the workflow. When you run the workflow, the app opens a popup modal dialog to receive your inputs and then posts an ephemeral message (a message visible only to you) with the outputs of `OpenForm`:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/6502af67-66fd-8a79-9002-877778cf97c3.gif" widht=500 />

## More Form Options

As you can see in [the document](https://api.slack.com/future/forms#element-schema), the basic properties of each element in the form are `name`, `title`, `type`, `description`, and `default`. Usually, the minimum set of properties would be `name`, `title`, and `type`. Let me share as many examples as possible below:

### Required Inputs

In the above example, the `required` list is `["recipient", "channel", "message"]`. This means that these three inputs must be provided when submitting the form. You can add any of the `name`s of `fields.elements` to the list.

### Text Input Element

The simple text input form element looks like the below. The type must be `Schema.types.string`. With this type, `OpenForm` generates a [`plain_text_input` block element](https://api.slack.com/reference/block-kit/block-elements#input) for you.

```typescript
{
  name: "message", // unique key for this element
  title: "Message to recipient", // Label on the UI
  type: Schema.types.string, // => "plain_text_input"
},
```

To allow multi-line inputs, you can add `long: true` property. Also, to set input validations on the input lengths, you can use `minLength` and `maxLength`.

```typescript
{
  name: "message",
  title: "Message to recipient",
  type: Schema.types.string,
  long: true, // => multiline: true
  minLength: 5, // inclusive
  maxLength: 20, // inclusive
},
```

Another option to validate the text input is `format`. To verify the format, you can set either `email` or `url`.

```typescript
{
  name: "contact",
  title: "Your Email Address",
  type: Schema.types.string,
  format: "email",
},
```

### Static Select Menu

With `Schema.types.string` type, you can use a select menu with static option items.

```typescript
{
  name: "favorite",
  title: "Favorite",
  type: Schema.types.string,
  choices: [
    { value: "dog", title: "Dog" },
    { value: "cat", title: "Cat" },
  ],
  enum: ["dog", "cat"],
  default: "cat",
},
```

The above example can look like the following:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/3ade84ac-93b2-3146-7b8c-67974d69e79f.png" width=500 />

Since the `enum` property is not used for the UI representation, you may wonder if it can be omitted. But it's still required. If you remove it, the element falls back to the simple text input element, and the `choices` won't be used at all.

### Channel/User Select Menu

When you set `user_id` to the `type` of an element, the element will be a [`users_select` select menu element](https://api.slack.com/reference/block-kit/block-elements#users_select).

```typescript
{
  name: "recipient",
  title: "Recipient",
  type: Schema.slack.types.user_id, // => "users_select"
},
```

Similarly, when setting `channel_id`, the element will be a [`channels_select` select menu element](https://api.slack.com/reference/block-kit/block-elements#channels_select).

```typescript
{
  name: "channel",
  title: "Channel to send message to",
  type: Schema.slack.types.channel_id, // => "channels_select"
},
```

### Multi-select Menu

Block Kit supports [multi-select menu elements](https://api.slack.com/reference/block-kit/block-elements#multi_select). To add such elements, you can use `Schema.types.array` for `type` along with the supported type (e.g., `Schema.slack.types.user_id`) for `items.type`.

The following example will be a [`multi_users_select` select menu element](https://api.slack.com/reference/block-kit/block-elements#users_multi_select).

```typescript
{
  name: "people",
  title: "People",
  type: Schema.types.array, // => multi-select
  // The type of the array item
  items: { type: Schema.slack.types.user_id }, // => "multi_users_select"
  default: ["U12345", "U23456"],
},
```

## Full Example Form

There are so many options! So, instead of writing a lengthy tutorial, I've built a form with all the possible elements:

```typescript
{
  name: "recipient",
  title: "Recipient",
  type: Schema.slack.types.user_id, // => "users_select"
  default: workflow.inputs.user_id,
},
{
  name: "channel",
  title: "Channel to send message to",
  type: Schema.slack.types.channel_id, // => "channels_select"
  default: workflow.inputs.channel_id,
},
{
  name: "message",
  title: "Message to recipient",
  type: Schema.types.string, // => "plain_text_input"
  long: true, // => multiline: true
  minLength: 1, // inclusive
  maxLength: 100, // inclusive
},
{
  name: "favorite_animal",
  title: "Favorite Animal",
  type: Schema.types.string, // => "static_select"
  choices: [
    { value: "dog", title: "Dog" },
    { value: "cat", title: "Cat" },
  ],
  enum: ["dog", "cat"],
  default: "cat",
},
{
  name: "favorite_animals",
  title: "Favorite Animals",
  type: Schema.types.array, // => "mutli_static_select"
  items: {
    type: Schema.types.string,
    choices: [
      { value: "dog", title: "Dog" },
      { value: "cat", title: "Cat" },
    ],
    enum: ["dog", "cat"],
  },
  maxItems: 2,
  default: ["cat"],
},
{
  name: "contact",
  title: "Your Email Address",
  type: Schema.types.string,
  format: "email", // => "email_text_input"
},
{
  name: "channels",
  title: "Favorite Channels",
  type: Schema.types.array, // => "multi_channels_select"
  items: { type: Schema.slack.types.channel_id },
},
{
  name: "team_members",
  title: "Team Members",
  type: Schema.types.array, // => "multi_users_select"
  items: { type: Schema.slack.types.user_id },
},
{
  name: "approved",
  title: "Already Approved by My Manager",
  type: Schema.types.boolean, // => "checkboxes"
},
{
  name: "count",
  title: "Count",
  type: Schema.types.integer, // => "number_input" with is_decimal_allowed: false
},
{
  name: "amount",
  title: "Amount",
  type: Schema.types.number, // => "number_input"
},
{
  name: "due_date",
  title: "Due Date",
  type: Schema.slack.types.date, // => "datepicker"
},
{
  name: "due_time",
  title: "Due Date Time",
  type: Schema.slack.types.timestamp, // => "datepicker" + "timepicker"
},
{
  name: "rich_text",
  title: "Rich Text Input",
  type: Schema.slack.types.rich_text,
},
```

The very long form looks like the below:
<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/dfc4a3f2-3d56-c2da-ce14-cc01d52ea834.png" width=400>
<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/130c5254-690d-d197-2711-7e2342c6ebe7.png" width=400>
<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/65c95ef0-0fa1-3563-a5c4-e0288ec87562.png" width=400>
<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/35d277ef-f0a9-235c-ac94-2d842c24ed71.png" width=400>

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Define a built-in form with various elements

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/07_Built-in_Forms

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: