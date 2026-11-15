// Dữ liệu thử (người mới / đang học / rỗng): dùng chung journey-matrix + audit tổng (scripts/audit).
export const DAY = 864e5, NOW = Date.now(), dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const card = (word, vi) => ({ word, vi, pos: 'noun', ex: '', contexts: [], added: NOW - 9 * DAY, mod: NOW - 2 * DAY, srs: { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: NOW - DAY, last: NOW - 4 * DAY, step: 0, S: 3, D: 4 } });
export const CARDS = Object.fromEntries(['resilience', 'sustainable', 'negotiate', 'budget', 'deadline'].map(w => [w, card(w, w)]));
export const GOAL = { onboarded: true, exam: 'ielts', examTarget: '6.5', targetBand: '6.5', goalPick: { exam: 'ielts', target: 6.5, at: NOW }, plSkip: NOW };
export const XP = 1234, TODAY_DONE = 3, GOAL_N = 20;
export const today = dayKey(new Date()), yest = dayKey(new Date(NOW - DAY));
export const GAME = { xp: XP, days: { [today]: { xp: 30 }, [yest]: { xp: 40 } } };
export const STATS = { days: { [today]: TODAY_DONE, [yest]: 5 }, newToday: { day: today, n: 0 } };
export const seedOf = (p, o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.startsWith('lk.') ? k : p + k, typeof v === 'string' ? v : JSON.stringify(v)]));
export const NEWBIE = { settings: { onboarded: true }, 'lk.ux1': '1' };
export const LEARNER = { settings: GOAL, cards: CARDS, game: GAME, stats: STATS, 'lk.ux1': '1' };
export const EMPTY = { settings: GOAL, 'lk.ux1': '1' };
