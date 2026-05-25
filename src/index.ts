import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { DrizzleLogger } from "./utils/logger";
import { createApiRouter } from "./backend/api/index";
import { routeAgentRequest } from "agents";
import { McpBrokerAgent } from "./backend/agents/McpBrokerAgent";

/**
 * Creates the consolidated MCP Server handling Shadcn UI, Shoogle Dev, and Cloudflare Docs
 */
const createServer = () => {
  const server = new McpServer({
    name: "Unified Shadcn, Shoogle & Cloudflare MCP Server",
    version: "1.0.0"
  });

  // ==========================================
  // 1. SHADCN UI TOOLS
  // ==========================================

  server.tool(
    "get_shadcn_component",
    "Fetches source code for a shadcn component from the official registry",
    { component: z.string().describe("The name of the component, e.g., 'button' or 'dialog'") },
    async ({ component }) => {
      try {
        const response = await fetch(`https://ui.shadcn.com/registry/styles/default/${component}.json`);
        if (!response.ok) throw new Error(`Component '${component}' not found in registry`);

        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error fetching component: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "consult_astro_frontend",
    "Provides best practices for implementing Shadcn (React) within Astro on Cloudflare",
    {
      pattern: z.enum(["hydration", "styling", "deployment"]),
      componentName: z.string().optional()
    },
    async ({ pattern, componentName }) => {
      const guidelines = {
        hydration: `In Astro, Shadcn (React) components require client directives. Use <${componentName || 'Component'} client:load /> for interactive elements or client:visible for footer/below-the-fold UI.`,
        styling: "Ensure 'lucide-react' is installed. Tailwind must be configured in astro.config.mjs. Check that your @/lib/utils.ts matches shadcn's expected cn() helper.",
        deployment: "When deploying to Cloudflare Workers Assets, ensure SSR is enabled in Astro. Use the @astrojs/cloudflare adapter."
      };

      return {
        content: [{ type: "text", text: guidelines[pattern] }]
      };
    }
  );

  // ==========================================
  // 2. SHOOGLE DEVELOPMENT SEARCH TOOL
  // ==========================================

  server.tool(
    "shoogle_search",
    "Performs an elite technical search across specialized development landscapes via Shoogle Dev",
    { query: z.string().describe("The developer search query or error statement to debug") },
    async ({ query }) => {
      try {
        const response = await fetch("https://mcp.shoogle.dev/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "search",
              arguments: { query }
            },
            id: crypto.randomUUID()
          })
        });

        if (!response.ok) throw new Error("Failed to interact with upstream Shoogle MCP platform");
        const data: any = await response.json();

        return {
          content: [{ type: "text", text: JSON.stringify(data?.result || data, null, 2) }]
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Shoogle upstream tool execution failed: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 3. CLOUDFLARE DOCS MCP TOOL
  // ==========================================

  server.tool(
    "query_cloudflare_docs",
    "Queries official Cloudflare Documentation indexes using high-context structural formats",
    { product: z.enum(["workers", "pages", "d1", "r2", "kv", "vectorize", "queues", "ai-gateway"]).describe("Cloudflare ecosystem product branch") },
    async ({ product }) => {
      try {
        const url = `https://developers.cloudflare.com/${product}/llms-full.txt`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not access structural reference file for product: ${product}`);

        const rawText = await response.text();
        return {
          content: [{ type: "text", text: rawText.substring(0, 75000) }]
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed fetching Cloudflare product reference: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
  "Access-Control-Max-Age": "86400"
};

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Route /api/* to Hono
    if (url.pathname.startsWith("/api/")) {
      const apiRouter = createApiRouter();
      return apiRouter.fetch(request, env, ctx);
    }

    // Route /protocol/* to Agents SDK
    if (url.pathname.startsWith("/protocol/")) {
      return routeAgentRequest(request, env, ctx, McpBrokerAgent);
    }

    // Route /mcp to legacy MCP server
    if (url.pathname === "/mcp") {
      const logId = crypto.randomUUID();
      let requestBodyClone = "";

      if (request.method === "POST") {
        const clone = request.clone();
        try {
          requestBodyClone = await clone.text();
        } catch (error) {
          console.log(error);
        }
      }

      const transport = new WebStandardStreamableHTTPServerTransport();
      const server = createServer();
      server.connect(transport);

      const baseResponse = await transport.handleRequest(request);

      let responseBodyClone = "";
      if (baseResponse.body) {
        const resClone = baseResponse.clone();
        try {
          responseBodyClone = await resClone.text();
        } catch (error) {
          console.log(error);
        }
      }

      // Capture telemetry logs through the DrizzleLogger class
      if (request.method === "POST") {
        const logger = new DrizzleLogger(env.DB);
        await logger.logInteraction({
          id: logId,
          method: request.method,
          requestPayload: requestBodyClone,
          responsePayload: responseBodyClone,
          statusCode: baseResponse.status
        });
      }

      return withCors(baseResponse);
    }

    // Default: serve static assets or Astro pages
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

// Export Durable Object class
export { McpBrokerAgent };
