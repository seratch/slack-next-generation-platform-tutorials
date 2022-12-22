// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
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

Deno.test("Return the capitalized input text as-is when capitalize: true", async () => {
  const inputs = { text: "Hi there!", capitalize: true };
  const { outputs } = await handler(createContext({ inputs }));
  assertEquals(outputs?.text, "HI THERE!");
});
