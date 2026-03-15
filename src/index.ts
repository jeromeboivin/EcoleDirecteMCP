/**
 * EcoleDirecte MCP Server — stdio entrypoint.
 *
 * Initializes the auth subsystem, attempts session restore, then starts
 * the MCP server on stdin/stdout.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { EdHttpClient } from "./ecoledirecte/http/client.js";
import { AuthService } from "./ecoledirecte/auth/service.js";
import { FileAuthStore } from "./ecoledirecte/auth/fileStore.js";
import { EdDataService } from "./ecoledirecte/data/service.js";
import { registerDataTools } from "./server/dataTools.js";
import { registerTools } from "./server/tools.js";
import { log } from "./ecoledirecte/logging.js";

async function main(): Promise<void> {
  log("info", "Starting EcoleDirecte MCP server");

  const http = new EdHttpClient();
  const credentialsFile = process.env.ECOLEDIRECTE_CREDENTIALS_FILE || undefined;
  const store = new FileAuthStore(credentialsFile ? { credentialsFile } : undefined);
  const auth = new AuthService(http, store);
  const data = new EdDataService(http, auth);

  // Attempt to restore a previous session or saved credentials
  try {
    const restored = await auth.restore();
    log("info", `Auth restore result: ${restored.status}`);
    if (restored.status === "error") {
      log("warn", `Restore ended in error: ${restored.message}`);
    }
  } catch (err) {
    log("warn", `Session restore failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const server = new McpServer({
    name: "ecoledirecte-mcp",
    version: "0.1.0",
  });

  registerTools(server, auth);
  registerDataTools(server, data);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "MCP server connected via stdio");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
