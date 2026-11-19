// Hook + mẹo bản địa của series Spell→Sound (content/video/teach2d/rule-l1.json, docs/specs/spell-sound.md bước 3): đủ 15 ngôn ngữ × mọi luật, luật i18n chung
// (scripts/lib/i18n-rules.mjs), cách đọc sai tiếng Anh còn nguyên văn, độ dài. --online: dịch ngược gtx (mẹo phải còn nói "chữ câm / không đọc").
// Dùng: node scripts/video/teach2d/rule-l1-qa.mjs [--online]   → exit 1 nếu đỏ
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VI, BAD, INFORMAL } from '../../lib/i18n-rules.mjs';
import { has } from '../../i18n-english.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), J = f => JSON.parse(fs.readFileSync(ROOT + f, 'utf8'));
const ONLINE = process.argv.includes('--online'), T = J('content/video/teach2d/rule-l1.json'), RULES = J('content/video/teach2d/rules.json').rules;
const LANGS = ['vi', 'es', 'pt', 'fr', 'de', 'ru', 'tr', 'ar', 'hi', 'th', 'zh', 'ja', 'ko', 'id'], fill = (s, r) => s.replace('{wrong}', r.wrong).replace('{show}', T.show[r.id]).replace('{silent}', T.silent[r.id]);
const sleep = ms => new Promise(r => setTimeout(r, ms)), bad = [];
const fail = (m) => { bad.push(m); console.log('✗', m); };
for (const L of [...LANGS, 'en']) if (!T.langs[L]) fail(`thiếu ngôn ngữ ${L}`);
for (const r of RULES) for (const k of ['show', 'silent']) if (!T[k][r.id]) fail(`thiếu ${k} cho ${r.id}`);
const en = T.langs.en;
for (const L of LANGS) {
  const c = T.langs[L]; if (!c) continue;
  if ((c.hook.match(/\{wrong\}/g) || []).length !== 1 || !c.tip.includes('{silent}') || !c.tip.includes('{show}')) fail(`${L}: mẫu thiếu/thừa chỗ điền`);
  if (!/^[^{}]*(\{\w+\}[^{}]*)*$/.test(c.hook + c.tip)) fail(`${L}: ngoặc nhọn lạ`);
  for (const r of RULES) {
    const hook = fill(c.hook, r), tip = fill(c.tip, r), where = `${L}/${r.id}`;
    if (L !== 'vi' && VI.test(hook + tip)) fail(`${where}: lọt chữ vi`);
    if (BAD.test(hook + tip)) fail(`${where}: cụm bị cấm`);
    if (INFORMAL[L]?.test(hook + tip)) fail(`${where}: sai xưng hô (de = Sie, fr = vous)`);
    if (!has(hook, r.wrong)) fail(`${where}: hook mất cách đọc sai "${r.wrong}"`);
    if ([...hook].length > 34) fail(`${where}: hook ${[...hook].length} > 34 ký tự`);
    if ([...tip].length > 140) fail(`${where}: mẹo ${[...tip].length} > 140 ký tự`);
    if (hook === fill(en.hook, r) || tip === fill(en.tip, r)) fail(`${where}: còn là tiếng Anh`);
  }
}
if (ONLINE) {
  const SIL = /silent|mute|not (be )?(pronounced|said|read|spoken|sounded)|do not (say|read|pronounce)|don't (say|read|pronounce)|unpronounced|no sound/i;
  for (const L of LANGS) {
    const r = RULES[0], url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${L}&tl=en&dt=t&q=${encodeURIComponent(fill(T.langs[L].tip, r))}`; let bt = null;
    for (let k = 0; k < 3 && !bt; k++) { try { const x = await fetch(url); if (x.ok) bt = (await x.json())[0].map(y => y[0]).join(''); else if (x.status === 429) await sleep(6000); } catch (e) { await sleep(2000); } }
    if (bt === null) { console.log(`  (${L}: gtx không trả lời – bỏ qua dịch ngược)`); continue; }
    if (!SIL.test(bt)) fail(`${L}: dịch ngược mất nghĩa "chữ câm": ${bt}`); else console.log(`  ${L} ✓ ${bt}`);
    await sleep(400);
  }
}
console.log(bad.length ? `rule-l1: ${bad.length} lỗi` : `rule-l1: OK (${LANGS.length} ngôn ngữ × ${RULES.length} luật${ONLINE ? ', dịch ngược' : ''})`);
process.exit(bad.length ? 1 : 0);
