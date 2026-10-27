/**
 * Production build (Bun):  bun run build
 *  1. Tailwind v4 CSS generated from the class names used in src/
 *  2. React app bundled + minified with Bun.build
 *  3. index.html, service worker, manifest and icons assembled in dist/
 *
 * Env vars (set in Cloudflare Pages > Settings > Environment variables, or in .env locally):
 *   SUPABASE_URL        e.g. https://abcdefgh.supabase.co
 *   SUPABASE_ANON_KEY   the project's public "anon" key (never the service_role key)
 */
import { compile } from 'tailwindcss';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const root = import.meta.dir;
const dist = join(root, 'dist');
const require = createRequire(import.meta.url);
const hash = (s: string | Uint8Array) => createHash('sha1').update(s).digest('hex').slice(0, 8);

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });

// ---------- 1. CSS ----------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const sources = [...walk(join(root, 'src')).filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts')), join(root, 'index.html')];
const candidates = new Set<string>();
for (const f of sources) for (const m of readFileSync(f, 'utf8').matchAll(/[^\s"'`<>=(){};,]+/g)) candidates.add(m[0]);

const twDir = (() => {
  try {
    return dirname(require.resolve('tailwindcss/package.json'));
  } catch {
    return join(root, 'node_modules', 'tailwindcss');
  }
})();

const compiler = await compile(readFileSync(join(root, 'src/styles.css'), 'utf8'), {
  base: join(root, 'src'),
  onDependency: () => {},
  loadStylesheet: async (id: string, base: string) => {
    let path: string;
    if (id.startsWith('.')) path = resolve(base, id);
    else if (id === 'tailwindcss') path = join(twDir, 'index.css');
    else if (id.startsWith('tailwindcss/')) path = join(twDir, id.slice('tailwindcss/'.length) + (id.endsWith('.css') ? '' : '.css'));
    else path = require.resolve(id);
    return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
  },
});
const rawCss = compiler.build([...candidates]);
const tmpCss = join(root, '.tmp-app.css');
writeFileSync(tmpCss, rawCss);
const cssBuild = await Bun.build({ entrypoints: [tmpCss], minify: true });
rmSync(tmpCss, { force: true });
if (!cssBuild.success) {
  console.error(cssBuild.logs);
  process.exit(1);
}
const css = await cssBuild.outputs[0].text();
const cssName = `app-${hash(css)}.css`;
writeFileSync(join(dist, 'assets', cssName), css);

// ---------- 2. JS ----------
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').trim();
const keyRole = (() => {
  try {
    return String(JSON.parse(atob((SUPABASE_ANON_KEY.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/'))).role ?? '');
  } catch {
    return '';
  }
})();
if (keyRole === 'service_role' || SUPABASE_ANON_KEY.startsWith('sb_secret_')) {
  console.error('Refusing to build: SUPABASE_ANON_KEY is a secret/service_role key. Use the public anon (or publishable) key.');
  process.exit(1);
}
const jsBuild = await Bun.build({
  entrypoints: [join(root, 'src/main.tsx')],
  outdir: join(dist, 'assets'),
  target: 'browser',
  minify: true,
  naming: { entry: 'main-[hash].[ext]' },
  define: {
    __SUPABASE_URL__: JSON.stringify(SUPABASE_URL),
    __SUPABASE_ANON_KEY__: JSON.stringify(SUPABASE_ANON_KEY),
    'process.env.NODE_ENV': '"production"',
  },
});
if (!jsBuild.success) {
  console.error(jsBuild.logs);
  process.exit(1);
}
const jsName = jsBuild.outputs.find((o) => o.path.endsWith('.js'))!.path.split('/').pop()!;

// ---------- 3. HTML, static files, service worker ----------
const html = readFileSync(join(root, 'index.html'), 'utf8').replace(
  '<!--ASSETS-->',
  `<link rel="stylesheet" href="/assets/${cssName}" />\n    <script type="module" src="/assets/${jsName}"></script>`,
);
writeFileSync(join(dist, 'index.html'), html);

cpSync(join(root, 'public'), dist, { recursive: true });
const build = hash(html + css + jsName);
const swPath = join(dist, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD__', build));

const size = (f: string) => (statSync(join(dist, 'assets', f)).size / 1024).toFixed(1) + ' kB';
console.log(`Built dist/  (build ${build})`);
console.log(`  ${jsName}  ${size(jsName)}`);
console.log(`  ${cssName}  ${size(cssName)}`);
console.log(SUPABASE_URL && SUPABASE_ANON_KEY ? '  Supabase sync: ENABLED' : '  Supabase sync: not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)');
if (!existsSync(join(dist, 'index.html'))) process.exit(1);
