// Tệp cổng main đổi có THỰC SỰ làm đổi kết quả của PR này không? (16/11, điều phối: "gộp lại main" lặp làm #1397 rebase 3 lần, 28/28 xanh vẫn không gộp được)
// Hàm thuần, không gọi mạng. required-gate.mjs › gateDrift dùng: tệp cổng chỉ bắt PR gộp lại khi
//   · workflow: bộ lọc `pull_request.paths` của bản main KHỚP ít nhất 1 tệp của PR (hoặc không có bộ lọc = chạy cho mọi PR); workflow không có trigger pull_request → bỏ qua;
//   · test/i18n-qa/luật: mã nguồn của tệp ấy NHẮC tới tệp của PR (đường dẫn, hoặc thư mục ≥ 2 cấp, hoặc thư mục gốc dạng 'docs' / 'web/').
// Không đọc được nguồn → giữ cách cũ (coi là liên quan / không tính theo từng loại, xem gateDrift). Giới hạn đã biết: test đọc gián tiếp qua lib khác không thấy chuỗi đường dẫn → có thể bỏ sót;
// main vẫn chạy lại toàn bộ CI sau khi gộp (push main) nên lọt cổng sẽ đỏ ở main, không im lặng.

const esc = s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
/** glob kiểu GitHub Actions paths: ** khớp mọi cấp, * không vượt '/', ? một ký tự. */
export const globRe = g => new RegExp('^' + esc(g).replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*') + '$');

const listOf = (block, key) => {
  const m = block.match(new RegExp(`^( *)${key}:\\s*(\\[.*\\])?\\s*$`, 'm'));
  if (!m) return null;
  if (m[2]) return [...m[2].matchAll(/'([^']*)'|"([^"]*)"|([^\s,\[\]]+)/g)].map(x => x[1] ?? x[2] ?? x[3]);
  const out = [], rest = block.slice(m.index + m[0].length).split('\n').slice(1), ind = m[1].length;
  for (const l of rest) { const t = l.match(/^( *)-\s*(.+?)\s*$/); if (t && t[1].length > ind) out.push(t[2].replace(/^['"]|['"]$/g, '')); else if (l.trim() && !l.trim().startsWith('#')) break; }
  return out;
};

/** { pr: có trigger pull_request?, paths: [...]|null, ignore: [...]|null } từ nguồn workflow. */
export function prFilter(src = '') {
  if (/^on:\s*\[[^\]]*\bpull_request\b/m.test(src) || /^on:\s*pull_request\s*$/m.test(src)) return { pr: true, paths: null, ignore: null };
  const m = src.match(/^ {2}pull_request:[^\n]*\n?((?: {4,}.*\n|\s*\n)*)/m);
  if (!m) return { pr: false, paths: null, ignore: null };
  const inline = src.match(/^ {2}pull_request:\s*(\{.*\})\s*$/m);
  const block = inline ? '    ' + inline[1].replace(/^\{|\}$/g, '').replace(/, (?=paths)/g, '\n    ') : m[1];
  return { pr: true, paths: listOf(block, 'paths'), ignore: listOf(block, 'paths-ignore') };
}

/** Workflow (bản main) sẽ chạy cho PR có các tệp prFiles không? */
export function workflowMatches(src, prFiles) {
  const f = prFilter(src); if (!f.pr) return false;
  if (!f.paths && !f.ignore) return true;                                   // không bộ lọc → mọi PR
  const hit = (list, file) => list.some(g => !g.startsWith('!') && globRe(g).test(file));
  return prFiles.some(file => {
    if (f.ignore && !f.paths) return !hit(f.ignore, file);
    const pos = f.paths.filter(g => !g.startsWith('!')), neg = f.paths.filter(g => g.startsWith('!')).map(g => globRe(g.slice(1)));
    return pos.some(g => globRe(g).test(file)) && !neg.some(r => r.test(file));
  });
}

/** Mã nguồn `src` của 1 test/script cổng có nhắc tới tệp nào của PR không? */
export function readsAny(src = '', prFiles = []) {
  const q = new Set([...src.matchAll(/['"`]([^'"`\n]{1,200})['"`]/g)].map(m => m[1]));
  for (const f of prFiles) {
    if (src.includes(f)) return true;
    const seg = f.split('/');
    for (let d = seg.length - 1; d >= 2; d--) if (src.includes(seg.slice(0, d).join('/'))) return true;
    if (seg.length >= 2 && (q.has(seg[0]) || q.has(seg[0] + '/') || q.has('./' + seg[0]))) return true;
  }
  return false;
}
