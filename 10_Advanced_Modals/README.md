In this tutorial, you'll learn how to use advanced modal interactions in your [Slack's next-generation platform](https://api.slack.com/future) apps.

You may have already read [The "Built-in Forms" tutorial](https://dev.to/seratch/slack-next-gen-platform-built-in-forms-eo3). With the built-in `OpenForm` function, you can generate a simple modal view to collect user inputs. It's powerful enough! But it has some limitations, such as no custom handler support for modal data submissions, modal closures, and button interactions.

In this tutorial, I'll guide you on how to build a sophisticated user interface that fully leverages Slack's [modals](https://api.slack.com/surfaces/modals/using) and its foundation, [Block Kit](https://api.slack.com/block-kit) UI framework.

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
$ cd sharp-chipmunk-480
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
  callback_id: "modal-demo-workflow",
  title: "Modal Demo Workflow",
  input_parameters: {
    properties: { interactivity: { type: Schema.slack.types.interactivity } },
    required: ["interactivity"],
  },
});

// Add your custom function to open and handle a modal
import { def as ModalDemo } from "./function.ts";
workflow.addStep(ModalDemo, {
  interactivity: workflow.inputs.interactivity,
});

// ----------------
// Trigger Definition
// ----------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut", // link trigger
  name: "Modal Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // Modal interactions require `interactivity` input parameter.
    // As of this writing, only link triggers can provide the value.
    interactivity: { value: "{{data.interactivity}}" },
  },
};
export default trigger;
```

Since you don't have `function.ts` yet, the compilation should fail. Let's add the following source code as `function.ts`:

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const def = DefineFunction({
  callback_id: "modal-example",
  title: "Modal interaction example",
  source_file: "function.ts",
  input_parameters: {
    properties: { interactivity: { type: Schema.slack.types.interactivity } },
    required: ["interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(
  def,
  // ---------------------------
  // The first handler function that opens a modal.
  // This function can be called when the workflow executes the function step.
  // ---------------------------
  async ({ inputs, client }) => {
    // Open a new modal with the end-user who interacted with the link trigger
    const response = await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        "type": "modal",
        // Note that this ID can be used for dispatching view submissions and view closed events.
        "callback_id": "first-page",
        // This option is required to be notified when this modal is closed by the user
        "notify_on_close": true,
        "title": { "type": "plain_text", "text": "My App" },
        "submit": { "type": "plain_text", "text": "Next" },
        "close": { "type": "plain_text", "text": "Close" },
        "blocks": [
          {
            "type": "input",
            "block_id": "first_text",
            "element": { "type": "plain_text_input", "action_id": "action" },
            "label": { "type": "plain_text", "text": "First" },
          },
        ],
      },
    });
    if (response.error) {
      const error =
        `Failed to open a modal in the demo workflow. Contact the app maintainers with the following information - (error: ${response.error})`;
      return { error };
    }
    return {
      // To continue with this interaction, return false for the completion
      completed: false,
    };
  },
)
  // ---------------------------
  // The handler that can be called when the above modal data is submitted.
  // It saves the inputs from the first page as private_metadata,
  // and then displays the second-page modal view.
  // ---------------------------
  .addViewSubmissionHandler(["first-page"], ({ view }) => {
    // Extract the input values from the view data
    const firstText = view.state.values.first_text.action.value;
    // Input validations
    if (firstText.length < 5) {
      return {
        response_action: "errors",
        // The key must be a valid block_id in the blocks on a modal
        errors: { first_text: "Must be 5 characters or longer" },
      };
    }
    // Successful. Update the modal with the second page presentation
    return {
      response_action: "update",
      view: {
        "type": "modal",
        "callback_id": "second-page",
        // This option is required to be notified when this modal is closed by the user
        "notify_on_close": true,
        "title": { "type": "plain_text", "text": "My App" },
        "submit": { "type": "plain_text", "text": "Next" },
        "close": { "type": "plain_text", "text": "Close" },
        // Hidden string data, which is not visible to end-users
        // You can use this property to transfer the state of interaction
        // to the following event handlers.
        // (Up to 3,000 characters allowed)
        "private_metadata": JSON.stringify({ firstText }),
        "blocks": [
          // Display the inputs from "first-page" modal view
          {
            "type": "section",
            "text": { "type": "mrkdwn", "text": `First: ${firstText}` },
          },
          // New input block to receive text
          {
            "type": "input",
            "block_id": "second_text",
            "element": { "type": "plain_text_input", "action_id": "action" },
            "label": { "type": "plain_text", "text": "Second" },
          },
        ],
      },
    };
  })
  // ---------------------------
  // The handler that can be called when the second modal data is submitted.
  // It displays the completion page view with the inputs from
  // the first and second pages.
  // ---------------------------
  .addViewSubmissionHandler(["second-page"], ({ view }) => {
    // Extract the first-page inputs from private_metadata
    const { firstText } = JSON.parse(view.private_metadata!);
    // Extract the second-page inputs from the view data
    const secondText = view.state.values.second_text.action.value;
    // Displays the third page, which tells the completion of the interaction
    return {
      response_action: "update",
      view: {
        "type": "modal",
        "callback_id": "completion",
        // This option is required to be notified when this modal is closed by the user
        "notify_on_close": true,
        "title": { "type": "plain_text", "text": "My App" },
        // This modal no longer accepts further inputs.
        // So, the "Submit" button is intentionally removed from the view.
        "close": { "type": "plain_text", "text": "Close" },
        // Display the two inputs
        "blocks": [
          {
            "type": "section",
            "text": { "type": "mrkdwn", "text": `First: ${firstText}` },
          },
          {
            "type": "section",
            "text": { "type": "mrkdwn", "text": `Second: ${secondText}` },
          },
        ],
      },
    };
  })
  // ---------------------------
  // The handler that can be called when the second modal data is closed.
  // If your app runs some resource-intensive operations on the backend side,
  // you can cancel the ongoing process and/or tell the end-user
  // what to do next in DM and so on.
  // ---------------------------
  .addViewClosedHandler(
    ["first-page", "second-page", "completion"],
    ({ view }) => {
      console.log(`view_closed handler called: ${JSON.stringify(view)}`);
      return { completed: true };
    },
  );
```

I'll explain the details later, but the key points are:

- The first handler opens a modal for the end-user
- Dispatch modal data submission events using `addViewSubmissionHandler()`'s handler registration + a modal's `callback_id`
- Dispatch modal closure events using `addViewClosedHandler()`'s handler registration + a modal's `callback_id`

## Create a Link Trigger

Let's create a link trigger to start an interaction.

```bash
$ slack triggers create --trigger-def workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   sharp-chipmunk-480 (dev) A04G9S43G2K


⚡ Trigger created
   Trigger ID:   Ft04GZK1EE3E
   Trigger Type: shortcut
   Trigger Name: Modal Demo Trigger
   URL: https://slack.com/shortcuts/***/***
```

Share the link trigger URL in a channel, and click it. You should be able to interact with the modal as expected — the modal transfer your inputs to the second page. The last page displays the two inputs.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/63dcc0dd-0912-cc42-5a72-a94c48b89eb7.gif" width=600 />

When handling the first-page data submission, the handler does input validations (the length check). If the inputs are valid, it returns `response_action: "update"` with a new modal view. Also, the code passes the inputs as JSON string data, which can be embedded in the modal view as `private_metadata`.

```typescript
.addViewSubmissionHandler(["first-page"], ({ view }) => {
  // Extract the input values from the view data
  const firstText = view.state.values.first_text.action.value;
  // Input validations
  if (firstText.length < 5) {
    return {
      response_action: "errors",
      // The key must be a valid block_id in the blocks on a modal
      errors: { first_text: "Must be 5 characters or longer" },
    };
  }
  // Successful. Update the modal with the second-page presentation
  return {
    response_action: "update",
    view: {
      "type": "modal",
      "callback_id": "second-page",
      "private_metadata": JSON.stringify({ firstText }),
      ...
    },
  };
})
```

As for the second-page handling, the handler extracts values from both `view.private_metadata` and `view.state.values`. The updated view displays both values in a single modal view.

```typescript
.addViewSubmissionHandler(["second-page"], ({ view }) => {
  // Extract the first-page inputs from private_metadata
  const { firstText } = JSON.parse(view.private_metadata!);
  // Extract the second-page inputs from the view data
  const secondText = view.state.values.second_text.action.value;
  // Displays the third page, which tells the completion of the interaction
  return { response_action: "update", view: { ... } };
  };
})
```

Lastly, your app can handle all the modal closure events by a single handler registered by `addViewClosedHandler()` method call.

```typescript
.addViewClosedHandler(
  ["first-page", "second-page", "completion"],
  ({ view }) => {
    console.log(`view_closed handler called: ${JSON.stringify(view)}`);
    return { completed: true };
  },
);
```

## A Few Things To Know

The handlers registered by `addViewSubmissionHandler()` **must complete within 3 seconds** (as of this writing, the duration is a bit longer, but it may be changed in the near future). If your handler runs some time-consuming tasks, there are two options:

- Update the modal with "Processing..." view first, pass the bot token to the backend service, and then call `views.update` API when the process completes on the backend side
- End the interactions on the modal and then continue the communications with the same user in DM or elsewhere

Also, if you're already familiar with [Slack' modals](https://api.slack.com/surfaces/modals/using) for a long time, you might be confused with the necessity to pass `interactivity_pointer` instead of `trigger_id`. Actually, these work in the same way. The only difference is the way to get a value. You can get `interactivity_pointer` only from `inputs.interactivity` while the existing platform features provide `trigger_id` in interactive event payloads.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

- Start a full-feature modal in your custom function
- Handle data submissions from a full-feature modal

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/10_Advanced_Modals

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket:
