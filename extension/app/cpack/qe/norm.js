/* Chuẩn hóa đáp án điền từ IELTS (tải lười cùng gói đề, trước qengine.js): QEN.key(s) → khóa so sánh.
 * Cùng khóa = cùng đáp án: Anh/Mỹ (colour/color, centre/center, travelled/traveled, organise/organize),
 * số chữ ↔ số (twenty-five = 25, one hundred = 100, 1st = first), gạch nối/dấu cách (well-known = well known).
 * Việc ĐẾM từ (giới hạn "NO MORE THAN TWO WORDS") không đổi: qengine.words. Phép so: scripts/test/qengine-norm.mjs. */
(function (g) {
  const U = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '),
    T = 'twenty thirty forty fifty sixty seventy eighty ninety'.split(' '),
    O = 'zeroth first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth'.split(' '),
    // UK → US (gốc từ; đuôi s/ed/ing/er/ers/ist/ists/ly/ful/able/ation… được giữ)
    UK = ('colour=color honour=honor labour=labor neighbour=neighbor favour=favor favourite=favorite behaviour=behavior flavour=flavor harbour=harbor humour=humor rumour=rumor vapour=vapor odour=odor armour=armor rigour=rigor vigour=vigor valour=valor endeavour=endeavor saviour=savior ' +
      'centre=center theatre=theater metre=meter litre=liter fibre=fiber calibre=caliber sombre=somber spectre=specter ' +
      'licence=license defence=defense offence=offense pretence=pretense ' +
      'travell=travel cancell=cancel modell=model signall=signal fuell=fuel marvell=marvel levell=level counsell=counsel quarrell=quarrel jewell=jewel ' +
      'catalogue=catalog dialogue=dialog analogue=analog programme=program ' +
      'grey=gray tyre=tire kerb=curb plough=plow draught=draft cheque=check mum=mom aluminium=aluminum sceptic=skeptic ageing=aging ' +
      'paediatric=pediatric anaesthetic=anesthetic oestrogen=estrogen foetus=fetus manoeuvre=maneuver encyclopaedia=encyclopedia leukaemia=leukemia diarrhoea=diarrhea orthopaedic=orthopedic ' +
      'enrol=enroll fulfil=fulfill instalment=installment skilful=skillful wilful=willful judgement=judgment acknowledgement=acknowledgment ' +
      'storey=story sulphur=sulfur pyjamas=pajamas artefact=artifact moustache=mustache doughnut=donut jewellery=jewelry practise=practice ' +
      'cosy=cozy mould=mold smoulder=smolder whilst=while amongst=among learnt=learned spelt=spelled burnt=burned dreamt=dreamed spoilt=spoiled').split(' ').map(x => x.split('=')),
    SUF = /^(s|es|d|ed|ing|er|ers|ist|ists|ly|y|ful|able|ite|ites|ation|ations)?$/;
  const num = t => { const u = U.indexOf(t); if (u >= 0) return u; const k = T.indexOf(t); return k >= 0 ? (k + 2) * 10 : -1; };
  const us = t => {
    for (const [a, b] of UK) if (t.startsWith(a) && SUF.test(t.slice(a.length))) return b + t.slice(a.length);
    const m = /^(\w{3,}?)is(e|ed|es|ing|ation|ations)$/.exec(t); // organise → organize (trừ từ gốc -ise thật)
    if (m && !/^(adv|rev|dev|exerc|rise|ar|ra|pra|prom|surpr|compr|comprom|supervi|prec|conc|prem|enterpr|disgu|nois|wis|otherw|expert|franch|merchand|treat|parad|promi|televi|improv|advert|despi|excis|cir|d[ei]m)$/.test(m[1]) && !/^(rise|raise|praise|arise|wise|noise|precise|concise|premise|promise|expertise|franchise|exercise|advise|revise|devise|supervise|surprise|comprise|compromise|disguise|demise|paradise|enterprise|televise|improvise|despise|excise|merchandise|treatise)$/.test(t)) return m[1] + 'iz' + m[2];
    return t.replace(/ys(e|ed|es|ing)$/, 'yz$1'); // analyse → analyze, paralyse → paralyze
  };
  g.QEN = {
    key(s) {
      const toks = String(s == null ? '' : s).toLowerCase().replace(/[’‘`]/g, "'").replace(/[£$€]/g, '').replace(/(\d),(\d{3})/g, '$1$2').replace(/[.,!?;:"“”()]/g, ' ').replace(/[-–—_]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      const out = [];
      for (let i = 0; i < toks.length; i++) {
        let t = toks[i];
        if (/^(the|a|an)$/.test(t) && !out.length && toks.length > 1) continue; // bỏ mạo từ đầu như qengine.norm
        if (/^\d+(st|nd|rd|th)$/.test(t)) { out.push(t.replace(/\D+$/, '') + 'o'); continue; } // 1st → 1o (chỉ thứ tự)
        const oi = O.indexOf(t); if (oi > 0) { out.push(oi + 'o'); continue; }
        let n = num(t);
        if (n >= 0) { // gom cụm số chữ: twenty five · two hundred · one thousand five hundred
          let tot = 0, cur = n, j = i + 1;
          for (; j < toks.length; j++) {
            const x = toks[j];
            if (x === 'and' && j + 1 < toks.length && (num(toks[j + 1]) >= 0) && /^(hundred|thousand)$/.test(toks[j - 1])) continue;
            const v = num(x);
            if (/^(hundred|thousand|million)$/.test(x)) { const m = x === 'hundred' ? 100 : x === 'thousand' ? 1000 : 1e6; if (m >= 1000) { tot += cur * m; cur = 0; } else cur *= m; }
            else if (v > 0 && ((cur >= 20 && cur % 10 === 0 && v < 10) || (cur >= 100 && cur % 100 === 0 && v < 100) || (cur === 0 && tot > 0))) cur += v;
            else break;
          }
          out.push(String(tot + cur)); i = j - 1; continue;
        }
        out.push(us(t));
      }
      return out.join('');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
