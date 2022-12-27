import { Manifest } from "deno-slack-sdk/mod.ts";
// Add this
import { workflow as DemoWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "objective-fox-22",
  description: "Scheduled Trigger Example",
  icon: "assets/default_new_app_icon.png",
  workflows: [DemoWorkflow], // Add this
  botScopes: ["commands"],
});
