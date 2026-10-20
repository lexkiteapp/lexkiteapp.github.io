/* 🌐 Tài nguyên miễn phí chính thống (#/resources) – tải lười (tách khỏi plan.js để khung app nhẹ hơn). */
(function () {
  const { esc } = UI;
  const { routes } = App;
  const view = App.view;
  // ================= TÀI NGUYÊN MIỄN PHÍ CHÍNH THỐNG =================
  const RES = () => [
    ['📝', t('Đề mẫu chính thức IELTS'), 'ielts.org – Sample test questions', 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions', t('Đề mẫu cả 4 kỹ năng từ đơn vị tổ chức thi – dùng để làm quen dạng bài thật.')],
    ['🖥️', t('Làm quen thi trên máy tính'), 'British Council – Computer-delivered IELTS', 'https://www.britishcouncil.vn/thi/ielts/chuan-bi', t('Bài làm quen giao diện thi trên máy (Familiarisation test) và tài liệu ôn miễn phí của Hội đồng Anh.')],
    ['🎓', 'IDP IELTS Prepare', 'ielts.idp.com/prepare', 'https://ielts.idp.com/prepare', t('Bài luyện, mẹo và video miễn phí từ IDP.')],
    ['📚', 'LearnEnglish (British Council)', 'learnenglish.britishcouncil.org', 'https://learnenglish.britishcouncil.org/', t('Bài đọc, nghe, ngữ pháp theo trình độ A1–C1 – có bài tập tương tác.')],
    ['📻', 'BBC Learning English', 'bbc.co.uk/learningenglish', 'https://www.bbc.co.uk/learningenglish/', t('“6 Minute English”, tin tức chậm – tuyệt vời để “tắm ngôn ngữ” mỗi ngày.')],
    ['🎬', 'TED & TED-Ed', 'ted.com', 'https://www.ted.com/talks', t('Bài nói chủ đề học thuật có phụ đề – bật add-on Lexkite trên YouTube để tra từ trong phụ đề.')],
    ['🗽', 'VOA Learning English', 'learningenglish.voanews.com', 'https://learningenglish.voanews.com/', t('Tin tức đọc chậm, rõ (giọng Mỹ) kèm bản chữ.')],
    ['🔊', 'YouGlish', 'youglish.com', 'https://youglish.com/', t('Nghe một từ được người bản xứ phát âm trong hàng nghìn video thật.')],
    ['✍️', 'Write & Improve', 'Cambridge English', 'https://writeandimprove.com/', t('Nộp đoạn viết để nhận phản hồi tự động miễn phí (cấp độ CEFR).')],
    ['📖', 'Oxford Learner’s Dictionaries', 'oxfordlearnersdictionaries.com', 'https://www.oxfordlearnersdictionaries.com/', t('Từ điển cho người học – tra thêm ví dụ, collocation; add-on Lexkite hoạt động ngay trên trang này.')],
  ];
  routes.resources = function () {
    view.innerHTML = `
      <div class="page-head"><div><h1>🌐 ${t('Tài nguyên miễn phí chính thống')}</h1><p class="muted">${t('Đã chọn lọc từ các nguồn uy tín, hợp pháp. Mẹo: mở trang và dùng add-on Lexkite để <b>bấm đúp tra từ, bôi đen dịch câu</b> – mọi từ mới tự vào thư viện “Từ trang web”.')}</p></div></div>
      <div class="grid auto">${RES().map(([em, ti, sub, url, d]) => `<a class="card hover topic-card" href="${url}" target="_blank" rel="noopener" style="color:var(--text)">
        <span class="em">${em}</span><h3>${esc(ti)}</h3><div class="tiny muted" style="font-weight:700">${esc(sub)} ↗</div><div class="muted small">${esc(d)}</div></a>`).join('')}</div>
      <div class="card" style="margin-top:1rem"><h3>📅 ${t('Thói quen “tắm ngôn ngữ” 20 phút/ngày')}</h3>
        <ol style="padding-left:1.2rem;line-height:1.9"><li>${t('Nghe 1 bài BBC 6 Minute English hoặc 1 video TED có phụ đề – tra từ trong phụ đề bằng add-on.')}</li>
        <li>${t('Đọc 1 bài trong Lexkite hoặc LearnEnglish – lưu 3–5 từ kèm câu gốc.')}</li><li>${t('Ôn flashcard đúng thời điểm vàng.')}</li><li>${t('Nói lại nội dung vừa nghe/đọc trong 1 phút ở Phòng Speaking.')}</li></ol></div>`;
  };
})();
