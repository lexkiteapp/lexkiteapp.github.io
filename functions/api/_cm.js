/* Cộng đồng người học – luật an toàn THUẦN (không gọi mạng/D1), dùng chung cho /api/community, RoomDO (đợt 3) và test.
 * Spec: docs/specs/community.md §5. Test: scripts/test/community-api.mjs (mỗi dòng §5 một khối kiểm).
 * Nhóm tuổi · thông tin liên lạc (PII) · lời tục/đe dọa · bậc tin cậy + nhịp gửi · báo cáo tự ẩn · thang gậy · chặn 2 chiều. */
import { abuse, mask, isAbusive } from './_abuse.js';

export const RULES_V = 1;                 // phiên bản Quy tắc cộng đồng – tăng khi đổi luật → người dùng đồng ý lại
export const MIN_AGE = 13, ADULT = 18;
export const MAX_MSG = 500;               // ký tự / tin
export const HIDE_AT = 2;                 // số người báo cáo KHÁC NHAU → tự ẩn chờ duyệt
export const REPORTS_PER_DAY = 20, BLOCK_MAX = 500;
export const COLORS = 8;                  // avatar chữ cái: chỉ số màu 0..7 (không ảnh)

// ── Nhóm tuổi (năm sinh tự khai, xếp nhóm theo năm – cùng năm sinh tính tuổi nhỏ nhất có thể để an toàn) ──
export function ageBand(birthYear, now = Date.now()) {
  const y = Math.floor(+birthYear), cur = new Date(now).getUTCFullYear();
  if (!Number.isFinite(y) || y < cur - 120 || y > cur) return '';
  const age = cur - y - 1;                // chưa tới sinh nhật năm nay → nhỏ hơn 1 tuổi (chọn phía an toàn)
  return age < MIN_AGE ? 'u13' : age < ADULT ? 'teen' : 'adult';
}
// Hai người chỉ gặp nhau (phòng, chat, gọi, kết bạn, mời) khi CÙNG nhóm; dưới 13 không vào cộng đồng.
export const sameBand = (a, b) => !!a && a === b && a !== 'u13';
// Tin riêng: chỉ người lớn, cả hai bật, không chặn nhau, đã là bạn (đợt 6 – mặc định tắt)
export const canDM = (a, b, { friends = false, blocked = false } = {}) => !!(a && b && a.band === 'adult' && b.band === 'adult' && a.dm && b.dm && friends && !blocked);

// ── Thông tin liên lạc: chặn với MỌI người (spec §5) ──
const SOCIAL = /\b(zalo|telegram|tele|whats\s*app|wa\.me|insta(gram)?|ig|facebook|fb|messenger|snapchat|discord|we\s*chat|wechat|line\s*id|kakao(talk)?|tiktok|viber|skype|onlyfans|t\.me)\b/i;
const EMAIL = /[\p{L}\p{N}._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[\p{L}\p{N}-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}/iu;
const URL_ = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|me|vn|co|app|ly|gg|link|xyz|info|ru|cn|jp|kr|in|id|th|tr|de|fr|es|br|uk)\b(?:\/\S*)?/i;
const HANDLE = /(^|[\s(])@[\p{L}\p{N}_.]{3,}/u;
const DIGITS = /(?:\+?\d[\s().\-–·]{0,2}){9,}/;          // SĐT: ≥ 9 chữ số dù có cách/chấm/gạch
const SPELLED = /\b(zero|one|two|three|four|five|six|seven|eight|nine|không|một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\b(?:[\s,.-]+\b(zero|one|two|three|four|five|six|seven|eight|nine|không|một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\b){6,}/iu;
const fold = s => String(s || '').normalize('NFKC').replace(/[​-‏⁠﻿]/g, '')
  .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0));

/** → mảng lý do: 'email' | 'phone' | 'link' | 'handle' | 'social' (rỗng = sạch) */
export function pii(text) {
  const s = fold(text), why = [];
  if (EMAIL.test(s)) why.push('email');
  if (DIGITS.test(s) || SPELLED.test(s)) why.push('phone');
  if (URL_.test(s)) why.push('link');
  if (HANDLE.test(s)) why.push('handle');
  if (SOCIAL.test(s)) why.push('social');
  return why;
}

/** Kiểm 1 tin trước khi gửi/hiện. → { ok, why[], text } – text đã che từ tục lẻ; ok=false thì KHÔNG gửi (người gửi thấy lý do). */
export function checkText(text, { max = MAX_MSG } = {}) {
  const raw = fold(text).replace(/\s+/g, ' ').trim();
  if (!raw) return { ok: false, why: ['empty'], text: '' };
  if ([...raw].length > max) return { ok: false, why: ['long'], text: '' };
  const why = pii(raw);
  const a = abuse(raw);
  if (a.threat) why.push('threat');
  if (isAbusive(raw)) why.push('abuse');
  if (/(.)\1{9,}/u.test(raw) || /(\b\S+\b)(?:\s+\1\b){5,}/iu.test(raw)) why.push('spam'); // aaaaaaaaaa · lặp 1 từ 6 lần
  return why.length ? { ok: false, why: [...new Set(why)], text: '' } : { ok: true, why: [], text: a.hits.length ? mask(raw) : raw };
}

// ── Bậc tin cậy + nhịp gửi ──
// 0 mới (< 3 ngày hoặc < 3 ngày học) · 1 thường · 2 lâu năm (≥ 30 ngày, ≥ 20 ngày học, 0 gậy) · 3 điều hành (admin cấp)
export function trust(p, now = Date.now()) {
  if (!p) return 0;
  if (p.trust >= 3) return 3;
  if ((p.strikes || 0) > 0 && now - (p.strike_at || 0) < 30 * 864e5) return 0;
  const age = (now - (p.created || now)) / 864e5, days = p.study_days || 0;
  if (age >= 30 && days >= 20 && !(p.strikes > 0)) return 2;
  return age >= 3 && days >= 3 ? 1 : 0;
}
export const PACE = [{ gap: 10e3, day: 50 }, { gap: 3e3, day: 300 }, { gap: 1e3, day: 1000 }, { gap: 500, day: 3000 }];
// Phòng nói & tạo phòng chỉ từ bậc 1 (spec §5)
export const canVoice = t => t >= 1;
/** Nhịp gửi theo bậc. st = { last, day, n } (của người gửi) → { ok, wait, st } (st mới khi ok) */
export function pace(st, t, now = Date.now()) {
  const P = PACE[Math.max(0, Math.min(3, t | 0))], d = new Date(now).toISOString().slice(0, 10);
  const s = st && st.day === d ? st : { last: 0, day: d, n: 0 };
  if (now - s.last < P.gap) return { ok: false, wait: P.gap - (now - s.last), st: s };
  if (s.n >= P.day) return { ok: false, wait: Date.parse(d + 'T00:00:00Z') + 864e5 - now, st: s };
  return { ok: true, wait: 0, st: { last: now, day: d, n: s.n + 1 } };
}

// ── Thang gậy: 1 cảnh cáo → 2 câm 24 h → 3 câm 7 ngày → 4 khoá ──
export function penalty(strikes, now = Date.now()) {
  if (strikes <= 1) return { kind: 'warn', until: 0 };
  if (strikes === 2) return { kind: 'mute', until: now + 864e5 };
  if (strikes === 3) return { kind: 'mute', until: now + 7 * 864e5 };
  return { kind: 'ban', until: Number.MAX_SAFE_INTEGER };
}
export const muted = (p, now = Date.now()) => !!p && (p.mute_until || 0) > now;

export const REASONS = ['harass', 'sexual', 'hate', 'spam', 'contact', 'minor', 'selfharm', 'other'];
export const KINDS = ['msg', 'user', 'room', 'voice'];
