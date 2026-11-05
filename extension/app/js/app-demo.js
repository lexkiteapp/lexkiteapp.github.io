/* Dữ liệu mẫu cho ?demo=1 (ảnh store, đo CI). Tách khỏi app.js để khung app nhẹ, chỉ nạp khi có ?demo=1. */
(function () {
  const { Store, Cards, DEFAULT_SETTINGS, todayKey, DAY } = Core, topicOf = id => IELTS_DATA.TOPICS.find(t => t.id === id);
  App.seedDemo = async function seedDemo() {
    if (Object.keys(await Cards.all()).length) return;
    const now = Date.now();
    const cards = {};
    ['environment', 'technology', 'education', 'health', 'task2', 'phrasal'].forEach((id, ti) => (topicOf(id) || { words: [] }).words.slice(0, 14).forEach((w, i) => {
      const c = Cards.make(w); const r = (i * 7 + ti * 3) % 10;
      c.added = now - (40 - i) * DAY;
      if (r < 7) { c.srs = { ef: 2.3 + r / 20, interval: [1, 3, 6, 12, 24, 30, 45][r], reps: r + 1, lapses: r % 3 === 0 ? 1 : 0, due: now + ((r % 4) - 1) * DAY, last: now - DAY * (r % 3) }; }
      if (i === 2 && w.ex) c.contexts = [{ text: w.ex, vi: '', title: 'BBC News', at: now }];
      cards[w.word.toLowerCase()] = c;
    }));
    await Cards.save(cards);
    const days = {}, gdays = {};
    for (let i = 0; i < 120; i++) { if (i > 2 && (i * 13) % 7 === 0) continue; const k = todayKey(new Date(now - i * DAY)); days[k] = 10 + (i * 17) % 45; gdays[k] = { xp: 60 + (i * 31) % 160, reviews: days[k] }; }
    await Store.set('stats', { days, newToday: { day: todayKey(), n: 3 } });
    await Store.set('game', { xp: 6840, days: gdays, total: { reviews: 3120, newWords: 412, quizzes: 96, perfect: 21, matches: 34, spoken: 188, readings: 7, lookups: 260 }, best: { match: 21.4 }, badges: { first: 1, words50: 1, master10: 1, streak3: 1, streak7: 1, rev500: 1, perfect5: 1, speaker: 1, reader: 1, speed: 1, level5: 1 }, questsDone: {} });
    await Store.set('settings', { ...DEFAULT_SETTINGS, onboarded: true, autoSpeak: false, sfx: false });
  };
})();
