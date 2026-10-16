// Xuất bản video qua GrabCast (bước 10 docs/VIDEO-PIPELINE.md) – chạy trong GitHub Actions, gọi thẳng API GrabCast.
// Dùng: node scripts/video/publish-grabcast.mjs --file video.mp4 --meta script.json [--at 2026-10-20T23:00:00Z] [--accounts id1,id2] [--dry-run]
//   env: GRABCAST_API_KEY (secret, bắt buộc trừ khi --dry-run) · GRABCAST_WORKSPACE (mặc định 4 = Lexkite) · GRABCAST_API_BASE (tùy chọn)
// Luồng: tải video vào kho lưu trữ (pool bulk) → complete → use (ra media_id) → validate → tạo bài (Idempotency-Key ổn định) → schedule (nếu có --at).
// Không có --at → để bài ở trạng thái nháp (duyệt/lên lịch trong Quản trị → Video & Social). Khóa không bao giờ được in ra.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2), flag = n => args.includes('--' + n), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const die = m => { console.error('✗ publish-grabcast: ' + m); process.exit(1); };
const DRY = flag('dry-run'), FILE = opt('file'), META = opt('meta'), AT = opt('at'), ACCS = (opt('accounts') || '').split(',').map(s => s.trim()).filter(Boolean);
if (!FILE || !META) die('cần --file video.mp4 --meta script.json');
if (!fs.existsSync(FILE)) die('không thấy file ' + FILE);
if (AT && (isNaN(Date.parse(AT)) || Date.parse(AT) < Date.now() + 60e3)) die('--at phải là thời điểm ISO trong tương lai: ' + AT);
const BASE = String(process.env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
const KEY = process.env.GRABCAST_API_KEY || '', WS = String(process.env.GRABCAST_WORKSPACE || '4');
if (!KEY && !DRY) die('thiếu env GRABCAST_API_KEY (secret của repo)');

const raw = JSON.parse(fs.readFileSync(META, 'utf8')), m = raw.publish || raw.social || raw;
const stat = fs.statSync(FILE), sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
const hashtags = Array.isArray(m.hashtags) ? m.hashtags.map(h => '#' + String(h).replace(/^#/, '')).join(' ') : '';
const caption = [m.caption || m.description || raw.caption || '', hashtags].filter(Boolean).join('\n\n').trim();
if (!caption) die('meta thiếu caption/description');
const scrub = s => (KEY ? String(s).split(KEY).join('***') : String(s));

async function gc(method, p, body, extra = {}) {
  const url = `${BASE}/api/social/${p}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    let r;
    try { r = await fetch(url, { method, headers: { 'X-API-Key': KEY, 'X-Workspace': WS, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal }); }
    catch (e) { clearTimeout(t); if (attempt < 2) { await new Promise(res => setTimeout(res, 2000 * (attempt + 1))); continue; } throw new Error(`${method} ${p}: ${ctl.signal.aborted ? 'timeout 15 s' : 'lỗi mạng'}`); }
    clearTimeout(t);
    const text = await r.text(); let j; try { j = JSON.parse(text); } catch (e) { j = { raw: text.slice(0, 300) }; }
    if (r.status === 429 && attempt < 2) { const wait = Math.min(65, +(r.headers.get('Retry-After') || 30)); console.log(`… GrabCast giới hạn tần suất, chờ ${wait}s`); await new Promise(res => setTimeout(res, wait * 1000)); continue; }
    if (!r.ok) throw new Error(scrub(`${method} ${p} → ${r.status} ${JSON.stringify(j).slice(0, 400)}`));
    return j;
  }
}
const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined; };
const list = j => (Array.isArray(j) ? j : (j && (j.items || j.data || j.results || j.accounts)) || []);

const begin = { filename: path.basename(FILE), size: stat.size, content_type: /\.webm$/i.test(FILE) ? 'video/webm' : /\.mov$/i.test(FILE) ? 'video/quicktime' : 'video/mp4', pool: 'bulk', sha256: sha };
const post = media_ids => ({ ...(m.title ? { title: String(m.title).slice(0, 200) } : {}), caption, ...(m.first_comment ? { first_comment: m.first_comment } : {}), link: m.link || 'https://lexkite.com/', media_ids, targets: [] });
const kindFor = a => { const k = a && (a.kinds || a.supported_kinds || a.post_kinds); return Array.isArray(k) && k.length ? String(k[0]) : 'video'; };
// Khóa chống trùng: cùng video + cùng kênh + cùng giờ → chạy lại workflow không tạo bài đôi
const idemFor = ids => crypto.createHash('sha256').update([sha, ids.join(','), AT || 'draft'].join('|')).digest('hex').slice(0, 40);

if (DRY) {
  const ids = ACCS.length ? ACCS : ['<tất cả kênh đang hoạt động>'];
  const p = post(['<media_id>']); p.targets = ids.map(id => ({ account_id: id, kind: 'video', options: {} }));
  console.log(JSON.stringify({ base: BASE, workspace: WS, key: KEY ? '***' : '(chưa đặt)', steps: [
    { POST: 'storage/objects', body: begin }, { PUT: '<upload_url>', bytes: stat.size }, { POST: 'storage/objects/<object_id>/complete' }, { POST: 'storage/objects/<object_id>/use' },
    { POST: 'posts/validate', body: p }, { POST: 'posts', headers: { 'Idempotency-Key': idemFor(ids) }, body: p },
    AT ? { POST: 'posts/<post_id>/schedule', body: { scheduled_at: new Date(AT).toISOString(), consent: true } } : { note: 'không có --at → giữ bản nháp' }] }, null, 2));
  process.exit(0);
}

// 1) Kênh đích
const accounts = list(await gc('GET', 'accounts'));
const targetsAcc = ACCS.length ? ACCS.map(id => accounts.find(a => String(a.id) === id) || die('không thấy kênh ' + id + ' trong workspace ' + WS)) : accounts.filter(a => !/expired|error|revoked|disconnected/i.test(String(pick(a, 'status', 'state') || '')));
if (!targetsAcc.length) die(`workspace ${WS} chưa có kênh nào – kết nối tại https://grabcast.click/scheduler.html`);
// 2) Tải video vào kho (bulk) → complete → use
const st = await gc('POST', 'storage/objects', begin), o = st.object || st.data || st, up = st.upload || o.upload || {};
const oid = pick(o, 'object_id', 'id'), url = pick(st, 'upload_url', 'url', 'put_url') || pick(o, 'upload_url', 'url') || pick(up, 'url', 'upload_url');
if (!oid || !/^https:\/\//.test(String(url || ''))) die('GrabCast không trả về object_id/upload_url: ' + scrub(JSON.stringify(st)).slice(0, 300));
console.log(`↑ tải ${(stat.size / 1048576).toFixed(1)} MB lên kho (object ${oid})`);
try {
  const hd = { ...(st.headers || st.upload_headers || up.headers || {}) }; if (!Object.keys(hd).some(k => /^content-type$/i.test(k))) hd['Content-Type'] = begin.content_type;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20 * 60e3);
  const r = await fetch(url, { method: String(pick(st, 'method') || pick(up, 'method') || 'PUT').toUpperCase(), headers: hd, body: fs.readFileSync(FILE), signal: ctl.signal }); clearTimeout(t);
  if (!r.ok) throw new Error('PUT ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const lease = pick(st, 'lease_id', 'lease') || pick(o, 'lease_id', 'lease');
  await gc('POST', `storage/objects/${encodeURIComponent(oid)}/complete`, lease ? { lease_id: typeof lease === 'object' ? lease.id : lease, size: stat.size } : { size: stat.size });
} catch (e) { await gc('POST', `storage/objects/${encodeURIComponent(oid)}/abort`, {}).catch(() => {}); die('tải lên thất bại: ' + scrub(e.message)); }
const used = await gc('POST', `storage/objects/${encodeURIComponent(oid)}/use`, {});
const mediaId = pick(used, 'media_id') || pick(used.media || {}, 'id') || pick(used, 'id');
if (!mediaId) die('GrabCast không trả về media_id');
// 3) validate → tạo bài → lên lịch
const payload = post([mediaId]); payload.targets = targetsAcc.map(a => ({ account_id: a.id, kind: kindFor(a), options: {} }));
const v = await gc('POST', 'posts/validate', payload), errs = [...(v.errors || []), ...((v.targets || []).flatMap(t => t.errors || []))];
if (v.valid === false || v.ok === false || errs.length) die('validate không qua: ' + JSON.stringify(errs.length ? errs : v).slice(0, 600));
const created = await gc('POST', 'posts', payload, { 'Idempotency-Key': idemFor(targetsAcc.map(a => String(a.id))) });
const postId = pick(created, 'id') || pick(created.post || created.data || {}, 'id');
if (!postId) die('GrabCast không trả về post id');
if (AT) await gc('POST', `posts/${encodeURIComponent(postId)}/schedule`, { scheduled_at: new Date(AT).toISOString(), consent: true });
console.log(`✓ bài ${postId} · ${targetsAcc.length} kênh · ${AT ? 'lên lịch ' + new Date(AT).toISOString() : 'nháp (chưa lên lịch)'}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_id=${postId}\nmedia_id=${mediaId}\n`);
