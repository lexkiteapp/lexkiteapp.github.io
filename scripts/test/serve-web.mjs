// Máy chủ tĩnh cho đo hiệu năng trên CI: nén brotli/gzip như Cloudflare Pages (python http.server không nén → Lighthouse đo sai LCP/byte).
// Chạy: node scripts/test/serve-web.mjs web 8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const ROOT = path.resolve(process.argv[2] || 'web'), PORT = +(process.argv[3] || 8080);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const cache = new Map();
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch (e) { if (fs.existsSync(f + '.html')) f += '.html'; }
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  const ext = path.extname(f), type = TYPES[ext] || 'application/octet-stream', ae = req.headers['accept-encoding'] || '';
  const comp = /text|javascript|json|svg|xml|manifest/.test(type) ? (/\bbr\b/.test(ae) ? 'br' : /gzip/.test(ae) ? 'gzip' : '') : '';
  const key = f + '|' + comp; let body = cache.get(key);
  if (!body) { const raw = fs.readFileSync(f); body = comp === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) : comp === 'gzip' ? zlib.gzipSync(raw, { level: 6 }) : raw; cache.set(key, body); }
  res.writeHead(200, { 'content-type': type, 'content-length': body.length, ...(comp ? { 'content-encoding': comp, vary: 'accept-encoding' } : {}), 'cache-control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, () => console.log('serve-web', ROOT, PORT));
