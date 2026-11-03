// Việc tồn đọng clip mạng xã hội cho ci-filler (infra/ci-backlog.json → social-clips.yml specs=todo): spec L1 + Reels chưa có clip ĐẠT
// trong kho content/social/videos với đúng nội dung spec hiện tại (spec_sha). Spec đã TRƯỢT cổng ở cùng spec_sha (rejected.json) không dựng lại
// (không lặp runner vô ích) – sửa spec/engine thì sha đổi hoặc chạy tay. Dùng: node scripts/rig/todo.mjs --count | --list
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
export const DIRS = ['content/video/rig/l1', 'content/video/rig/reels'], STORE = 'content/social/videos';
export const sha = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
export const specFiles = () => DIRS.filter(d => fs.existsSync(d)).flatMap(d => fs.readdirSync(d, { recursive: true }).map(f => path.join(d, f)).filter(f => f.endsWith('.json'))).sort();
export function todo() {
  const done = new Map(), rej = fs.existsSync(`${STORE}/rejected.json`) ? JSON.parse(fs.readFileSync(`${STORE}/rejected.json`, 'utf8')) : {};
  if (fs.existsSync(STORE)) for (const l of fs.readdirSync(STORE)) {
    if (!fs.statSync(path.join(STORE, l)).isDirectory()) continue;
    for (const d of fs.readdirSync(path.join(STORE, l))) {
      const m = path.join(STORE, l, d, 'meta.json'); if (!fs.existsSync(m)) continue;
      const j = JSON.parse(fs.readFileSync(m, 'utf8')); if (j.qc?.pass) done.set(j.id, j.spec_sha);
    }
  }
  return specFiles().filter(f => { const id = JSON.parse(fs.readFileSync(f, 'utf8')).id, s = sha(f); return done.get(id) !== s && rej[id]?.spec_sha !== s; });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const t = todo();
  if (process.argv.includes('--list')) console.log(t.join('\n')); else console.log(`cần dựng ${t.length} / ${specFiles().length} spec`);
}
