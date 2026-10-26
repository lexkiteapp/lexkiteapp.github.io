#!/usr/bin/env node
// Cổng deploy Cloudflare Pages DUY NHẤT (docs/FREE-TIER.md §7) – gom mọi yêu cầu deploy, không để mỗi push/bot tốn 1 build (trần Free 500/tháng).
//   node scripts/pages/deploy.mjs plan  → ghi act=hook|direct|none + reason vào $GITHUB_OUTPUT (pages-deploy.yml)
// Chế độ (biến repo PAGES_DEPLOY):
//   git    (mặc định, hiện tại) – Cloudflare tự build mỗi push không có [CF-Pages-Skip]; ở đây chỉ bù cho commit máy đã skip (cron/dispatch) bằng deploy hook.
//   hook   – chủ đã TẮT "automatic production deployments"; mọi deploy đi qua đây bằng deploy hook (vẫn tính build, nhưng gom + giãn cách).
//   direct – như hook nhưng dựng trên GitHub Actions + `wrangler pages deploy` (Direct Upload: không dùng hệ build Cloudflare → không tính 500 build).
// Gom: concurrency cancel-in-progress + chờ yên (quiet) trong workflow; ở đây thêm giãn cách tối thiểu giữa 2 build (minGap) trừ khi urgent.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// Đường dẫn KHÔNG vào dist (scripts/build-web.sh không đọc) – đổi ở đây chỉ đổi khi dist thật sự đổi. Cũng dùng làm Build watch paths (exclude) của Pages.
export const NON_SITE = [/^docs\//, /^reports\//, /^brand\//, /^mobile\//, /^store\//, /^workers\//, /^infra\//, /^\.github\//,
  /^scripts\/(video|cine|footage|vocab-img|media|free-tier|ops|pages)\//, /^scripts\/test\//, /^types\//];
// .md ngoài content/ và web/ (README, ghi chú) không vào dist
export const isSite = p => !NON_SITE.some(r => r.test(p)) && !(/\.md$/i.test(p) && !/^(content|web)\//.test(p));

/**
 * Quyết định deploy. last = bản production mới nhất {hash, created, building} (null nếu chưa có), changed = số tệp site đổi từ last.hash tới HEAD
 * (-1 = không so được → coi như đổi). Trả { act, reason }.
 */
export function decide({ mode = 'git', event, urgent = false, force = false, last = null, changed = -1, head, now = Date.now(), minGapMin = 180 }) {
  mode = ['git', 'hook', 'direct'].includes(mode) ? mode : 'git';
  const act = mode === 'direct' ? 'direct' : 'hook';
  if (force) return { act, reason: 'force' };
  if (mode === 'git' && event === 'push') return { act: 'none', reason: 'chế độ git: Cloudflare tự build push' };
  if (last && last.hash === head) return { act: 'none', reason: `HEAD ${String(head).slice(0, 9)} đã ${last.building ? 'đang build' : 'được deploy'}` };
  if (changed === 0) return { act: 'none', reason: 'không đổi tệp site kể từ bản deploy cuối' };
  // direct không tốn build → không cần giãn cách; hook/git: giãn cách trừ yêu cầu gấp (bài blog đến giờ, chế độ shed)
  if (act === 'hook' && !urgent && last) {
    const age = (now - Date.parse(last.created)) / 60000;
    if (last.building && age < 60) return { act: 'none', reason: 'đang có build chạy – lượt cron sau bù' };
    if (age < minGapMin) return { act: 'none', reason: `build cuối ${Math.round(age)} phút trước < ${minGapMin} – lượt cron sau bù` };
  }
  return { act, reason: `${changed < 0 ? '?' : changed} tệp site đổi${urgent ? ' (gấp)' : ''}` };
}

async function lastProd(tok, acct, project) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/${project}/deployments?env=production&per_page=10`, { headers: { Authorization: 'Bearer ' + tok } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(`pages deployments ${r.status}`);
  // bỏ bản bị skip ([CF-Pages-Skip]) và bản lỗi – chỉ bản đã/đang thật sự build tính là "đã deploy"
  for (const d of j.result || []) {
    const st = d.latest_stage || {}, md = (d.deployment_trigger || {}).metadata || {};
    if (st.status === 'skipped' || st.status === 'failure' || st.status === 'canceled') continue;
    return { hash: md.commit_hash || '', created: d.created_on, building: st.name !== 'deploy' || st.status !== 'success' };
  }
  return null;
}

function changedSince(hash) {
  if (!hash) return -1;
  try { return execFileSync('git', ['diff', '--name-only', hash, 'HEAD']).toString().split('\n').filter(Boolean).filter(isSite).length; } catch { return -1; }
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'plan') {
  const E = process.env, head = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
  let last = null, note = '';
  try { if (E.CF_TOKEN) last = await lastProd(E.CF_TOKEN, E.CF_ACCOUNT_ID, E.CF_PROJECT || 'lexkite'); else note = ' (thiếu CF_TOKEN – không biết bản cuối)'; }
  catch (e) { note = ` (API lỗi: ${e.message})`; }
  const r = decide({ mode: E.PAGES_DEPLOY, event: E.EVENT, urgent: E.URGENT === 'true', force: E.FORCE === 'true', last, changed: changedSince(last && last.hash), head, minGapMin: +(E.MIN_GAP_MIN || 180) });
  console.log(`pages-deploy: chế độ ${E.PAGES_DEPLOY || 'git'} · sự kiện ${E.EVENT} → ${r.act}: ${r.reason}${note}`);
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `act=${r.act}\n`);
}
