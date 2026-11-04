/* 💬 Chữ chạy theo lời nói – tải lười cùng Hôm nay, bài học, Call (js/app.js); cổng scripts/test/say-text.mjs, docs/CHARACTERS.md. */
(function (g) {
  const css = () => { if (document.getElementById('saytext-css')) return; const s = document.createElement('style'); s.id = 'saytext-css'; s.textContent = '.sw{opacity:0;transition:opacity .14s linear}.sw.on{opacity:1}'; document.head.appendChild(s); };
  // Chia theo TỪ (giữ dấu tiếng Việt, nét nối Ả Rập/Hindi); chữ chờ chỉ mờ, không xô bố cục. Tiếng lỗi/bị chặn → hiện hết.
  const sayOff = () => { try { const c = navigator.connection; if (g.matchMedia('(prefers-reduced-motion: reduce)').matches || (c && (c.saveData || /2g/.test(c.effectiveType || '')))) return true; return !!navigator.webdriver && localStorage.getItem('lk.saytext') !== '1'; } catch (e) { return true; } };
  const NOSPACE = /[฀-๿぀-ヿ㐀-鿿]/; // chữ viết liền: Intl.Segmenter
  const toks = (s, lang) => {
    if (!(NOSPACE.test(s) && g.Intl && Intl.Segmenter)) return s.match(/\s+|\S+/g) || [];
    const out = []; for (const x of new Intl.Segmenter(lang || undefined, { granularity: 'word' }).segment(s)) { if (x.isWordLike || !out.length || /\s/.test(x.segment)) out.push(x.segment); else out[out.length - 1] += x.segment; } return out;
  };
  const wrap = (el, skip) => {
    if (el.querySelector('.sw')) return [...el.querySelectorAll('.sw')].map(w => (w.classList.remove('on'), w));
    const W = [], tw = document.createTreeWalker(el, 4), nodes = []; while (tw.nextNode()) if (!(skip && tw.currentNode.parentElement.closest(skip))) nodes.push(tw.currentNode);
    for (const n of nodes) { const f = document.createDocumentFragment(); for (const x of toks(n.nodeValue, el.lang || document.documentElement.lang)) { if (/^\s+$/.test(x)) { f.append(x); continue; } const m = document.createElement('span'); m.className = 'sw'; m.textContent = x; W.push(m); f.append(m); } n.replaceWith(f); }
    return W;
  };
  const weight = s => [...s].length + 1 + (/[.!?…。！？][”"')]*$/.test(s) ? 8 : /[,;:，、][”"')]*$/.test(s) ? 4 : 0);
  // cue = LipSync.unpack(...): chỉ tính lúc có tiếng → từ đi cùng nhịp miệng
  const timeline = cue => { const V = []; let tot = 0; for (const c of (cue && cue.cues) || []) if (c.value !== 'X' || c.end - c.start < 0.12) { V.push([c.start, c.end, tot]); tot += c.end - c.start; }
    return tot ? t => { let p = 0; for (const [a, b, s] of V) { if (t < a) break; p = s + Math.min(t, b) - a; } return p / tot; } : null; };
  g.SayText = {
    // o.wait: ms chờ rồi tự hiện hết (0 = người gọi lo); null khi tắt hiệu ứng
    prep(els, o = {}) {
      if (sayOff()) return null;
      css();
      const W = [].concat(els).filter(Boolean).map(e => wrap(e, o.skip)).filter(a => a.length); if (!W.length) return null;
      const lists = W.map(a => { let c = 0; const cum = a.map(x => (c += weight(x.textContent))); return { a, cum, tot: c || 1 }; });
      let raf = 0, wd = 0, done = false;
      const halt = () => { clearTimeout(raf); clearTimeout(wd); raf = wd = 0; };
      const later = f => { raf = setTimeout(() => f(performance.now()), 40); }; // không rAF: tab ẩn thì rAF dừng, chữ kẹt mờ
      const seek = p => { for (const L of lists) L.a.forEach((x, i) => { if (p >= (i ? L.cum[i - 1] : 0) / L.tot) x.classList.add('on'); }); };
      const ctl = {
        est: lists[0].tot,
        all() { if (done) return; done = true; halt(); for (const L of lists) for (const x of L.a) x.classList.add('on'); if (ctl.onDone) ctl.onDone(); },
        clock(ms, onDone) { if (done) return; halt(); ctl.onDone = onDone; const t0 = performance.now(), f = now => { const p = (now - t0) / ms; if (p >= 1 || !W[0][0].isConnected) return ctl.all(); seek(p); later(f); }; seek(0); later(f); },
        audio(a, cue) { if (done) return; halt(); const tl = timeline(cue), t0 = performance.now(), cap = ctl.est * 175 + 2500, f = now => { const el = now - t0, t = a.currentTime || 0, d = (cue && cue.dur) || a.duration;
          if (a.ended || el > cap || (t === 0 && el > 2500) || !W[0][0].isConnected) return ctl.all();
          if (t > 0 && d > 0) seek(tl ? tl(t + 0.06) : t / d); later(f); }; later(f); },
      };
      if (o.wait !== 0) wd = setTimeout(() => ctl.all(), o.wait || 1500);
      return ctl;
    },
  };
})(self);
