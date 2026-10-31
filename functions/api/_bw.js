// Dùng chung máy chủ (functions/api/backlinks.js) + CLI (scripts/lib/pr-check.mjs, scripts/lib/brand-watch.mjs): danh mục giá trị hợp lệ
// và kiểm tra hợp lệ dữ liệu sổ Backlink/PR & tài khoản thương hiệu. Tệp _*.js không phải route của Pages Functions.
export const TYPES = ['article', 'listing', 'profile', 'pr', 'directory'];
export const STATUSES = ['live', 'pending', 'draft', 'removed'];
export const RELS = ['follow', 'nofollow', 'ugc', 'sponsored', 'unknown', 'none']; // none: nền tảng chỉ cho nhắc tên/URL chữ, không có link (vd Figshare 27/10) – vẫn kiểm gỡ/khóa, không đòi link
export const LEVELS = ['ok', 'skip', 'manual', 'change', 'regression'];
export const PLATFORMS = ['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'threads', 'linkedin', 'pinterest', 'reddit', 'github', 'bluesky'];
export const HANDLE_STATUSES = ['owned', 'not-yet'];
export const SERIOUS = new Set(['removed', 'banned', 'mx-added', 'missing']); // sự cố nghiêm trọng → gửi thư ngay (còn lại vào bản tin tuần)

/** URL hồ sơ công khai của tài khoản. */
export function profileUrl(platform, handle) {
  const h = encodeURIComponent(String(handle || '').replace(/^@/, ''));
  return { x: `https://x.com/${h}`, facebook: `https://www.facebook.com/${h}`, instagram: `https://www.instagram.com/${h}/`, tiktok: `https://www.tiktok.com/@${h}`, youtube: `https://www.youtube.com/@${h}`, threads: `https://www.threads.net/@${h}`,
    linkedin: `https://www.linkedin.com/company/${h}/`, pinterest: `https://www.pinterest.com/${h}/`, reddit: `https://www.reddit.com/user/${h}/`, github: `https://github.com/${h}`, bluesky: `https://bsky.app/profile/${h}` }[platform] || '';
}
/** Kiểm tra hợp lệ 1 mục sổ (dùng chung CLI, máy chủ & test). → { ok, errors: [field], row } */
export function validatePlacement(x) {
  const e = [], s = (v, n) => String(v == null ? '' : v).trim().slice(0, n), row = {
    id: s(x && x.id, 60).toLowerCase(), platform: s(x && x.platform, 60), type: s(x && x.type, 20), url: s(x && x.url, 500), account: s(x && x.account, 60).replace(/^@/, ''),
    submittedAt: s(x && x.submittedAt, 10), status: s(x && x.status, 10), expectLink: s(x && x.expectLink, 80).toLowerCase() || 'lexkite.com', expectedRel: s(x && x.expectedRel, 10) || 'unknown', notes: s(x && x.notes, 500),
  };
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(row.id)) e.push('id');
  if (!row.platform || /[<>]/.test(row.platform)) e.push('platform');
  if (!TYPES.includes(row.type)) e.push('type');
  if (!STATUSES.includes(row.status)) e.push('status');
  if (!RELS.includes(row.expectedRel)) e.push('expectedRel');
  if (row.url) { let u = null; try { u = new URL(row.url); } catch { u = null; } if (!u || u.protocol !== 'https:' || u.username || u.password || /[<>"'\s]/.test(row.url)) e.push('url'); }
  if ((row.status === 'live' || row.status === 'pending') && !row.url) e.push('url');
  if (!/^[A-Za-z0-9_.-]{0,60}$/.test(row.account)) e.push('account');
  if (row.submittedAt && !/^\d{4}-\d{2}-\d{2}$/.test(row.submittedAt)) e.push('submittedAt');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(row.expectLink)) e.push('expectLink');
  if (/<\s*\/?\s*script/i.test(row.notes)) e.push('notes');
  if (EMAIL.test([row.url, row.account, row.notes, row.platform].join(' '))) e.push('email');
  if (SECRETISH.test([row.url, row.notes].join(' '))) e.push('secret');
  return { ok: !e.length, errors: [...new Set(e)], row };
}
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
export const SECRETISH = /\b(AIza[\w-]{20,}|ghp_[\w]{20,}|github_pat_[\w]{20,}|sk-[\w-]{20,}|xox[bp]-[\w-]{10,})|(password|passwd|token|secret)\s*[:=]/i;

/** Kiểm tra hợp lệ 1 tài khoản (CLI, máy chủ & test). */
export function validateHandle(x) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n), e = [];
  const row = { platform: s(x && x.platform, 20).toLowerCase(), handle: s(x && x.handle, 60).replace(/^@/, ''), status: s(x && x.status, 10) || 'not-yet', url: s(x && x.url, 300), notes: s(x && x.notes, 300) };
  if (!PLATFORMS.includes(row.platform)) e.push('platform');
  if (!/^[A-Za-z0-9_.-]{1,60}$/.test(row.handle)) e.push('handle');
  if (!HANDLE_STATUSES.includes(row.status)) e.push('status');
  if (row.url) { let u = null; try { u = new URL(row.url); } catch { u = null; } if (!u || u.protocol !== 'https:' || u.username || /[<>"'\s]/.test(row.url)) e.push('url'); }
  if (EMAIL.test(row.notes + ' ' + row.url)) e.push('email');
  if (/<\s*\/?\s*script/i.test(row.notes)) e.push('notes');
  if (!row.url && !e.length) row.url = profileUrl(row.platform, row.handle);
  return { ok: !e.length, errors: e, row, key: `${row.platform}:${row.handle.toLowerCase()}` };
}
