// Cổng nghĩa gói từ vựng (web/packs/<lang>.json, 13 ngôn ngữ) – offline, không mạng.
// Lỗi bắt được: nghĩa sai lọt qua tinh chỉnh (pregnant→充満 · currently→実際に · victim→餌食 · diet→議会).
//  1) pickGloss chỉ giữ bản dịch qua kiểm DỊCH NGƯỢC, xếp theo độ phổ biến (dữ liệu giả lập đúng dạng gtx dt=bd)
//  2) mọi bảng tay content/wordlists/*.gloss.json đã áp vào gói (cờ 2) cho cả 13 ngôn ngữ
//  3) danh sách cấm: nghĩa sai đã biết không được quay lại
// Đối chiếu ngược trên mạng (mẫu ngẫu nhiên mọi ngôn ngữ): scripts/pack-backcheck.mjs (chạy trong word-packs.yml).
import fs from 'fs';
import assert from 'assert';
import { pickGloss, backCheck, FLAG } from '../lib/pack-gloss.mjs';
const R = new URL('../../', import.meta.url);
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// ---- 1) pickGloss
const row = (t, rev, score) => [t, rev, null, score];
const bdPregnant = [['adjective', ['充満', '多産', '妊娠している'], [row('充満', ['full', 'replete'], 0.0004), row('多産', ['fertile', 'prolific'], 0.0002), row('妊娠している', ['pregnant', 'expecting'], 0.05), row('妊娠した', ['pregnant'], 0.02)]]];
let r = pickGloss('pregnant', 'adj', bdPregnant, '妊娠中');
ok(r.verified && r.gloss === '妊娠している, 妊娠した', 'pregnant: chọn bản dịch ngược về pregnant, bỏ 充満/多産 → ' + r.gloss);
const bdNow = [['adverb', ['実際に', '現在'], [row('実際に', ['actually', 'in fact'], 0.2), row('現在', ['currently', 'now'], 0.3), row('今のところ', ['currently', 'for now'], 0.1)]]];
r = pickGloss('currently', 'adv', bdNow, '現在');
ok(r.gloss === '現在, 今のところ' && !r.gloss.includes('実際'), 'currently: không lấy 実際に → ' + r.gloss);
r = pickGloss('diet', 'n', [['noun', ['議会', 'ダイエット'], [row('議会', ['parliament', 'assembly'], 0.001), row('ダイエット', ['diet', 'weight loss'], 0.1)]]], 'ダイエット');
ok(r.gloss === 'ダイエット', 'diet: bỏ 議会 → ' + r.gloss);
r = pickGloss('book', 'v', [['noun', ['本'], [row('本', ['book'], 0.9)]], ['verb', ['予約する'], [row('予約する', ['book', 'reserve'], 0.1)]]], '本');
ok(r.gloss.startsWith('予約する'), 'book (v): đúng từ loại, không lấy bản dịch chính của danh từ');
r = pickGloss('rare', 'adj', [['adjective', ['希少'], [row('希少', ['scarce'], 0.1)]]], '珍しい');
ok(!r.verified && r.gloss === '珍しい', 'không bản nào qua kiểm ngược → dùng bản dịch chính');
r = pickGloss('lemon', '', null, 'レモン');
ok(r.gloss === 'レモン' && !r.verified, 'không có dt=bd → bản dịch chính');

// ---- backCheck
ok(backCheck('pregnant', [[['pregnant', 0]], [['adjective', ['pregnant', 'expecting']]]]), 'dịch ngược khớp');
ok(!backCheck('pregnant', [[['full of', 0]], [['adjective', ['full', 'replete']]]]), '充満 → full: không khớp pregnant');
ok(backCheck('commute', [[['commuting', 0]], null]), 'dạng biến đổi (commuting) vẫn khớp');
ok(!backCheck('currently', [[['actually', 0]], null]), 'currently ≠ actually');

// ---- nguồn: job dịch đêm (lexicon-i18n) phải ghi bảng tay bằng cờ MANUAL (06/11 ghi cờ 1 → 320 nghĩa ko bị hạ, main đỏ)
ok(/pack\[w\] = \[m, FLAG\.MANUAL/.test(fs.readFileSync(new URL('scripts/lexicon/i18n-job.mjs', R), 'utf8')), 'i18n-job: bảng tay ghi cờ FLAG.MANUAL');

// ---- 2) bảng tay đã áp (cờ 2) · 3) danh sách cấm
const LANGS = fs.readFileSync(new URL('scripts/i18n-langs.txt', R), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
ok(LANGS.length === 13, '13 ngôn ngữ gói');
const packs = Object.fromEntries(LANGS.map(l => [l, JSON.parse(fs.readFileSync(new URL(`web/packs/${l}.json`, R), 'utf8'))]));
const glossFiles = fs.readdirSync(new URL('content/wordlists/', R)).filter(f => f.endsWith('.gloss.json')).sort();
const manual = {};
for (const f of glossFiles) { const g = JSON.parse(fs.readFileSync(new URL('content/wordlists/' + f, R), 'utf8')); for (const [l, m] of Object.entries(g)) Object.assign(manual[l] = manual[l] || {}, m); }
let applied = 0;
for (const l of LANGS) {
  const p = packs[l];
  ok(Object.keys(p).length >= 8000, l + ': gói đủ từ');
  for (const [k, v] of Object.entries(manual[l] || {})) {
    if (!p[k]) continue; // từ đã bỏ khỏi app
    ok(p[k][0] === v && p[k][1] === FLAG.MANUAL, `${l}/${k}: bảng tay chưa áp vào gói (chạy node scripts/gen-word-packs.mjs ${l} --gloss-only): "${p[k] && p[k][0]}" ≠ "${v}"`);
    applied++;
  }
}
const FORBID = { ja: { pregnant: ['充満', '多産'], currently: ['実際に'], diet: ['議会'], victim: ['餌食', '槍玉'], volunteer: ['買う'], commute: ['変える'], want: ['使う'] }, ko: { pregnant: ['충만', '현명'] }, hi: { pregnant: ['परिपूर्ण'] }, ru: { pregnant: ['богатый'] }, zh: { diet: ['国会'] } };
for (const [l, m] of Object.entries(FORBID)) for (const [w, bad] of Object.entries(m)) for (const b of bad) ok(!packs[l][w][0].includes(b), `${l}/${w}: nghĩa sai đã biết "${b}" quay lại (${packs[l][w][0]})`);
for (const l of LANGS) for (const w of ['pregnant', 'currently']) ok(packs[l][w] && packs[l][w][1] === FLAG.MANUAL, `${l}/${w}: phải có nghĩa tay`);

const legacy = Object.fromEntries(LANGS.map(l => [l, Object.values(packs[l]).filter(v => v[1] === FLAG.LEGACY).length]));
console.log(`✓ pack-gloss: ${n} kiểm · ${applied} nghĩa tay đã áp · còn chờ tinh chỉnh kiểm ngược (cờ 1): ${JSON.stringify(legacy)}`);

// hồi quy 06/11 (a6bf18c13): bot lexicon-i18n phải ÁP LẠI bảng tay sau rebase + chạy pack-gloss trước khi đẩy main
{ const y = (await import('node:fs')).readFileSync('.github/workflows/lexicon-i18n.yml', 'utf8'); const i = y.indexOf('rebase');
  if (!(/gen-word-packs\.mjs "\$L" --gloss-only/.test(y) && /pack-gloss\.mjs \|\|[^\n]*KHÔNG đẩy/.test(y) && /PUSH_MAIN_REGEN=[^\n]*--gloss-only[^\n]*pack-gloss\.mjs/.test(y) && y.indexOf('--gloss-only') < y.indexOf('scripts/ci/push-main.sh'))) { console.error('✗ lexicon-i18n.yml: sau rebase phải áp lại bảng tay (--gloss-only) và chạy pack-gloss trước khi push'); process.exit(1); } }
