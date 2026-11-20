#!/usr/bin/env node
// Video nhúng bài học từ kho Teach2D (docs/specs/media-one-source.md §2a) – CHỈ chạy trên CI (.github/workflows/embed-publish.yml). $0, không Kling.
//   plan <art> [N]  : art = thư mục artifact `tv-<tập>-wide-*` (teach-video.yml) → .embedpub/<id>/{wide.mp4,wide.poster.jpg,wide.en.vtt,ep.json,qc.json}
//                     chỉ tập đã bank (bank.json state=banked, short+wide ≥ 90), wide 1920×1080 H.264 ≤ 8 MB, chưa có trong videos.json
//   publish         : Release `wv-<id>` (GITHUB_TOKEN) – phục vụ qua media.lexkite.com/video/<id>/<tên-băm>
//   verify          : mọi src/poster/vtt phải 200 + CORS (verifyAssets); chưa phục vụ → hoãn mục sang lượt sau
//   manifest        : gộp vào web/data/videos.json embeds[] (validateEmbeds) + content/video/web/coverage.json
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { readJSON, sha, CDN, MANIFEST, verifyAssets } from '../lib/video-web.mjs';
import { embedEntry, idOf, mergeEmbeds, coverage } from '../lib/embed-publish.mjs';

const [cmd, ART = 'art', N = '60'] = process.argv.slice(2), W = '.embedpub', EPS = 'content/video/teach2d/eps', COV = 'content/video/web/coverage.json';
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', GH = 'https://api.github.com/repos/' + REPO;
fs.mkdirSync(W, { recursive: true });
const probe = f => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name:format=duration', '-of', 'json', f]));
const gh = async (method, url, body, type = 'application/json') => {
  const r = await fetch(url.startsWith('http') ? url : GH + url, { method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': type, 'User-Agent': 'lexkite-ci' }, body: body && type === 'application/json' ? JSON.stringify(body) : body });
  if (!r.ok && r.status !== 404) throw new Error(`${method} ${url}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 404 ? null : r.status === 204 ? {} : r.json();
};

if (cmd === 'plan') {
  const bank = readJSON('content/video/teach2d/bank.json', { eps: {} }).eps, have = new Set((readJSON(MANIFEST, {}).embeds || []).map(e => e.id)), seenWords = new Set();
  let n = 0;
  for (const d of fs.existsSync(ART) ? fs.readdirSync(ART).sort() : []) {
    const m = d.match(/^tv-(.+)-wide-/); if (!m || n >= +N) continue;
    const ep = m[1], dir = path.join(ART, d), id = idOf(ep), b = bank[ep];
    const ok = (ok, why) => { if (!ok) console.log(`· bỏ ${ep}: ${why}`); return ok; };
    if (!ok(b && b.state === 'banked' && (b.score.short >= 90 && b.score.wide >= 90), 'chưa bank / < 90') || !ok(!have.has(id), 'đã có')) continue;
    const mp4 = path.join(dir, `${ep}-wide.mp4`), poster = path.join(dir, `${ep}-wide.poster.jpg`), vtt = fs.readdirSync(dir).find(f => f.endsWith('.vtt')), qc = readJSON(path.join(dir, 'qc.json')), epj = readJSON(`${EPS}/${ep}.json`);
    if (!ok(fs.existsSync(mp4) && fs.existsSync(poster) && vtt && qc && epj, 'thiếu mp4/poster/vtt/qc/ep')) continue;
    const p = probe(mp4), s = p.streams[0];
    if (!ok(s.width === 1920 && s.height === 1080 && s.codec_name === 'h264', `định dạng ${s.width}×${s.height} ${s.codec_name}`) || !ok(fs.statSync(mp4).size <= 8e6, '> 8 MB') || !ok(qc.ok && qc.score >= 90, 'qc')) continue;
    const o = path.join(W, id); fs.mkdirSync(o, { recursive: true });
    fs.copyFileSync(mp4, `${o}/wide.mp4`); fs.copyFileSync(poster, `${o}/wide.poster.jpg`); fs.copyFileSync(path.join(dir, vtt), `${o}/wide.en.vtt`);
    fs.writeFileSync(`${o}/meta.json`, JSON.stringify({ ep: epj, qc: { score: qc.score }, duration: +p.format.duration }, null, 1)); n++;
  }
  console.log(`✓ plan: ${n} tập sẵn sàng`); if (!n) process.exitCode = 0;
}

if (cmd === 'publish') {
  if (!process.env.GITHUB_TOKEN) { console.error('✗ thiếu GITHUB_TOKEN'); process.exit(1); }
  const T = { mp4: 'video/mp4', jpg: 'image/jpeg', vtt: 'text/vtt' };
  for (const id of fs.existsSync(W) ? fs.readdirSync(W).filter(x => fs.existsSync(`${W}/${x}/meta.json`)) : []) {
    const d = `${W}/${id}`, meta = readJSON(`${d}/meta.json`), tag = 'wv-' + id, names = {};
    const files = [['wide.mp4', 'mp4'], ['wide.poster.jpg', 'poster'], ['wide.en.vtt', 'vtt']].map(([f, k]) => { const b = fs.readFileSync(`${d}/${f}`), ext = f.split('.').pop(); return { f, k, b, ext, name: `${f.replace(/\.[a-z0-9]+$/, '')}-${sha(b, 8)}.${ext}` }; });
    let rel = await gh('GET', `/releases/tags/${tag}`);
    if (!rel) rel = await gh('POST', '/releases', { tag_name: tag, target_commitish: process.env.GITHUB_SHA || 'main', name: `Lesson embed ${id}`, body: 'Video nhúng bài học từ kho Teach2D (scripts/video/embed-publish.mjs) – phục vụ qua https://media.lexkite.com/video/' + id + '/' });
    const have = new Set(((await gh('GET', `/releases/${rel.id}/assets?per_page=100`)) || []).map(a => a.name));
    for (const x of files) { if (!have.has(x.name)) await gh('POST', rel.upload_url.replace(/\{.*$/, '') + '?name=' + encodeURIComponent(x.name), x.b, T[x.ext]); names[x.k] = x.name; }
    fs.writeFileSync(`${d}/entry.json`, JSON.stringify(embedEntry(meta.ep, meta.qc, names, meta.duration), null, 1)); console.log(`✓ release ${tag}`);
  }
}

const entries = () => (fs.existsSync(W) ? fs.readdirSync(W) : []).map(id => readJSON(`${W}/${id}/entry.json`)).filter(Boolean);

if (cmd === 'verify') {
  const items = entries().flatMap(e => { const r = e.renditions.wide; return [{ id: e.id, src: r.src, poster: r.poster, vtt_en: r.vtt_en }]; });
  const { bad, down } = await verifyAssets(items);
  for (const d of down) { console.log(`::warning::CDN chưa phục vụ ${d.url} (HTTP ${d.status}) – hoãn ${d.id}`); fs.rmSync(`${W}/${d.id}/entry.json`, { force: true }); }
  if (bad.length) { console.error('✗ tài nguyên lỗi:\n' + bad.map(b => `  ${b.id} ${b.verdict} HTTP ${b.status} ${b.url}`).join('\n')); process.exit(1); }
  console.log(`✓ verify: ${entries().length} embed đủ 200 + CORS`);
}

if (cmd === 'manifest') {
  const man = readJSON(MANIFEST, { version: 1, items: [] }), { embeds, errors } = mergeEmbeds(man.embeds, entries());
  if (errors.length) { console.error('✗ embeds:\n' + errors.join('\n')); process.exit(1); }
  const out = { ...man, updated: new Date().toISOString().slice(0, 19) + 'Z', embeds }; fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 1) + '\n');
  const lessons = readJSON('content/video/web/lesson-words.json', null), c = readJSON(COV, { history: [] });
  const cov = { at: out.updated.slice(0, 10), embeds: embeds.filter(e => !e.test).length, keywords: new Set(embeds.flatMap(e => e.words)).size, ...(lessons ? coverage(lessons, embeds) : {}) };
  fs.writeFileSync(COV, JSON.stringify({ ...c, latest: cov, history: [...(c.history || []).filter(h => h.at !== cov.at), cov].slice(-60) }, null, 1) + '\n');
  console.log(`✓ ${MANIFEST}: ${embeds.length} embed (${cov.embeds} thật)${lessons ? `, phủ ${cov.pct}%` : ''}`);
}
