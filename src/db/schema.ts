import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Managed Drizzle representation for MCP interaction telemetry.
 * Maps seamlessly to Cloudflare D1 SQLite runtime layers.
 */
export const mcpLogs = sqliteTable("mcp_logs", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").$defaultFn(() => new Date().toISOString()),
  method: text("method").notNull(),
  requestPayload: text("request_payload").notNull(),
  responsePayload: text("response_payload").notNull(),
  statusCode: integer("status_code").notNull(),
});

/**
 * Best practices registry for intelligent context prepending.
 * Stores pattern-matched guidance that the McpBrokerAgent injects into conversations.
 */
export const bestPractices = sqliteTable("best_practices", {
  id: text("id").primaryKey(),
  pattern: text("pattern").notNull().unique(),
  guidanceText: text("guidance_text").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

/**
 * Human-In-The-Loop proposals queue.
 * Agent-generated rule suggestions awaiting user approval/rejection.
 */
export const hitlProposals = sqliteTable("hitl_proposals", {
  id: text("id").primaryKey(),
  triggerPattern: text("trigger_pattern").notNull(),
  suggestedGuidance: text("suggested_guidance").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  confidenceScore: real("confidence_score").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});
