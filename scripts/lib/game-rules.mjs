// 🎯 Nạp luật thưởng THẬT của web/js/game.js (Game.xpFor/XPR/repCut) vào Node – một nguồn cho test, sandbox sinh vector native và gen-rewards.
// Dùng: import { gameRules } from '../lib/game-rules.mjs'; const { xpFor } = gameRules(); sb.Game = { ...stub, ...gameRules() }.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let cached = null;
export function loadGame(store = new Map()) {
  const Store = { get: async (k, d) => (store.has(k) ? JSON.parse(store.get(k)) : d), set: async (k, v) => { store.set(k, JSON.stringify(v)); } };
  const sb = { Core: { Store, todayKey: () => '2026-11-22' }, matchMedia: () => ({ matches: false }), navigator: {}, localStorage: { getItem: () => '0', setItem() {} }, console };
  sb.self = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/game.js'), 'utf8'), sb, { filename: 'web/js/game.js' });
  return { Game: sb.Game, store };
}
export function gameRules() {
  if (!cached) { const { Game } = loadGame(); cached = { xpFor: Game.xpFor, XPR: Game.XPR, repCut: Game.repCut }; }
  return cached;
}
