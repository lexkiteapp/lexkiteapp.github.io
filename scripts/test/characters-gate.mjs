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
if (C.poses.join() !== R.poses.join()) errs.push(`Chars.poses ≠ characters.json poses`);
const want = new Set();
for (const who of IDS) {
  want.add(`${who}/poster.webp`).add(`${who}/avatar.webp`);
  for (const p of R.poses) {
    const c = R.people[who].clips[p]; if (!c) { errs.push(`${who}: thiếu tư thế ${p}`); continue; }
    const pend = C.clip(who, p) !== `teach/${who}/${p}.mp4`;
    if (!!c.pending !== pend) errs.push(`${who}/${p}: pending trong JSON (${!!c.pending}) ≠ Chars (${pend})`);
    if (!c.pending) want.add(`${who}/${p}.mp4`);
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
// Tạm thời, có hạn: PR đang mở đã nhận việc thay – khi PR xoá tham chiếu, mục này thành "cũ" và cổng đỏ → xoá mục.
const WAIVE = { 'web/js/call.js': [/img\/call\/|mia\.webp/, '#194 Call Ama/Carlos (đổi Mia → Ama/Carlos, 15 ngôn ngữ) – rebase lên registry'], 'extension/app/js/call.js': [/img\/call\/|mia\.webp/, '#194'] };
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
// kho dựng video hằng ngày (render.mjs): diễn viên 'char' phải là người trong registry; ảnh kho kiểu minh hoạ cũ = nợ có chủ (LIB_WAIVE)
const LIB_WAIVE = 'việc riêng: chuyển diễn viên video hằng ngày (render.mjs/library.json) sang footage 2D của registry';
const lib = JSON.parse(fs.readFileSync('content/video/library.json', 'utf8')).items.filter(i => i.kind === 'char' && i.who);
const off = lib.filter(i => !IDS.includes(i.who)), legacy = lib.filter(i => IDS.includes(i.who));
if (off.length || legacy.length) console.log(`⚠ kho video: ${off.length} ảnh nhân vật ngoài registry (${[...new Set(off.map(i => i.who))]}) + ${legacy.length} ảnh Ama/Carlos kiểu cũ – ${LIB_WAIVE}`);
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
