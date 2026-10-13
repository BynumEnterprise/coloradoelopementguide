import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Canonical URLs end in a slash (directory build format), but templates, data and markdown link without one.
// Vercel serves both forms with 200, so every internal link pointed at a duplicate of the canonical page.
// After the build, append the slash to internal links and our own absolute URLs (JSON-LD, hrefs) whenever
// that path is a prerendered page. Server routes, files and anchors are left alone.
function canonicalLinks() {
  const SITE = 'https://coloradoelopementguide.com';
  function walk(d, out = []) {
    for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : f.endsWith('.html') && out.push(p); }
    return out;
  }
  function fix(root) {
    if (!existsSync(root)) return 0;
    const isPage = (path) => path && path !== '/' && !path.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(path) && existsSync(join(root, path, 'index.html'));
    let n = 0;
    for (const file of walk(root)) {
      const html = readFileSync(file, 'utf8');
      const out = html
        .replace(/(href=)(["'])(\/[^"'#?\s]*)([?#][^"']*)?\2/g, (m, a, q, path, rest) => isPage(path) ? (n++, `${a}${q}${path}/${rest || ''}${q}`) : m)
        .replace(/https:\/\/coloradoelopementguide\.com(\/[^"'#?\s<>\\)]*)/g, (m, path) => isPage(path) ? (n++, `${SITE}${path}/`) : m);
      if (out !== html) writeFileSync(file, out);
    }
    return n;
  }
  return {
    name: 'ceg:canonical-links',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const roots = [fileURLToPath(dir), fileURLToPath(new URL('./.vercel/output/static/', import.meta.url))];
        for (const r of roots) logger.info(`canonical links: ${fix(r)} rewritten in ${r}`);
      }
    }
  };
}

export default defineConfig({
  site: 'https://coloradoelopementguide.com',
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 300 }),
  integrations: [sitemap({ filter: (page) => !/\/(admin|account|vendor-dashboard|my-vendors|thanks|claim(\/.*)?|lt\/.*|vd\/.*)\/?$/.test(page) }), canonicalLinks()],
  vite: { plugins: [tailwindcss()] }
});
