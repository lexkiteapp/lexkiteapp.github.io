// Bộ chia động từ tiếng Tây Ban Nha es-419 (spanish-course.md W2) – quy tắc TỰ VIẾT + bảng bất quy tắc, không chép dữ liệu Wiktionary.
// 5 ngôi es-419 (không vosotros, §8): yo · tú · él/usted · nosotros · ellos/ustedes. Kiểm chéo từng dạng với Wiktionary trên CI:
// scripts/target/conj-check.mjs (khớp 100 %, ngoại lệ ghi tay có lý do ở EXCEPT). Không phụ thuộc node → dùng được cả trong web.
// API: conjugate('tener') → { inf, ger, part, pres[5], pret[5], impf[5], fut[5], cond[5], subj[5], subjImpf[5], subjFut[5], imp{tu,usted,nos,ustedes}, impNeg{…} }
//      form('tener', 'perf') → ['he tenido', …] cho mọi khóa TENSES (thì ghép = haber/estar/ir a + dạng phi ngôi).
export const PERSONS = ['yo', 'tú', 'él', 'nosotros', 'ellos'];
export const SIMPLE = ['pres', 'pret', 'impf', 'fut', 'cond', 'subj', 'subjImpf', 'subjFut', 'imp', 'impNeg', 'ger', 'part'];
const COMPOUND = { perf: ['haber', 'pres'], plup: ['haber', 'impf'], futPerf: ['haber', 'fut'], condPerf: ['haber', 'cond'], subjPerf: ['haber', 'subj'], subjPlup: ['haber', 'subjImpf'], pretAnt: ['haber', 'pret'], prog: ['estar', 'pres'], irA: ['ir', 'pres'] };
export const TENSES = [...SIMPLE, ...Object.keys(COMPOUND)];
const IMP = ['tu', 'usted', 'nos', 'ustedes'];

const END = {
  ar: { pres: ['o', 'as', 'a', 'amos', 'an'], pret: ['é', 'aste', 'ó', 'amos', 'aron'], impf: ['aba', 'abas', 'aba', 'ábamos', 'aban'], subj: ['e', 'es', 'e', 'emos', 'en'] },
  er: { pres: ['o', 'es', 'e', 'emos', 'en'], pret: ['í', 'iste', 'ió', 'imos', 'ieron'], impf: ['ía', 'ías', 'ía', 'íamos', 'ían'], subj: ['a', 'as', 'a', 'amos', 'an'] },
};
END.ir = { ...END.er, pres: ['o', 'es', 'e', 'imos', 'en'] };
const FUT = ['é', 'ás', 'á', 'emos', 'án'], COND = ['ía', 'ías', 'ía', 'íamos', 'ían'];
const BOOT = [0, 1, 2, 4]; // ngôi đổi gốc ở hiện tại (dạng "chiếc ủng")
const list = s => s.trim().split(/\s+/);

// Lớp đổi gốc (không suy được từ chính tả → bảng). Lớn = ngôi BOOT; nhỏ (-ir) = nosotros giả định, ngôi 3 quá khứ, danh động từ.
const SC = {};
const put = (k, s) => list(s).forEach(v => { SC[v] = k; });
put('e>ie', `pensar empezar comenzar cerrar despertar sentar entender perder querer preferir sentir mentir divertir convertir advertir sugerir hervir
  defender encender recomendar negar nevar gobernar atravesar calentar confesar apretar fregar regar tropezar quebrar temblar sembrar manifestar merendar
  ascender descender extender tender atender consentir referir requerir herir invertir digerir interferir transferir inferir discernir verter
  arrepentir mentir desmentir presentir subarrendar acertar enterrar plegar desplegar renegar
  reventar serrar segar cegar asentar alentar comenzar recomenzar escarmentar`);
put('i>ie', 'adquirir inquirir');
put('o>ue', `poder volver dormir morir contar costar encontrar mostrar probar recordar soñar sonar volar almorzar acostar aprobar colgar demostrar
  devolver envolver resolver mover llover doler soler morder torcer cocer rogar forzar esforzar renovar acordar consolar tostar promover absolver
  disolver revolver remover conmover descolgar comprobar reprobar recostar descontar rodar soldar tronar apostar avergonzar`);
put('u>ue', 'jugar');
put('e>i', `pedir servir repetir seguir conseguir perseguir proseguir vestir medir despedir impedir competir elegir corregir rendir gemir expedir
  derretir concebir teñir reñir ceñir desteñir investir revestir desvestir reelegir`);
put('i>í', `enviar confiar desconfiar guiar variar criar enfriar esquiar fiar vaciar ampliar desviar espiar fotografiar resfriar liar averiar
  contrariar ansiar hastiar extraviar porfiar rociar telegrafiar ataviar prohibir cohibir aislar`);
put('u>ú', 'reunir rehusar aullar maullar aunar');
const SMALL = { 'e>ie': 'e>i', 'e>i': 'e>i', 'o>ue': 'o>u' };
const STRONGV = /[aeo]/;
// đổi nguyên âm CUỐI của gốc (bỏ qua u câm sau g/q: segu-, jug-)
function change(stem, rule) {
  if (!rule) return stem;
  const [a, b] = rule.split('>');
  for (let i = stem.length - 1; i >= 0; i--) {
    if (stem[i] === 'u' && /[gq]/.test(stem[i - 1] || '') && rule !== 'u>ue') continue;
    if (stem[i] === a) {
      let r = b;
      if (rule === 'o>ue' && i === 0) r = 'hue'; // oler → huelo
      if (rule === 'o>ue' && stem[i - 1] === 'g') r = 'üe'; // avergonzar → avergüenzo
      if (rule === 'u>ue' && /g$/.test(stem.slice(0, i))) r = 'ue';
      return stem.slice(0, i) + r + stem.slice(i + 1);
    }
    if (/[aeiou]/.test(stem[i]) && !(rule === 'i>í' || rule === 'u>ú')) return stem; // nguyên âm cuối khác → không đổi
  }
  return stem;
}
// -ar: giữ âm trước e (c→qu, g→gu, gu→gü, z→c)
const fixAr = (s, e) => !/^[eé]/.test(e) ? s + e : s.replace(/gu$/, 'gü').replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c') + e;
const VOWEL_END = /[aeo]$/; // gốc tận cùng nguyên âm mạnh: le-er, ca-er, o-ír, cre-er
// gốc trước đuôi -o/-a (yo hiện tại + giả định): -cer/-cir, -ger/-gir, -guir, -uir
function yoStem(inf, s) {
  if (/[aeiouáéíóú]c[ei]r$/.test(inf) && !NO_ZC.has(inf)) return s.replace(/c$/, 'zc');
  if (/c[ei]r$/.test(inf)) return s.replace(/c$/, 'z');
  if (/guir$/.test(inf)) return s.replace(/gu$/, 'g');
  if (/qu[ei]r$/.test(inf)) return s.replace(/qu$/, 'c');
  if (/g[ei]r$/.test(inf)) return s.replace(/g$/, 'j');
  if (/[^gq]uir$/.test(inf)) return s + 'y';
  return s;
}
const NO_ZC = new Set(list('hacer deshacer rehacer decir cocer recocer mecer'));
const strip = s => s.normalize('NFD').replace(/[́]/g, '').normalize('NFC');
const ACC = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const accLastVowel = s => { const m = /[aeiou](?=[^aeiou]*$)/.exec(s); return m ? s.slice(0, m.index) + ACC[m[0]] + s.slice(m.index + 1) : s; };

// Bảng bất quy tắc (một nguồn): yo = gốc yo đặc biệt (giả định đi theo), ps = gốc quá khứ mạnh, fs = gốc tương lai, impTu, part, ger, hoặc cả dãy.
const IRR = {
  ser: { pres: list('soy eres es somos son'), pret: list('fui fuiste fue fuimos fueron'), impf: list('era eras era éramos eran'), subj: list('sea seas sea seamos sean'), impTu: 'sé', ger: 'siendo' },
  ir: { pres: list('voy vas va vamos van'), pret: list('fui fuiste fue fuimos fueron'), impf: list('iba ibas iba íbamos iban'), subj: list('vaya vayas vaya vayamos vayan'), impTu: 've', impNos: 'vamos', ger: 'yendo' },
  estar: { pres: list('estoy estás está estamos están'), ps: 'estuv', subj: list('esté estés esté estemos estén') },
  dar: { pres: list('doy das da damos dan'), pret: list('di diste dio dimos dieron'), subj: list('dé des dé demos den') },
  haber: { pres: list('he has ha hemos han'), ps: 'hub', fs: 'habr', impTu: 'he', subj: list('haya hayas haya hayamos hayan') },
  saber: { yo: 'sé', ps: 'sup', fs: 'sabr', subjStem: 'sep' },
  caber: { yo: 'quepo', ps: 'cup', fs: 'cabr' },
  tener: { yo: 'tengo', ps: 'tuv', fs: 'tendr', impTu: 'ten', sc: 'e>ie' },
  venir: { yo: 'vengo', ps: 'vin', fs: 'vendr', impTu: 'ven', sc: 'e>ie', small: 'e>i' },
  poner: { yo: 'pongo', ps: 'pus', fs: 'pondr', impTu: 'pon', part: 'puesto' },
  salir: { yo: 'salgo', fs: 'saldr', impTu: 'sal' },
  valer: { yo: 'valgo', fs: 'valdr' },
  hacer: { yo: 'hago', ps: 'hic', fs: 'har', impTu: 'haz', part: 'hecho' },
  decir: { yo: 'digo', ps: 'dij', fs: 'dir', impTu: 'di', part: 'dicho', sc: 'e>i' },
  traer: { yo: 'traigo', ps: 'traj' },
  caer: { yo: 'caigo' },
  oír: { pres: list('oigo oyes oye oímos oyen'), yo: 'oigo' },
  reír: { pres: list('río ríes ríe reímos ríen'), pret: list('reí reíste rio reímos rieron'), subj: list('ría rías ría riamos rían'), ger: 'riendo', part: 'reído' },
  freír: { pres: list('frío fríes fríe freímos fríen'), pret: list('freí freíste frio freímos frieron'), subj: list('fría frías fría friamos frían'), ger: 'friendo', part: 'frito' },
  oler: { sc: 'o>ue' },
  querer: { ps: 'quis', fs: 'querr' },
  poder: { ps: 'pud', fs: 'podr', ger: 'pudiendo' },
  andar: { ps: 'anduv' },
  ver: { yo: 'veo', impf: list('veía veías veía veíamos veían'), pret: list('vi viste vio vimos vieron'), part: 'visto' },
  morir: { part: 'muerto' }, abrir: { part: 'abierto' }, cubrir: { part: 'cubierto' }, descubrir: { part: 'descubierto' }, escribir: { part: 'escrito' },
  describir: { part: 'descrito' }, inscribir: { part: 'inscrito' }, suscribir: { part: 'suscrito' }, romper: { part: 'roto' }, imprimir: { part: 'impreso' },
  volver: { part: 'vuelto' }, devolver: { part: 'devuelto' }, envolver: { part: 'envuelto' }, revolver: { part: 'revuelto' }, resolver: { part: 'resuelto' },
  disolver: { part: 'disuelto' }, absolver: { part: 'absuelto' }, proveer: { part: 'provisto' },
  discernir: { small: null }, // e>ie nhưng không đổi nhỏ: discernió, discerniendo
  guiar: { mono: true }, fiar: { mono: true }, criar: { mono: true }, liar: { mono: true },
  bendecir: { yo: 'bendigo', ps: 'bendij', impTu: 'bendice', sc: 'e>i' }, maldecir: { yo: 'maldigo', ps: 'maldij', impTu: 'maldice', sc: 'e>i' },
};
// Động từ ghép = tiền tố + gốc bất quy tắc (dạng đơn âm tiết nhận dấu: mantén, compón, prevé, previó)
const COMP = {
  tener: 'man ob con de sos re entre a abs', poner: 'com su pro ex im dis o re pos ante descom indis predis presu', venir: 'con inter pre pro sobre de',
  hacer: 'des re', decir: 'pre contra des', traer: 'a dis con ex re sus abs', ver: 'pre entre', salir: 'sobre', valer: 'equi', reír: 'son',
};
const COMPOUNDS = {};
for (const [b, ps] of Object.entries(COMP)) for (const p of list(ps)) COMPOUNDS[p + b] = [p, b];
COMPOUNDS.satisfacer = ['satis', 'hacer', f => f.replace(/^h/, 'f')]; // satisfago, satisfice, satisfizo, satisfaré, satisfecho

const oneSyl = f => { const g = f.match(/[aeiouáéíóúü]+/g) || []; return g.length === 1 && !/[aeoáéó][aeoáéó]/.test(g[0]); };
const accentOne = f => { if (/[áéíóú]/.test(f) || !/[aeiouns]$/.test(f)) return f; const m = /[aeo]/.exec(f) || /[iu](?=[^iu]*$)/.exec(f); return f.slice(0, m.index) + ACC[m[0]] + f.slice(m.index + 1); };
function compound(inf) {
  const [p, b, tr = x => x] = COMPOUNDS[inf], B = conjugate(b);
  const map = f => p + (oneSyl(tr(f)) && !/^(di|haz|sal)$/.test(f) ? accentOne(tr(f)) : tr(f));
  const o = { inf };
  for (const k of SIMPLE) o[k] = Array.isArray(B[k]) ? B[k].map(map) : typeof B[k] === 'string' ? map(B[k]) : Object.fromEntries(IMP.map(x => [x, map(B[k][x])]));
  if (b === 'decir') { // predecir/contradecir: tương lai đều, mệnh lệnh tú -dice
    o.fut = FUT.map(e => inf + e); o.cond = COND.map(e => inf + e); o.imp.tu = p + 'dice';
  }
  if (b === 'hacer' && /[aeiou]$/.test(p)) { o.pret[0] = p + 'híce'; o.pret[2] = p + 'hízo'; } // re-hí-ce: hiatus qua h câm → dấu
  return o;
}

export function conjugate(input) {
  const inf = String(input).toLowerCase().trim().replace(/(?<=[aeií]r)se$/, '');
  if (!/^\p{L}*[aeií]r$/u.test(inf)) throw new Error('không phải động từ nguyên mẫu: ' + input);
  if (COMPOUNDS[inf]) return compound(inf);
  const R = IRR[inf] || {}, cls = strip(inf).slice(-2), E = END[cls], s = strip(inf).slice(0, -2);
  const sc = R.sc || SC[inf] || (/[^cg]uar$/.test(inf) ? 'u>ú' : null), small = cls === 'ir' ? ('small' in R ? R.small : SMALL[sc]) : null;
  const big = change(s, sc), sm = change(s, small);
  const vowelStem = VOWEL_END.test(s), uir = /[^gq]u$/.test(s) && cls === 'ir', soft = /(ñ|ll)$/.test(s);
  const o = { inf };

  // hiện tại
  o.pres = R.pres || E.pres.map((e, i) => {
    const st = BOOT.includes(i) ? big : s;
    if (i === 0) return R.yo || (cls === 'ar' ? st + e : yoStem(inf, st) + e);
    if (uir && !/^i/.test(e)) return st + 'y' + e;
    if (vowelStem && cls === 'ir' && /^i/.test(e)) return st + 'í' + e.slice(1); // oímos
    return st + e;
  });
  // giả định hiện tại: gốc yo đặc biệt cho mọi ngôi; còn lại theo ngôi (boot lớn, nosotros -ir đổi nhỏ)
  const special = R.subjStem || (R.yo && R.yo !== 'sé' ? R.yo.replace(/o$/, '') : null);
  o.subj = R.subj || E.subj.map((e, i) => {
    if (special) return special + e;
    const st = BOOT.includes(i) ? big : (small ? sm : s);
    return cls === 'ar' ? fixAr(st, e) : yoStem(inf, st) + e;
  });
  // quá khứ đơn
  if (R.pret) o.pret = R.pret;
  else if (R.ps) {
    const ps = R.ps;
    o.pret = [ps + 'e', ps + 'iste', ps.replace(/c$/, 'z') + 'o', ps + 'imos', ps + (/j$/.test(ps) ? 'eron' : 'ieron')];
  } else if (/ducir$/.test(inf)) {
    const ps = s.replace(/c$/, 'j');
    o.pret = [ps + 'e', ps + 'iste', ps + 'o', ps + 'imos', ps + 'eron'];
  } else o.pret = E.pret.map((e, i) => {
    if (cls === 'ar') { const f = i === 0 ? fixAr(s, e) : s + e; return R.mono && (i === 0 || i === 2) ? strip(f) : f; }
    const st = (i === 2 || i === 4) && small ? sm : s;
    if ((vowelStem || uir) && (i === 2 || i === 4)) return st + e.replace(/^i/, 'y');
    if (soft && (i === 2 || i === 4)) return st + e.replace(/^i/, '');
    if (vowelStem && (i === 1 || i === 3)) return st + 'í' + e.slice(1);
    return st + e;
  });
  o.impf = R.impf || E.impf.map(e => s + e);
  const fs = R.fs || strip(inf);
  o.fut = FUT.map(e => fs + e);
  o.cond = COND.map(e => fs + e);
  const ss = o.pret[4].slice(0, -3); // gốc giả định quá khứ = ellos quá khứ − ron
  o.subjImpf = ['ra', 'ras', 'ra', 'ramos', 'ran'].map((e, i) => (i === 3 ? accLastVowel(ss) : ss) + e);
  o.subjFut = ['re', 'res', 're', 'remos', 'ren'].map((e, i) => (i === 3 ? accLastVowel(ss) : ss) + e); // chỉ để nhận diện (văn luật, thành ngữ)
  o.ger = R.ger || (cls === 'ar' ? s + 'ando' : (vowelStem || uir) ? (small ? sm : s) + 'yendo' : soft ? (small ? sm : s) + 'endo' : (small ? sm : s) + 'iendo');
  o.part = R.part || (cls === 'ar' ? s + 'ado' : vowelStem ? s + 'ído' : s + 'ido');
  o.imp = { tu: R.impTu || o.pres[2], usted: o.subj[2], nos: R.impNos || o.subj[3], ustedes: o.subj[4] };
  o.impNeg = { tu: o.subj[1], usted: o.subj[2], nos: o.subj[3], ustedes: o.subj[4] };
  return o;
}

/** Mọi khóa trong TENSES; thì ghép trả câu "trợ động từ + dạng phi ngôi" theo 5 ngôi. */
export function form(inf, tense) {
  const c = conjugate(inf);
  if (SIMPLE.includes(tense)) return c[tense];
  const k = COMPOUND[tense];
  if (!k) throw new Error('thì lạ: ' + tense);
  const aux = conjugate(k[0])[k[1]];
  return aux.map(a => tense === 'irA' ? `${a} a ${c.inf}` : `${a} ${tense === 'prog' ? c.ger : c.part}`);
}

/** Danh sách động từ bảng quy tắc đã biết (lớp đổi gốc, bất quy tắc, ghép) – conj-check.mjs kiểm chéo toàn bộ trên CI. */
export const KNOWN = [...new Set([...Object.keys(SC), ...Object.keys(IRR), ...Object.keys(COMPOUNDS)].map(v => v.replace(/(?<=[aeií]r)se$/, '')))];
