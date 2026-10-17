// HTTP qua curl (chạy được cả trên máy cá nhân có proxy chặn DNS của Node lẫn GitHub Actions). Header truyền qua stdin (-K -)
// để giá trị bí mật (header CI) không hiện trong danh sách tiến trình. Trả { status, body }.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os';
export const UA = 'Lexkite-bot/1.0 (+https://lexkite.com)';
export function ciHeaderValue() {
  if (process.env.LEXKITE_CI_HEADER) return process.env.LEXKITE_CI_HEADER.trim();
  try { return fs.readFileSync(`${os.homedir()}/.config/lexkite/ci-header`, 'utf8').trim(); } catch { return ''; }
}
export function request(url, { method = 'GET', headers = {}, body, timeout = 30, ci = false } = {}) {
  const h = { 'User-Agent': UA, ...headers }, civ = ci ? ciHeaderValue() : '';
  if (civ) h['X-Lexkite-CI'] = civ;
  const conf = Object.entries(h).map(([k, v]) => `header = "${k}: ${String(v).replace(/"/g, '\\"')}"`).join('\n') + '\n';
  let tmp; const a = ['-s', '-L', '--max-time', String(timeout), '-K', '-', '-X', method, '-w', '\n%{http_code}'];
  if (body != null) { tmp = `${fs.mkdtempSync(`${os.tmpdir()}/lk-`)}/b`; fs.writeFileSync(tmp, body, { mode: 0o600 }); a.push('--data-binary', `@${tmp}`); }
  try {
    const out = execFileSync('curl', [...a, url], { input: conf, maxBuffer: 50e6 }).toString('utf8');
    const i = out.lastIndexOf('\n'); return { status: Number(out.slice(i + 1)) || 0, body: out.slice(0, i) };
  } catch (e) { return { status: 0, body: '', error: e.message }; } finally { if (tmp) fs.rmSync(tmp, { force: true }); }
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function stdinText() { let s = ''; for await (const c of process.stdin) s += c; return s; } // đọc stdin kiểu async (readFileSync(0) lỗi EAGAIN với pipe)
