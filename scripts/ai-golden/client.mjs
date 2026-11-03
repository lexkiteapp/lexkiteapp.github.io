// Lời nhắn THẬT của máy khách cho bộ golden: nạp web/js/ai.js + roleplay.js trong vm với vỏ tối thiểu → AI._p / RP._p (docs/AI-CHAIN.md §Golden).
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { LANGS } from './score.mjs';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export function client() {
  const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub()), apply: () => stub() });
  const ctx = { console, setTimeout, clearTimeout, URL, Intl, location: { hostname: 'golden.local' }, navigator: {}, localStorage: { getItem: () => null, setItem() {} },
    UI: stub(), Core: { Store: stub() }, App: { state: { settings: {} }, routes: {}, view: stub(), reward: stub() }, I18N: { lang: () => 'vi', learnLang: () => 'vi', LANGS: {} }, t: s => s, document: stub() };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  for (const f of ['web/js/ai.js', 'web/js/roleplay/data-a.js', 'web/js/roleplay/data-b.js', 'web/js/roleplay/data-everyday.js', 'web/js/roleplay.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  if (!ctx.AI || !ctx.AI._p || !ctx.RP || !ctx.RP._p) throw new Error('không đọc được AI._p / RP._p từ web/js');
  return { A: ctx.AI._p, R: ctx.RP._p, ROLEPLAY: ctx.ROLEPLAY };
}
const C = client();
export function ieltsReq(c) { const name = LANGS[c.lang || 'vi']; return { sys: C.A.forLang(C.A.SYS, name), prompt: C.A.forLang(C.A.gradeBody(c.kind, c.task, c.text, c.extra || ''), name), temp: 0, rp: false }; } // khớp máy chủ: chấm ở nhiệt độ 0
export function rpCase(c) {
  const s = C.ROLEPLAY.find(x => x.id === c.scenario); if (!s) throw new Error('thiếu kịch bản ' + c.scenario);
  const hist = []; c.replies.forEach((r, t) => { hist.push({ who: 'ai', text: s.turns[t].a[c.L] }); hist.push({ who: 'me', text: r }); });
  const i = c.replies.length - 1, next = s.turns[i + 1], beat = next ? next.a[c.L] : s.end[c.L];
  const transcript = hist.map(m => (m.who === 'ai' ? s.ai.name : 'Learner') + ': ' + m.text).join('\n');
  return { s, next, beat, transcript, level: (s.lv || ['B1', 'B2', 'C1'])[c.L], req: { sys: C.R.sysOf(s, c.L) + '\nReturn JSON only.', prompt: C.R.turnPrompt(s, hist, next, beat), temp: 0.7, rp: true } };
}

