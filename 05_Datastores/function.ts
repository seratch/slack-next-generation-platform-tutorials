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