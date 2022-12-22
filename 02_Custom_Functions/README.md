In this tutorial, you'll learn how to add your own "function" to [Slack's next-generation platform](https://api.slack.com/future) app in 5 minutes. This tutorial aims to help you understand how to add a custom function, which does the same with the built-in `SendMessage` function to a workflow.

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
$ cd affectionate-panther-654
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

## Create a Workflow

To learn the steps to add a custom function step by step, let's start with a simple workflow with a built-in function. As you did in [this tutorial](https://dev.to/seratch/slack-next-gen-platform-the-simplest-hello-world-4ic0) (if you haven't, going through the tutorial in advance is highly recommended), create a new file named `workflow_and_trigger.ts` with the following content.

```typescript
// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "custom-function-demo-workflow",
  title: "Custom Function Demo Workflow",
  input_parameters: {
    properties: { channel_id: { type: Schema.slack.types.channel_id } },
    required: ["channel_id"],
  },
});

// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Custom Function Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: { channel_id: { value: "{{data.channel_id}}" } },
};
export default trigger;
```

Also, please don't forget to add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
// Import the workflow you've just created
import { workflow as CustomFunctionDemo } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "affectionate-panther-654",
  description: "Hello World!",
  icon: "assets/default_new_app_icon.png",
  // Add the imported workflow here
  workflows: [CustomFunctionDemo],
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

After checking if there is no error in `slack run` outputs, you can generate a link trigger by running `slack triggers create --trigger-def ./workflow_and_trigger.ts`. You'll see two options on the screen. Select the latter one with `(dev)` suffix this time.

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  [Use arrows to move, type to filter]
   seratch  T03E94MJU
   App is not installed to this workspace

>  seratch (dev)  T03E94MJU
   affectionate-panther-654 (dev) A04DHV08MPF
```

If everything goes well, you will get a link trigger to start your demo workflow:

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   affectionate-panther-654 (dev) A04DHV08MPF

⚡ Trigger created
   Trigger ID:   Ft04DEBXXXX
   Trigger Type: shortcut
   Trigger Name: Custom Function Demo Trigger
   URL: https://slack.com/shortcuts/Ft04DEBXXXXX/YYYY
```

You can share the link in the connected Slack workspace by posting a  message with the URL. You'll see a button to click as the attachment of the message.

Every time you click the link, you'll see a "Hello World!" message in the channel shortly.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/c3e7d611-8f25-1147-a62e-0300314d769d.png" width=500 />

OK, no surprise. We can go further now!

#### Add Your First Custom Function `my_send_message.ts`

You may want to add your custom function to the existing single source file `workflow_and_trigger.ts`. However, unfortunately, it's not feasible to add functions to the existing file. 

This is because the platform expects `default export` of `SlackFunction()` call result, which is required for finding a function's handler code in the relative `source_file` path. For this reason, developers need to have a dedicated source file for each custom function.

So, create a new file named `my_send_message.ts` with the following content:

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

export const def = DefineFunction({
  callback_id: "my_send_message",
  title: "My SendMessage",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message: { type: Schema.types.string },
    },
    required: ["channel_id", "message"],
  },
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    required: ["ts"],
  },
});

export default SlackFunction(def, async ({ inputs, client }) => {
  const response = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: inputs.message,
  });
  console.log(`chat.postMessage result: ${JSON.stringify(response, null, 2)}`);
  if (response.error) {
    const error = `Failed to post a message due to ${response.error}`;
    return { error };
  }
  return { outputs: { ts: response.ts } };
});
```

And then, you can replace the built-in function in the workflow with this custom one. Edit `workflow_and_trigger.ts` like this:

```typescript
// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
export const workflow = DefineWorkflow({
  callback_id: "custom-function-demo-workflow",
  title: "Custom Function Demo Workflow",
  input_parameters: {
    properties: { channel_id: { type: Schema.slack.types.channel_id } },
    required: ["channel_id"],
  },
});

// Replace the built-in function with your own one below
/*
// Send a message in a channel using the built-in function
workflow.addStep(Schema.slack.functions.SendMessage, {
  // Set the channel ID given by trigger -> workflow
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});
*/

// Import your own ./my_send_message.ts and use the function instead
import { def as MySendMessage } from "./my_send_message.ts";
workflow.addStep(MySendMessage, {
  channel_id: workflow.inputs.channel_id,
  message: "Hello World!",
});
```

Click the trigger in the channel again. You'll see the workflow works in the same way! Also, our `slack run` terminal window should display logs:

```
chat.postMessage result: {
  "ok": true,
  "channel": "C04FB5UF1C2",
  "ts": "1671685040.050449",
  "message": { ... }
}
2022-12-22 13:57:19 [info] [Fn04G9TKNS91] (Trace=Tr04FVF67P3R) Function execution started for workflow function 'Custom Function Demo Workflow'
2022-12-22 13:57:19 [info] [Wf04GZN08DT2] (Trace=Tr04G9TSDRKM) Executing workflow step 1 of 1
2022-12-22 13:57:19 [info] [Fn04G3DBBWA2] (Trace=Tr04G9TSDRKM) Function execution started for app function 'My SendMessage'
2022-12-22 13:57:20 [info] [Fn04G3DBBWA2] (Trace=Tr04G9TSDRKM) Function execution completed for function 'My SendMessage'
2022-12-22 13:57:21 [info] [Wf04GZN08DT2] (Trace=Tr04G9TSDRKM) Execution completed for workflow step 'My SendMessage'
2022-12-22 13:57:21 [info] [Fn04G9TKNS91] (Trace=Tr04FVF67P3R) Function execution completed for function 'Custom Function Demo Workflow'
2022-12-22 13:57:21 [info] [Wf04GZN08DT2] (Trace=Tr04G9TSDRKM) Execution completed for workflow 'Custom Function Demo Workflow'
```

You might be confused seeing the `console.log` outputs come first and workflow-level logs are delayed. Indeed, this is confusing, but the actual chronological order of the executions is as you expect. The reason for such server-side log delays is the lag until fetching the log data from the Slack cloud infra. In future updates, this behavior may be improved, but as of this writing, developers need to recognize the behavior.

Also, you may notice that the message poster's icon image is not properly set when posting a message using the custom function. This is a known bug on the platform, which affects only dev versions of an app. When you deploy a prod app by `slack deploy`, the prod version never has this issue. To resolve this dev version issue, using the [icon_url](https://api.slack.com/methods/chat.postMessage#arg_icon_url) parameter for the API call can be a workaround. You need to add `chat:write.customize` to `botScopes` in `manifest.ts`, plus pass `icon_url` when performing a `chat.postMessage` API call in your `my_send_message.ts` function.

Before wrapping up this tutorial, let me share more details on how to develop a custom function. Instead of having lots of lengthy sentences, I've added as many code comments as possible. I hope those comments guide you on each part of the function code well.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

// Define the metadata of the function:
// No need to be `def`. Any names work for you
export const def = DefineFunction({
  callback_id: "my_send_message",
  title: "My SendMessage",
  // Pass the relative path to this file from the project root directory:
  // If you place this under functions/ directory, the string can be funtions/my_send_message.ts
  // source_file: "my_send_message_with_comments.ts",

  // A 3rd party module "deno_slack_source_file_resolver" automatically resolves the relative path
  source_file: FunctionSourceFile(import.meta.url),

  // Define all the possible inputs with their names and types:
  // Having a description would be helpful for long-term maintenance, but it's optional.
  // You can access the properties inside your function handler code.
  input_parameters: {
    properties: {
      // When setting `Schema.slack.types.channel_id` as the type here,
      // the workflow engine verifies the format of given data.
      // If it's not a channel string, the workflow execution can be terminated as a failure.
      channel_id: { type: Schema.slack.types.channel_id },
      // This general string type accepts any string data,
      message: { type: Schema.types.string },
    },
    // Having the property names ensures they're always available for the handler execution.
    required: ["channel_id", "message"],
  },
  // Define all the possible outputs when the function execution succeeds:
  // When it fails, and you'd like to terminate the workflow execution immediately, your function code should return an error string instead outputs.
  // Otherwise, it's also a good approach to include some error state in outputs,
  // and then let the following functions handle the error outcome.
  output_parameters: {
    properties: { ts: { type: Schema.types.string } },
    // When a property is listed here, your handler code must return the property as part of outputs. TS compiler verifies this for you.
    required: ["ts"],
  },
});

// The default export of the `SlackFunction()` call result is required to make it available for workflows.
// You can pass the above "definition" object as the first argument.
// The second argument is the handler function, which executes the function's logic.
// Also, it must be compatible with the definition's inputs/outputs.
export default SlackFunction(def, async ({
  // All the possible arguments as of this writing
  event, // all the metadata on this function execution event
  inputs, // the properties defined in input_parameters
  env, // we don't use this time, but you can set secrets by slack env command
  team_id, // The connected workspace's ID
  enterprise_id, // The connected Enterprise Grid Org's ID (if that's not the case, this property can be an empty string)
  client, // Slack API client -- if you need direct access to its bot token, you can have `token` as well
}) => {
  // Print everything just to use all the arguments
  console.log(JSON.stringify({ event, inputs, env, team_id, enterprise_id }));
  // Call chat.postMessage API to post a message in a channel
  const response = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: inputs.message,
  });
  console.log(`chat.postMessage result: ${JSON.stringify(response, null, 2)}`);
  if (response.error) {
    // Terminate the workflow execution due to this error
    const error = `Failed to post a message due to ${response.error}`;
    return { error };
  }
  // Return a successful result in the outputs
  return { outputs: { ts: response.ts } };
});
```

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Create a custom function
* Add the function to a workflow

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/02_Custom_Functions

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: