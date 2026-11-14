// Số shard động cho việc nền nặng CPU (audio.yml – Kokoro): dùng hết runner rảnh nhưng luôn chừa RESERVE cho check PR (docs/CI-RUNNERS.md).
//   shards = max(1, min(CAP, TOTAL − job đang chạy − RESERVE, ⌈việc / PER⌉))
//   GITHUB_TOKEN=… node scripts/ci/shards.mjs --left N [--per 1500] [--cap 24]   → in JSON mảng [0..shards-1]; lỗi API → coi như bận hết (1 shard)
export const TOTAL = 40, RESERVE = 8;
export const shardCount = ({ left, busy, per = 1500, cap = 24 }) => Math.max(1, Math.min(cap, TOTAL - busy - RESERVE, Math.ceil(left / per)));
/** Đếm job đang chạy; `video` = phần của teach-video (luật chủ 13/11: video tối đa 3 máy khi còn việc khác, CI rảnh thì lấy hết). */
export async function busySplit(repo, token, api) {
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, get = async u => { const r = await fetch(`https://api.github.com/repos/${repo}/${u}`, { headers: h }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
  const fetchJson = api || get;
  let n = 0, video = 0;
  // Chỉ job ĐANG CHẠY mới chiếm runner (1/11: đếm cả job xếp hàng + lượt "queued" ma → 165 → chỉ 1 shard).
  // Nhưng phải duyệt cả lượt "queued": lượt ma trận có job đã chạy vẫn mang trạng thái queued (4/11: đo 28 khi thực tế đủ 40/40).
  for (const status of ['in_progress', 'queued']) {
    for (let page = 1; page <= 4; page++) {
      const runs = (await fetchJson(`actions/runs?status=${status}&per_page=100&page=${page}`)).workflow_runs || [];
      for (const run of runs) {
        const jobs = (await fetchJson(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).jobs || [];
        const k = jobs.filter(j => j.status === 'in_progress').length;
        n += k; if (run.name === 'teach-video') video += k;
        if (n >= TOTAL) return { n, video }; // đã đầy: khỏi tốn thêm lượt gọi API
      }
      if (runs.length < 100) break;
    }
  }
  return { n, video };
}
export const busyJobs = async (...a) => (await busySplit(...a)).n;
/** Video: còn việc khác (job ngoài video đang chạy) → tổng video ≤ VIDEO_MAX; CI rảnh → dùng hết máy rảnh như việc nền thường. */
export const VIDEO_MAX = 3;
export const videoCount = ({ left, busy, video, per = 1, cap = 24 }) =>
  busy - video > 0 ? Math.max(1, Math.min(VIDEO_MAX - video, Math.ceil(left / per))) : shardCount({ left, busy, per, cap });
if (process.argv[1] && process.argv[1].endsWith('shards.mjs')) {
  const A = process.argv, opt = (k, d) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : d; };
  let busy = TOTAL, video = 0; try { ({ n: busy, video } = await busySplit(process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', process.env.GITHUB_TOKEN)); } catch (e) { console.error(`shards: không đọc được số job (${e.message}) → 1 shard`); }
  const args = { left: +opt('left', 0), busy, video, per: +opt('per', 1500), cap: +opt('cap', 24) };
  const n = A.includes('--video') ? videoCount(args) : shardCount(args);
  console.error(`shards: ${busy} job đang chạy · còn ${opt('left', 0)} việc → ${n} shard`);
  console.log(JSON.stringify([...Array(n).keys()]));
}
