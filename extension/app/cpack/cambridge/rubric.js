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
  b1: {
    writing: [
      { id: 'content', name: 'Content', b5: 'Every point in the task is covered with some detail, so the reader is fully informed.', b3: 'Most points are covered; one is missing or too short to help the reader.', b1: 'Only a little of the task is answered, or the text is off topic.' },
      { id: 'communicative', name: 'Communicative achievement', b5: 'The text suits its type (email, article) and its reader; the tone is right and holds interest.', b3: 'Mostly the right type and tone, but some parts feel flat or too formal/informal.', b1: 'Not clearly an email/article; tone often wrong for the reader.' },
      { id: 'organisation', name: 'Organisation', b5: 'Clear paragraphs; ideas are linked with a range of linking words (because, however, although, so, while).', b3: 'Mostly in order; linking words are simple and repeated.', b1: 'Ideas are in a jumble or not joined together.' },
      { id: 'language', name: 'Language', b5: 'A good range of everyday words and structures (past, future, comparatives, conditionals) used with control.', b3: 'Simple structures mostly correct; some mistakes slow the reader down.', b1: 'Many mistakes; the meaning is often hard to follow.' },
    ],
    speaking: [
      { id: 'grammar-vocabulary', name: 'Grammar and vocabulary', b5: 'Uses a range of simple and some longer structures with control, and enough words to talk about everyday topics.', b3: 'Simple structures mostly correct; vocabulary limited, so the speaker sometimes stops to find words.', b1: 'Mostly short phrases; many mistakes.' },
      { id: 'discourse', name: 'Discourse management', b5: 'Speaks in connected sentences about 20–30 seconds in the long turn, with reasons and examples.', b3: 'Answers are relevant but short; joins ideas with and/but/because.', b1: 'One-word or one-sentence answers.' },
      { id: 'pronunciation', name: 'Pronunciation', b5: 'Easy to understand; word and sentence stress are mostly right.', b3: 'Understandable, but the listener sometimes has to work hard.', b1: 'Often hard to understand.' },
      { id: 'interaction', name: 'Interaction', b5: 'Asks the partner questions, responds to their ideas and helps decide together.', b3: 'Answers the partner but rarely starts or develops the talk.', b1: 'Needs a lot of help; little response to the partner.' },
    ],
    linkers: ['and', 'but', 'because', 'so', 'also', 'however', 'although', 'while', 'when', 'after', 'then', 'finally', 'first'],
  },
  b2: {
    writing: [
      { id: 'content', name: 'Content', b5: 'All content is relevant and the target reader is fully informed; the points of the task are developed, not just listed.', b3: 'Most content is relevant; one point is thin or missing, so the reader is only partly informed.', b1: 'Much of the text is irrelevant or the task is only partly answered.' },
      { id: 'communicative', name: 'Communicative achievement', b5: 'Register, tone and layout suit the text type (essay, article, email, report, review) and keep the reader interested; ideas are argued, not just stated.', b3: 'Mostly the right register, but the tone slips or the text type conventions are used unevenly.', b1: 'Register and text type are often wrong for the reader.' },
      { id: 'organisation', name: 'Organisation', b5: 'Clear paragraphs, with a range of linking devices and cohesive structures (however, as a result, in addition, whereas, that is why).', b3: 'Logical order, but linking is simple or repeated and paragraphs are uneven.', b1: 'Ideas are hard to follow; very few links.' },
      { id: 'language', name: 'Language', b5: 'A good range of vocabulary (collocations, some less common words) and grammar (conditionals, passives, relative clauses, modals) used with control; only small slips.', b3: 'Adequate range; mistakes sometimes slow the reader but meaning is clear.', b1: 'Limited range; frequent mistakes make parts hard to follow.' },
    ],
    speaking: [
      { id: 'grammar-vocabulary', name: 'Grammar and vocabulary', b5: 'Uses a range of structures and topic vocabulary with good control; self-corrects; only occasional slips.', b3: 'Mostly accurate with simple structures; some searching for words.', b1: 'Limited range; mistakes get in the way of meaning.' },
      { id: 'discourse', name: 'Discourse management', b5: 'Long turn is organised and about a minute; develops points with reasons and examples; uses linking words.', b3: 'Relevant, but short or loosely organised; repeats ideas.', b1: 'Very short answers; ideas not connected.' },
      { id: 'pronunciation', name: 'Pronunciation', b5: 'Clear individual sounds, stress and intonation that help the listener; easy to follow.', b3: 'Generally clear; some sounds or stress patterns need effort from the listener.', b1: 'Often hard to understand.' },
      { id: 'interaction', name: 'Interaction', b5: 'Starts and responds to the partner, invites ideas, develops the discussion and moves towards a decision.', b3: 'Responds to the partner, but rarely develops the discussion or asks for ideas.', b1: 'Little response to the partner; needs a lot of prompting.' },
    ],
    linkers: ['however', 'although', 'whereas', 'as a result', 'therefore', 'in addition', 'moreover', 'despite', 'on the other hand', 'for example', 'while', 'because', 'so', 'but', 'and'],
  },
};
