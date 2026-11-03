// Software Heritage "Save code now" (UNESCO/Inria, miễn phí, ẩn danh) cho repo công khai → bản lưu độc lập, có SWHID,
// ghi mục `swh` vào sổ băm. Chạy: content-evidence.yml (hằng tuần + sau mỗi lần phát hành add-on/landing). Không chạy trên máy.
//   node scripts/swh-save.mjs [--origin https://github.com/lexkiteapp/lexkiteapp.github.io] [--dry]
// SWH tự gộp yêu cầu trùng; lần sau ghi trạng thái mới (accepted → succeeded) để hồ sơ có ngày lần lưu thành công.
import { pathToFileURL } from 'node:url';
import { readRegistry, recordEvidence } from './lib/content-registry.mjs';
import { request } from './lib/http.mjs';

export const ORIGIN = 'https://github.com/lexkiteapp/lexkiteapp.github.io';
export const saveApi = origin => `https://archive.softwareheritage.org/api/1/origin/save/git/url/${origin}/`;
export const browseUrl = origin => `https://archive.softwareheritage.org/browse/origin/directory/?origin_url=${encodeURIComponent(origin)}`;
// Kết quả API → mục sổ (null nếu không ghi được)
export function toEntry(r, origin) {
  if (!r || !r.id || !r.save_request_status) return null;
  return { url: browseUrl(origin), origin, requestId: String(r.id), status: `${r.save_request_status}/${r.save_task_status || ''}`, requestDate: r.request_date || undefined, visitDate: r.visit_date || undefined, snapshot: r.snapshot_swhid || undefined };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), origin = (a.indexOf('--origin') >= 0 && a[a.indexOf('--origin') + 1]) || ORIGIN;
  if (a.includes('--dry')) { console.log(`· SWH: sẽ POST ${saveApi(origin)}`); process.exit(0); }
  // cập nhật các yêu cầu trước (đã chạy xong → ghi ngày lưu thật)
  const prev = readRegistry().filter(e => e.type === 'swh' && e.origin === origin && !/succeeded|failed/.test(e.status)).map(e => e.requestId);
  const list = request(saveApi(origin)); let items = []; try { items = JSON.parse(list.body); } catch {}
  for (const r of Array.isArray(items) ? items : []) if (prev.includes(String(r.id)) && /succeeded|failed/.test(r.save_task_status || '')) { const e = toEntry(r, origin); if (e) { recordEvidence('swh', e); console.log(`✓ SWH #${r.id}: ${e.status} ${e.visitDate || ''}`); } }
  const r = request(saveApi(origin), { method: 'POST' }); let j = null; try { j = JSON.parse(r.body); } catch {}
  const e = toEntry(j, origin);
  if (!e) { console.log(`::warning::Software Heritage HTTP ${r.status}: ${(r.body || '').slice(0, 200)} – lần sau thử lại`); process.exit(0); }
  const ent = recordEvidence('swh', e); console.log(`✓ SWH yêu cầu #${e.requestId} (${e.status}) → sổ #${ent.seq} · ${e.url}`);
}
