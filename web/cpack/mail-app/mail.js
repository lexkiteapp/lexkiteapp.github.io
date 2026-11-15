/* Email nhắc học / tổng kết tuần (opt-in, functions/api/mail.js): cùng giờ hay học + giờ yên lặng với push; chỉ khi đã đăng nhập, không bao giờ gửi email lên máy chủ từ đây.
 * Tách khỏi remind.js (ngân sách byte người học); nạp qua App.need('mail') khi có bật email hoặc người dùng bật công tắc (remind.js mailSync). */
(function (g) {
  'use strict';
  g.MailSync = async ({ state, ls, BASE, OFF, EXT, where, todayKey }, force) => {
    try {
      const U = g.Sync && g.Sync.user, s = state.settings; if (!U || EXT || OFF) return false;
      const rem = s.emailRemind === true, wk = s.emailDigest === true; if (!rem && !wk && !force) return false;
      const d = todayKey(); if (!force && ls.get('lk.mailAct', '') === d) return true; // mở app: báo "đã mở hôm nay" tối đa 1 lần/ngày
      const b = { op: 'sub', rem: rem ? 1 : 0, wk: wk ? 1 : 0, ...where(), opened: true };
      if (wk) { await g.App.need('retcards'); const Rc = g.RetCards.recap(state.game.days, Date.now()); if (Rc && Rc.cur.xp) b.recap = { w: Rc.week, nw: Rc.cur.newWords, mins: Rc.cur.mins, ad: Rc.cur.active }; }
      const r = await fetch(BASE + '/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await U.getIdToken() }, body: JSON.stringify(b) });
      if (r.ok) ls.set('lk.mailAct', d);
      return r.ok;
    } catch (e) { return false; }
  };
})(window);
