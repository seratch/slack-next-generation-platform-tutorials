In this tutorial, you'll learn how to write unit tests for your [Slack's next-generation platform](https://api.slack.com/future) app functions.

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
$ cd recursing-anteater-962
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

## What You'll Do

You'll add three functions and write tests for all of them:

- [`echo.ts`](https://github.com/seratch/slack-next-generation-platform-tutorials/blob/main/04_Unit_Testing/echo.ts),
  which may convert an input text and return the result in outputs
- [`my_send_message.ts`](https://github.com/seratch/slack-next-generation-platform-tutorials/blob/main/04_Unit_Testing/my_send_message.ts),
  which posts a message in a Slack channel
- [`translate.ts`](https://github.com/seratch/slack-next-generation-platform-tutorials/blob/main/04_Unit_Testing/translate.ts),
  which translates a given text into a different language using DeepL's API

Usually, you'll add a workflow and trigger to run your app, but this tutorial focuses on unit testing for functions. Thus, you don't necessarily have to add any workflows and triggers this time.

If you want to make sure if your functions work in connected Slack workspaces, you can add a workflow that run them. Refer to my past tutorials to learn how to add workflows and triggers:

- [Define the workflow/trigger for `my_send_message.ts`](https://dev.to/seratch/slack-next-gen-platform-custom-functions-3pi8)
- [Define the workflow/trigger for `translate.ts`](https://dev.to/seratch/slack-next-gen-platform-external-api-calls-1i76)

Also, if you're not yet familiar with writing custom functions, I'd highly recommend reading my ["Custom Functions" tutorial](https://dev.to/seratch/slack-next-gen-platform-custom-functions-3pi8) before going through this tutorial.

## Add `echo.ts` and its Tests

Let's start with a quite simple function `echo`, which returns an input text as-is in returned `outputs`. In the case where the function caller passes `calipalize: true` in `inputs`, the function can transform the text.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const def = DefineFunction({
  callback_id: "echo",
  title: "Echo inputs",
  source_file: "echo.ts",
  input_parameters: {
    properties: {
      text: { type: Schema.types.string },
      capitalize: { type: Schema.types.boolean },
    },
    required: ["text"],
  },
  output_parameters: {
    properties: { text: { type: Schema.types.string } },
    required: ["text"],
  },
});

export default SlackFunction(def, ({ inputs }) => {
  const { text, capitalize } = inputs;
  if (capitalize) {
    return { outputs: { text: text.toUpperCase() } };
  } else {
    return { outputs: { text } };
  }
});
```

#### Having Aliases in `import_map.json`

Before moving on to the test code topic, let me share an interesting technique in Deno coding.

Since [the Deno VS Code extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) helps you quickly resolve the URL, you may have something like this a lot already. It's totally fine! but when you notice a lot of imports for the same module in your project, you may think, "Would it be possible to avoid repeating this?". To manage the dependency versions in a single configuration, you can configure `import_map.json`. Note that your `deno.jsonc` must have `"importMap": "import_map.json"` in it (`slack create` command does this for you).

To avoid repeating https://deno.land/std@0.174.0/ with its version in your source code, let's add a new line to `import_map.json`:

```json
{
  "imports": {
    "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@1.4.3/",
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@1.5.0/",
    "std/": "https://deno.land/std@0.174.0/"
}
```

With this, you can import the std module just by "std/_" instead of "https://deno.land/std@0.174.0/_".

From here, I'll use a few aliases for imports in this tutorial. The complete `import_map.json` for this tutorial looks like below.

```json
{
  "imports": {
    "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@1.4.3/",
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@1.5.0/",
    "mock-fetch/": "https://deno.land/x/mock_fetch@0.3.0/",
    "std/": "https://deno.land/std@0.170.0/"
  }
}
```

Slack's next-generation platform templates encourage developers to use hyphen-separated names for the aliases of the URLs. So, this tutorial follows the naming convention for consistency. But, if you want to use snake-cased ones such as `mock_fetch` instead of `mock-fetch`, such names actually work without issues, too.

#### Write Your First Deno Test Code

Now that the test target is ready, let's write your first Deno test code. Create a new file named `echo_test.ts` with the following content:

```typescript
// Add "std/": "https://deno.land/std@0.173.0/" to "imports" in ./import_map.json
import { assertEquals } from "std/testing/asserts.ts";
import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
// `createContext` utility helps you build valid arguments for functions
const { createContext } = SlackFunctionTester("my-function");

import handler from "./echo.ts";

// Define a test pattern using Deno.test utility
// The method accept label and test function
// When you install VS Code Deno extension, you can run each test pattern on the editor UI
Deno.test("Return the input text as-is", async () => {
  const inputs = { text: "Hi there!" };
  const { outputs } = await handler(createContext({ inputs }));
  assertEquals(outputs?.text, "Hi there!");
});
```

In this code, the only Slack next-generation app-specific parts are `SlackFunctionTester` and its `createContext` utility. This utility helps you easily build valid arguments for a function. Since the utility is [small and simple](https://github.com/slackapi/deno-slack-sdk/tree/main/src/functions/tester), it does not prevent you from having various test patterns. You can pass any test data for `inputs`, `env`, `token`, and others.

Deno testing is so simple. You don't need to add any other configuration files. Also, you can usually run tests just by hitting `deno test`.

The last tip is that you can pass the file path to the command if you want to run only a single test. For example, in the case of `echo_test.ts`, you can run `deno test echo_test.ts`.

```bash
$ deno test echo_test.ts
running 1 test from ./echo_test.ts
Return the input text as-is ... ok (6ms)

ok | 1 passed | 0 failed (43ms)
```

It successfully passed :+1:

When you add a new test pattern, all you need to do is just to append another `Deno.test` part in the same file. The following test pattern verifies the `capitalize` option works as expected:

```typescript
Deno.test("Return the capitalized input text as-is when capitalize: true", async () => {
  const inputs = { text: "Hi there!", capitalize: true };
  const { outputs } = await handler(createContext({ inputs }));
  assertEquals(outputs?.text, "HI THERE!");
});
```

Rerun the same test code. You will see a bit different output this time:

```bash
$ deno test echo_test.ts
running 2 tests from ./echo_test.ts
Return the input text as-is ... ok (5ms)
Return the capitalized input text as-is when capitalize: true ... ok (4ms)

ok | 2 passed | 0 failed (48ms)
```

It passed again (as expected). Let's see how different when it fails. Modify the last line of the second test this way:

```typescript
assertEquals(outputs?.text, "HI THERE!!");
```

When running the test again, the second test suite should fail as below:

```bash
$ deno test echo_test.ts
running 2 tests from ./echo_test.ts
Return the input text as-is ... ok (5ms)
Return the capitalized input text as-is when capitalize: true ... FAILED (7ms)

 ERRORS

Return the capitalized input text as-is when capitalize: true => ./echo_test.ts:17:6
error: AssertionError: Values are not equal:

    [Diff] Actual / Expected

-   HI THERE!
+   HI THERE!!

  throw new AssertionError(message);
        ^
    at assertEquals (https://deno.land/std@0.170.0/testing/asserts.ts:190:9)
    at file:///path-to-project/echo_test.ts:20:3

 FAILURES

Return the capitalized input text as-is when capitalize: true => ./echo_test.ts:17:6

FAILED | 1 passed | 1 failed (51ms)

error: Test failed
```

Through this section, you've learned most of the basics of Deno testing already. That said, if you want to learn more about testing for Deno apps, please check [Deno's manual page](https://deno.land/manual/basics/testing) for details.

## Add `my_send_message.ts` and its Tests

The second test target may be a bit cumbersome. It makes HTTP requests to Slack API endpoints. In unit testing code, you have to simulate the communications with the APIs.

But not to worry! A fantastic 3rd party package, [mock_fetch library](https://deno.land/x/mock_fetch) helps you write the tests quickly.

Let's start with adding the test target to your project. Create a new file named `my_send_message.ts` and save the following code. If you've already read my ["Custom Functions" tutorial](https://dev.to/seratch/slack-next-gen-platform-custom-functions-3pi8), you should be already familiar with the code.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const def = DefineFunction({
  callback_id: "my_send_message",
  title: "My SendMessage",
  source_file: "my_send_message.ts",
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

Let's see how it works without mocks. Create a new file named `my_send_message_test.ts`:

```typescript
import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import { assertEquals } from "std/testing/asserts.ts";
import handler from "./my_send_message.ts";

const { createContext } = SlackFunctionTester("my-function");

Deno.test("Send a message successfully", async () => {
  const inputs = { channel_id: "C111", message: "Hi there!" };
  const token = "xoxb-valid";
  const { outputs, error } = await handler(createContext({ inputs, token }));
  assertEquals(error, undefined);
  assertEquals(outputs, { ts: "1111.2222" });
});
```

Run the test and see how it fails:

```bash
$ deno test my_send_message_test.ts
running 1 test from ./my_send_message_test.ts
Send a message successfully ... FAILED (7ms)

 ERRORS

Send a message successfully => ./my_send_message_test.ts:41:6
error: PermissionDenied: Requires net access to "slack.com", run again with the --allow-net flag
    const resp = await fetch(url, {
                       ^
    at opFetch (deno:ext/fetch/26_fetch.js:73:16)
    at mainFetch (deno:ext/fetch/26_fetch.js:225:61)
    at deno:ext/fetch/26_fetch.js:470:11
    at new Promise (<anonymous>)
    at fetch (deno:ext/fetch/26_fetch.js:433:20)
    at BaseSlackAPIClient.apiCall (https://deno.land/x/deno_slack_api@1.5.0/base-client.ts:38:24)
    at apiCallHandler (https://deno.land/x/deno_slack_api@1.5.0/api-proxy.ts:11:23)
    at Proxy.APIProxy.objectToProxy (https://deno.land/x/deno_slack_api@1.5.0/api-proxy.ts:43:14)
    at AsyncFunction.<anonymous> (file:///path-to-project/my_send_message.ts:23:38)
    at handlerModule (https://deno.land/x/deno_slack_sdk@1.4.3/functions/slack-function.ts:44:28)

 FAILURES

Send a message successfully => ./my_send_message_test.ts:41:6

FAILED | 0 passed | 1 failed (44ms)

error: Test failed
```

As you saw, the code performs an HTTP request toward a slack.com endpoint. Thus, the `--allow-net` option is necessary if you want to run the code as-is.

> error: PermissionDenied: Requires net access to "slack.com", run again with
> the --allow-net flag

Checking the behavior of `--allow-net` option is not our goal here, but let's see how it fails.

```bash
$ deno test --allow-net my_send_message_test.ts
running 1 test from ./my_send_message_test.ts
Send a message successfully ...
------- output -------
chat.postMessage result: {
  "ok": false,
  "error": "invalid_auth"
}
----- output end -----
Send a message successfully ... FAILED (293ms)

 ERRORS

Send a message successfully => ./my_send_message_test.ts:41:6
error: AssertionError: Values are not equal:

    [Diff] Actual / Expected

-   "Failed to post a message due to invalid_auth"
+   undefined

  throw new AssertionError(message);
        ^
    at assertEquals (https://deno.land/std@0.170.0/testing/asserts.ts:190:9)
    at file:///path-to-project/my_send_message_test.ts:45:3

 FAILURES

Send a message successfully => ./my_send_message_test.ts:41:6

FAILED | 0 passed | 1 failed (333ms)

error: Test failed
```

Since we don't set a valid product token for the API call (the test code sets `"xoxb-valid"`, which is obviously incorrect), the `chat.postMessage` API call failed as expected.

To make the test pattern successful, we need stub/mock instead of having real HTTP requests in tests. As I mentioned earlier, let's use [mock_fetch library](https://deno.land/x/mock_fetch) for it. After calling `mf.install()`, defining mock handlers such as `mf.mock("POST@/api/chat.postMessage", handler)` works for all the `fetch` function calls during the test. Of course, this global object replacement does not affect your production code at all.

```typescript
// Add "mock-fetch/": "https://deno.land/x/mock_fetch@0.3.0/" to "imports" in ./import_map.json
import * as mf from "mock-fetch/mod.ts";
import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import { assertEquals } from "std/testing/asserts.ts";
import handler from "./my_send_message.ts";

// After this method call,
// all `globalThis.fetch` calls will be replaced with mock behaviors
mf.install();

// Handles chat.postMessage API calls
mf.mock("POST@/api/chat.postMessage", async (args) => {
  const params = await args.formData();
  const authHeader = args.headers.get("Authorization");
  if (authHeader !== "Bearer xoxb-valid") {
    // invalid token pattern
    const body = JSON.stringify({ ok: false, error: "invalid_auth" });
    return new Response(body, { status: 200 });
  }
  if (params.get("channel") !== "C111") {
    // unknown channel
    const body = JSON.stringify({ ok: false, error: "channel_not_found" });
    return new Response(body, { status: 200 });
  }
  const body = JSON.stringify({ ok: true, ts: "1111.2222" });
  return new Response(body, { status: 200 });
});

// Utility for generating valid arguments
const { createContext } = SlackFunctionTester("my-function");

Deno.test("Send a message successfully", async () => {
  const inputs = { channel_id: "C111", message: "Hi there!" };
  const token = "xoxb-valid";
  const { outputs, error } = await handler(createContext({ inputs, token }));
  assertEquals(error, undefined);
  assertEquals(outputs, { ts: "1111.2222" });
});
```

Rerun the test. You'll see it succeeds as below:

```bash
$ deno test --allow-net my_send_message_test.ts
running 1 test from ./my_send_message_test.ts
Send a message successfully ...
------- output -------
Bearer xoxb-valid
chat.postMessage result: {
  "ok": true,
  "ts": "1111.2222"
}
----- output end -----
Send a message successfully ... ok (9ms)

ok | 1 passed | 0 failed (47ms)
```

Let's add two more test patterns. The following test suites should work as-is.

```typescript
Deno.test("Fail to send a message with invalid token", async () => {
  const inputs = { channel_id: "C111", message: "Hi there!" };
  const token = "xoxb-invalid";
  const { outputs, error } = await handler(createContext({ inputs, token }));
  assertEquals(error, "Failed to post a message due to invalid_auth");
  assertEquals(outputs, undefined);
});

Deno.test("Fail to send a message to an unknown channel", async () => {
  const inputs = { channel_id: "D111", message: "Hi there!" };
  const token = "xoxb-valid";
  const { outputs, error } = await handler(createContext({ inputs, token }));
  assertEquals(error, "Failed to post a message due to channel_not_found");
  assertEquals(outputs, undefined);
});
```

When you run the test again, the outputs should be like the below:

```bash
$ deno test my_send_message_test.ts
running 3 tests from ./my_send_message_test.ts
Send a message successfully ...
------- output -------
chat.postMessage result: {
  "ok": true,
  "ts": "1111.2222"
}
----- output end -----
Send a message successfully ... ok (10ms)
Fail to send a message with invalid token ...
------- output -------
chat.postMessage result: {
  "ok": false,
  "error": "invalid_auth"
}
----- output end -----
Fail to send a message with invalid token ... ok (6ms)
Fail to send a message to an unknown channel ...
------- output -------
chat.postMessage result: {
  "ok": false,
  "error": "channel_not_found"
}
----- output end -----
Fail to send a message to an unknown channel ... ok (5ms)

ok | 3 passed | 0 failed (59ms)
```

### Want to remove `console.log()`?

Although Slack's official examples suggest using `console.log()` for simple logging, you may dislike lots of `------- output -------` outputs in test results. If yes, switching to [Deno's standard logger](https://deno.land/std/log/mod.ts) and passing the log level in `env` can be a simple solution.

Here is a quick example. You can add `logger.ts`:

```typescript
// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import * as log from "std/log/mod.ts";

// Simple logger using std modules
export const Logger = function (
  level?: string,
): log.Logger {
  const logLevel: log.LevelName = level === undefined
    ? "DEBUG" // the default log level
    : level as log.LevelName;
  // Note that this method call make global effects
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler(logLevel),
    },
    loggers: {
      default: {
        level: logLevel,
        handlers: ["console"],
      },
    },
  });
  return log.getLogger();
};
```

And then, you can replace the `console.log()` code in `my_send_messages.ts`:

```typescript
import { Logger } from "./logger.ts";

export default SlackFunction(def, async ({ inputs, client, env }) => {
  const logger = Logger(env.LOG_LEVEL);
  const response = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: inputs.message,
  });
  // Replace console.log() here
  logger.debug(`chat.postMessage result: ${JSON.stringify(response, null, 2)}`);
});
```

Lastly, you can modify the test code:

```typescript
Deno.test("Send a message successfully", async () => {
  const inputs = { channel_id: "C111", message: "Hi there!" };
  const token = "xoxb-valid";
  // Pass the env to set log level
  const env = { LOG_LEVEL: "INFO" };
  const { outputs, error } = await handler(
    createContext({ inputs, env, token }),
  );
  assertEquals(error, undefined);
  assertEquals(outputs, { ts: "1111.2222" });
});
```

With this, the `console.log()` outputs disappear from the stdout.

In the future, the Deno SDK may provide a more sophisticated solution for custom logging. But, until then, the above approach can be helpful.

## Add `translate.ts` and its Tests

The last test target is a function that performs an external API call. There is no significant difference from the second one. So let's quickly go through it.

Create a new file named `translate.ts` with the following source code. If you've already read my ["External API Calls" tutorial](https://dev.to/seratch/slack-next-gen-platform-external-api-calls-1i76), you may be already familiar with the code.

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

// The metadata definition for the translator function
export const def = DefineFunction({
  callback_id: "translate",
  title: "Translate",
  description: "Translate text using DeepL's API",
  source_file: "translate.ts",
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

Here is the corresponding test code:

```typescript
// Add "mock-fetch/": "https://deno.land/x/mock_fetch@0.3.0/" to "imports" in ./import_map.json
import * as mf from "mock-fetch/mod.ts";
import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import { assertEquals } from "std/testing/asserts.ts";
import handler from "./translate.ts";

// After this method call,
// all `globalThis.fetch` calls will be replaced with mock behaviors
mf.install();

// Handles DeepL's text translation API calls
mf.mock("POST@/v2/translate", async (args) => {
  const params = await args.formData();
  if (params.get("auth_key") !== "valid-token") {
    // Invalid auth_key
    return new Response("Unauthorized", { status: 401 });
  }
  // Successful pattern
  const body = JSON.stringify({
    translations: [{ detected_source_language: "EN", text: "こんにちは！" }],
  });
  return new Response(body, { status: 200 });
});

const { createContext } = SlackFunctionTester("my-function");

Deno.test("Translate text successfully", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  const env = { DEEPL_AUTH_KEY: "valid-token" };
  const { outputs } = await handler(createContext({ inputs, env }));
  assertEquals(outputs, { translated_text: "こんにちは！" });
});

Deno.test("Fail to continue if DEEPL_AUTH_KEY is missing", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  //intentionally empty
  const env = {};
  const { outputs, error } = await handler(createContext({ inputs, env }));
  assertEquals(
    error,
    "DEEPL_AUTH_KEY env value is missing! Please add `.env` file for `slack run`. If you've already deployed this app, `slack env add DEEPL_AUTH_KEY (value)` command configures the env variable for you.",
  );
  assertEquals(outputs, undefined);
});

Deno.test("Fail to traslate text with an invalid token", async () => {
  const inputs = { text: "Hello!", target_lang: "ja" };
  const env = { DEEPL_AUTH_KEY: "invalid-token" };
  const { outputs, error } = await handler(createContext({ inputs, env }));
  assertEquals(error, "DeepL API error (status: 401, body: Unauthorized)");
  assertEquals(outputs, undefined);
});
```

The only difference is that `mf.mock("POST@/v2/translate", handler)` part.

You may wonder if it's feasible to set the domain of an endpoint in the `mf.mock()` method call. As far as I know, it's not yet supported on the [mock_fetch library](https://deno.land/x/mock_fetch) side as of this writing. So, if you have conflicts on the path among a few domains, checking the `url` in arguments to dispatch requests is a reasonable workaround.

```typescript
mf.mock("POST@/v2/translate", (args) => {
  console.log(args.url);
```

### Want to Write Tests for Interactions?

You may want to write some tests for modal/button interactions. Unfortunately, there is no elegant way to write such tests as of this writing.

I've published test code for the code that opens a new modal and it works: https://github.com/slack-samples/deno-message-translator/blob/main/functions/configure_test.ts

However, as for `view_submission`/`view_closed`/`block_actions` request patterns after opening the modal, honestly, I myself am still exploring the best practices for unit testing.

When I figure out the best practices for those patterns (or the Deno SDK provides some solutions), I will update the documents under https://api.slack.com/future (or write something on dev.to website).

## Wrapping Up

You've learned the following points with this hands-on tutorial:

- Write Deno test code for your functions
- Prepare `inputs`, `env`, and so on for function testing
- Use mock objects for `fetch` function calls
- Customize `import_map.json` to have aliases for module paths

The complete project is available at https://github.com/seratch/slack-next-generation-platform-tutorials/tree/main/04_Unit_Testing

I hope you enjoy this tutorial! As always, if you have any comments or feedback, please feel free to let me know on Twitter ([@seratch](https://twitter.com/seratch)) or elsewhere I can check out!

Happy hacking with Slack's next-generation platform :rocket:
