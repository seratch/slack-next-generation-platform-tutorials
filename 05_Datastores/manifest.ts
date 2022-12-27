import { Manifest } from "deno-slack-sdk/mod.ts";
import { datastore as Tasks } from "./tasks.ts";
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "nifty-capybara-954",
  description: "Datastore Example",
  icon: "assets/default_new_app_icon.png",
  datastores: [Tasks],
  workflows: [DemoWorkflow],
  botScopes: [
    "commands",
    // Necessary for accessing datastores
    "datastore:read",
    "datastore:write",
  ],
});
