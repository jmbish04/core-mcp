import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { drizzle } from "drizzle-orm/d1";
import { bestPractices, hitlProposals } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Dynamic Zod-OpenAPI Hono API Infrastructure
 * Exposes CRUD operations for best_practices and hitl_proposals
 * Serves OpenAPI metadata at /openapi.json, /swagger, and /scalar
 */
export function createApiRouter() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  // Best Practices endpoints
  const BestPracticeSchema = z.object({
    id: z.string(),
    pattern: z.string(),
    guidanceText: z.string(),
    createdAt: z.string(),
  });

  const CreateBestPracticeSchema = z.object({
    pattern: z.string(),
    guidanceText: z.string(),
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/best-practices",
      tags: ["Best Practices"],
      responses: {
        200: {
          description: "List of best practices",
          content: {
            "application/json": {
              schema: z.array(BestPracticeSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const results = await db.select().from(bestPractices).all();
      return c.json(results);
    }
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/best-practices",
      tags: ["Best Practices"],
      request: {
        body: {
          content: {
            "application/json": {
              schema: CreateBestPracticeSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: "Best practice created",
          content: {
            "application/json": {
              schema: BestPracticeSchema,
            },
          },
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const body = c.req.valid("json");
      const id = crypto.randomUUID();

      await db.insert(bestPractices).values({
        id,
        pattern: body.pattern,
        guidanceText: body.guidanceText,
      });

      const created = await db.select().from(bestPractices).where(eq(bestPractices.id, id)).get();
      return c.json(created!, 201);
    }
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/best-practices/{id}",
      tags: ["Best Practices"],
      request: {
        params: z.object({
          id: z.string(),
        }),
      },
      responses: {
        204: {
          description: "Best practice deleted",
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { id } = c.req.valid("param");
      await db.delete(bestPractices).where(eq(bestPractices.id, id));
      return c.body(null, 204);
    }
  );

  // HITL Proposals endpoints
  const HITLProposalSchema = z.object({
    id: z.string(),
    triggerPattern: z.string(),
    suggestedGuidance: z.string(),
    status: z.enum(["pending", "approved", "rejected"]),
    confidenceScore: z.number(),
    createdAt: z.string(),
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/hitl-proposals",
      tags: ["HITL Proposals"],
      responses: {
        200: {
          description: "List of HITL proposals",
          content: {
            "application/json": {
              schema: z.array(HITLProposalSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const results = await db.select().from(hitlProposals).all();
      return c.json(results);
    }
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/hitl-proposals/{id}/approve",
      tags: ["HITL Proposals"],
      request: {
        params: z.object({
          id: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Proposal approved and converted to best practice",
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { id } = c.req.valid("param");

      const proposal = await db.select().from(hitlProposals).where(eq(hitlProposals.id, id)).get();
      if (!proposal) {
        return c.json({ error: "Proposal not found" }, 404);
      }

      // Create best practice from proposal
      await db.insert(bestPractices).values({
        id: crypto.randomUUID(),
        pattern: proposal.triggerPattern,
        guidanceText: proposal.suggestedGuidance,
      });

      // Update proposal status
      await db.update(hitlProposals)
        .set({ status: "approved" })
        .where(eq(hitlProposals.id, id));

      return c.json({ message: "Proposal approved" });
    }
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/hitl-proposals/{id}/reject",
      tags: ["HITL Proposals"],
      request: {
        params: z.object({
          id: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Proposal rejected",
        },
      },
    }),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { id } = c.req.valid("param");

      await db.update(hitlProposals)
        .set({ status: "rejected" })
        .where(eq(hitlProposals.id, id));

      return c.json({ message: "Proposal rejected" });
    }
  );

  // Health verification endpoint
  const ToolHealthSchema = z.object({
    tool: z.string(),
    status: z.enum(["pass", "fail"]),
    latencyMs: z.number(),
  });

  const HealthResponseSchema = z.object({
    status: z.enum(["healthy", "unhealthy"]),
    timestamp: z.string(),
    verifications: z.array(ToolHealthSchema),
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      tags: ["Health"],
      responses: {
        200: {
          description: "System health status",
          content: {
            "application/json": {
              schema: HealthResponseSchema,
            },
          },
        },
      },
    }),
    async (c) => {
      const verifications: Array<{ tool: string; status: "pass" | "fail"; latencyMs: number }> = [];

      // Test shadcn component tool
      const shadcnStart = Date.now();
      try {
        const response = await fetch("https://ui.shadcn.com/registry/styles/default/button.json");
        const success = response.ok;
        verifications.push({
          tool: "get_shadcn_component",
          status: success ? "pass" : "fail",
          latencyMs: Date.now() - shadcnStart,
        });
      } catch {
        verifications.push({
          tool: "get_shadcn_component",
          status: "fail",
          latencyMs: Date.now() - shadcnStart,
        });
      }

      // Test cloudflare docs tool
      const docsStart = Date.now();
      try {
        const response = await fetch("https://developers.cloudflare.com/workers/llms-full.txt");
        const success = response.ok;
        verifications.push({
          tool: "query_cloudflare_docs",
          status: success ? "pass" : "fail",
          latencyMs: Date.now() - docsStart,
        });
      } catch {
        verifications.push({
          tool: "query_cloudflare_docs",
          status: "fail",
          latencyMs: Date.now() - docsStart,
        });
      }

      const allPass = verifications.every(v => v.status === "pass");

      return c.json({
        status: allPass ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        verifications,
      });
    }
  );

  // OpenAPI documentation endpoints
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "MCP Broker API",
      version: "1.0.0",
      description: "Dynamic Zod-OpenAPI infrastructure for MCP best practices and HITL management",
    },
  });

  return app;
}
