In this tutorial, you'll learn how to use [scheduled triggers](https://api.slack.com/future/triggers/scheduled) to start your workflows in your [Slack's next-generation platform](https://api.slack.com/future) apps.

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
$ cd nifty-capybara-954
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

A schedule trigger invokes your workflows periodically. The supported intervals as of this writing are "once", "hourly", "daily", "weekly", "monthly", and "yearly".

Let's define a trigger that invokes a workflow 30 seconds after you create it.

```typescript
import { DefineWorkflow } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "scheduled-trigger-demo-workflow",
  title: "Scheduled Trigger Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "scheduled",
  name: "Trigger a workflow",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {},
  schedule: {
    // This start_time means 30 seconds after you run
    // `slack triggers create` command
    start_time: new Date(new Date().getTime() + 30_000).toISOString(),
    // This can be invoked only once
    frequency: { type: "once" },
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
  name: "objective-fox-22",
  description: "Scheduled Trigger Example",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow], // Add this
  botScopes: ["commands"],
});
```

Next, you'll use two terminal windows. One for `slack run` command and another for `slack triggers create` command.

To register the workflow, run `slack run` command on the first terminal window. And then, run `slack triggers create --trigger-def workflow_and_trigger.ts` on another one. You will see the following outputs:

```bash
$ slack triggers create --trigger-def workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   objective-fox-22 (dev) A04G9S43G2K


⚡ Trigger created
   Trigger ID:   Ft04HE42B15E
   Trigger Type: scheduled
   Trigger Name: Trigger a workflow
```

Go back to the `slack run` command terminal. You will see the workflow execution logs 30 seconds later.

```bash
$ slack run
? Choose a workspace  seratch  T03E94MJU
   objective-fox-22 A04G9S43G2K

Updating dev app install for workspace "Acme Corp"

⚠️  Outgoing domains
   No allowed outgoing domains are configured
   If your function makes network requests, you will need to allow the outgoing domains
   Learn more about upcoming changes to outgoing domains: https://api.slack.com/future/changelog
✨  seratch of Acme Corp
Connected, awaiting events

2022-12-27 17:10:46 [info] [Fn04GHQFQMC6] (Trace=Tr04GQD13VH8) Function execution started for workflow function 'Scheduled Trigger Demo Workflow'
2022-12-27 17:10:46 [info] [Wf04H31WBE1X] (Trace=Tr04GSSF1CTE) Execution started for workflow 'Scheduled Trigger Demo Workflow'
2022-12-27 17:10:46 [info] [Fn04GHQFQMC6] (Trace=Tr04GQD13VH8) Function execution completed for function 'Scheduled Trigger Demo Workflow'
2022-12-27 17:10:46 [info] [Wf04H31WBE1X] (Trace=Tr04GSSF1CTE) Execution completed for workflow 'Scheduled Trigger Demo Workflow'
```

It works! If you want to repeat the workflow execution, you can configure the `frequency` part in the trigger definition. For hourly executions, you can set:

```typescript
  schedule: {
    // This start_time means 30 seconds after you run
    // `slack triggers create` command
    start_time: new Date(new Date().getTime() + 30_000).toISOString(),
    // end_time is required for repeated executions
    end_time: "2037-12-31T23:59:59Z",
    frequency: {
      // hourly, daily, weekly, monthly, and yearly are available here
      type: "hourly",
      // For bi-weekly etc., you can set 2
      repeats_every: 1,
    },
  },
```

Refer to https://api.slack.com/future/triggers/scheduled for more details.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Define a scheduled trigger to run a workflow

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/06_Scheduled_Triggers

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: