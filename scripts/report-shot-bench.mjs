#!/usr/bin/env node
// Đo trần ảnh chụp báo lỗi (docs/REPORTS.md § Ảnh chụp) – CHỈ chạy trên CI (workflow report-shots.yml): Playwright + tesseract.js.
// Mẫu: ảnh chụp thật của lexkite.com (điện thoại 390×844 @3x, máy tính 1440×900 @2x, vài trang) + ảnh cửa hàng store/chrome/screenshots.
// Mỗi mẫu nén bằng ĐÚNG hàm shrink() của web/js/report.js với trần cũ (1600 px / 300 KB) và trần thử (1280 px / 150 KB),
// OCR (eng+vie) ảnh gốc → bộ từ chuẩn; độ đọc = tỉ lệ từ chuẩn (≥ 3 ký tự) OCR lại được trên ảnh nén.
// Đạt khi MỌI mẫu: thử ≥ 0,95 × cũ VÀ trung bình thử ≥ 0,98 × cũ → in "verdict: lower" (hạ trần); không thì "verdict: keep". Ghi out/shot-bench.json + bảng tóm tắt.
import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('playwright');
const { createWorker } = await import('tesseract.js');
const OUT = 'out', SITE = process.env.BENCH_SITE || 'https://lexkite.com';
const CAND = { px: +(process.env.CAND_PX || 1280), kb: +(process.env.CAND_KB || 150) }, CUR = { px: 1600, kb: 300 };
const PAGES = ['/app/#/home', '/app/#/dict/record', '/app/#/review', '/blog/'];
fs.mkdirSync(OUT, { recursive: true });
const br = await chromium.launch(), samples = [];
for (const [name, vp, dpr] of [['phone', { width: 390, height: 844 }, 3], ['desktop', { width: 1440, height: 900 }, 2]]) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: dpr, locale: 'en-US' }), pg = await ctx.newPage();
  for (const u of PAGES) { try { await pg.goto(SITE + u, { waitUntil: 'networkidle', timeout: 30e3 }); await pg.waitForTimeout(1500); samples.push({ id: name + u.replace(/[^\w]+/g, '_'), png: await pg.screenshot() }); } catch (e) { console.log('bỏ mẫu', name, u, e.message); } }
  await ctx.close();
}
for (const f of fs.readdirSync('store/chrome/screenshots').filter(f => /^(en|vi)-[1-3]\.png$/.test(f))) samples.push({ id: 'store_' + f, png: fs.readFileSync(path.join('store/chrome/screenshots', f)) });
if (samples.length < 6) { console.error('✗ quá ít mẫu: ' + samples.length); process.exit(1); }
// Nén trong trình duyệt bằng shrink() thật
const pg = await (await br.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
await pg.addScriptTag({ content: fs.readFileSync('web/js/report.js', 'utf8') });
const shrinkIn = (png, px, kb) => pg.evaluate(async ([b64, px, kb]) => { const r = await fetch('data:image/png;base64,' + b64); const f = new File([await r.blob()], 's.png', { type: 'image/png' }); return window.LexReport._t.shrink(f, px, kb * 1024); }, [png.toString('base64'), px, kb]);
const ocr = await createWorker(['eng', 'vie']);
const words = async buf => new Set(((await ocr.recognize(buf)).data.text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []));
const rows = [];
for (const s of samples) {
  const ref = await words(s.png); if (ref.size < 15) { console.log('bỏ mẫu ít chữ', s.id, ref.size); continue; }
  const r = { id: s.id, refWords: ref.size };
  for (const [k, c] of [['cur', CUR], ['cand', CAND]]) {
    const du = await shrinkIn(s.png, c.px, c.kb), buf = Buffer.from(du.slice(du.indexOf(',') + 1), 'base64'), got = await words(buf);
    r[k] = { kb: Math.round(buf.length / 1024), recall: Math.round([...ref].filter(w => got.has(w)).length / ref.size * 1000) / 1000 };
  }
  r.ratio = Math.round(r.cand.recall / Math.max(0.001, r.cur.recall) * 1000) / 1000; rows.push(r);
  console.log(`${s.id}: ${r.refWords} từ · cũ ${r.cur.kb} KB ${r.cur.recall} · thử ${r.cand.kb} KB ${r.cand.recall} · tỉ lệ ${r.ratio}`);
}
await ocr.terminate(); await br.close();
const mean = rows.reduce((a, r) => a + r.ratio, 0) / Math.max(1, rows.length), worst = Math.min(...rows.map(r => r.ratio));
const verdict = rows.length >= 6 && worst >= 0.95 && mean >= 0.98 ? 'lower' : 'keep';
const res = { at: new Date().toISOString(), cand: CAND, cur: CUR, n: rows.length, mean: Math.round(mean * 1000) / 1000, worst, verdict, rows };
fs.writeFileSync(path.join(OUT, 'shot-bench.json'), JSON.stringify(res, null, 1));
const md = `### Trần ảnh báo lỗi: ${verdict === 'lower' ? `✅ hạ được xuống ${CAND.px} px / ${CAND.kb} KB` : `⛔ giữ ${CUR.px} px / ${CUR.kb} KB`}\nmẫu ${rows.length} · tỉ lệ đọc được (thử/cũ) trung bình ${res.mean}, thấp nhất ${worst} (ngưỡng ≥ 0,98 / ≥ 0,95)\n\n| mẫu | từ | cũ KB | cũ | thử KB | thử |\n|---|---|---|---|---|---|\n` + rows.map(r => `| ${r.id} | ${r.refWords} | ${r.cur.kb} | ${r.cur.recall} | ${r.cand.kb} | ${r.cand.recall} |`).join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log('verdict: ' + verdict);
