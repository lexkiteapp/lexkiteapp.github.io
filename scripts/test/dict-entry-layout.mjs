// 📖 Gác bố cục thẻ kết quả tra từ (#/dict/<từ>, web/js/dict-page.js): Chromium thật, dữ liệu mẫu cho MỌI trạng thái (có ảnh · chưa có ảnh · ảnh ẩn ở chế độ tối ·
// ảnh lỗi · không câu ví dụ · nhiều nghĩa/nhiều câu · từ dài · đã lưu · chưa đăng nhập), 390–1440 px, sáng/tối, vi/en/ar.
// FAIL khi: cột rỗng / câu lạc lõng (.vimg-ex) · ví dụ ngoài cột nội dung, căn giữa, thiếu loa/tô từ, lặp câu · nút hành động lệch cỡ/thứ tự · tràn ngang · tương phản < 4,5:1 · emoji ở mặt thẻ · ảnh sai từ#loại.
// Dùng: node scripts/test/dict-entry-layout.mjs <web-sau> [web-trước] [out=out/dict-entry]   (CI: .github/workflows/ux-cards.yml, job shots). Có web-trước → thêm ảnh + tờ trước/sau.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { githubCandidates } from '../media/origin.mjs';
import { noProd } from './lib/no-prod.mjs';
if (!process.env.CI) { console.error('dict-entry-layout: chỉ chạy trên CI (Chromium) – workflow UX cards'); process.exit(2); }
const [AFTER = 'web', BEFORE, OUT = 'out/dict-entry'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };

// Khóa ảnh thật của một từ#loại: đúng thuật toán mảnh ở web/js/vocab-img.js (SH)
const HEAD = JSON.parse(fs.readFileSync(path.join(AFTER, 'js/lexicon-img.json'), 'utf8'));
const SH = (w, n) => { let h = 0x811c9dc5; for (const ch of String(w).toLowerCase()) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h % n; };
const shard = w => JSON.parse(fs.readFileSync(path.join(AFTER, `js/vimg/${String(SH(w, HEAD.n)).padStart(2, '0')}.json`), 'utf8'));
const hashOf = (w, pos) => shard(w).m?.[`${w}#${pos}`] || '';
// Từ dài nhất có ảnh thật (không chữ, qua cổng TEXT_OBJ của kho ảnh) – kiểm ô ảnh cạnh từ dài trên điện thoại
let longest = '';
for (const f of fs.readdirSync(path.join(AFTER, 'js/vimg'))) for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(AFTER, 'js/vimg', f), 'utf8')).m || {})) { const [w, pos] = k.split('#'); if (pos === 'n' && /^[a-z]+$/.test(w) && w.length > longest.length) longest = w; }
if (!longest) { console.error('✗ kho ảnh rỗng – không có gì để kiểm'); process.exit(1); }

// Từ ‘chưa có ảnh’ của các ca _none: kho ảnh lớn dần (lượt fill) nên 'resilient' có thể đã có ảnh → dùng từ giả chắc chắn không có khóa ảnh
const NOIMG = hashOf('resilient', 'adj') ? 'zzresilient' : 'resilient';
const base = o => ({ found: true, pos: 'adj', level: 'B2', ipa: '/kəmˈpʌlsəri/', ipaUS: '/kəmˈpʌlsəri/', vi: 'bắt buộc', def: 'required by law or a rule; obligatory', col: [], syn: [], senses: [], oxford: [], meanings: [], sentences: [], ...o });
const EX = 'In my country, education is compulsory until the age of fifteen.';
const CASES = {
  // có ảnh cảnh thật (đúng cảnh màn chủ gửi): sáng hiện ô ảnh, tối ảnh ẩn → không để cột/câu lạc lõng
  scene: base({ word: 'compulsory', ex: EX, oxford: [{ pos: 'adjective', defs: [{ def: 'required by law or a rule; obligatory', ex: EX }, { def: 'involving or exerting pressure', ex: 'She had a compulsory stop.' }] }], sentences: [{ en: EX, vi: 'Ở nước tôi, giáo dục là bắt buộc đến năm 15 tuổi.', auto: true }, { en: 'Attendance is compulsory for all students.', vi: 'Mọi học sinh phải tham dự.' }], _hash: hashOf('compulsory', 'adj') }),
  // chưa có ảnh: chữ dùng hết bề ngang
  noimg: base({ word: NOIMG, vi: 'kiên cường', ex: 'The local economy proved remarkably resilient.', _none: true }),
  // không câu ví dụ, không ảnh
  noex: base({ word: NOIMG, vi: 'kiên cường', ex: '', _none: true }),
  // nhiều nghĩa + nhiều câu, ảnh vật thật
  many: base({ word: 'consider', pos: 'v', ipa: '/kənˈsɪdə/', ipaUS: '/kənˈsɪdər/', vi: 'xem xét', def: 'think carefully about something', ex: 'We are considering moving.', oxford: [{ pos: 'verb', defs: [1, 2, 3, 4].map(i => ({ def: `sense ${i} of the verb`, ex: `Example ${i} of consider.` })) }], meanings: [{ pos: 'verb', defs: [{ def: 'to think', ex: 'We are considering moving.' }] }], sentences: [1, 2, 3].map(i => ({ en: `We consider plan ${i}.`, vi: `Chúng tôi xem xét kế hoạch ${i}.` })), _hash: hashOf('consider', 'v') }),
  // từ dài nhất có ảnh: không tràn/không bóp ô ảnh
  long: base({ word: longest, pos: 'n', vi: 'nghĩa', def: 'a long dictionary word', ex: `This sentence uses ${longest} once.`, _hash: hashOf(longest, 'n') }),
  // chữ siêu dài, không ảnh
  longnoimg: base({ word: 'pneumonoultramicroscopicsilicovolcanoconiosis', pos: 'n', ex: 'A very pneumonoultramicroscopicsilicovolcanoconiosis example.', _none: true }),
  // ảnh lỗi CDN → ô gỡ, không để hộp rỗng
  broken: base({ word: 'apple', pos: 'n', vi: 'quả táo', def: 'a round fruit', ex: 'I ate an apple.', _broken: true }),
  // đã trong flashcard: chip cùng cỡ với nút
  saved: base({ word: NOIMG, vi: 'kiên cường', ex: 'She is resilient.', _saved: true, _none: true }),
};
const VIEWS = [390, 768, 1024, 1440];
const LANG_MATRIX = [['vi', VIEWS], ['en', [390, 1440]], ['ar', [390, 1440]]];
const SHOT = new Set(['scene', 'noimg', 'noex', 'many']); // ảnh trước/sau

const page1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'); // ảnh 1 px dự phòng khi kho công khai không có tệp
const browser = await chromium.launch();
const bad = []; let checks = 0;
async function run(TAG, ROOT, vw, scheme, lang) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, colorScheme: scheme, serviceWorkers: 'block', isMobile: vw < 600, hasTouch: vw < 600, deviceScaleFactor: vw < 600 ? 2 : 1 });
  await noProd(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.vimg', '1'); } catch (e) { /* bỏ qua */ } });
  let broken = '';
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (/media\.lexkite\.com$/.test(u.hostname) && /\/vimg\//.test(u.pathname)) {
      if (broken && r.request().resourceType() === 'image') return r.abort();
      for (const g of githubCandidates(u.href)) { try { const x = await r.fetch({ url: g, maxRedirects: 5 }); if (x.ok()) return r.fulfill({ status: 200, contentType: /avif$/.test(u.pathname) ? 'image/avif' : 'image/webp', headers: { 'access-control-allow-origin': '*' }, body: await x.body() }); } catch (e) { /* thử nguồn kế */ } }
      return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: page1 });
    }
    if (u.hostname !== 'lk.test') return r.abort();
    let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 503, json: { error: 'ci_offline' } });
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const page = await ctx.newPage();
  const tagOf = c => `${TAG}-${vw}-${scheme}-${lang}-${c}`;
  page.on('pageerror', e => { if (TAG === 'after') bad.push(`${vw}/${scheme}/${lang}: JS ${e.message}`); });
  await page.goto(`https://lk.test/app/?sandbox=1&hl=${lang}#/dict`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Dict && window.App && App.state, null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#searchForm'), null, { timeout: 30000 }).catch(() => {});
  for (const [name, entry] of Object.entries(CASES)) {
    if (TAG === 'before' && !(SHOT.has(name) && (vw === 390 || vw === 1440) && lang === 'vi')) continue;
    if (TAG === 'after') checks++;
    broken = entry._broken ? '1' : '';
    await page.evaluate(({ e }) => {
      const hit = async () => JSON.parse(JSON.stringify(e));
      Dict.quick = hit; Dict.lookup = hit;
      if (e._saved) App.state.cards[e.word] = { word: e.word, contexts: [], srs: { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now() } }; else delete App.state.cards[e.word];
      location.hash = `#/dict/x-${Math.random().toString(36).slice(2)}`; // đổi hash để route vẽ lại
    }, { e: entry });
    await page.waitForTimeout(50);
    await page.evaluate(w => { location.hash = `#/dict/${encodeURIComponent(w)}`; }, entry.word);
    await page.waitForFunction(w => { const el = document.querySelector('#result .entry-word'), f = document.querySelector('#saveCard'); return el && el.textContent.trim() === w && f; }, entry.word, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('load'); await page.waitForTimeout(entry._broken ? 700 : 350);
    if (SHOT.has(name) && (vw === 390 || vw === 1440) && lang === 'vi') {
      const card = page.locator('#result > .card').first();
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.screenshot({ path: path.join(OUT, `${tagOf(name)}.jpg`), type: 'jpeg', quality: 78 }).catch(() => {});
    }
    if (TAG !== 'after') continue;
    const issues = await page.evaluate(({ e, EXPECT }) => {
      const out = [], $ = s => document.querySelector(s), head = $('#result .entry-head');
      if (!head) return ['không có .entry-head'];
      const rb = el => el.getBoundingClientRect(), h = rb(head), vis = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && rb(el).width > 0;
      if (document.documentElement.scrollWidth - innerWidth > 1) out.push(`tràn ngang ${document.documentElement.scrollWidth - innerWidth}px`);
      if (document.querySelector('#result .vimg-ex')) out.push('câu chú thích lạc lõng dưới ảnh (.vimg-ex) – câu phải ở khối Ví dụ');
      const media = head.querySelector(':scope > .vimg, :scope > .pic'), shown = vis(media);
      // không ảnh hoặc ảnh ẩn/lỗi → không cột rỗng: dòng tiêu đề + nghĩa chạm mép phải của thẻ
      const dir = document.dir === 'rtl', endOf = el => (dir ? h.right - rb(el).left : rb(el).right - h.left);
      const meanEl = head.querySelector('.entry-mean');
      if (meanEl && !shown && Math.abs(endOf(meanEl) - h.width) > 1) out.push(`nghĩa không dùng hết bề ngang khi không có ảnh (${Math.round(endOf(meanEl))}/${Math.round(h.width)})`);
      if (e._none && media) out.push('từ không có ảnh mà vẫn dựng ô ảnh');
      if (media && !media.matches('.vimg, .pic')) out.push('ô ảnh lạ');
      if (e._broken && vis(media)) out.push('ảnh lỗi vẫn để hộp hiện'); // ảnh nền sáng ở tối đã display:none → lazy không tải, không có sự kiện lỗi; điều cần giữ là KHÔNG còn hộp nhìn thấy
      if (shown) {
        const m = rb(media);
        if (m.width !== 160 || m.height !== 160) out.push(`ô ảnh ${Math.round(m.width)}×${Math.round(m.height)}`);
        for (const c of [head.querySelector('.entry-title')]) { const r = rb(c); if (r.right > m.left + 1 && r.left < m.right - 1 && r.bottom > m.top && r.top < m.bottom) out.push('ô ảnh đè tiêu đề'); }
      }
      if (EXPECT && media && media.matches('.vimg')) { const src = media.querySelector('img').getAttribute('src') || ''; if (!src.includes(EXPECT)) out.push(`ảnh sai từ#loại: ${src}`); if (!(media.querySelector('img').alt || '').startsWith(e.word)) out.push('alt ảnh không theo từ'); }
      // ví dụ: trong cột nội dung, có dấu hiệu, căn trái, tô từ, có loa – câu chỉ xuất hiện MỘT lần trên trang
      const box = head.querySelector('.entry-ex');
      if (e.ex) {
        if (!box) out.push('thiếu khối Ví dụ'); else {
          const cs = getComputedStyle(box), tx = box.querySelector('[lang="en"]');
          if (Math.abs(rb(box).left - h.left) > 1 || Math.abs(rb(box).right - h.right) > 1) out.push('khối Ví dụ không chiếm hết bề ngang nội dung');
          if (!meanEl || rb(box).top < rb(meanEl).bottom - 1) out.push('khối Ví dụ không nằm dưới nghĩa');
          if (['center', 'right'].includes(getComputedStyle(tx).textAlign)) out.push(`câu căn ${getComputedStyle(tx).textAlign}`);
          if (!box.querySelector('.set-h')) out.push('thiếu nhãn Ví dụ');
          if (!tx.querySelector('mark') && e.ex.toLowerCase().includes(e.word.toLowerCase())) out.push('không tô từ đang tra');
          if (!box.querySelector('[data-speak-text]')) out.push('thiếu loa'); else if (box.querySelector('[data-speak-text]').dataset.speakText !== e.ex) out.push('loa đọc câu khác');
          if (cs.textAlign === 'center') out.push('khối căn giữa');
          const tr = (e.sentences || []).find(s => s.en === e.ex); if (tr && !box.textContent.includes(tr.vi)) out.push('có bản dịch mà không hiện');
        }
        const norm = s => s.replace(/\s+/g, ' ').trim(), n = norm(document.querySelector('#result').textContent).split(norm(e.ex)).length - 1;
        if (n !== 1) out.push(`câu ví dụ lặp ${n} lần`);
      } else if (box) out.push('không có câu mà vẫn dựng khối Ví dụ');
      // hành động: thứ tự + cùng cỡ
      const acts = [...head.querySelectorAll('.entry-actions > *')];
      if (acts.length < 2) out.push('thiếu nút hành động');
      else {
        if (!acts[0].matches(e._saved ? '.entry-saved' : '#quickSave')) out.push('nút đầu không phải Lưu/Đã lưu');
        if (!/practice\/speak/.test(acts[1].getAttribute('href') || '')) out.push('nút thứ 2 không phải Luyện phát âm');
        const top = rb(acts[0]).top, row = acts.filter(a => Math.abs(rb(a).top - top) < 2);
        if (new Set(row.map(a => Math.round(rb(a).height))).size > 1) out.push(`nút lệch cỡ ${row.map(a => Math.round(rb(a).height))}`);
        if (acts.some(a => rb(a).height < 44)) out.push('nút < 44 px');
      }
      // emoji ở mặt thẻ → icon Kit (trừ ô emoji từ vựng .pic)
      const pure = head.cloneNode(true); pure.querySelectorAll('.pic').forEach(x => x.remove()); if (/\p{Extended_Pictographic}/u.test(pure.textContent.replace(/[™©®]/g, ''))) out.push(`emoji ở mặt thẻ: ${pure.textContent.match(/\p{Extended_Pictographic}/u)[0]}`);
      // cắt/tràn chữ
      for (const el of head.querySelectorAll('.entry-word, .entry-mean, .entry-ex, .entry-actions, .pron')) if (el.scrollWidth - el.clientWidth > 1) out.push(`tràn trong ${el.className}`);
      // tương phản thân ≥ 4,5:1 trên nền thật (kể cả nền có alpha, color-mix)
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
      const rgba = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
      const bgOf = el => { const st = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) { st.push(c); if (c[3] === 1) break; } } return st.reverse().reduce((b, f) => over(f, b), [255, 255, 255]); };
      const L = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
      const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      for (const sel of ['.entry-word', '.entry-mean .vi', '.entry-mean [lang="en"]', '.entry-ex .set-h', '.entry-ex [lang="en"]', '.entry-ex .muted', '.entry-ex mark', '.entry-actions > *', '.pron b']) for (const el of head.querySelectorAll(sel)) {
        if (!vis(el) || getComputedStyle(el).backgroundImage !== 'none') continue; const bg = bgOf(el), c = rgba(getComputedStyle(el).color), fg = over(c, bg), r = ratio(fg, bg);
        if (r < 4.5) out.push(`tương phản ${sel} ${r.toFixed(2)}:1`);
      }
      return out;
    }, { e: entry, EXPECT: entry._hash || '' });
    for (const m of issues) bad.push(`${vw}/${scheme}/${lang}/${name}: ${m}`);
  }
  await ctx.close();
}
for (const [lang, views] of LANG_MATRIX) for (const vw of views) for (const scheme of ['light', 'dark']) {
  if (BEFORE) await run('before', BEFORE, vw, scheme, lang);
  await run('after', AFTER, vw, scheme, lang);
}
await browser.close();
if (checks < Object.keys(CASES).length * LANG_MATRIX.reduce((n, [, v]) => n + v.length * 2, 0)) bad.push(`chỉ kiểm ${checks} trạng thái – thiếu`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ checks, bad }, null, 1));
try { // tờ trước/sau: hàng trên TRƯỚC, hàng dưới SAU
  for (const vw of [390, 1440]) for (const scheme of ['light', 'dark']) {
    const files = ['before', 'after'].flatMap(T => [...SHOT].map(c => path.join(OUT, `${T}-${vw}-${scheme}-vi-${c}.jpg`))).filter(f => fs.existsSync(f));
    if (files.length) execFileSync('montage', [...files, '-tile', `${SHOT.size}x`, '-geometry', vw === 390 ? '390x+8+8' : '720x+8+8', '-background', '#777', '-quality', '80', path.join(OUT, `sheet-${vw}-${scheme}.jpg`)]);
  }
} catch (e) { console.log('montage bỏ qua:', e.message); }
console.log(bad.length ? `✗ dict-entry-layout: ${bad.length} lỗi / ${checks} trạng thái\n` + bad.slice(0, 60).join('\n') : `✓ dict-entry-layout: ${checks} trạng thái đạt`);
process.exit(bad.length ? 1 : 0);
