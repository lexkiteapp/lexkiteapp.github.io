/* Phát âm – Luyện NÓI cặp từ tối thiểu (minimal pairs) cho người Việt, giọng Mỹ.
 * Dữ liệu cặp theo "đối lập âm" + logic thuần (chuẩn hóa, chấm, chọn câu thích ứng, lưu tiến bộ) – không phụ thuộc DOM,
 * test: scripts/test/pron-pairs.mjs. IPA kiểu Cambridge (Mỹ), đối chiếu content/lexicon/cmudict-subset.txt. */
(function (g) {
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  // a/b: âm của từ thứ nhất / thứ hai trong mỗi cặp. 'w=ipa' = IPA riêng cho cặp này (từ nhiều cách đọc).
  const CONTRASTS = [
    { id: 'th-s', a: 'θ', b: 's', skills: ['th-sounds','θ','s'], pairs: 'think/sink thank/sank thick/sick path/pass mouth/mouse thumb/sum faith/face worth/worse' },
    { id: 'th-t', a: 'θ', b: 't', skills: ['th-sounds','θ','t'], pairs: 'three/tree thank/tank thin/tin thought/taught both/boat theme/team tenth/tent math/mat' },
    { id: 'dh-d', a: 'ð', b: 'd', skills: ['th-sounds','ð','d'], pairs: 'they/day then/den though/dough there/dare those/doze breathe/breed worthy/wordy lather/ladder' },
    { id: 'dh-z', a: 'ð', b: 'z', skills: ['th-sounds','ð','z'], pairs: 'breathe/breeze clothing/closing clothe/close=kloʊz bathe/bays' },
    { id: 's-z', a: 's', b: 'z', skills: ['final-consonants','s','z'], pairs: 'rice/rise price/prize bus/buzz place/plays peace/peas loose/lose race/raise ice/eyes' },
    { id: 'final-drop', a: '+C', b: '∅', skills: ['final-consonants'], pairs: 'bite/buy wait/way light/lie road/row tight/tie side/sigh make/may keep/key' },
    { id: 'final-voice', a: 't k f', b: 'd ɡ v', skills: ['final-consonants'], pairs: 'bat/bad back/bag safe/save life/live seat/seed write/ride half/have proof/prove pick/pig lock/log' },
    { id: 'p-b', a: 'p', b: 'b', skills: ['final-consonants','p','b'], pairs: 'cap/cab rope/robe mop/mob tap/tab lap/lab cup/cub rip/rib' },
    { id: 'plural', a: '∅', b: 's z ɪz', skills: ['s-endings','final-consonants'], pairs: 'job/jobs benefit/benefits change/changes price/prices city/cities say/says cat/cats book/books map/maps friend/friends' },
    { id: 'ed', a: '∅', b: 't d ɪd', skills: ['ed-endings'], pairs: 'play/played help/helped want/wanted need/needed study/studied fix/fixed walk/walked call/called start/started cook/cooked' },
    { id: 'sh-s', a: 'ʃ', b: 's', skills: ['sh-ch-zh','ʃ','s'], pairs: 'she/see short/sort shave/save shell/sell sheet/seat ship/sip shoe/sue mash/mass' },
    { id: 'ch-sh', a: 'tʃ', b: 'ʃ', skills: ['sh-ch-zh','tʃ','ʃ'], pairs: 'chair/share watch/wash cheap/sheep chip/ship chop/shop match/mash catch/cash choose/shoes' },
    { id: 'ch-j', a: 'tʃ', b: 'dʒ', skills: ['sh-ch-zh','tʃ','dʒ'], pairs: 'cheap/jeep choke/joke chest/jest rich/ridge batch/badge' },
    { id: 'j-z', a: 'dʒ', b: 'z', skills: ['sh-ch-zh','dʒ','z'], pairs: 'jest/zest budge/buzz wage/ways rage/raise siege/seize' },
    { id: 'j-y', a: 'dʒ', b: 'j', skills: ['sh-ch-zh','dʒ','j'], pairs: 'jet/yet jam/yam joke/yolk jello/yellow juice/use' },
    { id: 'r-l', a: 'r', b: 'l', skills: ['l-n-clusters','r','l'], pairs: 'right/light read/lead rock/lock road/load grass/glass pray/play fry/fly crowd/cloud' },
    { id: 'l-n', a: 'l', b: 'n', skills: ['l-n-clusters','l','n'], pairs: 'light/night low/no lot/not lead/need line/nine lock/knock let/net lap/nap' },
    { id: 'cluster', a: 'CC', b: 'CəC', skills: ['l-n-clusters'], pairs: 'sport/support blow/below test/tests prayed/parade claps/collapse' },
    { id: 'i-ih', a: 'iː', b: 'ɪ', skills: ['iː','ɪ'], pairs: 'sheep/ship leave/live=lɪv seat/sit feel/fill heat/hit beat/bit sleep/slip reach/rich' },
    { id: 'ae-e', a: 'æ', b: 'e', skills: ['æ','e'], pairs: 'bad/bed man/men pan/pen sad/said bag/beg had/head sat/set land/lend' },
    { id: 'uh-ah', a: 'ʌ', b: 'ɑː', skills: ['ʌ','ɑː'], pairs: 'cut/cot luck/lock hut/hot cup/cop duck/dock nut/not shut/shot rub/rob' },
    { id: 'v-b', a: 'v', b: 'b', skills: ['v','b'], pairs: 'very/berry vest/best vote/boat van/ban vet/bet curve/curb vase/base marvel/marble' },
    { id: 'w-v', a: 'w', b: 'v', skills: ['w','v'], pairs: 'wet/vet west/vest wine/vine while/vile worse/verse went/vent whale/veil wow/vow' },
  ];
  const IPA = {"back":"bæk","bad":"bæd","badge":"bædʒ","bag":"bæɡ","ban":"bæn","base":"beɪs","bat":"bæt","batch":"bætʃ","bathe":"beɪð","bays":"beɪz","beat":"biːt","bed":"bed","beg":"beɡ","below":"bɪˈloʊ","benefit":"ˈbenəfɪt","benefits":"ˈbenəfɪts","berry":"ˈberi","best":"best","bet":"bet","bit":"bɪt","bite":"baɪt","blow":"bloʊ","boat":"boʊt","book":"bʊk","books":"bʊks","both":"boʊθ","breathe":"briːð","breed":"briːd","breeze":"briːz","budge":"bʌdʒ","bus":"bʌs","buy":"baɪ","buzz":"bʌz","cab":"kæb","call":"kɔːl","called":"kɔːld","cap":"kæp","cash":"kæʃ","cat":"kæt","catch":"kætʃ","cats":"kæts","chair":"tʃer","change":"tʃeɪndʒ","changes":"ˈtʃeɪndʒəz","cheap":"tʃiːp","chest":"tʃest","chip":"tʃɪp","choke":"tʃoʊk","choose":"tʃuːz","chop":"tʃɑːp","cities":"ˈsɪtiz","city":"ˈsɪti","claps":"klæps","close":"kloʊs","closing":"ˈkloʊzɪŋ","clothe":"kloʊð","clothing":"ˈkloʊðɪŋ","cloud":"klaʊd","collapse":"kəˈlæps","cook":"kʊk","cooked":"kʊkt","cop":"kɑːp","cot":"kɑːt","crowd":"kraʊd","cub":"kʌb","cup":"kʌp","curb":"kɝːb","curve":"kɝːv","cut":"kʌt","dare":"der","day":"deɪ","den":"den","dock":"dɑːk","dough":"doʊ","doze":"doʊz","duck":"dʌk","eyes":"aɪz","face":"feɪs","faith":"feɪθ","feel":"fiːl","fill":"fɪl","fix":"fɪks","fixed":"fɪkst","fly":"flaɪ","friend":"frend","friends":"frendz","fry":"fraɪ","glass":"ɡlæs","grass":"ɡræs","had":"hæd","half":"hæf","have":"hæv","head":"hed","heat":"hiːt","help":"help","helped":"helpt","hit":"hɪt","hot":"hɑːt","hut":"hʌt","ice":"aɪs","jam":"dʒæm","jeep":"dʒiːp","jello":"ˈdʒeloʊ","jest":"dʒest","jet":"dʒet","job":"dʒɑːb","jobs":"dʒɑːbz","joke":"dʒoʊk","juice":"dʒuːs","keep":"kiːp","key":"kiː","knock":"nɑːk","lab":"læb","ladder":"ˈlædɚ","land":"lænd","lap":"læp","lather":"ˈlæðɚ","lead":"liːd","leave":"liːv","lend":"lend","let":"let","lie":"laɪ","life":"laɪf","light":"laɪt","line":"laɪn","live":"laɪv","load":"loʊd","lock":"lɑːk","log":"lɔːɡ","loose":"luːs","lose":"luːz","lot":"lɑːt","low":"loʊ","luck":"lʌk","make":"meɪk","man":"mæn","map":"mæp","maps":"mæps","marble":"ˈmɑːrbəl","marvel":"ˈmɑːrvəl","mash":"mæʃ","mass":"mæs","mat":"mæt","match":"mætʃ","math":"mæθ","may":"meɪ","men":"men","mob":"mɑːb","mop":"mɑːp","mouse":"maʊs","mouth":"maʊθ","nap":"næp","need":"niːd","needed":"ˈniːdɪd","net":"net","night":"naɪt","nine":"naɪn","no":"noʊ","not":"nɑːt","nut":"nʌt","pan":"pæn","parade":"pəˈreɪd","pass":"pæs","path":"pæθ","peace":"piːs","peas":"piːz","pen":"pen","pick":"pɪk","pig":"pɪɡ","place":"pleɪs","play":"pleɪ","played":"pleɪd","plays":"pleɪz","pray":"preɪ","prayed":"preɪd","price":"praɪs","prices":"ˈpraɪsɪz","prize":"praɪz","proof":"pruːf","prove":"pruːv","race":"reɪs","rage":"reɪdʒ","raise":"reɪz","reach":"riːtʃ","read":"riːd","rib":"rɪb","rice":"raɪs","rich":"rɪtʃ","ride":"raɪd","ridge":"rɪdʒ","right":"raɪt","rip":"rɪp","rise":"raɪz","road":"roʊd","rob":"rɑːb","robe":"roʊb","rock":"rɑːk","rope":"roʊp","row":"roʊ","rub":"rʌb","sad":"sæd","safe":"seɪf","said":"sed","sank":"sæŋk","sat":"sæt","save":"seɪv","say":"seɪ","says":"sez","seat":"siːt","see":"siː","seed":"siːd","seize":"siːz","sell":"sel","set":"set","share":"ʃer","shave":"ʃeɪv","she":"ʃiː","sheep":"ʃiːp","sheet":"ʃiːt","shell":"ʃel","ship":"ʃɪp","shoe":"ʃuː","shoes":"ʃuːz","shop":"ʃɑːp","short":"ʃɔːrt","shot":"ʃɑːt","shut":"ʃʌt","sick":"sɪk","side":"saɪd","siege":"siːdʒ","sigh":"saɪ","sink":"sɪŋk","sip":"sɪp","sit":"sɪt","sleep":"sliːp","slip":"slɪp","sort":"sɔːrt","sport":"spɔːrt","start":"stɑːrt","started":"ˈstɑːrtɪd","studied":"ˈstʌdid","study":"ˈstʌdi","sue":"suː","sum":"sʌm","support":"səˈpɔːrt","tab":"tæb","tank":"tæŋk","tap":"tæp","taught":"tɔːt","team":"tiːm","tent":"tent","tenth":"tenθ","test":"test","tests":"tests","thank":"θæŋk","theme":"θiːm","then":"ðen","there":"ðer","they":"ðeɪ","thick":"θɪk","thin":"θɪn","think":"θɪŋk","those":"ðoʊz","though":"ðoʊ","thought":"θɔːt","three":"θriː","thumb":"θʌm","tie":"taɪ","tight":"taɪt","tin":"tɪn","tree":"triː","use":"juːs","van":"væn","vase":"veɪs","veil":"veɪl","vent":"vent","verse":"vɝːs","very":"ˈveri","vest":"vest","vet":"vet","vile":"vaɪl","vine":"vaɪn","vote":"voʊt","vow":"vaʊ","wage":"weɪdʒ","wait":"weɪt","walk":"wɔːk","walked":"wɔːkt","want":"wɑːnt","wanted":"ˈwɑːntɪd","wash":"wɑːʃ","watch":"wɑːtʃ","way":"weɪ","ways":"weɪz","went":"went","west":"west","wet":"wet","whale":"weɪl","while":"waɪl","wine":"waɪn","wordy":"ˈwɝːdi","worse":"wɝːs","worth":"wɝːθ","worthy":"ˈwɝːði","wow":"waʊ","write":"raɪt","yam":"jæm","yellow":"ˈjeloʊ","yet":"jet","yolk":"joʊk","zest":"zest"};
  // Đồng âm / cách máy hay viết – vẫn tính là đúng từ đó
  const HOM = { see: ['sea', 'c'], sum: ['some'], berry: ['bury'], peas: ['pees'], peace: ['piece'], prize: ['pries'], eyes: ['ayes'], cot: ['caught'], taught: ['taut'], dough: ['doe'], there: ['their', "they're"], though: ['tho'], right: ['write', 'rite'], write: ['right', 'rite'], night: ['knight'], no: ['know'], not: ['knot'], need: ['knead'], buy: ['by', 'bye'], way: ['weigh'], wait: ['weight'], ways: ['weighs'], lie: ['lye'], tie: ['thai'], side: ['sighed'], road: ['rode', 'rowed'], row: ['roe'], load: ['lode'], pray: ['prey'], prayed: ['preyed'], key: ['quay'], sell: ['cell'], shoe: ['shoo'], shoes: ['shoos'], cheap: ['cheep'], cash: ['cache'], choose: ['chews'], use: ['ewes', 'yews'], yolk: ['yoke'], jello: ['jell-o'], raise: ['rays', 'raze'], seize: ['seas', 'sees'], whale: ['wail'], veil: ['vale'], wine: ['whine'], while: ['wile'], beat: ['beet'], team: ['teem'], mat: ['matt', 'matte'], ladder: ['latter'], clothe: ['clothes'], bays: ['beys'], bus: ['buss'], bite: ['byte'], light: ['lite'], seed: ['cede'], lock: ['loch'], jam: ['jamb'], read: ['reed'], low: ['lo'], wet: ['whet'], base: ['bass'], curb: ['kerb'], sink: ['sync'], math: ['maths'], says: ['sez'] };
  const NUM = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', '10th': 'tenth' };
  // Mẹo khẩu hình [cho âm a, cho âm b] – hiện khi người học nói thành từ còn lại
  const TIPS = {
    'th-s': () => [t('Thè đầu lưỡi ra giữa hai hàm răng rồi thổi hơi nhẹ – không để lưỡi sau răng.'), t('Giữ đầu lưỡi sau răng trên, không thè ra; xì hơi như tiếng rắn “sss”.')],
    'th-t': () => [t('Thè đầu lưỡi ra giữa hai hàm răng rồi thổi hơi nhẹ – không để lưỡi sau răng.'), t('Chạm đầu lưỡi vào lợi sau răng trên rồi bật ra – không thè lưỡi.')],
    'dh-d': () => [t('Thè đầu lưỡi giữa hai hàm răng, thổi hơi và rung cổ (đặt tay lên cổ để cảm nhận).'), t('Đầu lưỡi chạm lợi sau răng trên rồi bật ra, có rung cổ – không thè lưỡi.')],
    'dh-z': () => [t('Thè đầu lưỡi giữa hai hàm răng, thổi hơi và rung cổ (đặt tay lên cổ để cảm nhận).'), t('Giữ lưỡi sau răng và ngân “zzz” như tiếng ong – không thè lưỡi.')],
    's-z': () => [t('Âm cuối /s/ không rung cổ và nguyên âm trước nó ngắn: “rice” gọn, xì hơi rõ.'), t('Âm cuối /z/ rung cổ và kéo dài nguyên âm trước nó: “riiise-zzz”.')],
    'final-drop': () => [t('Đừng nuốt âm cuối: chặn rồi bật nhẹ /t/, /k/, /p/, /d/ ở cuối từ.'), t('Từ này kết thúc bằng nguyên âm – không thêm phụ âm cuối, kéo dài nguyên âm tự nhiên.')],
    'final-voice': () => [t('Phụ âm cuối vô thanh: cắt nguyên âm ngắn rồi bật hơi gọn /t/ /k/ /f/.'), t('Phụ âm cuối hữu thanh: kéo dài nguyên âm và rung cổ khi kết thúc /d/ /ɡ/ /v/.')],
    'p-b': () => [t('Cuối từ /p/: khép môi, nguyên âm ngắn, bật hơi nhẹ – không rung cổ.'), t('Cuối từ /b/: nguyên âm dài hơn, khép môi và rung cổ – đừng đọc thành “p”.')],
    plural: () => [t('Từ này ở dạng số ít – dừng sau phụ âm cuối, không thêm /s/.'), t('Đừng bỏ đuôi -s: đọc rõ /s/, /z/ hoặc /ɪz/ ở cuối từ.')],
    ed: () => [t('Đây là dạng nguyên mẫu – kết thúc gọn, không thêm âm /t/ hay /d/.'), t('Đọc rõ đuôi -ed: /t/ sau âm vô thanh, /d/ sau âm hữu thanh, /ɪd/ sau t, d.')],
    'sh-s': () => [t('Chu môi tròn ra trước, lưỡi lùi về sau một chút, thổi “suỵt” /ʃ/.'), t('Môi dẹt, đầu lưỡi sát răng trên, xì hơi mảnh “sss” – không chu môi.')],
    'ch-sh': () => [t('Bắt đầu bằng một cú chặn /t/ rồi bật ra “ch” – âm ngắn, dứt khoát.'), t('Không chặn lưỡi: để hơi chảy liên tục “shhh”.')],
    'ch-j': () => [t('Như “ch” nhưng không rung cổ – chỉ bật hơi.'), t('Cùng khẩu hình với “ch” nhưng rung cổ: “j” trong “jeep”.')],
    'j-z': () => [t('Chặn lưỡi rồi bật ra “dʒ” có rung cổ – môi hơi chu.'), t('Không chặn: lưỡi sau răng, ngân liên tục “zzz”.')],
    'j-y': () => [t('Âm “j” có chặn lưỡi và rung cổ, mạnh hơn “y”.'), t('Âm /j/ nhẹ, lướt nhanh như “i” ngắn – lưỡi không chạm ngạc.')],
    'r-l': () => [t('Cong đầu lưỡi lên nhưng KHÔNG chạm ngạc, môi hơi tròn.'), t('Đầu lưỡi chạm chắc vào lợi sau răng trên, hơi đi hai bên lưỡi.')],
    'l-n': () => [t('Đầu lưỡi chạm lợi nhưng hơi đi qua miệng – không phải qua mũi.'), t('Đầu lưỡi chạm lợi và hơi đi qua mũi (bịt mũi sẽ thấy khác).')],
    cluster: () => [t('Đọc liền cụm phụ âm, không chèn “ơ” vào giữa: “sport”, không phải “sơ-port”.'), t('Từ này có thêm một âm tiết nhẹ /ə/ – đọc rõ hai âm tiết.')],
    'i-ih': () => [t('Kéo môi cười, căng lưỡi và kéo dài “iiii”.'), t('Thả lỏng miệng, đọc ngắn và gọn – giữa “i” và “ê”.')],
    'ae-e': () => [t('Há miệng rộng, hạ cằm xuống thấp như “e” kéo về “a”.'), t('Miệng mở vừa, cằm không hạ sâu – “e” gọn.')],
    'uh-ah': () => [t('Miệng mở vừa, thả lỏng, âm ngắn như “â”.'), t('Há miệng thật to, lưỡi hạ thấp, kéo dài “aaa” như khi bác sĩ khám họng.')],
    'v-b': () => [t('Răng trên chạm nhẹ môi dưới, thổi hơi và rung cổ – môi không khép lại.'), t('Hai môi khép chặt rồi bật ra – răng không chạm môi.')],
    'w-v': () => [t('Chu tròn hai môi như “u” rồi mở ra – răng không chạm môi.'), t('Răng trên chạm môi dưới, rung cổ “vvv” – không tròn môi.')],
  };
  const LABEL = { 'final-drop': () => t('Giữ âm cuối'), cluster: () => t('Cụm phụ âm'), plural: () => '-s', ed: () => '-ed' };
  const label = c => (LABEL[c.id] ? LABEL[c.id]() : `/${c.a}/ – /${c.b}/`);

  // Cặp của 1 đối lập: [{ c, words:[w0,w1], ipa:[i0,i1] }]
  const pairsOf = c => c.pairs.split(' ').map(p => { const ws = p.split('/').map(x => x.split('=')); return { c: c.id, words: ws.map(x => x[0]), ipa: ws.map(x => '/' + (x[1] || IPA[x[0]] || '') + '/') }; });
  const forSkill = id => CONTRASTS.filter(c => c.skills.includes(id));

  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean).map(w => NUM[w] || w);
  const forms = w => [w, ...(HOM[w] || [])].map(f => f.replace(/[^a-z']/g, ''));
  const has = (alt, w) => { const tk = norm(alt), j = tk.join(''); return forms(w).some(f => tk.includes(f) || j === f); };
  // alts: danh sách phương án máy nghe (tốt nhất trước). Phương án đầu tiên phân định được (chỉ chứa 1 trong 2 từ) quyết định.
  function decide(alts, target, other) {
    const list = (Array.isArray(alts) ? alts : [alts]).filter(a => a != null && String(a).trim());
    for (const a of list) { const t = has(a, target), o = has(a, other); if (t && !o) return { res: 'target', heard: a }; if (o && !t) return { res: 'other', heard: a }; }
    return { res: 'neither', heard: list[0] || '' };
  }

  // Thống kê: { [contrastId]: { ok, n, hist:[{ d, ok, n }] } }
  const acc = s => (s && s.n ? s.ok / s.n : null);
  function weight(stats, id) { const a = acc(stats[id]); return a == null ? 2 : 1 + 3 * (1 - a); } // âm yếu / chưa luyện xuất hiện nhiều hơn
  // Tạo 10 lượt: trộn cả 2 từ của cặp, ưu tiên đối lập yếu, không lặp cặp liền nhau
  function buildSession(contrasts, stats = {}, n = 10, rnd = Math.random) {
    const pool = contrasts.map(c => ({ c, ps: pairsOf(c), used: 0, side: rnd() < 0.5 ? 0 : 1 }));
    if (!pool.length) return [];
    const out = [];
    for (let k = 0; k < n; k++) {
      const tot = pool.reduce((s, p) => s + weight(stats, p.c.id) / (1 + p.used * 0.5), 0);
      let r = rnd() * tot, pick = pool[pool.length - 1];
      for (const p of pool) { r -= weight(stats, p.c.id) / (1 + p.used * 0.5); if (r <= 0) { pick = p; break; } }
      const pr = pick.ps[pick.used % pick.ps.length];
      out.push(item(pr, pick.side)); pick.side ^= 1; pick.used++; // xen kẽ từ thứ nhất / thứ hai
    }
    for (let k = 1; k < out.length; k++) if (out[k].words.join() === out[k - 1].words.join()) { const j = out.findIndex((x, i) => i > k && x.words.join() !== out[k].words.join()); if (j > 0) [out[k], out[j]] = [out[j], out[k]]; }
    return out;
  }
  const item = (pr, side) => ({ c: pr.c, words: pr.words, ipa: pr.ipa, side, target: pr.words[side], other: pr.words[1 - side] });
  // Nói sai → 3 lượt sau gặp lại đúng đối lập đó (cặp khác nếu có, cùng âm đích)
  function adapt(queue, idx, it, gap = 3) {
    const at = Math.min(idx + gap, queue.length - 1);
    if (at <= idx) return queue;
    const c = CONTRASTS.find(x => x.id === it.c), ps = c ? pairsOf(c) : [];
    const alt = ps.find(p => p.words.join() !== it.words.join() && !queue.slice(idx + 1).some(q => q.words.join() === p.words.join())) || ps.find(p => p.words.join() === it.words.join());
    if (alt) queue[at] = Object.assign(item(alt, it.side), { retry: true });
    return queue;
  }
  function record(stats, id, ok) { const s = stats[id] = stats[id] || { ok: 0, n: 0, hist: [] }; s.n++; if (ok) s.ok++; return stats; }
  // Kết thúc lượt: lưu lịch sử theo phiên (giữ 12 phiên gần nhất) để xem tiến bộ
  function endSession(stats, session, day) {
    for (const id of Object.keys(session)) { const s = stats[id] = stats[id] || { ok: 0, n: 0, hist: [] }; s.hist = (s.hist || []).concat({ d: day, ok: session[id].ok, n: session[id].n }).slice(-12); }
    return stats;
  }
  // Âm yếu: đã luyện ≥ 2 lần, tỉ lệ đúng < 80 %, thấp nhất trước
  const weak = (stats, ids) => (ids || Object.keys(stats)).filter(id => stats[id] && stats[id].n >= 2 && acc(stats[id]) < 0.8).sort((a, b) => acc(stats[a]) - acc(stats[b]));
  const KEY = 'lk.pronPairs';
  function load(st) { try { const v = JSON.parse((st || g.localStorage).getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function save(stats, st) { try { (st || g.localStorage).setItem(KEY, JSON.stringify(stats)); return true; } catch (e) { return false; } }

  g.PronPairs = { CONTRASTS, IPA, HOM, TIPS, label, pairsOf, forSkill, norm, decide, buildSession, adapt, record, endSession, weak, acc, load, save, KEY };
})(typeof self !== 'undefined' ? self : this);
