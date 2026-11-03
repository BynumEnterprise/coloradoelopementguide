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

// Sitemap lastmod and pruning (SEO fix wave 2026-11-03). Google last read the sitemap on Oct 9 and the live
// file had no lastmod at all, so nothing told Google which URLs were new or changed.
// Guides and resources: frontmatter dateModified, else datePublished. Hubs: the build date, changefreq weekly.
// Vendor pages: the built HTML decides. A page that ships a robots noindex (unclaimed listing with no owner
// photos, see src/pages/vendor/[slug].astro) is dropped from the sitemap; claimed and featured listings
// (data-listing attribute) get the build date; indexable seeded listings get no lastmod.
const BUILD_DATE = new Date().toISOString().slice(0, 10);
function contentDates(rel, keyField) {
  const dir = fileURLToPath(new URL(rel, import.meta.url));
  const dates = new Map();
  if (!existsSync(dir)) return dates;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const fm = (readFileSync(join(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
    const field = (k) => (fm.match(new RegExp(`^${k}:\\s*["']?([^"'\\r\\n]+?)["']?\\s*$`, 'm')) || [])[1];
    const key = keyField ? field(keyField) : f.slice(0, -3);
    const date = field('dateModified') || field('datePublished');
    if (key && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) dates.set(key, date);
  }
  return dates;
}
const GUIDE_DATES = contentDates('./src/content/guides/', 'region');
const RESOURCE_DATES = contentDates('./src/content/resources/');
const newest = (m) => [...m.values()].sort().pop();
let builtDir = null;
// Runs before the sitemap integration's astro:build:done (hooks run in array order), so serialize can read the HTML.
const captureBuildDir = { name: 'ceg:capture-build-dir', hooks: { 'astro:build:done': ({ dir }) => { builtDir = fileURLToPath(dir); } } };
function builtHtml(pathname) {
  for (const root of [builtDir, fileURLToPath(new URL('./.vercel/output/static/', import.meta.url))]) {
    if (!root) continue;
    const file = join(root, pathname, 'index.html');
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  return null;
}
const HUBS = /^\/(?:$|vendors\/$|regions\/$|region\/|category\/|local\/|venues\/|photographers\/)/;
function serializeSitemap(item) {
  const path = new URL(item.url).pathname;
  const html = builtHtml(path);
  if (html && /<meta name="robots" content="noindex/i.test(html)) return undefined;
  let m;
  if ((m = path.match(/^\/guides\/([^/]+)\/$/))) return GUIDE_DATES.has(m[1]) ? { ...item, lastmod: GUIDE_DATES.get(m[1]) } : item;
  if ((m = path.match(/^\/resources\/([^/]+)\/$/))) return RESOURCE_DATES.has(m[1]) ? { ...item, lastmod: RESOURCE_DATES.get(m[1]) } : item;
  if (path === '/guides/') return { ...item, lastmod: newest(GUIDE_DATES) || BUILD_DATE, changefreq: 'weekly' };
  if (path === '/resources/') return { ...item, lastmod: newest(RESOURCE_DATES) || BUILD_DATE, changefreq: 'weekly' };
  if (path.startsWith('/vendor/')) return html && /data-listing="(?:claimed|featured)"/.test(html) ? { ...item, lastmod: BUILD_DATE } : item;
  if (HUBS.test(path)) return { ...item, lastmod: BUILD_DATE, changefreq: 'weekly' };
  return item;
}

export default defineConfig({
  site: 'https://coloradoelopementguide.com',
  output: 'static',
  security: { checkOrigin: false },
  adapter: vercel({ maxDuration: 300 }),
  integrations: [captureBuildDir, sitemap({ filter: (page) => !/\/(api(\/.*)?|admin|account|vendor-dashboard|my-vendors|thanks|claim(\/.*)?|lt\/.*|vd\/.*)\/?$/.test(page), serialize: serializeSitemap }), canonicalLinks()],
  vite: { plugins: [tailwindcss()] }
});
