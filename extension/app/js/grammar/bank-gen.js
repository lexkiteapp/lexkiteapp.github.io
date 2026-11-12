/* FILE SINH TỰ ĐỘNG – scripts/factory/build-grammar-bank.mjs từ content/factory/grammar-quiz.json (xưởng nội dung, docs/CONTENT-FACTORY.md). Đừng sửa tay. Nối thêm câu trắc nghiệm vào bài ngữ pháp có sẵn. */
(function (g) {
const Q = {

};
(g.GRAMMAR || []).forEach(l => { if (Q[l.id]) l.quiz = (l.quiz || []).concat(Q[l.id]); });
})(typeof self !== 'undefined' ? self : this);
