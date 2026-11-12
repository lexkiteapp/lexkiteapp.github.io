// Nội dung HỌC tiếng Anh nằm trong chuỗi giao diện (ví dụ “could of” → “could have”, “Overall, …”, so + adj + that, tiêu đề cấu trúc
// "Not only … but also …") phải giữ NGUYÊN VĂN tiếng Anh ở mọi ngôn ngữ – người học cần thấy đúng chữ tiếng Anh.
// Nguồn sự thật = khóa tiếng Việt: đoạn Latin trong khóa (không dấu tiếng Việt) VÀ có nguyên văn trong bản tiếng Anh mới là nội dung học.
// Dùng chung cho: gen-i18n.mjs (che trước khi dịch máy, trả lại nguyên văn sau) và i18n-qa.mjs (kiểm bản dịch còn đủ nguyên văn).
export const VI_ALL = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
// Thuật ngữ thi / tên sản phẩm: được phép giữ hay bản địa hóa → không bắt buộc
const TERM = /^(IELTS|TOEIC|TOEFL|Lexkite|FSRS|XP|AI|Task|Part|Band|Writing|Reading|Listening|Speaking|General|Academic|Training|Test|Google|Chrome|Gemini|[A-Z]{2,}|[\d–\-&:.,+%]+)$/;
const TERM_WORD = /^(band|passage|IELTS|TOEIC|TOEFL|Lexkite|FSRS|XP|AI|Task|Part|Band|Writing|Reading|Listening|Speaking|Google|Chrome|Edge|Safari|Firefox|Gemini)$/;
const isTerm = s => s.split(/\s+/).every(w => TERM.test(w));
// Ký hiệu cấu trúc ngữ pháp (không phải chữ thường): N, V, V3, V-ing, O, adj, adv, sb, sth…
const META = /^(N|V|V\d|V-ing|V-ING|O|S|adj|adv|sb|sth|adj-est|%|\+|…|\/)$/;
// Từ mượn / tên nút giao diện viết bằng chữ Latin trong câu tiếng Việt – không phải nội dung học
const LOAN = /^(web app|small talk|add to home screen|developer mode|load unpacked|create api key|PR, digital marketing)$/i;
// một chữ dạng a/b/c (which/who, can/could/should, he/she/it): nhóm từ tiếng Anh cần giữ
const SLASH = /^[A-Za-z’']+(\/[A-Za-z’']+)+$/;
// chữ tiếng Việt không dấu hay đứng đầu câu trước ví dụ tiếng Anh ("Sau want/need/would like, …")
const VI_PLAIN = /^(Sau|Trong|Theo|Khi|Nghe|Sang|Cho|Xem|Hay|Thi|Tin|Con)$/;
const latin = s => /[A-Za-z]/.test(s) && !VI_ALL.test(s) && !/[{}<>]/.test(s);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Có mặt như một cụm trọn vẹn (không dính vào chữ Latin khác) – so khớp không phân biệt kiểu ngoặc vì chỉ so phần bên trong ngoặc
const reWord = s => new RegExp(`(?<![A-Za-z0-9])${esc(s)}(?![A-Za-z0-9])`);
export const has = (text, seg) => reWord(seg).test(String(text));
const textParts = s => s.split(/(<[^>]*>)/).filter((p, i) => i % 2 === 0); // bỏ thẻ HTML (thuộc tính href="#/…" không phải nội dung)

// Khóa toàn tiếng Anh là một mẫu học (tiêu đề cấu trúc / cặp từ dễ nhầm): giữ nguyên bản tiếng Anh ở mọi ngôn ngữ
export function isEnglishKey(key) {
  const k = String(key).trim();
  if (!latin(k) || /^vd\b/i.test(k)) return false;
  return / \+ |…|\s\/\s|[a-z]\/[a-z]/.test(k) || (/^[a-z]/.test(k) && /\s/.test(k));
}

function candidates(key) {
  const out = [];
  for (const p of textParts(key)) {
    for (const m of p.matchAll(/“([^“”]+)”|"([^"]+)"|‘([^‘’]+)’/g)) out.push(m[1] || m[2] || m[3]); // 1. trong ngoặc kép
    // 3. công thức: chuỗi chữ Latin nối bằng + hoặc … (vd. so + adj/adv + that, not only … but also …)
    const toks = p.split(/\s+/).filter(Boolean);
    let run = [];
    const flush = () => {
      const raw = run.join(' '); run = [];
      const r = raw.replace(/^[(\[+=\/\s]+|[)\],;:.+=\/\s]+$/g, '').trim();
      if (!r) return;
      if (/ \+ |\S …|… \S/.test(r)) out.push(r); // công thức trọn vẹn
      else if (!/ \+ |^\+|\+$/.test(raw.trim())) return; // không dính dấu + → chữ Latin thường (tên riêng…), bỏ
      // không có nguyên văn trong bản tiếng Anh (vd. N → noun) → giữ phần chữ thật của công thức (the amount of, so that…)
      for (const a of r.split(/\s*\+\s*/)) { const w = a.split(/\s+/).filter(x => x === '/' || x === '…' || !META.test(x)).join(' '); if (w && w === a.trim()) out.push({ s: w, anchor: true, from: r }); }
    };
    for (let t of toks) {
      if (/^[“"‘]/.test(t)) flush(); // ngoặc mở/đóng = ranh giới công thức
      const close = /[”"’][,;:.)]*$/.test(t) && !/[a-z]’[a-z]/i.test(t.slice(-3));
      t = t.replace(/^[“"‘]+|[”"]+(?=[,;:.)]*$)/g, '');
      const ok = latin(t) || /^[+…\/=%]$/.test(t);
      if (!ok) { flush(); continue; }
      run.push(t);
      if (close || (/[,;:.)]$/.test(t) && !/…$/.test(t))) flush();
    }
    flush();
  }
  // 4. câu/cụm ví dụ tiếng Anh không có ngoặc (I enjoy reading, Dear Sir or Madam, despite the rain…): ≥ 2 chữ Latin liền nhau trong khóa
  //    tiếng Việt, có chữ thường; trừ từ mượn/tên nút giao diện (LOAN), thuật ngữ thi, địa chỉ email/web và nội dung trong thẻ
  const plain = String(key).replace(/<(i|b|u|code|a)\b[^>]*>[\s\S]*?<\/\1>/g, ' | ').replace(/<[^>]*>|\{\w+\}/g, ' | ');
  let cur = [];
  const end = () => { if (cur.length > 1 && VI_PLAIN.test(cur[0])) cur.shift(); const r = cur.join(' ').replace(/[,\s]+$/, ''); const lastW = (cur[cur.length - 1] || '').replace(/,$/, ''); if (cur.length > 1 && SLASH.test(lastW)) out.push(lastW); /* "Sau can/could/will": chữ Việt không dấu đứng trước */ cur = []; if ((r.split(' ').length >= 2 || SLASH.test(r)) && (/(^|[\s/])[a-z]{2,}/.test(r) || r.includes('/')) && !LOAN.test(r) && !/@|\.com|:\/\//.test(r) && !r.split(/[\s/]/).some(w => TERM_WORD.test(w)) && !/^[A-Z]{1,3}(\/[A-Z]{1,3})+$/.test(r)) out.push(r); };
  for (const t of plain.split(/\s+/)) {
    if (cur.length && /^\([a-z]+\)$/.test(t)) { cur.push(t); continue; } // help sb (to) do
    if (/^[(“"‘]/.test(t)) end(); // mở ngoặc = bắt đầu cụm mới
    const tail = (t.match(/[)”";:.!?,]+$/) || [''])[0], stop = tail && tail !== ',' && !/^…/.test(tail); // dấu phẩy đơn: cụm còn tiếp
    const c = t.replace(/^[(“"‘]+/, '').slice(0, t.length - (t.match(/^[(“"‘]+/) || [''])[0].length - (tail === ',' ? 0 : tail.length));
    const word = c && latin(c) && /^[A-Za-z]/.test(c), num = cur.length && /^\d[\d,]*$/.test(c);
    if (!word && !num) { end(); continue; }
    cur.push(c);
    if (stop) end();
  }
  end();
  // 2. <i>/<b>/<u> chứa cụm tiếng Anh dạng nội dung học (danh sách, câu mẫu) – không phải tên nút/sản phẩm
  for (const m of String(key).matchAll(/<(i|b|u)>([^<]+)<\/\1>/g)) {
    const s = m[2].trim();
    if (latin(s) && (/…|“/.test(s) || /,.*,/.test(s) || (/^[a-z]/.test(s) && /\s/.test(s)))) out.push(s);
  }
  return out;
}

// Danh sách đoạn tiếng Anh bắt buộc giữ nguyên văn cho khóa này (đã đối chiếu với bản tiếng Anh)
// Đoạn "neo" của công thức (the amount of, so that…) chỉ tính khi trong bản tiếng Anh nó vẫn đứng sát dấu + (vd. "the amount of + uncountable noun")
const nearPlus = s => new RegExp(`(?<![A-Za-z0-9])${esc(s)}(?=\\s*\\+)|(?<=\\+\\s*)${esc(s)}(?![A-Za-z0-9])`, 'g');
function segInfo(key, en) {
  if (en == null) return [];
  if (isEnglishKey(key)) return [{ s: String(en).trim() }];
  const segs = new Map();
  for (const x of candidates(key)) {
    const c = (typeof x === 'string' ? x : x.s).trim().replace(/^[\s,;:]+|[\s,;:]+$/g, ''), anchor = typeof x !== 'string', from = anchor ? x.from : null;
    if (!c || !latin(c) || isTerm(c) || /%[a-z]/.test(c) || c.split(/\s+/).every(w => META.test(w))) continue;
    if (!has(en, c) || (anchor && !nearPlus(c).test(en))) continue;
    if (!segs.has(c) || !anchor) segs.set(c, { s: c, from, anchor: anchor && (!segs.has(c) || segs.get(c).anchor) });
  }
  // 5. chữ IN HOA tiếng Anh (YOU’RE, ITS, DESPITE, IN SPITE OF, THAN…): chỉ khi có dấu nháy hoặc dạng viết thường của nó nằm trong
  //    một đoạn mẫu khác của khóa (your book ↔ YOUR) – tránh nhầm với từ viết tắt (AWL, CEFR…)
  const low = [...segs.keys()].join(' | ').toLowerCase();
  for (const m of String(key).replace(/<[^>]*>/g, ' ').matchAll(/(?<![\p{L}’'])[A-Z][A-Z’']*[A-Z](?: [A-Z][A-Z’']*[A-Z])*(?![\p{L}’'])/gu)) {
    const c = m[0];
    if (VI_ALL.test(c) || /^CC\b/.test(c) || [...segs.keys()].some(o => o.includes(c)) || c.split(" ").some(w => TERM_WORD.test(w)) || !has(en, c)) continue;
    const def = c.length > 2 && new RegExp(`${esc(c)}\\s*=`).test(key); // định nghĩa kiểu "FALSE = …"
    if (def || /[’' ]/.test(c) || c.toLowerCase().split(' ').every(w => new RegExp(`(?<![a-z])${esc(w)}(?![a-z])`).test(low))) segs.set(c, { s: c });
  }
  // neo của công thức đã giữ nguyên văn cả công thức → bỏ (tránh che nhầm "the" ở chỗ khác: "+ the group being compared")
  return [...segs.values()].filter(x => !x.anchor || x.from === x.s || !segs.has(x.from));
}

// Danh sách đoạn tiếng Anh bắt buộc giữ nguyên văn cho khóa này (đã đối chiếu với bản tiếng Anh)
export const englishSegments = (key, en) => segInfo(key, en).map(x => x.s);

export function missingSegments(key, en, tr) {
  if (tr == null) return [];
  return englishSegments(key, en).filter(s => !has(tr, s));
}

// Che đoạn tiếng Anh bằng mã [[n]] (giống cách che {biến}) trước khi dịch máy. keep[] dùng chung với che biến/thẻ.
export function protectEnglish(key, en, keep) {
  let t = String(en);
  const put = s => `[[${keep.push(s) - 1}]]`;
  for (const { s, anchor } of segInfo(key, en).sort((a, b) => b.s.length - a.s.length)) {
    if (anchor) { t = t.replace(nearPlus(s), () => put(s)); continue; } // chỉ chỗ sát dấu +
    const quoted = new RegExp(`([“"‘])${esc(s)}([”"’])`, 'g');
    // nằm trong một trích dẫn tiếng Anh dài hơn (khóa: “back” – bản tiếng Anh: “go back”) → che cả trích dẫn
    const wider = new RegExp(`“([^“”\\[\\]]*(?<![A-Za-z])${esc(s)}(?![A-Za-z])[^“”\\[\\]]*)”`, 'g');
    if (!quoted.test(t) && [...t.matchAll(wider)].some(m => latin(m[1]))) { t = t.replace(wider, (m, c) => latin(c) ? `“${put(c)}”` : m); continue; }
    quoted.lastIndex = 0;
    if (quoted.test(t)) t = t.replace(quoted, (m, a, b) => `${a}${put(s)}${b}`); // trong ngoặc → chỉ che chỗ trích dẫn
    else t = t.replace(new RegExp(`(?<![A-Za-z0-9\\[])${esc(s)}(?![A-Za-z0-9\\]])`, 'g'), () => put(s));
  }
  return t;
}
