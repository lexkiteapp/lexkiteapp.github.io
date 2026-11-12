// CSP chặn thật cho web (docs/SECURITY-CSP.md). MỘT nguồn: dòng Content-Security-Policy của khối /* trong web/_headers.
// Header không chứa nổi hash (Cloudflare Pages: dòng ≤ 2000 ký tự) → mỗi trang HTML có thêm <meta http-equiv="Content-Security-Policy">
// mang script-src của header BỎ 'unsafe-inline' + sha256 từng script nội tuyến. Hai chính sách giao nhau → script-src hiệu lực không có 'unsafe-inline'.
import fs from 'fs';
import crypto from 'crypto';

export const HEADERS = new URL('../../web/_headers', import.meta.url);

/** Đọc web/_headers → Map(đường dẫn → [[tên header thường, giá trị]]) */
export function parseHeaders(src = fs.readFileSync(HEADERS, 'utf8')) {
  const rules = new Map(); let cur = null;
  for (const raw of src.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = []; rules.set(line, cur); continue; }
    const t = line.trim(); if (!cur) continue;
    if (t.startsWith('! ')) { cur.push(['!', t.slice(2).toLowerCase()]); continue; }
    const i = t.indexOf(':'); if (i > 0) cur.push([t.slice(0, i).toLowerCase(), t.slice(i + 1).trim()]);
  }
  return rules;
}

/** "a b; c d" → Map(directive → [token]) */
export function parsePolicy(p) {
  const m = new Map();
  for (const part of String(p || '').split(';')) { const [d, ...v] = part.trim().split(/\s+/); if (d) m.set(d.toLowerCase(), v); }
  return m;
}

export function sitePolicy(rules = parseHeaders()) {
  const v = ((rules.get('/*') || []).find(([k]) => k === 'content-security-policy') || [])[1];
  if (!v) throw new Error('web/_headers: khối /* thiếu Content-Security-Policy');
  return v;
}

// Loại <script> mà trình duyệt THỰC THI/diễn giải như mã (cần hash). JSON-LD / application/json / template là dữ liệu → không cần.
const EXEC_TYPES = /^(|text\/javascript|application\/javascript|module|speculationrules|importmap)$/i;
export const isExecType = t => EXEC_TYPES.test(String(t || '').trim());

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
/** Script nội tuyến thực thi trong HTML: [{attrs, body}] (bỏ <script src>) */
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1];
    if (/\ssrc\s*=/i.test(attrs)) continue;
    const t = (attrs.match(/\stype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '';
    if (!isExecType(t)) continue;
    out.push({ attrs, body: m[2] });
  }
  return out;
}

// Trình phân tích HTML chuẩn hoá xuống dòng (CRLF/CR → LF) TRƯỚC khi trình duyệt băm nội dung script
export const hashOf = body => "'sha256-" + crypto.createHash('sha256').update(body.replace(/\r\n?/g, '\n'), 'utf8').digest('base64') + "'";

/** Handler nội tuyến on*= và URL javascript: trong thẻ HTML (ngoài <script>/<style>) – CSP chặn, phải dùng listener trong file JS */
export function inlineHandlers(html) {
  const bare = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[\s\S]*?<\/style\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const bad = [];
  for (const tag of bare.matchAll(/<[a-z][a-z0-9-]*\b[^>]*>/gi)) {
    const a = tag[0].replace(/"[^"]*"|'[^']*'/g, '""').match(/\s(on[a-z]+)\s*=/i); if (a) bad.push(a[1] + ' trong ' + tag[0].slice(0, 80));
    if (/\s(href|src|action|formaction)\s*=\s*["']?\s*javascript:/i.test(tag[0])) bad.push('javascript: trong ' + tag[0].slice(0, 80));
  }
  return bad;
}

export const META_ID = 'lk-csp';
/** Nội dung meta cho 1 trang: script-src của header bỏ 'unsafe-inline' + hash. Không có frame-ancestors/report-* (meta không hỗ trợ). */
export function metaPolicy(html, policy = sitePolicy()) {
  const p = parsePolicy(policy);
  const src = (p.get('script-src') || p.get('default-src') || ["'self'"]).filter(t => t.toLowerCase() !== "'unsafe-inline'");
  const hashes = [...new Set(inlineScripts(html).map(s => hashOf(s.body)))];
  return [`script-src ${[...src, ...hashes].join(' ')}`, "script-src-attr 'none'", `object-src ${(p.get('object-src') || ["'none'"]).join(' ')}`, `base-uri ${(p.get('base-uri') || ["'self'"]).join(' ')}`].join('; ');
}

/** Chèn (hoặc thay) meta CSP ngay sau <head> – TRƯỚC mọi script (meta chỉ áp cho phần tử phía sau nó). */
export function injectMeta(html, policy) {
  const clean = html.replace(new RegExp(`[ \\t]*<meta http-equiv="Content-Security-Policy" id="${META_ID}"[^>]*>\\n?`, 'g'), '');
  const tag = `<meta http-equiv="Content-Security-Policy" id="${META_ID}" content="${metaPolicy(clean, policy).replace(/"/g, '&quot;')}">`;
  const head = clean.match(/<head\b[^>]*>/i);
  if (head) return clean.slice(0, head.index + head[0].length) + tag + '\n' + clean.slice(head.index + head[0].length); // tag + '\n' ngay sau <head>: bước gỡ (regex ăn '\n' sau tag) hoàn nguyên đúng bản gốc → chạy lại ra y hệt
  const first = clean.search(/<(script|meta|link|title|base|style)\b/i); // tài liệu thiếu <head> (head ngầm định)
  if (first < 0) return tag + '\n' + clean;
  return clean.slice(0, first) + tag + '\n' + clean.slice(first);
}

/** Kiểm 1 trang đã chèn: trả danh sách lỗi (rỗng = đạt) */
export function checkPage(html, policy = sitePolicy()) {
  const errs = [];
  const metas = [...html.matchAll(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi)];
  const ours = metas.find(m => m[0].includes(`id="${META_ID}"`));
  if (!ours) return inlineScripts(html).length || inlineHandlers(html).length || /<script\b/i.test(html) ? ['thiếu meta CSP'] : [];
  const content = (ours[0].match(/content="([^"]*)"/) || [])[1].replace(/&quot;/g, '"');
  const sp = parsePolicy(content).get('script-src') || [];
  if (sp.some(t => /^'unsafe-(inline|eval)'$/i.test(t))) errs.push("meta script-src có 'unsafe-inline'/'unsafe-eval'");
  const firstScript = html.search(/<script\b/i);
  if (firstScript >= 0 && ours.index > firstScript) errs.push('meta CSP nằm SAU thẻ <script> đầu tiên (không áp cho script trước nó)');
  for (const s of inlineScripts(html)) if (!sp.includes(hashOf(s.body))) errs.push('script nội tuyến chưa có hash: ' + s.body.trim().slice(0, 60));
  for (const h of inlineHandlers(html)) errs.push('handler nội tuyến: ' + h);
  return errs;
}
