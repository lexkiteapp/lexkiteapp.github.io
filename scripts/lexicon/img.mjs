// Kiểm content/lexicon/img.json (ảnh minh họa theo nghĩa; mục {h, url (= base+h+.webp, giữ tương thích), alt, sv, q, ph, at, fmt:[avif,webp], x2?, src?, photo?})
// src = {tier: icon|photo|ai, lic: Apache-2.0|Pixabay|Pexels|own, by?, ref?}; h KHÔNG BAO GIỜ là ảnh chụp. photo = {h, fmt, src} riêng (chỉ trang tĩnh /words/ dùng). – dùng bởi build-lexicon (dict-consistency) và scripts/test/vocab-img.mjs.
export function checkImg(img, senses) {
  const bad = [];
  if (!img.style || !/^s\d+$/.test(img.style.v || '')) bad.push('img.json: style.v thiếu/sai');
  if (!/^https:\/\/media\.lexkite\.com\/vimg\/$/.test(img.base || '')) bad.push('img.json: base phải là https://media.lexkite.com/vimg/ (không thêm file vào Pages)');
  for (const [k, e] of Object.entries(img.items || {})) {
    if (!senses.has(k)) bad.push(`img.json ${k}: không có nghĩa này trong kho`);
    // mục CHỈ có photo (ảnh Wikimedia/ảnh chụp cho trang từ điển + /words/, nghĩa chưa có icon/minh hoạ) → không h/url
    const onlyPhoto = e.h === undefined && e.photo !== undefined;
    if (!onlyPhoto && !/^[0-9a-f]{16}$/.test(e.h || '')) bad.push(`img.json ${k}: h sai`);
    if (!onlyPhoto && e.url !== img.base + e.h + '.webp') bad.push(`img.json ${k}: url ≠ base + h + .webp`);
    if (onlyPhoto && ('url' in e || 'q' in e)) bad.push(`img.json ${k}: mục chỉ có photo không được có url/q`);
    if (!e.alt || !String(k).startsWith(e.alt.toLowerCase() + '#') && e.alt !== k.split('#')[0]) bad.push(`img.json ${k}: alt phải là từ của nghĩa`);
    if (!onlyPhoto && (!Array.isArray(e.fmt) || !e.fmt.includes('webp') || e.fmt.some(f => f !== 'avif' && f !== 'webp'))) bad.push(`img.json ${k}: fmt phải là mảng ⊂ [avif, webp] và có webp`);
    if ('x2' in e && typeof e.x2 !== 'boolean') bad.push(`img.json ${k}: x2 phải là boolean (có @2x 768 px)`);
    if (!onlyPhoto && !/^s\d+$/.test(e.sv || '')) bad.push(`img.json ${k}: sv sai`);
    if (!onlyPhoto && (!e.q || typeof e.q.score !== 'number')) bad.push(`img.json ${k}: thiếu điểm QC q.score`);
    bad.push(...checkSrc(e.src, `img.json ${k}: src`, false));
    if (e.src && (e.src.tier === 'photo' || e.src.tier === 'wiki')) bad.push(`img.json ${k}: h là ảnh chụp – ảnh chụp phải nằm ở trường photo riêng`);
    if (e.photo !== undefined) {
      const p = e.photo || {};
      if (!/^[0-9a-f]{16}$/.test(p.h || '') || p.h === e.h) bad.push(`img.json ${k}: photo.h sai (16 hex, khác h)`);
      if (!Array.isArray(p.fmt) || !p.fmt.includes('webp') || p.fmt.some(f => f !== 'avif' && f !== 'webp')) bad.push(`img.json ${k}: photo.fmt phải là mảng ⊂ [avif, webp] và có webp`);
      if (!p.src) bad.push(`img.json ${k}: photo thiếu src (nguồn + giấy phép)`); else bad.push(...checkSrc(p.src, `img.json ${k}: photo.src`, true));
    }
    if ((img.rejected || {})[k]) bad.push(`img.json ${k}: vừa có ảnh vừa bị gỡ (rejected)`);
  }
  return bad;
}

// src = {tier, lic, by?, ref?}: có src thì bắt buộc tier + lic; ảnh chụp (tier photo) bắt buộc by (ghi công) và lic Pixabay|Pexels;
// wiki (Wikimedia Commons qua Wikidata P18) bắt buộc by + ref (trang tệp) và lic CC0|PD|CC BY[-SA] x; icon: Apache-2.0 (Noto) | CC BY-SA 4.0 (OpenMoji)
const TIER = ['icon', 'photo', 'wiki', 'ai'], LIC = ['Apache-2.0', 'CC BY-SA 4.0', 'Pixabay', 'Pexels', 'own'], WLIC = /^(CC0|PD|CC BY(-SA)?( \d(\.\d)?)?)$/;
export function checkSrc(src, at, photo) {
  if (src === undefined) return [];
  const bad = [];
  if (!src || typeof src !== 'object') return [`${at} phải là đối tượng {tier, lic, by?, ref?}`];
  if (!TIER.includes(src.tier)) bad.push(`${at}.tier phải là ${TIER.join('|')}`);
  if (src.tier === 'wiki' ? !WLIC.test(src.lic || '') : !LIC.includes(src.lic)) bad.push(`${at}.lic phải là ${src.tier === 'wiki' ? 'CC0|PD|CC BY[-SA] x' : LIC.join('|')}`);
  if (src.tier === 'wiki' && !(typeof src.by === 'string' && src.by.trim() && /^https:\/\/commons\.wikimedia\.org\//.test(src.ref || ''))) bad.push(`${at}: ảnh Wikimedia phải có by + ref (trang tệp Commons)`);
  if (src.tier === 'photo' && !(typeof src.by === 'string' && src.by.trim())) bad.push(`${at}: ảnh chụp phải có by (ghi công tác giả)`);
  if (src.tier === 'photo' && !['Pixabay', 'Pexels'].includes(src.lic)) bad.push(`${at}: ảnh chụp chỉ từ Pixabay|Pexels`);
  if (photo && src.tier !== 'photo' && src.tier !== 'wiki') bad.push(`${at}.tier phải là photo|wiki`);
  for (const f of ['by', 'ref']) if (f in src && typeof src[f] !== 'string') bad.push(`${at}.${f} phải là chuỗi`);
  return bad;
}
const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Trang tĩnh /words/ (build-seo-pages): photo nếu có, không thì h (biểu tượng/minh họa) + dòng ghi công "Ảnh: <by> / Pixabay|Pexels" khi hiện ảnh chụp.
// pic = VImg.pic (web/js/vocab-img.js – cùng markup với app). App/add-on KHÔNG dùng hàm này: chỉ mục lexicon-img.json chỉ mang h.
export function seoPic(img, key, alt, label, pic, w = 240) {
  const it = img && img.items && img.items[key]; if (!it) return '';
  const ph = it.photo && it.photo.h && it.photo.src ? it.photo : null, use = ph || it, noAvif = !(use.fmt || []).includes('avif');
  const html = pic(img.base, use.h, ph ? false : it.x2 === true, alt, w, noAvif);
  return ph ? html + `<p class="vcred" style="margin:.25rem 0 0;font-size:12px;opacity:.75">${escH(label)}: ${escH(ph.src.by)} / ${ph.src.tier === 'wiki' ? `<a href="${escH(ph.src.ref)}" rel="nofollow noopener">Wikimedia Commons</a>, ` : ''}${escH(ph.src.lic)}</p>` : html;
}
