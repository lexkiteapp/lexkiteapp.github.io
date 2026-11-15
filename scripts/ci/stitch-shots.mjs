#!/usr/bin/env node
// Ảnh QC Stitch lên R2 + MỘT bình luận PR (marker <!-- stitch-shots -->, tìm cũ rồi PATCH – không đăng mới).
// Vì sao: giám khảo UI đọc link ảnh, không cần tải artifact. Ảnh KHÔNG vào repo.
// Nơi chứa: bucket RIÊNG TƯ lexkite-report-shots của cơ chế report-shots (docs/REPORTS.md § Ảnh chụp), tiền tố ci-shots/pr<N>/<sha7>/, qua API S3
//   (scripts/lib/media-store.mjs, khoá S3 suy từ CLOUDFLARE_API_TOKEN như scripts/cdn/creds.mjs – không secret/bucket mới). Link = URL ký sẵn
//   (SigV4, sống 7 ngày) → mở được không cần đăng nhập, hết hạn tự chết.
// Dọn: mỗi lượt xoá ảnh ci-shots/ quá 14 ngày + sha cũ của chính PR này (cách report-shots: xoá theo hạn, không tích tụ).
// PR từ fork / thiếu secret / bucket chưa tạo / R2 đóng băng → bỏ qua êm (exit 0, không đỏ).
// Dùng: node scripts/ci/stitch-shots.mjs   (env: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, CLOUDFLARE_API_TOKEN | R2_ACCESS_KEY_ID+R2_SECRET_ACCESS_KEY)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { isMain } from '../lib/is-main.mjs';
import { r2Config, r2Put, r2List, r2Delete, sha256hex } from '../lib/media-store.mjs';
import { s3Secret, tokenId } from '../cdn/creds.mjs';

export const MARKER = '<!-- stitch-shots -->', BUCKET = 'lexkite-report-shots', PREFIX = 'ci-shots/', TTL_DAYS = 14, LINK_SECS = 7 * 86400, MAX_FILES = 120;
// cột → [thư mục, mẫu tên tệp (nhóm 1 = tên màn), nhãn]. Bản nhỏ (sm-*) trước: nhẹ, đủ đọc.
export const KINDS = [
  ['sheet', 'out/final-qc', /^sm-sheet-(.+)\.jpg$/, 'Tờ QC: Stitch · app sáng/tối 390 · 360 · RTL'],
  ['side', 'out/stitch-diff', /^sm-side-(.+)\.jpg$/, 'Stitch | app (sáng/tối)'],
  ['wide', 'out/stitch-diff', /^sm-w-(.+)\.jpg$/, '360 · 390 · 412'],
  ['desk', 'out/stitch-diff', /^sm-desk-(.+)\.jpg$/, 'Máy tính 1366'],
  ['rtl', 'out/final-qc', /^ar-(.+)\.png$/, 'RTL (ar)'],
];
const EXTRA = [['out/stitch-v2', /^sheet-(\d+)\.png$/, n => 'tờ-stitch-v2-' + n]]; // tờ duyệt HTML Stitch v2 (PNG lớn → nén JPEG)
const TYPES = { jpg: 'image/jpeg', png: 'image/png' };

/** Gom ảnh: [{ kind, screen, file, key(tên trên R2), type }] – tối đa MAX_FILES, thứ tự ổn định. */
export function collect(root = '.') {
  const out = [], seen = new Set();
  for (const [kind, dir, re] of KINDS) { const d = path.join(root, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) { const m = f.match(re); if (!m) continue; const ext = f.split('.').pop(), screen = m[1];
      const name = `${kind}-${screen}.${ext}`.replace(/[^A-Za-z0-9._-]/g, '_'); if (seen.has(name)) continue; seen.add(name); out.push({ kind, screen, file: path.join(d, f), name, type: TYPES[ext] }); } }
  for (const [dir, re, lab] of EXTRA) { const d = path.join(root, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) { const m = f.match(re); if (m) out.push({ kind: 'v2', screen: lab(m[1]), file: path.join(d, f), name: `v2-${lab(m[1])}.jpg`, type: TYPES.jpg, convert: true }); } }
  return out.slice(0, MAX_FILES);
}

const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const hm = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
/** URL GET ký sẵn (AWS SigV4 query, payload UNSIGNED) – R2 S3: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?X-Amz-… */
export function presign(cfg, key, secs = LINK_SECS, date = new Date()) {
  const amz = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), day = amz.slice(0, 8), scope = `${day}/${cfg.region}/s3/aws4_request`;
  const q = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${cfg.keyId}/${scope}`, 'X-Amz-Date': amz, 'X-Amz-Expires': String(Math.min(secs, 604800)), 'X-Amz-SignedHeaders': 'host' };
  const cq = Object.keys(q).sort().map(k => `${enc(k)}=${enc(q[k])}`).join('&'), p = '/' + [cfg.bucket, ...key.split('/')].map(enc).join('/');
  const creq = ['GET', p, cq, `host:${cfg.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n'), sts = ['AWS4-HMAC-SHA256', amz, scope, sha256hex(creq)].join('\n');
  const sig = crypto.createHmac('sha256', hm(hm(hm(hm('AWS4' + cfg.secret, day), cfg.region), 's3'), 'aws4_request')).update(sts).digest('hex');
  return `https://${cfg.host}${p}?${cq}&X-Amz-Signature=${sig}`;
}

/** Nội dung bình luận: bảng link theo màn + dòng axe (nếu có scores.json). links = { 'kind-screen.ext': url }. */
export function renderComment({ files, links, sha, a11y = {}, now = new Date(), ttlDays = 7 }) {
  const screens = [...new Set(files.filter(f => f.kind !== 'v2').map(f => f.screen))].sort(), kinds = KINDS.filter(([k]) => files.some(f => f.kind === k));
  const link = (kind, screen, label) => { const f = files.find(x => x.kind === kind && x.screen === screen); return f && links[f.name] ? `[${label}](${links[f.name]})` : '–'; };
  const L = [MARKER, '### 🖼️ Ảnh QC Stitch (bấm là xem, không cần tải artifact)', '',
    `Commit \`${String(sha).slice(0, 7)}\` · cập nhật ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC · link ký sẵn, hết hạn sau ${ttlDays} ngày (chạy lại workflow Stitch diff để làm mới).`, ''];
  if (screens.length) {
    L.push('| Màn | ' + kinds.map(([, , , lab]) => lab).join(' | ') + ' | axe nặng/tổng (sáng · tối) |', '|---|' + kinds.map(() => '---').join('|') + '|---|');
    for (const s of screens) { const ax = ['light', 'dark'].map(m => { const v = (a11y[`${s}-${m}`] || {}).violations; return v ? `${v.filter(x => x.impact === 'serious' || x.impact === 'critical').length}/${v.length}` : '–'; }).join(' · ');
      L.push(`| \`${s}\` | ` + kinds.map(([k]) => link(k, s, 'ảnh')).join(' | ') + ` | ${ax} |`); } }
  const v2 = files.filter(f => f.kind === 'v2'); if (v2.length) L.push('', 'Tờ duyệt Stitch v2 (HTML tĩnh 390 px, trên tối · dưới sáng): ' + v2.map(f => link('v2', f.screen, f.screen)).join(' · '));
  L.push('', '<sub>Tự động bởi `.github/workflows/stitch-diff.yml` (scripts/ci/stitch-shots.mjs) · ảnh nằm trong R2 riêng tư, không commit vào repo.</sub>');
  return L.join('\n');
}

/** Tìm bình luận có marker → PATCH, không có → POST (đúng MỘT bình luận). api(method, path, body) → JSON. */
export async function upsertComment(api, repo, pr, body) {
  for (let page = 1; page <= 10; page++) {
    const list = await api('GET', `/repos/${repo}/issues/${pr}/comments?per_page=100&page=${page}`); if (!Array.isArray(list)) break;
    const hit = list.find(c => typeof c.body === 'string' && c.body.includes(MARKER)); if (hit) { await api('PATCH', `/repos/${repo}/issues/comments/${hit.id}`, { body }); return { id: hit.id, created: false }; }
    if (list.length < 100) break;
  }
  const r = await api('POST', `/repos/${repo}/issues/${pr}/comments`, { body }); return { id: r && r.id, created: true };
}

const skip = why => { console.log(`stitch-shots: bỏ qua (${why})`); process.exit(0); };
if (isMain(import.meta.url)) {
  const env = process.env, repo = env.GITHUB_REPOSITORY, pr = +env.PR_NUMBER || 0, sha = env.HEAD_SHA || '';
  try {
    if (!pr || !repo || !env.GITHUB_TOKEN) skip('không phải PR / thiếu token');
    let e = { ...env, R2_BUCKET: BUCKET };
    if (env.CLOUDFLARE_API_TOKEN) { const id = await tokenId(env.CLOUDFLARE_API_TOKEN); if (id) e = { ...e, R2_ACCESS_KEY_ID: id, R2_SECRET_ACCESS_KEY: s3Secret(env.CLOUDFLARE_API_TOKEN) }; }
    const cfg = r2Config(e); if (!cfg) skip('không có khoá R2 (PR fork / thiếu secret) hoặc R2 đóng băng');
    const files = collect('.'); if (!files.length) skip('không có ảnh QC trong out/');
    const dir = `${PREFIX}pr${pr}/${sha.slice(0, 7) || 'x'}/`, links = {}, tmp = fs.mkdtempSync(path.join(env.RUNNER_TEMP || env.TMPDIR || '/tmp', 'shots-'));
    for (const f of files) { let src = f.file; // PNG lớn của tờ v2 → JPEG (ImageMagick có sẵn trong job)
      if (f.convert) { const o = path.join(tmp, f.name); try { execFileSync('convert', [src, '-resize', '1600x4000>', '-quality', '72', o]); src = o; } catch { continue; } }
      await r2Put(cfg, dir + f.name, fs.readFileSync(src), f.type); links[f.name] = presign(cfg, dir + f.name); }
    // dọn: quá hạn + sha cũ của PR này
    const old = Date.now() - TTL_DAYS * 864e5; let del = 0;
    for await (const o of r2List(cfg, PREFIX)) { const mine = o.key.startsWith(`${PREFIX}pr${pr}/`) && !o.key.startsWith(dir); if (mine || (o.modified && Date.parse(o.modified) < old)) { await r2Delete(cfg, o.key); del++; } }
    let a11y = {}; try { a11y = JSON.parse(fs.readFileSync('out/stitch-diff/scores.json', 'utf8')).a11y || {}; } catch { /* không có */ }
    const body = renderComment({ files, links, sha, a11y });
    const api = async (method, p, b) => { const r = await fetch('https://api.github.com' + p, { method, headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'stitch-shots', ...(b ? { 'Content-Type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined });
      if (!r.ok) throw new Error(`GitHub ${method} ${p.split('?')[0]} → ${r.status}`); return r.status === 204 ? null : r.json(); };
    const r = await upsertComment(api, repo, pr, body);
    console.log(`stitch-shots: ${Object.keys(links).length} ảnh lên ${BUCKET}/${dir} (dọn ${del}); bình luận ${r.created ? 'ĐĂNG MỚI' : 'ĐÃ SỬA'} #${r.id}`);
  } catch (err) { console.log(`::warning::stitch-shots: ${String(err.message).replace(/https?:\/\/\S+/g, '<url>').slice(0, 300)} – không chặn PR`); }
  process.exit(0);
}
