/* Đo lượt cài / kích hoạt cho quảng cáo cài app Facebook (Meta) – docs/META-ADS.md. TẮT mặc định.
 * Máy khách (mobile/meta-attr.js, chỉ app Android – build-mobile.sh chép vào app) gửi POST /api/hit { t:'ma', ev:'install'|'activate', iid, ref, c:'y'|'u' }:
 *   iid = mã cài đặt ngẫu nhiên (không phải mã thiết bị/quảng cáo) · ref = chuỗi Google Play Install Referrer (chỉ khi do quảng cáo Meta dẫn tới) ·
 *   c = 'y' người dùng bật trong Cài đặt › Dữ liệu · 'u' chưa chọn.
 * Máy chủ chuyển sang Meta Conversions API cho App Events (POST graph.facebook.com/<dataset>/events) CHỈ khi: cờ config `ads_meta_capi` = '1'
 * (công tắc khẩn: xoá = dừng ngay) + bí mật META_CAPI_TOKEN + có đồng ý + lượt cài đến từ quảng cáo Meta. Cờ tắt → không ghi gì.
 * Không lưu IP (khoá giới hạn tần suất là băm, chỉ ở bộ đệm biên); bảng meta_attr giữ mã cài đặt + referrer ≤ 90 ngày, mỗi (iid, loại) đúng 1 dòng = chống trùng. */
import { region } from './_ads.js';

export const KINDS = ['install', 'activate'];
export const EVENT_NAME = 'ACTIVATE'; // = xong bài học đầu tiên (web/js/remind.js firstWin) – sự kiện tối ưu của chiến dịch
export const PACKAGE = 'com.lexkite.app';
export const GRAPH = 'https://graph.facebook.com/v21.0/';
// ID công khai (không bí mật) của app Meta "LexKite" (business Lexkite.com, use case app ads). KHÔNG dùng env META_APP_ID: biến đó của app đăng bài Autopilot (_meta_oauth.js).
export const META_APP_ID = '1319410583645611', DATASET_ID = '902190262917017'; // dataset = nguồn Conversions API cho app; ghi đè bằng env META_DATASET_ID
// META_INSTALL_REFERRER_KEY (khoá giải mã Install Referrer Android của Meta): chủ dán sẵn, chưa dùng – Meta tự giải mã referrer thô ta chuyển qua CAPI.
export const KEEP_DAYS = 90;
const IID = /^[a-f0-9]{16,32}$/, META_SRC = /^(?:facebook|instagram|apps\.facebook\.com|fb|ig|meta)/i;

export const DDL = 'CREATE TABLE IF NOT EXISTS meta_attr (iid TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL, ref TEXT, PRIMARY KEY (iid, kind)) WITHOUT ROWID';

/** Phân tích chuỗi Install Referrer (utm_source=…&utm_campaign=…&utm_content=…). → { source, campaign, meta } – `meta` = quảng cáo của Meta dẫn tới. */
export function parseReferrer(raw) {
  const s = String(raw == null ? '' : raw).slice(0, 600), out = { source: '', campaign: '', meta: false };
  if (!s) return out;
  let p; try { p = new URLSearchParams(s.replace(/^\?/, '')); } catch (e) { return out; }
  out.source = String(p.get('utm_source') || '').slice(0, 60).toLowerCase();
  out.campaign = String(p.get('utm_campaign') || '').slice(0, 80);
  out.meta = META_SRC.test(out.source) || /^(?:fb4a|ig4a)/i.test(out.campaign); // Meta đặt utm_source=apps.facebook.com / utm_campaign=fb4a|ig4a
  return out;
}

/** Đồng ý: chỉ 'y' (tự bật trong Cài đặt). Biến môi trường META_CONSENT_DEFAULT=row → 'u' (chưa chọn) cũng được NGOÀI EEA/UK/CH; mặc định không bật. */
export function consentOk(c, country, env = {}) {
  if (c === 'y') return true;
  return c === 'u' && env.META_CONSENT_DEFAULT === 'row' && region(String(country || 'XX').toUpperCase()) !== 'eea' && !!country && country !== 'XX';
}

/** Thân JSON gửi tới Graph API /<dataset>/events (Conversions API cho app) – hàm thuần để kiểm thử hình dạng. test_event_code (env META_TEST_CODE) → chỉ hiện ở Events Manager › Test events, không tính vào quảng cáo. */
export function capiBody(kind, row, env, now = Date.now()) {
  const body = {
    data: [{
      event_name: kind === 'install' ? 'MobileAppInstall' : EVENT_NAME, event_time: Math.floor(now / 1000), event_id: kind + ':' + row.iid, // event_id = chống trùng phía Meta
      action_source: 'app',
      user_data: { anon_id: 'XZ' + row.iid }, // mã ẩn danh theo app (không phải GAID/IDFA, không IP/email)
      app_data: { install_referrer: String(row.ref || '').slice(0, 600), advertiser_tracking_enabled: 1, application_tracking_enabled: 1, // Android: không có ATT; người dùng đã đồng ý đo lường
        extinfo: ['a2', PACKAGE, '', '', '', '', '', '', '', '', '', '', '', '', '', ''] },
    }],
    access_token: env.META_CAPI_TOKEN,
  };
  if (env.META_TEST_CODE) body.test_event_code = String(env.META_TEST_CODE).slice(0, 40);
  return body;
}

/** → { ok, status, received } – không bao giờ ném, không trả token. */
export async function postCapi(env, kind, row, fetcher = fetch, now = Date.now()) {
  try {
    const r = await fetcher(GRAPH + encodeURIComponent(env.META_DATASET_ID || DATASET_ID) + '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capiBody(kind, row, env, now)) });
    let j = null; try { j = r && r.json ? await r.json() : null; } catch (e) { j = null; }
    return { ok: !!r && r.ok === true, status: r ? r.status : 0, received: j && j.events_received != null ? j.events_received : null };
  } catch (e) { return { ok: false, status: 0, received: null }; }
}
export const sendCapi = async (...a) => (await postCapi(...a)).ok;

const bump = (db, day, kind) => db.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(day, kind);

/** Xử lý beacon t:'ma'. deps = { env, db, country, now, day, limited (async () => bool), fetcher }. Không bao giờ ném lỗi ra ngoài. */
export async function handleMa(b, d) {
  const { env, db } = d;
  if (!b || !KINDS.includes(b.ev) || !IID.test(String(b.iid || '')) || !env.META_CAPI_TOKEN) return 'skip';
  const flag = await db.prepare("SELECT v FROM config WHERE k = 'ads_meta_capi'").first().catch(() => null);
  if (!flag || String(flag.v) !== '1') return 'off'; // công tắc khẩn: tắt → không ghi, không gửi
  if (!consentOk(b.c, d.country, env)) return 'noconsent';
  if (await d.limited()) return 'limited';
  await db.prepare(DDL).run();
  const iid = String(b.iid), ref = String(b.ref || '').slice(0, 600), at = d.now;
  let row;
  if (b.ev === 'install') {
    if (!parseReferrer(ref).meta) { await bump(db, d.day, 'ma:install:other').run(); return 'other'; } // lượt cài tự nhiên/khác: chỉ đếm, không lưu, không gửi
    row = { iid, ref };
  } else {
    const inst = await db.prepare("SELECT ref FROM meta_attr WHERE iid = ?1 AND kind = 'install'").bind(iid).first();
    if (!inst) return 'nolink'; // không có lượt cài từ Meta → không gửi
    row = { iid, ref: inst.ref };
  }
  const ins = await db.prepare('INSERT OR IGNORE INTO meta_attr (iid, kind, at, ref) VALUES (?1, ?2, ?3, ?4)').bind(iid, b.ev, at, row.ref).run();
  if (!ins || !ins.meta || ins.meta.changes === 0) return 'dup';
  const ok = await sendCapi(env, b.ev, row, d.fetcher || fetch, at);
  await bump(db, d.day, `ma:${b.ev}:${ok ? 'sent' : 'fail'}`).run();
  if (Math.random() < 0.01) await db.prepare('DELETE FROM meta_attr WHERE at < ?1').bind(at - KEEP_DAYS * 86400e3).run().catch(() => {});
  return ok ? 'sent' : 'fail';
}
