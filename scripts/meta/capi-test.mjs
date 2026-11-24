// Gửi 1 sự kiện THỬ tới Meta Conversions API (chỉ hiện ở Events Manager › Test events, không tính quảng cáo) để chứng minh luồng chạy.
// Dùng trong .github/workflows/meta-capi-setup.yml: META_CAPI_TOKEN + META_TEST_CODE (mã ở tab Test events). Không in token; thoát ≠ 0 nếu Meta không nhận.
import { postCapi, DATASET_ID } from '../../functions/api/_meta_capi.js';
const env = { META_CAPI_TOKEN: process.env.META_CAPI_TOKEN, META_TEST_CODE: process.env.META_TEST_CODE };
if (!env.META_CAPI_TOKEN || !env.META_TEST_CODE) { console.error('✗ thiếu META_CAPI_TOKEN hoặc META_TEST_CODE (mã Test events)'); process.exit(2); }
const iid = 'e'.repeat(16) + Date.now().toString(16).padStart(16, '0').slice(-16);
let bad = 0;
for (const kind of ['install', 'activate']) {
  const r = await postCapi(env, kind, { iid, ref: 'utm_source=apps.facebook.com&utm_campaign=fb4a' });
  console.log(`${r.ok && r.received === 1 ? '✓' : '✗'} ${kind}: HTTP ${r.status}, events_received=${r.received} (dataset ${DATASET_ID}, test code ${env.META_TEST_CODE.slice(0, 2)}…)`);
  if (!r.ok || r.received !== 1) bad++;
}
process.exit(bad ? 1 : 0);
