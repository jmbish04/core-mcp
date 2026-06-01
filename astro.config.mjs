import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  srcDir: './src/frontend',
  adapter: cloudflare({
    runtime: {
      mode: 'off'
    }
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    })
  ],
  vite: {
    ssr: {
      external: ['node:async_hooks']
    }
  }
});
