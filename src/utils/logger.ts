import { drizzle } from "drizzle-orm/d1";
import { mcpLogs } from "../db/schema";

export interface LogPayload {
  id: string;
  method: string;
  requestPayload: string;
  responsePayload: string;
  statusCode: number;
}

/**
 * DrizzleLogger handles cross-cutting observability requirements by simultaneously 
 * mirroring logs to stdout/stderr (Cloudflare Observability metrics) and persisting 
 * transactional context to Cloudflare D1 via Drizzle ORM.
 */
export class DrizzleLogger {
  private db;

  constructor(d1Binding: D1Database) {
    this.db = drizzle(d1Binding);
  }

  /**
   * Dispatches dual-write logs across cloud observability channels and the D1 storage layer.
   */
  async logInteraction(payload: LogPayload): Promise<void> {
    const timestamp = new Date().toISOString();

    // 1. Mirror directly to Cloudflare Observability logs
    console.log(
      JSON.stringify({
        level: "INFO",
        message: "MCP Interaction Telemetry Log",
        timestamp,
        ...payload,
      })
    );

    // 2. Commit transaction asynchronously into Cloudflare D1 via Drizzle
    try {
      await this.db.insert(mcpLogs).values({
        id: payload.id,
        method: payload.method,
        requestPayload: payload.requestPayload,
        responsePayload: payload.responsePayload,
        statusCode: payload.statusCode,
      });
    } catch (error: any) {
      // Direct critical delivery exceptions straight to Cloudflare Error Observability stream
      console.error(
        JSON.stringify({
          level: "CRITICAL",
          message: "Failed to persist interaction frame logs to D1 Storage Backend",
          timestamp,
          error: error.message || error,
          affectedLogId: payload.id,
        })
      );
    }
  }
}
