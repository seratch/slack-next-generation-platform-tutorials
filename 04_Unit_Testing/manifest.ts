import { Manifest } from "deno-slack-sdk/mod.ts";

export default Manifest({
  name: "recursing-anteater-962",
  description: "Unit Testing Example",
  icon: "assets/default_new_app_icon.png",
  workflows: [],
  outgoingDomains: [],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
