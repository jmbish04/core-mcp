# MCP Server Example (Raw Transport)

This example demonstrates how to create an unauthenticated stateless MCP server using `WebStandardStreamableHTTPServerTransport` from the `@modelcontextprotocol/sdk` directly, **without** the Agents SDK helpers.

This gives you full control over the transport layer. If you want a simpler approach, see [`mcp-worker`](../mcp-worker) which uses `createMcpHandler()` from the Agents SDK.

## Usage

```bash
pnpm install
pnpm run dev
```

## Testing

You can test the MCP server using the MCP Inspector or any MCP client that supports the `streamable-http` transport.

### Local Testing with MCP Inspector

1. In a new terminal, run the MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector@latest
   ```

2. The MCP Inspector will launch in your web browser at `http://localhost:5173`

3. Enter the URL of your MCP server (`http://localhost:8788/mcp`) and select **Connect**

4. Select **List Tools** to show the tools that your MCP server exposes

## Deployment to Cloudflare

This MCP server is designed to be deployed on Cloudflare Workers using the Agents SDK.

### Deploy to Production

```bash
pnpm run deploy
```

This will:
1. Generate TypeScript types using `wrangler types worker-configuration.d.ts`
2. Deploy your MCP server to Cloudflare Workers

Your MCP server will be available at `https://your-worker.your-account.workers.dev/mcp`

### Type Generation

The project uses `wrangler types` to generate TypeScript definitions in `worker-configuration.d.ts`. This provides:

- **Environment bindings** (KV, D1, AI, BROWSER, ASSETS, etc.) as a global `Env` interface
- **Runtime types** based on your `compatibility_date` and `compatibility_flags`
- **No imports required** - The `Env` interface is globally available throughout your codebase

To regenerate types after changing `wrangler.jsonc`:
```bash
pnpm run types
```

The generated `worker-configuration.d.ts` file:
- Defines a global `Env` interface that's automatically available in all TypeScript files
- Includes all Cloudflare Workers runtime types matching your Worker's configuration
- Replaces the deprecated `@cloudflare/workers-types` package

You can access environment bindings without importing:
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // env.KV, env.DB, env.AI, etc. are all typed and available
    const value = await env.KV.get("key");
    return new Response(value);
  }
}
```

### Continuous Deployment

If you've [connected a git repository](https://developers.cloudflare.com/workers/ci-cd/builds/) to your Worker, you can deploy by:
- Pushing changes to your repository
- Merging a pull request to the main branch

## Adding State

To create a stateful MCP server, use `McpAgent` with a Durable Object. See the [`mcp`](../mcp) example for a stateful server, or [`mcp-elicitation`](../mcp-elicitation) for stateful sessions with user input elicitation.

## Additional Resources

- [Build a Remote MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [createMcpHandler API Reference](https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/)
- [McpAgent API Reference](https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/)
- [MCP Authorization](https://developers.cloudflare.com/agents/model-context-protocol/authorization/)
