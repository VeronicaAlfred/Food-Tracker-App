/** Tiny static server for previewing dist/ locally:  bun run serve  ->  http://localhost:4173 */
import { join } from 'node:path';
const dist = join(import.meta.dir, 'dist');
const port = Number(process.env.PORT ?? 4173);
Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = Bun.file(join(dist, path));
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file(join(dist, 'index.html')));
  },
});
console.log(`Serving dist/ on http://localhost:${port}`);
