#!/usr/bin/env node
// Kho tài nguyên dựng video (docs/ASSET-LIBRARY.md § "Lưu trữ & sao lưu"): tên chuẩn + manifest content/video/library.json + 2 nguồn sao lưu.
//   node scripts/video/library.mjs ingest <path…> --as <rel> [--qa N] [--reserve|--reject] [--waiver "lý do"] [--role listener] [--trimmed] [--replace]
//   node scripts/video/library.mjs ingest --plan scripts/video/library-seed.json [--on-fail reject]
//   node scripts/video/library.mjs check <file|id|all> [--no-vision]      cổng kỹ thuật + anatomy & style + AI thị giác (FAIL = không nhập)
//   node scripts/video/library.mjs sync [--dry-run] [--primary-only|--backup-only]
//   node scripts/video/library.mjs verify [--deep]
//   node scripts/video/library.mjs restore <id|all>
//   node scripts/video/library.mjs report
//   node scripts/video/library.mjs fetch-render     tải từ media.lexkite.com mọi phòng/clip/ảnh mà brand/library/manifest.json đang dùng (CI dựng video có kho thật)
//   node scripts/video/library.mjs approve <id> --waiver "lý do soi tay"   duyệt tay clip bị cổng tự động báo nhầm (giữ nguyên lỗi để tra soát, ghi manualReview)
//   node scripts/video/library.mjs stack [id|all] [--force]    bản stacked cho render (clip_to_layer.py) + ghi brand/library/manifest.json
//   node scripts/video/library.mjs render-manifest              chỉ ghi lại + kiểm brand/library/manifest.json
//   node scripts/video/library.mjs drive-backup [dir] [--repair] sao lưu bản gốc (2 bản/2 Drive) + bản stacked (1 bản) lên Kho Drive riêng (LEXKITE_DRIVE_CLI_KEY)
//   node scripts/video/library.mjs drive-refs | drive-health [--dry-run] | where <id|sha|tên>   tham chiếu dọn dẹp · kiểm sức khoẻ + sửa bản sao · tra vị trí
//   node scripts/video/library.mjs verify [--deep] [--repair]  (--repair: chép bù bản sao Kho Drive còn thiếu)
//   node scripts/video/library.mjs vision-cal [--runs N] [--model @cf/...]   hiệu chỉnh AI thị giác trên bộ mẫu scripts/video/vision-calibration.json
//   CI (.github/workflows/library-build.yml): ci-plan [missing|all|id,…] · ci-build <id> --out dir · ci-apply <dir> [--no-sync]
// Nguồn chính: repo lexkite-media/library/ (bản web: WebP ≤ 400 KB, MP4 H.264 CRF 20) → https://media.lexkite.com/library/…
// Nguồn phụ: Kho Drive riêng (Quản trị → Kho Drive, khi đã nối) – không có thì kho GrabCast (storage_class "bulk"); bản gốc đủ phân giải, cả reserve/reject. Khoá/token KHÔNG BAO GIỜ được in hay ghi ra file.
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
  char: /^chars\/([a-z]+)\/(dna|neutral|green(?:-casual|-travel)?|expr-[a-z0-9]+(?:-[a-z0-9]+)*|gesture-[a-z0-9]+(?:-[a-z0-9]+)*)\.png$/,
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
export function runCheck(file, entry, m, { sheet, kind, aiSheet, headSheet, aiRef } = {}) {
  const args = [path.join(HERE, 'asset_check.py'), file, '--kind', kind || kindArg(entry.kind, file)];
  const r = ratioArg(ratioOf(entry.file)) || (entry.kind === 'char' && /\/green(-[a-z]+)?\.png$/.test(entry.file) ? '3:4|9:16' : undefined); if (r) args.push('--ratio', r); // khung đầu phông xanh: 3:4 hoặc 9:16
  if (entry.trimmed) args.push('--trimmed');
  if ((kind || kindArg(entry.kind, file)) === 'stacked' && entry.w && entry.h) args.push('--src-size', `${entry.w},${entry.h}`); // cổng smooth quy về khung gốc (asset_check.py)
  if (entry.who && (entry.kind === 'char' || entry.kind === 'clip')) {
    args.push('--who', entry.who);
    const ok = refKey(entry.who, entry.file), newOutfitBase = ok !== entry.who && !(m.refs || {})[ok] && entry.kind === 'char'; // ảnh gốc của trang phục mới: chưa có tham chiếu → không so bảng màu với trang phục cũ
    const ref = !newOutfitBase && m.refs && (m.refs[ok] || m.refs[entry.who]); if (ref) args.push('--ref', JSON.stringify(ref));
    if (m.castStroke) args.push('--cast-stroke', m.castStroke.join(','));
  }
  if (sheet) args.push('--sheet', sheet);
  if (aiSheet) { args.push('--ai-sheet', aiSheet); if (headSheet) args.push('--head-sheet', headSheet); if (aiRef) args.push('--ai-ref', aiRef); } // bảng ≤ 768 px cho AI thị giác
  const p = spawnSync(python(), args, { encoding: 'utf8', env: { ...process.env, MPLCONFIGDIR: path.join(os.tmpdir(), 'lexkite-mpl'), GLOG_minloglevel: '3', TF_CPP_MIN_LOG_LEVEL: '3' }, maxBuffer: 64 << 20 });
  const line = (p.stdout || '').trim().split('\n').filter(l => l.startsWith('{')).pop();
  if (!line) return { status: 'FAIL', checks: [{ name: 'checker', status: 'FAIL', reason: 'asset_check.py lỗi: ' + (p.stderr || '').trim().split('\n').pop() }], metrics: {}, suggest: {} };
  return JSON.parse(line);
}

let geminiKeys = null;
/** Khoá Gemini xoay vòng của dự án: env GEMINI_KEYS (phẩy) hoặc D1 config 'gemini_keys' qua wrangler + ~/.config/lexkite/cf-token. Chỉ giữ trong bộ nhớ. */
export function loadGeminiKeys() {
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
// ---------- AI thị giác: chuỗi nhà cung cấp miễn phí trước (docs/ASSET-LIBRARY.md §7.1) ----------
// HAI GIÁM KHẢO, cả hai PASS mới PASS; một bên FAIL → FAIL; thiếu một bên → "cần duyệt tay":
//   chính  = Workers AI @cf/meta/llama-4-scout-17b-16e-instruct → dự phòng GrabCast vision (chỉ khi có env GRABCAST_AI_VISION_URL) → Gemini
//   kiểm chéo = Workers AI @cf/meta/llama-3.2-11b-vision-instruct (cần chấp nhận giấy phép Meta 1 lần – lỗi 5016) → @cf/google/gemma-3-12b-it (nếu tài khoản được dùng) → Gemini
// (giám khảo kiểm chéo không dùng lại nhà cung cấp của giám khảo chính). Token Cloudflare: ~/.config/lexkite/cf-token hoặc CLOUDFLARE_API_TOKEN (CI).
// Gửi 1 ảnh ≤ 768 px (ô 1 = DNA viền xanh lá + 5 khung), JSON chặt, kiểm schema; không parse được = "cần duyệt tay" (không bao giờ tự PASS). Cache theo sha256 ảnh.
export const VISION_PROMPT_VER = 'v6';
export const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || 'e34e14b7ab35eaf2b3d9d84fcce011f7';
export const CF_VISION = { llama32: '@cf/meta/llama-3.2-11b-vision-instruct', scout: '@cf/meta/llama-4-scout-17b-16e-instruct', gemma: '@cf/google/gemma-3-12b-it' };
/** Nhận diện từng nhân vật (từ ảnh DNA + content/video/assets.json). attrs = câu hỏi MÔ TẢ (chọn 1 đáp án) cho TỪNG ô cận đầu; AI chỉ quan sát,
 *  code tự so với want. min = số khung sai tối thiểu để FAIL (1 cho biến dạng tóc; 2 cho thứ có thể bị tay che như kính).
 *  Hiệu chỉnh 17/10 (Workers AI llama-4-scout): câu hỏi có/không kiểu "có buộc đuôi không?" bị trả "không" sai; câu mô tả có lựa chọn bắt đúng. */
export const IDENTITY = {
  mia: { look: 'Asian-American woman, short glossy black bob haircut with bangs, small yellow hair clip, orange sweater over a white collared shirt, teal trousers, white sneakers', attrs: [
    { k: 'hair_length', q: 'how long is her hair?', opts: ['chin-length bob', 'long or tied up'], want: 'chin-length bob', min: 1, label: 'tóc dài/buộc (Mia tóc bob)' },
    { k: 'eyes', q: 'what is on her eyes?', opts: ['no glasses', 'glasses'], want: 'no glasses', min: 2, label: 'mọc thêm kính' }] },
  leo: { look: 'American man, short messy light-brown hair, short beard, round black glasses, teal cardigan over a yellow t-shirt, beige chinos, orange sneakers', glasses: true, attrs: [
    { k: 'hair_back', q: 'is there a long section of hair hanging down behind his ear toward his neck (like a ponytail or mullet)?', opts: ['short', 'long hanging'], want: 'short', min: 1, label: 'tóc biến thành buộc đuôi/dài' },
    { k: 'eyes', q: 'what is on his eyes?', opts: ['round black glasses', 'other glasses', 'no glasses'], want: 'round black glasses', min: 2, label: 'mất/đổi kính' },
    { k: 'beard', q: 'facial hair?', opts: ['beard', 'no beard'], want: 'beard', min: 2, label: 'mất râu' }] },
  ama: { look: 'African-American young woman, short natural curly hair with a yellow headband, coral hoodie, teal denim overall skirt, black leggings, white sneakers', attrs: [
    { k: 'headband', q: 'what is in her hair?', opts: ['yellow headband', 'no headband'], want: 'yellow headband', min: 2, label: 'mất băng đô vàng' },
    { k: 'eyes', q: 'what is on her eyes?', opts: ['no glasses', 'glasses'], want: 'no glasses', min: 2, label: 'mọc thêm kính' }] },
  diane: { look: 'Black woman in her fifties, short curly black hair with a grey streak, red-framed glasses, yellow blazer over a cream top, dark trousers, brown loafers', glasses: true, attrs: [
    { k: 'eyes', q: 'what is on her eyes? (if a hand covers part of the face, judge the visible part)', opts: ['red glasses', 'other glasses', 'no glasses'], want: 'red glasses', min: 2, label: 'mất/đổi kính đỏ' },
    { k: 'streak', q: 'hair colour?', opts: ['black with a grey streak', 'only black'], want: 'black with a grey streak', min: 2, label: 'mất lọn tóc bạc' }] },
  carlos: { look: 'Latino man, short curly black hair, black mustache, olive-green henley, navy apron, light-blue jeans, white sneakers', attrs: [
    { k: 'mustache', q: 'facial hair above the mouth?', opts: ['mustache', 'none'], want: 'mustache', min: 2, label: 'mất ria' },
    { k: 'eyes', q: 'what is on his eyes?', opts: ['no glasses', 'glasses'], want: 'no glasses', min: 2, label: 'mọc thêm kính' }] },
};
export const VISION_PROMPT = who => { const id = IDENTITY[who] || { look: 'see the reference' }; return `You are a careful QA reviewer for a flat 2D cartoon character library.
The image is a grid with 2 rows. Column 1 (framed in GREEN) is the reference of the character "${who}" (${id.look}). Columns 2+ are frames of ONE animated clip of the same character, in time order.
Top row = full body of each frame. Bottom row = close-up of the head of the frame directly above it.
Judge the non-green columns. Only report what you actually see; ignore pose, expression, mild blur and lighting.
Reply with ONE JSON object and nothing else:
{"hands_ok": boolean (every visible hand has at most 5 fingers, no fused/extra/missing hands),
 "limbs_ok": boolean (exactly 2 arms and 2 legs, no broken or impossible joints),
 "face_ok": boolean (2 eyes, 1 mouth, no melted or distorted face),
 "extra_people": boolean (more than one person in any column),
 "text_present": boolean (readable letters, logos or watermarks overlaid on the picture; a small ID badge or name tag worn on the clothes does NOT count),
 "style_consistent": boolean (same flat 2D cartoon style as column 1, not photographic),
 "issues": array of short strings naming the column and the problem (empty if none)}`; };
/** Prompt nhận diện (bảng cận đầu: ô 1 viền xanh lá = DNA, các ô sau = khung clip). AI chỉ trả quan sát từng ô; code tự so (parseIdentity). */
export const IDENTITY_PROMPT = who => { const id = IDENTITY[who] || { look: '', attrs: [] }; return `These are head close-ups of a cartoon character "${who}" (${id.look}).
Cell 1 (framed in GREEN) is the reference. Cells 2 to 6 are frames of one animated clip, left to right, top to bottom.
Describe each cell separately: answer about what is visible in THAT cell only, not what you expect.${id.attrs.map(x => `\n - "${x.k}": ${x.q} Choose one of: ${x.opts.map(o => '"' + o + '"').join(' | ')}`).join('')}
Reply with ONE JSON object and nothing else:
{"cells": [{"cell": 1${id.attrs.map(x => `, "${x.k}": "..."`).join('')}}, {"cell": 2, ...}, ... one object per cell]}`; };
/** → {drift[], cells} hoặc null nếu JSON sai schema. Exported để test. */
export function parseIdentity(raw, who) {
  let v = raw;
  if (typeof v === 'string') { const s = v.replace(/```(?:json)?/gi, ''), a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) return null; try { v = JSON.parse(s.slice(a, b + 1)); } catch { return null; } }
  const id = IDENTITY[who]; if (!id || !v || !Array.isArray(v.cells)) return null;
  const frames = v.cells.filter(c => c && +c.cell !== 1); if (!frames.length) return null;
  const drift = [];
  for (const a of id.attrs) {
    const vals = frames.map(c => String(c[a.k] == null ? '' : c[a.k]).toLowerCase().trim()); if (vals.some(x => !a.opts.includes(x))) return null;
    const wrong = vals.filter(x => x !== a.want).length;
    if (wrong >= Math.min(a.min, frames.length)) drift.push(`${a.label} (${wrong}/${frames.length} khung)`);
  }
  return { drift };
}
const BOOL_KEYS = ['hands_ok', 'limbs_ok', 'face_ok', 'extra_people', 'text_present', 'style_consistent'], OPT_KEYS = ['outfit_consistent', 'identity_consistent'];
/** Đọc trả lời AI (chuỗi hoặc object, có thể bọc ```json) → object đúng schema hoặc null. Exported để test. */
export function parseVision(raw) {
  let v = raw;
  if (typeof v === 'string') {
    const s = v.replace(/```(?:json)?/gi, ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { v = JSON.parse(s.slice(a, b + 1)); } catch { return null; }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  for (const k of BOOL_KEYS) if (typeof v[k] !== 'boolean') return null;
  for (const k of OPT_KEYS) if (k in v && v[k] != null && typeof v[k] !== 'boolean') return null;
  if (!Array.isArray(v.issues)) return null;
  const out = {}; for (const k of [...BOOL_KEYS, ...OPT_KEYS]) if (typeof v[k] === 'boolean') out[k] = v[k];
  out.issues = v.issues.map(x => String(x).slice(0, 160)).slice(0, 8);
  return out;
}
function cfToken() {
  const t = process.env.CLOUDFLARE_API_TOKEN || (() => { try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim(); } catch { return ''; } })();
  if (t) secrets.push(t);
  return t;
}
const visionErr = (provider, status, msg, code) => Object.assign(new Error(`${provider}: ${status} ${scrub(String(msg)).slice(0, 160)}`), { provider, status, code });
/** Nhà cung cấp Cloudflare Workers AI (REST). deps: {fetch, token}. Trả chuỗi/obj trả lời thô; lỗi → ném (code 5016 = chưa chấp nhận giấy phép). */
export const cfVisionProvider = model => ({
  name: 'cloudflare:' + model.split('/').pop(),
  async run({ prompt, b64 }, deps) {
    const token = deps.cfToken; if (!token) throw visionErr(this.name, 0, 'thiếu token (~/.config/lexkite/cf-token hoặc CLOUDFLARE_API_TOKEN)', 'no-key');
    const body = model === CF_VISION.llama32
      ? { prompt, image: b64, max_tokens: 700, temperature: 0 }
      : { messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } }] }], max_tokens: 700, temperature: 0, response_format: { type: 'json_object' } };
    const r = await deps.fetch(`https://api.cloudflare.com/client/v4/accounts/${deps.cfAccount || CF_ACCOUNT}/ai/run/${model}`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) { const e0 = (j.errors || [])[0] || {}; throw visionErr(this.name, r.status, e0.message || 'lỗi', e0.code); }
    const res = j.result || {};
    return res.response != null ? res.response : ((res.choices || [])[0]?.message?.content ?? null);
  },
});
/** GrabCast vision – chỉ bật khi có env GRABCAST_AI_VISION_URL (POST {prompt, image_b64, mime} với khoá GRABCAST_AI_KEY). */
export const grabcastVisionProvider = {
  name: 'grabcast',
  async run({ prompt, b64 }, deps) {
    if (!deps.gcVisionUrl || !deps.gcAiKey) throw visionErr('grabcast', 0, 'chưa có endpoint vision', 'not-configured');
    const r = await deps.fetch(deps.gcVisionUrl, { method: 'POST', headers: { 'X-API-Key': deps.gcAiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, image_b64: b64, mime: 'image/jpeg', json: true }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw visionErr('grabcast', r.status, j.error || j.detail || 'lỗi');
    return j.text ?? j.output ?? j.result ?? null;
  },
};
export const geminiVisionProvider = {
  name: 'gemini',
  async run({ prompt, b64 }, deps) {
    const keys = deps.geminiKeys ? deps.geminiKeys() : [];
    if (!keys.length) throw visionErr('gemini', 0, 'không có khoá', 'no-key');
    const v = await gemini([{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }], keys, deps.fetch);
    if (v == null) throw visionErr('gemini', 429, 'hết hạn mức mọi khoá', 'quota');
    return v;
  },
};
export const PRIMARY_CHAIN = [cfVisionProvider(CF_VISION.scout), grabcastVisionProvider, geminiVisionProvider];
export const CROSS_CHAIN = [cfVisionProvider(CF_VISION.llama32), cfVisionProvider(CF_VISION.gemma), geminiVisionProvider];
/** Chạy chuỗi dự phòng: nhà cung cấp lỗi / trả JSON sai schema → thử nhà kế tiếp. → {v, provider, tried[], license?}. v = null nếu tất cả hỏng. Exported để test. */
/** 1 giám khảo = 2 lượt cùng nhà cung cấp: bảng toàn thân (giải phẫu/trang phục) + bảng cận đầu (nhận diện, code tự so). → v gộp hoặc null. */
export async function judgeWith(p, input, deps) {
  const body = parseVision(await p.run(input.body, deps));
  if (!body) return null;
  if (!input.head || !(IDENTITY[input.who] || {}).attrs) return body;
  const id = parseIdentity(await p.run(input.head, deps), input.who);
  if (!id) return null;
  body.drift = id.drift;
  body.identity_consistent = !id.drift.length;
  if (IDENTITY[input.who].glasses) body.glasses_ok = !id.drift.some(d => /kính/.test(d));
  return body;
}
export async function runVisionChain(input, deps, chain = PRIMARY_CHAIN, skip = []) {
  const tried = []; let license = false;
  for (const p of chain) {
    if (skip.includes(p.name)) continue;
    try {
      const v = await judgeWith(p, input, deps);
      if (v) return { v, provider: p.name, tried, license };
      tried.push(p.name + ': JSON sai schema');
    } catch (e) {
      if (e.code === 5016 || /Model Agreement/i.test(e.message)) license = true;
      tried.push(e.code === 'not-configured' || e.code === 'no-key' ? `${p.name}: bỏ qua (${scrub(e.message).replace(/^[^:]+: \d+ /, '')})` : scrub(e.message).slice(0, 120));
    }
  }
  return { v: null, provider: null, tried, license };
}
const VCACHE = path.join(LIB, '_cache/vision.json');
const loadVCache = () => { try { return JSON.parse(fs.readFileSync(VCACHE, 'utf8')); } catch { return {}; } };
export async function gemini(parts, keys, fetcher = fetch) {
  for (let n = 0; n < keys.length; n++) {
    const k = keys[(Math.floor(Math.random() * keys.length) + n) % keys.length];
    const r = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (r.ok) { const j = await r.json(); return ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('') || null; }
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
/** Đánh giá kết quả AI thị giác → {status, reasons}. Lỗi nào cũng FAIL; null (không có kết quả hợp lệ) = SKIP "cần duyệt tay". Exported để test. */
export function visionVerdict(v) {
  if (!v) return { status: 'SKIP', reasons: ['AI thị giác không trả kết quả hợp lệ – cần duyệt tay'] };
  const bad = [];
  for (const k of ['hands_ok', 'limbs_ok', 'face_ok', 'style_consistent', 'outfit_consistent', 'identity_consistent']) if (v[k] === false) bad.push(k === 'identity_consistent' ? 'identity drift' : k === 'outfit_consistent' ? 'trang phục đổi' : k.replace('_ok', ' lỗi').replace('_consistent', ' lệch'));
  if (v.extra_people) bad.push('thừa người'); if (v.text_present) bad.push('có chữ/watermark');
  return { status: bad.length ? 'FAIL' : 'PASS', reasons: bad.concat(v.drift || [], bad.length ? (v.issues || []).slice(0, 3) : []) };
}
/** Gộp 2 giám khảo: một bên FAIL → FAIL; cả hai PASS → PASS; còn lại → SKIP "cần duyệt tay". a/b = {v, provider} (v null = không có kết quả). Exported để test. */
export function combineVision(a, b) {
  const va = visionVerdict(a && a.v), vb = visionVerdict(b && b.v), tag = (x, v) => v.reasons.map(r => `[${(x && x.provider) || '?'}] ${r}`);
  if (va.status === 'FAIL' || vb.status === 'FAIL') return { status: 'FAIL', reasons: [...(va.status === 'FAIL' ? tag(a, va) : []), ...(vb.status === 'FAIL' ? tag(b, vb) : [])] };
  if (va.status === 'PASS' && vb.status === 'PASS') return { status: 'PASS', reasons: [] };
  return { status: 'SKIP', reasons: ['cần duyệt tay: thiếu ' + (va.status !== 'PASS' ? 'giám khảo chính' : 'giám khảo kiểm chéo') + ' (cả hai PASS mới PASS)'] };
}
/** Ảnh DNA dùng làm chuẩn cho mục (ảnh DNA/ref đang nhập: chính nó). */
function refFileFor(entry, m, file) {
  if (!entry.who) return null;
  const refItem = m.items.find(x => x.who === entry.who && x.ref) || m.items.find(x => x.who === entry.who && x.kind === 'char' && /dna/.test(x.file)) || m.items.find(x => x.who === entry.who && x.kind === 'char' && /neutral/.test(x.file) && x.status === 'approved');
  const f = (entry.ref || /\/dna\.png$/.test(entry.file || '')) && file ? file : refItem && path.join(LIB, refItem.file);
  return f && fs.existsSync(f) ? f : null;
}
async function visionCheck(entry, aiSheet, headSheet, m, deps = {}) {
  if (!entry.who || !aiSheet || !fs.existsSync(aiSheet)) return null;
  if (!refFileFor(entry, m, null) && !(entry.ref || /\/(dna|neutral)\.png$/.test(entry.file || ''))) return { status: 'SKIP', reasons: ['chưa có ảnh DNA của ' + entry.who + ' trong kho – cần duyệt tay'] };
  return judgeSheet(entry.who, fs.readFileSync(aiSheet), headSheet && fs.existsSync(headSheet) ? fs.readFileSync(headSheet) : null, deps);
}
/** Chấm bảng toàn thân + bảng cận đầu bằng 2 giám khảo (có cache theo sha256 2 ảnh + phiên bản prompt). */
export async function judgeSheet(who, buf, head, deps = {}, { cache = true } = {}) {
  const key = `${VISION_PROMPT_VER}:${who}:${sha256(buf)}:${head ? sha256(head) : '-'}`, store = cache ? loadVCache() : {};
  if (store[key]) return { ...combineVision(store[key].a, store[key].b), providers: [store[key].a.provider, store[key].b.provider].filter(Boolean).map(x => x + ' (cache)') };
  const D = { fetch, cfToken: cfToken(), cfAccount: CF_ACCOUNT, gcVisionUrl: process.env.GRABCAST_AI_VISION_URL, gcAiKey: process.env.GRABCAST_AI_KEY || (() => { try { const k = fs.readFileSync(path.join(os.homedir(), '.config/lexkite/grabcast-ai-key'), 'utf8').trim(); secrets.push(k); return k; } catch { return ''; } })(), geminiKeys: loadGeminiKeys, ...deps };
  const input = { who, body: { prompt: VISION_PROMPT(who), b64: buf.toString('base64') }, head: head ? { prompt: IDENTITY_PROMPT(who), b64: head.toString('base64') } : null };
  const a = await runVisionChain(input, D, deps.primary || PRIMARY_CHAIN);
  const b = await runVisionChain(input, D, deps.cross || CROSS_CHAIN, a.provider ? [a.provider] : []);
  if ((a.license || b.license) && !judgeSheet.warned) { judgeSheet.warned = true; log('ℹ Workers AI llama-3.2-11b-vision chưa chấp nhận giấy phép Meta (lỗi 5016) → giám khảo kiểm chéo lùi sang nhà kế tiếp. Chủ dự án quyết việc gửi prompt "agree" (docs/ASSET-LIBRARY.md §7.1).'); }
  const out = combineVision(a, b);
  if (out.status === 'SKIP') out.reasons.push(...[...a.tried, ...b.tried].slice(0, 4));
  if (cache && a.v && b.v) { store[key] = { a: { v: a.v, provider: a.provider }, b: { v: b.v, provider: b.provider }, at: today() }; try { fs.mkdirSync(path.dirname(VCACHE), { recursive: true }); fs.writeFileSync(VCACHE, JSON.stringify(store, null, 1)); } catch { /* cache không bắt buộc */ } }
  return { ...out, providers: [a.provider, b.provider], raw: { a: a.v, b: b.v } };
}
const reviewPath = id => path.join(LIB, '_review', id.replace(/[/.]/g, '_') + '.jpg');
/** Chạy toàn bộ cổng cho 1 file; trả {status, check, vision}. Bảng ghép giữ ở brand/library/_review/ nếu WARN/FAIL. */
async function gate(file, entry, m, { vision = true } = {}) {
  const sheet = reviewPath(entry.id);
  const wantAi = vision && entry.who && (entry.status !== 'reject' || entry.quarantinedFrom); // bỏ AI cho clip loại sẵn (tiết kiệm hạn mức)
  const aiSheet = sheet.replace(/\.jpg$/, '.ai.jpg'), headSheet = sheet.replace(/\.jpg$/, '.head.jpg');
  const res = runCheck(file, entry, m, wantAi ? { sheet, aiSheet, headSheet, aiRef: refFileFor(entry, m, file) } : { sheet });
  let vis = null;
  if (wantAi && res.aiSheet) vis = await visionCheck(entry, res.aiSheet, res.headSheet, m);
  for (const f of [aiSheet, headSheet]) if (fs.existsSync(f)) fs.unlinkSync(f); // kết luận đã cache theo sha256 bảng
  // Gemini hết hạn mức → dùng lại kết luận AI lần trước nếu file không đổi
  const prevVis = entry.check && entry.check.vision;
  if ((!vis || vis.status === 'SKIP') && prevVis && prevVis.status !== 'SKIP' && (!prevVis.sha || prevVis.sha === entry.sha256)) vis = { status: prevVis.status, reasons: prevVis.reasons, reused: prevVis.at || true };
  if (!vis && entry.who && (entry.kind === 'char' || entry.kind === 'clip')) vis = visionVerdict(null);
  let status = res.status;
  if (vis && vis.status === 'FAIL') status = 'FAIL';
  else if (vis && vis.status === 'SKIP' && status === 'PASS') status = 'WARN';
  const notPass = (res.checks || []).filter(c => c.status !== 'PASS' && c.status !== 'INFO');
  const check = { status, at: today(), issues: notPass.map(c => `${c.status} ${c.name}: ${c.reason}`), metrics: pickMetrics(res.metrics), suggest: res.suggest && Object.keys(res.suggest).length ? res.suggest : undefined };
  if (vis) check.vision = { status: vis.status, reasons: vis.reasons, providers: vis.providers, sha: entry.sha256, at: vis.reused ? (vis.reused === true ? undefined : vis.reused) : today() };
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
// Tham chiếu DNA theo trang phục: ảnh chars/<who>/green-<outfit>.png (nhập --ref) → m.refs['<who>@<outfit>']; clip <who>_<action>_<outfit>.mp4 dùng tham chiếu đó (bảng màu áo đổi theo trang phục).
const OUTFIT_RX = /(?:_|\/green-)(casual|travel)(?:_v\d+)?(?:\.stacked)?\.(?:mp4|png)$/;
export const outfitOfFile = rel => (OUTFIT_RX.exec(String(rel || '')) || [])[1] || null;
const refKey = (who, rel) => { const o = outfitOfFile(rel); return o ? `${who}@${o}` : who; };
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
    roles: pn.kind === 'clip' ? (opt.roles || ['speaker']) : undefined, status, ref: opt.ref || undefined, facing: pn.kind === 'clip' && opt.facing ? opt.facing : undefined, mirrorOk: pn.kind === 'clip' && opt.mirrorOk != null ? !!opt.mirrorOk : undefined,
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
  if (opt.ref && pn.kind === 'char' && check.suggest && check.suggest.ref) { m.refs[refKey(pn.who, rel)] = { ...check.suggest.ref, from: rel }; refreshRefs(m); }
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
      const base = { qa: it.qa ?? null, reserve: !!it.reserve, reject: !!it.reject, waiver: it.waiver, roles: it.roles, trimmed: it.trimmed, note: it.note, facing: it.facing, mirrorOk: it.mirrorOk, ref: it.ref, date: it.date || d.date, onFail: opts.onFail, vision: opts.vision, replace: opts.replace || !!it.replace };
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
    if (e.ref && e.kind === 'char' && e.check.suggest && e.check.suggest.ref) { m.refs[refKey(e.who, e.file)] = { ...e.check.suggest.ref, from: e.file }; refreshRefs(m); }
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
/** Duyệt tay: cổng tự động (heuristic MediaPipe/khung đột biến) đôi khi báo nhầm trên tranh 2D – người soi khung hình xác nhận thì mở cách ly.
 *  Bắt buộc --waiver "<lý do>"; giữ nguyên issues gốc, ghi manualReview {at, reason}; bản stacked FAIL → WAIVED (render dùng được). */
function cmdApprove(id, opts) {
  if (!id || !opts.waiver || String(opts.waiver).trim().length < 8) throw new Error('approve <id> --waiver "<lý do soi tay, ≥ 8 ký tự>" [--qa N]');
  const m = loadManifest(), key = /^(clips|rooms)\//.test(id) ? id : `clips/${id.replace(/\.mp4$/, '')}.mp4`, e = m.items.find(x => x.id === key);
  if (!e) throw new Error('không có ' + key);
  const was = e.status;
  if (opts.qa != null && !Number.isNaN(opts.qa)) e.qa = opts.qa; // điểm chấm tay (vd. từ content/video/qa-log.md)
  e.status = 'approved'; e.waiver = String(opts.waiver).trim(); e.manualReview = { at: today(), reason: e.waiver, from: was };
  if (e.rejectReason) { e.manualReview.rejectReason = e.rejectReason; delete e.rejectReason; }
  delete e.quarantinedFrom;
  const st = e.variants && e.variants.stacked;
  if (st && st.status === 'FAIL') st.status = 'WAIVED';
  saveManifest(m);
  const probs = writeRenderManifest(m);
  log(`✓ ${key}: ${was} → approved (duyệt tay: ${e.waiver})${st ? ' · stacked ' + st.status : ''} · manifest dựng ${probs.length ? probs.length + ' vấn đề' : 'OK'}`);
  if (!e.locations || !e.locations.primary) log('  → chạy library.mjs sync --primary-only để đưa lên media.lexkite.com (chưa lên media = render chưa dùng, ready:false)');
  return 0;
}
/** CI dựng video: brand/library không nằm trong git → tải từ nguồn chính (media.lexkite.com) đúng các file manifest dựng cần, kiểm sha256. */
async function cmdFetchRender() {
  const m = loadManifest(), rm = JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8'));
  // clip nhân vật build:"registry" không tải – CI dựng tại chỗ từ footage (registry_clips.py, bước trước trong video.yml)
  const want = [...(rm.clips || []), ...(rm.rooms || []), ...(rm.stills || [])].filter(x => x.ready && x.file && x.build !== 'registry').map(x => x.file);
  let ok = 0, miss = 0;
  for (const f of [...new Set(want)]) {
    const dest = path.join(LIB, f);
    const e = m.items.find(x => x.id === f || x.file === f || (x.variants && x.variants.stacked && x.variants.stacked.file === f));
    // phòng: ưu tiên bản gốc PNG (library/src/…, đủ nét cho nền 1080×1920) – bản web WebP ≤ 400 KB chỉ dự phòng
    const p = e && e.locations && ((e.kind === 'room' && e.locations.src) || e.locations.primary);
    if (!p || !p.url) { log(`! ${f}: chưa có trên nguồn chính (${e ? 'kho ghi ' + e.status : 'không có trong kho'}) – approved + library.mjs sync`); miss++; continue; }
    if (fs.existsSync(dest) && p.sha256 && sha256(fs.readFileSync(dest)) === p.sha256) { ok++; continue; }
    // CDN media.lexkite.com có trạm còn đệm bản cũ (file cắt lại giữ tên; đệm bỏ qua query) → sai sha256 trên máy CI (18/10).
    // Dự phòng bất biến: blob git theo gitSha (API GitHub, repo công khai; có GITHUB_TOKEN thì gắn để khỏi giới hạn lượt).
    const tries = [p.url, ...(p.gitSha ? [`https://api.github.com/repos/lexkiteapp/lexkite-media/git/blobs/${p.gitSha}`] : [])];
    let buf = null, st = 0;
    for (const u of tries) {
      const api = u.startsWith('https://api.github.com/'), h = api ? { Accept: 'application/vnd.github.raw', 'User-Agent': 'lexkite-fetch-render', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) } : {};
      const r = await fetch(u, { headers: h }).catch(() => null); st = r ? r.status : 0; if (!r || !r.ok) continue;
      let b; try { b = Buffer.from(await r.arrayBuffer()); } catch (e) { st = `luồng đứt: ${e.message}`; continue; } // mạng CI cắt giữa chừng → thử nguồn kế tiếp (blob git) if (!p.sha256 || sha256(b) === p.sha256) { buf = b; if (api) log(`  ${f}: CDN còn bản cũ → lấy blob git ${p.gitSha.slice(0, 8)}`); break; }
    }
    if (!buf) { log(`✗ ${f}: tải ${p.url} lỗi (${st}) hoặc sai sha256 (đã thử cả blob git)`); miss++; continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); ok++;
  }
  log(`fetch-render: ${ok} file sẵn sàng · ${miss} thiếu`);
  return miss ? 1 : 0;
}
/** Clip phông xanh? – đọc khung đầu thu nhỏ 16×16: 4 góc đều trội xanh lá (G − max(R,B) > 40) → tách bằng chroma_key.py (sạch hơn rembg, không bóng sàn). */
function isGreenScreen(src) {
  try {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-frames:v', '1', '-vf', 'scale=16:16', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
    return [0, 15, 240, 255].every(i => raw[i * 3 + 1] - Math.max(raw[i * 3], raw[i * 3 + 2]) > 40);
  } catch { return false; }
}
/** Dựng stacked: phông xanh → chroma_key.py; còn lại → clip_to_layer.py --stacked (rembg). */
function makeStacked(src, dst, env) {
  const green = isGreenScreen(src);
  const args = green ? [path.join(HERE, 'chroma_key.py'), src, dst] : [path.join(HERE, 'clip_to_layer.py'), src, '--stacked', dst];
  const r = spawnSync(rembgPython(), args, { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 << 20 });
  if (r.status === 0) log(`  ${green ? 'phông xanh → chroma_key' : 'rembg → clip_to_layer'}: ${path.basename(src)}`);
  return r;
}
/** Tạo bản stacked cho clip (mặc định: mọi clip approved chưa có) bằng clip_to_layer.py/chroma_key.py, kiểm cổng "stacked", ghi foot/figH/w/h. */
async function cmdStack(target, opts) {
  const m = loadManifest();
  const items = m.items.filter(e => e.kind === 'clip' && (target === 'all' ? e.status === 'approved' : e.id === target || e.file === target));
  let ok = 0, bad = 0;
  for (const e of items) {
    const out = path.join(LIB, e.id), src = path.join(LIB, e.file);
    if (!fs.existsSync(src)) { log(`! ${e.id}: thiếu gốc ${e.file}`); bad++; continue; }
    if (!fs.existsSync(out) || opts.force) {
      const r = makeStacked(src, out, { ...process.env, U2NET_HOME: process.env.U2NET_HOME || (fs.existsSync('/tmp/claude-501/u2net') ? '/tmp/claude-501/u2net' : path.join(os.tmpdir(), 'u2net')) });
      if (r.status !== 0) { log(`✗ ${e.id}: tách nền lỗi ${(r.stderr || '').trim().split('\n').pop()}`); bad++; continue; }
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
  const r = makeStacked(src, dst, { ...process.env, U2NET_HOME: process.env.U2NET_HOME || path.join(os.homedir(), '.u2net') });
  if (r.status !== 0) throw new Error('tách nền lỗi: ' + (r.stderr || '').trim().split('\n').slice(-3).join(' | '));
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
export function writeRenderManifest(m, file = path.join(LIB, 'manifest.json'), exists = f => fs.existsSync(path.join(LIB, f)) && onMedia(m, f)) {
  // GỘP vào danh mục có sẵn (render/test dùng làm danh mục thiết kế) – không xoá mục; mục chưa có file → ready:false
  let rm; try { rm = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { rm = { _note: '', rooms: [], clips: [], stills: [] }; }
  rm.rooms = rm.rooms || []; rm.clips = rm.clips || []; rm.stills = rm.stills || [];
  const probs = [], done = new Set();
  // NHÂN VẬT (chủ 28/10): render chỉ dùng clip build:"registry" (scripts/video/registry_clips.py dựng trên CI từ web/teach/characters.json);
  // clip kho cũ (status retired) không bao giờ vào danh mục dựng – kể cả khi ai đó đổi lại approved: người ngoài registry bị bỏ.
  const REG_IDS = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'web/teach/characters.json'), 'utf8')).people);
  for (const e of m.items.filter(x => x.kind === 'clip' && x.status === 'approved' && REG_IDS.includes(x.who) && x.build === 'registry')) {
    const st = e.variants && e.variants.stacked, id = path.basename(e.id, '.mp4');
    let c = rm.clips.find(x => x.id === id);
    if (!st || st.status === 'FAIL' || !exists(e.id)) {
      if (st && st.status === 'FAIL') probs.push(`clip ${e.id}: bản stacked FAIL (${(st.issues || []).filter(x => x.startsWith('FAIL')).join(' | ')})`);
      continue;
    }
    const outfitTag = (/_(casual|travel|office)$/.exec(id) || [])[1]; // clip trang phục khác mặc định: <who>_<action>_<outfit>.mp4 (vd. diane_talk_gesture_casual)
    if (!c) rm.clips.push(c = { id, who: e.who, tags: (e.tags || []).filter(x => x !== outfitTag), outfit: e.outfit || outfitTag || OUTFIT[e.who] || 'casual', mouth: (e.roles || []).includes('speaker'), facing: 'front' });
    else if (e.outfit || outfitTag) c.outfit = e.outfit || outfitTag;
    Object.assign(c, { file: e.id, alpha: 'stacked', roles: e.roles, foot: st.foot, figH: st.figH, w: st.w, h: st.h, ready: true });
    if (e.facing) c.facing = e.facing; // front | left | right (clip ¾); lật gương chỉ khi kho ghi mirrorOk:true
    if (e.mirrorOk != null) c.mirrorOk = !!e.mirrorOk;
    if (Array.isArray(e.facingSegments)) c.facingSegments = e.facingSegments; else delete c.facingSegments; // hướng theo đoạn [{from,to,facing}] (giây)
    const dc = driveCopies(st.drive); if (dc.length) c.drive = dc.map(x => ({ driveId: x.driveId, email_masked: x.email_masked || '', fileId: x.fileId })); // tra soát: bản stacked nằm ở Drive nào
    done.add(id);
  }
  for (const c of rm.clips) if (!done.has(c.id) && c.build !== 'registry') {
    const lib = m.items.find(x => x.id === c.file);
    c.ready = false;
    probs.push(`clip ${c.file}: ${!lib ? 'chưa có trong kho' : lib.status !== 'approved' ? 'kho ghi ' + lib.status : 'chưa có bản stacked đạt cổng'} → render bỏ qua (ready:false)`);
  }
  const TAG = { apartment: 'home' };
  const seen = new Set();
  for (const e of m.items.filter(x => x.kind === 'room' && x.status !== 'reject')) {
    const p = parseName(e.file); if (!p || p.ratio !== '9x16') continue;
    if (!exists(e.file)) { probs.push(`phòng ${e.file}: ${e.status !== 'approved' ? 'kho ghi ' + e.status + ' (chưa duyệt → không lên media)' : 'thiếu file / chưa sync lên media'} → ready:false`); continue; }
    let prof; try { prof = JSON.parse(fs.readFileSync(path.join(LIB, 'rooms', p.room + '.json'), 'utf8')); } catch { probs.push(`phòng ${e.file}: thiếu hồ sơ sàn rooms/${p.room}.json`); continue; }
    const id = `${p.room}-${p.time}`, base = p.room.replace(/-\d+$/, '');
    let r = rm.rooms.find(x => x.id === id);
    if (!r) rm.rooms.push(r = { id });
    Object.assign(r, { file: e.file, tag: TAG[base] || base, time: p.time, floor: prof.floor, stand: prof.stand, scaleAt: prof.scaleAt, light: prof.light, vanish: prof.vanish, ...(prof.counter ? { counter: prof.counter } : {}), ...(prof.maskText ? { maskText: prof.maskText } : {}), auto: !prof.manual, qa: e.qa, ready: true });
    seen.add(id);
  }
  for (const r of rm.rooms) if (!seen.has(r.id)) { r.ready = exists(r.file) && !m.items.some(x => x.kind === 'room' && x.file === r.file && x.status !== 'approved'); if (!r.ready) probs.push(`phòng ${r.file}: thiếu file → render dùng nền màu (ready:false)`); }
  for (const x of rm.stills) { x.ready = exists(x.file); if (!x.ready) probs.push(`ảnh tĩnh ${x.file}: thiếu file (ready:false)`); }
  rm._note = String(rm._note || '').replace(/\s*\[library\.mjs\].*$/, '') + ' [library.mjs] Mục có file được cập nhật tự động từ content/video/library.json (clip: bản stacked clips/<id>.mp4 + foot/figH/w/h; gốc Kling ở clips/src/ – KHÔNG để clip gốc ở clips/; phòng: hồ sơ sàn tự động rooms/<room>.json, auto:true = chưa chỉnh tay). ready:false = chưa có file, render bỏ qua.';
  fs.writeFileSync(file, JSON.stringify(rm, null, 2) + '\n');
  return probs;
}

/** Đã có trên nguồn chính (media.lexkite.com) đúng bản đang dùng? clip: bản stacked (primary = stacked, cùng sha); phòng/ảnh: bản web của đúng gốc.
 *  CI dựng video chỉ có những gì fetch-render tải được từ media → manifest dựng chỉ đánh ready:true cho mục approved đã lên media. */
export function onMedia(m, f) {
  const e = m.items.find(x => x.id === f || x.file === f); if (!e) return true; // mục ngoài kho (ảnh tĩnh thiết kế…) → chỉ xét file
  if (e.status !== 'approved') return false;
  const p = e.locations && e.locations.primary; if (!p) return false;
  if (e.kind === 'clip') { const st = e.variants && e.variants.stacked; return !!st && p.path === st.file && (!st.sha256 || p.sha256 === st.sha256); }
  return p.srcSha === e.sha256;
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

// ---------- Kho Drive riêng (sao lưu nguồn 2 – functions/api/drive.js, docs/ASSET-LIBRARY.md §8.6) ----------
// Xác thực CLI/CI: LEXKITE_DRIVE_CLI_KEY (env hoặc ~/.config/lexkite/drive-cli-key) → header X-Drive-Ts + X-Drive-Sig = HMAC("<ts>.<sha256 body>").
// Chỉ được list · upload_session · complete. Byte file PUT thẳng vào phiên resumable của Google (không qua Worker).
const DRIVE_API = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '') + '/api/drive';
export function driveCliKey() {
  const k = process.env.LEXKITE_DRIVE_CLI_KEY || (() => { try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/drive-cli-key'), 'utf8').trim(); } catch { return ''; } })();
  if (k) secrets.push(k);
  return k;
}
/** Header ký cho 1 thân yêu cầu. Exported để test khớp với functions/api/drive.js. */
export function driveSign(key, bodyText, ts = Math.floor(Date.now() / 1000)) {
  return { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': crypto.createHmac('sha256', key).update(ts + '.' + sha256(Buffer.from(bodyText))).digest('hex') };
}
export async function driveApi(op, body = {}, { fetcher = fetch, key = driveCliKey() } = {}) {
  if (!key) { const e = new Error('chưa có LEXKITE_DRIVE_CLI_KEY'); e.code = 'no-key'; throw e; }
  const text = JSON.stringify({ op, ...body });
  let r, j;
  for (let i = 0; ; i++) { // 429 too-fast (giới hạn 120 lượt/phút/IP của functions/api/drive.js) → chờ rồi thử lại, tối đa 5 lần
    r = await fetcher(DRIVE_API, { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text }); // ký lại mỗi lần (HMAC có mốc giờ)
    j = await r.json().catch(() => ({}));
    if (r.status !== 429 || i >= 4 || fetcher !== fetch || /quota-guard|d1-budget/.test(j.error || '')) break; // cầu dao D1: KHÔNG thử lại – dừng, mai chạy tiếp
    await new Promise(res => setTimeout(res, 15000 * (i + 1)));
  }
  if (!r.ok) { const e = new Error(scrub(`Drive ${op} → ${r.status} ${j.error || ''}`)); e.code = j.error || r.status; e.status = r.status; throw e; }
  return j;
}
let driveState = null;
/** Có ít nhất 1 Drive đang nhận file (status ok, trọng số > 0)? Không có khoá/không gọi được → false (lùi về GrabCast). */
export async function driveReady(deps = {}) {
  if (driveState !== null && !deps.fresh) return driveState;
  try { const j = await driveApi('list', {}, deps); driveState = (j.drives || []).some(d => d.status === 'ok' && d.weight > 0); }
  catch { driveState = false; }
  return driveState;
}
/** Che một phần email (log/CLI/manifest) – khớp maskEmail của functions/api/drive.js. */
export const maskEmail = e => { const m = String(e || '').match(/^([^@]+)@(.+)$/); if (!m) return ''; const u = m[1]; return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '***' + u.slice(-1)) + '@' + m[2]; };
/** locations.drive (mới: mảng bản sao [{driveId, email_masked, fileId, sha256, at}] · cũ: {status:'ok', driveId, fileId}) → mảng. */
export function driveCopies(v) {
  if (Array.isArray(v)) return v.filter(x => x && x.fileId);
  if (v && v.fileId && (v.status === 'ok' || v.status == null)) return [{ driveId: v.driveId, fileId: v.fileId, sha256: v.sha256, at: v.at }];
  return [];
}
/** Số bản sao cần: bản gốc approved/reserve → 2 (2 Drive khác nhau), reject → 1. */
export const driveWant = e => (e.status === 'reject' ? 1 : 2);
export async function putSession(fetcher, url, buf, ct, chunk) {
  if (!/^https:\/\/www\.googleapis\.com\/upload\//.test(String(url || ''))) throw new Error('Drive không trả phiên tải lên');
  let res, off = 0;
  if (buf.length <= 64 << 20) res = await fetcher(url, { method: 'PUT', headers: { 'Content-Type': ct }, body: buf });
  else while (off < buf.length) {
    const end = Math.min(buf.length, off + chunk);
    res = await fetcher(url, { method: 'PUT', headers: { 'Content-Range': `bytes ${off}-${end - 1}/${buf.length}` }, body: buf.subarray(off, end) });
    if (res.status === 200 || res.status === 201) break;
    if (res.status !== 308) throw new Error('PUT khúc ' + res.status);
    const rg = res.headers.get('Range'); off = rg && /bytes=0-(\d+)/.test(rg) ? +RegExp.$1 + 1 : end;
  }
  if (!res || (res.status !== 200 && res.status !== 201)) throw new Error('PUT Drive ' + (res && res.status));
  const fid = (await res.json().catch(() => ({}))).id;
  if (!fid) throw new Error('Drive không trả id file');
  return fid;
}
/** Mọi bản sao 'ok' của 1 sha trên Kho Drive (email đã che). */
export async function driveWhere(sha, deps = {}) {
  const j = await driveApi('where', { q: sha, gstate: 'ok' }, deps);
  return (j.copies || []).filter(c => c.sha256 === sha).map(c => ({ driveId: c.drive_id, email_masked: c.email_masked || '', fileId: c.file_id, sha256: c.sha256, at: today() }));
}
/** Tải 1 file lên Kho Drive: máy chủ chọn đủ số bản sao trên các Drive KHÁC NHAU (bỏ qua bản đã có). → {driveId, fileId, copies, want, short?}. */
export async function driveUpload(file, { name, folder, sha, mimeType, replicas, cls, assetId }, deps = {}) {
  const fetcher = deps.fetcher || fetch, buf = fs.readFileSync(file), sh = sha || sha256(buf), ct = mimeType || mime(file);
  const run = process.env.GITHUB_RUN_ID || undefined;
  const s0 = await driveApi('upload_session', { name, mime: ct, size: buf.length, sha256: sh, folder, replicas, cls, asset_id: assetId, run }, deps);
  let existed = !!s0.done, first = s0.done ? { driveId: s0.drive_id, fileId: s0.file_id } : null;
  if (!s0.done) for (const ss of (s0.sessions || [{ drive_id: s0.drive_id, upload_url: s0.upload_url }])) {
    const fid = await putSession(fetcher, ss.upload_url, buf, ct, s0.chunk || 8 << 20);
    await driveApi('complete', { drive_id: ss.drive_id, file_id: fid, sha256: sh }, deps);
    if (!first) first = { driveId: ss.drive_id, fileId: fid };
  }
  const copies = await driveWhere(sh, deps).catch(() => []);
  if (s0.short) log(`⚠ ${name}: chỉ đủ ${s0.want - s0.short}/${s0.want} bản sao (thiếu Drive còn chỗ) – nối thêm Drive hoặc chạy verify --repair sau`);
  return { ...first, existed, copies, want: s0.want || 1, short: s0.short || 0 };
}
const driveFolderOf = rel => 'originals' + (path.posix.dirname(rel) !== '.' ? '/' + path.posix.dirname(rel) : '');
/** Sao lưu bản gốc 1 mục lên Drive → ghi e.locations.drive. */
async function driveBackupEntry(e, file, deps) {
  const r = await driveUpload(file, { name: path.posix.basename(e.file), folder: driveFolderOf(e.file), sha: e.sha256, cls: 'original', replicas: driveWant(e), assetId: e.id }, deps);
  e.locations.drive = r.copies.length ? r.copies : [{ driveId: r.driveId, email_masked: '', fileId: r.fileId, sha256: e.sha256, at: today() }]; // tra soát: tài nguyên → Drive nào
  delete e.locations.drivePending;
  return r;
}
const driveDone = e => { const c = driveCopies(e.locations.drive).filter(x => !x.sha256 || x.sha256 === e.sha256); return c.length >= driveWant(e); };
/** Đẩy tham chiếu manifest lên máy chủ (drive_refs) – cleanup_scan dùng để tìm file mồ côi / reject cũ. */
export function driveRefs(m, rm) {
  const lib = [], man = [];
  for (const e of m.items) {
    lib.push({ s: e.sha256, st: e.status }); for (const c of driveCopies(e.locations && e.locations.drive)) lib.push({ s: e.sha256, f: c.fileId, st: e.status });
    const st = e.variants && e.variants.stacked; if (st) { if (st.sha256) lib.push({ s: st.sha256, st: e.status }); for (const c of driveCopies(st.drive)) lib.push({ f: c.fileId, st: e.status }); }
  }
  for (const k of ['rooms', 'clips', 'stills']) for (const x of (rm && rm[k]) || []) { if (x.file) man.push({ n: path.posix.basename(x.file), st: 'approved' }); for (const c of driveCopies(x.drive)) man.push({ f: c.fileId, st: 'approved' }); }
  return { library: lib, manifest: man };
}
export async function pushDriveRefs(m, deps = {}) {
  let rm = null; try { rm = JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8')); } catch { rm = null; }
  const r = driveRefs(m, rm);
  const a = await driveApi('refs_sync', { source: 'library', items: r.library }, deps), b = await driveApi('refs_sync', { source: 'manifest', items: r.manifest }, deps);
  return { library: a.count, manifest: b.count };
}
/** Chép bù bản sao thiếu (máy chủ chép Drive → Drive), lặp tới khi xong hoặc không tiến triển. */
async function driveRepairLoop(deps = {}) {
  let last = Infinity, total = 0;
  for (let i = 0; i < 50; i++) {
    const r = await driveApi('repair', { max_files: 5 }, deps);
    total += (r.done || []).length; for (const f of r.failed || []) log(`! sửa bản sao ${f.name}: ${f.error}`);
    if (!r.remaining || r.remaining >= last || !(r.done || []).length) { if ((r.lost_only || []).length) log(`⚠ ${r.lost_only.length} file chỉ còn trên Drive mất kết nối – cần tải lại từ máy/nguồn chính`); log(`Sửa bản sao: chép ${total} · còn thiếu ${r.remaining || 0}`); return r.remaining || 0; }
    last = r.remaining;
  }
  return last;
}
/** CI (library-build): sao lưu bản stacked trong <dir> + bản gốc clip (tải từ library/src, kiểm sha) lên Drive. */
async function cmdDriveBackup(dir, opts) {
  if (!driveCliKey()) { log('… chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua sao lưu Drive'); return 0; }
  if (!(await driveReady())) { log('… Kho Drive chưa nối Drive nào (Quản trị → Kho Drive) – bỏ qua'); return 0; }
  const m = loadManifest(); let up = 0, have = 0, fail = 0;
  const one = async (label, fn) => { try { const r = await fn(); if (r && r.existed) have++; else up++; } catch (err) { fail++; log(`! ${label}: ${scrub(err.message)}`); } };
  if (dir && fs.existsSync(dir)) for (const f of fs.readdirSync(dir, { recursive: true }).filter(x => /\.json$/.test(x))) {
    let rj; try { rj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const e = m.items.find(x => x.id === rj.id), mp4 = path.join(dir, f.replace(/\.json$/, '.mp4'));
    if (!e || rj.alpha !== 'stacked' || !fs.existsSync(mp4)) continue;
    await one(e.id + ' (stacked)', async () => { const r = await driveUpload(mp4, { name: path.posix.basename(e.id), folder: 'stacked/clips', sha: rj.sha256, cls: 'render', replicas: 1, assetId: e.id + '#stacked' }); e.variants = e.variants || {}; e.variants.stacked = { ...(e.variants.stacked || {}), drive: r.copies.length ? r.copies : [{ driveId: r.driveId, email_masked: '', fileId: r.fileId }] }; return r; });
  }
  for (const e of m.items) {
    if (driveDone(e)) { have++; continue; }
    let file = path.join(LIB, e.file);
    if (!fs.existsSync(file) && e.locations.src && e.locations.src.url) { // CI: lấy bản gốc lossless từ nguồn chính, kiểm sha
      const rr = await fetch(e.locations.src.url).catch(() => null), buf = rr && rr.ok ? Buffer.from(await rr.arrayBuffer()) : null;
      if (!buf || sha256(buf) !== e.sha256) continue;
      file = path.join(os.tmpdir(), 'lexkite-drv-' + e.sha256.slice(0, 16)); fs.writeFileSync(file, buf);
    }
    if (!fs.existsSync(file)) continue;
    await one(e.id, () => driveBackupEntry(e, file));
  }
  saveManifest(m);
  log(`Kho Drive: tải ${up} · đã có ${have} · lỗi ${fail}`);
  try { const r = await pushDriveRefs(m); log(`Kho Drive: đồng bộ tham chiếu (library ${r.library} · manifest ${r.manifest})`); } catch (err) { log('! đồng bộ tham chiếu Drive: ' + scrub(err.message)); }
  if (opts.repair) await driveRepairLoop();
  return fail ? 1 : 0;
}

/** Kiểm sức khoẻ Kho Drive (GitHub Actions hằng ngày – health.yml): quota, token, ngưỡng 80/90 %, thư cảnh báo (máy chủ gửi). Thiếu bản sao → tự sửa. */
async function cmdDriveHealth(opts) {
  if (!driveCliKey()) { log('… chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua kiểm Kho Drive'); return 0; }
  const r = await driveApi('health');
  for (const d of r.drives || []) log(`${d.ok ? '✓' : '✗'} Drive #${d.id}: ${d.state}${d.pct != null ? ' · ' + d.pct + '%' : ''}${d.paused ? ' · tự ngừng nhận file' : ''}${d.fails ? ' · lỗi mạng ' + d.fails : ''}`);
  for (const a of r.alerts || []) log(`${a.level === 'crit' ? '⛔' : '⚠'} ${a.t}${a.p && a.p.email ? ' ' + maskEmail(a.p.email) : ''}${a.p && a.p.pct ? ' ' + a.p.pct + '%' : ''}`);
  if (r.mailed && r.mailed.length) log(`✉ đã gửi thư: ${r.mailed.join(', ')}`);
  log(`Bản sao: thiếu ${r.under_replicated || 0} · chỉ 1 bản ${r.single || 0} · chỉ trên Drive mất kết nối ${r.lost_only || 0}`);
  if (r.under_replicated && !opts.dryRun) await driveRepairLoop();
  return (r.alerts || []).some(a => a.level === 'crit') ? 2 : 0;
}
/** library.mjs where <id|sha|tên> – vị trí mọi bản sao (email che một phần). */
async function cmdWhere(q) {
  if (!q) throw new Error('cần <id|sha|tên>');
  const m = loadManifest(), hits = m.items.filter(e => e.id === q || e.file === q || e.sha256.startsWith(q.toLowerCase()) || path.posix.basename(e.file) === q);
  const keys = hits.length ? hits.map(e => ({ label: `${e.id} (${e.status})`, q: e.sha256 })) : [{ label: q, q }];
  let n = 0;
  for (const k of keys) {
    log(`• ${k.label}`);
    const j = await driveApi('where', { q: k.q });
    for (const c of j.copies || []) { n++; log(`   Drive #${c.drive_id} ${c.email_masked} · ${c.folder || '/'}/${c.name} · ${c.file_id} · ${c.status} · ${c.copies}/${c.want || 1} bản`); }
    if (!(j.copies || []).length) log('   (không có trên Kho Drive)');
  }
  return n ? 0 : 1;
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
      if (e.kind === 'room') { // nền video cần bản gốc đủ nét (bản web bị nén ≤ 400 KB) → library/src/ như clip; fetch-render (CI) ưu tiên bản này
        const b = fs.readFileSync(path.join(LIB, e.file));
        e.locations.src = { path: 'src/' + e.file, url: CDN + 'src/' + e.file, gitSha: gitBlobSha(b), sha256: e.sha256, bytes: b.length }; push('library/src/' + e.file, b);
      }
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
    if (fs.existsSync(rmf) && !opts.dryRun) { const probs = writeRenderManifest(m); if (probs.length) log(`manifest dựng: ${probs.length} mục chưa sẵn sàng (ready:false)`); push('library/manifest.json', fs.readFileSync(rmf)); }
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
    if (!opts.dryRun) saveManifest(m); // --dry-run: không ghi primary của file chưa đẩy
  }
  if (!opts.primaryOnly && await driveReady()) { // nguồn phụ ưu tiên: Kho Drive riêng (đã nối trong Quản trị); không có → GrabCast
    let up = 0, have = 0, fail = 0;
    for (const e of m.items) {
      if (driveDone(e)) { have++; continue; }
      const file = path.join(LIB, e.file);
      if (!fs.existsSync(file) || opts.dryRun) continue;
      try { const r = await driveBackupEntry(e, file); if (r.existed && !r.short) have++; else up++; }
      catch (err) { fail++; e.locations.drivePending = { status: 'pending', reason: scrub(err.message).slice(0, 160) }; if (!Array.isArray(e.locations.drive)) e.locations.drive = driveCopies(e.locations.drive); log(`! ${e.id}: ${scrub(err.message)}`); if (err.code === 'pool_full') { log('⚠ Kho Drive hết chỗ (chừa 5 % / 256 MB) – nối thêm Drive trong Quản trị → Kho Drive'); code = 2; break; } }
      saveManifest(m);
    }
    log(`Nguồn phụ Kho Drive: tải ${up} · đã có ${have} · lỗi ${fail}`);
    saveManifest(m);
  } else if (!opts.primaryOnly) {
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
  const b = (e.locations && e.locations.backup) || {}, dvc = driveCopies(e.locations && e.locations.drive);
  if (dvc.length) { // Kho Drive: kiểm sha có trong drive_files (list?sha256=…) + đủ số bản sao (2 Drive khác nhau cho bản gốc approved/reserve)
    if (deps.driveHave) {
      const h = await deps.driveHave(e.sha256);
      if (!h) gaps.push('backup: Kho Drive không có sha ' + e.sha256.slice(0, 12));
      else { if (h.size != null && +h.size !== e.bytes) gaps.push(`backup: Drive dung lượng ${h.size} ≠ ${e.bytes}`); if (h.copies != null && h.copies < driveWant(e)) gaps.push(`backup: Kho Drive chỉ có ${h.copies}/${driveWant(e)} bản sao`); }
    }
  } else if (b.status !== 'ok') gaps.push(`backup: ${b.status || 'chưa có'}${b.reason ? ' (' + b.reason + ')' : ''}`);
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
    driveHave: await (async () => { // 1 lượt list theo lô sha (≤ 200/lượt) cho mọi mục đã lên Drive
      const shas = m.items.filter(e => driveCopies(e.locations.drive).length).map(e => e.sha256), have = {};
      if (!shas.length || !driveCliKey()) return null;
      for (let i = 0; i < shas.length; i += 200) { const j = await driveApi('list', { sha256: shas.slice(i, i + 200) }).catch(() => null); if (!j) return null; Object.assign(have, j.have || {}); }
      return async sha => have[sha] || null;
    })(),
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
  if (opts.repair && driveCliKey()) { const left = await driveRepairLoop(); if (!left) log('✓ Kho Drive: đủ bản sao'); }
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

// ---------- hiệu chỉnh AI thị giác ----------
async function cmdVisionCal(opts) {
  const cal = JSON.parse(fs.readFileSync(path.join(HERE, 'vision-calibration.json'), 'utf8')), runs = +(opts.runs || 1);
  const models = opts.model ? [opts.model] : [CF_VISION.scout, CF_VISION.llama32];
  const D = { fetch, cfToken: cfToken(), cfAccount: CF_ACCOUNT };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lexkite-vcal-')), score = {};
  for (const smp of cal.samples) {
    const f = path.join(ROOT, smp.file); if (!fs.existsSync(f)) { log(`… bỏ qua ${smp.id}: thiếu ${smp.file}`); continue; }
    const ref = ['dna', 'neutral'].map(x => path.join(LIB, `chars/${smp.who}/${x}.png`)).find(x => fs.existsSync(x));
    const body = path.join(tmp, smp.id + '.jpg'), head = path.join(tmp, smp.id + '.head.jpg');
    const pr = spawnSync(python(), [path.join(HERE, 'asset_anatomy.py'), f, '--ai-sheet', body, '--head-sheet', head, ...(ref ? ['--ref', ref] : [])], { encoding: 'utf8' });
    if (pr.status !== 0) { log(`! ${smp.id}: không dựng được bảng`); continue; }
    const input = { who: smp.who, body: { prompt: VISION_PROMPT(smp.who), b64: fs.readFileSync(body).toString('base64') }, head: { prompt: IDENTITY_PROMPT(smp.who), b64: fs.readFileSync(head).toString('base64') } };
    for (const model of models) for (let i = 0; i < runs; i++) {
      const sc = score[model] = score[model] || { ok: 0, n: 0, err: 0 };
      let st; try { st = visionVerdict(await judgeWith(cfVisionProvider(model), input, D)); } catch (e) { sc.err++; log(`  ${model.split('/').pop()} ${smp.id}: lỗi ${scrub(e.message).slice(0, 100)}`); continue; }
      sc.n++; if (st.status === smp.expect) sc.ok++;
      log(`${st.status === smp.expect ? '✓' : '✗'} ${model.split('/').pop()} ${smp.id}: mong ${smp.expect} → ${st.status} ${st.reasons.join('; ').slice(0, 140)}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const [m, s] of Object.entries(score)) log(`${m}: đúng ${s.ok}/${s.n} (${s.n ? Math.round(100 * s.ok / s.n) : 0} %) · lỗi gọi ${s.err}`);
  return Object.values(score).some(s => s.n && s.ok < s.n) ? 1 : 0;
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
  log(`\nSao lưu: chính ${m.items.filter(e => e.locations.primary).length}/${c.counts.approved} approved · GrabCast ${JSON.stringify(bk)} · Kho Drive ${m.items.filter(e => driveCopies(e.locations.drive).length).length}/${m.items.length} (đủ bản sao ${m.items.filter(driveDone).length})`);
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
    if (['reserve', 'reject', 'trimmed', 'replace', 'ref', 'force', 'noSync', 'dryRun', 'primaryOnly', 'backupOnly', 'deep', 'noVision', 'repair'].includes(k)) o[k] = true;
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
      : cmd === 'approve' ? cmdApprove(o._[0], o)
      : cmd === 'fetch-render' ? await cmdFetchRender()
      : cmd === 'stack' ? await cmdStack(o._[0] || 'all', o)
      : cmd === 'drive-backup' ? await cmdDriveBackup(o._[0] || 'out/library', o)
      : cmd === 'drive-refs' ? (r => { log(`drive_refs: library ${r.library} · manifest ${r.manifest}`); return 0; })(await pushDriveRefs(loadManifest()))
      : cmd === 'drive-health' ? await cmdDriveHealth(o)
      : cmd === 'where' ? await cmdWhere(o._[0])
      : cmd === 'vision-cal' ? await cmdVisionCal(o)
      : cmd === 'ci-plan' ? cmdCiPlan(o._[0] || 'missing', o)
      : cmd === 'ci-build' ? await cmdCiBuild(o._[0], o)
      : cmd === 'ci-apply' ? await cmdCiApply(o._[0] || 'out/library', o)
      : cmd === 'render-manifest' ? (p => { p.forEach(x => log('✗ ' + x)); log(`manifest dựng: ${p.length ? p.length + ' vấn đề' : 'OK'}`); return p.length ? 1 : 0; })(writeRenderManifest(loadManifest()))
      : (console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15).join('\n')), 0);
    process.exit(code);
  } catch (e) { console.error('✗ library: ' + scrub(e.message)); process.exit(1); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
