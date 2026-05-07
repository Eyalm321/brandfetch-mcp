import { z } from "zod";
import { listConfiguredUsers } from "../client.js";

export const utilityTools = [
  {
    name: "brandfetch_list_users",
    description:
      "List the configured Brandfetch account identifiers known to this server. Useful for discovering valid values for the 'user' parameter on other tools.",
    inputSchema: z.object({}),
    handler: async () => {
      return { users: listConfiguredUsers() };
    },
  },
];
