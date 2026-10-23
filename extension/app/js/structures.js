/* Nhận diện cấu trúc ngữ pháp / cụm hay trong đoạn tiếng Anh được bôi đen → giải thích ngắn + bài học liên quan.
 * Dùng chung cho web app (bôi đen → Dịch) và tiện ích Chrome (bảng "Dịch đoạn đã chọn"). Thuần JS, không phụ thuộc gì. */
(function (g) {
  const W = "[a-z][a-z'’-]*";
  const V3 = `(?:${W}ed|been|done|made|taken|given|seen|known|found|built|spent|grown|shown|written|chosen|held|kept|left|lost|paid|sold|told|brought|bought|thought|caught|taught|sent|run|cut|put|set|led|met|fed|won|begun|drawn|driven|eaten|fallen|forgotten|frozen|hidden|ridden|risen|spoken|stolen|worn|understood)`;
  // [biểu thức, tên cấu trúc, giải thích (Việt), id bài ngữ pháp]
  const RULES = [
    [`\\bthe (amount|quantity) of\\b`, 'the amount of + N không đếm được', 'Dùng với danh từ KHÔNG đếm được (money, time, water…). Với danh từ đếm được dùng “the number of + N số nhiều”.', 'countable-uncountable'],
    [`\\bthe number of ${W}s?\\b`, 'the number of + N số nhiều (+ V số ít)', '“The number of students IS rising” – chủ ngữ là “the number” nên động từ chia số ít. Khác “a number of + N = nhiều…” đi với động từ số nhiều.', 'subject-verb-agreement'],
    [`\\ba (growing|large|small|significant|considerable|increasing) number of\\b`, 'a growing/large number of + N số nhiều', 'Nghĩa “ngày càng nhiều / một số lượng lớn…”, động từ theo sau chia số nhiều. Cụm rất hay dùng trong Writing.', 'quantity-advanced'],
    [`\\b(the )?(proportion|percentage|share) of\\b`, 'the proportion/percentage of', 'Cụm mô tả tỉ lệ trong Task 1; “proportion” trang trọng hơn “percentage”.', 'numbers-data-language'],
    [`\\b(?:the|a|an|of|this|these|those|its|their|our|all|some|any|many|much|most|money|time|food|goods|products|items)\\b (?:${W} )?${V3}\\b(?= (on|in|by|for|at|to|from|with|between|during)\\b)`, 'Rút gọn mệnh đề quan hệ (N + V3)', 'Ví dụ “the money spent on…” = “the money WHICH WAS spent on…”: bỏ đại từ quan hệ + be, giữ quá khứ phân từ mang nghĩa bị động.', 'participle-clauses'],
    [`\\b(?!(?:is|are|was|were|be|been|am|it|they|we|he|she|i|you|keep|kept|start|started|stop|stopped)\\b)(${W}s?) (${W}ing)\\b(?= (in|on|at|from|to|with|for)\\b)`, 'Rút gọn mệnh đề quan hệ (N + V-ing)', '“people living in cities” = “people WHO live in cities”: V-ing mang nghĩa chủ động.', 'participle-clauses'],
    [`\\b(is|are|was|were|be|been|being) ${V3}\\b`, 'Câu bị động (be + V3)', 'Nhấn mạnh hành động/đối tượng chịu tác động, thường gặp trong văn học thuật và mô tả quy trình (Task 1 process).', 'passive-voice'],
    [`\\b(has|have) (been )?${V3}\\b`, 'Hiện tại hoàn thành', 'Hành động bắt đầu trong quá khứ, kéo dài/ảnh hưởng tới hiện tại; hay đi với since, for, recently.', 'present-perfect'],
    [`\\bhad ${V3}\\b`, 'Quá khứ hoàn thành', 'Hành động xảy ra TRƯỚC một mốc/ hành động khác trong quá khứ (by 2010, before…).', 'past-perfect'],
    [`\\bwill have ${V3}\\b`, 'Tương lai hoàn thành', 'Hành động sẽ hoàn tất trước một mốc tương lai (by 2030…) – rất hay dùng khi mô tả dự báo trong Task 1.', 'future-continuous-perfect'],
    [`\\b(more|less|fewer) ${W} than\\b|\\b(?!(?:rather|other|whether)\\b)${W}er than\\b`, 'So sánh hơn', 'more/less + adj/N + than; adj ngắn thêm -er. Thêm “much/far/slightly” trước để chỉ mức chênh lệch.', 'comparatives-superlatives'],
    [`\\b(twice|three times|four times|half) as ${W} as\\b|\\b(twice|three times) (more|higher|the)\\b`, 'So sánh bội số', '“twice as high as” = cao gấp đôi; cấu trúc rất giá trị cho Task 1.', 'comparison-special'],
    [`\\bthe (most|least) ${W}\\b|\\bthe ${W}est\\b`, 'So sánh nhất', 'the + adj-est / the most + adj; thường kèm “of/in” + nhóm so sánh.', 'comparatives-superlatives'],
    [`\\bthe ${W}er\\b.*\\bthe ${W}er\\b|\\bthe more\\b.*\\bthe (more|less)\\b`, 'Càng… càng… (The + so sánh hơn, the + so sánh hơn)', 'Hai vế song song: “The more you read, the better you write.”', 'comparison-special'],
    [`\\b(it is|it's) (clear|evident|apparent|noticeable|obvious) that\\b`, 'It is clear/evident that …', 'Câu mở đầu đoạn tổng quan Task 1 hoặc nêu nhận định khách quan; “it” là chủ ngữ giả.', 'there-is-empty-it'],
    [`\\b(it is|it's) (${W}) (to|for) \\b`, 'It is + adj + (for sb) + to V', 'Chủ ngữ giả “it” thay cho cụm to-V dài phía sau: “It is essential for governments to invest…”.', 'there-is-empty-it'],
    [`\\bthere (is|are|was|were|has been|have been) \\b`, 'There is/are …', 'Giới thiệu sự tồn tại; động từ hòa hợp với danh từ phía sau.', 'there-is-empty-it'],
    [`(,\\s*|\\b[a-z]+s? )(which|who|whom|whose) (${W})\\b`, 'Mệnh đề quan hệ', 'Bổ nghĩa cho danh từ đứng trước. Có dấu phẩy = mệnh đề không xác định (không dùng “that”).', 'relative-clauses'],
    [`\\b(although|though|even though|whereas|while)\\b`, 'Mệnh đề nhượng bộ / đối lập', 'although/even though + mệnh đề (nhượng bộ); whereas/while (đối lập 2 vế). Khác “despite + N/V-ing”.', 'reason-contrast'],
    [`\\b(despite|in spite of)\\b`, 'Despite / In spite of + N / V-ing', 'Theo sau là danh từ hoặc V-ing, KHÔNG dùng mệnh đề (trừ “despite the fact that…”).', 'reason-contrast'],
    [`\\b(because of|due to|owing to|as a result of)\\b`, 'Nguyên nhân + N / V-ing', 'because of/due to + cụm danh từ; “because + mệnh đề”.', 'reason-contrast'],
    [`\\b(as a result|consequently|therefore|thus|hence)\\b`, 'Từ nối chỉ kết quả', 'Nối 2 câu/ý: nguyên nhân → kết quả. Thường đứng đầu câu, sau có dấu phẩy.', 'adverbial-clauses'],
    [`\\b(however|nevertheless|nonetheless|on the other hand|by contrast|in contrast)\\b`, 'Từ nối chỉ đối lập', 'Đứng đầu câu (sau dấu chấm/chấm phẩy) + dấu phẩy; không nối 2 mệnh đề bằng dấu phẩy.', 'conjunctions'],
    [`\\b(moreover|furthermore|in addition|additionally|what is more)\\b`, 'Từ nối bổ sung', 'Thêm một ý cùng chiều – giúp tăng điểm Coherence & Cohesion.', 'conjunctions'],
    [`\\b(in order to|so as to|so that)\\b`, 'Chỉ mục đích', 'in order to/so as to + V nguyên mẫu; so that + mệnh đề (thường có can/could/will).', 'purpose-result'],
    [`\\b(so|such) ${W}( ${W})? that\\b`, 'So/Such … that (quá… đến nỗi)', 'so + adj/adv + that; such (a/an) + adj + N + that.', 'so-such-too-enough'],
    [`\\btoo ${W} to\\b|\\b${W} enough to\\b`, 'Too … to / … enough to', 'too + adj + to V (quá… không thể); adj + enough + to V (đủ… để).', 'so-such-too-enough'],
    [`\\bnot only\\b.*\\bbut also\\b`, 'Not only … but also …', 'Cấu trúc song song nhấn mạnh; khi “Not only” đứng đầu câu phải đảo ngữ.', 'parallel-structure'],
    [`\\b(if|unless) (${W})\\b`, 'Câu điều kiện', 'Xác định loại 1/2/3 theo thì: hiện tại → will; quá khứ → would; had V3 → would have V3.', 'conditionals-2-3'],
    [`\\b(would|could|might|should|must) have ${V3}\\b`, 'Modal + have + V3', 'Suy đoán hoặc tiếc nuối về quá khứ: must have = chắc hẳn đã; should have = lẽ ra nên.', 'modals-deduction'],
    [`\\b(used to|be used to|get used to|is used to|are used to)\\b`, 'Used to / be used to', 'used to + V = từng (thói quen quá khứ); be/get used to + V-ing = quen với.', 'used-to-would'],
    [`\\b(account|accounts|accounted|accounting) for\\b`, 'account for + %', '“chiếm (tỉ lệ)” trong Task 1: “Gas accounted for 62% of…”.', 'numbers-data-language'],
    [`\\b(rose|risen|rise|rises|increased|grew|climbed|fell|fallen|declined|dropped|decreased) (sharply|steadily|slightly|dramatically|significantly|gradually|considerably|marginally)\\b`, 'Động từ xu hướng + trạng từ', 'Mô tả biến động số liệu; đổi sang danh từ để đa dạng: “a sharp rise in…”.', 'numbers-data-language'],
    [`\\ba (sharp|steady|slight|dramatic|significant|gradual|considerable) (rise|increase|fall|decline|drop|decrease|growth)\\b`, 'Tính từ + danh từ xu hướng', '“There was a dramatic increase in…” – cách diễn đạt danh từ hóa, học thuật hơn động từ.', 'nominalisation'],
    [`\\b(reach|reached|peaked at|hit) (a )?(peak|high|low|${W})\\b`, 'Đạt đỉnh / chạm đáy', 'peak at + số; reach a peak/low of + số – dùng cho điểm cao/thấp nhất.', 'numbers-data-language'],
    [`\\b(level|levelled|leveled) off\\b|\\bremain(ed|s)? (stable|steady|constant|unchanged)\\b`, 'Giữ ổn định', 'Mô tả số liệu không đổi: level off (chững lại), remain stable.', 'numbers-data-language'],
    [`\\b(followed by|preceded by)\\b`, 'followed by / preceded by', 'Liệt kê thứ tự: “X was the highest, followed by Y” (Y đứng thứ hai).', 'participle-clauses'],
    [`\\b(compared (to|with)|in comparison with|relative to)\\b`, 'So sánh: compared with …', 'Đứng đầu hoặc giữa câu để so sánh hai đối tượng/số liệu.', 'comparatives-superlatives'],
    [`\\b(respectively)\\b`, 'respectively (lần lượt)', 'Gán các số liệu theo đúng thứ tự đã liệt kê: “A and B rose to 20% and 30% respectively”.', 'numbers-data-language'],
    [`(^|[.!?]\\s+)(?!(?:nothing|something|anything|everything|morning|evening|thing|building|king|spring|during)\\b)(${W}ing)(?: ${W}){0,2} (is|was|has)\\b`, 'Danh động từ làm chủ ngữ', 'V-ing đứng đầu câu làm chủ ngữ, động từ chia số ít: “Learning languages IS…”.', 'gerund-infinitive'],
    [`\\b(enjoy|avoid|consider|suggest|recommend|finish|keep|mind|risk|deny) ${W}ing\\b`, 'Động từ + V-ing', 'Một số động từ luôn đi với V-ing (enjoy, avoid, consider, suggest…).', 'gerund-infinitive'],
    [`\\b(decide|plan|hope|want|agree|refuse|manage|fail|afford|tend|aim) to ${W}\\b`, 'Động từ + to V', 'Nhóm động từ đi với to-V (decide, plan, hope, refuse, tend…).', 'gerund-infinitive'],
    [`\\b(make|makes|made|let|lets) (${W}) (${W})\\b(?! (to|of|for|in|on)\\b)`, 'Make/let/have + O + V', 'Động từ sai khiến: make/let/have sb DO sth (không “to”); help sb (to) do.', 'passive-reporting-causative'],
    [`\\b(it is (said|believed|thought|reported|estimated|expected) that)\\b`, 'Bị động tường thuật', '“It is believed that…” – khách quan, trang trọng; rất hợp Writing Task 2.', 'passive-reporting-causative'],
    [`\\b(may|might|could|tend to|appear to|seem to|is likely to|are likely to)\\b`, 'Ngôn ngữ thận trọng (hedging)', 'Làm nhận định bớt tuyệt đối – đặc trưng văn học thuật, giúp lập luận thuyết phục hơn.', 'hedging'],
  ];
  const compiled = RULES.map(([re, name, vi, lesson]) => ({ re: new RegExp(re, 'i'), name, vi, lesson }));
  // Trả về tối đa n cấu trúc tìm thấy, kèm đoạn khớp
  function analyze(text, n = 5) {
    const t = String(text || '').replace(/[’]/g, "'").replace(/\s+/g, ' ');
    const out = [], seen = new Set();
    for (const r of compiled) {
      const m = t.match(r.re);
      if (m && !seen.has(r.name)) { seen.add(r.name); out.push({ name: r.name, vi: r.vi, lesson: r.lesson, match: m[0] }); if (out.length >= n) break; }
    }
    return out;
  }
  g.VBStruct = { analyze };
})(typeof self !== 'undefined' ? self : this);
