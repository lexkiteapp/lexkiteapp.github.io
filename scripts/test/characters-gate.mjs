// 👩‍🏫 Cổng "1 bộ nhân vật" (chủ 28/10, docs/CHARACTERS.md): đúng 2 giáo viên 2D Ama + Carlos, nguồn DUY NHẤT web/teach/characters.json + web/js/characters.js.
// 1) registry: đúng 2 người, helper khớp JSON, mọi tệp có thật + sha256 khớp, không tệp lạ trong web/teach/<who>/
// 2) không tệp nào ngoài danh sách được phép tham chiếu ảnh/clip nhân vật (teach/…, img/teach, img/call, cine/teachers, sprite cũ, poster.jpg…)
//    hay tệp ảnh/clip của nhân vật khác (Mia/Jake/Leo/Diane/Daniel/Mei/Kai/Ruth/Priya) ở mọi bề mặt sản phẩm
// 3) mẫu social/end card + video lấy nhân vật từ registry; không còn tệp nhân vật cũ trong web/
// Dùng: node scripts/test/characters-gate.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const errs = [], R = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')), IDS = Object.keys(R.people);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// ---------- 1) registry ----------
if (IDS.join() !== 'ama,carlos') errs.push(`registry phải đúng 2 người ama,carlos – đang: ${IDS}`);
const g = {}; new Function('self', fs.readFileSync('web/js/characters.js', 'utf8'))(g); const C = g.Chars;
if (C.ids.join() !== IDS.join()) errs.push(`Chars.ids ${C.ids} ≠ characters.json ${IDS}`);
for (const who of IDS) if (C.voice(who) !== ((R.people[who].voice || {}).app)) errs.push(`Chars.voice(${who}) ${C.voice(who)} ≠ characters.json voice.app ${(R.people[who].voice || {}).app}`);
if (C.poses.join() !== R.poses.join()) errs.push(`Chars.poses ≠ characters.json poses`);
const want = new Set();
for (const who of IDS) {
  want.add(`${who}/poster.webp`).add(`${who}/avatar.webp`).add(`${who}/poster-2x.webp`).add(`${who}/avatar-2x.webp`);
  for (const p of R.poses) {
    const c = R.people[who].clips[p]; if (!c) { errs.push(`${who}: thiếu tư thế ${p}`); continue; }
    const pend = C.clip(who, p) !== `teach/${who}/${p}.mp4`;
    if (!!c.pending !== pend) errs.push(`${who}/${p}: pending trong JSON (${!!c.pending}) ≠ Chars (${pend})`);
    if (!c.pending) { want.add(`${who}/${p}.mp4`).add(`${who}/still-${p}.webp`); want.add(`${who}/${p}-hd.mp4`); }
  }
}
for (const f of want) {
  const p = `web/teach/${f}`, h = R.files[f];
  if (!fs.existsSync(p)) errs.push(`thiếu ${p} (chạy CI teach-build)`); else if (!h || h.sha256 !== sha(p)) errs.push(`${p}: sha256 không khớp characters.json (chỉ CI teach-build được dựng tệp này)`);
}
for (const who of IDS) for (const f of fs.readdirSync(`web/teach/${who}`)) if (!want.has(`${who}/${f}`)) errs.push(`tệp lạ web/teach/${who}/${f} – không thuộc registry`);
for (const d of fs.readdirSync('web/teach')) if (!IDS.includes(d) && d !== 'characters.json') errs.push(`thư mục/tệp lạ web/teach/${d}`);

// ---------- 2) tham chiếu ngoài registry ----------
const REF = /(?<![\w-])(?:teach\/(?:ama|carlos|\$\{)|img\/teach\/|img\/call\/|cine\/teachers|teachers3d|sprite\.json|mouths\.webp|(?:teach|chars)\/[\w-]*poster\.jpe?g|brand\/characters\/(?!_candidates\/rooms\/))/g;
const OTHER = /(?<![a-z])(?:mia|jake|leo|diane|daniel|mei|kai|ruth|priya)[\w-]*\.(?:png|jpe?g|webp|avif|gif|mp4|webm|mov)\b/gi;
const ALLOW = new Set(['web/js/characters.js', 'scripts/teach/build.py', 'scripts/teach/sheet.py', 'scripts/build-extension.sh', 'scripts/test/characters-gate.mjs', 'scripts/test/characters-shots.mjs']);
const WAIVE = {}; // miễn trừ tạm (có hạn): { 'tệp': [regex, 'PR thay'] } – hết tham chiếu → cổng đỏ "miễn trừ cũ" → xoá mục. Call (Mia) đã xong #194: KHÔNG thêm lại.
const ROOTS = ['web', 'extension', 'functions', 'workers', 'store', 'mobile/www', 'brand/social/templates/templates.json', 'scripts/build-social-templates.mjs', 'scripts/build-social-kit.mjs', 'scripts/video/render.mjs', 'scripts/video/tpl/tokens.py'];
const SKIP = /(^|\/)(node_modules|\.git|archive|i18n|data|lib|packs|dict|blog|audio)(\/|$)|\.min\.js$/;
const walk = p => !fs.existsSync(p) ? [] : fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap(f => SKIP.test(f) ? [] : walk(path.join(p, f))) : [p];
const used = {};
for (const f of ROOTS.flatMap(walk)) {
  if (!/\.(m?js|html|css|json|ts|tsx|py|sh|svg|xml|webmanifest)$/.test(f) || f.startsWith('web/teach/') || ALLOW.has(f)) continue;
  const s = fs.readFileSync(f, 'utf8'); if (s.length > 4e6) continue;
  for (const m of [...s.matchAll(REF), ...s.matchAll(OTHER)]) {
    const w = WAIVE[f]; if (w && w[0].test(m[0])) { used[f] = 1; continue; }
    errs.push(`${f}: "${m[0]}" – ảnh/clip nhân vật chỉ được lấy qua Chars (web/js/characters.js) / registry`);
  }
  // tên nhân vật cũ trên giao diện: chuỗi t('…') ở mọi tệp, mọi chữ ở màn Call (call.js, call/*.js) – Mia… chỉ còn được là tên người trong bài đọc/hội thoại nội dung
  for (const m of s.matchAll(/\bt\(\s*['"`][^'"`]*\b(Mia|Jake|Leo|Diane|Daniel|Mei|Kai|Ruth|Priya)\b/g)) errs.push(`${f}: chuỗi giao diện nhắc "${m[1]}" – giáo viên chỉ Ama/Carlos (Chars.name)`);
  if (/(^|\/)call(\.js|\/)/.test(f)) for (const m of s.matchAll(/\b(Mia|Jake|Leo|Diane|Mei|Kai|Ruth|Priya)\b/g)) errs.push(`${f}: màn Call nhắc "${m[1]}" – chỉ Ama/Carlos`);
}
for (const f of Object.keys(WAIVE)) if (!used[f]) errs.push(`miễn trừ cũ: ${f} đã hết ${WAIVE[f][0]} → xoá mục WAIVE trong characters-gate.mjs`);
else console.log(`⚠ miễn trừ tạm: ${f} còn ${WAIVE[f][0]} – ${WAIVE[f][1]}`);

// ---------- 3) tệp nhân vật cũ + mẫu social + video ----------
if (fs.existsSync('web/img/teach')) errs.push('còn ảnh giáo viên 3D cũ web/img/teach/');
const T = JSON.parse(fs.readFileSync('brand/social/templates/templates.json', 'utf8'));
const tc = Object.keys(T.characters); if (tc.join() !== IDS.join()) errs.push(`brand/social/templates/templates.json characters ${tc} ≠ registry`);
for (const m of JSON.stringify(T).matchAll(/"char":"(\w+)"/g)) if (!IDS.includes(m[1])) errs.push(`templates.json dùng nhân vật ngoài registry: ${m[1]}`);
for (const f of fs.readdirSync('brand/social/templates/assets/chars')) if (!IDS.some(i => f.startsWith(i + '-'))) errs.push(`brand/social/templates/assets/chars/${f}: nhân vật ngoài registry`);
for (const d of ['brand/social/templates/svg', 'brand/social/templates/png']) for (const f of fs.readdirSync(d)) { const m = f.match(/^lower-third-(\w+)-/); if (m && m[1] !== 'kit' && !IDS.includes(m[1])) errs.push(`${d}/${f}: nhân vật ngoài registry`); }
// ---------- 4) video: kho dựng, dàn, kịch bản, spec news – CHỈ registry (chủ 28/10; hết miễn trừ LIB_WAIVE → lỗi cứng) ----------
const WHO = new Set([...IDS, 'kit']), J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
// kho tài nguyên: ảnh/clip nhân vật cũ (kiểu minh hoạ, Mia/Leo/Diane, Ama/Carlos cũ) phải ở trạng thái retired – không bao giờ vào render
for (const i of J('content/video/library.json').items) if ((i.kind === 'char' || i.kind === 'clip' || (i.who && !IDS.includes(i.who))) && i.status !== 'retired')
  errs.push(`content/video/library.json: ${i.id || i.file} (${i.kind}/${i.who}) status ${i.status} – nhân vật kho cũ phải retired; diễn viên = clip registry (brand/library/manifest.json build:"registry")`);
// danh mục dựng: chỉ clip build:"registry" của Ama/Carlos, src = đúng clip phông xanh nguồn của tư thế trong characters.json; không ảnh tĩnh nhân vật
const RM = J('brand/library/manifest.json');
for (const c of RM.clips || []) {
  const sp = R.people[c.who] && R.people[c.who].clips[c.pose];
  if (c.build !== 'registry' || !sp || sp.src !== c.src || !c.medium) errs.push(`brand/library/manifest.json clip ${c.id}: chỉ được clip build:"registry" (who ${IDS}, pose+src khớp characters.json, khung medium)`);
}
for (const x of RM.stills || []) errs.push(`brand/library/manifest.json still ${x.file}: không dùng ảnh tĩnh nhân vật – chỉ clip registry`);
for (const p of R.poses) for (const who of IDS) if (!R.people[who].clips[p].pending && !(RM.clips || []).some(c => c.who === who && c.pose === p)) errs.push(`brand/library/manifest.json: thiếu clip registry ${who}/${p}`);
// dàn (casting.json): giọng, nhân vật, mọi bối cảnh/chủ đề/dự phòng chỉ Ama/Carlos (+ Kit); dữ liệu cũ chỉ được nằm trong "retired"
const CS = J('content/video/casting.json'), badCast = (where, arr) => { for (const w of arr) if (!WHO.has(w)) errs.push(`content/video/casting.json ${where}: "${w}" ngoài registry`); };
badCast('voices', Object.keys(CS.voices)); badCast('characters', Object.keys(CS.characters).filter(k => k !== '_note')); badCast('fallback', CS.fallback.cast);
for (const [k, sc] of Object.entries(CS.scenes)) { badCast(`scenes.${k}.cast`, sc.cast); badCast(`scenes.${k}.roles`, Object.keys(sc.roles || {})); }
for (const t of CS.topics) badCast(`topics.${t.id}`, t.cast);
for (const w of IDS) if (CS.voices[w] !== R.people[w].voice.video) errs.push(`casting.json voices.${w} ≠ registry voice.video (${R.people[w].voice.video})`);
// lib.mjs CAST (kiểm kịch bản Studio) = registry + kit
const castSrc = (fs.readFileSync('scripts/video/lib.mjs', 'utf8').match(/export const CAST = \[([^\]]*)\]/) || [])[1];
if (!castSrc || castSrc.replace(/[\s']/g, '') !== [...IDS, 'kit'].join()) errs.push(`scripts/video/lib.mjs CAST [${castSrc}] ≠ registry + kit`);
// kịch bản video tự động + khuôn + mẫu: who / vai chỉ registry
for (const d of ['content/video/auto', 'content/video/templates', 'content/video/templates/examples', 'content/video/samples']) for (const f of fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')) : []) {
  const s = fs.readFileSync(`${d}/${f}`, 'utf8');
  for (const m of s.matchAll(/"who"\s*:\s*"(\w+)"|"roles"\s*:\s*\{([^{}]*)\}/g)) for (const w of m[1] ? [m[1]] : [...m[2].matchAll(/"(\w+)"\s*(?=[,\]])/g)].map(x => x[1]))
    if (!WHO.has(w)) errs.push(`${d}/${f}: "${w}" ngoài registry`);
}
// spec news (tpl/news.py, gold2lesson.py): host + người nói chỉ registry; pilot cũ dùng người khác chỉ khi tệp ghi "retired" đầu tệp (registry.check chặn dựng)
const walkJ = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap(f => walkJ(path.join(p, f))) : p.endsWith('.json') ? [p] : [];
for (const f of walkJ('content/video/cine/news')) {
  if (f.endsWith('approved.json')) continue; // sổ lịch sử video đã duyệt
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/"host"\s*:\s*"(\w+)"/g)) if (!IDS.includes(m[1])) errs.push(`${f}: host "${m[1]}" ngoài registry`);
  if (/^\{\s*"retired"/.test(s)) continue;
  for (const m of s.matchAll(/"(?:who|teacher)"\s*:\s*"(\w+)"/g)) if (!WHO.has(m[1])) errs.push(`${f}: "${m[1]}" ngoài registry (pilot cũ → ghi "retired" đầu tệp)`);
}
const vc = Object.fromEntries(IDS.map(w => [w, R.people[w].video_clip]));
for (const t of walkJ('content/video/cine/news/tpl1b').filter(f => /tpl1b_[^/]*\.json$/.test(f)).map(J)) if (vc[t.host] !== t.clip) errs.push(`tpl1b ${t.id}: clip ${t.clip} ≠ video_clip registry của ${t.host} (${vc[t.host]})`);
if (/HOST_CLIPS\s*=\s*dict\(/.test(fs.readFileSync('scripts/video/tpl/tokens.py', 'utf8'))) errs.push('scripts/video/tpl/tokens.py: HOST_CLIPS phải lấy từ registry (teach.registry.video_clips)');

// ---------- 4) hoà vào nền: KHÔNG khung/ô màu/viền quanh giáo viên (chủ 28/10) + không ảnh mẫu/ảnh ngoài ----------
const TCH = /\.(?:ux1-tch|ret-teach|tch|tch-rig|tch-poster|tch-cv|chr)(?![\w-])/, FRAME = /(?:^|;)\s*(?:border(?:-radius)?|outline|box-shadow|background(?:-color|-image)?)\s*:\s*(?!none|transparent|0\b)/;
const PLACE = /https?:\/\/[^"'\s)]*(?:googleusercontent|unsplash|pravatar|picsum|randomuser|placehold|placeholder\.com|dummyimage|ui-avatars|gravatar|loremflickr|fakeimg|thispersondoesnotexist)/gi;
for (const f of [...ROOTS, 'content/video', 'scripts/video', 'docs/mocks'].flatMap(walk)) {
  if (!/\.(m?js|html|css|json|tsx?|py|svg)$/.test(f) || f === 'scripts/test/characters-gate.mjs') continue;
  const s = fs.readFileSync(f, 'utf8'); if (s.length > 4e6) continue;
  for (const m of s.matchAll(PLACE)) errs.push(`${f}: ảnh mẫu/ảnh người ngoài "${m[0].slice(0, 80)}" – chỉ dùng tài sản của mình (nhân vật: registry)`);
  if (!/\.(m?js|css|html)$/.test(f)) continue;
  for (const m of s.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].split(',').filter(x => TCH.test(x) && !/::?(after|before)/.test(x));
    if (sel.length && FRAME.test(m[2])) errs.push(`${f}: "${sel[0].trim().slice(-50)}" có khung/viền/nền (${m[2].match(FRAME)[0].trim()}) – giáo viên phải đứng tự do trên nền trang (drop-shadow, không ô/vòng tròn)`);
  }
}

if (errs.length) { console.error(`✗ characters-gate: ${errs.length} lỗi\n  ` + errs.slice(0, 60).join('\n  ')); process.exit(1); }
console.log(`✓ characters-gate: 2 giáo viên 2D (${IDS}), ${want.size} tệp khớp sha256, không tham chiếu nhân vật ngoài registry`);
