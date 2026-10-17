/* Background service worker: tra từ, lưu thẻ, nhắc học hằng ngày, badge số thẻ cần ôn. */
// Ghi lại lỗi (tối đa 20) để chẩn đoán từ xa qua trang Lexkite – không gửi đi đâu
const logErr = (where, e) => { try { const m = String((e && (e.stack || e.message)) || e).slice(0, 600); chrome.storage.local.get('errLog').then(({ errLog }) => chrome.storage.local.set({ errLog: [...(errLog || []), { at: Date.now(), v: chrome.runtime.getManifest().version, where, m }].slice(-20) })); } catch (x) { /* bỏ qua */ } };
self.addEventListener('error', e => logErr('bg', e.error || e.message));
self.addEventListener('unhandledrejection', e => logErr('bg-promise', e.reason));
// Chrome/Edge: service worker → importScripts; Firefox: manifest nạp sẵn các file này qua background.scripts
if (typeof importScripts === 'function' && typeof Core === 'undefined') importScripts('app/js/data.js', 'app/js/core.js', 'app/js/vi-check.js', 'app/js/dictionary.js');
const { Store, Cards, Stats, Golden, DEFAULT_SETTINGS, todayKey } = Core;
// Ngôn ngữ giao diện (thông báo, menu chuột phải): chỉ en / vi như web app, ngôn ngữ khác → English
// Giao diện add-on theo 15 ngôn ngữ của web: vi = chữ gốc, en = bảng EN, ngôn ngữ khác = từ điển web (app/js/i18n/<lang>.js)
const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
let UI_LANG = pickLang(chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en';
const uiDicts = {};
// en: chỉ bảng tên cấu trúc ngữ pháp (chữ EN khác có sẵn trong từng file); ngôn ngữ khác: từ điển web đầy đủ
async function uiDict(lang) {
  if (!lang || lang === 'vi') return {};
  if (uiDicts[lang]) return uiDicts[lang];
  const one = async f => { try { const s = await (await fetch(chrome.runtime.getURL(f))).text(); const i = s.indexOf('{"', s.indexOf('Object.assign(')), j = s.lastIndexOf('});'); return JSON.parse(s.slice(i, j + 1)); } catch (e) { return {}; } };
  uiDicts[lang] = lang === 'en' ? Object.assign(await one('app/js/i18n/en/structs.js'), await one('app/js/i18n/en/writecheck.js')) : await one(`app/js/i18n/${lang}.js`); // en: cấu trúc + soát lỗi viết (định dạng JSON)
  return uiDicts[lang];
}
let XD = {};
// Dựng menu chuột phải tuần tự: onInstalled và đổi ngôn ngữ có thể gọi cùng lúc → removeAll/create đan xen gây lỗi "duplicate id"
let menuQ = Promise.resolve();
function initContextMenus() {
  menuQ = menuQ.then(async () => {
    await chrome.contextMenus.removeAll();
    const add = o => new Promise(res => chrome.contextMenus.create(o, () => { void chrome.runtime.lastError; res(); }));
    await add({ id: 'lexi-lookup', title: tx('Tra từ “%s” với Lexkite'), contexts: ['selection'] });
    await add({ id: 'lexi-translate', title: tx('Dịch đoạn đã chọn'), contexts: ['selection'] });
  }).catch(() => { /* contextMenus error */ });
  return menuQ;
}
let langReady = null, menuLang = null;
const setLang = l => { if (!l) return langReady; UI_LANG = l; langReady = uiDict(l).then(d => { XD = d; if (menuLang !== l) { menuLang = l; initContextMenus(); } }).catch(() => {}); return langReady; };
langReady = chrome.storage.local.get('uiLang').then(r => setLang(pickLang(r.uiLang) || UI_LANG)).catch(() => {});
chrome.storage.onChanged.addListener(ch => { if (ch.uiLang) setLang(pickLang(ch.uiLang.newValue)); });
const XLANG_NAMES = {
  vi: 'Vietnamese', en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French',
  de: 'German', id: 'Indonesian', th: 'Thai', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish'
};
const EN = {
  'Lexkite – đến giờ học rồi! 📚': 'Lexkite – time to study! 📚',
  'Bạn có {n} thẻ cần ôn hôm nay.': 'You have {n} cards to review today.',
  ' Giữ chuỗi {n} ngày 🔥': ' Keep your {n}-day streak 🔥',
  'Thêm vài từ mới để giữ chuỗi ngày học nhé 🔥': 'Add a few new words to keep your streak going 🔥',
  'Ôn ngay': 'Review now',
  '⏰ Thời điểm vàng!': '⏰ Golden moment!',
  '{n} từ đang ở thời điểm sắp quên – ôn 3 phút để nhớ lâu hơn.': '{n} words are about to be forgotten – review for 3 minutes to remember them longer.',
  'Tra từ “%s” với Lexkite': 'Look up “%s” with Lexkite',
  'Dịch đoạn đã chọn': 'Translate selection',
};
const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || EN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };

const APP_URL = chrome.runtime.getURL('app/index.html');
const getSettings = async () => ({ ...DEFAULT_SETTINGS, ...(await Store.get('settings', {})) });

// ---------- Nhắc học ----------
async function scheduleReminder() {
  const s = await getSettings();
  await chrome.alarms.clear('daily-reminder');
  if (!s.reminderOn) return;
  const [hh, mm] = s.reminderTime.split(':').map(Number);
  const next = new Date(); next.setHours(hh, mm, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  chrome.alarms.create('daily-reminder', { when: next.getTime(), periodInMinutes: 24 * 60 });
}

async function sendReminder(force = false) {
  await langReady; // thông báo đúng ngôn ngữ người dùng chọn kể cả khi SW vừa được alarm đánh thức
  const [s, cards, stats] = await Promise.all([getSettings(), Cards.all(), Stats.get()]);
  const done = stats.days[todayKey()] || 0;
  if (!force && done >= s.dailyGoal) return;
  const { total } = Cards.dueCount(cards, s, stats);
  const streak = Stats.streak(stats);
  chrome.notifications.create('reminder-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: tx('Lexkite – đến giờ học rồi! 📚'),
    message: total ? tx('Bạn có {n} thẻ cần ôn hôm nay.', { n: total }) + (streak ? tx(' Giữ chuỗi {n} ngày 🔥', { n: streak }) : '') : tx('Thêm vài từ mới để giữ chuỗi ngày học nhé 🔥'),
    buttons: [{ title: tx('Ôn ngay') }],
    priority: 2,
  });
}

// Thời điểm vàng: kiểm tra mỗi 15 phút, báo khi đủ số từ sắp quên (tối đa 1 lần / 3 giờ, tôn trọng giờ yên lặng)
async function checkGolden() {
  await langReady;
  const [s, cards] = await Promise.all([getSettings(), Cards.all()]);
  if (!s.goldenOn || Golden.quiet(s)) return;
  const n = Golden.dueNow(cards);
  const last = await Store.get('lastGolden', 0);
  if (n < s.goldenMin || Date.now() - last < 3 * 3600 * 1000) return;
  await Store.set('lastGolden', Date.now());
  chrome.notifications.create('golden-' + Date.now(), {
    type: 'basic', iconUrl: 'icons/icon-128.png', priority: 2,
    title: tx('⏰ Thời điểm vàng!'),
    message: tx('{n} từ đang ở thời điểm sắp quên – ôn 3 phút để nhớ lâu hơn.', { n }),
    buttons: [{ title: tx('Ôn ngay') }],
  });
}

async function updateBadge() {
  const [s, cards, stats] = await Promise.all([getSettings(), Cards.all(), Stats.get()]);
  const { total } = Cards.dueCount(cards, s, stats);
  chrome.action.setBadgeText({ text: total ? String(total > 99 ? '99+' : total) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#e5484d' });
}

const openApp = (hash = '#/review') => chrome.tabs.create({ url: APP_URL + hash });

// Chạy content script ngay trên các tab đang mở (không cần tải lại trang sau khi cài/cập nhật)
async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.all(tabs.map(t => chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['app/js/structures.js', 'app/js/writecheck-rules.js', 'content.js', 'writecheck.js'] }).catch(() => {})));
}

// ---------- Thống kê sử dụng ẩn danh (functions/api/hit.js t:'x') ----------
// Chỉ đếm số lần (tra từ / lưu thẻ / mở popup / mở tab mới) theo ngày trên máy; gửi 1 lượt/ngày vào lần dùng đầu tiên của ngày mới
// (kèm tổng của ngày dùng trước đó). Không gửi từ đã tra, URL trang, email hay bất kỳ dữ liệu cá nhân nào.
const HIT = 'https://lexkite.com/api/hit', USE_EV = ['lookup', 'save', 'popup', 'newtab'];
const isDevInstall = () => !chrome.runtime.getManifest().update_url; // bản "Load unpacked" trên máy phát triển
async function extVid() {
  const o = await chrome.storage.local.get('lk.vid');
  if (/^[a-z0-9]{8,32}$/.test(o['lk.vid'] || '')) return o['lk.vid'];
  const v = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); // cùng dạng với lk.vid của web app
  await chrome.storage.local.set({ 'lk.vid': v });
  return v;
}
const hitLang = async () => pickLang((await chrome.storage.local.get('uiLang')).uiLang) || UI_LANG;
async function sendHit(body) {
  try { await fetch(HIT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ t: 'x', vid: await extVid(), ver: chrome.runtime.getManifest().version, lang: await hitLang(), ...body }), keepalive: true }); } catch (e) { /* mạng lỗi – bỏ qua */ }
}
let useQ = Promise.resolve(); // ghi tuần tự để không mất lượt đếm khi nhiều tin nhắn tới cùng lúc
function countUse(ev) {
  if (!USE_EV.includes(ev)) return;
  useQ = useQ.then(async () => {
    const day = new Date().toISOString().slice(0, 10); // ngày UTC, khớp máy chủ
    let u = (await chrome.storage.local.get('lk.use'))['lk.use'];
    let prev = null;
    if (!u || u.day !== day) { if (u && u.day && u.c) prev = { day: u.day, ev: u.c }; u = { day, c: { lookup: 0, save: 0, popup: 0, newtab: 0 }, sent: false }; }
    u.c[ev] = (u.c[ev] || 0) + 1;
    const first = !u.sent; u.sent = true; u.active = true;
    await chrome.storage.local.set({ 'lk.use': u });
    if (first) sendHit({ day, ev: u.c, prev: prev || undefined });
  }).catch(() => {});
}
try { if (chrome.runtime.setUninstallURL) chrome.runtime.setUninstallURL('https://lexkite.com/bye?src=ext&v=' + encodeURIComponent(chrome.runtime.getManifest().version) + '&l=' + UI_LANG); } catch (e) { /* bỏ qua */ }

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await initContextMenus();
  injectIntoOpenTabs();
  chrome.alarms.create('badge', { periodInMinutes: 15 });
  await scheduleReminder();
  updateBadge();
  if (reason === 'install') openApp('#/home');
  if (!isDevInstall() && (reason === 'install' || reason === 'update')) sendHit({ ev: { [reason]: 1 } });
});
chrome.runtime.onStartup.addListener(async () => {
  if (!(await chrome.alarms.get('badge'))) chrome.alarms.create('badge', { periodInMinutes: 15 }); // phòng alarm bị mất (Chrome xóa khi cập nhật lỗi)
  scheduleReminder(); updateBadge();
});

chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'dev-reload') return;
  if (a.name === 'daily-reminder') sendReminder();
  if (a.name === 'badge') checkGolden();
  updateBadge();
});
chrome.notifications.onClicked.addListener(id => { chrome.notifications.clear(id); openApp(); });
chrome.notifications.onButtonClicked.addListener(id => { chrome.notifications.clear(id); openApp(); });

chrome.storage.onChanged.addListener(ch => {
  if (ch.settings) scheduleReminder();
  if (ch.cards || ch.stats || ch.settings) updateBadge();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'lexi-translate' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'translateSelection' }, { frameId: info.frameId || 0 }).catch(() => {});
    return;
  }
  if (info.menuItemId === 'lexi-lookup' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'showLookup', word: info.selectionText }, { frameId: info.frameId || 0 }).catch(() => openApp('#/dict/' + encodeURIComponent(info.selectionText)));
  }
});

// ---------- Giải thích sâu bằng AI (Gemini, khóa của chính người dùng – lưu trong chrome.storage.local 'aiKey') ----------
async function aiModels(key) {
  const { aiModels: c } = await chrome.storage.local.get('aiModels');
  if (c && c.k === key.slice(-6) && Date.now() - c.at < 3 * 864e5 && c.list && c.list.length) return c.list;
  const base = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return base;
    const ver = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
    const list = ((await r.json()).models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''))
      .filter(n => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|live|audio|embed|exp|thinking/.test(n))
      .sort((x, y) => ver(y) - ver(x) || (/preview/.test(x) - /preview/.test(y)) || (/lite/.test(x) - /lite/.test(y)));
    const out = [...new Set([...list.slice(0, 4), ...base])];
    await chrome.storage.local.set({ aiModels: { k: key.slice(-6), at: Date.now(), list: out } });
    return out;
  } catch (e) { return base; }
}
const EX_PROMPT = (text, sentence, lang) => `Explain the English expression for a ${lang} IELTS/TOEIC learner. Expression: "${text}"${sentence && sentence !== text ? `\nSentence it appears in: "${sentence}"` : ''}
Return ONLY JSON: {"meaning": string (${lang} meaning in THIS context), "structure": [{"pattern": string, "explain": string (${lang})}] (1-3 items), "grammar": string (${lang}), "collocations": [string] (3-5 natural English collocations), "examples": [{"en": string, "vi": string}] (2 examples), "tip": string (${lang}: how to use it in exams)}`;
async function aiExplain(text, sentence, targetLang = UI_LANG) {
  const { aiKey, settings } = await chrome.storage.local.get(['aiKey', 'settings']);
  const trLang = targetLang === 'en' ? 'vi' : (targetLang.split('-')[0] || 'vi');
  const langName = XLANG_NAMES[targetLang] || XLANG_NAMES[trLang] || 'Vietnamese';
  // Không có khóa → AI có sẵn trong Chrome (Gemini Nano, trên máy, miễn phí)
  const LM = self.LanguageModel;
  const nano = async () => {
    const opts = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
    const av = await LM.availability(opts); if (av !== 'available') return null; // chưa tải sẵn → không tự tải ngầm ~2GB (tránh treo)
    const LIM = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    const s = await LIM(LM.create(opts), 15000);
    try {
      const out = await LIM(s.prompt(EX_PROMPT(text, sentence, 'English') + '\nReturn only JSON.'), 25000);
      const j = JSON.parse(String(out).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      const slots = [['meaning'], ['grammar'], ['tip']].filter(([k]) => j[k]).map(([k]) => [j, k, j[k]]);
      (j.structure || []).forEach(x => x.explain && slots.push([x, 'explain', x.explain]));
      (j.examples || []).forEach(x => x.en && slots.push([x, 'vi', x.en]));
      const trans = (await (trLang === 'vi' ? Dict.translateVi(slots.map(x => String(x[2]).replace(/\n/g, ' ')).join('\n')) : Dict.translateTo(slots.map(x => String(x[2]).replace(/\n/g, ' ')).join('\n'), trLang))).split('\n');
      slots.forEach(([o, k], i) => { if (trans[i]) o[k] = trans[i].trim(); });
      return { result: j };
    } finally { try { s.destroy(); } catch (e) { /* bỏ qua */ } }
  };
  if (!aiKey) { if (LM) { try { const r = await nano(); if (r) return r; } catch (e) { /* không hỗ trợ */ } } return { error: 'NO_KEY' }; }
  const found = await aiModels(aiKey);
  const models = settings && settings.aiModel ? [settings.aiModel, ...found.filter(m => m !== settings.aiModel)] : found;
  for (const m of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiKey }, signal: AbortSignal.timeout(25000), body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: EX_PROMPT(text, sentence, langName) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }) });
      if (r.status === 404) { await chrome.storage.local.set({ aiModels: null }); continue; }
      const j = await r.json();
      if (!r.ok) { if (r.status === 429 && LM) { try { const x = await nano(); if (x) return x; } catch (e) { /* bỏ qua */ } } return { error: r.status === 429 ? 'QUOTA' : r.status === 400 ? 'BAD_KEY' : 'FAILED' }; }
      const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
      return { result: JSON.parse(t.replace(/^```(json)?|```$/g, '').trim()) };
    } catch (e) { /* thử mẫu tiếp theo */ }
  }
  if (LM) { try { const x = await nano(); if (x) return x; } catch (e) { /* bỏ qua */ } }
  return { error: 'FAILED' };
}

// Tự đồng bộ nền khi lưu từ mới/ôn thẻ (nếu đã liên kết tài khoản)
let bgSyncTimer = null;
function scheduleBgSync() {
  if (bgSyncTimer) clearTimeout(bgSyncTimer);
  bgSyncTimer = setTimeout(async () => {
    try {
      const { linked } = await chrome.storage.local.get('linked');
      if (!linked || !linked.email) return;
      const tabs = await chrome.tabs.query({ url: ['https://lexkite.com/app/*', 'https://www.lexkite.com/app/*', 'https://lexkite.pages.dev/app/*'] /* chỉ tab app học (trang giới thiệu/blog không đồng bộ) */ });
      if (tabs && tabs.length) return; // Tab đang mở sẽ tự đồng bộ qua cầu nối
      const before = (linked.at || 0);
      const tab = await chrome.tabs.create({ url: 'https://lexkite.com/app/#/home', active: false });
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const cur = ((await chrome.storage.local.get('linked')).linked || {}).at || 0;
        if (cur > before) break;
      }
      chrome.tabs.remove(tab.id).catch(() => {});
    } catch (e) { /* bỏ qua nếu lỗi mạng */ }
  }, 3500);
}

// ---------- ✍️ Soát lỗi viết (writecheck.js) ----------
// LanguageTool (máy chủ công khai): CHỈ khi người dùng bật cả "Soát lỗi viết" lẫn "Kiểm nâng cao". Giới hạn của máy chủ: 20 lượt/phút, ≤ 20 KB/lượt
// → đếm lượt trong chrome.storage.session (service worker ngủ vẫn giữ), tối đa 18 lượt/phút, cắt chữ ≤ 18 KB.
async function wcLanguageTool(text) {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings || settings.wcOn !== true || settings.wcAdv !== true) return { err: 'off' };
  text = String(text || ''); const enc = new TextEncoder();
  if (enc.encode(text).length > 18000) return { err: 'size' }; // quá dài – chỉ soát bằng luật trên máy
  const now = Date.now(), ss = chrome.storage.session;
  const log = ((ss && (await ss.get('wcLtLog')).wcLtLog) || []).filter(t => now - t < 60000);
  if (log.length >= 18) return { err: 'rate' };
  log.push(now); if (ss) await ss.set({ wcLtLog: log });
  try {
    const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ text, language: 'en-US' }) });
    if (r.status === 429) { if (ss) await ss.set({ wcLtLog: Array(18).fill(now) }); return { err: 'rate' }; }
    if (!r.ok) return { err: 'http' };
    const j = await r.json();
    const type = m => { const it = (m.rule && m.rule.issueType) || '', cat = (m.rule && m.rule.category && m.rule.category.id) || ''; return it === 'misspelling' ? 'spelling' : /typographical|whitespace/.test(it) || /PUNCTUATION|TYPOGRAPHY|CASING/.test(cat) ? 'punct' : /style|register|locale-violation/.test(it) || /STYLE|REDUNDANCY|PLAIN_ENGLISH|COLLOQUIALISMS/.test(cat) ? 'style' : 'grammar'; };
    const list = (j.matches || []).filter(m => !(m.rule && /^(EN_QUOTES|DASH_RULE|WHITESPACE_RULE|EN_UNPAIRED_BRACKETS)$/.test(m.rule.id)))
      .slice(0, 60).map(m => ({ s: m.offset, e: m.offset + m.length, type: type(m), reps: (m.replacements || []).slice(0, 4).map(x => x.value), rule: 'lt:' + ((m.rule && m.rule.id) || ''), msg: String(m.message || '').slice(0, 300) }));
    return { list };
  } catch (e) { return { err: 'net' }; }
}
// Lỗi viết lặp lại → Sổ lỗi sai (cùng định dạng App.logMistake trong web/js/plan.js). Chỉ lưu trên máy.
async function wcMistake(m) {
  const seen = (await Store.get('wcSeen', {})) || {}, k = String(m.key || '').slice(0, 160); if (!k) return { ok: false };
  const it = seen[k] = seen[k] || { n: 0 }; it.n++; it.at = Date.now();
  const keys = Object.keys(seen); if (keys.length > 400) keys.sort((a, b) => seen[a].at - seen[b].at).slice(0, keys.length - 400).forEach(x => delete seen[x]);
  await Store.set('wcSeen', seen);
  if (it.n < 2) return { ok: true, n: it.n };
  const list = await Store.get('mistakes', []), q = String(m.q || '').slice(0, 200), key = (m.kind === 'vocab' ? 'vocab' : 'grammar') + '|' + q;
  const old = list.find(x => x.key === key);
  if (old) { old.n = (old.n || 1) + 1; old.at = Date.now(); old.fixed = false; }
  else list.unshift({ kind: m.kind === 'vocab' ? 'vocab' : 'grammar', q, given: String(m.given || '').slice(0, 80), answer: String(m.answer || '').slice(0, 80), explain: String(m.explain || '').slice(0, 400), ref: String(m.ref || '').slice(0, 60), src: 'writecheck', key, n: it.n, at: Date.now(), fixed: false });
  await Store.set('mistakes', list.slice(0, 300));
  // Từ hay viết sai → thẻ flashcard để ôn theo lịch FSRS
  if (m.kind === 'vocab' && m.ref && /^[a-z][a-z' -]{1,30}$/i.test(m.ref) && !it.card) {
    try { const cards = await Cards.all(); const w = m.ref.toLowerCase(); if (!cards[w]) { const e = await Dict.quick(w); if (e && e.word) { await Cards.add(e, null); scheduleBgSync(); } /* không kèm câu người dùng viết (thẻ được đồng bộ theo tài khoản) */ } it.card = 1; await Store.set('wcSeen', seen); } catch (e) { /* bỏ qua */ }
  }
  return { ok: true, n: it.n, logged: true };
}

// ---------- Tin nhắn từ content script / popup / app ----------
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => { try {
    switch (msg.type) {
      case 'lookup': {
        const e = await Dict.lookup(msg.word);
        const cards = await Cards.all();
        return reply({ entry: e, saved: !!(e && cards[e.word]) });
      }
      case 'quick': {
        const e = await Dict.quick(msg.word);
        const cards = await Cards.all();
        return reply({ entry: e, saved: !!(e && cards[e.word]) });
      }
      case 'save': {
        const card = await Cards.add(msg.entry, msg.context);
        if (sender.tab && /^https?:/.test(sender.url || '')) countUse('save'); // lưu từ trang web (content script)
        scheduleBgSync();
        return reply({ ok: true, card });
      }
      case 'triggerSync': {
        scheduleBgSync();
        return reply({ ok: true });
      }
      case 'usage': countUse(msg.ev); return reply({ ok: true });
      case 'extJson': { // dữ liệu trong gói cho content script (MV3 chặn trang web đọc file add-on không khai báo web_accessible_resources)
        const n = { academic: 'academic.json', 'grammar-titles': 'grammar-titles.json' }[msg.name];
        if (!n) return reply({});
        self.__json = self.__json || {};
        if (!self.__json[n]) self.__json[n] = await fetch(chrome.runtime.getURL(n)).then(r => r.json()).catch(() => ({}));
        return reply({ data: self.__json[n] });
      }
      case 'imgData': { // ảnh minh họa dạng data: URL cho trang có CSP chặn ảnh ngoài (chỉ http/https, chỉ ảnh, ≤ 600 KB, đệm 30 ảnh gần nhất)
        const u = String(msg.url || '');
        if (!/^https:\/\//.test(u)) return reply({});
        self.__imgs = self.__imgs || new Map();
        if (self.__imgs.has(u)) return reply({ data: self.__imgs.get(u) });
        const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
        try {
          const r = await fetch(u, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
          const b = r.ok ? await r.blob() : null;
          if (!b || !/^image\//.test(b.type) || b.size > 600 * 1024) return reply({});
          const bytes = new Uint8Array(await b.arrayBuffer()); let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          const data = `data:${b.type};base64,${btoa(bin)}`;
          self.__imgs.set(u, data); if (self.__imgs.size > 30) self.__imgs.delete(self.__imgs.keys().next().value);
          return reply({ data });
        } catch (e) { return reply({}); } finally { clearTimeout(tm); }
      }
      case 'uiDict': return reply({ dict: await uiDict(msg.lang) });
      case 'wcLT': return reply(await wcLanguageTool(msg.text));
      case 'wcMistake': return reply(await wcMistake(msg));
      case 'ytTracks': { // danh sách phụ đề của video YouTube (đọc player response trong trang – chỉ URL phụ đề, không dữ liệu người dùng)
        try {
          const [res] = await chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, world: 'MAIN', func: () => { const pr = (document.querySelector('#movie_player') && document.querySelector('#movie_player').getPlayerResponse && document.querySelector('#movie_player').getPlayerResponse()) || window.ytInitialPlayerResponse; const tr = pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer && pr.captions.playerCaptionsTracklistRenderer.captionTracks; return (tr || []).map(t => ({ u: t.baseUrl, l: t.languageCode, k: t.kind || '' })); } });
          return reply({ tracks: (res && res.result) || [] });
        } catch (e) { return reply({ tracks: [] }); }
      }
      case 'translate': { // sl 'auto': đoạn chọn không phải tiếng Anh (content.js srcLang) → Google tự nhận ngôn ngữ nguồn, kể cả khi đích là tiếng Anh
        if (msg.sl === 'auto') return reply({ vi: await Dict.translateTo(String(msg.text || ''), msg.tl || 'vi', 'auto') });
        return reply({ vi: !msg.tl || msg.tl === 'vi' ? await Dict.translateVi(msg.text) : msg.tl === 'en' ? '' : await Dict.translateTo(msg.text, msg.tl) });
      }
      case 'notes': { // ghi chú học từ soạn sẵn (nằm trong gói add-on, theo chữ cái đầu)
        const w = String(msg.word || '').toLowerCase(), c = /^[a-z]/.test(w) ? w[0] : '_';
        self.__notes = self.__notes || {};
        if (!self.__notes[c]) self.__notes[c] = await fetch(chrome.runtime.getURL(`app/js/notes/${c}.json`)).then(r => r.ok ? r.json() : {}).catch(() => ({}));
        return reply({ note: (Object.hasOwn(self.__notes[c], w) && self.__notes[c][w]) || null });
      }
      case 'explain': return reply(await aiExplain(msg.text, msg.sentence, msg.lang || UI_LANG));
      case 'testNotify': await sendReminder(true); return reply({ ok: true });
      case 'logErr': logErr(msg.where || 'cs', msg.m); return reply({ ok: true });
      case 'openApp': await openApp(msg.hash); return reply({ ok: true });
      case 'syncNow': {
        // Trang Lexkite (đã đăng nhập) tự gộp dữ liệu qua cầu nối rồi gửi 'linked' → chờ tín hiệu đó, tối đa 25 giây
        const before = ((await chrome.storage.local.get('linked')).linked || {}).at || 0;
        const tab = await chrome.tabs.create({ url: 'https://lexkite.com/app/#/home', active: false });
        let ok = false;
        for (let i = 0; i < 25 && !ok; i++) { await new Promise(r => setTimeout(r, 1000)); ok = (((await chrome.storage.local.get('linked')).linked || {}).at || 0) > before; }
        chrome.tabs.remove(tab.id).catch(() => {});
        return reply({ ok });
      }
      default: reply({});
    }
  } catch (e) { reply({ error: String(e && e.message || e) }); } })();
  return true; // trả lời bất đồng bộ
});

// Bản cài "Load unpacked" (máy phát triển): tự nạp lại khi file trên đĩa đổi phiên bản – không cần vào chrome://extensions bấm Reload.
// Bản cài từ cửa hàng (installType "normal") bỏ qua hoàn toàn.
async function devAutoReload() {
  try {
    if (chrome.runtime.getManifest().update_url) return; // bản từ cửa hàng luôn có update_url
    const disk = await (await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' })).json();
    if (disk.version && disk.version !== chrome.runtime.getManifest().version) chrome.runtime.reload();
  } catch (e) { /* bỏ qua */ }
}
// Chỉ bản phát triển mới cần đánh thức service worker mỗi 30 giây; bản cửa hàng xóa alarm này (tiết kiệm pin)
if (isDevInstall()) chrome.alarms.create('dev-reload', { periodInMinutes: 0.5 }); else chrome.alarms.clear('dev-reload');
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'dev-reload') devAutoReload(); });
chrome.runtime.onStartup.addListener(devAutoReload);
