#!/usr/bin/env node
// Bản WEB của short bản tin (docs/VIDEO-SCALE-PLAN.md §10 "một clip – hai nơi dùng") – CHỈ chạy trên CI (.github/workflows/video-web.yml).
//   node scripts/video/web-rendition.mjs plan  <shorts-checkout>   → .webvid/dirs.txt (thư mục cần lấy từ lexkite-shorts) + .webvid/plan.json
//   node scripts/video/web-rendition.mjs build <shorts-checkout>   → ffmpeg 720×1280 H.264 CRF 23 +faststart (~2–3 MB), poster WebP,
//        phụ đề WebVTT en (mốc từng từ) + 14 ngôn ngữ giao diện (dịch + AI chấm qua /api/lexai, OIDC, miễn phí), thẻ, câu đố → .webvid/<bài>/
//   node scripts/video/web-rendition.mjs publish                   → GitHub Release 'wv-<bài>' của repo (GITHUB_TOKEN, không secret mới) – phục vụ qua media.lexkite.com/video/
//   node scripts/video/web-rendition.mjs manifest                  → web/data/videos.json (+ content/video/web/captions/<bài>.json cho trang /video/<slug>/)
// Chỉ clip bản tin, QA ≥ 90 và chủ đã duyệt (content/video/web/approved.json "approved") – hoặc mẫu thử ("test": ẩn trên production, chỉ hiện với ?vtest=1).
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { LANGS, MANIFEST, CAPTIONS_DIR, APPROVED, CDN, readJSON, sha, eligible, sentences, enCues, vtt, tagLesson, quizFor, titleOf, slugOf, templateOf, validateManifest } from '../lib/video-web.mjs';

const [cmd, shortsDir = process.env.SHORTS_DIR || 'shorts-repo'] = process.argv.slice(2);
const W = '.webvid', NEWS = 'content/video/cine/news';
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', GH = 'https://api.github.com/repos/' + REPO;
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
fs.mkdirSync(W, { recursive: true });
const TEXT = Object.fromEntries((readJSON(`${NEWS}/lines.json`, {}).lines || []).map(l => [l.id, l.text]));
const lessonOf = id => readJSON(`${NEWS}/${id}.json`);
const ff = args => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

function pick() {
  const idx = readJSON(path.join(shortsDir, 'shorts/index.json'), { items: [] }), ap = readJSON(APPROVED, {});
  return eligible(idx.items, ap).filter(it => lessonOf(it.lesson));
}

// ---------- plan ----------
if (cmd === 'plan') {
  const el = pick(), man = readJSON(MANIFEST, { items: [] }), have = Object.fromEntries((man.items || []).map(x => [x.id, x]));
  const todo = el.filter(it => process.env.FORCE === '1' || !have[it.lesson] || have[it.lesson].rev !== sha(`${it.video}|${it.bytes}|${it.created}`, 8) || have[it.lesson].test !== it.test || !fs.existsSync(`${CAPTIONS_DIR}/${it.lesson}.json`));
  fs.writeFileSync(`${W}/plan.json`, JSON.stringify({ eligible: el.map(x => x.lesson), todo: todo.map(x => x.lesson) }, null, 1));
  fs.writeFileSync(`${W}/dirs.txt`, todo.map(it => '/' + path.dirname(it.video) + '/').join('\n') + (todo.length ? '\n' : ''));
  console.log(`eligible ${el.length} · todo ${todo.length}: ${todo.map(x => x.lesson).join(', ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `todo=${todo.length}\neligible=${el.length}\n`);
}

// ---------- translate (OIDC → /api/lexai, Gemini pool → Workers AI) ----------
let token = '';
async function oidc() {
  if (token) return token;
  const u = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, t = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!u || !t) throw new Error('thiếu OIDC (permissions: id-token: write)');
  token = (await (await fetch(u + '&audience=lexkite-lexai', { headers: { Authorization: 'Bearer ' + t } })).json()).value; return token;
}
async function ai(mode, lang, items, ctx) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await oidc(), 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ mode, lang, items, ctx }) }).catch(() => null);
    if (r && r.ok) return (await r.json()).out || {};
    if (r && r.status === 401) token = '';
    await new Promise(s => setTimeout(s, 6000 * (i + 1)));
  }
  return {};
}
/** Dịch câu phụ đề 1 ngôn ngữ + AI chấm; câu ≤ 3 dịch lại 1 lần; còn câu < 4 sau lần 2 hoặc thiếu → bỏ ngôn ngữ (người xem thấy phụ đề EN). */
async function translate(lang, sents, ctx) {
  const items = sents.map((s, i) => ({ k: 's' + i, en: s.text }));
  let tr = await ai('subs', lang, items, ctx), sc = {};
  for (let round = 0; round < 2; round++) {
    const have = items.filter(x => typeof tr[x.k] === 'string' && tr[x.k].trim());
    sc = await ai('subjudge', lang, have.map(x => ({ ...x, tr: tr[x.k] })));
    const redo = items.filter(x => !(+sc[x.k] >= 4));
    if (!redo.length || round) break;
    Object.assign(tr, await ai('subs', lang, redo, ctx));
  }
  const scores = items.map(x => +sc[x.k] || 0), ok = scores.every(s => s >= 4);
  return ok ? { cues: sents.map((s, i) => ({ s: s.s, e: s.e, text: String(tr['s' + i]).trim() })), judge: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) } : { cues: null, judge: Math.min(...scores) };
}

// ---------- build ----------
if (cmd === 'build') {
  const plan = readJSON(`${W}/plan.json`, { todo: [] }), all = pick(), todo = all.filter(it => plan.todo.includes(it.lesson));
  const LEX = readJSON('dist/lexicon.json', {});
  let GIDS = []; try { GIDS = (await import('../lib/seo-data.mjs')).loadGrammar().G.map(x => x.id); } catch { /* không có trang ngữ pháp → bỏ thẻ ngữ pháp */ }
  const pool = Object.entries(TEXT).filter(([k]) => /_2$/.test(k)).map(([, v]) => v);
  let built = 0;
  for (const it of todo) {
    const L = lessonOf(it.lesson), d = path.join(W, it.lesson), src = path.join(shortsDir, it.video);
    if (!fs.existsSync(src)) { console.log(`::warning::${it.lesson}: thiếu master ${it.video}`); continue; }
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    // 720×1280 H.264 ~2–3 MB: CRF 23 có trần bitrate; quá 3,2 MB → CRF 26
    for (const crf of [23, 26]) {
      ff(['-i', src, '-vf', 'scale=720:1280:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.0', '-crf', String(crf),
        '-maxrate', '1100k', '-bufsize', '2200k', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '48000', '-movflags', '+faststart', `${d}/v.mp4`]);
      if (fs.statSync(`${d}/v.mp4`).size <= 3.2e6) break;
    }
    const cover = it.cover && fs.existsSync(path.join(shortsDir, it.cover)) ? path.join(shortsDir, it.cover) : null;
    ff([...(cover ? ['-i', cover] : ['-ss', '1.2', '-i', src, '-frames:v', '1']), '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', `${d}/p.webp`]);
    const tl = readJSON(src.replace(/\.mp4$/, '.timeline.json'), null), sents = sentences(tl, TEXT);
    if (!sents.length) { console.log(`::warning::${it.lesson}: không dựng được phụ đề (thiếu timeline)`); continue; }
    const caps = { en: enCues(sents) }, judge = {};
    for (const l of LANGS.filter(x => x !== 'en')) {
      const r = await translate(l, sents, L.point); judge[l] = r.judge;
      if (r.cues) caps[l] = r.cues; else console.log(`  ${it.lesson} ${l}: điểm dịch ${r.judge} < 4 → dùng phụ đề EN`);
    }
    for (const [l, c] of Object.entries(caps)) fs.writeFileSync(`${d}/${l}.vtt`, vtt(c));
    const meta = {
      id: it.lesson, slug: slugOf(L), title: titleOf(L), template: templateOf(L, it.lesson), series: (L.series && L.series[0]) || '', point: L.point || '',
      tags: tagLesson(L, TEXT, LEX, GIDS), duration: +(+it.duration || 0).toFixed(1), quiz: quizFor(L, TEXT, pool), score: it.score, test: it.test,
      rev: sha(`${it.video}|${it.bytes}|${it.created}`, 8), created: it.created, bytes: fs.statSync(`${d}/v.mp4`).size,
    };
    fs.writeFileSync(`${d}/meta.json`, JSON.stringify(meta, null, 1));
    fs.mkdirSync(CAPTIONS_DIR, { recursive: true });
    fs.writeFileSync(`${CAPTIONS_DIR}/${it.lesson}.json`, JSON.stringify({ id: it.lesson, judge, transcript: sents.map(s => ({ s: s.s, text: s.text })), cues: caps }, null, 0) + '\n');
    console.log(`✓ ${it.lesson}: ${(meta.bytes / 1e6).toFixed(2)} MB · phụ đề ${Object.keys(caps).length}/15 · thẻ ${meta.tags.lex.length} từ, ngữ pháp [${meta.tags.grammar}] · quiz ${meta.quiz ? 'có' : 'không'}`);
    built++;
  }
  if (todo.length && !built) { console.error('✗ video-web: không dựng được clip nào'); process.exit(1); }
}

// ---------- publish: GitHub Release 'wv-<bài>' (tên file theo mã băm nội dung → CDN đệm vĩnh viễn) ----------
async function gh(method, url, body, type = 'application/json') {
  const r = await fetch(url.startsWith('http') ? url : GH + url, { method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': type, 'User-Agent': 'lexkite-ci' }, body: body && type === 'application/json' ? JSON.stringify(body) : body });
  if (!r.ok && r.status !== 404) throw new Error(`${method} ${url}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 404 ? null : r.status === 204 ? {} : r.json();
}
if (cmd === 'publish') {
  if (!process.env.GITHUB_TOKEN) { console.error('✗ thiếu GITHUB_TOKEN'); process.exit(1); }
  const dirs = fs.readdirSync(W).filter(x => fs.existsSync(`${W}/${x}/meta.json`));
  for (const id of dirs) {
    const d = `${W}/${id}`, meta = readJSON(`${d}/meta.json`), tag = 'wv-' + id;
    const files = fs.readdirSync(d).filter(f => /\.(mp4|webp|vtt)$/.test(f)).map(f => { const b = fs.readFileSync(`${d}/${f}`), ext = f.split('.').pop(); return { f, b, name: `${f.replace(/\.[a-z0-9]+$/, '')}-${sha(b, 8)}.${ext}`, type: { mp4: 'video/mp4', webp: 'image/webp', vtt: 'text/vtt' }[ext] }; });
    let rel = await gh('GET', `/releases/tags/${tag}`);
    if (!rel) rel = await gh('POST', '/releases', { tag_name: tag, target_commitish: process.env.GITHUB_SHA || 'main', name: `Web video ${id}`, body: 'Bản web của short bản tin (scripts/video/web-rendition.mjs) – phục vụ qua https://media.lexkite.com/video/. Không phải bản phát hành app.', prerelease: true });
    const assets = await gh('GET', `/releases/${rel.id}/assets?per_page=100`) || [], names = new Set(assets.map(a => a.name));
    for (const x of files) if (!names.has(x.name)) await gh('POST', rel.upload_url.replace(/\{.*$/, '') + '?name=' + encodeURIComponent(x.name), x.b, x.type);
    const keep = new Set(files.map(x => x.name));
    for (const a of assets) if (!keep.has(a.name)) await gh('DELETE', `/releases/assets/${a.id}`);
    const url = n => CDN + id + '/' + n, by = p => files.find(x => x.f === p);
    meta.src = url(by('v.mp4').name); meta.poster = url(by('p.webp').name);
    meta.vtt = Object.fromEntries(files.filter(x => x.f.endsWith('.vtt')).map(x => [x.f.replace('.vtt', ''), url(x.name)]).sort((a, b) => LANGS.indexOf(a[0]) - LANGS.indexOf(b[0])));
    fs.writeFileSync(`${d}/meta.json`, JSON.stringify(meta, null, 1));
    console.log(`✓ release ${tag}: ${files.length} file`);
  }
}

// ---------- manifest ----------
if (cmd === 'manifest') {
  const el = new Set(pick().map(x => x.lesson)), man = readJSON(MANIFEST, { items: [] }), by = Object.fromEntries((man.items || []).map(x => [x.id, x]));
  for (const id of fs.existsSync(W) ? fs.readdirSync(W) : []) { const m = readJSON(`${W}/${id}/meta.json`); if (m && m.src) by[id] = m; }
  const items = Object.values(by).filter(x => el.has(x.id)).sort((a, b) => (a.test - b.test) || String(b.created).localeCompare(String(a.created)));
  const out = { version: 1, updated: new Date().toISOString().slice(0, 19) + 'Z', items };
  const err = validateManifest(out); if (err.length) { console.error('✗ manifest:\n' + err.join('\n')); process.exit(1); }
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 1) + '\n');
  for (const f of fs.existsSync(CAPTIONS_DIR) ? fs.readdirSync(CAPTIONS_DIR) : []) if (!el.has(f.replace(/\.json$/, ''))) fs.rmSync(`${CAPTIONS_DIR}/${f}`);   // clip bị gỡ duyệt → bỏ trang
  console.log(`✓ ${MANIFEST}: ${items.length} clip (${items.filter(x => x.test).length} mẫu thử)`);
  const todo = new Set((readJSON(`${W}/plan.json`, {}).todo) || []);   // chỉ báo IndexNow trang mới/đổi, không báo mẫu thử
  fs.writeFileSync(`${W}/new-urls.txt`, items.filter(x => !x.test && todo.has(x.id)).flatMap(x => LANGS.map(l => `https://lexkite.com${l === 'en' ? '' : '/' + l}/video/${x.slug}/`)).join('\n') + '\n');
}
