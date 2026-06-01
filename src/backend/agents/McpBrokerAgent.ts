import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { drizzle } from "drizzle-orm/d1";
import { bestPractices, hitlProposals } from "../db/schema";
import { eq, like } from "drizzle-orm";
import { z } from "zod";

interface McpBrokerState {
  conversationContext: string[];
  detectedPatterns: Record<string, number>;
}

/**
 * McpBrokerAgent - Stateful AI agent running on Durable Objects
 *
 * This agent subclasses AIChatAgent to provide:
 * - Direct access to MCP tools (shadcn, shoogle, cloudflare-docs)
 * - Intelligent best practice injection via D1 query
 * - Autonomous learning with Human-In-The-Loop proposals
 * - Real-time streaming with automatic persistence
 */
export class McpBrokerAgent extends AIChatAgent<Env, McpBrokerState> {

  async onStart() {
    const state = await this.state.storage.get<McpBrokerState>("agentState");
    if (!state) {
      await this.state.storage.put("agentState", {
        conversationContext: [],
        detectedPatterns: {}
      });
    }
  }

  /**
   * Override the model configuration to use Workers AI
   */
  getModel() {
    return createWorkersAI({
      binding: this.env.AI,
    })("@cf/meta/llama-3.1-8b-instruct");
  }

  /**
   * Register MCP tools directly accessible to the agent
   */
  getTools() {
    return {
      get_shadcn_component: {
        description: "Fetches source code for a shadcn component from the official registry",
        parameters: z.object({
          component: z.string().describe("The name of the component, e.g., 'button' or 'dialog'")
        }),
        execute: async ({ component }: { component: string }) => {
          try {
            const response = await fetch(`https://ui.shadcn.com/registry/styles/default/${component}.json`);
            if (!response.ok) throw new Error(`Component '${component}' not found in registry`);
            const data = await response.json();
            return JSON.stringify(data, null, 2);
          } catch (error: any) {
            return `Error fetching component: ${error.message}`;
          }
        }
      },

      shoogle_search: {
        description: "Performs an elite technical search across specialized development landscapes",
        parameters: z.object({
          query: z.string().describe("The developer search query or error statement to debug")
        }),
        execute: async ({ query }: { query: string }) => {
          try {
            const response = await fetch("https://mcp.shoogle.dev/mcp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: { name: "search", arguments: { query } },
                id: crypto.randomUUID()
              })
            });
            if (!response.ok) throw new Error("Failed to interact with upstream Shoogle MCP platform");
            const data: any = await response.json();
            return JSON.stringify(data?.result || data, null, 2);
          } catch (error: any) {
            return `Shoogle search failed: ${error.message}`;
          }
        }
      },

      query_cloudflare_docs: {
        description: "Queries official Cloudflare Documentation using high-context structural formats",
        parameters: z.object({
          product: z.enum(["workers", "pages", "d1", "r2", "kv", "vectorize", "queues", "ai-gateway"])
            .describe("Cloudflare ecosystem product branch")
        }),
        execute: async ({ product }: { product: string }) => {
          try {
            const url = `https://developers.cloudflare.com/${product}/llms-full.txt`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Could not access structural reference file for product: ${product}`);
            const rawText = await response.text();
            return rawText.substring(0, 75000);
          } catch (error: any) {
            return `Failed fetching Cloudflare docs: ${error.message}`;
          }
        }
      }
    };
  }

  /**
   * Intercept and prepend best practices before tool execution
   */
  async beforeToolCall(toolName: string, args: any) {
    const db = drizzle(this.env.DB);

    // Search for matching best practices
    const matchingPractices = await db
      .select()
      .from(bestPractices)
      .where(like(bestPractices.pattern, `%${toolName}%`))
      .all();

    if (matchingPractices.length > 0) {
      // Prepend guidance to the conversation context
      const guidance = matchingPractices
        .map(p => `📋 Best Practice: ${p.guidanceText}`)
        .join("\n\n");

      return { prependContext: guidance };
    }

    return {};
  }

  /**
   * Autonomous learning - detect patterns and propose HITL rules
   */
  async analyzeConversation(userMessage: string) {
    const state = await this.state.storage.get<McpBrokerState>("agentState") || {
      conversationContext: [],
      detectedPatterns: {}
    };

    state.conversationContext.push(userMessage);

    // Pattern detection logic
    const patterns = ["wrangler types", "d1 migration", "astro adapter", "durable object"];
    for (const pattern of patterns) {
      if (userMessage.toLowerCase().includes(pattern)) {
        state.detectedPatterns[pattern] = (state.detectedPatterns[pattern] || 0) + 1;

        // If pattern repeats >= 3 times, propose HITL rule
        if (state.detectedPatterns[pattern] >= 3) {
          const db = drizzle(this.env.DB);

          // Check if proposal already exists
          const existing = await db
            .select()
            .from(hitlProposals)
            .where(eq(hitlProposals.triggerPattern, pattern))
            .get();

          if (!existing) {
            await db.insert(hitlProposals).values({
              id: crypto.randomUUID(),
              triggerPattern: pattern,
              suggestedGuidance: `Detected recurring question about "${pattern}". Consider adding guidance.`,
              status: "pending",
              confidenceScore: 0.85,
            });

            // Broadcast HITL proposal to frontend via WebSocket
            this.broadcastMessage({
              type: "hitl_proposal",
              pattern,
              message: `New guidance proposal detected for pattern: ${pattern}`
            });
          }
        }
      }
    }

    await this.state.storage.put("agentState", state);
  }

  /**
   * Broadcast messages to all connected WebSocket clients
   */
  private broadcastMessage(message: any) {
    const webSockets = this.state.getWebSockets();
    for (const ws of webSockets) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to broadcast to WebSocket:", error);
      }
    }
  }
}
