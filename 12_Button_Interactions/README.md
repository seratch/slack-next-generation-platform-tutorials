In this tutorial, you'll learn how to use interactions starting from a button in your [Slack's next-generation platform](https://api.slack.com/future) apps.

There are two approaches to add button interactions in your next-gen apps:
* Use the built-in `SendMessage` function's `interactive_blocks`, plus add your own function that handles the `block_actions` events
* Write your custom function that posts a message with buttons, plus add handlers for its `block_actions` events

This article covers both approaches.

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
$ cd stoic-wolf-344
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

## Handle button clicks on `SendMessage` Function's `interactive_blocks`

The built-in `Schema.slack.functions.SendMessage` function offers a simplified version of interactive [Block Kit](https://api.slack.com/block-kit) components. You can add simple blocks to your message, and then a suceeding custom function can respond to the click events.

For a demo workflow for `interactive_blocks` handling, you will create two files:
* `interactive_blocks_demo.ts`, which defines a worfklow and its link trigger
* `handle_interactive_blocks.ts`, which defines a custom funtion that handles the button click events in `interactive_blocks`

Save the following source code as `interactive_blocks_demo.ts`:

```typescript
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
```

Since `handle_interactive_blocks.ts` does not exist, the TS compilation should fail at this point. Let's add another file named `handle_interactive_blocks.ts`. This is a custom function that handles click events that can come from the preceding `SendMessage` function:

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

export const def = DefineFunction({
  callback_id: "handle_interactive_blocks",
  title: "Handle button clicks in interactive_blocks",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    // The input values from the SendMessage function's interactive_blocks
    properties: {
      action: { type: Schema.types.object },
      interactivity: { type: Schema.slack.types.interactivity },
      messageLink: { type: Schema.types.string },
      messageTs: { type: Schema.types.string },
    },
    required: ["action", "interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(
  def,
  // When the worfklow is executed, this handler is called
  async ({ inputs, client }) => {
    if (inputs.action.action_id === "deny") {
      // Only when the click is on "Deny", this function opens a modal
      // to ask the reason of the denial
      const response = await client.views.open({
        interactivity_pointer: inputs.interactivity.interactivity_pointer,
        view: buildNewModalView(),
      });
      if (response.error) {
        const error = `Failed to open a modal due to ${response.error}`;
        return { error };
      }
      // Continue the interactions on the modal
      return { completed: false };
    }
    return { completed: true, outputs: {} };
  },
)
  // Handle the button click events on the modal
  .addBlockActionsHandler("clear-inputs", async ({ body, client }) => {
    const response = await client.views.update({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view_id: body.view.id,
      view: buildNewModalView(),
    });
    if (response.error) {
      const error = `Failed to update a modal due to ${response.error}`;
      return { error };
    }
    return { completed: false };
  })
  // Handle the data submission from the modal
  .addViewSubmissionHandler(
    ["deny-reason-submission"],
    ({ view }) => {
      const values = view.state.values;
      const reason = String(Object.values(values)[0]["deny-reason"].value);
      if (reason.length <= 5) {
        console.log(reason);
        const errors: Record<string, string> = {};
        const blockId = Object.keys(values)[0];
        errors[blockId] = "The reason must be 5 characters or longer";
        return { response_action: "errors", errors };
      }
      return {};
    },
  )
  // Handle the events when the end-user closes the modal
  .addViewClosedHandler(
    ["deny-reason-submission", "deny-reason-confirmation"],
    ({ view }) => {
      console.log(JSON.stringify(view, null, 2));
    },
  );

/**
 * Returns the initial state of the modal view
 * @returns the initial modal view
 */
function buildNewModalView() {
  return {
    "type": "modal",
    "callback_id": "deny-reason-submission",
    "title": { "type": "plain_text", "text": "Reason for the denial" },
    "notify_on_close": true,
    "submit": { "type": "plain_text", "text": "Confirm" },
    "blocks": [
      {
        "type": "input",
        // If you reuse block_id when refreshing an existing modal view,
        // the old block may remain. To avoid this, always set a random value.
        "block_id": crypto.randomUUID(),
        "label": { "type": "plain_text", "text": "Reason" },
        "element": {
          "type": "plain_text_input",
          "action_id": "deny-reason",
          "multiline": true,
          "placeholder": {
            "type": "plain_text",
            "text": "Share the reason why you denied the request in detail",
          },
        },
      },
      {
        "type": "actions",
        "block_id": "clear",
        "elements": [
          {
            type: "button",
            action_id: "clear-inputs",
            text: { type: "plain_text", text: "Clear all the inputs" },
            style: "danger",
          },
        ],
      },
    ],
  };
}
```

As always, don't forget to add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as InteractiveBlocksDemo } from "./interactive_blocks_demo.ts";

export default Manifest({
  name: "stoic-wolf-344",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [InteractiveBlocksDemo], // Add this
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

Everything is now ready! Start the app by running `slack run` command in a terminal window and confirm there is no error in the stdout. 

```bash
$ slack run
? Choose a workspace  seratch  T03E94MJU
   stoic-wolf-344 A04G9S43G2K

Updating dev app install for workspace "Acme Corp"

⚠️  Outgoing domains
   No allowed outgoing domains are configured
   If your function makes network requests, you will need to allow the outgoing domains
   Learn more about upcoming changes to outgoing domains: https://api.slack.com/future/changelog
✨  seratch of Acme Corp
Connected, awaiting events
```

And then, open a new terminal window to run `slack triggers create --trigger-def interactive_blocks_demo.ts` to generate a link trigger.

```bash
$ slack triggers create --trigger-def interactive_blocks_demo.ts
? Choose an app  seratch (dev)  T03E94MJU
   stoic-wolf-344 (dev) A04G9S43G2K

⚡ Trigger created
   Trigger ID:   Ft04HCF4SSBB
   Trigger Type: shortcut
   Trigger Name: Interaction Demo Trigger
   URL: https://slack.com/shortcuts/***/***
$
```

Share the link in a Slack channel and click it. You will see a message with two buttons:

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/807b4790-f0b2-12de-d63e-e7155b25bfea.png" width=500 />

When you click the "Approve" button, your `handle_interactive_blocks.ts` function accepts the event request and does nothing. In this case, nothing happens apart from the `interactive_blocks` part replacement by the platform.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/87cf2401-c064-ac33-425d-0b01de334a3b.gif" width=500 />

Contrarily, when you click the "Deny" button, your custom function opens a new modal dialog to ask the reason for denial.

Also, your additional handler for view data submissions does input data validation (length check), and also provides a button to clear the inputs.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/ca504b90-7178-11e6-0f3e-5f6debbfbd70.gif" width=500 />

As you can see, when you build a simple approval process, the built-in `interactive_blocks` is easy to implement. But you cannot customize some details such as how to update the `interactive_blocks` part when any of the buttons is clicked. If you want to have full control of the interactions, you can build an interactive message blocks using Block Kit from scratch. In the next section, you'll learn how to make it.

## Write Custom Function With Full Interactivity Features

Create a new file named `send_interactive_message.ts`. This source file defines a new custom function that sends a channel message with full-feature Block Kit blocks, and handles all the interactive events with the message's blocks.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

export const def = DefineFunction({
  callback_id: "send_interactive_message",
  title: "Send a message with interactive blocks",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      user_id: { type: Schema.slack.types.user_id },
      channel_id: { type: Schema.slack.types.channel_id },
    },
    required: ["user_id", "channel_id"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(
  def,
  // When the worfklow is executed, this handler is called
  async ({ inputs, client }) => {
    const text = `Do you approve <@${inputs.user_id}>'s time off request?`;
    // Block Kit elements (https://api.slack.com/block-kit)
    const blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
      { type: "divider" },
      {
        type: "actions",
        block_id: "approve-deny-buttons",
        elements: [
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
    ];
    const response = await client.chat.postMessage({
      channel: inputs.channel_id,
      text,
      blocks,
    });
    if (response.error) {
      console.log(JSON.stringify(response, null, 2));
      const error = `Failed to post a message due to ${response.error}`;
      return { error };
    }
    // To continue with this interaction, return false for the completion
    return { completed: false };
  },
)
  // Handle the "Approve" button clicks
  .addBlockActionsHandler("approve", async ({ body, client, inputs }) => {
    const text = "Thank you for approving the request!";
    const response = await client.chat.update({
      channel: inputs.channel_id,
      ts: body.container.message_ts,
      text,
      blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    });
    if (response.error) {
      const error = `Failed to update the message due to ${response.error}`;
      return { error };
    }
    return { completed: true, outputs: {} };
  })
  // Handle the "Deny" button clicks
  .addBlockActionsHandler("deny", async ({ body, client, inputs }) => {
    const text =
      "OK, we need more information... Could you share the reason for denial?";
    const messageResponse = await client.chat.update({
      channel: inputs.channel_id,
      ts: body.container.message_ts,
      text,
      blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    });
    if (messageResponse.error) {
      const error =
        `Failed to update the message due to ${messageResponse.error}`;
      return { error };
    }
    const modalResponse = await client.views.open({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view: buildNewModalView(),
    });
    if (modalResponse.error) {
      const error = `Failed to open a modal due to ${modalResponse.error}`;
      return { error };
    }
    return { completed: false };
  })
  // Handle the button click events on the modal
  .addBlockActionsHandler("clear-inputs", async ({ body, client }) => {
    const response = await client.views.update({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view_id: body.view.id,
      view: buildNewModalView(),
    });
    if (response.error) {
      const error = `Failed to update a modal due to ${response.error}`;
      return { error };
    }
    return { completed: false };
  })
  // Handle the data submission from the modal
  .addViewSubmissionHandler(
    ["deny-reason-submission"],
    ({ view }) => {
      const values = view.state.values;
      const reason = String(Object.values(values)[0]["deny-reason"].value);
      if (reason.length <= 5) {
        console.log(reason);
        const errors: Record<string, string> = {};
        const blockId = Object.keys(values)[0];
        errors[blockId] = "The reason must be 5 characters or longer";
        return { response_action: "errors", errors };
      }
      return {};
    },
  )
  // Handle the events when the end-user closes the modal
  .addViewClosedHandler(
    ["deny-reason-submission", "deny-reason-confirmation"],
    ({ view }) => {
      console.log(JSON.stringify(view, null, 2));
    },
  );

/**
 * Returns the initial state of the modal view
 * @returns the initial modal view
 */
function buildNewModalView() {
  return {
    "type": "modal",
    "callback_id": "deny-reason-submission",
    "title": { "type": "plain_text", "text": "Reason for the denial" },
    "notify_on_close": true,
    "submit": { "type": "plain_text", "text": "Confirm" },
    "blocks": [
      {
        "type": "input",
        // If you reuse block_id when refreshing an existing modal view,
        // the old block may remain. To avoid this, always set a random value.
        "block_id": crypto.randomUUID(),
        "label": { "type": "plain_text", "text": "Reason" },
        "element": {
          "type": "plain_text_input",
          "action_id": "deny-reason",
          "multiline": true,
          "placeholder": {
            "type": "plain_text",
            "text": "Share the reason why you denied the request in detail",
          },
        },
      },
      {
        "type": "actions",
        "block_id": "clear",
        "elements": [
          {
            type: "button",
            action_id: "clear-inputs",
            text: { type: "plain_text", text: "Clear all the inputs" },
            style: "danger",
          },
        ],
      },
    ],
  };
}
```

Next, create a new workflow that uses the above function. Save the following as `interactive_message_demo.ts`:

```typescript
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

import { def as sendInteractiveMessage } from "./send_interactive_message.ts";
workflow.addStep(sendInteractiveMessage, {
  user_id: workflow.inputs.user_id,
  channel_id: workflow.inputs.channel_id,
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
```

Add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as InteractiveBlocksDemo } from "./interactive_blocks_demo.ts";
// Add this
import { workflow as InteractiveMessageDemo } from "./interactive_message_demo.ts";

export default Manifest({
  name: "stoic-wolf-344",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [InteractiveBlocksDemo, InteractiveMessageDemo], // Add this
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

Lastly, create a link trigger in the same way you've done above. When you start the workflow, you will see a message with buttons. When you click the buttons, you'll find the behavior is different from the one with `SendMessage`'s `interactive_blocks`. The message modification looks more natural.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/50a83250-77fc-9ddc-5690-669f55b7dfcc.gif" width=500 />

A simplified code for the message replacement can look like this:

```typescript
  .addBlockActionsHandler("approve", async ({ body, client, inputs }) => {
    const text = "Thank you for approving the request!";
    await client.chat.update({
      channel: inputs.channel_id,
      ts: body.container.message_ts,
      text,
      blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    });
    return { completed: true, outputs: {} };
  })
```

As for the patterns with the "Deny" button, the handler opens a modal in the same way with the first example. In addition, it replaces the message with more meaningful message.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/60ab8388-f5ad-af72-63ae-82437434cc32.gif" width=500 />

Here is a simplified source code for handling the "Deny" button clicks. Please note that, in this case, your handler can get `interactivity` not from `inputs` but from `body` data.

```typescript
  .addBlockActionsHandler("deny", async ({ body, client, inputs }) => {
    const text =
      "OK, we need more information... Could you share the reason for denial?";
    await client.chat.update({
      channel: inputs.channel_id,
      ts: body.container.message_ts,
      text,
      blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    });
    await client.views.open({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view: buildNewModalView(),
    });
    // To continue interactions, return completed: false
    return { completed: false };
  })
```

If you're not so familiar with [Block Kit](https://api.slack.com/block-kit) and [Slack's modals](https://api.slack.com/surfaces/modals), you may need more time to understand some parts of the code. You can start with this relative simple example and then learn more by changing the code on your own.

To adjust blocks, [Block Kit Builder](https://app.slack.com/block-kit-builder) is very useful. If you haven't tried it yet, visit the site and click the available blocks on the left pane.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Use `SendMessage`'s `interactive_blocks` and handle its events in your custom function
* Build a custom function that sends an interactive message and handles the message's interactive events

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/12_Button_Interactions

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: