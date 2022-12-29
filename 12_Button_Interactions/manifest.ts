import { Manifest } from "deno-slack-sdk/mod.ts";
import { workflow as InteractiveBlocksDemo } from "./interactive_blocks_demo.ts";
import { workflow as InteractiveMessageDemo } from "./interactive_message_demo.ts";

export default Manifest({
  name: "stoic-wolf-344",
  description: "Demo workflow",
  icon: "assets/default_new_app_icon.png",
  workflows: [InteractiveBlocksDemo, InteractiveMessageDemo],
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
