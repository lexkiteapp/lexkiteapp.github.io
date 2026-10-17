/* 🔤 Bộ máy chia động từ tiếng Anh (thuần JS, không mạng, không chữ giao diện – chạy cả trong Node để test: scripts/test/verbs.mjs).
 * LK_VERBS.resolve('went') → { base: 'go', from: 'past' } · forms('study') → 5 dạng + quy tắc chính tả + cách đọc -ed/-s
 * table('take', { region: 'US' }) → 4 nhóm thì × khẳng định/phủ định/nghi vấn × 5 ngôi (+ bị động) · mistakes('go') → lỗi hay gặp.
 * Mã quy tắc/lý do (double, y-ies, td…) được giao diện (web/js/verbs.js) dịch qua t(). */
(function (g) {
  if (g.LK_VERBS) return;
  // ---------- Dữ liệu ----------
  // Bất quy tắc: gốc quá-khứ phân-từ; nhiều dạng: a/b; ":UK" ":US" = dạng ưu tiên theo vùng
  const IRR = 'arise arose arisen|awake awoke awoken|babysit babysat babysat|be was/were been|bear bore borne/born|beat beat beaten|become became become|befall befell befallen|begin began begun|bend bent bent|bet bet bet|bid bid bid|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|bring brought brought|broadcast broadcast broadcast|build built built|burn burned/burnt:UK burned/burnt:UK|burst burst burst|buy bought bought|cast cast cast|catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|dive dived/dove:US dived|do did done|draw drew drawn|dream dreamed/dreamt:UK dreamed/dreamt:UK|drink drank drunk|drive drove driven|dwell dwelt/dwelled dwelt/dwelled|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|fit fitted:UK/fit:US fitted:UK/fit:US|flee fled fled|fling flung flung|fly flew flown|forbid forbade forbidden|forecast forecast forecast|foresee foresaw foreseen|foretell foretold foretold|forget forgot forgotten|forgive forgave forgiven|forgo forwent forgone|freeze froze frozen|get got got:UK/gotten:US|give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|input input/inputted input/inputted|keep kept kept|kneel knelt/kneeled:US knelt/kneeled:US|know knew known|lay laid laid|lead led led|lean leaned/leant:UK leaned/leant:UK|leap leaped/leapt leaped/leapt|learn learned/learnt:UK learned/learnt:UK|leave left left|lend lent lent|let let let|lie lay lain|light lit/lighted lit/lighted|lose lost lost|make made made|mean meant meant|meet met met|mislead misled misled|mistake mistook mistaken|misunderstand misunderstood misunderstood|mow mowed mown/mowed|outdo outdid outdone|outgrow outgrew outgrown|outrun outran outrun|overcome overcame overcome|overdo overdid overdone|overeat overate overeaten|overhear overheard overheard|override overrode overridden|oversee oversaw overseen|oversleep overslept overslept|overtake overtook overtaken|overthrow overthrew overthrown|pay paid paid|plead pleaded/pled:US pleaded/pled:US|proofread proofread proofread|prove proved proved/proven|put put put|quit quit quit|read read read|rebuild rebuilt rebuilt|redo redid redone|retell retold retold|rewrite rewrote rewritten|rid rid rid|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|sew sewed sewn/sewed|shake shook shaken|shed shed shed|shine shone/shined shone/shined|shoot shot shot|show showed shown/showed|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|slit slit slit|smell smelled/smelt:UK smelled/smelt:UK|sneak sneaked/snuck:US sneaked/snuck:US|sow sowed sown/sowed|speak spoke spoken|speed sped sped|spell spelled/spelt:UK spelled/spelt:UK|spend spent spent|spill spilled/spilt:UK spilled/spilt:UK|spin spun spun|spit spat/spit:US spat/spit:US|split split split|spoil spoiled/spoilt:UK spoiled/spoilt:UK|spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|stink stank stunk|stride strode stridden|strike struck struck|string strung strung|strive strove/strived striven/strived|swear swore sworn|sweep swept swept|swell swelled swollen/swelled|swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|thrust thrust thrust|tread trod trodden|undergo underwent undergone|understand understood understood|undertake undertook undertaken|undo undid undone|unwind unwound unwound|uphold upheld upheld|upset upset upset|wake woke woken|wear wore worn|weave wove woven|weep wept wept|wet wet/wetted wet/wetted|win won won|wind wound wound|withdraw withdrew withdrawn|withhold withheld withheld|withstand withstood withstood|write wrote written';
  // Động từ thông dụng (xếp gần theo tần suất) – gợi ý tìm kiếm + nhận diện từ gốc khi người học gõ dạng đã chia
  const COMMON = 'be have do say go get make know think take see come want look use find give tell work call try ask need feel become leave put mean keep let begin seem help talk turn start show hear play run move like live believe hold bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain suggest raise pass sell require report decide pull return explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause point listen realise realize place close involve increase reduce finish describe lie lay rise wonder answer travel study visit improve prepare enjoy arrive apply affect protect prefer achieve teach join check share fill pick claim compare form contain obtain prevent wish fly drive throw shake drink sleep sing swim ride wear forget forgive fight hide steal cook clean wash paint dance jump laugh smile cry shout plan admit permit occur refer regret control commit submit omit transfer equip panic picnic mimic traffic free flee tie dye hurry worry marry copy reply deny rely supply fry dry obey employ destroy delay pray display annoy convey survey argue queue value issue rescue pursue accept accuse act adapt address adjust admire adopt advertise advise afford aim alter amaze amuse analyse analyze announce anticipate apologise apologize appeal appreciate approach approve arrange arrest assess assist assume attach attack attempt attend attract avoid award bake balance ban bathe beg behave belong benefit blame bless block boil book borrow bother bounce bow breathe brush burn calculate camp cancel care celebrate challenge charge chase chat cheat cheer chew clap climb collapse collect combine comment communicate compete complain complete concentrate concern confirm confuse connect conserve consist construct consult consume contact contribute convert convince cope correct cost cough count crash cross crush cure cycle damage dare deal debate declare decline decorate decrease defeat defend define delete deliver demand depend deposit design desire detect determine differ dig direct disagree disappear disappoint discover discuss dislike dismiss distribute disturb divide dominate donate doubt download drag dream drop earn educate elect eliminate email embarrass emerge emphasise emphasize enable encourage end engage ensure enter entertain escape establish estimate evaluate examine exceed exchange excite exercise exist expand experience experiment explode explore export expose express extend face fail fancy fasten fax fear feature fetch file finance fit fix float flow focus fold force found frighten fund gain gather generate glance glow govern grab graduate greet guarantee guard guess handle hang harm hate head heal heat hesitate highlight hire hug hunt hurt identify ignore illustrate imagine imitate impact implement imply import impress indicate influence inform inherit injure insist inspect inspire install insure intend interest interrupt interview introduce invent invest investigate invite iron irritate joke judge kick kiss knit knock label land last launch lend level license lift light limit link list load locate lock log long manage mark market match matter measure mention mind miss mix model monitor motivate multiply murder name narrow negotiate nod note notice object observe occupy offend operate order organise organize owe own pack park participate perform persuade phone photograph pinch plant please plug polish pollute possess post pour practise practice praise predict present preserve press pretend print process program promise promote pronounce propose protest prove publish punish purchase push qualify question race rain rank rate recognise recognize recommend record recover recycle refuse register reject relate relax release remind remove rent repair repeat replace represent request research reserve resign resist resolve respect respond rest restore result retire reveal review reward ring risk rob rub ruin rush sail satisfy save scare schedule score scream search secure select separate settle shave shine shock shop sign signal sink ski skip slip smell smoke snow solve sort sound spare spell spill spoil sponsor spot spray squeeze stare state steer stir store strengthen stress stretch structure struggle succeed suffer suit summarise summarize supervise suppose surprise surround survive suspect swap switch tap target taste tax tear test text thank threaten tick tip tire total touch tour trade train transform translate transport trap treat trust tune twist type undergo unite unlock update upgrade upload urge vary view volunteer vote wander warn waste weigh welcome whisper whistle wink wipe witness wrap yawn yell zip quiz whiz quarrel fuel dial marvel channel equal tunnel pedal rival shovel compel expel propel rebel patrol enrol excel dispel repel instil distil fulfil kidnap worship format handicap unplug incur recur concur confer defer infer deter forbid acquit outwit annul edit exhibit credit gallop budget orbit murmur sneeze snore shiver tremble faint kneel vanish proceed prosper thrive react'.split(' ');
  const MODALS = { can: ['cannot', "can't", 'could', 'be able to'], could: ['could not', "couldn't", 'could have', 'be able to'], may: ['may not', '', 'might', 'be allowed to'], might: ['might not', "mightn't", 'might have', ''], must: ['must not', "mustn't", 'had to', 'have to'], shall: ['shall not', "shan't", 'should', ''], should: ['should not', "shouldn't", 'should have', 'ought to'], will: ['will not', "won't", 'would', 'be going to'], would: ['would not', "wouldn't", 'would have', 'used to'], 'ought to': ['ought not to', "oughtn't to", 'ought to have', 'should'] };
  // Không có tân ngữ → không có bị động
  const INTRANS = new Set('arrive come go die sleep happen exist occur appear disappear fall rise lie seem become remain belong consist depend matter wait sit stand laugh smile cry cough sneeze yawn collapse emerge vanish faint kneel hesitate pause depart arise glance frown shiver tremble snore proceed prosper thrive participate compete cope apologise apologize complain insist talk travel stay live work rain snow graduate retire respond react listen look swim jump differ succeed'.split(' '));
  // Động từ trạng thái: thường KHÔNG dùng ở thì tiếp diễn; DUAL: có nghĩa hành động thì dùng được
  const STATIVE = new Set('know believe understand like love hate prefer want need own belong seem consist contain mean recognise recognize realise realize suppose doubt deserve matter possess agree disagree cost owe resemble exist'.split(' '));
  const DUAL = new Set('have think see taste smell feel look weigh be appear measure'.split(' '));
  // Gấp đôi phụ âm cuối ở từ nhiều âm tiết (trọng âm rơi vào âm cuối)
  const DOUBLE = new Set('admit allot abet acquit annul begin commit compel concur confer control debar defer deter emit enrol equip excel expel forbid forget incur infer inter occur omit outwit patrol permit prefer propel rebel recur refer regret repel submit transfer transmit upset dispel distil extol fulfil instil enthral impel kidnap program format handicap zigzag unplug unzip outrun babysit'.split(' '));
  // -l: Anh–Anh gấp đôi (travelled), Anh–Mỹ không (traveled) – trừ các từ trọng âm cuối (compel, control… gấp đôi cả hai)
  const L_BOTH = new Set('compel control expel patrol propel rebel enrol extol distil instil repel dispel excel annul impel fulfil enthral appal'.split(' '));
  const L_NONE = new Set('parallel'.split(' ')), L_UKX = new Set('fuel refuel dial duel'.split(' '));
  // Có tân ngữ nhưng gần như không dùng bị động (have lunch → ✗ lunch is had)
  const NOPASS = new Set('have get lack resemble cost weigh suit fit become let'.split(' '));
  const UK_DOUBLE = new Set('worship'.split(' ')); // worshipped (UK) / worshiped (US)
  // -se đọc /s/ (còn lại /z/: use, close, choose, realise…)
  const SE_S = new Set('promise increase decrease release cease lease crease chase purchase base case erase dose douse loose grease premise'.split(' '));
  const GH_F = new Set('laugh cough'.split(' '));
  const K_END = new Set('ache stomach'.split(' '));

  // ---------- Bảng tra ----------
  const IRREG = {}, REV = {}; // REV: dạng quá khứ/phân từ → [gốc]
  const parseVar = s => s.split('/').map(x => { const [w, tag] = x.split(':'); return tag ? { w, tag } : { w }; });
  IRR.split('|').forEach(row => {
    const [b, p, pp] = row.split(' ');
    IRREG[b] = { past: parseVar(p), pp: parseVar(pp) };
    for (const v of [...IRREG[b].past, ...IRREG[b].pp]) if (v.w !== b) (REV[v.w] = REV[v.w] || []).includes(b) || REV[v.w].push(b);
  });
  const KNOWN = new Set([...COMMON, ...Object.keys(IRREG)]);
  const ORDER = []; { const seen = new Set(); for (const v of [...COMMON, ...Object.keys(IRREG)]) if (!seen.has(v)) { seen.add(v); ORDER.push(v); } }
  const extra = new Set(); // động từ thêm từ kho từ vựng của app (IELTS_DATA) – nạp lúc chạy
  const known = w => KNOWN.has(w) || extra.has(w);

  // ---------- Chính tả ----------
  // Âm tiết cuối dạng phụ âm–nguyên âm–phụ âm (stop, plan, quit) – "qu" tính là phụ âm; w/x/y cuối không gấp đôi
  const cvc = w => /(^|[^aeiou]|qu)[aeiou][^aeiouwxy]$/.test(w) && !/(^|[^q])[aeiou]{2}[^aeiou]$/.test(w);
  const syllables = w => (w.replace(/e$/, '').replace(/qu/g, 'q').match(/[aeiouy]+/g) || []).length || 1;
  function doubling(b) {
    if (DOUBLE.has(b)) return 'both';
    if (L_UKX.has(b)) return 'uk';
    if (!cvc(b)) return '';
    if (b.endsWith('l')) { if (L_NONE.has(b)) return ''; if (syllables(b) === 1 || L_BOTH.has(b)) return 'both'; return 'uk'; }
    if (UK_DOUBLE.has(b)) return 'uk';
    return syllables(b) === 1 ? 'both' : '';
  }
  // Thêm -ed/-ing → [{ w, tag? }], rule
  function suffix(b, suf) {
    const ed = suf === 'ed';
    if (b === 'be') return { list: [{ w: ed ? 'been' : 'being' }], rule: '' };
    if (/ic$/.test(b)) return { list: [{ w: b + 'k' + suf }], rule: 'ic' };
    if (ed) {
      if (/e$/.test(b)) return { list: [{ w: b + 'd' }], rule: 'e' };
      if (/[^aeiou]y$/.test(b)) return { list: [{ w: b.slice(0, -1) + 'ied' }], rule: 'y' };
    } else {
      if (/ie$/.test(b)) return { list: [{ w: b.slice(0, -2) + 'ying' }], rule: 'ie' };
      if (/(ee|oe|ye)$/.test(b) || /^(singe|whinge|swinge|tinge)$/.test(b)) return { list: [{ w: b + 'ing' }], rule: 'keep-e' };
      if (b === 'age') return { list: [{ w: 'ageing', tag: 'UK' }, { w: 'aging', tag: 'US' }], rule: 'e' };
      if (b === 'queue') return { list: [{ w: 'queuing' }, { w: 'queueing' }], rule: 'e' };
      if (/e$/.test(b)) return { list: [{ w: b.slice(0, -1) + 'ing' }], rule: 'e' };
    }
    const d = doubling(b);
    if (d === 'both') return { list: [{ w: b + b.slice(-1) + suf }], rule: 'double' };
    if (d === 'uk') return { list: [{ w: b + b.slice(-1) + suf, tag: 'UK' }, { w: b + suf, tag: 'US' }], rule: 'double-uk' };
    return { list: [{ w: b + suf }], rule: '' };
  }
  function third(b) {
    if (b === 'be') return { list: [{ w: 'is' }], rule: 'irr' };
    if (b === 'have') return { list: [{ w: 'has' }], rule: 'irr' };
    if (/^(quiz|whiz)$/.test(b)) return { list: [{ w: b + 'zes' }], rule: 'es' };
    if (/[^aeiou]y$/.test(b)) return { list: [{ w: b.slice(0, -1) + 'ies' }], rule: 'y' };
    if (/(s|sh|ch|x|z)$/.test(b) && !/^stomach$/.test(b)) return { list: [{ w: b + 'es' }], rule: 'es' };
    if (/[^aeiou]o$/.test(b)) return { list: [{ w: b + 'es' }], rule: 'es' };
    return { list: [{ w: b + 's' }], rule: '' };
  }

  // ---------- Âm cuối → cách đọc đuôi ----------
  // trả: t d s z sh ch j p k f th0 (θ) th1 (ð) v voiced
  function finalSound(b) {
    if (K_END.has(b)) return 'k';
    const m = [[/tch$|ch$/, 'ch'], [/sh$/, 'sh'], [/dge$|ge$/, 'j'], [/ce$/, 's'], [/the$/, 'th1'], [/th$/, 'th0'], [/gh$/, GH_F.has(b) ? 'f' : 'voiced'], [/ph$/, 'f'],
      [/que$/, 'k'], [/(ze|zz|z)$/, 'z'], [/x$/, 's'], [/ss$/, 's']];
    for (const [re, s] of m) if (re.test(b)) return s;
    if (/se$/.test(b)) { if (SE_S.has(b)) return 's'; if (/[^aeiouwy]se$/.test(b) && b !== 'cleanse') return 's'; return 'z'; }
    if (/s$/.test(b)) return 's';
    if (/(ff|fe|f)$/.test(b)) return 'f';
    if (/ve$/.test(b)) return 'v';
    if (/(pe|p)$/.test(b)) return 'p';
    if (/(ke|ck|k|c)$/.test(b)) return 'k';
    if (/(te|tt|t)$/.test(b)) return 't';
    if (/(de|dd|d)$/.test(b)) return 'd';
    return 'voiced';
  }
  const edSound = b => { const s = finalSound(b); return s === 't' || s === 'd' ? { ipa: '/ɪd/', why: 'td', end: s } : /^(s|sh|ch|p|k|f|th0)$/.test(s) ? { ipa: '/t/', why: 'vl', end: s } : { ipa: '/d/', why: 'vd', end: s }; };
  const SAY_S = { says: '/sez/', does: '/dʌz/', has: '/hæz/', is: '/ɪz/' };
  const sSound = b => { const s = finalSound(b); return /^(s|z|sh|ch|j)$/.test(s) ? { ipa: '/ɪz/', why: 'sib', end: s } : /^(p|t|k|f|th0)$/.test(s) ? { ipa: '/s/', why: 'vl', end: s } : { ipa: '/z/', why: 'vd', end: s }; };
  const IPA_END = { t: '/t/', d: '/d/', s: '/s/', z: '/z/', sh: '/ʃ/', ch: '/tʃ/', j: '/dʒ/', p: '/p/', k: '/k/', f: '/f/', th0: '/θ/', th1: '/ð/', v: '/v/', voiced: '' };

  // ---------- Nhận diện từ gốc ----------
  const BE = { am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', "isn't": 'be', "aren't": 'be', "wasn't": 'be', "weren't": 'be' };
  const AUX = { has: 'have', had: 'have', having: 'have', "hasn't": 'have', "haven't": 'have', "hadn't": 'have', does: 'do', did: 'do', doing: 'do', done: 'do', "don't": 'do', "doesn't": 'do', "didn't": 'do', "can't": 'can', cannot: 'can', "couldn't": 'could', "won't": 'will', "wouldn't": 'would', "shouldn't": 'should', "mustn't": 'must', "shan't": 'shall', ought: 'ought to' };
  const clean = s => String(s || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^to /, '');
  function lemma(w) {
    if (BE[w]) return { base: 'be', from: w === 'been' ? 'pp' : w === 'being' ? 'ing' : /^(was|were)/.test(w) ? 'past' : 'present' };
    if (AUX[w]) return { base: AUX[w], from: /^(had|did)/.test(w) ? 'past' : /ing$/.test(w) ? 'ing' : w === 'done' ? 'pp' : /^(has|does)/.test(w) ? 's' : 'base' };
    if (MODALS[w]) return { base: w, from: 'base' };
    if (known(w) && !(REV[w] && !IRREG[w])) return { base: w, from: 'base', alts: REV[w] ? REV[w].map(b => ({ base: b, from: IRREG[b].past.some(x => x.w === w) ? 'past' : 'pp' })) : [] };
    if (REV[w]) { const b = REV[w][0], from = IRREG[b].past.some(x => x.w === w) ? 'past' : 'pp'; const alts = REV[w].slice(1).map(x => ({ base: x, from: IRREG[x].past.some(y => y.w === w) ? 'past' : 'pp' })); if (known(w)) alts.push({ base: w, from: 'base' }); return { base: b, from, alts }; }
    const tries = [];
    let m;
    if ((m = w.match(/^(.+)ies$/))) tries.push([m[1] + 'y', 's'], [m[1] + 'ie', 's']);
    else if ((m = w.match(/^(.+)es$/))) tries.push([m[1] + 'e', 's'], [m[1], 's'], [m[1].replace(/zz$/, 'z'), 's']);
    else if ((m = w.match(/^(.+[^s'])s$/))) tries.push([m[1], 's']);
    if ((m = w.match(/^(.+)ied$/))) tries.push([m[1] + 'y', 'past'], [m[1] + 'ie', 'past']);
    else if ((m = w.match(/^(.+)cked$/))) tries.push([m[1] + 'c', 'past'], [m[1] + 'ck', 'past']);
    else if ((m = w.match(/^(.+)ed$/))) { const s = m[1]; tries.push([s + 'e', 'past'], [s, 'past']); if (/([bdfgklmnprstvz])\1$/.test(s)) tries.push([s.slice(0, -1), 'past']); }
    if ((m = w.match(/^(.+)ying$/))) tries.push([m[1] + 'ie', 'ing'], [m[1] + 'y', 'ing']);
    else if ((m = w.match(/^(.+)cking$/))) tries.push([m[1] + 'c', 'ing'], [m[1] + 'ck', 'ing']);
    else if ((m = w.match(/^(.+)ing$/))) {
      const s = m[1];
      if (/([bdfgklmnprstvz])\1$/.test(s)) tries.push([s.slice(0, -1), 'ing'], [s, 'ing']);
      else if (cvc(s) && syllables(s) === 1) tries.push([s + 'e', 'ing'], [s, 'ing']);
      else tries.push([s, 'ing'], [s + 'e', 'ing']);
    }
    for (const [b, from] of tries) if (known(b)) return { base: b, from };
    // không có trong danh sách: đoán theo quy tắc chính tả
    if (tries.length) {
      const [b0, from] = tries[0], guessE = /(v|z|[^aeiou]c|dg|u|[bcdfgkptz]l)$/;
      let b = b0;
      if (from === 'ing' || from === 'past') { const s = from === 'ing' ? w.slice(0, -3) : w.replace(/e?d$/, ''); b = /([bdgmnprt])\1$/.test(s) ? s.slice(0, -1) : guessE.test(s) || (cvc(s) && syllables(s) === 1) ? s + 'e' : s; if (from === 'past' && /[^aeiou]i$/.test(w.slice(0, -2))) b = w.slice(0, -3) + 'y'; }
      if (from === 's') b = /(s|sh|ch|x|z|[^aeiou]o)es$/.test(w) ? w.slice(0, -2) : /[^aeiou]ies$/.test(w) ? w.slice(0, -3) + 'y' : w.slice(0, -1);
      return { base: b, from, guess: true };
    }
    return { base: w, from: 'base', unknown: !known(w) };
  }
  function resolve(input) {
    const s = clean(input); if (!s) return null;
    if (MODALS[s]) return { base: s, from: 'base', modal: true, tail: '' };
    const parts = s.split(' '), head = parts[0] === 'ought' ? 'ought to' : parts[0];
    if (head === 'ought to') return { base: 'ought to', from: 'base', modal: true, tail: '' };
    const r = lemma(head);
    return Object.assign({ alts: [], tail: parts.slice(1).join(' ') }, r, { modal: !!MODALS[r.base], input: s });
  }

  // ---------- Năm dạng của động từ ----------
  const pickReg = (list, region) => (list.find(x => !x.tag || x.tag === region) || list[0]).w;
  function forms(base, opt = {}) {
    const region = opt.region === 'US' ? 'US' : 'UK';
    const irr = IRREG[base], ing = suffix(base, 'ing'), s3 = third(base), reg = suffix(base, 'ed');
    const isReg = x => reg.list.some(y => y.w === x.w);
    const past = irr ? irr.past : reg.list, pp = irr ? irr.pp : reg.list;
    const irregular = base === 'be' || (!!irr && (past.some(x => !isReg(x)) || pp.some(x => !isReg(x))));
    const hasReg = !irr || past.some(isReg); // có dạng -ed (learned, dreamed…) → có quy tắc chính tả & cách đọc -ed
    return {
      base, irregular, partial: irregular && hasReg && base !== 'be', // vd. learn: learned/learnt
      past, pp, ing: ing.list, s: s3.list,
      rules: { ed: hasReg && base !== 'be' ? reg.rule : '', ing: ing.rule, s: s3.rule },
      // dạng dùng trong bảng chia (theo vùng UK/US)
      P: pickReg(past, region), PP: pickReg(pp, region), ING: pickReg(ing.list, region), S: pickReg(s3.list, region),
      ed: hasReg && base !== 'be' ? edSound(base) : null, sz: SAY_S[s3.list[0].w] ? { ipa: SAY_S[s3.list[0].w], why: 'irr', end: '' } : sSound(base),
      transitive: !INTRANS.has(base) && base !== 'be' && !MODALS[base], passive: !INTRANS.has(base) && !NOPASS.has(base) && base !== 'be',
      stative: STATIVE.has(base), dual: DUAL.has(base), known: known(base) || !!irr, region,
    };
  }
  const endIpa = f => IPA_END[f] || '';

  // ---------- Bảng chia ----------
  const P = [['I', '1s'], ['you', '2'], ['he', '3s'], ['we', '1p'], ['they', '3p']];
  const BE_PRES = { '1s': 'am', '2': 'are', '3s': 'is', '1p': 'are', '3p': 'are' }, BE_PAST = { '1s': 'was', '2': 'were', '3s': 'was', '1p': 'were', '3p': 'were' };
  const HAVE = p => (p === '3s' ? 'has' : 'have');
  const NEG = { am: null, is: "isn't", are: "aren't", was: "wasn't", were: "weren't", have: "haven't", has: "hasn't", had: "hadn't", will: "won't", would: "wouldn't", can: "can't", could: "couldn't", should: "shouldn't", must: "mustn't", might: '', may: '', shall: "shan't", do: "don't", does: "doesn't", did: "didn't" };
  const CON = { am: "'m", is: "'s", are: "'re", have: "'ve", has: "'s", had: "'d", will: "'ll", would: "'d" };
  // Thì: id, nhóm, bài học, công thức chủ động/bị động, hàm tạo chuỗi trợ động từ [aux…, động từ chính]
  // f: dạng động từ chính – 'base' | 'P' | 'PP' | 'ING' | 'S'
  const TENSES = [
    { id: 'ps', g: 'present', en: 'Present simple', lesson: 'present-simple', fa: 'S + V(s/es)', fp: 'S + am/is/are + V3', act: (p, v) => (v.base === 'be' ? [BE_PRES[p]] : [p === '3s' ? v.S : v.base]), simple: 'pres', pas: p => [BE_PRES[p]] },
    { id: 'pc', g: 'present', en: 'Present continuous', lesson: 'present-continuous', fa: 'S + am/is/are + V-ing', fp: 'S + am/is/are + being + V3', act: (p, v) => [BE_PRES[p], v.ING], pas: p => [BE_PRES[p], 'being'], cont: 1 },
    { id: 'pp', g: 'present', en: 'Present perfect', lesson: 'present-perfect', fa: 'S + have/has + V3', fp: 'S + have/has + been + V3', act: (p, v) => [HAVE(p), v.PP], pas: p => [HAVE(p), 'been'] },
    { id: 'ppc', g: 'present', en: 'Present perfect continuous', lesson: 'present-perfect-continuous', fa: 'S + have/has + been + V-ing', act: (p, v) => [HAVE(p), 'been', v.ING], pas: null, cont: 1 },
    { id: 'pas', g: 'past', en: 'Past simple', lesson: 'past-simple', fa: 'S + V2/-ed', fp: 'S + was/were + V3', act: (p, v) => (v.base === 'be' ? [BE_PAST[p]] : [v.P]), simple: 'past', pas: p => [BE_PAST[p]] },
    { id: 'pac', g: 'past', en: 'Past continuous', lesson: 'past-continuous', fa: 'S + was/were + V-ing', fp: 'S + was/were + being + V3', act: (p, v) => [BE_PAST[p], v.ING], pas: p => [BE_PAST[p], 'being'], cont: 1 },
    { id: 'pap', g: 'past', en: 'Past perfect', lesson: 'past-perfect', fa: 'S + had + V3', fp: 'S + had + been + V3', act: (p, v) => ['had', v.PP], pas: () => ['had', 'been'] },
    { id: 'papc', g: 'past', en: 'Past perfect continuous', lesson: 'past-perfect-continuous', fa: 'S + had + been + V-ing', act: (p, v) => ['had', 'been', v.ING], pas: null, cont: 1 },
    { id: 'fs', g: 'future', en: 'Future simple', lesson: 'future-forms', fa: 'S + will + V', fp: 'S + will + be + V3', act: (p, v) => ['will', v.base], pas: () => ['will', 'be'] },
    { id: 'gt', g: 'future', en: 'be going to', lesson: 'future-forms', fa: 'S + am/is/are + going to + V', fp: 'S + am/is/are + going to + be + V3', act: (p, v) => [BE_PRES[p], 'going to', v.base], pas: p => [BE_PRES[p], 'going to', 'be'] },
    { id: 'fc', g: 'future', en: 'Future continuous', lesson: 'future-continuous-perfect', fa: 'S + will + be + V-ing', act: (p, v) => ['will', 'be', v.ING], pas: null, cont: 1 },
    { id: 'fp', g: 'future', en: 'Future perfect', lesson: 'future-continuous-perfect', fa: 'S + will + have + V3', fp: 'S + will + have + been + V3', act: (p, v) => ['will', 'have', v.PP], pas: () => ['will', 'have', 'been'] },
    { id: 'fpc', g: 'future', en: 'Future perfect continuous', lesson: 'future-continuous-perfect', fa: 'S + will + have + been + V-ing', act: (p, v) => ['will', 'have', 'been', v.ING], pas: null, cont: 1 },
    { id: 'fip', g: 'future', en: 'Future in the past (would)', lesson: 'future-in-past', fa: 'S + would + V', fp: 'S + would + be + V3', act: (p, v) => ['would', v.base], pas: () => ['would', 'be'] },
    { id: 'fipg', g: 'future', en: 'Future in the past (was going to)', lesson: 'future-in-past', fa: 'S + was/were + going to + V', fp: 'S + was/were + going to + be + V3', act: (p, v) => [BE_PAST[p], 'going to', v.base], pas: p => [BE_PAST[p], 'going to', 'be'] },
    ...['should', 'could', 'would', 'might', 'may', 'must'].map(m => ({ id: 'm-' + m, g: 'modal', en: m[0].toUpperCase() + m.slice(1) + ' have + V3', lesson: m === 'must' || m === 'might' || m === 'may' || m === 'could' ? 'modals-deduction' : m === 'would' ? 'conditionals-2-3' : 'modals-obligation-advice', fa: `S + ${m} + have + V3`, fp: `S + ${m} + have + been + V3`, act: (p, v) => [m, 'have', v.PP], pas: () => [m, 'have', 'been'], modal: m })),
  ];
  const GROUPS = ['present', 'past', 'future', 'modal'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const join = a => a.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  // Một câu theo ngôi: khẳng định / phủ định / nghi vấn (+ dạng rút gọn)
  function sentence(subj, p, chain, v, tense, tail) {
    const t = tail ? ' ' + tail : '';
    let aux = chain.slice(0, -1), main = chain[chain.length - 1], lone = false;
    if (chain.length === 1 && v.base === 'be' && tense.simple) { aux = chain; main = ''; lone = true; } // be: tự làm trợ động từ
    const sj = subj, out = {};
    if (!aux.length) { // do-support
      const d = tense.simple === 'past' ? 'did' : p === '3s' ? 'does' : 'do';
      out.aff = join([sj, main]) + t;
      out.neg = join([sj, d, 'not', v.base]) + t; out.negC = join([sj, NEG[d], v.base]) + t;
      out.q = join([cap(d), sj, v.base]) + t + '?';
      return out;
    }
    const op = aux[0], rest = aux.slice(1);
    out.aff = join([sj, ...aux, main]) + t;
    if (CON[op]) out.affC = join([sj + CON[op], ...rest, main]) + t; // I'm, he's, they've, I'll, I'd
    out.neg = join([sj, op, 'not', ...rest, main]) + t;
    if (op === 'am') out.negC = join([sj + "'m", 'not', ...rest, main]) + t;
    else if (NEG[op]) out.negC = join([sj, NEG[op], ...rest, main]) + t;
    out.q = join([cap(op), sj, ...rest, main]) + t + '?';
    return out;
  }
  function table(input, opt = {}) {
    const r = typeof input === 'string' ? resolve(input) : input;
    if (!r || r.modal) return null;
    const v = forms(r.base, opt), tail = r.tail || '';
    const passiveOk = v.passive && !tail;
    return GROUPS.map(gid => ({
      id: gid,
      tenses: TENSES.filter(x => x.g === gid).map(x => {
        // be ở thì hoàn thành tiếp diễn / tương lai tiếp diễn ("has been being") gần như không dùng
        if (v.base === 'be' && /^(ppc|papc|fc|fpc)$/.test(x.id)) return { id: x.id, en: x.en, lesson: x.lesson, formula: x.fa, formulaP: '', rare: true, rows: [], passive: null, example: { en: '', passive: '' } };
        const rows = P.map(([sj, p]) => Object.assign({ p, subj: sj === 'he' ? 'he/she/it' : sj }, sentence(sj, p, x.act(p, v), v, x, tail)));
        let passive = null;
        if (passiveOk) passive = x.pas ? P.map(([sj, p]) => Object.assign({ p, subj: sj === 'he' ? 'he/she/it' : sj }, sentence(sj, p, [...x.pas(p), v.PP], { base: 'be' }, {}, ''))) : 'rare';
        // must have: phủ định suy luận dùng can't/couldn't have; câu hỏi gần như không dùng
        if (x.modal === 'must') rows.forEach(row => { row.negC = row.neg.replace('must not', "can't"); row.q = ''; });
        if (x.modal === 'may') rows.forEach(row => { row.q = ''; });
        return { id: x.id, en: x.en, lesson: x.lesson, formula: x.fa, formulaP: x.fp || '', cont: !!x.cont, stative: !!x.cont && v.stative, dual: !!x.cont && v.dual && !v.stative && v.base !== 'be', mustNote: x.modal === 'must', rows, passive, example: example(x, v, tail) };
      }),
    }));
  }

  // ---------- Câu ví dụ (nội dung tiếng Anh – không dịch) ----------
  const OBJ = { read: 'the news', write: 'an email', eat: 'breakfast', drink: 'coffee', play: 'football', watch: 'a film', learn: 'English', study: 'English', make: 'dinner', cook: 'dinner', take: 'the bus', buy: 'a new laptop', sell: 'old books', drive: 'a car', build: 'a house', open: 'the window', close: 'the door', clean: 'the kitchen', send: 'an email', call: 'the office', visit: 'the museum', help: 'the team', meet: 'new people', teach: 'maths', speak: 'French', sing: 'a song', draw: 'a map', paint: 'the wall', wash: 'the dishes', do: 'the shopping', get: 'a message', give: 'a talk', tell: 'a story', bring: 'lunch', find: 'the answer', lose: 'the keys', forget: 'the password', choose: 'a topic', break: 'the record', catch: 'the train', ride: 'a bike', wear: 'a uniform', throw: 'the ball', hit: 'the ball', kick: 'the ball', carry: 'the bags', pay: 'the bill', spend: 'money', keep: 'a diary', leave: 'the office', see: 'the doctor', hear: 'the news', know: 'the answer', have: 'lunch', use: 'a laptop', want: 'a new phone', need: 'help', like: 'jazz', love: 'music', hate: 'the rain', prefer: 'tea', believe: 'the story', understand: 'the rules', remember: 'the date', fly: 'a drone', shut: 'the gate', cut: 'the grass', fix: 'the printer', check: 'the email', answer: 'the phone', finish: 'the report', start: 'the project', begin: 'the lesson', plan: 'a trip', prepare: 'the slides', explain: 'the rules', review: 'the notes', improve: 'the design', win: 'the match', feed: 'the cat', hold: 'a meeting', lead: 'the team', run: 'a café', set: 'a goal', put: 'the box', grow: 'tomatoes', hang: 'the picture', lay: 'the table', raise: 'a question', bear: 'the pain', beat: 'the record', bite: 'the apple', blow: 'the whistle', dig: 'a hole', feel: 'the heat', fight: 'the fire', forgive: 'the mistake', freeze: 'the soup', hide: 'the gift', lend: 'money', mean: 'it', show: 'the photos', shake: 'hands', steal: 'the idea', strike: 'a deal', swear: 'an oath', sweep: 'the floor', tear: 'the paper' };
  const COMP = { be: 'busy', become: 'stronger', seem: 'happy', remain: 'calm', go: 'to work', come: 'home', arrive: 'at work', live: 'in the city', work: 'from home', sleep: 'well', wait: 'for the bus', listen: 'to music', look: 'at the board', talk: 'to the manager', travel: 'abroad', stay: 'at home', run: 'in the park', walk: 'to school', swim: 'in the lake', sit: 'by the window', stand: 'by the door', lie: 'on the sofa', rise: 'early', fall: 'asleep', depend: 'on the weather', belong: 'to the club', consist: 'of three parts', agree: 'with the plan', apologise: 'for the delay', apologize: 'for the delay', complain: 'about the noise', laugh: 'at the joke', smile: 'at the camera', think: 'about the future', jump: 'into the pool', respond: 'to emails', react: 'quickly', graduate: 'from university', retire: 'early', exist: 'online', happen: 'here', occur: 'here', appear: 'on TV', disappear: 'quickly', die: 'young', cry: 'at sad films', differ: 'from the original', succeed: 'at work', compete: 'in the final', participate: 'in the event', insist: 'on paying', cope: 'with stress', hesitate: 'before answering', emerge: 'from the shadows' };
  const TIME = { ps: 'every day', pc: 'right now', pp: 'recently', ppc: 'all morning', pas: 'yesterday', pac: 'when the phone rang', pap: 'before we arrived', papc: 'for hours before we arrived', fs: 'tomorrow', gt: 'next week', fc: 'at 8 p.m. tomorrow', fp: 'by Friday', fpc: 'for two hours by noon', fip: 'the next day', fipg: '', 'm-should': 'earlier', 'm-could': 'yesterday', 'm-would': '', 'm-might': 'last night', 'm-may': 'last week', 'm-must': 'by then' };
  const SUBJ = { ps: ['She', '3s'], pc: ['They', '3p'], pp: ['I', '1s'], ppc: ['He', '3s'], pas: ['We', '1p'], pac: ['She', '3s'], pap: ['They', '3p'], papc: ['He', '3s'], fs: ['I', '1s'], gt: ['We', '1p'], fc: ['She', '3s'], fp: ['They', '3p'], fpc: ['I', '1s'], fip: ['she', '3s'], fipg: ['I', '1s'], 'm-should': ['You', '2'], 'm-could': ['They', '3p'], 'm-would': ['I', '1s'], 'm-might': ['He', '3s'], 'm-may': ['She', '3s'], 'm-must': ['She', '3s'] };
  function example(x, v, tail) {
    const [sj, p] = SUBJ[x.id], b = v.base;
    const obj = tail || (v.transitive ? (OBJ[b] || COMP[b] || 'it') : (COMP[b] || ''));
    const chain = x.act(p, v), s = sentence(sj, p, chain, v, x, '');
    let core = join([s.aff, obj]);
    if (b === 'be' && x.cont) core = join([sj, ...chain, 'very careful']); // "They are being very careful"
    const time = TIME[x.id];
    let en;
    if (x.id === 'fip') en = `She said ${core}${time ? ' ' + time : ''}.`;
    else if (x.id === 'fipg') en = `${core}, but there was no time.`;
    else if (x.id === 'm-would') en = `${core} if I had known.`;
    else en = `${core}${time ? ' ' + time : ''}.`;
    let pas = '';
    if (v.passive && !tail && x.pas && (OBJ[b] || !COMP[b])) {
      const o = OBJ[b] || 'it', subj = o === 'it' ? 'It' : cap(o), plural = /[^su]s$/.test(o) && !/news$/.test(o) && o !== 'maths';
      const pp = plural ? '3p' : '3s', ps = sentence(subj, pp, [...x.pas(pp), v.PP], { base: 'be' }, {}, '');
      pas = x.id === 'fip' ? `She said ${ps.aff.replace(/^\S+/, w => w.toLowerCase() === 'it' ? 'it' : w.toLowerCase())}${time ? ' ' + time : ''}.` : x.id === 'fipg' ? `${ps.aff}, but there was no time.` : x.id === 'm-would' ? `${ps.aff} if I had known.` : `${ps.aff}${time ? ' ' + time : ''}.`;
    }
    return { en: en.replace(/\s+/g, ' ').replace(/\s+([,.?])/g, '$1'), passive: pas };
  }

  // ---------- Lỗi hay gặp ----------
  const MIS = {
    agree: [['I am agree with you.', 'I agree with you.', 'agree']], disagree: [['She is disagree.', 'She disagrees.', 'agree']],
    listen: [['I listen music every day.', 'I listen to music every day.', 'listen-to']], discuss: [['We discussed about the plan.', 'We discussed the plan.', 'discuss']],
    explain: [['Can you explain me the rule?', 'Can you explain the rule to me?', 'explain']], enjoy: [['I enjoy to swim.', 'I enjoy swimming.', 'ving']], avoid: [['Avoid to eat late.', 'Avoid eating late.', 'ving']],
    marry: [['She married with a doctor.', 'She married a doctor.', 'marry']], enter: [['He entered into the room.', 'He entered the room.', 'enter']],
    arrive: [['We arrived to London.', 'We arrived in London.', 'arrive']], depend: [['It depends of the weather.', 'It depends on the weather.', 'depend']],
    lie: [['I laid on the bed.', 'I lay on the bed.', 'lie-lay'], ['He lied on the sofa.', 'He lay on the sofa.', 'lie-lay']], lay: [['Lay down and rest.', 'Lie down and rest.', 'lie-lay']],
    rise: [['Prices raised by 10%.', 'Prices rose by 10%.', 'rise-raise']], raise: [['The government rose taxes.', 'The government raised taxes.', 'rise-raise']],
    bear: [['I was borned in 2005.', 'I was born in 2005.', 'born']], want: [['I want go home.', 'I want to go home.', 'want-to']], let: [['Let me to help you.', 'Let me help you.', 'let']], make: [['She made me to wait.', 'She made me wait.', 'let']],
    be: [['Do you are ready?', 'Are you ready?', 'be-do'], ['I didn\'t was there.', 'I wasn\'t there.', 'be-do'], ['I am agree.', 'I agree.', 'agree']],
    have: [['He have a car.', 'He has a car.', 'sva'], ['I am having a car.', 'I have a car.', 'stative']],
    look: [['I look forward to see you.', 'I look forward to seeing you.', 'look-forward']], suggest: [['He suggested me to go.', 'He suggested that I (should) go.', 'suggest']],
    hope: [['I hope you will can come.', 'I hope you can come.', 'will-can']], recommend: [['I recommend you to try it.', 'I recommend that you try it.', 'suggest']],
    lend: [['Can you lend me? I need to borrow.', 'Can you lend me £10? / Can I borrow £10?', 'lend-borrow']], borrow: [['Can you borrow me your pen?', 'Can you lend me your pen?', 'lend-borrow']],
    say: [['He said me that he was tired.', 'He told me that he was tired.', 'say-tell']], tell: [['She told that she was busy.', 'She said that she was busy.', 'say-tell']],
    get: [['I have gotten a car. (UK)', 'I have got a car. (UK) / I have a car.', 'gotten']],
  };
  const MODAL_MIS = [['She can swims.', 'She can swim.', 'modal-base'], ['You must to go.', 'You must go.', 'modal-to'], ['Do you can help?', 'Can you help?', 'modal-q']];
  function mistakes(base) {
    if (MODALS[base]) return MODAL_MIS.map(([wrong, right, code]) => ({ wrong, right, code: code }));
    const f = forms(base), out = [], irr = IRREG[base];
    const add = (wrong, right, code, arg) => { if (wrong !== right && !out.some(x => x.wrong === wrong)) out.push({ wrong, right, code, arg }); };
    (MIS[base] || []).forEach(([wrong, right, code]) => add(wrong, right, code));
    if (base === 'be') return out;
    const reg = suffix(base, 'ed').list[0].w;
    if (irr && !irr.past.some(x => x.w === reg)) add(`Yesterday I ${reg} …`, `Yesterday I ${f.past[0].w} …`, 'overreg', reg);
    if (STATIVE.has(base)) add(`I am ${f.ING} …`, `I ${base} …`, 'stative');
    if (irr && f.P !== f.PP && base !== 'have') add(`I have ${f.P} …`, `I have ${f.PP} …`, 'have-v2');
    const sp = { double: [base + 'ed', f.past[0].w], y: [base + 'ed', f.past[0].w] }[f.rules.ed];
    if (sp && !irr) add(sp[0], sp[1], 'sp-' + f.rules.ed);
    const si = { e: base + 'ing', ie: base.replace(/e$/, '') + 'eing', double: base + 'ing', ic: base + 'ing' }[f.rules.ing];
    if (si) add(si, f.ing[0].w, 'sp-' + f.rules.ing);
    if (f.rules.s === 'y') add(base + 's', f.s[0].w, 'sp-ys');
    if (f.P !== base) add(`Did you ${f.P} …?`, `Did you ${base} …?`, 'did-v2');
    if (base !== 'have') add(`He doesn't ${f.S} …`, `He doesn't ${base} …`, 'doesnt-s');
    return out.slice(0, 6);
  }

  // ---------- Danh sách & gợi ý ----------
  const PATTERN = b => { const r = IRREG[b], p = r.past[0].w, pp = r.pp[0].w; return p === b && pp === b ? 'AAA' : p === pp ? 'ABB' : pp === b ? 'ABA' : 'ABC'; };
  const irregularList = () => Object.keys(IRREG).filter(b => forms(b).irregular).map(b => ({ base: b, past: IRREG[b].past, pp: IRREG[b].pp, pattern: PATTERN(b) }));
  function suggest(q, n = 8) {
    const s = clean(q); if (!s) return [];
    const out = [], seen = new Set(), push = (base, via) => { if (!seen.has(base) && out.length < n) { seen.add(base); out.push({ base, via }); } };
    const r = resolve(s);
    if (r && r.base !== s.split(' ')[0] && (known(r.base) || MODALS[r.base])) push(r.base, s.split(' ')[0]);
    for (const m of Object.keys(MODALS)) if (m.startsWith(s)) push(m);
    for (const v of ORDER) if (v.startsWith(s)) push(v);
    for (const v of extra) if (v.startsWith(s)) push(v);
    return out;
  }
  // Mục từ điển (Dict) là động từ? → gốc để mở trang chia (went → go, give up → give up); không phải → ''
  function verbOf(e) {
    if (!e || !e.word) return '';
    const w = clean(e.word); if (!w || w.split(' ').length > 3) return '';
    const pos = [e.pos, ...(e.oxford || []), ...(e.meanings || []), ...(e.senses || [])].map(x => (typeof x === 'string' ? x : x && x.pos) || '').join(' ').toLowerCase();
    const r = resolve(w); if (!r) return '';
    if (r.modal) return r.base;
    if (/(^|[^a-z])(v|verb)([^a-z]|$)|động từ/.test(pos) || (r.from !== 'base' && known(r.base))) return r.base + (r.tail ? ' ' + r.tail : '');
    return '';
  }
  function addKnown(list) { for (const w of list || []) { const x = String(w).toLowerCase(); if (/^[a-z]+$/.test(x) && x.length > 1) extra.add(x); } }

  g.LK_VERBS = { resolve, verbOf, forms, table, mistakes, suggest, addKnown, irregularList, edSound, sSound, finalSound, endIpa, modal: b => MODALS[b] || null, MODALS, TENSES: TENSES.map(x => ({ id: x.id, g: x.g, en: x.en })), GROUPS, isIrregular: b => !!IRREG[b], known: w => known(w) || !!IRREG[w] || !!MODALS[w] };
})(typeof self !== 'undefined' ? self : this);
