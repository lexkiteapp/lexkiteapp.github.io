/* Xem trước (dry-run) bài autopilot cho 1 clip – THUẦN: 0 lượt GrabCast/Meta, 0 ghi D1, không tải file.
 * Dùng chung: op 'preview' của /api/social-auto (kênh thật từ D1) + scripts/social/dryrun.mjs trên CI (manifest kho, chưa có kênh).
 * Ra đúng body autopilot sẽ POST lên GrabCast `posts` (bodyFor + socialMeta theo nền tảng) + kênh được định tuyến (theo ngôn ngữ) + lỗi kiểm tra. */
import { socialMeta, PLATFORMS } from './_role_meta.js';
import { bodyFor, validateCompose, PLAT } from './_social_mgr.js';
import { routeAll, implicitSocialRules, platformOf } from './_distribution.js';
import { firstComment, fcCaption } from './_first_comment.js';

export const PREVIEW_PLATS = ['facebook_page', 'instagram', 'tiktok', 'youtube', 'threads'];
export const MEDIA_PLACEHOLDER = '<media_id: tải lên lúc chạy thật>';
export const PREVIEW_CLIP_RE = /^[A-Za-z0-9_.-]{3,120}$/;

/** Clip để xem trước: id chỉ định, hoặc clip đạt QC mới nhất trong kho (cùng điều kiện autoQueue). Dùng chung /api/social-auto, op Quản trị lk/auto/preview, dryrun.mjs. */
export function pickPreviewClip(items, id) {
  const ok = (items || []).filter(it => it && it.id && !it.rejected);
  if (id) return ok.find(it => it.id === id) || null;
  return ok.filter(it => (it.qa || {}).status === 'pass').sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))[0] || null;
}

/** clip: kết quả clipOf (distribution.js). cfgs {channel_id: cfg} + accounts {channel_id: account_id} = kênh đã nối (rỗng khi chưa nối).
 *  → { clip, lang, routes: [...], posts: [{platform, channel_id|null, why, title, caption, caption_len, caption_max, hashtags, cover, issues[], body}] } */
export function previewClip(c, { cfgs = {}, rules = [], accounts = {}, plats = PREVIEW_PLATS } = {}) {
  const soRules = [...rules.filter(r => r.active !== 0 && platformOf(r.channel_id) !== 'youtube'), ...implicitSocialRules(rules, cfgs)];
  const routes = routeAll(soRules, cfgs, c, null), byPlat = new Map(routes.map(r => [r.platform, r]));
  const hasPlat = p => Object.keys(cfgs).some(id => platformOf(id) === p);
  const posts = plats.filter(p => PLATFORMS[p]).map(p => {
    const meta = socialMeta(c, p), rt = byPlat.get(p) || null;
    const why = rt ? '' : !hasPlat(p) ? 'chưa nối kênh' : 'không có page cùng ngôn ngữ (' + (c.lang || 'en') + ') và chưa có page EN chung';
    const acc = { id: rt ? (accounts[rt.channel_id] || rt.channel_id) : '<chưa nối kênh ' + p + '>', p, kind: (PLAT[p] || {}).kind || 'video' };
    const body = bodyFor({ ...c, title: meta.title || c.title, description: meta.description || c.description, hashtags: meta.description ? [] : c.hashtags }, MEDIA_PLACEHOLDER, [acc]);
    const fc = firstComment(c, p); // §6c: autopilot gắn khi kênh GrabCast có capabilities.first_comment (FB đường Meta: bình luận sau khi Reel lên)
    if (fc.text) { body.targets[0].options = { ...body.targets[0].options, first_comment: fc.text }; body.caption = fcCaption(body.caption, p); }
    const issues = validateCompose({ caption: body.caption, title: body.title, clip: c.id }, [p]).map(x => (x.lv || 'warn') + ':' + x.code);
    if (meta.no_keyword) issues.push('error:no-metadata');
    if (fc.mode !== 'bio' && !fc.text) issues.push('warn:first-comment-' + fc.why);
    const max = Math.min(PLATFORMS[p].caption, 2200), len = [...body.caption].length;
    if (!meta.hashtags.every(h => body.caption.includes(h))) issues.push('error:hashtag-cut');
    return { platform: p, channel_id: rt ? rt.channel_id : null, why, title: PLATFORMS[p].title ? body.title : '', caption: body.caption, caption_len: len, caption_max: max, hashtags: meta.hashtags,
      first_comment: fc.text, fc_mode: fc.mode, fc_link: fc.link, cover: c.cover ? (p === 'instagram' ? 'cover_url (Meta) / chưa có option GrabCast' : p === 'youtube' ? 'thumbnails.set (đường YouTube trực tiếp)' : 'GrabCast chưa có option bìa') : 'không có ảnh bìa', issues, body };
  });
  return { clip: c.id, lang: c.lang || 'en', routes, posts };
}

/** Bản in gọn cho log CI / admin. */
export function previewText(pv) {
  const L = [`▶ ${pv.clip} · ngôn ngữ ${pv.lang}`];
  for (const x of pv.posts) {
    L.push(`\n── ${x.platform} → ${x.channel_id || '(' + x.why + ')'} · caption ${x.caption_len}/${x.caption_max}${x.issues.length ? ' · ⚠ ' + x.issues.join(',') : ' · ✓'}`);
    if (x.title) L.push('title: ' + x.title);
    L.push(x.caption, x.fc_mode === 'bio' ? 'link bio: ' + x.fc_link : 'bình luận đầu: ' + (x.first_comment || '(không có)'), 'bìa: ' + x.cover, 'payload: ' + JSON.stringify(x.body));
  }
  return L.join('\n');
}
