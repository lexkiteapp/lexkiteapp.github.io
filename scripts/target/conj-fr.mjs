// Bộ chia động từ tiếng Pháp chuẩn (french-course.md §2, W2) – quy tắc TỰ VIẾT + bảng dạng gốc của động từ bất quy tắc, không chép dữ liệu Wiktionary.
// Cùng API với bộ chia es (scripts/target/conjugate.mjs → CONJ.fr): 6 ngôi je · tu · il · nous · vous · ils. Kiểm chéo từng ô với Wiktionary trên CI:
// scripts/target/conj-check.mjs --tl fr (khớp 100 %, ngoại lệ ghi tay có lý do ở EXCEPT). Không phụ thuộc node → dùng được cả trong web.
// API: conjugate('venir') → { inf, aux, part, ppres, pres[6], impf[6], ps[6], fut[6], cond[6], subj[6], subjImpf[6], imp{tu,nous,vous} }
//      form('venir', 'pc') → ['suis venu', …] cho mọi khóa TENSES (thì ghép = avoir/être + phân từ, có hợp giống-số mặc định giống đực; futProche = aller + nguyên mẫu).
// Chính tả truyền thống (connaître, il paraît, préférerai) – dạng chỉnh 1990 Wiktionary ghi kèm cũng khớp vì so trong tập dạng.
export const PERSONS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
export const SIMPLE = ['pres', 'impf', 'ps', 'fut', 'cond', 'subj', 'subjImpf', 'imp', 'part', 'ppres'];
const COMPOUND = { pc: 'pres', plup: 'impf', pa: 'ps', futAnt: 'fut', condPasse: 'cond', subjPasse: 'subj' };
export const TENSES = [...SIMPLE, ...Object.keys(COMPOUND), 'futProche', 'passeRecent'];
const list = s => s.trim().split(/\s+/);
const PS = { a: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'], i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'], u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'], in: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent'] };
const SI = { a: ['asse', 'asses', 'ât', 'assions', 'assiez', 'assent'], i: ['isse', 'isses', 'ît', 'issions', 'issiez', 'issent'], u: ['usse', 'usses', 'ût', 'ussions', 'ussiez', 'ussent'], in: ['insse', 'insses', 'înt', 'inssions', 'inssiez', 'inssent'] };
const FUT = ['ai', 'as', 'a', 'ons', 'ez', 'ont'], COND = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'], IMPF = COND, SUBJ = ['e', 'es', 'e', 'ions', 'iez', 'ent'];

// Động từ trợ "être" (DR MRS VANDERTRAMP + phái sinh); còn lại "avoir". Động từ phản thân (se …) luôn "être" – xử lý ở conjugate().
const ETRE = new Set(list('aller venir arriver partir entrer sortir monter descendre naître mourir rester tomber retourner devenir revenir rentrer repartir parvenir intervenir survenir redescendre ressortir décéder advenir provenir renaître souvenir' +
  ' évanouir enfuir envoler efforcer absenter abstenir écrier emparer méfier repentir')); // động từ chỉ dùng dạng phản thân (s'évanouir…): bỏ "s'" vẫn chia với être như Wiktionary
// Nhóm 1 đổi gốc: e + phụ âm + er → è trước âm câm (acheter); é + phụ âm + er → è (préférer); -eler/-eter nhân đôi phụ âm (appeler, jeter)
const DOUBLE = new Set(list('appeler rappeler épeler renouveler jeter rejeter projeter feuilleter étiqueter ficeler chanceler'));
// Nhóm 3 kiểu "partir": số ít bỏ phụ âm cuối của gốc (pars, dors, sens, sers, mens)
const PARTIR = new Set(list('partir sortir dormir sentir servir mentir repartir ressortir ressentir consentir endormir pressentir desservir'));
// Nhóm 3 kiểu "ouvrir": chia như nhóm 1 ở hiện tại (ouvre), phân từ -ert (cueillir: cueilli, tương lai cueillerai)
const OUVRIR = { ouvrir: 'ouvert', rouvrir: 'rouvert', entrouvrir: 'entrouvert', couvrir: 'couvert', découvrir: 'découvert', recouvrir: 'recouvert', offrir: 'offert', souffrir: 'souffert', cueillir: 'cueilli', accueillir: 'accueilli', recueillir: 'recueilli' };
// Nhóm 3 -re đều (vendre): vends vend vendons vendu
const RE = new Set(list('vendre attendre entendre répondre perdre descendre rendre défendre tendre prétendre mordre tordre fondre confondre correspondre interrompre rompre corrompre redescendre suspendre dépendre étendre détendre revendre fendre pendre répandre tondre pondre sous-entendre'));
// -indre (peindre → peignons, peint), -uire (conduire → conduisons, conduit), -aître (connaître → connaît)
const INDRE = /(ei|ai|oi)ndre$/, UIRE = /uire$/, AITRE = /aître$/;

// Bất quy tắc: hiện tại 6 ngôi | gốc quá khứ đơn + kiểu (a/i/u/in) | gốc tương lai | phân từ quá khứ [| ghi đè: subj=6 dạng; imp=3 dạng; ppres=…; subjn=gốc nous/vous của giả định]
const IRR = {};
const def = (v, s) => { const [p, ps, f, pp, ...o] = s.split('|').map(x => x.trim()); const r = { pres: list(p), ps: ps.split(' '), fut: f, part: pp }; for (const kv of o) { const [k, val] = kv.split('='); r[k.trim()] = val.trim().includes(' ') ? list(val) : val.trim(); } IRR[v] = r; };
def('être', 'suis es est sommes êtes sont | f u | ser | été | subj=sois sois soit soyons soyez soient | imp=sois soyons soyez | ppres=étant | impf=ét');
def('avoir', 'ai as a avons avez ont | e u | aur | eu | subj=aie aies ait ayons ayez aient | imp=aie ayons ayez | ppres=ayant');
def('aller', 'vais vas va allons allez vont | all a | ir | allé | subj=aille ailles aille allions alliez aillent | imp=va allons allez');
def('faire', 'fais fais fait faisons faites font | f i | fer | fait | subj=fasse fasses fasse fassions fassiez fassent');
def('dire', 'dis dis dit disons dites disent | d i | dir | dit');
def('pouvoir', 'peux peux peut pouvons pouvez peuvent | p u | pourr | pu | subj=puisse puisses puisse puissions puissiez puissent | imp=-');
def('vouloir', 'veux veux veut voulons voulez veulent | voul u | voudr | voulu | subj=veuille veuilles veuille voulions vouliez veuillent | imp=veuille veuillons veuillez');
def('savoir', 'sais sais sait savons savez savent | s u | saur | su | subj=sache saches sache sachions sachiez sachent | imp=sache sachons sachez | ppres=sachant');
def('devoir', 'dois dois doit devons devez doivent | d u | devr | dû | imp=-');
def('voir', 'vois vois voit voyons voyez voient | v i | verr | vu');
def('venir', 'viens viens vient venons venez viennent | v in | viendr | venu');
def('tenir', 'tiens tiens tient tenons tenez tiennent | t in | tiendr | tenu');
def('recevoir', 'reçois reçois reçoit recevons recevez reçoivent | reç u | recevr | reçu');
def('apercevoir', 'aperçois aperçois aperçoit apercevons apercevez aperçoivent | aperç u | apercevr | aperçu');
def('décevoir', 'déçois déçois déçoit décevons décevez déçoivent | déç u | décevr | déçu');
def('concevoir', 'conçois conçois conçoit concevons concevez conçoivent | conç u | concevr | conçu');
def('boire', 'bois bois boit buvons buvez boivent | b u | boir | bu');
def('croire', 'crois crois croit croyons croyez croient | cr u | croir | cru');
def('lire', 'lis lis lit lisons lisez lisent | l u | lir | lu');
def('élire', 'élis élis élit élisons élisez élisent | él u | élir | élu');
def('*crire', 'cris cris crit crivons crivez crivent | criv i | crir | crit'); // gốc ẩn của écrire/décrire/inscrire… (tiền tố é, dé, ins…)
def('vivre', 'vis vis vit vivons vivez vivent | véc u | vivr | vécu');
def('suivre', 'suis suis suit suivons suivez suivent | suiv i | suivr | suivi');
def('naître', 'nais nais naît naissons naissez naissent | naqu i | naîtr | né');
def('mourir', 'meurs meurs meurt mourons mourez meurent | mour u | mourr | mort');
def('courir', 'cours cours court courons courez courent | cour u | courr | couru');
def('rire', 'ris ris rit rions riez rient | r i | rir | ri');
def('sourire', 'souris souris sourit sourions souriez sourient | sour i | sourir | souri');
def('plaire', 'plais plais plaît plaisons plaisez plaisent | pl u | plair | plu');
def('taire', 'tais tais tait taisons taisez taisent | t u | tair | tu');
def('valoir', 'vaux vaux vaut valons valez valent | val u | vaudr | valu | subj=vaille vailles vaille valions valiez vaillent');
def('falloir', '- - faut - - - | fall u | faudr | fallu | subj=- - faille - - - | imp=- | ppres=- | impf=fall');
def('pleuvoir', '- - pleut - - pleuvent | pl u | pleuvr | plu | imp=- | ppres=pleuvant');
def('asseoir', 'assieds assieds assied asseyons asseyez asseyent | ass i | assiér | assis');
def('battre', 'bats bats bat battons battez battent | batt i | battr | battu');
def('mettre', 'mets mets met mettons mettez mettent | m i | mettr | mis');
def('prendre', 'prends prends prend prenons prenez prennent | pr i | prendr | pris');
def('vaincre', 'vaincs vaincs vainc vainquons vainquez vainquent | vainqu i | vaincr | vaincu');
def('conclure', 'conclus conclus conclut concluons concluez concluent | concl u | conclur | conclu');
def('exclure', 'exclus exclus exclut excluons excluez excluent | excl u | exclur | exclu');
def('inclure', 'inclus inclus inclut incluons incluez incluent | incl u | inclur | inclus');
def('résoudre', 'résous résous résout résolvons résolvez résolvent | résol u | résoudr | résolu');
def('coudre', 'couds couds coud cousons cousez cousent | cous i | coudr | cousu');
def('fuir', 'fuis fuis fuit fuyons fuyez fuient | fu i | fuir | fui');
def('acquérir', 'acquiers acquiers acquiert acquérons acquérez acquièrent | acqu i | acquerr | acquis');
def('conquérir', 'conquiers conquiers conquiert conquérons conquérez conquièrent | conqu i | conquerr | conquis');
def('envoyer', 'envoie envoies envoie envoyons envoyez envoient | envoy a | enverr | envoyé');
def('renvoyer', 'renvoie renvoies renvoie renvoyons renvoyez renvoient | renvoy a | renverr | renvoyé');
def('haïr', 'hais hais hait haïssons haïssez haïssent | haï i | haïr | haï');
def('bouillir', 'bous bous bout bouillons bouillez bouillent | bouill i | bouillir | bouilli');
def('vêtir', 'vêts vêts vêt vêtons vêtez vêtent | vêt i | vêtir | vêtu');
def('cuire', 'cuis cuis cuit cuisons cuisez cuisent | cuis i | cuir | cuit');
def('nuire', 'nuis nuis nuit nuisons nuisez nuisent | nuis i | nuir | nui');
def('suffire', 'suffis suffis suffit suffisons suffisez suffisent | suff i | suffir | suffi');
def('interdire', 'interdis interdis interdit interdisons interdisez interdisent | interd i | interdir | interdit');
def('prédire', 'prédis prédis prédit prédisons prédisez prédisent | préd i | prédir | prédit');
def('contredire', 'contredis contredis contredit contredisons contredisez contredisent | contred i | contredir | contredit');
def('maudire', 'maudis maudis maudit maudissons maudissez maudissent | maud i | maudir | maudit');
def('croître', 'croîs croîs croît croissons croissez croissent | cr û | croîtr | crû');
def('accroître', 'accrois accrois accroît accroissons accroissez accroissent | accr u | accroîtr | accru');
def('moudre', 'mouds mouds moud moulons moulez moulent | moul u | moudr | moulu');
def('clore', 'clos clos clôt - - closent | - - | clor | clos');
// Phái sinh = tiền tố + động từ gốc (mọi dạng chia y như gốc)
const DERIV = {
  venir: 'revenir devenir parvenir intervenir prévenir souvenir convenir survenir subvenir provenir advenir',
  tenir: 'obtenir retenir maintenir contenir appartenir soutenir détenir entretenir ',
  prendre: 'apprendre comprendre reprendre surprendre entreprendre méprendre',
  mettre: 'permettre promettre admettre remettre soumettre transmettre commettre compromettre omettre',
  faire: 'refaire défaire satisfaire contrefaire', dire: 'redire', voir: 'revoir entrevoir', '*crire': 'écrire décrire inscrire prescrire souscrire transcrire réécrire',
  lire: 'relire', vivre: 'revivre survivre', suivre: 'poursuivre', courir: 'parcourir secourir accourir concourir recourir', battre: 'combattre débattre abattre',
  vaincre: 'convaincre', plaire: 'déplaire complaire', taire: '', boire: '', croire: '', rire: '', voiler: '', partir: '', sortir: '', dormir: '', sentir: '', servir: '',
  ouvrir: '', fuir: 's-enfuir', naître: 'renaître', cuire: '', asseoir: 'rasseoir', mourir: '', recevoir: '', connaître: '',
};
const BASE = {}; for (const [b, ds] of Object.entries(DERIV)) for (const d of list(ds || '')) if (d && d !== '-') BASE[d.replace('s-', '')] = b;
const bareLen = b => b.replace('*', '').length;
// -faire: vous refaites/défaites/satisfaites (giữ -faites); prévoir/pourvoir là ngoại lệ của voir → không đưa vào DERIV

// Nhóm 2 (-ir có -iss-) = mặc định cho -ir; nhóm 3 -ir khác nằm ở PARTIR/OUVRIR/IRR/DERIV
const isGroup2 = v => /ir$/.test(v) && !PARTIR.has(v) && !OUVRIR[v] && !IRR[v] && !BASE[v];
const stemChange = (s, v) => { // nhóm 1: gốc trước âm câm (je/tu/il/ils hiện tại + giả định, cả tương lai/điều kiện trừ kiểu é)
  if (DOUBLE.has(v)) return s.replace(/(l|t)$/, '$1$1');
  if (/[oua]y$/.test(s) && !/ayer$/.test(v)) return s.replace(/y$/, 'i'); // nettoie, essuie, emploie (payer: paye/paie – giữ y, Wiktionary có cả hai)
  const m = s.match(/^(.*)é([^aeiouyéèêë]+)$/u) || s.match(/^(.*)e([^aeiouyéèêë])$/u); // é + phụ âm (préfér-, régl-, célébr-) | e + MỘT phụ âm (achet-, lev-; commenc- thì không)
  return m ? m[1] + 'è' + m[2] : s;
};
const futChange = (s, v) => { // tương lai/điều kiện: acheter → achèterai, appeler → appellerai, nettoyer → nettoierai; préférer giữ préférerai (truyền thống)
  if (DOUBLE.has(v)) return s.replace(/(l|t)$/, '$1$1');
  if (/[ou]y$/.test(s)) return s.replace(/y$/, 'i');
  const m = s.match(/^(.*)e([^aeiouyéèêë])$/u);
  return m ? m[1] + 'è' + m[2] : s;
};
const soft = (s, e) => !/^[aoâ]/.test(e) ? s + e : s.replace(/c$/, 'ç').replace(/g$/, 'ge') + e; // commençons, mangeons, commençai (không trước è/e/i)

function group1(v) {
  const s = v.slice(0, -2), mute = stemChange(s, v), fs = futChange(s, v) + 'er';
  const pres = ['e', 'es', 'e', 'ons', 'ez', 'ent'].map((e, i) => (i === 3 || i === 4 ? soft(s, e) : mute + e));
  return { pres, nousStem: s, psT: 'a', psS: s, fut: fs, part: s + 'é', subjBig: mute, subjSmall: s, soft: true };
}
function group2(v) {
  const s = v.slice(0, -2);
  return { pres: [s + 'is', s + 'is', s + 'it', s + 'issons', s + 'issez', s + 'issent'], nousStem: s + 'iss', psT: 'i', psS: s, fut: v, part: s + 'i', subjBig: s + 'iss', subjSmall: s + 'iss' };
}
function group3(v) {
  if (OUVRIR[v]) { const s = v.slice(0, -2), pres = ['e', 'es', 'e', 'ons', 'ez', 'ent'].map(e => s + e); return { pres, nousStem: s, psT: 'i', psS: s, fut: /cueillir$/.test(v) ? s + 'er' : v, part: OUVRIR[v], subjBig: s, subjSmall: s }; }
  if (PARTIR.has(v)) { const s = v.slice(0, -2), sg = s.slice(0, -1); return { pres: [sg + 's', sg + 's', sg + 't', s + 'ons', s + 'ez', s + 'ent'], nousStem: s, psT: 'i', psS: s, fut: v, part: s + 'i', subjBig: s, subjSmall: s }; }
  if (RE.has(v)) { const s = v.slice(0, -2), sg3 = /rompre$/.test(v) ? s + 't' : s; return { pres: [s + 's', s + 's', sg3, s + 'ons', s + 'ez', s + 'ent'], nousStem: s, psT: 'i', psS: s, fut: v.slice(0, -1), part: s + 'u', subjBig: s, subjSmall: s }; }
  if (INDRE.test(v)) { const s = v.slice(0, -3), g = s.slice(0, -1) + 'gn'; return { pres: [s + 's', s + 's', s + 't', g + 'ons', g + 'ez', g + 'ent'], nousStem: g, psT: 'i', psS: g, fut: v.slice(0, -1), part: s + 't', subjBig: g, subjSmall: g }; }
  if (UIRE.test(v)) { const s = v.slice(0, -2); return { pres: [s + 's', s + 's', s + 't', s + 'sons', s + 'sez', s + 'sent'], nousStem: s + 's', psT: 'i', psS: s + 's', fut: v.slice(0, -1), part: s + 't', subjBig: s + 's', subjSmall: s + 's' }; }
  if (AITRE.test(v)) { const s = v.slice(0, -5); return { pres: [s + 'ais', s + 'ais', s + 'aît', s + 'aissons', s + 'aissez', s + 'aissent'], nousStem: s + 'aiss', psT: 'u', psS: s, fut: v.slice(0, -1), part: s + 'u', subjBig: s + 'aiss', subjSmall: s + 'aiss' }; }
  return null;
}
function irr(v) {
  const R = IRR[v]; const [psS, psT] = R.ps;
  const nousStem = R.pres[3] !== '-' ? R.pres[3].replace(/ons$/, '') : (R.impf || '');
  const ilsStem = R.pres[5] !== '-' ? R.pres[5].replace(/ent$/, '') : '';
  return { pres: R.pres, nousStem: R.impf || nousStem, psT: psT === 'û' ? 'u' : psT, psS, psHat: psT === 'û', fut: R.fut, part: R.part, subjBig: ilsStem, subjSmall: nousStem, subj: R.subj, imp: R.imp, ppres: R.ppres };
}

/** Bảng chia đầy đủ của một động từ (nguyên mẫu, có thể kèm "se "/"s'"). */
export function conjugate(inf) {
  const refl = /^(se |s')/.test(inf), v = inf.replace(/^(se |s')/, '');
  if (BASE[v]) { // phái sinh: chia gốc rồi nối tiền tố
    const b = BASE[v], pre = v.slice(0, v.length - bareLen(b)), c = conjugate(b), P = x => Array.isArray(x) ? x.map(P) : typeof x === 'string' && x !== '-' ? pre + x : x;
    const o = { inf: inf, aux: refl || ETRE.has(v) ? 'être' : c.aux === 'être' && ETRE.has(b) && !ETRE.has(v) ? 'avoir' : c.aux };
    for (const k of SIMPLE) o[k] = k === 'imp' ? Object.fromEntries(Object.entries(c.imp).map(([x, y]) => [x, P(y)])) : P(c[k]);
    if (v === 'satisfaire') o.pres = o.pres; // satisfaire chia như faire (satisfaites) – giữ
    if (refl || ETRE.has(v)) o.aux = 'être'; else if (!ETRE.has(v)) o.aux = 'avoir';
    return o;
  }
  const g = IRR[v] ? irr(v) : /er$/.test(v) ? group1(v) : isGroup2(v) ? group2(v) : group3(v);
  if (!g) throw new Error('chưa có quy tắc chia: ' + inf);
  const o = { inf, aux: refl || ETRE.has(v) ? 'être' : 'avoir', part: g.part, pres: g.pres };
  o.impf = IMPF.map(e => g.nousStem ? (g.soft ? soft(g.nousStem, e) : g.nousStem + e) : '-');
  if (v === 'falloir') o.impf = ['-', '-', 'fallait', '-', '-', '-'];
  if (v === 'pleuvoir') o.impf = ['-', '-', 'pleuvait', '-', '-', 'pleuvaient'];
  const pe = PS[g.psT], se = SI[g.psT];
  o.ps = g.psS === '-' ? Array(6).fill('-') : pe.map(e => g.soft ? soft(g.psS, e) : g.psS + (g.psHat && /^u[st]?$/.test(e) ? e.replace('u', 'û') : e));
  o.subjImpf = g.psS === '-' ? Array(6).fill('-') : se.map(e => g.soft ? soft(g.psS, e) : g.psS + e);
  if (v === 'luire') { o.part = 'lui'; o.ps = [...o.ps]; o.ps[2] = 'luit'; } // Wiktionary: phân từ lui (như nuire), passé simple il luit (cổ điển), các ngôi khác luis-
  if (v === 'haïr') { o.ps = ['haïs', 'haïs', 'haït', 'haïmes', 'haïtes', 'haïrent']; o.subjImpf = ['haïsse', 'haïsses', 'haït', 'haïssions', 'haïssiez', 'haïssent']; }
  if (v === 'croître') { o.ps = ['crûs', 'crûs', 'crût', 'crûmes', 'crûtes', 'crûrent']; o.subjImpf = ['crûsse', 'crûsses', 'crût', 'crûssions', 'crûssiez', 'crûssent']; }
  if (v === 'falloir') { o.ps = ['-', '-', 'fallut', '-', '-', '-']; o.subjImpf = ['-', '-', 'fallût', '-', '-', '-']; }
  if (v === 'pleuvoir') { o.ps = ['-', '-', 'plut', '-', '-', 'plurent']; o.subjImpf = ['-', '-', 'plût', '-', '-', 'plussent']; }
  o.fut = FUT.map(e => g.fut + e); o.cond = COND.map(e => g.fut + e);
  if (v === 'falloir' || v === 'pleuvoir') { const k = v === 'falloir' ? [2] : [2, 5]; o.fut = o.fut.map((x, i) => k.includes(i) ? x : '-'); o.cond = o.cond.map((x, i) => k.includes(i) ? x : '-'); }
  o.subj = g.subj || SUBJ.map((e, i) => (i === 3 || i === 4 ? g.subjSmall : g.subjBig) + e);
  if (v === 'pleuvoir') o.subj = ['-', '-', 'pleuve', '-', '-', 'pleuvent'];
  o.ppres = g.ppres || (g.soft ? soft(g.nousStem, 'ant') : g.nousStem + 'ant');
  // mệnh lệnh tu: bỏ -s khi hiện tại tu tận cùng -es (parle, ouvre, envoie); còn lại = hiện tại tu (finis, pars, viens)
  const imp = g.imp === '-' ? ['-', '-', '-'] : Array.isArray(g.imp) ? g.imp : [g.pres[1].replace(/es$/, 'e'), g.pres[3], g.pres[4]];
  o.imp = { tu: imp[0], nous: imp[1], vous: imp[2] };
  return o;
}

/** Phân từ hợp với chủ ngữ (trợ être): giống đực, số nhiều ở nous/vous/ils (mặc định "vous" = số nhiều, như bảng chia sách). */
const agree = (p, i) => (i >= 3 && !/[sx]$/.test(p) ? p + 's' : p);
/** Mọi khóa trong TENSES; thì ghép trả "trợ động từ + phân từ" theo 6 ngôi. */
export function form(inf, tense) {
  const c = conjugate(inf);
  if (SIMPLE.includes(tense)) return c[tense];
  if (tense === 'futProche') return conjugate('aller').pres.map(a => `${a} ${c.inf}`);
  if (tense === 'passeRecent') return conjugate('venir').pres.map(a => `${a} ${/^[aeiouyéèêâîôh]/i.test(c.inf.replace(/^(se |s')/, '')) && !/^ha[ïrs]/.test(c.inf) ? "d'" : 'de '}${c.inf}`);
  const k = COMPOUND[tense]; if (!k) throw new Error('thì lạ: ' + tense);
  const aux = conjugate(c.aux)[k];
  return aux.map((a, i) => `${a} ${c.aux === 'être' ? agree(c.part, i) : c.part}`);
}

/** Động từ bảng quy tắc đã biết (bất quy tắc, phái sinh, nhóm 3 theo kiểu) – conj-check.mjs --tl fr kiểm chéo toàn bộ trên CI. */
export const KNOWN = [...new Set([...Object.keys(IRR), ...Object.keys(BASE), ...PARTIR, ...Object.keys(OUVRIR), ...RE, ...DOUBLE,
  ...list('parler aimer manger commencer acheter lever préférer espérer répéter nettoyer employer essuyer payer finir choisir réussir grandir peindre craindre joindre éteindre conduire construire traduire produire détruire connaître paraître disparaître reconnaître')])].filter(v => v !== 'clore' && !v.includes('*'));
