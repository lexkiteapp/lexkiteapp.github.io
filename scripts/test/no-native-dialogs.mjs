// 🛡️ Cấm window.confirm/alert/prompt gốc trong web/ (crash iOS: WKWebView bắt buộc gọi completionHandler – app ở nền / đang có hộp khác → "Completion handler … was not called" → NSInternalInconsistencyException).
// Dùng LXDialog (web/js/dialog.js): await LXDialog.confirm(msg) / .prompt(msg, def) / .alert(msg). Hàm cục bộ cùng tên (vd. function prompt(it) ở cpack/irregular/drill.js) không bị tính.
// Dùng: node scripts/test/no-native-dialogs.mjs [--self]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), acorn = require('acorn');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), NAMES = new Set(['confirm', 'alert', 'prompt']);
const SKIP = /(^|\/)(node_modules|vendor|lib\/vendor)\//;
/** Trả về [{line, name}] các lời gọi dialog gốc trong mã JS `src` (bỏ qua tên được khai báo cục bộ: hàm/biến/tham số). */
export function scan(src) {
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', allowHashBang: true, locations: true }); } catch (e) { return [{ line: 0, name: 'parse', err: e.message }]; }
  const declared = new Set(), calls = [];
  const kids = (n, fn) => { for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && fn(c)); else if (v && typeof v.type === 'string') fn(v); } };
  const bind = p => { if (!p) return; if (p.type === 'Identifier') NAMES.has(p.name) && declared.add(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(x => bind(x.value || x.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(bind); else if (p.type === 'AssignmentPattern') bind(p.left); else if (p.type === 'RestElement') bind(p.argument); };
  (function walk(n) {
    if (/Function/.test(n.type)) { if (n.id && n.type === 'FunctionDeclaration') bind(n.id); n.params.forEach(bind); }
    if (n.type === 'VariableDeclarator' || n.type === 'ClassDeclaration') bind(n.id);
    if (n.type === 'CatchClause') bind(n.param);
    kids(n, walk);
  })(ast);
  (function walk(n) {
    if (n.type === 'CallExpression') {
      const c = n.callee;
      if (c.type === 'Identifier' && NAMES.has(c.name) && !declared.has(c.name)) calls.push({ line: n.loc.start.line, name: c.name });
      else if (c.type === 'MemberExpression' && !c.computed && c.property && NAMES.has(c.property.name) && c.object.type === 'Identifier' && /^(window|globalThis|self|top|parent)$/.test(c.object.name)) calls.push({ line: n.loc.start.line, name: c.object.name + '.' + c.property.name });
    }
    kids(n, walk);
  })(ast);
  return calls;
}
const files = []; (function ls(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (SKIP.test(p.replace(/\\/g, '/') + '/')) continue; if (e.isDirectory()) ls(p); else if (/\.(m?js|html)$/.test(e.name)) files.push(p); } })(path.join(ROOT, 'web'));
if (process.argv.includes('--self')) { // máy gác phải bắt được lỗi thật và không báo nhầm
  const ok = (s, n) => { const r = scan(s).length; if (r !== n) { console.error(`✗ no-native-dialogs --self: "${s}" → ${r}, cần ${n}`); process.exit(1); } };
  ok('if (!confirm("x")) return;', 1); ok('window.alert(1)', 1); ok('globalThis.prompt("a","b")', 1); ok('function prompt(it){} prompt(1)', 0); ok('const confirm = x => x; confirm(1)', 0);
  ok('const f = (alert) => alert(1)', 0); ok('LXDialog.confirm("x"); obj.alert(1); x.prompt(2)', 0); ok('"confirm(1)"; // alert(1)', 0);
  console.log('no-native-dialogs --self: ok'); process.exit(0);
}
const bad = [];
for (const f of files) {
  const rel = path.relative(ROOT, f), txt = fs.readFileSync(f, 'utf8');
  const chunks = f.endsWith('.html') ? [...txt.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?!module|text\/javascript))[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]) : [txt];
  for (const c of chunks) for (const h of scan(c)) if (h.err) { if (!f.endsWith('.html')) console.log(`  (bỏ qua ${rel}: không phân tích được – ${h.err})`); } else bad.push(`${rel}:${h.line} ${h.name}()`);
}
if (bad.length) { console.error(`✗ no-native-dialogs: ${bad.length} lời gọi hộp thoại gốc (crash iOS) – dùng await LXDialog.confirm/prompt/alert (web/js/dialog.js):\n  ` + bad.slice(0, 40).join('\n  ')); process.exit(1); }
// Lưới an toàn iOS (mobile/ios/App/App/DialogSafeUIDelegate.swift): cả 3 hộp thoại đều có nhánh gọi completionHandler khi không hiện được; cầu nối gắn trong LexkiteBridgeViewController; tệp nằm trong project.pbxproj.
{ const sw = fs.readFileSync(path.join(ROOT, 'mobile/ios/App/App/DialogSafeUIDelegate.swift'), 'utf8'), vc = fs.readFileSync(path.join(ROOT, 'mobile/ios/App/App/LexkiteBridgeViewController.swift'), 'utf8'), px = fs.readFileSync(path.join(ROOT, 'mobile/ios/App/App.xcodeproj/project.pbxproj'), 'utf8'), miss = [];
  for (const [m, d] of [['runJavaScriptAlertPanelWithMessage', 'completionHandler\\(\\)'], ['runJavaScriptConfirmPanelWithMessage', 'completionHandler\\(false\\)'], ['runJavaScriptTextInputPanelWithPrompt', 'completionHandler\\(nil\\)']]) if (!new RegExp(`func webView\\(_ webView: WKWebView, ${m}[\\s\\S]*?else \\{ ${d}; return \\}`).test(sw)) miss.push(`${m}: thiếu nhánh ${d.replace(/\\/g, '')} khi không hiện được`);
  if (!/DialogSafeUIDelegate\(wrapping:/.test(vc)) miss.push('LexkiteBridgeViewController chưa gắn DialogSafeUIDelegate');
  if ((px.match(/DialogSafeUIDelegate\.swift/g) || []).length < 4) miss.push('DialogSafeUIDelegate.swift chưa đủ 4 mục trong project.pbxproj');
  if (miss.length) { console.error('✗ no-native-dialogs (iOS): ' + miss.join('; ')); process.exit(1); } }
console.log(`no-native-dialogs: ok (${files.length} tệp, 0 lời gọi confirm/alert/prompt gốc)`);
