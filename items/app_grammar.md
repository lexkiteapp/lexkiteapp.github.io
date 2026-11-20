# #/grammar

Điểm: **89** · độ phủ 100 % · /grammar

- Chức năng: 100
- Lỗi JS: 100
- Rỗng/lỗi/tải: 100
- Back/Thoát: 100
- Tương phản: 100
- Chạm ≥44: 84
- Bố cục: 40
- i18n 15: 100
- Hiệu năng: 85
- Độ đẹp: 74

## Lỗi
- [tap] main#view>div.row.between>a.small – "Grammar" vùng chạm 87×22 < 44px
- [tap] main#view>div.row.between>a.btn.sm – "Full lesson" vùng chạm 127×36 < 44px
- [layout] main#view>div.card.hero-main – nội dung tràn ngang 60px bị cắt
- [layout] main#view>div.steps.fade-end – nội dung tràn ngang 346px bị cắt: "Spot the error", "div.steps.fade-end>button.stepdot>span", "span>svg.i>use
- [layout] main#view>div.steps.fade-end>button.stepdot – "Spot the error" nằm ngoài màn hình (x 331…405 / 390)
- [layout] div.sortbox>div.row.center>span.chip – nhãn "I" đứng trơ một mình cả hàng (khung 300px)
- [perf] LCP 3576 ms · CLS 0.0007 · TBT 69 ms
- [beauty] Dark toast overlay obscures content and breaks flow
- [beauty] Tab labels wrap awkwardly (e.g., 'Build the formula')
- [beauty] Generic cards lack Duolingo's playful character integration

## Ảnh
390l<br><img src="../shots/app_grammar-390l.jpg" width="260">
390d<br><img src="../shots/app_grammar-390d.jpg" width="260">
1440l<br><img src="../shots/app_grammar-1440l.jpg" width="260">
1440d<br><img src="../shots/app_grammar-1440d.jpg" width="260">
