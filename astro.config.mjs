import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://coloradoelopementguide.com',
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 300 }),
  integrations: [sitemap({ filter: (page) => !/\/admin\/?$/.test(page) })],
  vite: { plugins: [tailwindcss()] }
});
