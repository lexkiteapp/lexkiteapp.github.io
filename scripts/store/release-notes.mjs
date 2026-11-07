#!/usr/bin/env node
// Ghi chú phát hành store (App Store "What's New" ≤ 4000, Google Play release notes ≤ 500) cho 15 ngôn ngữ.
// Nguồn: commit từ tag store-<platform>-* gần nhất → chỉ thay đổi người học thấy (đường dẫn app + vùng tính năng trong
// store/release-notes/areas.json) → mỗi vùng MỘT câu tiếng Việt ấm áp (khóa i18n) → bản dịch qua pipeline i18n sẵn có
// (en: web/js/i18n/en/storenotes.js, 13 ngôn ngữ: i18n/ui/<lang>/storenotes.js do bot i18n.yml dịch – docs/I18N-PIPELINE.md).
// Thiếu bản dịch ở bất kỳ ngôn ngữ nào → LỖI (không bao giờ đưa tiếng Việt/tiếng Anh lọt vào store ngôn ngữ khác).
//
//   node scripts/store/release-notes.mjs --platform ios|android [--app capacitor|native] [--since <ref>] [--out notes.json] [--summary]
//   node scripts/store/release-notes.mjs --check     mọi câu trong areas.json có đủ 15 ngôn ngữ, câu dài nhất vẫn vừa Play 500
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, LANGS, loadDictFile, loadSrc } from '../lib/i18n-pack.mjs';
import { cmpVer, versionsFromTags } from './version.mjs';

export const LIMITS = { ios: 4000, android: 500 };
export const ALL_LANGS = ['vi', 'en', ...LANGS];
export const CFG_FILE = 'store/release-notes/areas.json';
export const loadCfg = () => JSON.parse(fs.readFileSync(path.join(ROOT, CFG_FILE), 'utf8'));
const chars = s => [...s].length;

/** Commit → các vùng tính năng (thuần). commits: [{ sha, subject, files[] }] → [{ id, vi, count }] theo số commit giảm dần. */
export function classify(commits, cfg, app = 'capacitor') {
  const appRe = new RegExp(cfg.apps[app] || cfg.apps.capacitor), ign = new RegExp(cfg.ignore), skip = new RegExp(cfg.skipSubject, 'i');
  const areas = cfg.areas.map((a, i) => ({ ...a, i, re: a.match ? new RegExp(a.match) : null, sre: a.subject ? new RegExp(a.subject, 'i') : null, count: 0 }));
  for (const c of commits) {
    if (skip.test(c.subject)) continue;
    const files = (c.files || []).filter(f => appRe.test(f) && !ign.test(f));
    if (!files.length) continue;
    for (const a of areas) {
      if (a.sre && !a.sre.test(c.subject)) continue;
      if (a.re ? files.some(f => a.re.test(f)) : !!a.sre) a.count++;
    }
  }
  return areas.filter(a => a.count).sort((x, y) => y.count - x.count || x.i - y.i).map(({ id, vi, count }) => ({ id, vi, count }));
}

/** Ghép chữ 1 ngôn ngữ (thuần): "• câu" theo thứ tự ưu tiên, bỏ bớt câu cuối cho vừa `max`, luôn giữ câu kết. */
export function compose(lines, closing, max) {
  const keep = [...lines];
  const text = () => [...keep.map(l => `• ${l}`), closing].join('\n');
  while (keep.length && chars(text()) > max) keep.pop();
  const t = text();
  if (chars(t) > max) throw new Error(`câu kết dài ${chars(t)} > ${max}`);
  return t;
}

/** Từ điển storenotes theo ngôn ngữ: vi = chính khóa; en = nguồn tay; còn lại = nguồn i18n/ui (pipeline). */
export function loadDicts(langs = ALL_LANGS) {
  const d = {};
  for (const l of langs) d[l] = l === 'vi' ? null : l === 'en' ? loadDictFile('web/js/i18n/en/storenotes.js') : loadSrc(l, 'storenotes');
  return d;
}
const VI_MARK = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
/** Dịch 1 câu; thiếu/lẫn tiếng Việt → null. */
export function tr(dicts, lang, vi) {
  if (lang === 'vi') return vi;
  const t = dicts[lang]?.[vi];
  return t && t.trim() && !VI_MARK.test(t) ? t.trim() : null;
}

/** Bảng ghi chú { lang: text } – mọi ngôn ngữ, đúng giới hạn store. Thiếu bản dịch → Error liệt kê đủ. */
export function buildNotes(areas, cfg, dicts, max, langs = ALL_LANGS) {
  const picked = areas.slice(0, cfg.maxAreas || 5).map(a => a.vi);
  const missing = [], out = {};
  for (const l of langs) {
    const lines = picked.map(v => tr(dicts, l, v)), closing = tr(dicts, l, cfg.closing);
    picked.forEach((v, i) => { if (!lines[i]) missing.push(`${l}: ${v}`); });
    if (!closing) missing.push(`${l}: ${cfg.closing}`);
    if (lines.every(Boolean) && closing) out[l] = compose(lines, closing, max);
  }
  if (missing.length) throw new Error(`thiếu bản dịch storenotes (chạy bot i18n.yml hoặc node scripts/gen-i18n.mjs <lang>):\n  ${missing.join('\n  ')}`);
  return out;
}

/** Tag store-<platform>-<ver> mới nhất (theo version, không theo ngày). */
export function lastTag(tags, platform) {
  const vs = versionsFromTags(tags, platform).sort(cmpVer);
  return vs.length ? `store-${platform}-${vs[vs.length - 1]}` : null;
}
/** git log → [{ sha, subject, files }] (thuần trên chuỗi). */
export function parseLog(txt) {
  return String(txt).split('\x1e').map(s => s.trim()).filter(Boolean).map(s => {
    const [head, ...rest] = s.split('\n'); const [sha, subject] = head.split('\x1f');
    return { sha, subject: subject || '', files: rest.map(x => x.trim()).filter(Boolean) };
  });
}
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 });

function check(cfg) {
  const dicts = loadDicts(), errs = [];
  const keys = [cfg.closing, ...cfg.areas.map(a => a.vi)];
  const en = dicts.en;
  for (const k of keys) {
    if (!en[k]) errs.push(`en thiếu: ${k}`);
    for (const l of ALL_LANGS) if (!tr(dicts, l, k)) errs.push(`${l} thiếu/lẫn tiếng: ${k}`);
  }
  for (const k of Object.keys(en)) if (!keys.includes(k)) errs.push(`en/storenotes.js thừa khóa không dùng: ${k}`);
  // Trường hợp xấu nhất: maxAreas câu DÀI nhất + câu kết vẫn phải ghép được (compose bỏ bớt câu cho vừa Play 500, không bao giờ cắt giữa câu)
  if (!errs.length) for (const l of ALL_LANGS) {
    const longest = cfg.areas.map(a => tr(dicts, l, a.vi)).sort((a, b) => chars(b) - chars(a));
    const t = compose(longest.slice(0, cfg.maxAreas), tr(dicts, l, cfg.closing), LIMITS.android);
    if (t.split('\n').length < 2) errs.push(`${l}: 500 ký tự không chứa nổi 1 câu + câu kết`);
  }
  if (errs.length) { console.error(`✗ release-notes --check:\n  ${errs.join('\n  ')}`); process.exit(1); }
  console.log(`✓ release-notes: ${keys.length} câu × ${ALL_LANGS.length} ngôn ngữ đủ bản dịch, vừa giới hạn App Store ${LIMITS.ios} / Play ${LIMITS.android}`);
}

function main() {
  const a = process.argv.slice(2), arg = (f, d) => { const i = a.indexOf(f); return i >= 0 && a[i + 1] ? a[i + 1] : d; };
  const cfg = loadCfg();
  if (a.includes('--check')) return check(cfg);
  const platform = arg('--platform', 'ios'), app = arg('--app', 'capacitor');
  if (!LIMITS[platform]) throw new Error('--platform ios|android');
  const since = arg('--since') || lastTag(git('tag', '-l', `store-${platform}-*`).split('\n'), platform);
  const range = since ? [`${since}..HEAD`] : ['--since=30.days', 'HEAD']; // chưa có tag store nào: 30 ngày gần nhất (lần nộp tự động đầu tiên)
  const commits = parseLog(git('log', '--no-merges', '--format=%x1e%H%x1f%s', '--name-only', ...range));
  const areas = classify(commits, cfg, app);
  const notes = buildNotes(areas, cfg, loadDicts(), LIMITS[platform]);
  const f = arg('--out'); if (f) fs.writeFileSync(f, JSON.stringify(notes, null, 1) + '\n');
  console.log(`ghi chú ${platform}/${app} từ ${since || '30 ngày'}: ${commits.length} commit → ${areas.map(x => `${x.id}×${x.count}`).join(', ') || '(chỉ sửa lỗi nhỏ)'}`);
  if (a.includes('--summary')) console.log(`\nvi:\n${notes.vi}\n\nen:\n${notes.en}`);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) { try { main(); } catch (e) { console.log(`::error title=release-notes::${e.message.split('\n')[0]}`); console.error(e.message); process.exit(1); } }
