#!/usr/bin/env node
// HOTFIX trần Workers 100k/ngày: trang từ 13 ngôn ngữ (functions/[lang]/words, đọc R2) chiếm ~49 % lượt vì MỖI request gọi Function, kể cả khi
// Function trúng caches.default. Cache Rule của zone chạy TRƯỚC Pages/Function → trúng cache biên = 0 lượt Workers. Luật này: cache HTML trang từ
// 13 ngôn ngữ, TTL biên 1 ngày (ghi đè Cache-Control của Function), bỏ query string khỏi khoá (crawler thêm ?utm/ref), serve-stale khi làm mới.
//   node scripts/cf-words-cache.mjs dry-run | apply | verify [--live]
// Token: CLOUDFLARE_API_TOKEN hoặc ~/.config/lexkite/cf-token (Zone › Cache Rules › Edit). Idempotent: chỉ thay luật có ref lexkite_words_, giữ luật khác.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { isMain } from './lib/is-main.mjs';
import { R2_LANGS } from '../functions/[lang]/words/[[path]].js';
import { ZONE } from './cdn/hosts.mjs';

export const REF = 'lexkite_words_', PHASE = 'http_request_cache_settings', TTL = 86400;
const hostOk = '(http.host eq "lexkite.com")';
export const expression = (langs = R2_LANGS) => `${hostOk} and (${langs.map(l => `starts_with(http.request.uri.path, "/${l}/words/")`).join(' or ')})`;
export const rule = ({ keyed = true } = {}) => ({
  ref: REF + 'cache', description: 'Lexkite: cache biên trang từ 13 ngôn ngữ (R2 Function) – trúng cache = 0 lượt Workers',
  expression: expression(), action: 'set_cache_settings',
  action_parameters: { cache: true, edge_ttl: { mode: 'override_origin', default: TTL }, browser_ttl: { mode: 'respect_origin' }, serve_stale: { disable_stale_while_updating: false },
    ...(keyed ? { cache_key: { custom_key: { query_string: { exclude: { all: true } } } } } : {}) },
});
export const mergeRules = (existing = [], mine) => [...existing.filter(r => !String(r.ref || '').startsWith(REF)).map(({ id, version, last_updated, ...r }) => r), ...mine];

const token = () => process.env.CLOUDFLARE_API_TOKEN || fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim();
async function cf(method, p, body) {
  const r = await fetch('https://api.cloudflare.com/client/v4' + p, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); return { ok: r.ok && j.success !== false, status: r.status, j };
}
const say = t => { console.log(t); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + '\n'); };
async function apply() {
  const cur = await cf('GET', `/zones/${ZONE}/rulesets/phases/${PHASE}/entrypoint`);
  if (!cur.ok && cur.status !== 404) { say(`✗ không đọc được luật cache (${cur.status}): token cần Zone › Cache Rules › Edit`); process.exit(1); }
  const have = cur.ok ? cur.j.result.rules || [] : [];
  for (const keyed of [true, false]) {
    const w = await cf('PUT', `/zones/${ZONE}/rulesets/phases/${PHASE}/entrypoint`, { rules: mergeRules(have, [rule({ keyed })]) });
    if (w.ok) { say(`✓ Cache Rule trang từ ${R2_LANGS.length} ngôn ngữ (TTL ${TTL}s${keyed ? ', bỏ query khỏi khoá' : ', giữ query trong khoá – gói không cho khoá tuỳ chỉnh'})`); return; }
    console.log(`(keyed=${keyed}) ${w.status} ${JSON.stringify(w.j.errors || '').slice(0, 200)}`);
  }
  say('✗ không ghi được Cache Rule'); process.exit(1);
}
/** Gọi 2 lần một trang thật: lần 2 phải cf-cache-status HIT (luật chạy trước Function). */
async function verify() {
  const u = 'https://lexkite.com/th/words/detect'; let st = '';
  for (let i = 0; i < 3; i++) { const r = await fetch(u + '?v=' + Date.now() % 7, { headers: { 'user-agent': 'lexkite-cache-verify' } }); st = r.headers.get('cf-cache-status') || ''; if (i && /HIT/i.test(st)) break; await new Promise(s => setTimeout(s, 1500)); }
  say(/HIT/i.test(st) ? `✓ ${u}: cf-cache-status ${st}` : `✗ ${u}: cf-cache-status ${st || '(không có)'} – luật chưa có tác dụng`); if (!/HIT/i.test(st)) process.exit(1);
}
if (isMain(import.meta.url)) {
  const cmd = process.argv[2] || 'dry-run';
  if (cmd === 'dry-run') console.log(JSON.stringify(rule(), null, 1));
  else if (cmd === 'apply') { await apply(); await verify().catch(() => {}); }
  else if (cmd === 'verify') await verify();
}
