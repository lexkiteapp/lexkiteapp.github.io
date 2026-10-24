/* Luật đặt quảng cáo Lexkite – THUẦN (không DOM, không mạng), dùng chung app + trang tĩnh + test (scripts/test/ads-policy.mjs). Thiết kế: docs/ADS.md.
 * Mặc định CHẶN: chỉ những vị trí trong danh sách cho phép mới được hiện. Không bao giờ: trong bài học/quiz/thi/nói/roleplay,
 * lớp học (giáo viên/học sinh), người dùng < 13 tuổi, add-on Chrome, trang quản trị, ?sandbox/?demo, trình duyệt tự động, nhóm đối chứng. */
(function (g) {
  const SLOTS = { home: 'home', blog: 'blog' };                       // ô hiển thị: trang Hôm nay của app + bài blog/trang SEO tĩnh
  const BREAK = ['home', 'vocab', 'skills', 'tests', 'me'];             // điểm nghỉ tự nhiên (tab chính) – quảng cáo cuối phiên chỉ hiện khi VỀ tới đây
  const REWARDS = { streak: 1, ai: 3, chat: 10 };                     // có thưởng (tự chọn): cứu chuỗi · +3 lượt AI chấm/giải thích · +10 lượt thoại Roleplay (khớp functions/api/ads-reward.js)
  const CAP = { everySessions: 3, gapMin: 10, firstDayH: 24, holdout: 0.1 };
  // Quản trị chỉnh được tần suất, nhưng chỉ trong khoảng an toàn (không bao giờ dày hơn mặc định)
  const BOUNDS = { everySessions: [3, 20], gapMin: [10, 240], firstDayH: [24, 336] };
  const clamp = (v, [lo, hi], d) => { const x = Math.round(+v); return v === undefined || v === '' || !isFinite(x) ? d : Math.min(hi, Math.max(lo, x)); };
  const NATIVE = ['android', 'ios'];
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const cohort = vid => (vid && hash('ads|' + vid) < CAP.holdout ? 'h' : 'a'); // 10 % máy giữ làm nhóm đối chứng (không quảng cáo) – đo giữ chân

  /** Cờ hiệu lực: cấu hình từ xa (/api/config, Quản trị › Cài đặt › Quảng cáo) AND cờ trong mã (ADS_CONFIG.enabled). Tất cả mặc định TẮT. */
  function flags(remote, local) {
    const r = remote || {}, l = local || {}, on = k => String(r[k] || '') === '1';
    const kill = on('ads_kill') || !l.enabled;
    const guard = Math.max(0, Math.min(1, r.ads_guard === undefined || r.ads_guard === '' ? 1 : +r.ads_guard || 0));
    const caps = { everySessions: clamp(r.ads_cap_sessions, BOUNDS.everySessions, CAP.everySessions), gapMin: clamp(r.ads_cap_gap, BOUNDS.gapMin, CAP.gapMin), firstDayH: clamp(r.ads_cap_firstday, BOUNDS.firstDayH, CAP.firstDayH) };
    return { web: !kill && on('ads_web'), android: !kill && on('ads_android'), ios: !kill && on('ads_ios'), inter: !kill && String(r.ads_inter ?? '1') !== '0', rew: !kill && String(r.ads_rew ?? '1') !== '0', guard, caps };
  }

  /** Ngữ cảnh cấm → lý do (chuỗi) hoặc '' nếu được phép. ctx: { plat, route, path, edu, u13, sandbox, bot, vid } */
  function blocked(ctx) {
    const c = ctx || {};
    if (c.plat === 'ext' || /^chrome-extension:|^moz-extension:/.test(c.proto || '')) return 'ext';
    if (/^\/admin/.test(c.path || '') || c.route === 'admin') return 'admin';
    if (c.edu || /^class/.test(c.route || '')) return 'classroom';
    if (c.u13) return 'u13';
    if (c.sandbox) return 'sandbox';
    if (c.bot) return 'bot';
    if (cohort(c.vid) === 'h') return 'holdout';
    return '';
  }
  const platOn = (f, plat) => !!(f && (plat === 'web' || plat === 'pwa' ? f.web : f[plat]));

  /** Ô hiển thị (banner/native) ở vị trí `place`. */
  function slot(ctx, f, place) {
    if (!SLOTS[place] || blocked(ctx) || !platOn(f, ctx.plat)) return false;
    return place === 'blog' ? ctx.route === 'blog' : ctx.route === 'home';
  }

  /** Quảng cáo toàn màn hình cuối phiên (chỉ app gốc). st: { firstAt, lastAt, sessions (số phiên học đã xong từ lần hiện trước), pending } */
  function interstitial(ctx, f, st, now) {
    const s = st || {};
    if (!NATIVE.includes(ctx.plat) || blocked(ctx) || !platOn(f, ctx.plat) || !f.inter) return false;
    if (!(f.guard > 0.25)) return false;                                  // giữ chân tụt mạnh → tắt hẳn toàn màn hình
    if (!s.pending || !BREAK.includes(ctx.route)) return false;          // chỉ khi vừa xong 1 phiên và đã về tab chính – không bao giờ giữa bài
    const k = f.caps || CAP;
    if (!s.firstAt || now - s.firstAt < k.firstDayH * 3600e3) return false; // không bao giờ trong ngày đầu
    if (new Date(now).toDateString() === new Date(s.firstAt).toDateString()) return false;
    if ((s.sessions || 0) < Math.ceil(k.everySessions / f.guard)) return false; // tối đa 1 lần / 3 phiên (giãn ra khi giữ chân xấu đi)
    if (s.lastAt && now - s.lastAt < (k.gapMin / f.guard) * 60e3) return false; // và 1 lần / 10 phút
    return true;
  }

  /** Quảng cáo có thưởng – chỉ khi người dùng bấm chọn (lý do trong REWARDS), chỉ app gốc. */
  function rewarded(ctx, f, reason) {
    return !!REWARDS[reason] && NATIVE.includes(ctx.plat) && !blocked(ctx) && platOn(f, ctx.plat) && !!f.rew;
  }

  /** Quảng cáo không cá nhân hóa: Do Not Track / Global Privacy Control / chưa đồng ý (CMP trả về). */
  const npa = sig => !!(sig && (sig.dnt === '1' || sig.dnt === 'yes' || sig.gpc === true || sig.consent === false));

  g.AdsPolicy = { SLOTS, BREAK, REWARDS, CAP, BOUNDS, cohort, flags, blocked, slot, interstitial, rewarded, npa };
})(typeof self !== 'undefined' ? self : this);
