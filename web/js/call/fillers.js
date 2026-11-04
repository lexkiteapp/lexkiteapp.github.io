/* Call RT – câu đệm / backchannel (docs/specs/call-realtime.md M1). Giọng Kokoro sinh sẵn theo đúng giáo viên
 * (scripts/sentence-audio/corpus.mjs quét CALL_FILLERS) → teacher.say phát mp3, miệng chạy vòng nói; thiếu file → giọng máy.
 * ack: ngay sau khi người học nói xong (che lúc nhận dạng + chọn câu đáp) · think: khi phải chờ lâu hơn (AI ở M3). Ngắn, ≤ 0,8 s. */
(function (g) {
  g.CALL_FILLERS = {
    ama: { ack: ['Mm-hmm.', 'Oh, nice.', 'I see.', 'Okay!', 'Aha.'], think: ['Hmm, let me think.', 'Ooh, good one.'] },
    carlos: { ack: ['Uh-huh.', 'Right.', 'Got it.', 'Okay.', 'I see.'], think: ['Hmm, good question.', 'Let me think.'] },
  };
})(typeof self !== 'undefined' ? self : this);
