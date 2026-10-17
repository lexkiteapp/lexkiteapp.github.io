#!/usr/bin/env node
// Kho tài nguyên dựng video (docs/ASSET-LIBRARY.md § "Lưu trữ & sao lưu"): tên chuẩn + manifest content/video/library.json + 2 nguồn sao lưu.
//   node scripts/video/library.mjs ingest <path…> --as <rel> [--qa N] [--reserve|--reject] [--waiver "lý do"] [--role listener] [--trimmed] [--replace]
//   node scripts/video/library.mjs ingest --plan scripts/video/library-seed.json [--on-fail reject]
//   node scripts/video/library.mjs check <file|id|all> [--no-vision]      cổng kỹ thuật + anatomy & style + AI thị giác (FAIL = không nhập)
//   node scripts/video/library.mjs sync [--dry-run] [--primary-only|--backup-only]
//   node scripts/video/library.mjs verify [--deep]
//   node scripts/video/library.mjs restore <id|all>
//   node scripts/video/library.mjs report
//   node scripts/video/library.mjs stack [id|all] [--force]    bản stacked cho render (clip_to_layer.py) + ghi brand/library/manifest.json
//   node scripts/video/library.mjs render-manifest              chỉ ghi lại + kiểm brand/library/manifest.json
//   CI (.github/workflows/library-build.yml): ci-plan [missing|all|id,…] · ci-build <id> --out dir · ci-apply <dir> [--no-sync]
// Nguồn chính: repo lexkite-media/library/ (bản web: WebP ≤ 400 KB, MP4 H.264 CRF 20) → https://media.lexkite.com/library/…
// Nguồn phụ: kho GrabCast (storage_class "bulk", bản gốc đủ phân giải, cả reserve/reject). Khoá/token KHÔNG BAO GIỜ được in hay ghi ra file.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const LIB = path.join(ROOT, 'brand/library');
export const CAND = path.join(ROOT, 'brand/characters/_candidates');
export const MANIFEST = path.join(ROOT, 'content/video/library.json');
export const CDN = 'https://media.lexkite.com/library/';
const MEDIA_REPO = 'lexkiteapp/lexkite-media', MEDIA_BRANCH = 'main';
const GC_BASE = String(process.env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
const GC_WS = String(process.env.GRABCAST_WORKSPACE || '4');
const REPO_WARN = 700 * 1048576, REPO_MAX = 950 * 1048576, WEBP_MAX = 400 * 1024;
const OWNER_STEP_GC = 'Chủ dự án: mở https://grabcast.click/scheduler.html → workspace "Lexkite" (4) → Lưu trữ/Storage → "Connect Google Drive" (kho R2 có sẵn đang 0 B trống). Xong chạy lại: node scripts/video/library.mjs sync --backup-only';

// ---------- tên chuẩn ----------
const RX = {
  char: /^chars\/([a-z]+)\/(dna|neutral|expr-[a-z0-9]+(?:-[a-z0-9]+)*|gesture-[a-z0-9]+(?:-[a-z0-9]+)*)\.png$/,
  clip: /^clips\/(src\/)?([a-z]+)_([a-z0-9]+(?:_[a-z0-9]+)*?)(?:_v(\d+))?\.mp4$/,
  room: /^rooms\/([a-z0-9]+(?:-[a-z0-9]+)*?)-(day|night|dusk)-(9x16|16x9|3x4|1x1)\.png$/,
  prop: /^props\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|svg)$/,
};
/** Phân tích đường dẫn tương đối trong kho → {kind, who, action, version, room, time, ratio, set, item} hoặc null nếu sai chuẩn. */
export function parseName(rel) {
  rel = String(rel).replace(/\\/g, '/');
  let m;
  if ((m = rel.match(RX.char))) return { kind: 'char', who: m[1], slot: m[2] };
  if ((m = rel.match(RX.clip))) return { kind: 'clip', who: m[2], action: m[3], version: m[4] ? +m[4] : 1, src: !!m[1] };
  if ((m = rel.match(RX.room))) return { kind: 'room', room: m[1], time: m[2], ratio: m[3] };
  if ((m = rel.match(RX.prop))) return { kind: 'prop', set: m[1], item: m[2], ext: m[3] };
  return null;
}
/** Dựng tên chuẩn từ các phần. */
export function canonical(kind, p) {
  const rel = kind === 'char' ? `chars/${p.who}/${p.slot}.png`
    : kind === 'clip' ? `clips/src/${p.who}_${p.action}${p.version > 1 ? '_v' + p.version : ''}.mp4`
    : kind === 'room' ? `rooms/${p.room}-${p.time}-${p.ratio}.png`
    : kind === 'prop' ? `props/${p.set}/${p.item}.${p.ext || 'png'}` : '';
  if (!parseName(rel)) throw new Error('tên không hợp chuẩn: ' + rel);
  return rel;
}
/** Tên tự suy từ kho nháp _candidates (clips/<who>_<action>.mp4, <who>/dna.png, <who>/neutral.png). */
export function inferCanonical(srcRel) {
  srcRel = srcRel.replace(/\\/g, '/');
  let m;
  if ((m = srcRel.match(/^([a-z]+)\/(dna|neutral)\.png$/))) return `chars/${m[1]}/${m[2]}.png`;
  if ((m = srcRel.match(/^clips\/([a-z]+_[a-z0-9_]+)\.mp4$/)) && parseName(`clips/src/${m[1]}.mp4`)) return `clips/src/${m[1]}.mp4`;
  return null;
}
export const ratioOf = rel => (parseName(rel) || {}).ratio;
const ratioArg = r => (r ? r.replace('x', ':') : undefined);

// ---------- manifest ----------
export function emptyManifest() {
  return { _note: 'Kho dựng video – sinh bởi scripts/video/library.mjs (đừng sửa tay trừ qa/roles/tags). File gốc ở brand/library/<file> (không commit), bản web ở ' + CDN + '<web>, bản gốc sao lưu ở GrabCast (backup.objectId). Quy trình: docs/ASSET-LIBRARY.md § "Lưu trữ & sao lưu".', version: 1, cdn: CDN, refs: {}, castStroke: null, items: [] };
}
export function loadManifest(p = MANIFEST) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return emptyManifest(); } }
export function saveManifest(m, p = MANIFEST) {
  m.items.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(p, JSON.stringify(m, null, 1) + '\n');
}
/** Thêm/cập nhật mục. Chặn: (1) trùng sha với mục khác, (2) id đã có nhưng sha khác (cần --replace → tạo _vN mới thì tốt hơn). */
export function upsertEntry(m, e, { replace = false } = {}) {
  const dup = m.items.find(x => x.sha256 === e.sha256 && x.id !== e.id);
  if (dup) throw new Error(`trùng nội dung (sha256) với ${dup.id} – không nhập bản sao`);
  const i = m.items.findIndex(x => x.id === e.id);
  if (i >= 0) {
    const old = m.items[i];
    if (old.sha256 !== e.sha256 && !replace) throw new Error(`${e.id} đã có với nội dung khác – đặt tên phiên bản mới (_v2) hoặc dùng --replace`);
    m.items[i] = { ...old, ...e, locations: old.sha256 === e.sha256 ? old.locations : e.locations };
    return m.items[i];
  }
  m.items.push(e);
  return e;
}
/** Cổng điểm QA: approved cần qa ≥ 90 hoặc lý do miễn (waiver) ghi rõ; còn lại phải --reserve/--reject. */
export function qaStatus({ qa, reserve, reject, waiver }) {
  if (reject) return 'reject';
  if (reserve) return 'reserve';
  if ((qa != null && qa >= 90) || waiver) return 'approved';
  throw new Error(`qa ${qa ?? 'chưa chấm'} < 90 – thêm --reserve (dự phòng) hoặc --waiver "<lý do từ qa-log>"`);
}

// ---------- tiện ích ----------
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
export const gitBlobSha = buf => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
export const webPath = (rel) => rel.replace(/\.png$/, '.webp');
/** Đường dẫn bản stacked (render.mjs đọc) của clip gốc clips/src/x.mp4 → clips/x.mp4. */
export const stackedRel = rel => rel.replace(/^clips\/src\//, 'clips/');
const mime = f => (/\.mp4$/.test(f) ? 'video/mp4' : /\.webp$/.test(f) ? 'image/webp' : /\.svg$/.test(f) ? 'image/svg+xml' : /\.json$/.test(f) ? 'application/json' : 'image/png');
const today = () => new Date().toLocaleDateString('sv-SE');
const MB = n => (n / 1048576).toFixed(1) + ' MB';
const secrets = [];
const scrub = s => secrets.reduce((t, k) => (k && k.length > 6 ? t.split(k).join('***') : t), String(s));
const log = (...a) => console.log(scrub(a.join(' ')));

function python() {
  const c = [process.env.LEXKITE_PY, path.join(ROOT, '.tools/pyenv/bin/python'), 'python3'].filter(Boolean);
  for (const p of c) { const r = spawnSync(p, ['-c', 'import numpy, PIL'], { stdio: 'ignore' }); if (r.status === 0) return p; }
  throw new Error('thiếu Python có numpy + pillow: python3 -m venv .tools/pyenv && .tools/pyenv/bin/pip install numpy pillow mediapipe');
}
function probe(file) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
    const v = (j.streams || []).find(s => s.codec_type === 'video') || {};
    return { w: +v.width || null, h: +v.height || null, duration: j.format && j.format.duration ? +(+j.format.duration).toFixed(3) : null };
  } catch { return {}; }
}

// ---------- kiểm tra kỹ thuật (Python) + AI thị giác ----------
const kindArg = (kind, rel) => (kind === 'clip' && /\.stacked\.mp4$/.test(rel) ? 'stacked' : kind);
export function runCheck(file, entry, m, { sheet, kind } = {}) {
  const args = [path.join(HERE, 'asset_check.py'), file, '--kind', kind || kindArg(entry.kind, file)];
  const r = ratioArg(ratioOf(entry.file)); if (r) args.push('--ratio', r);
  if (entry.trimmed) args.push('--trimmed');
  if (entry.who && (entry.kind === 'char' || entry.kind === 'clip')) {
    args.push('--who', entry.who);
    const ref = m.refs && m.refs[entry.who]; if (ref) args.push('--ref', JSON.stringify(ref));
    if (m.castStroke) args.push('--cast-stroke', m.castStroke.join(','));
  }
  if (sheet) args.push('--sheet', sheet);
  const p = spawnSync(python(), args, { encoding: 'utf8', env: { ...process.env, MPLCONFIGDIR: path.join(os.tmpdir(), 'lexkite-mpl'), GLOG_minloglevel: '3', TF_CPP_MIN_LOG_LEVEL: '3' }, maxBuffer: 64 << 20 });
  const line = (p.stdout || '').trim().split('\n').filter(l => l.startsWith('{')).pop();
  if (!line) return { status: 'FAIL', checks: [{ name: 'checker', status: 'FAIL', reason: 'asset_check.py lỗi: ' + (p.stderr || '').trim().split('\n').pop() }], metrics: {}, suggest: {} };
  return JSON.parse(line);
}

let geminiKeys = null;
/** Khoá Gemini xoay vòng của dự án: env GEMINI_KEYS (phẩy) hoặc D1 config 'gemini_keys' qua wrangler + ~/.config/lexkite/cf-token. Chỉ giữ trong bộ nhớ. */
function loadGeminiKeys() {
  if (geminiKeys) return geminiKeys;
  geminiKeys = (process.env.GEMINI_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  const tokFile = path.join(os.homedir(), '.config/lexkite/cf-token');
  if (!geminiKeys.length && fs.existsSync(tokFile)) {
    try {
      const npx = path.join(os.homedir(), '.npm/_npx'), found = fs.existsSync(npx) ? fs.readdirSync(npx).map(d => path.join(npx, d, 'node_modules/.bin/wrangler')).find(f => fs.existsSync(f)) : null;
      const wr = process.env.WRANGLER_BIN || found || 'wrangler';
      const out = execFileSync(wr, ['d1', 'execute', 'lexkite-sync', '--remote', '--json', '--command', "SELECT k, v FROM config WHERE k IN ('gemini_keys','gemini_key')"], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, CLOUDFLARE_API_TOKEN: fs.readFileSync(tokFile, 'utf8').trim(), CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || 'e34e14b7ab35eaf2b3d9d84fcce011f7', WRANGLER_LOG_PATH: path.join(os.tmpdir(), 'wlogs') },
      });
      for (const r of JSON.parse(out)[0].results || []) {
        if (r.k === 'gemini_keys') { try { geminiKeys.push(...JSON.parse(r.v).map(x => x.k).filter(Boolean)); } catch { /* bỏ qua */ } } else if (r.v) geminiKeys.push(r.v);
      }
    } catch { /* không lấy được khoá → bỏ qua bước AI */ }
  }
  geminiKeys = [...new Set(geminiKeys)];
  secrets.push(...geminiKeys);
  return geminiKeys;
}
const VISION_PROMPT = who => `You are a strict QA reviewer for a flat 2D vector cartoon character library (brand: warm palette, teal/orange accents, soft dark-brown outlines).
Image 1 = reference DNA of the character "${who}" (ground truth for identity and style). Image 2 = contact sheet of frames/poses of the asset under review.
Check ONLY image 2 against image 1. Answer JSON only:
{"hands_ok": bool (every visible hand has ≤5 fingers, no fused/extra/missing hands), "limbs_ok": bool (exactly 2 arms and 2 legs, no broken or impossible joints),
 "face_ok": bool (2 eyes, 1 mouth, plausible symmetry, glasses/accessories present if the reference has them), "extra_people": bool, "text_present": bool (any letters, logos or watermarks),
 "style_consistent": bool (same flat 2D style and outline weight as reference, not photographic), "identity_consistent": bool (same hairstyle, hair colour, skin, outfit as reference in every frame),
 "issues": [short strings]}`;
async function gemini(parts, keys) {
  for (let n = 0; n < keys.length; n++) {
    const k = keys[(Math.floor(Math.random() * keys.length) + n) % keys.length];
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (r.ok) { const j = await r.json(); return JSON.parse(((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('') || '{}'); }
    if (![429, 403, 503, 500].includes(r.status)) throw new Error('Gemini ' + r.status + ' ' + scrub((await r.text()).slice(0, 160)));
    if (r.status === 429 || r.status === 503) {
      // hạn mức theo phút → chờ & thử lại; hết hạn mức ngày (gói miễn phí 20 lượt/ngày, "retry in 41m") → bỏ khoá này cho cả lượt chạy
      const t = await r.text(), mm = t.match(/retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
      const sec = mm ? (+(mm[1] || 0)) * 3600 + (+(mm[2] || 0)) * 60 + +mm[3] : +(r.headers.get('Retry-After') || 20);
      if (sec <= 90 && (gemini.waits = (gemini.waits || 0) + 1) <= 20) { await new Promise(res => setTimeout(res, sec * 1000 + 500)); n--; continue; }
      keys.splice(keys.indexOf(k), 1); n--; if (!keys.length) return null;
    }
  }
  return null; // hết hạn mức mọi khoá
}
/** Đánh giá kết quả AI thị giác → {status, reasons}. Lỗi nào cũng FAIL. Exported để test. */
export function visionVerdict(v) {
  if (!v) return { status: 'SKIP', reasons: ['không có khoá/hạn mức Gemini – cần duyệt tay'] };
  const bad = [];
  for (const k of ['hands_ok', 'limbs_ok', 'face_ok', 'style_consistent', 'identity_consistent']) if (v[k] === false) bad.push(k === 'identity_consistent' ? 'identity drift' : k.replace('_ok', ' lỗi').replace('_consistent', ' lệch'));
  if (v.extra_people) bad.push('thừa người'); if (v.text_present) bad.push('có chữ/watermark');
  return { status: bad.length ? 'FAIL' : 'PASS', reasons: bad.concat(bad.length ? (v.issues || []).slice(0, 4) : []) };
}
async function visionCheck(entry, sheet, m, file) {
  if (!entry.who || !sheet || !fs.existsSync(sheet)) return null;
  const keys = loadGeminiKeys();
  if (!keys.length) return visionVerdict(null);
  const refItem = m.items.find(x => x.who === entry.who && x.ref) || m.items.find(x => x.who === entry.who && x.kind === 'char' && /dna/.test(x.file));
  // ảnh DNA/ref đang nhập: chính nó là chuẩn (vẫn kiểm tay/chân/mặt/chữ)
  const refFile = (entry.ref || /\/dna\.png$/.test(entry.file || '')) && file ? file : refItem && path.join(LIB, refItem.file);
  if (!refFile || !fs.existsSync(refFile)) return { status: 'SKIP', reasons: ['chưa có ảnh DNA của ' + entry.who + ' trong kho – cần duyệt tay'] };
  const small = path.join(os.tmpdir(), `lexkite-ref-${entry.who}.jpg`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', refFile, '-vf', 'scale=-2:640', small]);
  const img = f => ({ inline_data: { mime_type: 'image/jpeg', data: fs.readFileSync(f).toString('base64') } });
  try {
    const v = await gemini([{ text: VISION_PROMPT(entry.who) }, img(small), img(sheet)], keys);
    return { ...visionVerdict(v), raw: v || undefined };
  } catch (e) { return { status: 'SKIP', reasons: ['Gemini lỗi: ' + scrub(e.message).slice(0, 120) + ' – cần duyệt tay'] }; }
}
const reviewPath = id => path.join(LIB, '_review', id.replace(/[/.]/g, '_') + '.jpg');
/** Chạy toàn bộ cổng cho 1 file; trả {status, check, vision}. Bảng ghép giữ ở brand/library/_review/ nếu WARN/FAIL. */
async function gate(file, entry, m, { vision = true } = {}) {
  const sheet = reviewPath(entry.id);
  const res = runCheck(file, entry, m, { sheet });
  let vis = null;
  if (vision && entry.who && res.sheet && (entry.status !== 'reject' || entry.quarantinedFrom)) vis = await visionCheck(entry, res.sheet, m, file); // bỏ AI cho clip loại sẵn (tiết kiệm hạn mức Gemini 20 lượt/ngày)
  // Gemini hết hạn mức → dùng lại kết luận AI lần trước nếu file không đổi
  const prevVis = entry.check && entry.check.vision;
  if ((!vis || vis.status === 'SKIP') && prevVis && prevVis.status !== 'SKIP' && (!prevVis.sha || prevVis.sha === entry.sha256)) vis = { status: prevVis.status, reasons: prevVis.reasons, reused: prevVis.at || true };
  if (!vis && entry.who && (entry.kind === 'char' || entry.kind === 'clip')) vis = visionVerdict(null);
  let status = res.status;
  if (vis && vis.status === 'FAIL') status = 'FAIL';
  else if (vis && vis.status === 'SKIP' && status === 'PASS') status = 'WARN';
  const notPass = (res.checks || []).filter(c => c.status !== 'PASS' && c.status !== 'INFO');
  const check = { status, at: today(), issues: notPass.map(c => `${c.status} ${c.name}: ${c.reason}`), metrics: pickMetrics(res.metrics), suggest: res.suggest && Object.keys(res.suggest).length ? res.suggest : undefined };
  if (vis) check.vision = { status: vis.status, reasons: vis.reasons, sha: entry.sha256, at: vis.reused ? (vis.reused === true ? undefined : vis.reused) : today() };
  if (vis && vis.status !== 'PASS') check.issues.push(`${vis.status === 'FAIL' ? 'FAIL' : 'WARN'} vision: ${vis.reasons.join('; ')}`);
  if (vis && vis.status === 'SKIP') check.needsManualReview = true;
  if (status === 'PASS' && fs.existsSync(sheet)) fs.unlinkSync(sheet);
  if (status !== 'PASS' && fs.existsSync(sheet)) check.sheet = path.relative(ROOT, sheet);
  return check;
}
function pickMetrics(mt = {}) {
  const o = {}; for (const k of ['w', 'h', 'fps', 'duration', 'motion', 'drift', 'footWobble', 'bgShift', 'dupRun', 'cadenceTwos', 'audioPeakDb', 'margins', 'bgMad', 'textScore', 'brandShare', 'floorBusy', 'alphaFlicker', 'shadowRatio']) if (mt[k] != null) o[k] = mt[k];
  return o;
}

// ---------- ingest ----------
function refreshRefs(m) {
  const sw = Object.values(m.refs || {}).map(r => r.strokeW).filter(Boolean);
  m.castStroke = sw.length ? [Math.min(...sw), Math.max(...sw)].map(v => +v.toFixed(2)) : null;
}
async function ingestOne(src, opt, m) {
  const abs = path.isAbsolute(src) ? src : fs.existsSync(path.join(CAND, src)) ? path.join(CAND, src) : path.resolve(src);
  if (!fs.existsSync(abs)) throw new Error('không thấy ' + src);
  const rel = opt.as || inferCanonical(path.relative(CAND, abs));
  const pn = rel && parseName(rel);
  if (!pn) throw new Error(`tên đích "${rel || '?'}" không hợp chuẩn – dùng --as (chars/<who>/<slot>.png · clips/<who>_<action>[_vN].mp4 · rooms/<room>-<time>-<ratio>.png · props/<set>/<item>.png|svg)`);
  const buf = fs.readFileSync(abs), sha = sha256(buf);
  const status = qaStatus(opt);
  // clip: file = bản gốc clips/src/…, id = đường dẫn render clips/<who>_<action>.mp4 (bản stacked do `stack` tạo)
  if (pn.kind === 'clip' && !pn.src) throw new Error('clip gốc phải nằm ở clips/src/… (clips/<id>.mp4 dành cho bản stacked của render)');
  const id = pn.kind === 'clip' ? stackedRel(rel) : rel;
  const dup = m.items.find(x => x.sha256 === sha && x.id !== id);
  if (dup) throw new Error(`trùng nội dung với ${dup.id}`);
  const pr = /\.(mp4|png)$/.test(rel) ? probe(abs) : {};
  const st = fs.statSync(abs);
  const entry = {
    id, kind: pn.kind, who: pn.who || undefined, tags: opt.tags || tagsFor(pn), file: rel, sha256: sha, bytes: buf.length,
    w: pr.w || undefined, h: pr.h || undefined, duration: pn.kind === 'clip' ? pr.duration : undefined,
    qa: opt.qa ?? null, waiver: opt.waiver || undefined, note: opt.note || undefined, trimmed: opt.trimmed || undefined,
    source: { from: path.relative(ROOT, abs), tool: opt.source || (pn.kind === 'clip' ? 'Kling 2.5 Turbo' : 'Kling'), prompt: opt.prompt || null, date: opt.date || st.mtime.toISOString().slice(0, 10) },
    roles: pn.kind === 'clip' ? (opt.roles || ['speaker']) : undefined, status, ref: opt.ref || undefined,
    locations: { primary: null, backup: { status: 'pending' } },
  };
  // cổng kỹ thuật: chạy trên file gốc trước khi chép
  const check = await gate(abs, entry, m, { vision: opt.vision !== false });
  entry.check = check;
  if (check.status === 'FAIL' && status !== 'reject') {
    if (opt.onFail !== 'reject') { if (check.sheet) log(`  bảng ghép: ${check.sheet}`); throw new Error('check FAIL – không nhập: ' + check.issues.filter(s => s.startsWith('FAIL')).join(' | ')); }
    entry.quarantinedFrom = status; entry.status = 'reject'; entry.rejectReason = 'check FAIL (cách ly, chỉ sao lưu): ' + check.issues.filter(s => s.startsWith('FAIL')).join(' | ');
  }
  if (check.suggest && check.suggest.role === 'listener' && entry.roles && !entry.roles.includes('listener')) entry.roles.push('listener');
  const dest = path.join(LIB, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(abs, dest);
  if (pn.kind === 'room' && check.suggest && check.suggest.floorProfile) writeFloorProfile(pn, entry, check.suggest.floorProfile);
  if (pn.kind === 'room') setTimeout(() => writeRenderManifest(m), 0);
  if (opt.ref && pn.kind === 'char' && check.suggest && check.suggest.ref) { m.refs[pn.who] = { ...check.suggest.ref, from: rel }; refreshRefs(m); }
  return upsertEntry(m, entry, { replace: opt.replace });
}
function tagsFor(pn) {
  if (pn.kind === 'clip') return pn.action.split('_');
  if (pn.kind === 'char') return [pn.slot.replace(/^(expr|gesture)-/, '')];
  if (pn.kind === 'room') return [pn.room.replace(/-\d+$/, ''), pn.time, pn.ratio];
  if (pn.kind === 'prop') return [pn.set];
  return [];
}
/** Hồ sơ sàn tự động rooms/<room>.json (§0) – đổi về canvas rộng 1080 như render.mjs; không ghi đè bản đã sửa tay (manual: true). */
function writeFloorProfile(pn, entry, prof) {
  const out = path.join(LIB, 'rooms', `${pn.room}.json`);
  if (fs.existsSync(out)) { try { if (JSON.parse(fs.readFileSync(out, 'utf8')).manual) return; } catch { /* ghi lại */ } }
  const k = 1080 / (entry.w || 1080), R = v => Math.round(v * k);
  const j = {
    _note: 'Hồ sơ sàn TỰ ĐỘNG (scripts/video/asset_check.py estimate_floor) – canvas rộng 1080. Sửa tay xong đặt "manual": true để không bị ghi đè.',
    id: pn.room, manual: false, confidence: prof.confidence, canvas: [1080, R(entry.h || 1920)], source: entry.file,
    floor: { yNear: R(prof.floor.yNear), yFar: R(prof.floor.yFar) }, vanish: prof.vanish.map(R),
    scaleAt: { yFar: R(prof.scaleAt.yFar), hFar: R(prof.scaleAt.hFar), yNear: R(prof.scaleAt.yNear), hNear: R(prof.scaleAt.hNear) },
    stand: prof.stand.map(s => ({ x: R(s.x), y: R(s.y) })), light: prof.light,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(j, null, 1) + '\n');
}
async function cmdIngest(args, opts) {
  const m = loadManifest();
  const jobs = [];
  if (opts.plan) {
    const plan = JSON.parse(fs.readFileSync(opts.plan, 'utf8')), d = plan.defaults || {};
    for (const it of plan.items) {
      const base = { qa: it.qa ?? null, reserve: !!it.reserve, reject: !!it.reject, waiver: it.waiver, roles: it.roles, trimmed: it.trimmed, note: it.note, ref: it.ref, date: it.date || d.date, onFail: opts.onFail, vision: opts.vision, replace: opts.replace };
      if (it.glob) {
        const dir = path.join(CAND, path.dirname(it.glob)), re = new RegExp('^' + path.basename(it.glob).replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        for (const f of fs.readdirSync(dir).filter(f => re.test(f)).sort()) jobs.push([path.join(path.dirname(it.glob), f), { ...base, as: it.asDir + f }]);
      } else jobs.push([it.src, { ...base, as: it.as }]);
    }
    // ảnh DNA/ref trước để clip so được với DNA
    jobs.sort((a, b) => (b[1].ref ? 1 : 0) - (a[1].ref ? 1 : 0));
  } else for (const a of args) jobs.push([a, { ...opts }]);
  let ok = 0, fail = 0;
  for (const [src, o] of jobs) {
    try {
      const e = await ingestOne(src, o, m);
      ok++; log(`✓ ${e.id} · ${e.status}${e.rejectReason ? ' (cách ly: check FAIL)' : ''} · check ${e.check.status}${e.check.vision ? ' · AI ' + e.check.vision.status : ''}`);
      saveManifest(m);
    } catch (err) { fail++; log(`✗ ${src}: ${err.message}`); }
  }
  log(`\nNhập ${ok} · lỗi ${fail} → ${path.relative(ROOT, MANIFEST)}`);
  return fail ? 1 : 0;
}

// ---------- check ----------
async function cmdCheck(target, opts) {
  const m = loadManifest();
  const items = (target === 'all' ? [...m.items] : m.items.filter(x => x.id === target || x.file === target)).sort((a, b) => (b.ref ? 1 : 0) - (a.ref ? 1 : 0)); // DNA/ref trước
  if (!items.length && target && fs.existsSync(target)) { // file ngoài kho: chỉ kiểm, không ghi manifest
    const rel = opts.as || inferCanonical(path.relative(CAND, path.resolve(target))) || '';
    const pn = parseName(rel) || { kind: /\.mp4$/.test(target) ? 'clip' : 'char' };
    const c = await gate(path.resolve(target), { id: rel || path.basename(target), kind: pn.kind, who: pn.who, file: rel, trimmed: opts.trimmed }, m, { vision: opts.vision !== false });
    console.log(JSON.stringify(c, null, 1)); return c.status === 'FAIL' ? 1 : 0;
  }
  const rows = [];
  for (const e of items) {
    const f = path.join(LIB, e.file);
    if (!fs.existsSync(f)) { rows.push([e.id, 'MISSING', 'file gốc chưa có ở brand/library (chạy restore)']); continue; }
    e.check = await gate(f, e, m, { vision: opts.vision !== false });
    if (e.kind === 'room' && e.check.suggest && e.check.suggest.floorProfile) writeFloorProfile(parseName(e.file), e, e.check.suggest.floorProfile);
    if (e.ref && e.kind === 'char' && e.check.suggest && e.check.suggest.ref) { m.refs[e.who] = { ...e.check.suggest.ref, from: e.file }; refreshRefs(m); }
    // FAIL → cách ly (reject, nhớ trạng thái cũ); lần sau qua cổng → trả lại trạng thái cũ
    if (e.check.status === 'FAIL' && e.status !== 'reject') { e.quarantinedFrom = e.status; e.status = 'reject'; e.rejectReason = 'check FAIL (cách ly): ' + e.check.issues.filter(s => s.startsWith('FAIL')).join(' | '); }
    else if (e.check.status !== 'FAIL' && e.quarantinedFrom) { e.status = e.quarantinedFrom; delete e.quarantinedFrom; delete e.rejectReason; }
    rows.push([e.id, e.check.status, e.check.issues.filter(s => !s.startsWith('INFO')).join(' | ')]);
    saveManifest(m);
    log(`${e.check.status.padEnd(4)} ${e.id}`);
  }
  if (target === 'all') for (const p of writeRenderManifest(m)) rows.push(['brand/library/manifest.json', /stacked FAIL|thiếu file|thiếu hồ sơ/.test(p) ? 'FAIL' : 'WARN', p]);
  const by = s => rows.filter(r => r[1] === s);
  log(`\nTổng: PASS ${by('PASS').length} · WARN ${by('WARN').length} · FAIL ${by('FAIL').length} · MISSING ${by('MISSING').length}`);
  for (const r of rows.filter(r => r[1] === 'FAIL' || r[1] === 'MISSING')) log(`  ${r[1]} ${r[0]}: ${r[2]}`);
  return by('FAIL').length ? 1 : 0;
}

// ---------- bản stacked (render.mjs) + manifest dựng brand/library/manifest.json ----------
const OUTFIT = { mia: 'office', leo: 'office', diane: 'office', ama: 'casual', carlos: 'casual' };
function rembgPython() {
  const c = [process.env.LEXKITE_REMBG_PY, path.join(ROOT, '.tools/pyenv/bin/python'), path.join(os.tmpdir(), 'vt12/bin/python'), '/tmp/claude-501/vt12/bin/python', 'python3'].filter(Boolean);
  for (const p of c) if (spawnSync(p, ['-c', 'import rembg, numpy, PIL'], { stdio: 'ignore' }).status === 0) return p;
  throw new Error('thiếu Python có rembg (isnet-anime): .tools/pyenv/bin/pip install "rembg[cpu]" hoặc đặt LEXKITE_REMBG_PY');
}
/** Tạo bản stacked cho clip (mặc định: mọi clip approved chưa có) bằng clip_to_layer.py, kiểm cổng "stacked", ghi foot/figH/w/h. */
async function cmdStack(target, opts) {
  const m = loadManifest();
  const items = m.items.filter(e => e.kind === 'clip' && (target === 'all' ? e.status === 'approved' : e.id === target || e.file === target));
  let ok = 0, bad = 0;
  for (const e of items) {
    const out = path.join(LIB, e.id), src = path.join(LIB, e.file);
    if (!fs.existsSync(src)) { log(`! ${e.id}: thiếu gốc ${e.file}`); bad++; continue; }
    if (!fs.existsSync(out) || opts.force) {
      const r = spawnSync(rembgPython(), [path.join(HERE, 'clip_to_layer.py'), src, '--stacked', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, U2NET_HOME: process.env.U2NET_HOME || (fs.existsSync('/tmp/claude-501/u2net') ? '/tmp/claude-501/u2net' : path.join(os.tmpdir(), 'u2net')) }, maxBuffer: 64 << 20 });
      if (r.status !== 0) { log(`✗ ${e.id}: clip_to_layer lỗi ${(r.stderr || '').trim().split('\n').pop()}`); bad++; continue; }
    }
    const res = runCheck(out, { ...e, file: e.id }, m, { kind: 'stacked', sheet: reviewPath(e.id + '.stacked') });
    registerStacked(e, stackedResult(e, out, res));
    res.status === 'FAIL' ? bad++ : ok++;
    saveManifest(m);
  }
  const probs = writeRenderManifest(m);
  log(`stack: ${ok} đạt · ${bad} lỗi · manifest dựng: ${probs.length ? probs.length + ' vấn đề' : 'OK'}`);
  for (const p of probs) log('  ✗ ' + p);
  return bad || probs.length ? 1 : 0;
}
/** Kết quả dựng stacked (dùng chung máy & CI): sha, kích thước, foot/figH, trạng thái cổng. */
function stackedResult(e, out, res) {
  const buf = fs.readFileSync(out), L = (res.suggest || {}).layer || {};
  if (res.status === 'PASS' && fs.existsSync(reviewPath(e.id + '.stacked'))) fs.unlinkSync(reviewPath(e.id + '.stacked'));
  return { id: e.id, srcSha: e.sha256, file: e.id, alpha: 'stacked', sha256: sha256(buf), bytes: buf.length, w: L.w, h: L.h, foot: L.foot, figH: L.figH, frames: L.frames, status: res.status, issues: (res.checks || []).filter(c => c.status === 'FAIL' || c.status === 'WARN').map(c => `${c.status} ${c.name}: ${c.reason}`), at: today() };
}
function registerStacked(e, r) {
  if (r.srcSha && r.srcSha !== e.sha256) throw new Error(`${e.id}: bản stacked dựng từ gốc khác (sha) – bỏ`);
  const { id, srcSha, ...st } = r;
  e.variants = { ...(e.variants || {}), stacked: st };
  log(`${st.status.padEnd(4)} ${e.id} (stacked ${st.w}×${st.h}×2, foot ${JSON.stringify(st.foot)}, figH ${st.figH})${st.status === 'FAIL' ? ' – ' + st.issues.filter(x => x.startsWith('FAIL')).join(' | ') : ''}`);
}

// ---------- CI (workflow .github/workflows/library-build.yml): xử lý nặng trên GitHub Actions, máy chỉ upload ----------
/** Danh sách clip cần dựng stacked: approved, đã có bản gốc ở library/src, chưa có stacked (hoặc --force / id chỉ định). */
function cmdCiPlan(target, opts) {
  const m = loadManifest();
  const want = target && target !== 'missing' && target !== 'all' ? new Set(target.split(',').map(x => x.replace(/^clips\//, '').replace(/\.mp4$/, ''))) : null;
  const ids = m.items.filter(e => e.kind === 'clip' && e.status === 'approved' && e.locations.src).map(e => [e, path.basename(e.id, '.mp4')])
    .filter(([e, id]) => (want ? want.has(id) : target === 'all' || !(e.variants && e.variants.stacked))).map(([, id]) => id);
  const out = JSON.stringify(ids);
  console.log(out);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ids=${out}\ncount=${ids.length}\n`);
  return 0;
}
/** CI: tải gốc từ library/src (raw GitHub, kiểm sha) → clip_to_layer.py --stacked → cổng stacked (kỹ thuật + giải phẫu + phong cách) → <out>/<id>.{mp4,json}. */
async function cmdCiBuild(name, opts) {
  const m = loadManifest(), e = m.items.find(x => x.id === `clips/${name}.mp4`);
  if (!e || !e.locations.src) throw new Error('không có clip/bản gốc library/src cho ' + name);
  const outDir = path.resolve(opts.out || 'out/library'), src = path.join(LIB, e.file), dst = path.join(LIB, e.id);
  fs.mkdirSync(path.dirname(src), { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(src) || sha256(fs.readFileSync(src)) !== e.sha256) {
    const r = await fetch(`https://raw.githubusercontent.com/${MEDIA_REPO}/${MEDIA_BRANCH}/library/${e.locations.src.path}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok || sha256(buf) !== e.sha256) throw new Error(`tải gốc ${e.locations.src.path} lỗi (${r.status}) hoặc sai sha256`);
    fs.writeFileSync(src, buf);
  }
  const r = spawnSync(rembgPython(), [path.join(HERE, 'clip_to_layer.py'), src, '--stacked', dst], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, U2NET_HOME: process.env.U2NET_HOME || path.join(os.homedir(), '.u2net') }, maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('clip_to_layer lỗi: ' + (r.stderr || '').trim().split('\n').slice(-3).join(' | '));
  const res = runCheck(dst, { ...e, file: e.id }, m, { kind: 'stacked', sheet: path.join(outDir, name + '.jpg') });
  const result = stackedResult(e, dst, res);
  fs.copyFileSync(dst, path.join(outDir, name + '.mp4'));
  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(result, null, 1));
  log(`${result.status} ${e.id} → ${path.relative(ROOT, outDir)}/${name}.{mp4,json}`);
  return 0;
}
/** Nhận kết quả CI (thư mục artifact): chép bản stacked vào brand/library/clips, ghi manifest + manifest dựng, rồi sync nguồn chính (chỉ upload). */
async function cmdCiApply(dir, opts) {
  const m = loadManifest(), files = fs.readdirSync(dir, { recursive: true }).filter(f => /\.json$/.test(f));
  let n = 0;
  for (const f of files) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), e = m.items.find(x => x.id === r.id);
    if (!e || r.alpha !== 'stacked') continue;
    const mp4 = path.join(dir, f.replace(/\.json$/, '.mp4'));
    if (!fs.existsSync(mp4) || sha256(fs.readFileSync(mp4)) !== r.sha256) { log(`! ${r.id}: thiếu/sai file mp4 trong artifact`); continue; }
    fs.mkdirSync(path.dirname(path.join(LIB, e.id)), { recursive: true });
    fs.copyFileSync(mp4, path.join(LIB, e.id));
    try { registerStacked(e, r); n++; } catch (err) { log('! ' + err.message); }
  }
  saveManifest(m);
  const probs = writeRenderManifest(m);
  log(`ci-apply: ${n} bản stacked · manifest dựng ${probs.length ? probs.length + ' vấn đề' : 'OK'}`);
  for (const p of probs) log('  ✗ ' + p);
  return opts.noSync ? 0 : cmdSync({ primaryOnly: true });
}

/** Ghi brand/library/manifest.json (render.mjs đọc) từ library.json: chỉ clip approved có bản stacked đạt, phòng 9x16 có file + hồ sơ sàn, ảnh tĩnh có file.
 *  Giữ thuộc tính tay (outfit, tags, mouth, facing) của mục cũ cùng id. → danh sách vấn đề (file thiếu, stacked sai). */
export function writeRenderManifest(m, file = path.join(LIB, 'manifest.json'), exists = f => fs.existsSync(path.join(LIB, f))) {
  // GỘP vào danh mục có sẵn (render/test dùng làm danh mục thiết kế) – không xoá mục; mục chưa có file → ready:false
  let rm; try { rm = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { rm = { _note: '', rooms: [], clips: [], stills: [] }; }
  rm.rooms = rm.rooms || []; rm.clips = rm.clips || []; rm.stills = rm.stills || [];
  const probs = [], done = new Set();
  for (const e of m.items.filter(x => x.kind === 'clip' && x.status === 'approved')) {
    const st = e.variants && e.variants.stacked, id = path.basename(e.id, '.mp4');
    let c = rm.clips.find(x => x.id === id);
    if (!st || st.status === 'FAIL' || !exists(e.id)) {
      if (st && st.status === 'FAIL') probs.push(`clip ${e.id}: bản stacked FAIL (${(st.issues || []).filter(x => x.startsWith('FAIL')).join(' | ')})`);
      continue;
    }
    if (!c) rm.clips.push(c = { id, who: e.who, tags: e.tags, outfit: OUTFIT[e.who] || 'casual', mouth: (e.roles || []).includes('speaker'), facing: 'front' });
    Object.assign(c, { file: e.id, alpha: 'stacked', roles: e.roles, foot: st.foot, figH: st.figH, w: st.w, h: st.h, ready: true });
    done.add(id);
  }
  for (const c of rm.clips) if (!done.has(c.id)) {
    const lib = m.items.find(x => x.id === c.file);
    c.ready = false;
    probs.push(`clip ${c.file}: ${!lib ? 'chưa có trong kho' : lib.status !== 'approved' ? 'kho ghi ' + lib.status : 'chưa có bản stacked đạt cổng'} → render bỏ qua (ready:false)`);
  }
  const TAG = { apartment: 'home' };
  const seen = new Set();
  for (const e of m.items.filter(x => x.kind === 'room' && x.status !== 'reject')) {
    const p = parseName(e.file); if (!p || p.ratio !== '9x16') continue;
    if (!exists(e.file)) { probs.push(`phòng ${e.file}: thiếu file`); continue; }
    let prof; try { prof = JSON.parse(fs.readFileSync(path.join(LIB, 'rooms', p.room + '.json'), 'utf8')); } catch { probs.push(`phòng ${e.file}: thiếu hồ sơ sàn rooms/${p.room}.json`); continue; }
    const id = `${p.room}-${p.time}`, base = p.room.replace(/-\d+$/, '');
    let r = rm.rooms.find(x => x.id === id);
    if (!r) rm.rooms.push(r = { id });
    Object.assign(r, { file: e.file, tag: TAG[base] || base, time: p.time, floor: prof.floor, stand: prof.stand, scaleAt: prof.scaleAt, light: prof.light, vanish: prof.vanish, auto: !prof.manual, qa: e.qa, ready: true });
    seen.add(id);
  }
  for (const r of rm.rooms) if (!seen.has(r.id)) { r.ready = exists(r.file); if (!r.ready) probs.push(`phòng ${r.file}: thiếu file → render dùng nền màu (ready:false)`); }
  for (const x of rm.stills) { x.ready = exists(x.file); if (!x.ready) probs.push(`ảnh tĩnh ${x.file}: thiếu file (ready:false)`); }
  rm._note = String(rm._note || '').replace(/\s*\[library\.mjs\].*$/, '') + ' [library.mjs] Mục có file được cập nhật tự động từ content/video/library.json (clip: bản stacked clips/<id>.mp4 + foot/figH/w/h; gốc Kling ở clips/src/ – KHÔNG để clip gốc ở clips/; phòng: hồ sơ sàn tự động rooms/<room>.json, auto:true = chưa chỉnh tay). ready:false = chưa có file, render bỏ qua.';
  fs.writeFileSync(file, JSON.stringify(rm, null, 2) + '\n');
  return probs;
}

// ---------- tối ưu bản web ----------
function optimize(e) {
  const src = path.join(LIB, e.file), outRel = e.kind === 'clip' ? e.file : /\.png$/.test(e.file) ? webPath(e.file) : e.file;
  const out = path.join(LIB, '_web', outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const cacheTag = out + '.src';
  if (fs.existsSync(out) && fs.existsSync(cacheTag) && fs.readFileSync(cacheTag, 'utf8') === e.sha256) return { rel: outRel, file: out };
  if (/\.png$/.test(e.file)) {
    let q = 82;
    for (;;) {
      execFileSync('cwebp', ['-quiet', '-q', String(q), '-m', '6', '-alpha_q', '90', src, '-o', out]);
      if (fs.statSync(out).size <= WEBP_MAX || q <= 40) break;
      q -= 8;
    }
    if (fs.statSync(out).size > WEBP_MAX) execFileSync('cwebp', ['-quiet', '-q', '70', '-resize', '0', '1600', src, '-o', out]);
  } else if (/\.mp4$/.test(e.file)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '1', '-movflags', '+faststart', '-map_metadata', '-1', out]);
  } else fs.copyFileSync(src, out);
  fs.writeFileSync(cacheTag, e.sha256);
  return { rel: outRel, file: out };
}

// ---------- GitHub (lexkite-media) ----------
let ghTok = null;
function ghToken() {
  if (ghTok) return ghTok;
  ghTok = process.env.GH_MEDIA_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  secrets.push(ghTok);
  return ghTok;
}
async function gh(method, p, body) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.github.com/repos/' + MEDIA_REPO + p, { method, headers: { Authorization: 'Bearer ' + ghToken(), Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-library', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (r && r.ok) return r.json();
    if (r && ![502, 503, 504, 429, 403].includes(r.status)) throw new Error(`GitHub ${method} ${p} → ${r.status} ${scrub((await r.text()).slice(0, 200))}`);
    await new Promise(res => setTimeout(res, 2000 * (i + 1)));
  }
  throw new Error(`GitHub ${method} ${p}: thử lại 4 lần vẫn lỗi`);
}
export async function remoteTree(fetcher = gh) {
  const ref = await fetcher('GET', `/git/ref/heads/${MEDIA_BRANCH}`);
  const commit = await fetcher('GET', `/git/commits/${ref.object.sha}`);
  const tree = await fetcher('GET', `/git/trees/${commit.tree.sha}?recursive=1`);
  const map = new Map(); for (const t of tree.tree || []) if (t.type === 'blob') map.set(t.path, { sha: t.sha, size: t.size });
  return { head: ref.object.sha, tree: commit.tree.sha, files: map, truncated: !!tree.truncated };
}
/** Ước lượng dung lượng repo media sau khi đẩy thêm → cảnh báo 700 MB, chặn 950 MB (GitHub khuyến nghị ≤ 1 GB). */
export function repoBudget(currentBytes, addBytes) {
  const after = currentBytes + addBytes;
  return { after, warn: after >= REPO_WARN, block: after >= REPO_MAX };
}

// ---------- GrabCast (sao lưu bản gốc) ----------
function gcKey() {
  const k = process.env.GRABCAST_API_KEY || (() => { try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/grabcast-key'), 'utf8').trim(); } catch { return ''; } })();
  if (k) secrets.push(k);
  return k;
}
async function gc(method, p, body, fetcher = fetch) {
  const r = await fetcher(`${GC_BASE}/api/social/${p}`, { method, headers: { 'X-API-Key': gcKey(), 'X-Workspace': GC_WS, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  if (!r.ok) { const e = new Error(scrub(`GrabCast ${method} ${p} → ${r.status} ${JSON.stringify(j).slice(0, 300)}`)); e.code = (j && (j.error && j.error.code || j.error)) || r.status; e.status = r.status; throw e; }
  return j;
}
async function gcUpload(e) {
  const file = path.join(LIB, e.file), buf = fs.readFileSync(file);
  const begin = await gc('POST', 'storage/objects', { name: e.file.replace(/\//g, '__').slice(0, 200), mime: mime(e.file), size: buf.length, type: e.kind === 'clip' ? 'video' : 'image', storage_class: 'bulk', pool: 'bulk', sha256: e.sha256, client_key: ('lexkite-library:' + e.sha256).slice(0, 100), meta: { library_id: e.id, status: e.status, w: e.w, h: e.h, duration_ms: e.duration ? Math.round(e.duration * 1000) : undefined } });
  const o = begin.object || begin, oid = o.id || o.object_id;
  if (!oid) throw new Error('GrabCast không trả object id');
  if (begin.done) return oid; // đã có (trùng sha)
  const up = begin.upload || {}, url = up.url || begin.upload_url;
  if (!/^https:\/\//.test(String(url || ''))) throw new Error('GrabCast không trả link tải lên');
  try {
    let res;
    if (up.kind === 'r2' || !up.chunk || buf.length <= 64 << 20) {
      res = await fetch(url, { method: up.method || 'PUT', headers: up.headers || { 'Content-Type': mime(e.file) }, body: buf });
      if (!res.ok && res.status !== 308) throw new Error('PUT ' + res.status);
    } else {
      let off = 0;
      while (off < buf.length) {
        const end = Math.min(buf.length, off + up.chunk);
        res = await fetch(url, { method: 'PUT', headers: { 'Content-Range': `bytes ${off}-${end - 1}/${buf.length}` }, body: buf.subarray(off, end) });
        if (res.status === 200 || res.status === 201) break;
        if (res.status !== 308) throw new Error('PUT khúc ' + res.status);
        const rg = res.headers.get('Range'); off = rg && /bytes=0-(\d+)/.test(rg) ? +RegExp.$1 + 1 : end;
      }
    }
    let remote = null; try { remote = (await res.json()).id || null; } catch { /* R2 không có body */ }
    await gc('POST', `storage/objects/${encodeURIComponent(oid)}/complete`, { lease: begin.lease, store_id: begin.store_id, remote_id: remote, size: buf.length });
    return oid;
  } catch (err) { await gc('POST', `storage/objects/${encodeURIComponent(oid)}/abort`, { lease: begin.lease }).catch(() => {}); throw err; }
}

// ---------- sync ----------
async function cmdSync(opts) {
  const m = loadManifest();
  let code = 0;
  if (!opts.backupOnly) {
    const remote = await remoteTree();
    const repo = await gh('GET', '');
    const approved = m.items.filter(e => e.status === 'approved');
    const blobs = [], waitStacked = [];
    let add = 0, skip = 0;
    const push = (p, buf) => { const r = remote.files.get(p); if (r && r.sha === gitBlobSha(buf)) { skip++; return; } blobs.push({ path: p, buf }); add += buf.length; };
    for (const e of approved) {
      if (e.kind === 'clip') {
        // bản gốc nguyên vẹn → library/src/ (CI library-build tải về dựng stacked; restore lấy lại y hệt)
        const src = path.join(LIB, e.file);
        if (fs.existsSync(src)) { const b = fs.readFileSync(src); e.locations.src = { path: 'src/' + e.file, url: CDN + 'src/' + e.file, gitSha: gitBlobSha(b), sha256: e.sha256, bytes: b.length }; push('library/src/' + e.file, b); }
        // nguồn chính của clip = bản stacked (render.mjs đọc), chỉ khi đã qua cổng
        const st = e.variants && e.variants.stacked;
        if (!st || st.status === 'FAIL') { waitStacked.push(e.id); e.locations.primary = null; continue; }
        const f = path.join(LIB, st.file);
        if (fs.existsSync(f)) {
          const sb = fs.readFileSync(f);
          if (st.sha256 && sha256(sb) !== st.sha256) { log(`! ${e.id}: file stacked trên máy khác bản đã kiểm – chạy lại stack/CI`); continue; }
          e.locations.primary = { path: st.file, url: CDN + st.file, sha256: sha256(sb), gitSha: gitBlobSha(sb), bytes: sb.length, srcSha: e.sha256, variant: 'stacked', at: today() };
          Object.assign(st, { path: st.file, url: CDN + st.file, gitSha: e.locations.primary.gitSha });
          push('library/' + st.file, sb);
        } else if (!e.locations.primary) waitStacked.push(e.id);
        continue;
      }
      if (!fs.existsSync(path.join(LIB, e.file))) { log(`! thiếu file gốc ${e.file} – chạy restore`); continue; }
      const p = e.locations.primary, rp = p && remote.files.get('library/' + p.path);
      if (p && p.srcSha === e.sha256 && rp && rp.sha === p.gitSha) { skip++; continue; }
      const o = optimize(e), buf = fs.readFileSync(o.file);
      e.locations.primary = { path: o.rel, url: CDN + o.rel, sha256: sha256(buf), gitSha: gitBlobSha(buf), bytes: buf.length, srcSha: e.sha256, at: today() };
      push('library/' + o.rel, buf);
    }
    if (waitStacked.length) log(`… ${waitStacked.length} clip approved chờ bản stacked (workflow library-build): ${waitStacked.join(', ')}`);
    // chỉ mục công khai + manifest dựng (render/CI đọc qua CDN)
    const index = Buffer.from(JSON.stringify({ updated: today(), cdn: CDN, items: m.items.filter(e => e.status === 'approved' && e.locations.primary).map(e => {
      const st = e.kind === 'clip' && e.variants && e.variants.stacked;
      return { id: e.id, kind: e.kind, who: e.who, tags: e.tags, roles: e.roles, url: e.locations.primary.url, w: st ? st.w : e.w, h: st ? st.h : e.h, duration: e.duration, qa: e.qa, ...(st ? { alpha: 'stacked', foot: st.foot, figH: st.figH, src: e.locations.src && e.locations.src.url } : {}) };
    }) }, null, 1));
    push('library/index.json', index);
    const rmf = path.join(LIB, 'manifest.json');
    if (fs.existsSync(rmf)) push('library/manifest.json', fs.readFileSync(rmf));
    // dọn file library/ trên repo không còn trong manifest (vd. bản gốc cũ nằm nhầm chỗ bản stacked)
    const want = new Set(['library/index.json', 'library/manifest.json', ...blobs.map(x => x.path)]);
    for (const e of m.items) { if (e.status === 'approved' && e.locations.primary) want.add('library/' + e.locations.primary.path); if (e.locations.src) want.add('library/' + e.locations.src.path); }
    const prune = [...remote.files.keys()].filter(k => k.startsWith('library/') && !want.has(k));
    if (prune.length) log(`Dọn ${prune.length} file thừa trên repo: ${prune.slice(0, 6).join(', ')}${prune.length > 6 ? '…' : ''}`);
    const curBytes = (repo.size || 0) * 1024, b = repoBudget(curBytes, blobs.reduce((s, x) => s + x.buf.length, 0));
    log(`Nguồn chính: ${blobs.length} file mới/đổi (${MB(add)}), ${skip} đã có · repo ${MB(curBytes)} → ~${MB(b.after)}`);
    if (b.warn) log(`⚠ repo lexkite-media ~${MB(b.after)} ≥ 700 MB – chuẩn bị chuyển ORIGIN của workers/media sang R2`);
    if (b.block) throw new Error('repo lexkite-media sẽ vượt 950 MB – dừng (chuyển sang R2 trước)');
    if ((blobs.length || prune.length) && !opts.dryRun) {
      const tree = prune.map(p => ({ path: p, mode: '100644', type: 'blob', sha: null }));
      for (const x of blobs) {
        const bl = await gh('POST', '/git/blobs', { content: x.buf.toString('base64'), encoding: 'base64' });
        tree.push({ path: x.path, mode: '100644', type: 'blob', sha: bl.sha });
      }
      const t = await gh('POST', '/git/trees', { base_tree: remote.tree, tree });
      const c = await gh('POST', '/git/commits', { message: `library: ${blobs.length} file, dọn ${prune.length} (sync ${today()})`, tree: t.sha, parents: [remote.head] });
      await gh('PATCH', `/git/refs/heads/${MEDIA_BRANCH}`, { sha: c.sha });
      log(`✓ đẩy commit ${c.sha.slice(0, 7)} lên ${MEDIA_REPO}`);
    }
    saveManifest(m);
  }
  if (!opts.primaryOnly) {
    let up = 0, have = 0, pending = 0, ownerStep = false;
    for (const e of m.items) {
      const bk = e.locations.backup || {};
      if (bk.status === 'ok' && bk.sha256 === e.sha256) { have++; continue; }
      if (!fs.existsSync(path.join(LIB, e.file))) continue;
      if (ownerStep || opts.dryRun) { e.locations.backup = { status: 'pending', reason: ownerStep ? 'pool_full' : 'dry-run' }; pending++; continue; }
      try {
        const oid = await gcUpload(e);
        e.locations.backup = { status: 'ok', objectId: String(oid), sha256: e.sha256, storage_class: 'bulk', at: today() }; up++;
      } catch (err) {
        const full = /pool_full|no_store|no storage|Connect another Google Drive/i.test(String(err.code) + err.message);
        e.locations.backup = { status: 'pending', reason: full ? 'pool_full' : scrub(err.message).slice(0, 160) }; pending++;
        if (full) ownerStep = true; else log(`! ${e.id}: ${scrub(err.message)}`);
      }
      saveManifest(m);
    }
    log(`Nguồn phụ GrabCast: tải ${up} · đã có ${have} · chờ ${pending}`);
    if (ownerStep) { log('⚠ Kho GrabCast workspace 4 hết chỗ (chưa nối Google Drive) → backup = pending.'); log('  ' + OWNER_STEP_GC); code = 2; }
    saveManifest(m);
  }
  return code;
}

// ---------- verify ----------
/** Kiểm 1 mục ở 2 nơi. deps: {head(url) → {status, length}, tree: Map path→{sha}, gcGet(id) → object|null}. → danh sách thiếu sót. Exported để test với fetch giả. */
export async function verifyEntry(e, deps) {
  const gaps = [];
  if (e.status === 'approved') {
    const p = e.locations && e.locations.primary;
    if (!p) gaps.push(e.kind === 'clip' ? 'primary: chưa có bản stacked (workflow library-build)' : 'primary: chưa đồng bộ');
    else {
      if (p.srcSha !== e.sha256) gaps.push('primary: bản web cũ (gốc đã đổi) – chạy sync');
      const t = deps.tree.get('library/' + p.path);
      if (!t) gaps.push('primary: không có trong repo lexkite-media');
      else if (t.sha !== p.gitSha) gaps.push('primary: sha trong repo khác manifest');
      const h = await deps.head(p.url);
      if (!h || h.status !== 200) gaps.push(`primary: CDN trả ${h ? h.status : 'lỗi mạng'}`);
      else if (h.length != null && +h.length !== p.bytes) gaps.push(`primary: CDN dung lượng ${h.length} ≠ ${p.bytes}`);
      if (deps.deep && h && h.status === 200) { const s = await deps.sha(p.url); if (s !== p.sha256) gaps.push('primary: sha256 nội dung CDN khác'); }
    }
    if (e.kind === 'clip') { // bản gốc nguyên vẹn ở library/src/ (CI dựng stacked + restore)
      const sr = e.locations && e.locations.src, t = sr && deps.tree.get('library/' + sr.path);
      if (!sr) gaps.push('src: bản gốc chưa lên library/src');
      else if (!t || t.sha !== sr.gitSha) gaps.push('src: repo thiếu/khác sha');
    }
  }
  const b = (e.locations && e.locations.backup) || {};
  if (b.status !== 'ok') gaps.push(`backup: ${b.status || 'chưa có'}${b.reason ? ' (' + b.reason + ')' : ''}`);
  else {
    const o = await deps.gcGet(b.objectId);
    if (!o) gaps.push('backup: không thấy object ' + b.objectId + ' trên GrabCast');
    else {
      const osha = o.sha256 || (o.meta && o.meta.sha256);
      if (osha && osha !== e.sha256) gaps.push('backup: sha256 khác');
      if (o.size != null && +o.size !== e.bytes) gaps.push(`backup: dung lượng ${o.size} ≠ ${e.bytes}`);
      if (/deleted|trash|failed/i.test(String(o.status || ''))) gaps.push('backup: object ở trạng thái ' + o.status);
    }
  }
  return gaps;
}
async function cmdVerify(opts) {
  const m = loadManifest(), remote = await remoteTree();
  const deps = {
    tree: remote.files, deep: !!opts.deep,
    head: async url => { const r = await fetch(url, { method: 'HEAD' }).catch(() => null); return r && { status: r.status, length: r.headers.get('content-length') }; },
    sha: async url => sha256(Buffer.from(await (await fetch(url)).arrayBuffer())),
    gcGet: async id => { try { const j = await gc('GET', `storage/objects/${encodeURIComponent(id)}`); return j.object || j; } catch (e) { if (e.status === 404) return null; const l = await gc('GET', 'storage/objects').catch(() => ({ items: [] })); return (l.items || []).find(x => String(x.id) === String(id)) || null; } },
  };
  let gaps = 0; const counts = { ok: 0, gap: 0 }, pend = [];
  for (const e of m.items) {
    const g = await verifyEntry(e, deps);
    const real = g.filter(x => !/^backup: pending/.test(x));
    if (g.some(x => /^backup: pending/.test(x))) pend.push(e.id);
    if (real.length) { gaps += real.length; counts.gap++; log(`✗ ${e.id}: ${real.join(' · ')}`); } else counts.ok++;
  }
  log(`\nverify: ${counts.ok} mục đủ · ${counts.gap} mục thiếu (${gaps} lỗi) · backup chờ: ${pend.length}`);
  if (pend.length) log('  ' + OWNER_STEP_GC);
  return gaps ? 1 : 0;
}

// ---------- restore ----------
async function cmdRestore(target) {
  const m = loadManifest(), items = target === 'all' ? m.items : m.items.filter(x => x.id === target || x.file === target);
  if (!items.length) throw new Error('không thấy mục ' + target);
  let n = 0;
  for (const e of items) {
    const dest = path.join(LIB, e.file);
    if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === e.sha256) continue;
    const b = e.locations.backup || {}, p = e.locations.primary;
    let done = false;
    if (p && p.sha256 === e.sha256) { // bản chính giống hệt bản gốc (không tối ưu) → khôi phục đầy đủ
      const buf = Buffer.from(await (await fetch(p.url)).arrayBuffer());
      if (sha256(buf) === e.sha256) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); done = true; log(`✓ ${e.id} ← nguồn chính`); }
    }
    const sr = e.locations.src;
    if (!done && sr) { // clip: bản gốc nguyên vẹn ở library/src/
      const r = await fetch(sr.url).catch(() => null), buf = r && r.ok ? Buffer.from(await r.arrayBuffer()) : null;
      if (buf && sha256(buf) === e.sha256) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); done = true; log(`✓ ${e.id} ← nguồn chính library/src (bản gốc)`); }
    }
    if (!done && b.status === 'ok') { // bản gốc từ GrabCast
      try {
        const j = await gc('GET', `storage/objects/${encodeURIComponent(b.objectId)}`), o = j.object || j;
        const url = o.download_url || o.url || o.preview_url || (await gc('POST', `storage/objects/${encodeURIComponent(b.objectId)}/download`, {}).catch(() => ({}))).url;
        if (url) { const buf = Buffer.from(await (await fetch(url)).arrayBuffer()); if (sha256(buf) === e.sha256) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); done = true; log(`✓ ${e.id} ← GrabCast (bản gốc)`); } }
      } catch (err) { log(`! ${e.id}: GrabCast ${scrub(err.message)}`); }
    }
    if (!done && p) { // chỉ còn bản web → lưu cạnh, không giả làm bản gốc
      const r = await fetch(p.url);
      if (r.ok) { const buf = Buffer.from(await r.arrayBuffer()), wd = path.join(LIB, '_web', p.path); fs.mkdirSync(path.dirname(wd), { recursive: true }); fs.writeFileSync(wd, buf); log(`~ ${e.id} ← nguồn chính (bản web ${p.path}; bản gốc chưa có trên backup)`); done = true; }
    }
    if (done) n++; else log(`✗ ${e.id}: không khôi phục được từ nguồn nào`);
  }
  log(`restore: ${n}/${items.length}`);
  return 0;
}

// ---------- report ----------
export const NEED = {
  cast: ['mia', 'leo', 'ama', 'diane', 'carlos'],
  actions: ['idle', 'talk', 'ask', 'think', 'shock', 'wave', 'nod', 'laugh', 'shrug'],
  stills: ['dna', 'neutral'],
  rooms: ['office', 'cafe', 'school', 'library', 'exam', 'home', 'airport'],
  times: ['day', 'night'], ratios: ['9x16', '16x9'],
};
/** Phủ & thiếu: chỉ tính mục approved. Exported để test. */
export function coverage(m) {
  const ap = m.items.filter(e => e.status === 'approved');
  const clips = ap.filter(e => e.kind === 'clip'), chars = ap.filter(e => e.kind === 'char'), rooms = ap.filter(e => e.kind === 'room');
  const out = { byChar: {}, missing: { clips: [], stills: [], rooms: [], listener: [] }, counts: { approved: ap.length, reserve: m.items.filter(e => e.status === 'reserve').length, reject: m.items.filter(e => e.status === 'reject').length } };
  for (const who of NEED.cast) {
    const cs = clips.filter(c => c.who === who), acts = new Set(cs.flatMap(c => c.tags || []));
    out.byChar[who] = { clips: cs.length, actions: [...acts].sort(), stills: chars.filter(c => c.who === who).map(c => path.basename(c.file, '.png')) };
    for (const a of NEED.actions) if (!acts.has(a)) out.missing.clips.push(`${who}_${a}`);
    for (const s of NEED.stills) if (!out.byChar[who].stills.includes(s)) out.missing.stills.push(`chars/${who}/${s}.png`);
    if (!cs.some(c => (c.roles || []).includes('listener'))) out.missing.listener.push(who);
  }
  const have = new Set(rooms.map(r => { const p = parseName(r.file); return `${p.room.replace(/-\d+$/, '')}-${p.time}-${p.ratio}`; }));
  out.rooms = [...have].sort();
  for (const r of NEED.rooms) for (const t of NEED.times) for (const q of NEED.ratios) if (!have.has(`${r}-${t}-${q}`)) out.missing.rooms.push(`${r}-${t}-${q}`);
  return out;
}
function cmdReport() {
  const m = loadManifest(), c = coverage(m);
  log(`Kho: approved ${c.counts.approved} · reserve ${c.counts.reserve} · reject ${c.counts.reject} (tổng ${m.items.length})`);
  log('\nNhân vật   clip  hành động                                   ảnh tĩnh');
  for (const [who, v] of Object.entries(c.byChar)) log(`${who.padEnd(10)} ${String(v.clips).padStart(4)}  ${v.actions.join(',').padEnd(43)} ${v.stills.join(',') || '–'}`);
  log(`\nPhòng có (approved): ${c.rooms.join(', ') || '– (chưa có phòng approved)'}`);
  log(`\nThiếu clip (${c.missing.clips.length}): ${c.missing.clips.join(' ')}`);
  log(`Thiếu ảnh tĩnh (${c.missing.stills.length}): ${c.missing.stills.join(' ')}`);
  log(`Thiếu clip vai nghe: ${c.missing.listener.join(', ') || '–'}`);
  log(`Thiếu phòng (${c.missing.rooms.length}/${NEED.rooms.length * 4}): ${c.missing.rooms.join(' ')}`);
  const bk = m.items.reduce((a, e) => ((a[(e.locations.backup || {}).status || 'none'] = (a[(e.locations.backup || {}).status || 'none'] || 0) + 1), a), {});
  log(`\nSao lưu: chính ${m.items.filter(e => e.locations.primary).length}/${c.counts.approved} approved · GrabCast ${JSON.stringify(bk)}`);
  const chk = m.items.reduce((a, e) => ((a[(e.check || {}).status || '–'] = (a[(e.check || {}).status || '–'] || 0) + 1), a), {});
  log(`Check: ${JSON.stringify(chk)}`);
  return 0;
}

// ---------- CLI ----------
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (['reserve', 'reject', 'trimmed', 'replace', 'ref', 'force', 'noSync', 'dryRun', 'primaryOnly', 'backupOnly', 'deep', 'noVision'].includes(k)) o[k] = true;
    else o[k] = argv[++i];
  }
  if (o.qa != null) o.qa = +o.qa;
  if (o.role) o.roles = o.role.split(',');
  if (o.tags) o.tags = o.tags.split(',');
  if (o.noVision) o.vision = false;
  return o;
}
async function main() {
  // fetch của Node chỉ đi qua proxy khi bật NODE_USE_ENV_PROXY (sandbox/CI có HTTPS_PROXY)
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 1);
  }
  const [cmd, ...rest] = process.argv.slice(2), o = parseArgs(rest);
  fs.mkdirSync(LIB, { recursive: true });
  try {
    const code = cmd === 'ingest' ? await cmdIngest(o._, o)
      : cmd === 'check' ? await cmdCheck(o._[0] || 'all', o)
      : cmd === 'sync' ? await cmdSync(o)
      : cmd === 'verify' ? await cmdVerify(o)
      : cmd === 'restore' ? await cmdRestore(o._[0] || 'all')
      : cmd === 'report' ? cmdReport()
      : cmd === 'stack' ? await cmdStack(o._[0] || 'all', o)
      : cmd === 'ci-plan' ? cmdCiPlan(o._[0] || 'missing', o)
      : cmd === 'ci-build' ? await cmdCiBuild(o._[0], o)
      : cmd === 'ci-apply' ? await cmdCiApply(o._[0] || 'out/library', o)
      : cmd === 'render-manifest' ? (p => { p.forEach(x => log('✗ ' + x)); log(`manifest dựng: ${p.length ? p.length + ' vấn đề' : 'OK'}`); return p.length ? 1 : 0; })(writeRenderManifest(loadManifest()))
      : (console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15).join('\n')), 0);
    process.exit(code);
  } catch (e) { console.error('✗ library: ' + scrub(e.message)); process.exit(1); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
