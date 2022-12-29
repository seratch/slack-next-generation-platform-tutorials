import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "sharp-chipmunk-480",
  description: "Modal interaction demo",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow], // Add this
  outgoingDomains: [],
  botScopes: ["commands"], // At least one bot scope is required here
});
