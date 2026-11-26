// Danh sách tệp của một kho GitHub qua API cây git. `recursive=1` trả 500 khi kho quá lớn (16/11: lexkite-media-2 → 500 liên tục, cdn-mirror đỏ)
// → khi 5xx (đã hết thử lại) hoặc cây bị cắt (truncated) đi bộ từng thư mục: GET /git/trees/<sha> không đệ quy, thư mục con gọi song song có trần.
// Trả { commit, files: [{ sha, size, path }] } hoặc ném lỗi (4xx, cây bị cắt). Test: scripts/test/gh-tree.mjs.
const CONC = 8;
export async function listTreeFiles(repo, get, { conc = CONC, log = console.warn } = {}) {
  const url = (ref, rec) => `https://api.github.com/repos/${repo}/git/trees/${ref}${rec ? '?recursive=1' : ''}`;
  const r = await get(url('HEAD', true));
  if (r.ok) {
    const j = await r.json();
    if (!j.truncated) return { commit: j.sha, files: j.tree.filter(t => t.type === 'blob').map(t => ({ sha: t.sha, size: t.size, path: t.path })) };
    log(`⚠ cây ${repo} đệ quy bị cắt (> 100k mục gồm cả thư mục); đi bộ từng thư mục (${conc} song song)`); // 26/11: lexkite-media-2 vượt 100k mục (93k tệp + thư mục) → cdn-mirror đỏ, R2 thiếu tệp mới
  } else {
    if (r.status < 500) throw new Error(`cây ${repo}: ${r.status}`);
    log(`⚠ cây ${repo} đệ quy → ${r.status}; đi bộ từng thư mục (${conc} song song)`);
  }
  const root = await get(url('HEAD', false)); if (!root.ok) throw new Error(`cây ${repo}: ${root.status}`);
  const rj = await root.json(), files = [], queue = [{ sha: rj.sha, prefix: '', tree: rj.tree, truncated: rj.truncated }];
  const take = (tree, prefix) => { for (const t of tree) { if (t.type === 'blob') files.push({ sha: t.sha, size: t.size, path: prefix + t.path }); else if (t.type === 'tree') queue.push({ sha: t.sha, prefix: `${prefix}${t.path}/` }); } };
  const first = queue.shift(); if (first.truncated) throw new Error(`cây ${repo} bị cắt ở thư mục gốc`); take(first.tree, '');
  const worker = async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      const x = await get(url(n.sha, false)); if (!x.ok) throw new Error(`cây ${repo}/${n.prefix}: ${x.status}`);
      const j = await x.json(); if (j.truncated) throw new Error(`cây ${repo}/${n.prefix} bị cắt (> 100k mục)`);
      take(j.tree, n.prefix);
    }
  };
  // hàng đợi tăng khi duyệt: lặp đến khi hết (worker nào rảnh mà hàng đợi tạm rỗng thoát sớm → chạy lại vòng cho tới khi không còn việc)
  while (queue.length) await Promise.all(Array.from({ length: Math.min(conc, queue.length) }, worker));
  return { commit: rj.sha, files };
}
