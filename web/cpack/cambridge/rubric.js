/* Tiêu chí chấm Cambridge (viết + nói) theo cấp – LexKite TỰ DIỄN ĐẠT, không chép bảng mô tả chính thức.
 * Thang 0–5 mỗi tiêu chí (mô tả mốc 5 / 3 / 1; 4 và 2 = nằm giữa). Màn thi (web/js/cambridge.js) dùng để tự chấm + gợi ý AI;
 * cổng exam-format-check đòi đủ tiêu chí cho mỗi cấp có đề. Lô S-CAM-B1… thêm khối cấp mới theo đúng mẫu A2. */
self.CAMBRIDGE_RUBRIC = {
  a2: {
    writing: [
      { id: 'content', name: 'Content', b5: 'All the points in the task are answered clearly. A reader understands everything.', b3: 'Most points are answered. One point is missing or not clear.', b1: 'Only one point is answered, or the text is mostly about something else.' },
      { id: 'organisation', name: 'Organisation', b5: 'Ideas are in a sensible order and joined with simple linking words (and, but, because, so, then).', b3: 'Mostly in order; short sentences with few linking words.', b1: 'Single words or sentences that do not connect.' },
      { id: 'language', name: 'Language', b5: 'Everyday words and simple grammar used with control. Small mistakes do not stop understanding.', b3: 'Basic words and grammar; mistakes sometimes make the meaning hard to follow.', b1: 'Very few words; mistakes make most of it hard to understand.' },
    ],
    speaking: [
      { id: 'grammar-vocabulary', name: 'Grammar and vocabulary', b5: 'Uses simple grammar well and has enough words for everyday topics.', b3: 'Gets meaning across with short phrases; some mistakes.', b1: 'Mostly single words or memorised phrases.' },
      { id: 'pronunciation', name: 'Pronunciation', b5: 'Easy to understand; word stress is mostly correct.', b3: 'Usually understandable, though the listener sometimes has to work hard.', b1: 'Often difficult to understand.' },
      { id: 'interaction', name: 'Interaction', b5: 'Answers fully, asks the partner questions and keeps the conversation going.', b3: 'Answers questions but needs help to keep talking.', b1: 'Needs a lot of help; long silences.' },
    ],
    // tự kiểm khi viết (hiện ngay sau khi nộp): đếm từ + kiểm ý theo `checks` của từng đề + từ nối
    linkers: ['and', 'but', 'because', 'so', 'then', 'when', 'after', 'later', 'finally', 'first'],
  },
};
