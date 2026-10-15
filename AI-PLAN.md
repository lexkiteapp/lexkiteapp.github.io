# Lexkite – Kế hoạch AI miễn phí 100%, chất lượng cao

## 1. Hiện trạng
| Tính năng AI | Đang dùng | Vấn đề |
|---|---|---|
| Chấm Writing Task 1/2, Speaking (AI.grade) | Gemini bằng **khóa người dùng tự nhập**, dự phòng Gemini Nano trong Chrome | Phần lớn người dùng không tạo khóa, nên thực tế đa số **không có AI** |
| Giải thích sâu từ/câu (AI.explain) | Như trên + phân tích từ vựng tức thì (đã có, miễn phí) | AI chỉ có khi đã có khóa hoặc Nano |
| Viết lại câu, mẹo nhớ từ khó (AI.ask) | Như trên | Như trên |
| Kiểm tra ngữ pháp | LanguageTool (máy chủ công khai miễn phí) | Ổn; giới hạn khoảng 20 lượt/phút mỗi IP |
| Chấm phát âm | Web Speech API (nhận dạng giọng nói) | Chỉ chấm theo từ đúng/sai; Chrome gửi âm thanh lên máy chủ Google; Firefox không hỗ trợ |
| Gemini Nano | Cần tải khoảng 2 GB, máy đủ mạnh, chỉ trên Chrome desktop | Không có trên điện thoại hay Safari |

**Kết luận:** chất lượng tốt khi có khóa, nhưng mức phủ thấp. Cần để **mọi người dùng** đều có AI ngay mà không tốn tiền.

## 2. Nguyên tắc: "AI nhiều tầng". Dùng tầng rẻ nhất mà vẫn đủ chất lượng, tự chuyển tầng khi tầng trên không có.

| Tầng | Công nghệ | Chi phí | Có sẵn cho | Dùng cho |
|---|---|---|---|---|
| **T0 – AI soạn sẵn** | Claude biên soạn trước khi build: giải thích, mẹo nhớ, collocation, lỗi hay gặp, bài mẫu, rubric | 0 khi chạy | **100% người dùng**, tức thì, offline | Giải thích từ, mẹo nhớ, chữa đề, gợi ý ý tưởng |
| **T1 – Phân tích quy tắc** | Bộ chấm chạy trên máy: đếm từ, độ đa dạng từ vựng, từ nối, câu phức, từ học thuật (AWL), độ dài câu, lỗi LanguageTool → ước lượng band theo 4 tiêu chí | 0 | 100%, tức thì | Chấm Writing sơ bộ, gợi ý cụ thể |
| **T2 – AI trên máy** | Chrome Built-in AI (Prompt, Proofreader, Rewriter, Writer, Summarizer) · WebLLM (Qwen/Llama nhỏ, WebGPU) cho máy không có Chrome AI · Whisper (transformers.js) nhận dạng giọng nói offline | 0, riêng tư | Máy tính/điện thoại có WebGPU; tải mô hình 1 lần (người dùng chủ động bật) | Chữa câu, viết lại, giải thích theo ngữ cảnh, chấm phát âm offline |
| **T3 – AI đám mây của người dùng** | Gemini API bằng khóa người dùng (gói miễn phí của Google) – **chất lượng cao nhất** | 0 cho Lexkite | Người dùng tạo khóa (1 phút, có hướng dẫn) | Chấm Writing/Speaking chi tiết theo band |
| **T4 – AI dùng chung (khi scale)** | Cloudflare Workers AI (gói miễn phí) hoặc khóa Gemini của dự án qua Worker, có giới hạn lượt/người/ngày + bộ nhớ đệm | 0 trong hạn mức | Mọi người dùng, vài lượt/ngày | "Thử chấm AI" cho người chưa có khóa |

Mọi kết quả AI được **lưu đệm** theo nội dung (IndexedDB). Cùng một câu hỏi thì không gọi lại, nên tiết kiệm hạn mức và trả lời tức thì.

## 3. Lộ trình triển khai (theo thứ tự giá trị / công sức)
1. **Bộ điều phối AI (AI Router)**: một hàm `AI.run(task, input)` tự chọn tầng T3 → T2 → T1/T0, kèm lưu đệm kết quả. Giao diện luôn có câu trả lời, không bao giờ "treo" hay báo "chưa có khóa".
2. **T1 – Chấm Writing bằng quy tắc** (chạy ngay, miễn phí):
   - band ước lượng cho Task Response (độ dài, đủ ý), Coherence (từ nối, đoạn), Lexical (đa dạng, AWL, collocation), Grammar (câu phức, lỗi LanguageTool);
   - kèm 5 gợi ý cụ thể có ví dụ;
   - ghi rõ đây là ước lượng.
3. **T0 – Nội dung AI soạn sẵn cho toàn bộ thư viện** (khoảng 6.000 từ): mẹo nhớ, lỗi người Việt hay mắc, cách dùng trong IELTS/TOEIC, từ hay nhầm. Biên soạn theo lô, kiểm tra chính tả, chỉ tải khi cần (theo bộ từ).
4. **T2 – Chrome Built-in AI đầy đủ:** Proofreader (chữa lỗi), Rewriter (viết lại câu), Summarizer; bật bằng một nút có thanh tiến độ tải.
5. **T2 – Whisper offline** cho chấm phát âm và Speaking: không gửi âm thanh đi đâu, chạy được trên Firefox/Safari, có điểm theo từng từ.
6. **T2 – WebLLM dự phòng** cho máy không có Chrome AI (Edge, Safari 26 có WebGPU): mô hình nhỏ khoảng 1 GB, người dùng chủ động bật.
7. **T3 – Trải nghiệm tạo khóa Gemini:** hướng dẫn 3 bước có ảnh, nút mở thẳng trang tạo khóa, tự kiểm tra khóa, hiển thị hạn mức còn lại.
8. **T4 (khi có tài khoản Cloudflare):** Worker trung gian có giới hạn lượt, khoảng 3 lượt chấm AI/người/ngày miễn phí.

## 4. Đo chất lượng
- Bộ 30 bài Writing mẫu (tự biên soạn) đã có band tham chiếu. Mỗi tầng chấm phải lệch không quá ±0,5 band với ≥ 70% số bài.
- Theo dõi tỉ lệ người dùng nhận được phản hồi AI (mục tiêu 100%, tầng nào cũng được).
