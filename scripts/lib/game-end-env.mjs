// 🏁 Nạp màn kết mini-game THẬT (web/js/game-end.js trên khung Stitch lesson-complete) vào cửa sổ jsdom của test game:
// App.need('gend') → nạp runtime ST2 + khung + game-end.js (một lần). Dùng: import { withGameEnd } from '../lib/game-end-env.mjs'; withGameEnd(w).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { gameRules } from './game-rules.mjs';
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web');
const FILES = ['js/st/v2/runtime.js', 'js/st/v2/lesson-complete.js', 'js/game-end.js'];
export function withGameEnd(w) {
  w.Game = { ...gameRules(), ...(w.Game || {}) };
  w.Core = w.Core || {}; if (!w.Core.todayKey) w.Core.todayKey = d => { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  w.I18N = { lang: () => 'en', ...(w.I18N || {}) }; w.scrollTo = () => {}; // jsdom chưa có scrollTo
  const need = w.App.need;
  w.App.need = async (...b) => { if (b.includes('gend') && !w.GameEnd) FILES.forEach(f => w.eval(fs.readFileSync(path.join(WEB, f), 'utf8'))); return need ? need(...b) : undefined; };
  return w;
}
