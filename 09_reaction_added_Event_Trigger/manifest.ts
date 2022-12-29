import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "distracted-bison-253",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "reactions:read", // required for the "reaction_added" event trigger
    "channels:history", // will use in custom functions later
    "channels:join", // will use in custom functions later
  ],
});
