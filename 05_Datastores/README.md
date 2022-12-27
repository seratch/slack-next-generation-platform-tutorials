In this tutorial, you'll learn how to use datastores in your [Slack's next-generation platform](https://api.slack.com/future) apps.

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

In this tutorial, you will learn how to talk to your datastores using CLI, and then via your function code. 

## Add Datastores to Your App

The first step is to add a datastore to your app. Create a new file named `tasks.ts` and save the following source code:

```typescript
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const datastore = DefineDatastore({
  name: "tasks",
  // The primary key's type must be a string
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string, required: true },
    title: { type: Schema.types.string, required: true },
    description: { type: Schema.types.string }, // optional
    due: { type: Schema.types.string }, // optional
  },
});
```

If you're interested in other available options for attributes, refer to https://api.slack.com/future/datastores for details.

Next, add the datastore to your `manifest.ts`. You can add imported datastore definitions to the `datastores` list property. Also, you need to add `datastore:read` and `datastore:write` in `botScopes` to run queries toward the datastores associated with this app.

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { datastore as Tasks } from "./tasks.ts";

export default Manifest({
  name: "nifty-capybara-954",
  description: "Datastore Example",
  icon: "assets/default_new_app_icon.png",
  datastores: [Tasks],
  botScopes: [
    "commands",
    // Necessary for accessing datastores
    "datastore:read",
    "datastore:write",
  ],
});
```

And then, please don't forget to run `slack run` command to reflect the changes to the Slack hosting infra.

## Use Datastores via CLI Commands

To quickly learn how to run queries and data manipulation, let's use the subcommands under `slack datastore` namespace. Run `slack datastore --help` to see the list of available subcommands.

```
$ slack datastore --help
Query an App Datastore

USAGE
  $ slack datastore <subcommand> [flags]

SUBCOMMANDS
  delete      Delete a datastore item. Docs: https://api.slack.com/future/
  get         Get an item from the slack datastore. Docs: https://api.slack.com/future/
  put         Create/Update an App Datastore. Docs: https://api.slack.com/future/
  query       Query for datastore items. Docs: https://api.slack.com/future/

FLAGS
  -h, --help   help for datastore

GLOBAL FLAGS
      --apihost string     Slack API host
  -f, --force              ignore warnings and continue executing command
  -l, --local-run run      use the local run app created by the run command.
  -r, --runtime string     project's runtime language: deno, deno1.1, deno1.x, etc (Default: deno)
  -s, --skip-update        skip checking for latest version of CLI
      --slackdev           use the Slack Dev API (--apihost=dev.slack.com)
  -v, --verbose            when set print debug logging
  -w, --workspace string   use a specific workspace by domain name

EXAMPLE
  $ slack datastore put '{"datastore": "todos", "app": "A0123A45BCD", "item": {"id": "42", "description": "Create a PR", "status": "Done"}}'

ADDITIONAL HELP
  $ slack datastore <subcommand> --help for more information about a specific command.

  For more information, read the documentation: https://api.slack.com/future
```

For all the commands you'll use in this tutorial, the argument is a simple JSON data string. For example, if you want to fetch data from "tasks" datastore, the CLI command argument can be `{"datastore": "tasks"}`.

To make sure that your datastore is created on the hosting server side, run `slack datastore query '{"datastore": "tasks"}'`:

```bash
$ slack datastore query '{"datastore": "tasks"}'
? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Retrieved 0 items from datastore: tasks

To create or update existing items run slack datastore put [item]
```

The query command works, but it returns zero results, as expected. As the command output suggests, let's add a new row to the datastore.

### Insert Data

The argument for data creation can be something like this:

```json
{
  "datastore": "tasks",
  "item": {
    "id": "1",
    "title": "Make a phone call"
  }
}
```

Let's run `slack datastore put '{"datastore": "tasks", "item": {"id": "1", "title": "Make a phone call"}}'` command to insert a new row:

```bash
$ slack datastore put '{"datastore": "tasks", "item": {"id": "1", "title": "Make a phone call"}}'

? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Stored below record in the datastore: tasks

{
  "id": "1",
  "title": "Make a phone call"
}
To inspect the datastore after updates, run slack datastore query [expression]
```

Yay, a new record was successfully saved!

Let's run the above query again to see how the datstore was changed:

```bash
$ slack datastore query '{"datastore": "tasks"}'
? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Retrieved 1 items from datastore: tasks
Talk
{
  "id": "1",
  "title": "Make a phone call"
}
To create or update existing items run slack datastore put [item]
```

The command returned one record as expected.

There are a few things to know about this "put" operation.

First, please double-check the item's property names when running the "put" operation. If you pass invalid names in the "item", **the properties will be just ignored**. The API call succeeds, and no error code is returned.

Also, **you must use `Schema.types.string` type for your datastore's primary key**. As of this writing, it is technically possible to try a different type for a primary key. However, with the settings, "put" operations do not work as you expect. So you will have to re-create the datastore eventually.

### Run a Query

You've already tried a simple query without an expression. Now let's try a more realistic query to fetch data. Slack's datastores enable developers to use [Amazon DynamoDB query syntax](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html) for query conditions. More specifically, `expression`, `expression_attributes`, `expression_values` need to be passed when performing a query.

Let's run a query with this condition:
```json
{
  "datastore": "tasks",
  "expression": "begins_with(#title, :title)",
  "expression_attributes": {"#title": "title"},
  "expression_values": {":title": "Make a "}
}
```

The query should succeed and return a row:

```bash
$ slack datastore query '
{
  "datastore": "tasks",
  "expression": "begins_with(#title, :title)",
  "expression_attributes": {"#title": "title"},
  "expression_values": {":title": "Make a "}
}
'
? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Retrieved 1 items from datastore: tasks

{
  "id": "1",
  "title": "Make a phone call"
}
To create or update existing items run slack datastore put [item]
```

Here is a primary key query example:

```bash
$ slack datastore query '
{
  "datastore": "tasks",
  "expression": "#id = :id",
  "expression_attributes": {"#id": "id"},
  "expression_values": {":id": "1"}
}
'

? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Retrieved 1 items from datastore: tasks

{
  "id": "1",
  "title": "Make a phone call"
}
To create or update existing items run slack datastore put [item]
```

If a query does not match any rows, it returns zero results.

```bash
$ slack datastore query '
{
  "datastore": "tasks",
  "expression": "#id = :id",
  "expression_attributes": {"#id": "id"},
  "expression_values": {":id": "999"}
}
'
? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Retrieved 0 items from datastore: tasks

To create or update existing items run slack datastore put [item]
```

### Update an Existing Row

Let's update a row using the CLI command. You already know how to do it, as nothing differs from the row creation example. You can run the "put" operation with the same primary key.

```bash
$ slack datastore put '{"datastore": "tasks", "item": {"id": "1", "title": "Make a phone call to Jim", "due": "Dec 18"}}'

? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Stored below record in the datastore: tasks

{
  "due": "Dec 18",
  "id": "1",
  "title": "Make a phone call to Jim"
}
To inspect the datastore after updates, run slack datastore query [expression]
```

### Delete a Row

You can run the "delete" operation with a primary key to delete a row. Note that the argument must have the primary key at the top-level of JSON data, meaning it's not `{"datastore": "tasks", "item": {"id": "1"}}` but `{"datastore": "tasks", "id":"1"}`.

```bash
$ slack datastore delete '{"datastore": "tasks", "id":"1"}'

? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch  T03E94MJU
   nifty-capybara-954 A04G9B1SFAB

🎉  Deleted from datastore: tasks

primary_key: 1
To inspect the datastore after updates, run slack datastore query [expression]
```

Now that you've learned all four operations with Slack's datastores, you're already an expert on the feature :rocket:

## Use Datastores via Functions

The CLI commands are convenient for ad-hoc queries or initial data imports. However, to build something meaningful with the datastore, your app needs to do the same in function code. Here is a simple example code demonstrating all the above operations in code. Save this as `function.ts`:

```typescript
import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
// Add "deno-slack-source-file-resolver/" to "imports" in ./import_map.json
import { FunctionSourceFile } from "deno-slack-source-file-resolver/mod.ts";

export const def = DefineFunction({
  callback_id: "datastore-demo",
  title: "Datastore demo",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: { properties: {}, required: [] },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(def, async ({ client }) => {
  const creation = await client.apps.datastore.put({
    datastore: "tasks",
    item: { "id": "1", "title": "Make a phone call to Jim" },
  });
  console.log(`creation result: ${JSON.stringify(creation, null, 2)}`);
  if (creation.error) {
    return { error: creation.error };
  }

  const query = await client.apps.datastore.query({
    datastore: "tasks",
    expression: "#id = :id",
    expression_attributes: { "#id": "id" },
    expression_values: { ":id": "1" },
  });
  console.log(`query result: ${JSON.stringify(query, null, 2)}`);
  if (query.error) {
    return { error: query.error };
  }

  const modification = await client.apps.datastore.put({
    datastore: "tasks",
    item: { "id": "1", "title": "Make a phone call to Jim", "due": "Dec 18" },
  });
  console.log(`modification result: ${JSON.stringify(modification, null, 2)}`);
  if (modification.error) {
    return { error: modification.error };
  }

  const deletion = await client.apps.datastore.delete({
    datastore: "tasks",
    id: "1",
  });
  console.log(`deletion result: ${JSON.stringify(deletion, null, 2)}`);
  if (deletion.error) {
    return { error: deletion.error };
  }

  return { outputs: {} };
});
```

To run this function, let's create a simple workflow and its trigger. Save the following code as `workflow_and_trigger.ts`:

```typescript
import { DefineWorkflow } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "datastore-demo-workflow",
  title: "Datastore Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

import { def as Demo } from "./function.ts";
workflow.addStep(Demo, {});

import { Trigger } from "deno-slack-api/types.ts";
const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook",
  name: "Datastore Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {},
};
export default trigger;
```

Don't forget to add the workflow to `manifest.ts`:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { datastore as Tasks } from "./tasks.ts";
// Add this
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "nifty-capybara-954",
  description: "Datastore Example",
  icon: "assets/default_new_app_icon.png",
  datastores: [Tasks],
  workflows: [DemoWorkflow], // Add this
  botScopes: [
    "commands",
    // Necessary for accessing datastores
    "datastore:read",
    "datastore:write",
  ],
});
```

Lastly, create a new webhook trigger using the `workflow_and_trigger.ts` source code:

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   nifty-capybara-954 (dev) A04G9B1SFAB


⚡ Trigger created
   Trigger ID:   Ft04GPR8GMGT
   Trigger Type: webhook
   Trigger Name: Datastore Demo Trigger
   Webhook URL:  https://hooks.slack.com/triggers/T***/***/***
```

Now you can trigger the workflow just by sending an HTTP POST request. Before sending a request, make sure that you're running a `slack run` session in a terminal window.

```bash
$ curl -XPOST https://hooks.slack.com/triggers/T***/***/***
{"ok":true}%
```

On the `slack run` terminal window, you'll see the following console outputs:

```bash
2022-12-27 13:45:22 [info] [Fn04GSCL7DQC] (Trace=Tr04GHB2TXKQ) Function execution started for workflow function 'Datastore Demo Workflow'
2022-12-27 13:45:22 [info] [Wf04GPULB35Y] (Trace=Tr04GM0VNXKP) Execution started for workflow 'Datastore Demo Workflow'
2022-12-27 13:45:22 [info] [Wf04GPULB35Y] (Trace=Tr04GM0VNXKP) Executing workflow step 1 of 1
2022-12-27 13:45:23 [info] [Fn04GPR89U2F] (Trace=Tr04GM0VNXKP) Function execution started for app function 'Datastore demo'
creation result: {
  "ok": true,
  "datastore": "tasks",
  "item": {
    "id": "1",
    "title": "Make a phone call to Jim"
  }
}
query result: {
  "ok": true,
  "datastore": "tasks",
  "items": [
    {
      "id": "1",
      "title": "Make a phone call to Jim"
    }
  ]
}
modification result: {
  "ok": true,
  "datastore": "tasks",
  "item": {
    "due": "Dec 18",
    "id": "1",
    "title": "Make a phone call to Jim"
  }
}
deletion result: {
  "ok": true
}
2022-12-27 13:45:25 [info] [Fn04GPR89U2F] (Trace=Tr04GM0VNXKP) Function execution completed for function 'Datastore demo'
2022-12-27 13:45:26 [info] [Wf04GPULB35Y] (Trace=Tr04GM0VNXKP) Execution completed for workflow step 'Datastore demo'
2022-12-27 13:45:26 [info] [Fn04GSCL7DQC] (Trace=Tr04GHB2TXKQ) Function execution completed for function 'Datastore Demo Workflow'
2022-12-27 13:45:26 [info] [Wf04GPULB35Y] (Trace=Tr04GM0VNXKP) Execution completed for workflow 'Datastore Demo Workflow'
```

OK, that's it. You don't need this example app anymore. So let's clean it up by running the `slack uninstall` command.

```bash
$ slack uninstall
? Choose a workspace Choose a local development workspace
? Choose a local development workspace  seratch (dev)  T03E94MJU
   nifty-capybara-954 (dev) A04G9B1SFAB

⚠️  Danger zone
   App (A04G9B1SFAB) will be permanently deleted
   App (A04G9B1SFAB) will be uninstalled from dev (T03E94MJU)
   All triggers, workflows, and functions will be deleted
   All datastores for this app will be deleted
   Once you delete this app, there is no going back

? Are you sure you want to uninstall? Yes

🏠 Workspace Uninstall
   Uninstalled the app "nifty-capybara-954" from workspace "Acme Corp"

📚 App Manifest
   Deleted the app manifest for "nifty-capybara-954" from workspace "Acme Corp"

🏘️  Installed Workspaces
   There are no workspaces with the app installed
$
```

## Dev vs Prod Datastores

When you deploy an app by `slack deploy` command, the Slack infra automatically creates the datastores dedicated to the "prod" app. No data is shared among "dev" versions and deployed "prod" app. In other words, any data operations with "dev" version of your app never affect your "prod" app's data.

With that being said, when your local CLI has permission to deploy the "prod" app, **your `slack datastore` commands have access to the production datastores** too. So, please be extremely careful when you use `slack datastore` commands.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Save data and run queries toward Slack datastores via CLI commands
* Save data and run queries toward Slack datastores via function code
* Delete an unnecessary app using `slack uninstall` command

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/05_Datastores

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: