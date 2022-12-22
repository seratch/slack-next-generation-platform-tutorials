import { Manifest } from "deno-slack-sdk/mod.ts";
// Import the workflow you've just created
import { workflow as CustomFunctionDemo } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "affectionate-panther-654",
  description: "Hello World!",
  icon: "assets/default_new_app_icon.png",
  // Add the imported workflow here
  workflows: [CustomFunctionDemo],
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
