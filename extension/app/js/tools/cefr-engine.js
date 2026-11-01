/* Lõi bài kiểm tra trình độ CEFR thích ứng (trang /<lang>/<english-level-test>/ – docs/SEO-TOOLS.md §2). Thuần, không DOM → test Node dùng chung.
 * Mô hình IRT 3 tham số rút gọn: độ khó b theo cấp CEFR, độ phân biệt A, đoán mò c = 1/số phương án; "Tôi không biết" = sai, không đoán.
 * Ước lượng EAP trên lưới −4…4 với tiên nghiệm N(MU, SD); chọn câu kế: kỹ năng thiếu nhất so với tỉ lệ đích → câu có b gần θ nhất (ngẫu nhiên có hạt giống giữa các câu ngang nhau).
 * Dừng: đủ MAX câu, hoặc ≥ MIN câu và sai số chuẩn < SE_STOP. */
(function (g) {
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const B = { A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
  const A = 1.8, MU = 0, SD = 1.6, MIN = 26, MAX = 32, SE_STOP = 0.4;
  const MIX = { g: 0.45, v: 0.3, r: 0.25 };
  const sig = x => 1 / (1 + Math.exp(-x));
  const pRight = (th, it) => { const c = 1 / ((it.o && it.o.length) || 4); return c + (1 - c) * sig(A * (th - B[it.lv])); };
  // resp: [{ id, r: 'right' | 'wrong' | 'idk' }] → { theta, se }
  function estimate(resp, byId) {
    let max = -Infinity; const pts = [];
    for (let k = 0; k <= 400; k++) {
      const th = -4 + k * 0.02; let l = -((th - MU) ** 2) / (2 * SD * SD);
      for (const r of resp) {
        const it = byId[r.id]; if (!it) continue;
        const c = 1 / ((it.o && it.o.length) || 4), p = sig(A * (th - B[it.lv]));
        l += Math.log(r.r === 'right' ? c + (1 - c) * p : r.r === 'wrong' ? (1 - c) * (1 - p) : 1 - p);
      }
      pts.push([th, l]); if (l > max) max = l;
    }
    let sw = 0, s1 = 0, s2 = 0;
    for (const [th, l] of pts) { const w = Math.exp(l - max); sw += w; s1 += w * th; s2 += w * th * th; }
    const m = s1 / sw; return { theta: m, se: Math.sqrt(Math.max(0, s2 / sw - m * m)) };
  }
  const levelOf = th => LV[Math.max(0, Math.min(5, Math.floor(th + 3)))]; // ranh giới −2, −1, 0, 1, 2 (giữa hai độ khó liền kề)
  // Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) → cùng hạt giống = cùng chuỗi câu (test tái lập được, khôi phục bài đang làm)
  const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function create(items, seed) {
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    const st = { seed: seed >>> 0, resp: [] };
    const api = {
      state: st, byId,
      load(s) { if (s && Array.isArray(s.resp)) { st.seed = s.seed >>> 0; st.resp = s.resp.filter(r => byId[r.id]); } return api; },
      est: () => estimate(st.resp, byId),
      done() { const n = st.resp.length; return n >= MAX || n >= items.length || (n >= MIN && api.est().se < SE_STOP); },
      next() {
        if (api.done()) return null;
        const used = new Set(st.resp.map(r => r.id)), th = api.est().theta, n = st.resp.length;
        const R = rng(st.seed + n * 7919);
        const cnt = { g: 0, v: 0, r: 0 }; for (const r of st.resp) cnt[byId[r.id].sk]++;
        const sks = Object.keys(MIX).sort((a, b) => (cnt[a] - MIX[a] * (n + 1)) - (cnt[b] - MIX[b] * (n + 1)));
        for (const sk of sks) {
          const pool = items.filter(i => i.sk === sk && !used.has(i.id));
          if (!pool.length) continue;
          const best = Math.min(...pool.map(i => Math.abs(B[i.lv] - th)));
          const near = pool.filter(i => Math.abs(B[i.lv] - th) <= best + 1e-9);
          return near[Math.floor(R() * near.length)];
        }
        return null;
      },
      answer(id, r) { if (byId[id] && !st.resp.some(x => x.id === id)) st.resp.push({ id, r }); return api; },
      result() {
        const { theta, se } = api.est(), by = { g: [0, 0], v: [0, 0], r: [0, 0] };
        for (const r of st.resp) { const s = by[byId[r.id].sk]; s[1]++; if (r.r === 'right') s[0]++; }
        return { level: levelOf(theta), lo: levelOf(theta - se), hi: levelOf(theta + se), theta: Math.round(theta * 100) / 100, se: Math.round(se * 100) / 100, n: st.resp.length, by };
      },
    };
    return api;
  }
  g.CEFRTest = { LV, B, MIN, MAX, create, estimate, levelOf, pRight, rng };
})(typeof self !== 'undefined' ? self : globalThis);
