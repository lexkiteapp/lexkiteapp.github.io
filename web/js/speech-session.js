/* Phiên nói dài dùng chung (Speaking, Giao tiếp tự tin, thi thử): ghi âm + chuyển chữ trong 1 chỗ.
 * LX-1003: nền tảng cấp mic cho 1 bên (UI.micParallel) → chỉ nhận dạng; lỗi không tự hết → báo thay vì nút mic im lặng. Test: scripts/test/mic-exclusive.mjs */
(function (g) {
  const SR_FATAL = { 'not-allowed': 1, 'service-not-allowed': 1, 'audio-capture': 1, 'language-not-supported': 1, network: 1 };
  /** Mic bị từ chối/không có gì để thu → onError(mã) rồi null. Trả { stream, stop():Promise<{text,audio}>, cancel() }. */
  async function speechSession({ lang, slot = 'rec', onText, onError } = {}) {
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition, fail = c => { if (onError) onError(c); };
    let stream = null, media = null, sr = null, on = true, text = '', interim = ''; const chunks = [];
    if (UI.micParallel(SR) && navigator.mediaDevices) {
      try { stream = await navigator.mediaDevices.getUserMedia(UI.MIC); } catch (e) { fail('not-allowed'); return null; }
      try { media = new MediaRecorder(stream); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { media = null; }
    }
    if (!stream && !SR) { fail('unsupported'); return null; }
    if (SR) {
      sr = new SR(); sr.lang = lang; sr.continuous = true; sr.interimResults = true;
      sr.onresult = e => { interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) text += r[0].transcript + ' '; else interim += r[0].transcript; } if (onText) onText(text + interim); };
      sr.onerror = e => { if (on && SR_FATAL[e.error]) { sr = null; fail(e.error); } }; // lỗi không tự hết: dừng khởi động lại, báo người học thay vì im lặng
      sr.onend = () => { if (on && sr) try { sr.start(); } catch (e) { /* đang chạy */ } }; // Chrome tự dừng khi im lặng lâu
      try { sr.start(); } catch (e) { /* đã chạy */ }
    }
    const release = () => { if (stream) stream.getTracks().forEach(x => x.stop()); };
    const stop = () => new Promise(res => {
      on = false; try { if (sr) sr.stop(); } catch (e) { /* đã dừng */ }
      const done = () => { release(); res({ text: (text + ' ' + interim).trim(), audio: chunks.length ? UI.recUrl(new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' }), slot) : '' }); };
      if (media && media.state !== 'inactive') { media.onstop = () => setTimeout(done, 250); media.stop(); } else setTimeout(done, 250);
    });
    const cancel = () => { on = false; try { if (sr) sr.abort(); } catch (e) { /* đã dừng */ } try { if (media && media.state !== 'inactive') media.stop(); } catch (e) { /* đã dừng */ } release(); };
    return { stream, stop, cancel };
  }
  g.UI.speechSession = speechSession;
})(self);
