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
    "chat:write.public",
    "channels:read", // required for the "channel_created" event trigger
  ],
});
