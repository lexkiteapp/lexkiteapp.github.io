// Thư viện gói luyện tập ngôn ngữ đích (es W2b, fr W2): dựng dữ liệu (câu điền từ + bài chia động từ sinh từ bộ chia của tl) – dùng bởi drill-pack.mjs và corpus âm thanh.
// MỘT engine cho mọi tl: mọi thứ riêng ngôn ngữ (thư mục, biến toàn cục gói, bộ chia, động từ theo cấp, tên thì, đại từ) ở bảng TLP – không nhánh `if (tl)`.
import { readJSON } from './lib.mjs';
import * as ES from './conjugate.mjs';
import * as FR from './conj-fr.mjs';
const { form, conjugate, TENSES } = ES;
import { buildPx } from './px-lib.mjs';
import { buildExam } from './exam-es-lib.mjs';
import { buildPath } from './path-lib.mjs';

export const D = 'content/target/es/', LV = ['A1', 'A2', 'B1'];
// Cấp mở cho người học: A1–B1 luôn có; B2 (và các cấp sau) mở khi MỌI điểm ngữ pháp của cấp đó đã có câu điền từ (drills.json) – dữ liệu tl nào sẵn sàng thì cấp đó tự hiện (khung chung, không cờ riêng)
export const levelsOf = (inv, cloze) => [...LV, ...['B2'].filter(l => { const ps = inv.filter(p => p.level === l); return ps.length && ps.every(p => (cloze[p.id] || []).length); })];
export const GX_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const VERBAL = new Set(['verb', 'mood', 'sereestar', 'modal', 'cond']);
const VERBS = {
  A1: 'ser estar tener hacer ir querer poder comer beber hablar vivir ver dar decir venir'.split(' '),
  A2: 'saber poner salir volver pedir dormir pensar conocer llamar empezar seguir sentir'.split(' '),
  B1: 'traer oír construir leer conducir elegir mantener conseguir proponer resolver'.split(' '),
};
const TN = { pres: 'presente', pret: 'pretérito', impf: 'imperfecto', fut: 'futuro', cond: 'condicional', subj: 'presente de subjuntivo', subjImpf: 'imperfecto de subjuntivo', subjFut: 'futuro de subjuntivo',
  imp: 'imperativo', ger: 'gerundio', part: 'participio', perf: 'pretérito perfecto', plup: 'pluscuamperfecto', futPerf: 'futuro perfecto', condPerf: 'condicional perfecto',
  subjPerf: 'pretérito perfecto de subjuntivo', subjPlup: 'pluscuamperfecto de subjuntivo', pretAnt: 'pretérito anterior', prog: 'presente progresivo', irA: 'ir a + infinitivo' };
const PRON = ['yo', 'tú', 'él', 'nosotros', 'ellos'], IMPP = [['tu', 'tú'], ['usted', 'usted'], ['nos', 'nosotros'], ['ustedes', 'ustedes']];
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// fr (french-course.md W2): 6 ngôi, je → j' trước nguyên âm/h câm; mệnh lệnh không đại từ (nhãn ngôi trong ngoặc như sách); tên thì bằng tiếng Pháp
const FR_TN = { pres: 'présent', impf: 'imparfait', ps: 'passé simple', fut: 'futur simple', cond: 'conditionnel présent', subj: 'subjonctif présent', subjImpf: 'subjonctif imparfait', imp: 'impératif', part: 'participe passé', ppres: 'participe présent',
  pc: 'passé composé', plup: 'plus-que-parfait', pa: 'passé antérieur', futAnt: 'futur antérieur', condPasse: 'conditionnel passé', subjPasse: 'subjonctif passé', futProche: 'futur proche', passeRecent: 'passé récent' };
const frPron = (i, ans) => (i === 0 && /^[aeiouyéèêâîôœh]/i.test(ans) && !/^ha[ïrs]/i.test(ans) ? "j'" : ['je ', 'tu ', 'il ', 'nous ', 'vous ', 'ils '][i]);
export const TLP = {
  es: { tl: 'es', path: true, D: 'content/target/es/', OUT: 'web/cpack/es/', G: 'ESX', C: ES, n: 5, px: true, VERBAL: new Set(['verb', 'mood', 'sereestar', 'modal', 'cond']), VERBS, TN, PRON: i => PRON[i] + ' ', IMPP, extra: true },
  fr: { tl: 'fr', path: true, D: 'content/target/fr/', OUT: 'web/cpack/fr/', G: 'FRX', C: FR, n: 6, px: true, VERBAL: new Set(['verb', 'mood', 'etreavoir', 'modal', 'cond', 'passive']),
    VERBS: { A1: 'être avoir aller faire parler aimer habiter manger finir prendre venir vouloir pouvoir voir'.split(' '),
      A2: 'partir sortir dormir savoir mettre dire lire écrire boire choisir attendre appeler acheter commencer'.split(' '),
      B1: 'connaître recevoir devoir croire vivre suivre ouvrir conduire peindre envoyer préférer réussir'.split(' ') },
    TN: FR_TN, PRON: frPron, IMPP: [['tu', 'tu'], ['nous', 'nous'], ['vous', 'vous']], imp: true, exam: true },
};

function conjItems(pts, T = TLP.es, lvs = LV) {
  const out = Object.fromEntries(lvs.map(l => [l, []])), { form, conjugate, TENSES } = T.C;
  for (const p of pts) {
    if (!lvs.includes(p.level) || !T.VERBAL.has(p.area)) continue;
    const ts = (p.tenses || []).filter(t => TENSES.includes(t) && t !== 'impNeg').slice(0, 2); if (!ts.length) continue;
    const vs = T.VERBS[p.level] || T.VERBS.B1, h = hash(p.id); // B2: dùng bộ động từ B1 (khung chung, đủ dạng chia)
    for (let k = 0; k < 3; k++) {
      const t = ts[k % ts.length];
      let v = vs[(h + k * 4) % vs.length], pron, ans;
      for (let j = 0; j < vs.length && /^-?$/.test(t === 'imp' ? conjugate(v).imp[T.IMPP[(h + k) % T.IMPP.length][0]] : [].concat(form(v, t))[0] || ''); j++) v = vs[(h + k * 4 + j + 1) % vs.length]; // fr: bỏ động từ không có ô (pouvoir/devoir không có mệnh lệnh)
      if (t === 'imp') { const [key, lab] = T.IMPP[(h + k) % T.IMPP.length]; ans = conjugate(v).imp[key]; pron = T.imp ? '' : lab + ' '; if (T.imp) { out[p.level].push(['c', p.id, `___ (${v}, ${lab})`, ans, T.TN[t]]); continue; } }
      else if (t === 'ger' || t === 'part' || t === 'ppres') { pron = ''; ans = form(v, t); }
      else { const i = (h + k * 2) % T.n; ans = form(v, t)[i]; pron = T.PRON(i, ans); }
      out[p.level].push(['c', p.id, `${pron}___ (${v})`, ans, T.TN[t]]);
    }
  }
  return out;
}

export function build(tl = 'es') {
  const T = TLP[tl], D = T.D, X = T.G, inv = readJSON(D + 'grammar-inventory.json').points, cloze = readJSON(D + 'drills.json').cloze, files = {};
  const lvs = levelsOf(inv, cloze), pts = inv.filter(p => lvs.includes(p.level)), c = conjItems(inv, T, lvs), dr = Object.fromEntries(lvs.map(l => [l, []]));
  for (const p of pts) for (const it of cloze[p.id] || []) dr[p.level].push(['g', p.id, it.s, it.a, it.o, it.en]);
  for (const l of lvs) dr[l].push(...c[l]);
  files['dr.js'] = `self.${X}=self.${X}||{};${X}.dr=${JSON.stringify(dr)};\n`;
  for (const l of GX_LANGS) {
    const src = readJSON(`${D}gx/${l}.json`), o = {};
    for (const p of pts) if (src[p.id]) o[p.id] = [src[p.id].t, src[p.id].x];
    files[`gx-${l}.js`] = `self.${X}=self.${X}||{};(${X}.gx=${X}.gx||{})[${JSON.stringify(l)}]=${JSON.stringify(o)};\n`;
  }
  const px = T.px ? buildPx(tl) : null; // W3: gói phát âm của tl (px.js + px-<ngôn ngữ>.js), chủ đề dùng cho bước phát âm của lộ trình
  if (px) Object.assign(files, px.files);
  if (T.extra || T.exam) Object.assign(files, buildExam(tl).files); // W5: es DELE/SIELE · fr DELF/DALF (fr chỉ có gói khi nguồn Tatoeba đã dựng)
  if (T.path) Object.assign(files, buildPath(pts, px ? px.topics : [], T).files); // W4: lộ trình ngày (wd/dy/cl + bản dịch 15 ngôn ngữ) – cùng buildPath cho mọi tl
  return { files, dr, pts, cloze, lvs };
}

// Câu đọc to của một câu hỏi (đáp án điền sẵn; bài chia động từ: bỏ phần "(động từ)") – js/espr.js dùng đúng phép biến đổi này
export const sayText = it => it[2].replace('___', it[3]).replace(/\s*\([^)]*\)/, '');
