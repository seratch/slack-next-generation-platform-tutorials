import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "frosty-mink-263",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow], // Add this
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
