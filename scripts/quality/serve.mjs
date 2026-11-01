// Máy chủ tĩnh cục bộ cho quality-sweep (giống Cloudflare Pages: brotli, URL sạch, 404.html).
// /api/* trả {} (200) → KHÔNG chạm D1/API thật. Dùng: node scripts/quality/serve.mjs <thư-mục> <cổng>   hoặc import { serve }.
import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const COMP = /\.(html|js|mjs|css|json|svg|webmanifest|xml|txt)$/;

export async function serve(root, port = 0) {
  root = path.resolve(root);
  const cache = new Map();
  const resolveFile = p => {
    const cands = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
    for (const c of cands) {
      const f = path.join(root, c);
      if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    }
    return null;
  };
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
    if (p.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end('{}'); }
    let f = resolveFile(p), status = 200;
    if (!f) { f = resolveFile('/404.html'); status = 404; if (!f) { res.writeHead(404); return res.end(); } }
    const ext = path.extname(f), h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    let body = fs.readFileSync(f);
    if (COMP.test(f) && /br/.test(req.headers['accept-encoding'] || '')) {
      const k = f + body.length; if (!cache.has(k)) cache.set(k, zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }));
      body = cache.get(k); h['Content-Encoding'] = 'br'; h.Vary = 'Accept-Encoding';
    }
    res.writeHead(status, h); res.end(body);
  });
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  return { origin: `http://127.0.0.1:${srv.address().port}`, port: srv.address().port, close: () => srv.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await serve(process.argv[2] || 'dist', +process.argv[3] || 8080);
  console.log('serve', s.origin);
}
