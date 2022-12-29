import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as MainWorkflow } from "./main_workflow.ts";
// Add this
import { workflow as ConfiguratorWorkflow } from "./webhook_configurator.ts";
import { workflow as ModalConfiguratorWorkflow } from "./modal_configurator.ts";

export default Manifest({
  name: "vibrant-orca-513",
  description: "Configurator Demo",
  icon: "assets/default_new_app_icon.png",
  workflows: [MainWorkflow, ConfiguratorWorkflow, ModalConfiguratorWorkflow], // Add this
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    // We're going to use "reaction_added" event trigger
    "reactions:read",
    // Required for `configure.ts`
    "triggers:read",
    "triggers:write",
    "channels:join",
  ],
});
