import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
