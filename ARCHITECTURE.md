# MCP Broker - High-Performance Edge System

A comprehensive, production-ready system running entirely at the edge on Cloudflare Workers, combining Astro SSR, Hono API, AI-powered chat agents, and intelligent best practice management.

## Architecture

### Tech Stack

- **Compute & Framework**: Astro (SSR mode via @astrojs/cloudflare adapter) + Hono routing backend
- **UI Layer**: React islands + Shadcn UI (dark theme)
- **Persistence**: Drizzle ORM + Cloudflare D1 database
- **Conversational AI**: assistant-ui + @cloudflare/ai-chat + Cloudflare Agents SDK (AIChatAgent on Durable Objects)
- **API Layer**: Hono with Zod-OpenAPI for type-safe endpoints

### Routing Matrix

- `/api/*` → Hono API with Zod-OpenAPI
- `/protocol/*` → Agents SDK (McpBrokerAgent via Durable Objects)
- `/mcp` → Legacy MCP server transport
- `/*` → Astro SSR pages and static assets

## Features

### 1. D1 Database Schema

Three tables managed via Drizzle ORM:

- `best_practices` - Pattern-matched guidance for intelligent context injection
- `mcp_logs` - Complete MCP interaction telemetry
- `hitl_proposals` - Human-In-The-Loop rule suggestions from the AI agent

### 2. McpBrokerAgent

A stateful AI agent (Durable Object) that:

- **Tool Access**: Direct access to MCP tools (shadcn, shoogle_search, query_cloudflare_docs)
- **Intelligent Injection**: Queries D1 for best practices and prepends them to responses
- **Autonomous Learning**: Detects patterns and creates HITL proposals for human approval
- **Real-time Streaming**: WebSocket-based communication with resumable streams

### 3. Hono Zod-OpenAPI API

Type-safe REST API with automatic OpenAPI schema generation:

- `GET /api/best-practices` - List all best practices
- `POST /api/best-practices` - Create new best practice
- `DELETE /api/best-practices/{id}` - Delete best practice
- `GET /api/hitl-proposals` - List HITL proposals
- `POST /api/hitl-proposals/{id}/approve` - Approve and convert to best practice
- `POST /api/hitl-proposals/{id}/reject` - Reject proposal
- `GET /api/health` - System health check with tool verification
- `GET /api/openapi.json` - OpenAPI 3.1 specification

### 4. Frontend Pages

- **Dashboard** (`/`) - System overview with metrics cards
- **Configuration Panel** (`/config`) - Manage best practices and HITL proposals
- **Research Chat** (`/chat`) - AI-powered chat interface with agent integration

### 5. Automated Health Verification

The `/api/health` endpoint tests all MCP tools:

- Verifies shadcn component registry access
- Tests Cloudflare documentation endpoints
- Reports latency and pass/fail status for each tool

## Setup & Deployment

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Generate Types

```bash
pnpm run types
```

This generates `worker-configuration.d.ts` with all Cloudflare bindings typed.

### 3. Apply D1 Migrations

```bash
wrangler d1 migrations apply core-mcp --remote
```

### 4. Build

```bash
pnpm run build
```

This builds the Astro site to `./dist` directory.

### 5. Deploy

```bash
pnpm run deploy
```

This runs `types → build → wrangler deploy` in sequence.

## Development

```bash
pnpm run dev
```

Runs Wrangler dev server with:
- Local D1 database
- Hot module reloading
- Astro SSR
- Durable Objects emulation

## Configuration

### Environment Bindings (wrangler.jsonc)

- `DB` - D1 database (core-mcp)
- `AI` - Workers AI binding
- `BROWSER` - Browser rendering binding
- `KV` - KV namespace
- `SESSIONS` - Sessions KV namespace
- `ASSETS` - Static assets binding
- `MCP_BROKER_AGENT` - Durable Object binding for McpBrokerAgent

### Astro Configuration

- **Output**: Server (SSR)
- **Adapter**: @astrojs/cloudflare
- **Integrations**: React, Tailwind
- **Platform Proxy**: Enabled for local development

## MCP Tools

### 1. get_shadcn_component

Fetches component source code from shadcn/ui registry.

```typescript
{ component: "button" }
```

### 2. shoogle_search

Performs technical search via Shoogle Dev MCP server.

```typescript
{ query: "cloudflare workers error handling" }
```

### 3. query_cloudflare_docs

Queries official Cloudflare documentation.

```typescript
{ product: "workers" | "pages" | "d1" | "r2" | "kv" | "vectorize" | "queues" | "ai-gateway" }
```

## Best Practices System

1. **Pattern Matching**: Agent checks D1 for patterns matching user queries
2. **Context Injection**: Guidance text is prepended to agent responses
3. **Autonomous Learning**: Agent detects recurring patterns (3+ occurrences)
4. **HITL Proposals**: Suggestions sent to frontend for human approval
5. **Approval Flow**: Approved proposals automatically convert to best practices

## Security & Performance

- **Edge Execution**: Runs on Cloudflare's global network
- **Observability**: Full logging and tracing enabled
- **Type Safety**: End-to-end TypeScript with Zod validation
- **CORS**: Configured for cross-origin requests
- **Health Monitoring**: Automated tool verification

## API Documentation

Once deployed, view the interactive API documentation at:

- OpenAPI JSON: `https://your-worker.workers.dev/api/openapi.json`
- Swagger UI: Can be added via Scalar or Swagger UI integrations

## Architecture Decisions

### Why Astro SSR?

- Server-side rendering at the edge for fast initial page loads
- React islands for interactive components without full SPA overhead
- Built-in routing and asset handling

### Why Hono?

- Lightweight, fast routing engine
- Native Zod-OpenAPI integration
- Excellent TypeScript support
- Minimal overhead on Workers

### Why Durable Objects for Agent?

- Stateful AI agents with persistent storage
- WebSocket support for real-time streaming
- Co-location of compute and state
- Built-in coordination across instances

### Why Drizzle ORM?

- Type-safe SQL queries
- Automatic migrations
- Excellent D1 support
- Minimal runtime overhead

## Contributing

This system is designed for production use on Cloudflare Workers. All contributions should maintain:

- Type safety (no `any` types)
- Edge compatibility (no Node.js-specific APIs)
- Performance (minimal bundle size)
- Security (input validation, no XSS/injection vulnerabilities)

## License

Private repository - All rights reserved
