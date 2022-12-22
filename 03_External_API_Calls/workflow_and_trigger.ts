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

// Receive the original text and which language to translate into
const formStep = workflow.addStep(Schema.slack.functions.OpenForm, {
  title: "Run DeepL Translator",
  // To use this built-in function,
  // either a preceding function or the trigger of workflow
  // must provide interactivity in inputs.
  interactivity: workflow.inputs.interactivity,
  submit_label: "Translate",
  // The fieldes are similar to Block Kit but there are some differences.
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

// Import your tranlator function and add it to this workflow
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
