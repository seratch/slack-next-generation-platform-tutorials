import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as TranslatorWorkflow } from "./workflow_and_trigger.ts";

export default Manifest({
  name: "zealous-elk-261",
  description: "Translate text in Slack",
  icon: "assets/default_new_app_icon.png",
  workflows: [TranslatorWorkflow],
  // All the domains except slack.com must be listed
  outgoingDomains: [
    "api-free.deepl.com", // only for free tier usage
    "api.deepl.com",
  ],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
