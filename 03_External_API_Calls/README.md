In this tutorial, you'll learn how to make **external API calls** inside your own "function" that runs on [Slack's next-generation platform](https://api.slack.com/future) app.

Specifically, you'll build a custom function that translates given text into a different language by leveraging [DeepL's text translation API](https://www.deepl.com/docs-api/translate-text/).

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
$ cd zealous-elk-261
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

## Create a Workflow and its Link Trigger

In this tutorial, I will skip the basics of custom functions. If you haven't read my ["Custom Functions" tutorial](https://dev.to/seratch/slack-next-gen-platform-custom-functions-3pi8), checking the tutorial in advance is highly recommended.

In this tutorial's instructions, you'll add the following two files to the blank project:

* `workflow_and_trigger.ts`, which defines a workflow and its link trigger
* `function.ts`, which defines a custom function that performs external API calls

Let's start by creating `workflow_and_trigger.ts` with the minimum definition as below. We will add three function steps to the workflow later on.

```typescript
// -------------------------
// Workflow definition
// -------------------------
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

export const workflow = DefineWorkflow({
  callback_id: "translator-workflow",
  title: "Translator Workflow",
  input_parameters: {
    properties: {
      // The channel to post the translation result
      channel_id: { type: Schema.slack.types.channel_id },
      // Need this to open a form
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["channel_id", "interactivity"],
  },
});

// TODO: Add function steps to the workflow

// -------------------------
// Trigger Definition
// -------------------------
import { Trigger } from "deno-slack-api/types.ts";

// This trigger starts the workflow when an end-user clicks the link
const trigger: Trigger<typeof workflow.definition> = {
  type: "shortcut",
  name: "Translator Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {
    // The channel where an end-user clicks the link
    channel_id: { value: "{{data.channel_id}}" },
    // This input is required for opening a form within the workflow
    interactivity: { value: "{{data.interactivity}}" },
  },
};

// As long as the trigger object is default exported,
// you can generate a trigger with this code:
// $ slack triggers create --trigger-def ./workflow_and_trigger.ts
export default trigger;
```

Before you forget, add the workflow to `manifest.ts`. Also, since your function will send HTTP requests towards external API endpoints, `api-free.deepl.com` (only when you go with their free tier) and `api.deepl.com` must be added to `outgoingDomains` as well.

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as TranslatorWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "zealous-elk-261",
  description: "Translate text in Slack",
  icon: "assets/default_new_app_icon.png",
  // Add your workflow to this list
  workflows: [TranslatorWorkflow],
  // All the domains except slack.com must be listed
  outgoingDomains: [
    "api-free.deepl.com", // only for free tier usage
    "api.deepl.com",
  ],
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
   zealous-elk-261 (dev) A04DHV08MPF
```

If everything goes well, you will get a link trigger to start your demo workflow:

```bash
$ slack triggers create --trigger-def ./workflow_and_trigger.ts
? Choose an app  seratch (dev)  T03E94MJU
   zealous-elk-261 (dev) A04DHV08MPF

⚡ Trigger created
   Trigger ID:   Ft04DEBXXXX
   Trigger Type: shortcut
   Trigger Name: Translator Trigger
   URL: https://slack.com/shortcuts/Ft04DEBXXXXX/YYYY
```

You can share the link in the connected Slack workspace by posting a message with the URL. You'll see a button to click as the attachment of the message.

## Add Three Functions to the Workflow

Your workflow and its link trigger are now ready for running. However, the workflow does not have any meaningful functions. It's time to add three functions, including your custom one, to the workflow:
1. Add the built-in `OpenForm` to collect an end-user's inputs (the original text and the language to translate into)
1. Add your custom function `translate`, which translates the given text
1. Add the built-in `SendMessage` to post the result in the channel

The built-in ones are already available to use. The last remaining task is to add the custom `translate` function. Create a new file named `function.ts` with the following content:

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";

// The metadata definition for the translator function
export const def = DefineFunction({
  callback_id: "translate",
  title: "Translate",
  description: "Translate text using DeepL's API",
  // This example code uses a 3rd party module "deno_slack_source_file_resolver"
  // to automatically resolve the relative path of this source file.
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      text: { type: Schema.types.string },
      source_lang: { type: Schema.types.string }, // optional
      target_lang: { type: Schema.types.string },
    },
    required: ["text", "target_lang"],
  },
  output_parameters: {
    properties: { translated_text: { type: Schema.types.string } },
    required: ["translated_text"],
  },
});

export default SlackFunction(def, async ({ inputs, env }) => {
  // When running a dev version of your app,
  // placing `.env` file with variables is the way to configure `env`.
  // As for the deployed prod one, you need to run
  // `slack env add DEEPL_AUTH_KEY (value)` before running the app's workflow.
  const authKey = env.DEEPL_AUTH_KEY;
  if (!authKey) {
    // Since it's impossible to continue in this case, this function returns an error.
    const error =
      "DEEPL_AUTH_KEY env value is missing! Please add `.env` file for `slack run`. If you've already deployed this app, `slack env add DEEPL_AUTH_KEY (value)` command configures the env variable for you.";
    return { error };
  }
  // Build an HTTP request towards DeepL's text translation API
  const subdomain = authKey.endsWith(":fx") ? "api-free" : "api";
  const deeplApiUrl = `https://${subdomain}.deepl.com/v2/translate`;
  const body = new URLSearchParams();
  body.append("auth_key", authKey);
  body.append("text", inputs.text);
  if (inputs.source_lang) { // this input is optional
    body.append("source_lang", inputs.source_lang.toUpperCase());
  }
  body.append("target_lang", inputs.target_lang.toUpperCase());
  // When there is no Deno library to perform external API calls,
  // simply using the built-in `fetch` function is recommended.
  const response = await fetch(deeplApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });
  const status = response.status;
  if (status != 200) {
    const body = await response.text();
    const error = `DeepL API error (status: ${status}, body: ${body})`;
    return { error };
  }
  // When the translation succeeds, the response body is JSON data.
  const result = await response.json();
  if (!result || result.translations.length === 0) {
    const error = `Translation failed: ${JSON.stringify(result)}`;
    return { error };
  }
  // When it's successful, the outputs must include "translated_text" as it's required.
  return { outputs: { translated_text: result.translations[0].text } };
});
```

This function requires [a valid DeepL API auth key](https://support.deepl.com/hc/en-us/articles/360020695820). If you don't have a DeepL developer account yet (note that a developer account is different from the typical user account), visit [their registration page](https://www.deepl.com/pro#developer) to create a new one. Once your account is activated, you can get your "Authentication Key for DeepL API" on [your DeepL developer account page](https://www.deepl.com/account/summary).

You may desire to write the auth key in the code (because it's so easy!), but we don't recommend hard-coding it in the source code from a security perspective. Alternatively, you can use `env` variables to pass credentials and confidential information.

When you run a "(dev)" version of your app using `slack run` command, you can place `.env` file in your project's root directory. Create `.env` file and save the following content in it:

```
DEEPL_AUTH_KEY=[your auth key here]
```

When you deploy the prod version of this app (by running `slack deploy` command), you don't use `.env`. Instead, you can run `slack env add DEEPL_AUTH_KEY [your auth key here]` right after the deployment.

Lastly, let's add a few function steps to the workflow. Open `workflow_and_trigger.ts` file again, and then add the following code:

```typescript
// Receive the original text and which language to translate into
const formStep = workflow.addStep(Schema.slack.functions.OpenForm, {
  title: "Run DeepL Translator",
  // To use this built-in function,
  // either a preceding function or the trigger of workflow
  // must provide interactivity in inputs.
  interactivity: workflow.inputs.interactivity,
  submit_label: "Translate",
  // The fields are similar to Block Kit, but some differences exist.
  // Refer to https://api.slack.com/future/forms#type-parameters for details.
  fields: {
    elements: [
      {
        name: "text",
        title: "Original Text",
        type: Schema.types.string,
      },
      {
        name: "target_lang",
        title: "Target Language",
        type: Schema.types.string,
        description: "Select the language to translate into",
        enum: [
          "English",
          "Japanese",
          "Korean",
          "Chinese",
          "Italian",
          "French",
          "Spanish",
        ],
        choices: [
          { value: "en", title: "English" },
          { value: "ja", title: "Japanese" },
          { value: "kr", title: "Korean" },
          { value: "zh", title: "Chinese" },
          { value: "it", title: "Italian" },
          { value: "fr", title: "French" },
          { value: "es", title: "Spanish" },
        ],
        default: "en",
      },
    ],
    required: ["text", "target_lang"],
  },
});

// Import your translator function and add it to this workflow
import { def as translate } from "./function.ts";
const translateStep = workflow.addStep(translate, {
  text: formStep.outputs.fields.text,
  target_lang: formStep.outputs.fields.target_lang,
});

// Post the translation result using the built-in message function
workflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: workflow.inputs.channel_id,
  message:
    `>${formStep.outputs.fields.text}\n${translateStep.outputs.translated_text}`,
});
```

You may still be unfamiliar with the built-in `OpenForm` function. Don't worry about it for now! Just using the form as an end-user in Slack UI should be very intuitive. Contrarily, there may be a few things to learn when you build uour own forms. To guide you on how to develop it, I'll publish another article on how to create forms soon. Stay tuned!

Now that the workflow is complete let's start with the link trigger. When you click it, you'll see a popup modal form like the one below.

If you're a non-English speaker, write a sentence in a different language and select "English" as the target language. If you communicate only in English, put some English sentence and select a different language that you're curious.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/5960d76b-447f-8f89-e854-e13112a9afce.png" width=500 />

Once you submit the original text and the target language, the translation result will be posted shortly. If nothing happens, double-check that you have an active `slack run` command session. Also, you may receive a DM from @Slackbot if the workflow fails for some reason.

<img src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/19163/00827773-c9fd-e4dd-5d99-4dbad0640bfa.png" width=500 />

## More Sophisticated Translator App

If you're looking for a more sophisticated translator app, take a look at the official sample app I've recently published.

https://github.com/slack-samples/deno-message-translator

How does it work? When an end-user adds a national flag emoji reaction to a channel message, the app translates the text into the language associated with the emoji and posts the results in its thread.

<img src="https://user-images.githubusercontent.com/19658/206638194-6eff88fa-05c1-4308-a180-0a547890aab6.png">

I do understand there may be different opinions on the relations between national flags and languages. If that's the case for you, changing the emoji mapping rules is possible by adjusting the relevant source code in the app.

## Wrapping Up

You've learned the following points with this hands-on tutorial:

* Create a function that performs external API calls
* Enable external domain accesses in `manifest.ts`
* Add env variables for workflows and functions

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/03_External_API_Calls

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket: