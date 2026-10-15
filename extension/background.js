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
async function uiDict(lang) {
  if (!lang || lang === 'vi' || lang === 'en') return {};
  if (uiDicts[lang]) return uiDicts[lang];
  try { const s = await (await fetch(chrome.runtime.getURL(`app/js/i18n/${lang}.js`))).text(); const i = s.indexOf('{"', s.indexOf('Object.assign(')), j = s.lastIndexOf('});'); uiDicts[lang] = JSON.parse(s.slice(i, j + 1)); } catch (e) { uiDicts[lang] = {}; }
  return uiDicts[lang];
}
let XD = {};
const setLang = l => { if (!l) return; UI_LANG = l; uiDict(l).then(d => { XD = d; }); };
chrome.storage.local.get('uiLang').then(r => setLang(pickLang(r.uiLang) || UI_LANG)).catch(() => {});
chrome.storage.onChanged.addListener(ch => { if (ch.uiLang) setLang(pickLang(ch.uiLang.newValue)); });
const EN = {
  'Lexkite – đến giờ học rồi! 📚': 'Lexkite – time to study! 📚',
  'Bạn có {n} thẻ cần ôn hôm nay.': 'You have {n} cards to review today.',
  ' Giữ chuỗi {n} ngày 🔥': ' Keep your {n}-day streak 🔥',
  'Thêm vài từ mới để giữ chuỗi ngày học nhé 🔥': 'Add a few new words to keep your streak going 🔥',
  'Ôn ngay': 'Review now',
  '⏰ Thời điểm vàng!': '⏰ Golden moment!',
  '{n} từ đang ở thời điểm sắp quên – ôn 3 phút để nhớ lâu hơn.': '{n} words are about to be forgotten – review for 3 minutes to remember them longer.',
  'Tra từ “%s” với Lexkite': 'Look up “%s” with Lexkite',
  'Dịch đoạn đã chọn sang tiếng Việt': 'Translate selection to Vietnamese',
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
  await Promise.all(tabs.map(t => chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['app/js/structures.js', 'content.js'] }).catch(() => {})));
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.contextMenus.removeAll(); // chờ xóa xong rồi mới tạo – tránh lỗi "duplicate id" sau mỗi lần cập nhật
  chrome.contextMenus.create({ id: 'lexi-lookup', title: tx('Tra từ “%s” với Lexkite'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'lexi-translate', title: tx('Dịch đoạn đã chọn sang tiếng Việt'), contexts: ['selection'] });
  injectIntoOpenTabs();
  chrome.alarms.create('badge', { periodInMinutes: 15 });
  await scheduleReminder();
  updateBadge();
  if (reason === 'install') openApp('#/home');
});
chrome.runtime.onStartup.addListener(() => { scheduleReminder(); updateBadge(); });

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
    chrome.tabs.sendMessage(tab.id, { type: 'translateSelection' }).catch(() => {});
    return;
  }
  if (info.menuItemId === 'lexi-lookup' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'showLookup', word: info.selectionText }).catch(() => openApp('#/dict/' + encodeURIComponent(info.selectionText)));
  }
});

// ---------- Giải thích sâu bằng AI (Gemini, khóa của chính người dùng – lưu trong chrome.storage.local 'aiKey') ----------
async function aiModels(key) {
  const { aiModels: c } = await chrome.storage.local.get('aiModels');
  if (c && c.k === key.slice(-6) && Date.now() - c.at < 3 * 864e5 && c.list && c.list.length) return c.list;
  const base = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
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
const EX_PROMPT = (text, sentence, lang) => `Explain the English expression for a Vietnamese IELTS/TOEIC learner. Expression: "${text}"${sentence && sentence !== text ? `\nSentence it appears in: "${sentence}"` : ''}
Return ONLY JSON: {"meaning": string (${lang} meaning in THIS context), "structure": [{"pattern": string, "explain": string (${lang})}] (1-3 items), "grammar": string (${lang}), "collocations": [string] (3-5 natural English collocations), "examples": [{"en": string, "vi": string}] (2 examples), "tip": string (${lang}: how to use it in exams)}`;
async function aiExplain(text, sentence) {
  const { aiKey, settings } = await chrome.storage.local.get(['aiKey', 'settings']);
  // Không có khóa → AI có sẵn trong Chrome (Gemini Nano, trên máy, miễn phí)
  const LM = self.LanguageModel;
  const nano = async () => {
    const opts = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
    const av = await LM.availability(opts); if (av !== 'available') return null; // chưa tải sẵn → không tự tải ngầm ~2GB (tránh treo)
    const s = await LM.create(opts);
    try {
      const out = await s.prompt(EX_PROMPT(text, sentence, 'English') + '\nReturn only JSON.');
      const j = JSON.parse(String(out).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      const slots = [['meaning'], ['grammar'], ['tip']].filter(([k]) => j[k]).map(([k]) => [j, k, j[k]]);
      (j.structure || []).forEach(x => x.explain && slots.push([x, 'explain', x.explain]));
      (j.examples || []).forEach(x => x.en && slots.push([x, 'vi', x.en]));
      const vi = (await Dict.translateVi(slots.map(x => String(x[2]).replace(/\n/g, ' ')).join('\n'))).split('\n');
      slots.forEach(([o, k], i) => { if (vi[i]) o[k] = vi[i].trim(); });
      return { result: j };
    } finally { try { s.destroy(); } catch (e) { /* bỏ qua */ } }
  };
  if (!aiKey) { if (LM) { try { const r = await nano(); if (r) return r; } catch (e) { /* không hỗ trợ */ } } return { error: 'NO_KEY' }; }
  const found = await aiModels(aiKey);
  const models = settings && settings.aiModel ? [settings.aiModel, ...found.filter(m => m !== settings.aiModel)] : found;
  for (const m of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(aiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: EX_PROMPT(text, sentence, 'Vietnamese') }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }) });
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
        return reply({ ok: true, card });
      }
      case 'uiDict': return reply({ dict: await uiDict(msg.lang) });
      case 'ytTracks': { // danh sách phụ đề của video YouTube (đọc player response trong trang – chỉ URL phụ đề, không dữ liệu người dùng)
        try {
          const [res] = await chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, world: 'MAIN', func: () => { const pr = (document.querySelector('#movie_player') && document.querySelector('#movie_player').getPlayerResponse && document.querySelector('#movie_player').getPlayerResponse()) || window.ytInitialPlayerResponse; const tr = pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer && pr.captions.playerCaptionsTracklistRenderer.captionTracks; return (tr || []).map(t => ({ u: t.baseUrl, l: t.languageCode, k: t.kind || '' })); } });
          return reply({ tracks: (res && res.result) || [] });
        } catch (e) { return reply({ tracks: [] }); }
      }
      case 'translate': return reply({ vi: !msg.tl || msg.tl === 'vi' ? await Dict.translateVi(msg.text) : msg.tl === 'en' ? '' : await Dict.translateTo(msg.text, msg.tl) });
      case 'notes': { // ghi chú học từ soạn sẵn (nằm trong gói add-on, theo chữ cái đầu)
        const w = String(msg.word || '').toLowerCase(), c = /^[a-z]/.test(w) ? w[0] : '_';
        self.__notes = self.__notes || {};
        if (!self.__notes[c]) self.__notes[c] = await fetch(chrome.runtime.getURL(`app/js/notes/${c}.json`)).then(r => r.ok ? r.json() : {}).catch(() => ({}));
        return reply({ note: (Object.hasOwn(self.__notes[c], w) && self.__notes[c][w]) || null });
      }
      case 'explain': return reply(await aiExplain(msg.text, msg.sentence));
      case 'testNotify': await sendReminder(true); return reply({ ok: true });
      case 'logErr': logErr(msg.where || 'cs', msg.m); return reply({ ok: true });
      case 'openApp': await openApp(msg.hash); return reply({ ok: true });
      case 'syncNow': {
        // Trang Lexkite (đã đăng nhập) tự gộp dữ liệu qua cầu nối rồi gửi 'linked' → chờ tín hiệu đó, tối đa 25 giây
        const before = ((await chrome.storage.local.get('linked')).linked || {}).at || 0;
        const tab = await chrome.tabs.create({ url: 'https://lexkite.com/#/home', active: false });
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
chrome.alarms.create('dev-reload', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'dev-reload') devAutoReload(); });
chrome.runtime.onStartup.addListener(devAutoReload);
