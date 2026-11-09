// Chữ → IPA tiếng Tây Ban Nha Mỹ Latinh trung tính (es-419, seseo) theo luật – cùng quy ước IPA với kho từ (core-*.json): ˈ trước âm tiết có trọng âm,
// b/d/g → β/ð/ɣ giữa nguyên âm, ɾ/r, ʝ (ll, y), x (j, ge, gi), ɲ, tʃ; c/z → s. Dùng cho bài phát âm W3 (px-pack.mjs); test es-pron.mjs đối chiếu 424 lemma có sẵn.
const V = 'aeiouáéíóúü', STRONG = 'aeoáéó', ACC = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };
const OBS = 'pbfgtdkc', LIQ = 'lr';
// Tách thành đơn vị: { k:'V'|'C', o: chữ gốc (đã bỏ dấu), s: có dấu nhấn?, p: IPA thô }
function units(w) {
  w = w.toLowerCase().normalize('NFC'); const u = []; let i = 0;
  const C = (o, p, n = o.length) => { u.push({ k: 'C', o, p }); i += n; };
  while (i < w.length) {
    const c = w[i], d = w.slice(i, i + 2), nx = w[i + 1] || '';
    if (V.includes(c)) { u.push({ k: 'V', o: ACC[c] || c, s: !!ACC[c] && c !== 'ü', diaer: c === 'ü', p: ACC[c] || c }); i++; continue; }
    if (d === 'ch') C('ch', 'tʃ', 2); else if (d === 'll') C('ll', 'ʝ', 2); else if (d === 'rr') C('rr', 'r', 2);
    else if (c === 'q' && nx === 'u') C('q', 'k', 2);
    else if (c === 'g' && nx === 'u' && 'eiéí'.includes(w[i + 2] || '#')) C('g', 'g', 2);
    else if (c === 'g' && 'eiéí'.includes(nx)) C('g', 'x', 1);
    else if (c === 'c') C('c', 'eiéí'.includes(nx) ? 's' : 'k', 1);
    else if (c === 'z') C('z', 's'); else if (c === 'j') C('j', 'x'); else if (c === 'ñ') C('ñ', 'ɲ'); else if (c === 'h') { i++; }
    else if (c === 'v') C('v', 'b'); else if (c === 'y') { const last = i === w.length - 1 || !V.includes(nx); if (last) { u.push({ k: 'V', o: 'i', p: 'i', y: true }); i++; } else C('y', 'ʝ'); }
    else if (c === 'x') { C('x', 'ks'); } else if (c === 'w') { u.push({ k: 'V', o: 'u', p: 'w', glide: true }); i++; }
    else C(c, c);
  }
  return u;
}
function syllables(u) {
  const S = []; let cur = [], i = 0; const n = u.length;
  const isV = k => k && k.k === 'V';
  // chia theo nhân nguyên âm: gom nguyên âm liền nhau thành 1 nhân nếu là song âm (yếu không dấu cạnh bất kỳ), tách nếu hiatus
  const nuclei = []; for (let j = 0; j < n;) { if (!isV(u[j])) { j++; continue; } let e = j + 1; while (isV(u[e])) { const a = u[e - 1], b = u[e]; const wa = 'iu'.includes(a.o) && !a.s, wb = 'iu'.includes(b.o) && !b.s; if ((wa || wb) && !a.diaer0) e++; else break; } nuclei.push([j, e]); j = e; }
  // onset/coda giữa các nhân
  const cuts = [0];
  for (let k = 1; k < nuclei.length; k++) {
    const a = nuclei[k - 1][1], b = nuclei[k][0], m = b - a; // m phụ âm giữa
    let cut = a; if (m === 1) cut = a; else if (m === 2) { const x = u[a].o, y = u[a + 1].o; cut = OBS.includes(x[0]) && x !== 'ch' && LIQ.includes(y) && x !== 'rr' ? a : a + 1; if (x === 'll' || x === 'ch' || x === 'rr') cut = a; } else if (m >= 3) { const x = u[b - 2].o, y = u[b - 1].o; cut = OBS.includes(x[0]) && LIQ.includes(y) ? b - 2 : b - 1; } else cut = a;
    cuts.push(cut);
  }
  cuts.push(n); for (let k = 0; k < cuts.length - 1; k++) S.push(u.slice(cuts[k], cuts[k + 1]));
  return S;
}
export function ipa(word) {
  const u = units(word), S = syllables(u); if (!S.length) return '';
  let st = S.findIndex(s => s.some(x => x.s)); // dấu nhấn viết
  if (st < 0) { const l = u[u.length - 1], endsVNS = l.k === 'V' || l.o === 'n' || l.o === 's'; st = S.length === 1 ? 0 : endsVNS ? S.length - 2 : S.length - 1; }
  // nguyên âm yếu trong song âm → bán nguyên âm
  S.forEach(s => { const vs = s.filter(x => x.k === 'V'); if (vs.length > 1) { const main = vs.find(x => STRONG.includes(x.o) || x.s) || vs[vs.length - 1]; vs.forEach(x => { if (x !== main && !x.s) x.p = x.o === 'i' ? 'j' : 'w'; }); } });
  let out = '', prev = '';
  S.forEach((s, si) => {
    if (si === st) out += 'ˈ';
    s.forEach((x, xi) => {
      let p = x.p; const pv = prev;
      const stopCtx = (set) => pv === '' || set.includes(pv);
      if (x.k === 'C') {
        if (x.o === 'b' || x.o === 'v') p = stopCtx('mn') ? 'b' : 'β';
        else if (x.o === 'd') p = stopCtx('nl') || xi === s.length - 1 && si === S.length - 1 ? 'd' : 'ð'; // d cuối từ: espeak ghi /d/
        else if (x.o === 'g' && p === 'g') p = stopCtx('n') ? 'ɡ' : 'ɣ';
        else if (x.o === 'rr') p = 'r';
        else if (x.o === 'r') p = (pv === '' || 'nls'.includes(pv)) && xi === 0 ? 'r' : 'ɾ';
        else if (x.o === 'y') p = 'ʝ';
      }
      out += p; prev = x.k === 'C' ? p.slice(-1) : 'a';
    });
  });
  return out;
}

// Cụm nhiều từ: từ chức năng ngắn mất trọng âm, nguyên âm cuối từ trước + nguyên âm đầu từ sau → nối âm (‿)
const CLITIC = new Set('la el los las mi tu de un una a en y que se me te lo al del su con por'.split(' '));
export function ipaText(text) {
  const ws = String(text).trim().split(/\s+/); if (ws.length === 1) return ipa(ws[0]);
  const parts = ws.map(w => { const p = ipa(w); return CLITIC.has(w.toLowerCase()) ? p.replace('ˈ', '') : p; });
  return parts.reduce((a, p, i) => i === 0 ? p : a + (/[aeiouwj]$/.test(a) && /^ˈ?[aeiou]/.test(p) ? '‿' : ' ') + p, '');
}
