// Trần gói miễn phí + luật đánh giá cho free-tier-guard (docs/FREE-TIER.md). Thuần – không gọi mạng; test: scripts/test/free-tier.mjs
// Mức: ok < 60 % ≤ warn < 80 % ≤ alert. alert → mở/cập nhật issue 'free-tier'. Chế độ "shed" (web/free-tier-state.json) khi lượt Worker+Functions ≥ 80 %.
export const WARN = 0.6, ALERT = 0.8;

// key → { label, limit, unit, period, action }. action = việc đề xuất KHÔNG cắt tính năng (chủ quyết nâng gói – guard không tự nâng).
export const LIMITS = {
  cf_requests: { label: 'Cloudflare Workers + Pages Functions (tài khoản chính, chung 1 trần)', limit: 100000, unit: 'lượt', period: 'ngày',
    action: 'Chế độ shed tự bật (Worker phục vụ bản cache, trang thí điểm mới giữ noindex). Kiểm Worker nào tăng (bảng theo script). Nếu ≥ 80 % 3 ngày liền: chủ bật Workers Paid 5 USD (10 triệu lượt/tháng) – docs/FREE-TIER.md §4.' },
  cf_requests_2: { label: 'Workers tài khoản 2', limit: 100000, unit: 'lượt', period: 'ngày', action: 'Dời bớt việc nền sang giờ khác / giảm tần suất (infra/jobs.json).' },
  d1_reads: { label: 'D1 lexkite-sync – dòng đọc', limit: 5000000, unit: 'dòng', period: 'ngày', action: 'Tìm truy vấn quét bảng (capacity-sim EXPLAIN); breaker _d1guard.js chặn việc nền ≥ 50 %.' },
  d1_writes: { label: 'D1 lexkite-sync – dòng ghi', limit: 100000, unit: 'dòng', period: 'ngày', action: 'Quản trị › Cài đặt hit_rate = 0.2; bật Analytics Engine (docs/CAPACITY.md §5).' },
  d1b_reads: { label: 'D1 lexkite-internal (tài khoản 2) – dòng đọc', limit: 5000000, unit: 'dòng', period: 'ngày', action: 'Việc nền dùng truy vấn theo khoá; lease trong infra/jobs.json.' },
  d1b_writes: { label: 'D1 lexkite-internal (tài khoản 2) – dòng ghi', limit: 100000, unit: 'dòng', period: 'ngày', action: 'Gộp ghi theo lô (1 dòng/lần chạy thay vì 1 dòng/tệp), giãn lịch việc nền ghi nhiều (drive*, job_runs).' },
  pages_builds: { label: 'Cloudflare Pages – build/tháng', limit: 500, unit: 'build', period: 'tháng', action: 'Commit máy dùng [CF-Pages-Skip]; tắt preview build nhánh (Pages › Settings › Builds › Branch control: chỉ production); gom deploy qua deploy hook theo lịch.' },
  pages_files: { label: 'Cloudflare Pages – file/bản deploy', limit: 20000, unit: 'file', period: 'bản', action: 'Trang tự sinh ra Worker + R2 (trang từ điển), không vào dist.' },
  r2_storage: { label: 'R2 – dung lượng', limit: 10 * 1024 ** 3, unit: 'byte', period: 'tháng', action: 'blog-images.mjs gc (liệt kê file mồ côi); ảnh AVIF cỡ nhỏ.' },
  r2_class_a: { label: 'R2 – Class A (ghi/list)', limit: 1e6, unit: 'thao tác', period: 'tháng', action: 'Đẩy ảnh theo mã băm (bỏ qua file đã có), không list toàn bucket.' },
  r2_class_b: { label: 'R2 – Class B (đọc)', limit: 10e6, unit: 'thao tác', period: 'tháng', action: 'Cache API ở Worker (đọc R2 chỉ khi trượt cache), s-maxage dài.' },
  gh_cache: { label: 'GitHub Actions cache (repo web)', limit: 10 * 1024 ** 3, unit: 'byte', period: 'repo', soft: true, action: 'GitHub tự xoá cache cũ khi > 10 GB (không tính phí) – chỉ ảnh hưởng tốc độ CI; gom khoá cache theo hash lockfile.' },
  gh_repo: { label: 'Repo GitHub (khuyến nghị)', limit: 1024 ** 3, unit: 'byte', period: 'repo', action: 'Kho media đầy → mở kho shard mới (infra/media-repos.json state=open), không xoá tệp đã đặt.' },
};

// R2 phân loại thao tác (https://developers.cloudflare.com/r2/pricing/#class-a-operations)
const CLASS_A = /^(ListBuckets|PutBucket|ListObjects|PutObject|CopyObject|CompleteMultipartUpload|CreateMultipartUpload|LifecycleStorageTierTransition|ListMultipartUploads|UploadPart|UploadPartCopy|ListParts|PutBucketEncryption|PutBucketCors|PutBucketLifecycleConfiguration)$/;
export const r2Class = action => (CLASS_A.test(action) ? 'a' : /^(DeleteObject|DeleteBucket|AbortMultipartUpload)$/.test(action) ? 'free' : 'b');

export const level = pct => (pct >= ALERT ? 'alert' : pct >= WARN ? 'warn' : 'ok');

/** usage: [{ key, value, label?, note? }] → { rows:[{key,label,value,limit,pct,level,action}], worst, mode, alerts } */
export function evaluate(usage) {
  const rows = [];
  for (const u of usage) {
    const L = LIMITS[u.key]; if (!L || !Number.isFinite(u.value)) continue;
    const pct = u.value / L.limit, lv = level(pct);
    // soft = trần tự xử lý, không tính phí (GitHub tự xoá cache cũ) → tối đa 'warn', không mở issue
    rows.push({ key: u.key, label: u.label || L.label, value: u.value, limit: L.limit, unit: L.unit, period: L.period, pct, level: L.soft && lv === 'alert' ? 'warn' : lv, action: u.action || L.action, note: u.note || '' });
  }
  rows.sort((a, b) => b.pct - a.pct);
  const alerts = rows.filter(r => r.level === 'alert');
  const worst = rows.length ? rows[0].level : 'ok';
  const cf = rows.find(r => r.key === 'cf_requests');
  return { rows, worst, alerts, mode: cf && cf.pct >= ALERT ? 'shed' : 'normal' };
}

const fmtN = (v, unit) => unit === 'byte' ? (v >= 1e9 ? (v / 1024 ** 3).toFixed(2) + ' GB' : (v / 1024 ** 2).toFixed(0) + ' MB') : Math.round(v).toLocaleString('vi-VN');
export const fmt = r => `${fmtN(r.value, r.unit)} / ${fmtN(r.limit, r.unit)} ${r.unit === 'byte' ? '' : r.unit + ' '}/${r.period}`.replace(/\s+/g, ' ');
const ICON = { ok: '✅', warn: '⚠️', alert: '🔴' };

export function markdown(ev, { date, skipped = [] } = {}) {
  const lines = [`### Free-tier guard ${date || ''}`.trim(), '', '| | Tài nguyên | Dùng / trần | % |', '|---|---|---|---:|'];
  for (const r of ev.rows) lines.push(`| ${ICON[r.level]} | ${r.label}${r.note ? ` (${r.note})` : ''} | ${fmt(r)} | ${(r.pct * 100).toFixed(1)} % |`);
  if (skipped.length) lines.push('', ...skipped.map(s => `- ⏭ ${s}`));
  lines.push('', `Chế độ Worker: **${ev.mode}**`);
  if (ev.alerts.length) lines.push('', '#### Hành động đề xuất (không cắt tính năng, không tự nâng gói)', ...ev.alerts.map(r => `- **${r.label}** – ${r.action}`));
  return lines.join('\n') + '\n';
}
