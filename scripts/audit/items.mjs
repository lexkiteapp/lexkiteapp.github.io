// Audit tổng – danh sách MỌI mục được chấm (docs/QUALITY-SWEEP.md §Audit tổng). Không có danh sách tay thứ hai: app = frame-variants ∪ codemap ∪ route mẫu của quality-sweep;
// web = loại trang tĩnh trong dist (cùng cách phân loại của web-sweep); add-on = popup/newtab/bong bóng/app nhúng; native = native/shared/parity.json.
import fs from 'node:fs';
import path from 'node:path';
import { BASE_ROUTES } from '../quality/routes.mjs';
import { FIXED } from '../test/lib/learn-samples.mjs';
import { SKIP, typeOf } from '../lib/page-types.mjs';

const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const SETTINGS = ['account', 'look', 'study', 'sound', 'remind', 'ai', 'ext', 'data', 'help'].map(k => 'settings/' + k); // trang con Cài đặt (cùng danh sách qa-bot)
const EXT_APP = ['home', 'vocab', 'dict/sustainable', 'review', 'me', 'settings'];

export function appItems(root) {
  const fv = Object.keys(rd(path.join(root, 'scripts/test/frame-variants.json')).routes);
  const cm = Object.keys(rd(path.join(root, 'docs/codemap.json')).routes).map(r => r.replace(/^#\//, ''));
  const out = new Map();
  for (const r of [...BASE_ROUTES, ...SETTINGS]) out.set(r, r);
  const have = new Set([...out.keys()].map(r => r.split('/')[0]));
  for (const r of [...fv, ...cm]) if (!have.has(r)) { have.add(r); out.set(r, r); }
  return [...out.keys()].sort().map(r => {
    const base = r.split('/')[0], hash = '/' + (FIXED[base] ? FIXED[base].slice(1) : r);
    return { id: 'app:' + r, kind: 'app', name: '#/' + r, hash, route: base, fresh: base === 'welcome' };
  });
}

export function pageItems(dist) {
  const files = [];
  (function walk(d, rel = '') {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel + e.name;
      if (e.isDirectory()) { if (!SKIP.test(r + '/')) walk(path.join(d, e.name), r + '/'); } else if (e.name.endsWith('.html')) files.push(r);
    }
  })(dist);
  const byType = new Map();
  for (const f of files.sort()) {
    const { type, lang } = typeOf(f);
    if (/http-equiv=["']?refresh/i.test(fs.readFileSync(path.join(dist, f), 'utf8').slice(0, 4000))) continue; // trang chuyển hướng
    if (!byType.has(type)) byType.set(type, { pick: f, langs: {} });
    if (lang) byType.get(type).langs[lang] = f;
  }
  return [...byType].map(([type, t]) => {
    const en = t.langs.en || t.pick, toUrl = f => '/' + f.replace(/(^|\/)index\.html$/, '$1');
    return { id: 'web:' + type, kind: 'page', name: type, url: toUrl(en), langs: Object.fromEntries(Object.entries(t.langs).map(([l, f]) => [l, toUrl(f)])) };
  });
}

export function extItems() {
  return [{ id: 'ext:popup', kind: 'ext', name: 'Add-on › popup', page: 'popup.html' }, { id: 'ext:newtab', kind: 'ext', name: 'Add-on › tab mới', page: 'newtab.html' }, { id: 'ext:bubble', kind: 'ext', name: 'Add-on › bong bóng tra từ', bubble: true },
    ...EXT_APP.map(r => ({ id: 'ext:app/' + r, kind: 'ext', name: 'Add-on › app #/' + r, page: `app/index.html?demo=1&hl=en#/${r}`, route: r.split('/')[0] }))];
}

export function nativeItems(root) {
  return rd(path.join(root, 'native/shared/parity.json')).items.filter(x => x.routes.length || /^C/.test(x.id)).map(x => ({ id: 'native:' + x.id, kind: 'native', name: `Native ${x.id} · ${x.title.split(':')[0].slice(0, 60)}`, done: x.status === 'done' }));
}

/** Một shard (i/n) ổn định theo thứ tự danh sách. */
export const shardOf = (list, i, n) => list.filter((_, k) => k % n === i);
