/* 📈 Năng lực theo kỹ năng (Birdbrain-lite, phía máy, tải kèm gói 'lesson' + 'pathx'): độ chính xác trượt (EWMA) cho 4 nhóm câu –
 * recog (chọn đáp án) · produce (gõ/xếp/điền) · listen (nghe chép) · speak (nói). Ghi ở LessonEngine.answer; ĐỌC ở path-day.js để chọn
 * dạng bài của ngày kế (người gõ yếu → trắc nghiệm thay điền từ). Dữ liệu nhỏ (<300 B) trong localStorage 'vb.skillAcc', không gửi đi đâu.
 * Kill switch: localStorage 'vb.noSkillAcc' = '1'. Không gọi t() lúc nạp module. */
(function (g) {
  'use strict';
  if (g.SkillAcc) return;
  const KEY = 'vb.skillAcc', ALPHA = 0.15, MIN_N = 10, GROUPS = ['recog', 'produce', 'listen', 'speak'];
  const ls = (v) => { try { if (v === undefined) return g.localStorage.getItem(KEY); g.localStorage.setItem(KEY, v); } catch (e) { /* bỏ qua */ } return null; };
  const off = () => { try { return g.localStorage.getItem('vb.noSkillAcc') === '1'; } catch (e) { return false; } };
  const load = () => { try { const o = JSON.parse(ls() || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  /** loại câu của lesson engine → nhóm kỹ năng */
  function group(type) {
    if (type === 'dict' || /listen/.test(type)) return 'listen';
    if (type === 'say' || /^(say|speak|pron)/.test(type)) return 'speak';
    if (type === 'build' || type === 'tr' || type === 'type' || type === 'gap' || /^type-/.test(type)) return 'produce';
    return 'recog';
  }
  /** ghi 1 câu (lần đầu gặp; câu gặp lại do sai KHÔNG ghi để không phạt đôi) */
  function rec(type, ok, retry) {
    if (off() || retry) return;
    const k = group(String(type || '')), o = load(), c = o[k] || { p: ok ? 1 : 0, n: 0 };
    c.p = Math.round((c.n ? c.p + ALPHA * ((ok ? 1 : 0) - c.p) : (ok ? 1 : 0)) * 1000) / 1000; c.n = Math.min(999, c.n + 1); o[k] = c;
    ls(JSON.stringify(o));
  }
  /** → { p, n } hoặc null khi chưa đủ mẫu (n < 10) hay đã tắt */
  function get(k) { if (off()) return null; const c = load()[k]; return c && c.n >= MIN_N ? { p: c.p, n: c.n } : null; }
  /** gợi ý cho ngày kế: 'ease' (gõ yếu → dạng chọn) | 'ok' */
  function advice() { const p = get('produce'); return p && p.p < 0.5 ? 'ease' : 'ok'; }
  g.SkillAcc = { rec, get, advice, group, GROUPS };
})(typeof self !== 'undefined' ? self : this);
