# 5 – Bản địa hóa sang {LANG}
Nguồn: bài {SLUG} (đã tạo nháp bằng `pipeline localize {SLUG} --to {LANG} [--as slug-ban-dia]`).
- KHÔNG dịch từng câu. Giữ khung kiến thức, viết lại cho người học {LANG}: từ khóa bản địa (làm bước 1 cho thị trường này), slug theo từ khóa bản địa (ASCII), ví dụ/lỗi điển hình của người nói {LANG} (vd. người Nhật nhầm /l/–/r/, người Indonesia bỏ -s), thông tin kỳ thi tại nước đó nếu khác.
- Giữ cùng ảnh (id), viết lại alt/chú thích bằng {LANG}; link nội bộ trỏ /{LANG}/blog/… nếu bài đích đã có bản {LANG}, nếu chưa thì bỏ link đó hoặc chọn bài khác đã có.
- Thêm chữ giao diện blog cho {LANG} trong bảng `L` của scripts/build-blog.mjs nếu chưa có.
- Xóa khối TODO-LOCALIZE + bản gốc; chạy gate; làm bước 4 và 6.
