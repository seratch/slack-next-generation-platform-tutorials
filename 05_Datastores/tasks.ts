import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

// Refer to https://api.slack.com/future/datastores for details
export const datastore = DefineDatastore({
  name: "tasks",
  // The primary key's type must be string
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string, required: true },
    title: { type: Schema.types.string, required: true },
    description: { type: Schema.types.string }, // optional
    due: { type: Schema.types.string }, // optional
  },
});
