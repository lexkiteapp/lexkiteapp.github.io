// IPA từ Wiktionary qua kaikki.org (CC BY-SA 4.0, ghi công) – dùng chung cho job.mjs và hiệu chuẩn espeak (espeak-calib.mjs).
import { fixBroken } from '../ipa.mjs';
const KPOS = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv' };
// mã ngôn ngữ Wiktionary → mã kho (zh = Quan thoại giản thể); dấu trọng âm tiếng Nga + harakat Ả Rập bỏ (đồng nhất với kho)
const TRL = { es: 'es', pt: 'pt', fr: 'fr', de: 'de', id: 'id', th: 'th', cmn: 'zh', zh: 'zh', ja: 'ja', ko: 'ko', hi: 'hi', ar: 'ar', ru: 'ru', tr: 'tr', vi: 'vi' };
export const trWord = (w, l) => { w = String(w || '').trim(); if (l === 'zh' && w.includes('/')) w = w.split('/').pop().trim();
  if (l === 'ru') w = w.normalize('NFD').replace(/\u0301/g, '').normalize('NFC'); if (l === 'ar') w = w.replace(/[\u064B-\u0652\u0670]/g, '');
  return /[()\[\]=]|^-|-$/.test(w) || w.split(/\s+/).length > 4 ? '' : w; };
export async function kaikki(w, pos, stat = {}) {
  const u = `https://kaikki.org/dictionary/English/meaning/${w[0]}/${w.slice(0, 2)}/${encodeURIComponent(w)}.jsonl`;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'lexkite-lexicon-expand (lexkite.com)' } }); if (r.status === 404) return {}; if (!r.ok) throw 0; stat.kaikki = (stat.kaikki || 0) + 1;
      const ents = (await r.text()).split('\n').filter(Boolean).map(x => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      // âm THEO TỪ LOẠI: âm gắn nhãn từ loại này (tags noun/verb…) → âm của mục cùng từ loại không gắn nhãn từ loại khác → mục khác
      const PT = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' }, ALLP = Object.values(PT), me = PT[pos];
      const snd = [];
      for (const e of [...ents.filter(e => e.pos === KPOS[pos]), ...ents.filter(e => e.pos !== KPOS[pos])]) for (const s of e.sounds || []) if (s.ipa) {
        const tg = s.tags || [], tp = tg.filter(t => ALLP.includes(t)); if (tp.length && !tp.includes(me)) continue;
        snd.push({ ipa: s.ipa, tg, rank: tp.includes(me) ? 0 : e.pos === KPOS[pos] ? 1 : 2 });
      }
      snd.sort((a, b) => a.rank - b.rank);
      const all = re => snd.filter(s => s.tg.some(t => re.test(t))), UKR = /^(Received-Pronunciation|UK|British|England)$/, USR = /^(General-American|US)$/;
      // nghĩa tiếng Việt Wiktionary (CC BY-SA) cùng từ loại – để đối chiếu vi (job.mjs viCheck)
      const vi = [], seen = new Set();
      for (const e of ents.filter(e => e.pos === KPOS[pos])) for (const t of [...(e.translations || []), ...(e.senses || []).flatMap(s => (s.translations || []).map(x => ({ ...x, sense: x.sense || (s.glosses || [])[0] })))])
        if ((t.lang_code === 'vi' || t.code === 'vi') && t.word && !seen.has(t.word)) { seen.add(t.word); vi.push({ w: t.word, sense: String(t.sense || '').slice(0, 60) }); }
      // NGUỒN NGƯỜI VIẾT (source-first 24/10): ví dụ dùng của Wiktionary (type example, KHÔNG trích dẫn văn học có ref) + bảng dịch theo nghĩa (nhóm theo gloss của bảng dịch)
      const mine = ents.filter(e => e.pos === KPOS[pos]), exs = [], trg = new Map();
      for (const e of mine) for (const s of e.senses || []) for (const x of s.examples || []) { const t = String(x.text || '').replace(/\s+/g, ' ').trim();
        if (!t || x.ref || (x.type && x.type !== 'example') || t.split(' ').length > 22 || /[“”"]|\d{3,}|^\W/.test(t)) continue; exs.push({ t, g: String((s.glosses || [])[0] || '').slice(0, 140) }); }
      for (const e of mine) for (const t of [...(e.translations || []), ...(e.senses || []).flatMap(s => (s.translations || []).map(x => ({ ...x, sense: x.sense || (s.glosses || [])[0] })))]) {
        const l = TRL[t.lang_code || t.code]; if (!l || !t.word || (t.tags || []).some(g => /Traditional|archaic|obsolete|dated|rare|slang|vulgar/i.test(g))) continue;
        const g = String(t.sense || '').slice(0, 120), grp = trg.get(g) || trg.set(g, { g, tr: {} }).get(g), w = trWord(t.word, l);
        if (w && !(grp.tr[l] = grp.tr[l] || []).includes(w) && grp.tr[l].length < 2) grp.tr[l].push(w); } // ≤ 2 từ/ngôn ngữ: từ sau trong bảng hay là từ hiếm (testuz, お凸)
      return { g1: mine.flatMap(e => (e.senses || []).map(s => String((s.glosses || [])[0] || ''))).filter(Boolean).slice(0, 3), exs: exs.slice(0, 8), trg: [...trg.values()].filter(x => Object.keys(x.tr).length >= 2).slice(0, 8),
        uk: (all(UKR)[0] || {}).ipa || '', us: (all(USR)[0] || {}).ipa || '', ukAll: all(UKR).map(s => s.ipa), ukNoRegion: snd.filter(s => !s.tg.some(t => UKR.test(t) || USR.test(t) || /^(US|Canada|Australia|Scotland|Ireland|Northern-England|archaic)$/.test(t))).map(s => s.ipa), vi };
    } catch { await new Promise(s => setTimeout(s, 1500 * (i + 1))); }
  }
  return {};
}
// /…/ đầu tiên → quy ước kho. Pilot 40077853589: bản cũ đổi ɡ → g (ngoài bảng) và bỏ sót t͡ʃ, ̯, ̩ → 40 mục trượt IPA oan.
export const clean = s => { s = String(s || '').trim(); const m = /^\/[^/]+\//.exec(s); if (!m) return '';
  return fixBroken(m[0].replace(/\./g, '').replace(/ɹ/g, 'r').replace(/ɫ/g, 'l').replace(/ɐ/g, 'ʌ').replace(/ɜ(?!ː)/g, 'ɜː').replace(/[̩̯̍͜͡˞]/g, '').replace(/ɚ/g, 'ə').replace(/ɝ/g, 'ɜː')); };
export async function pmap(list, n, f) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const k = i++; out[k] = await f(list[k], k); } })); return out; }
