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
