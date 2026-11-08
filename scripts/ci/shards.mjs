// Số shard động cho việc nền nặng CPU (audio.yml – Kokoro): dùng hết runner rảnh nhưng luôn chừa RESERVE cho check PR (docs/CI-RUNNERS.md).
//   shards = max(1, min(CAP, TOTAL − job đang chạy − RESERVE, ⌈việc / PER⌉))
//   GITHUB_TOKEN=… node scripts/ci/shards.mjs --left N [--per 1500] [--cap 24]   → in JSON mảng [0..shards-1]; lỗi API → coi như bận hết (1 shard)
export const TOTAL = 40, RESERVE = 8;
export const shardCount = ({ left, busy, per = 1500, cap = 24 }) => Math.max(1, Math.min(cap, TOTAL - busy - RESERVE, Math.ceil(left / per)));
export async function busyJobs(repo, token, api) {
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, get = async u => { const r = await fetch(`https://api.github.com/repos/${repo}/${u}`, { headers: h }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
  const fetchJson = api || get;
  let n = 0;
  // Chỉ job ĐANG CHẠY mới chiếm runner (1/11: đếm cả job xếp hàng + lượt "queued" ma → 165 → chỉ 1 shard).
  // Nhưng phải duyệt cả lượt "queued": lượt ma trận có job đã chạy vẫn mang trạng thái queued (4/11: đo 28 khi thực tế đủ 40/40).
  for (const status of ['in_progress', 'queued']) {
    for (let page = 1; page <= 4; page++) {
      const runs = (await fetchJson(`actions/runs?status=${status}&per_page=100&page=${page}`)).workflow_runs || [];
      for (const run of runs) {
        const jobs = (await fetchJson(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).jobs || [];
        n += jobs.filter(j => j.status === 'in_progress').length;
        if (n >= TOTAL) return n; // đã đầy: khỏi tốn thêm lượt gọi API
      }
      if (runs.length < 100) break;
    }
  }
  return n;
}
if (process.argv[1] && process.argv[1].endsWith('shards.mjs')) {
  const A = process.argv, opt = (k, d) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : d; };
  let busy = TOTAL; try { busy = await busyJobs(process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', process.env.GITHUB_TOKEN); } catch (e) { console.error(`shards: không đọc được số job (${e.message}) → 1 shard`); }
  const n = shardCount({ left: +opt('left', 0), busy, per: +opt('per', 1500), cap: +opt('cap', 24) });
  console.error(`shards: ${busy} job đang chạy · còn ${opt('left', 0)} việc → ${n} shard`);
  console.log(JSON.stringify([...Array(n).keys()]));
}
