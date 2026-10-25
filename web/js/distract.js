/* 🎯 Bộ sinh phương án nhiễu cho trắc nghiệm từ vựng (Học thông minh, Trắc nghiệm, Kiểm tra đầu vào).
   Phương án nhiễu tốt = cùng từ loại, cùng/gần trình độ CEFR, dài – ngắn tương đương đáp án, nghe "có lý" nhưng SAI:
   • không bao giờ là từ đồng nghĩa / cùng họ từ / nghĩa chồng lấn với đáp án (tránh 2 đáp án cùng đúng);
   • không trùng chữ hiển thị; • tất định theo seed (test lặp lại được, mỗi lượt học vẫn đổi phương án).
   Tải lười cùng gói 'words' (app.js BUNDLES). Không gọi t() – hàm thuần, dùng được trong Node. */
(function (g) {
  const LV = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
  const POS = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', phrase: 'phr', idiom: 'phr', collocation: 'phr', phrasal: 'phr' };
  const posOf = p => { const s = String(p || '').toLowerCase().trim().split(/[\s/,;.()]+/)[0] || ''; return POS[s] || s; };
  // Hàm thuần theo chuỗi → nhớ kết quả (pick() so đáp án với cả kho ~10k từ; không nhớ thì mỗi lượt tách lại cùng chuỗi → tác vụ dài khi vào #/quick). Kết quả chỉ được đọc, không sửa.
  const memo = f => { const m = new Map(); return s => { s = String(s == null ? '' : s); let v = m.get(s); if (v === undefined) { if (m.size > 50000) m.clear(); v = f(s); m.set(s, v); } return v; }; };
  const fold = memo(s => s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim());
  // Từ chức năng không mang nghĩa riêng – không tính khi so nghĩa chồng lấn
  const STOP = new Set('to a an the of and or in on at for with by be is sb sth someone something one sự việc cái người làm được có một những các và hoặc của cho với bị để'.split(' '));
  // Trợ động từ / động từ khuyết thiếu: không dùng làm phương án nhiễu cho động từ thường (lộ đáp án)
  const FUNC = new Set('be have do will would can could shall should may might must ought'.split(' '));
  const glosses = memo(s => fold(s).replace(/\([^)]*\)/g, ' ').split(/\s*(?:[,;/]|\s–\s|\s-\s|\bor\b|\bhoặc\b)\s*/).map(x => x.trim()).filter(Boolean));
  const toks = memo(s => new Set(fold(s).replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(' ').filter(x => x && !STOP.has(x))));
  const synList = w => [].concat(w && w.syn || []).flatMap(x => String(x).split(/[,;]/)).map(fold).filter(Boolean);
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // Cùng họ từ: mutual / mutually, economy / economic (chung gốc ≥ 5 chữ và gần hết từ ngắn hơn)
  function sameFamily(a, b) {
    a = fold(a); b = fold(b); if (!a || !b) return false;
    if (a === b) return true;
    let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return k >= Math.max(5, Math.min(a.length, b.length) - 2);
  }
  // Nghĩa chồng lấn: một nghĩa con trùng/chứa nghĩa con kia, hoặc ≥ 50% từ có nghĩa trùng nhau
  function overlap(m1, m2) {
    const A = glosses(m1), B = glosses(m2);
    if (!A.length || !B.length) return false;
    for (const x of A) for (const y of B) { if (x === y) return true; if (x.length >= 3 && y.length >= 3 && (` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `))) return true; }
    const ta = toks(m1), tb = toks(m2); if (!ta.size || !tb.size) return false;
    let same = 0; for (const x of ta) if (tb.has(x)) same++;
    return same / Math.min(ta.size, tb.size) >= 0.5 && same >= 1 && (same / new Set([...ta, ...tb]).size >= 0.34);
  }
  // Có phải "gần như cùng nghĩa" với đáp án → loại (2 đáp án cùng đúng là lỗi nặng của câu hỏi)
  function nearSynonym(w, x, mean) {
    if (!w || !x) return false;
    const a = fold(w.word), b = fold(x.word);
    if (a && b && (a === b || sameFamily(a, b))) return true;
    if (synList(w).includes(b) || synList(x).includes(a)) return true;
    const mw = mean(w), mx = mean(x);
    if (mw && mx && overlap(mw, mx)) return true;
    if (w.def && x.def && w.def !== mw && overlap(w.def, x.def)) return true;
    return false;
  }

  /* pick(đáp án, kho, { n = 3, key = 'vi' | 'word', seed, mean }) → n phương án nhiễu (đối tượng từ của kho).
     key 'vi': hiển thị nghĩa (mean(x), mặc định x.vi); key 'word': hiển thị từ tiếng Anh. */
  // mean(x) (App.meanOf → bản dịch theo ngôn ngữ) được gọi nhiều lần cho mỗi từ của kho trong một lượt pick: nhớ trong lượt (ngôn ngữ đổi giữa hai lượt vẫn đúng)
  const DEF_MEAN = x => x.vi || x.def || '';
  const memoMean = f => { const m = new WeakMap(); return x => { if (!x || typeof x !== 'object') return f(x); let v = m.get(x); if (v === undefined) { v = f(x); m.set(x, v); } return v; }; };
  function pick(w, pool, opt = {}) {
    const n = opt.n == null ? 3 : opt.n, key = opt.key || 'vi';
    const mean = memoMean(opt.mean || DEF_MEAN);
    const show = x => key === 'word' ? x.word : mean(x);
    const ans = fold(show(w)), wp = posOf(w.pos), wl = LV[String(w.level || '').toUpperCase()];
    const wLen = String(show(w)).length || 1, wParts = glosses(show(w)).length;
    const r = rng(hash(fold(w.word) + '|' + (opt.seed == null ? '' : opt.seed)));
    const seen = new Set([ans]), cand = [];
    for (const x of pool || []) {
      if (!x || !x.word || x === w) continue;
      const s = fold(show(x));
      if (!s || seen.has(s)) continue;
      if (nearSynonym(w, x, mean)) continue;
      if (FUNC.has(fold(x.word)) && !FUNC.has(fold(w.word))) continue;
      if (key === 'word' && (s.includes(fold(w.word)) || fold(w.word).includes(s))) continue;
      seen.add(s);
      const xp = posOf(x.pos), xl = LV[String(x.level || '').toUpperCase()];
      let sc = 0;
      sc += !wp || !xp ? 0 : xp === wp ? 6 : -6; // cùng từ loại: ưu tiên tuyệt đối
      if (wl != null && xl != null) { const d = Math.abs(wl - xl); sc += d === 0 ? 2 : d === 1 ? 1.2 : d === 2 ? 0 : -2; }
      const len = String(show(x)).length, ratio = Math.min(len, wLen) / Math.max(len, wLen);
      sc += 2.5 * ratio; // dài – ngắn tương đương: không để đáp án "lòi" ra vì quá ngắn/dài
      if ((glosses(show(x)).length > 1) === (wParts > 1)) sc += 0.6; // cùng kiểu "nghĩa 1, nghĩa 2"
      if (x.topic && w.topic && x.topic === w.topic) sc += 0.4; // cùng chủ đề → hợp ngữ cảnh, khó đoán mò
      if (key === 'word' && /\s/.test(x.word) !== /\s/.test(w.word)) sc -= 1.5; // cụm từ vs từ đơn
      cand.push({ x, sc: sc + r() * 0.9 });
    }
    cand.sort((a, b) => b.sc - a.sc);
    // Đa dạng: không lấy 2 phương án nhiễu là đồng nghĩa của nhau
    const out = [];
    for (const c of cand) { if (out.length >= n) break; if (!out.some(o => nearSynonym(o, c.x, mean))) out.push(c.x); }
    for (const c of cand) { if (out.length >= n) break; if (!out.includes(c.x)) out.push(c.x); }
    return out;
  }
  // Trộn tất định theo seed (Fisher–Yates)
  function shuffle(arr, seed) { const a = arr.slice(), r = rng(hash(String(seed))); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Hình minh họa: ảnh thật luôn hiện; emoji chỉ khi minh họa ĐÚNG nghĩa – danh từ, hoặc emoji người/cử chỉ/khuôn mặt cho động/tính/trạng từ
  // (🏃 run, 👂 hear, 🤔 think). Emoji đồ vật/nơi chốn cho từ trừu tượng (live 🏠, keep 🔒, provide 📦) dễ hiểu sai → ẩn.
  const HUMAN = /^(?:[\u{1F600}-\u{1F64F}\u{1F440}-\u{1F450}\u{1F466}-\u{1F487}\u{1F4AA}\u{1F590}-\u{1F596}\u{1F90C}-\u{1F93E}\u{1F970}-\u{1F97A}\u{1F9D0}-\u{1F9E0}\u{1F3C3}-\u{1F3CC}\u{1F6B4}-\u{1F6B6}\u{261D}\u{263A}\u{2639}\u{270A}-\u{270D}\u{1F483}\u{1F57A}\u{1FAE0}-\u{1FAF8}])/u;
  const picOk = w => !!w && (!!w.image || (!!w.emoji && w.emoji !== '📘' && (!w.pos || posOf(w.pos) === 'n' || HUMAN.test(w.emoji))));
  g.Distract = { pick, picOk, shuffle, nearSynonym, sameFamily, overlap, posOf, rng, hash };
})(typeof window !== 'undefined' ? window : globalThis);
