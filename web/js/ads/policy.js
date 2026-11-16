/* Luật đặt quảng cáo Lexkite – THUẦN (không DOM, không mạng), dùng chung app + trang tĩnh + test (scripts/test/ads-policy.mjs). Thiết kế: docs/ADS.md.
 * Mặc định CHẶN: chỉ những vị trí trong danh sách cho phép mới được hiện. Không bao giờ: trong bài học/quiz/thi/nói/roleplay,
 * lớp học (giáo viên/học sinh), người dùng < 13 tuổi, add-on Chrome, trang quản trị, ?sandbox/?demo, trình duyệt tự động, nhóm đối chứng. */
(function (g) {
  const SLOTS = { home: 'home', blog: 'blog', blog_mid: 'blog_mid', dict: 'dict', done: 'done' }; // ô hiển thị: trang Hôm nay của app + cuối bài blog + giữa bài blog dài + trang từ điển tĩnh + thẻ KẾT QUẢ cuối lượt (web, điểm nghỉ)
  const PER_PAGE = { blog: 2, dict: 1 };                               // trần ô / trang nội dung tĩnh (blog: cuối bài + 1 ô giữa bài ≥ 1200 từ; từ điển: 1 ô dưới phần nghĩa/ví dụ)
  // Trang tĩnh (khách từ Google): nhận theo ĐƯỜNG DẪN (run.js không đổi route cho blog_mid/dict) – không bao giờ là khung app /app/ (tra từ trong app = đang học)
  const BLOG_PATH = /^\/(?:[a-z]{2}\/)?blog\/[^/]+\/$/;                // /<lang>/blog/<slug>/ hoặc /blog/<slug>/ (bài viết, không phải trang danh sách)
  const DICT_PATH = /^\/[a-z]{2}\/(?:tu-dien|dictionary|diccionario|dicionario|dictionnaire|woerterbuch|kamus|sozluk|slovar|jisho|sajeon|cidian|photchananukrom|shabdkosh|qamus)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/; // trang 1 từ (workers/dict/render.mjs DICT_PATH), không phải hub/A–Z
  const BREAK = ['home', 'vocab', 'skills', 'tests', 'me'];             // điểm nghỉ tự nhiên (tab chính) – quảng cáo cuối phiên chỉ hiện khi VỀ tới đây
  const REWARDS = { streak: 1, ai: 3, chat: 10, retry: 1, xp2: 1, cosmetic: 1 };   // có thưởng (tự chọn): cứu chuỗi · +3 lượt AI · +10 lượt Roleplay (khớp functions/api/ads-reward.js) · cơ hội 2 (làm lại câu sai) · nhân đôi XP · +1 món trang trí (retention.js, không bao giờ chặn học)
  const PER_DAY = { streak: 1, ai: 3, chat: 3, retry: 3, xp2: 2, cosmetic: 1 };    // trần lượt xem có thưởng / lý do / máy / ngày – thưởng có giá trị vì hiếm, không thành "cày quảng cáo"
  const CALM_MIN = 30;                                                 // vừa xem 1 video có thưởng → 30 phút không quảng cáo toàn màn hình (thưởng cho người hợp tác)
  const FAIL_PCT = 50;                                                 // vừa làm bài < 50 % → không toàn màn hình, không ô kết quả (không "xát muối" lúc nản)
  const REW_GAP_MIN = 3;                                               // chờ ≥ 3 phút giữa 2 video có thưởng (mọi lý do) – không "cày" video liên tục
  const CAP = { everySessions: 3, gapMin: 10, firstDayH: 24, newbie: 5, dayMax: 4, holdout: 0.1 }; // newbie = miễn toàn màn hình trong 5 phiên học ĐẦU TIÊN · dayMax = tối đa 4 lần toàn màn hình / ngày
  // Quản trị chỉnh được tần suất, nhưng chỉ trong khoảng an toàn (không bao giờ dày hơn mặc định)
  const BOUNDS = { everySessions: [3, 20], gapMin: [10, 240], firstDayH: [24, 336], newbie: [5, 50], dayMax: [1, 4] };

  // ---------- VÙNG CẤM QUẢNG CÁO (docs/ADS.md §1c) – một nguồn, test: scripts/test/ads.mjs §1c ----------
  // HARD: không bao giờ có BẤT KỲ quảng cáo nào (kể cả video có thưởng tự chọn).
  // SOFT: đang học – không ô/toàn màn hình; video có thưởng CHỈ ở điểm nghỉ trong vùng (thẻ kết quả đã vẽ / hộp thoại hết lượt: ctx.brk) và khi không có trạng thái LIVE.
  // LIVE: trạng thái lúc chạy (bất kỳ route nào) – không bao giờ có quảng cáo khi đang ghi âm, đang gọi, đang trả lời câu hỏi, có hộp thoại khác đang mở (chỉ chặn toàn màn hình).
  const ZONES = [
    ['exam', 1, /^(mock|placement|toeic-test|toeic-r|toeic-sw|toefl|toefl-p|listen-test|cbt|ielts-test|exam-.+|test-.+)$/], // bài test / thi thử (tab danh sách #/tests vẫn là điểm nghỉ)
    ['onboarding', 1, /^(welcome|onb|onboard|setup|start|signup)$/],
    ['pay', 1, /^(pay|checkout|billing|upgrade|pro|plans?|subscribe|donate)$/],
    ['admin', 1, /^admin/],
    ['classroom', 1, /^(class|classes|teacher|school|schools|ta)(-.*)?$/],
    ['call', 0, /^(call|calls|roleplay|handsfree)$/],
    ['speak', 0, /^(speak|speaking|say|pron|confidence|reflex|dictation|shadow)$/],
    ['lesson', 0, /^(lesson|learn|practice|review|study|quiz|path|day|quick|train|listen|listening|read|reading|write|task1|letters|grammar|verb|phrases|paraphrase|cards|deck|course|topic|rtype|fix|model|models|ideas|dict)$/],
  ];
  const LIVE = ['mic', 'call', 'answering'];
  /** Vùng cấm của ngữ cảnh → { k: lý do, hard } hoặc null. */
  function zone(ctx) {
    const c = ctx || {}, r = String(c.route || '');
    if (c.pro) return { k: 'pro', hard: 1 };                            // người dùng Pro: không bao giờ thấy quảng cáo
    for (const x of LIVE) if (c[x]) return { k: x, hard: 1 };
    if (c.onboard) return { k: 'onboarding', hard: 1 };
    if (c.pay) return { k: 'pay', hard: 1 };
    for (const [k, hard, re] of ZONES) if (re.test(r)) return { k, hard };
    return null;
  }
  const clamp = (v, [lo, hi], d) => { const x = Math.round(+v); return v === undefined || v === '' || !isFinite(x) ? d : Math.min(hi, Math.max(lo, x)); };
  const NATIVE = ['android', 'ios'];
  const WEB_REW = ['streak', 'retry', 'xp2'];                          // web (GPT) không có SSV → chỉ thưởng tính trên máy; +lượt AI/Roleplay chỉ app (SSV)
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const cohort = vid => (vid && hash('ads|' + vid) < CAP.holdout ? 'h' : 'a'); // 10 % máy giữ làm nhóm đối chứng (không quảng cáo) – đo giữ chân

  /** Cờ hiệu lực: cấu hình từ xa (/api/config, Quản trị › Cài đặt › Quảng cáo) AND cờ trong mã (ADS_CONFIG.enabled). Tất cả mặc định TẮT. */
  function flags(remote, local) {
    const r = remote || {}, l = local || {}, on = k => String(r[k] || '') === '1';
    const kill = on('ads_kill') || !l.enabled;
    const guard = Math.max(0, Math.min(1, r.ads_guard === undefined || r.ads_guard === '' ? 1 : +r.ads_guard || 0));
    const caps = { everySessions: clamp(r.ads_cap_sessions, BOUNDS.everySessions, CAP.everySessions), gapMin: clamp(r.ads_cap_gap, BOUNDS.gapMin, CAP.gapMin), firstDayH: clamp(r.ads_cap_firstday, BOUNDS.firstDayH, CAP.firstDayH), newbie: clamp(r.ads_cap_newbie, BOUNDS.newbie, CAP.newbie), dayMax: clamp(r.ads_cap_daymax, BOUNDS.dayMax, CAP.dayMax) };
    return { web: !kill && on('ads_web'), android: !kill && on('ads_android'), ios: !kill && on('ads_ios'), inter: !kill && String(r.ads_inter ?? '1') !== '0', rew: !kill && String(r.ads_rew ?? '1') !== '0', guard, caps };
  }

  /** Ngữ cảnh cấm → lý do (chuỗi) hoặc '' nếu được phép. ctx: { plat, route, path, edu, u13, sandbox, bot, vid, pro, mic, call, answering, onboard, pay, brk, done }; fmt = 'rew' (video có thưởng) | tên ô | undefined */
  function blocked(ctx, fmt) {
    const c = ctx || {};
    if (c.plat === 'ext' || /^chrome-extension:|^moz-extension:/.test(c.proto || '')) return 'ext';
    if (/^\/admin/.test(c.path || '') || c.route === 'admin') return 'admin';
    if (c.edu || /^class/.test(c.route || '')) return 'classroom';
    if (c.u13) return 'u13';
    if (c.sandbox) return 'sandbox';
    if (c.bot) return 'bot';
    if (cohort(c.vid) === 'h') return 'holdout';
    const z = zone(c);
    if (z && (z.hard || !((fmt === 'rew' || fmt === 'done') && (c.brk || (fmt === 'done' && c.done))))) return z.k; // vùng SOFT: chỉ video có thưởng / ô kết quả ở điểm nghỉ
    return '';
  }
  const platOn = (f, plat) => !!(f && (plat === 'web' || plat === 'pwa' ? f.web : f[plat]));

  /** Ô hiển thị (banner/native) ở vị trí `place`. */
  function slot(ctx, f, place) {
    if (!SLOTS[place] || blocked(ctx, place) || !platOn(f, ctx.plat)) return false;
    // Ô kết quả: chỉ web, chỉ khi thẻ kết quả đã vẽ xong (ctx.done), không trong 24 giờ đầu, không khi vừa làm kém
    if (place === 'done') return ctx.plat !== 'android' && ctx.plat !== 'ios' && !!ctx.done && (ctx.ageH || 0) >= CAP.firstDayH && (ctx.pct ?? 100) >= FAIL_PCT;
    if (place === 'blog_mid' || place === 'dict') return ctx.plat !== 'android' && ctx.plat !== 'ios' && !/^\/app\//.test(ctx.path || '') && (place === 'dict' ? DICT_PATH : BLOG_PATH).test(ctx.path || '');
    return place === 'blog' ? ctx.route === 'blog' : ctx.route === 'home';
  }

  /** Quảng cáo toàn màn hình cuối phiên (chỉ app gốc). st: { firstAt, lastAt, sessions (số phiên học đã xong từ lần hiện trước), total (tổng phiên đã xong), pending, id: { d: ngày, n: số lần hôm nay } } */
  function interstitial(ctx, f, st, now) {
    const s = st || {};
    if (!NATIVE.includes(ctx.plat) || blocked(ctx) || !platOn(f, ctx.plat) || !f.inter) return false;
    if (!(f.guard > 0.25)) return false;                                  // giữ chân tụt mạnh → tắt hẳn toàn màn hình
    if (!s.pending || !BREAK.includes(ctx.route) || ctx.modal) return false; // chỉ khi vừa xong 1 phiên và đã về tab chính, không đè hộp thoại khác – không bao giờ giữa bài
    const k = { ...CAP, ...(f.caps || {}) };
    if (s.total !== undefined && s.total < k.newbie) return false;       // người mới: miễn trong N phiên học đầu tiên
    if (s.id && s.id.d === new Date(now).toDateString() && s.id.n >= k.dayMax) return false; // trần / ngày
    if (!s.firstAt || now - s.firstAt < k.firstDayH * 3600e3) return false; // không bao giờ trong ngày đầu
    if (new Date(now).toDateString() === new Date(s.firstAt).toDateString()) return false;
    if ((s.sessions || 0) < Math.ceil(k.everySessions / f.guard)) return false; // tối đa 1 lần / 3 phiên (giãn ra khi giữ chân xấu đi)
    if (s.lastAt && now - s.lastAt < (k.gapMin / f.guard) * 60e3) return false; // và 1 lần / 10 phút
    if (s.rewAt && now - s.rewAt < CALM_MIN * 60e3) return false;       // vừa xem video có thưởng → được yên 30 phút
    if (s.lastPct !== undefined && s.lastPct < FAIL_PCT) return false;  // phiên vừa rồi làm kém → để người học yên
    return true;
  }

  /** Quảng cáo có thưởng – chỉ khi người dùng bấm chọn (lý do trong REWARDS). App gốc; web chỉ khi có ô GPT (ctx.rwUnit) và lý do không cần SSV. */
  function rewarded(ctx, f, reason) {
    const web = (ctx.plat === 'web' || ctx.plat === 'pwa') && !!ctx.rwUnit && WEB_REW.includes(reason);
    return !!REWARDS[reason] && (NATIVE.includes(ctx.plat) || web) && !blocked(ctx, 'rew') && platOn(f, ctx.plat) && !!f.rew;
  }
  /** Đã qua thời gian chờ giữa 2 video có thưởng? st.rewAt = lúc xem xong video gần nhất */
  const rewReady = (st, now) => !(st && st.rewAt && now - st.rewAt < REW_GAP_MIN * 60e3);
  /** Còn lượt có thưởng hôm nay? st.rw = { d: 'YYYY-MM-DD', n: { lý do: số lần } } */
  const rewLeft = (st, reason, day) => { const r = (st && st.rw) || {}; return (PER_DAY[reason] || 0) - (r.d === day ? (r.n || {})[reason] || 0 : 0); };

  /** Quảng cáo không cá nhân hóa: Do Not Track / Global Privacy Control / chưa đồng ý (CMP trả về). */
  const npa = sig => !!(sig && (sig.dnt === '1' || sig.dnt === 'yes' || sig.gpc === true || sig.consent === false));

  g.AdsPolicy = { ZONES, LIVE, zone, REW_GAP_MIN, rewReady, SLOTS, WEB_REW, PER_PAGE, BLOG_PATH, DICT_PATH, BREAK, REWARDS, PER_DAY, CALM_MIN, FAIL_PCT, rewLeft, CAP, BOUNDS, cohort, flags, blocked, slot, interstitial, rewarded, npa };
})(typeof self !== 'undefined' ? self : this);
