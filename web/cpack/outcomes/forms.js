/* 📈 Đề đo song song (docs/specs/outcomes-3-6m.md §5) – tự soạn, tiếng Anh gốc (nội dung học, không dịch).
 * Cấp a = A1–A2, b = B1–B2, c = C1+. Đề cùng cấp tương đương độ khó (độ dài đoạn đọc, kiểu đề nói/viết) để so được giữa các lần đo.
 * Thêm đề: lô S-OUT-CHECK (docs/content-lots.md) → content/outcomes/checks/<cấp>.json. Khóa: id, read (40–60 từ), speak, write, lo (lkf.json). */
(function (g) {
  g.OUTCOME_FORMS = {
    a1: {
      read: 'My name is Sam and I live in a small flat near the station. Every morning I make tea, read the news on my phone and walk to work. On Saturdays I play football with my friends in the park, and on Sundays I visit my parents.',
      speak: 'Tell me about yourself: where you live, what you do every day and what you like doing at the weekend.',
      write: 'Write a message to a new friend. Introduce yourself, describe your home town and say what you like doing in your free time.',
      lo: ['S.A2.01', 'W.A2.02'],
    },
    a2: {
      read: 'Last summer I went to the coast with my sister. We stayed in a cheap hotel next to the beach. The weather was hot, so we swam every day and ate fresh fish in a little restaurant. On the last night it rained, but we still had a great time.',
      speak: 'Talk about a trip or a holiday you enjoyed. Where did you go, who did you go with and what did you do there?',
      write: 'Write an email to a friend about a place you visited recently. Say where you went, what you did and whether you would go again.',
      lo: ['S.A2.02', 'W.A2.01'],
    },
    b1: {
      read: 'Working from home has changed the way many people spend their day. Some enjoy the extra time they save by not commuting, while others miss chatting with colleagues. Experts suggest keeping a fixed routine, taking short breaks and switching off notifications after work.',
      speak: 'Some people prefer working from home and others prefer the office. Which do you prefer and why? Give examples from your own life.',
      write: 'Write an email to your manager asking to change the time of a meeting next week. Explain why, suggest two new times and thank them.',
      lo: ['S.B1.04', 'W.B1.09'],
    },
    b2: {
      read: 'Cities around the world are trying to reduce traffic by making public transport cheaper and more reliable. However, critics argue that people will only leave their cars at home if buses and trains are faster as well. The most successful schemes usually combine lower fares with dedicated lanes.',
      speak: 'Describe a problem in your town or city and explain what you think should be done about it. Talk about advantages and disadvantages of your idea.',
      write: 'Write a short paragraph giving your opinion: should cities charge drivers to enter the centre? Give reasons and an example.',
      lo: ['S.B1p.02', 'W.B1.06'],
    },
    c1: {
      read: 'Although remote collaboration tools have become remarkably sophisticated, they rarely replicate the spontaneous exchanges that spark innovation. Organisations that thrive in hybrid settings tend to schedule deliberate time for unstructured conversation, recognising that creativity often emerges from conversations nobody planned.',
      speak: 'To what extent has technology made people more productive at work? Discuss both sides and give your own view with examples.',
      write: 'Write a paragraph for a report recommending how a company could improve communication between remote and office-based staff. Justify your recommendations.',
      lo: ['S.B2.02', 'W.B2p.05'],
    },
    c2: {
      read: 'Few policies attract as much scrutiny as those concerning urban housing. Proponents of rent control maintain that it protects vulnerable tenants from sudden displacement, whereas many economists contend that it discourages construction and, paradoxically, exacerbates the very shortages it was designed to address.',
      speak: 'Some people argue that governments should control rents in big cities. Evaluate this idea, considering its likely effects on different groups.',
      write: 'Write a paragraph evaluating the claim that cities should prioritise affordable housing over commercial development. Consider counter-arguments.',
      lo: ['S.C1.01', 'W.C1.10'],
    },
  };
})(typeof self !== 'undefined' ? self : globalThis);
