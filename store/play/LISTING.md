# Lexkite – Google Play store listing (com.lexkite.app)

Copy each block into **Play Console → Grow users → Store presence → Main store listing** (default language en-US), then **Manage translations → Add your own translations** for the other languages.
Images: built on GitHub Actions by `scripts/play-shots.mjs` (workflow **Ảnh Google Play**, `.github/workflows/play-shots.yml`) → orphan branch `play-shots`:
`icon-512.png` (512×512, 32-bit) · `<lang>/feature-1024x500.png` · `<lang>/phone-1..7.png` (1080×1920, 24-bit, no alpha).
Character counts below are Unicode characters (what Play Console counts). Every claim was checked against the code in `web/js` and `mobile/android` on 17/10/2026.

## App details

| Field | Value |
|---|---|
| App name (en-US, ≤30) | `Lexkite: English Vocabulary` (27) |
| Category | **Education** |
| Tags (pick up to 5 in Play Console) | Education · Language learning · Vocabulary · Dictionary · Test preparation (exact names depend on the Play tag list) |
| Email | `support@lexkite.com` |
| Website | `https://lexkite.com` |
| Privacy policy | `https://lexkite.com/en/privacy` |
| Contains ads | **No** for builds without the AdMob SDK (default). The first build made with `ADS_NATIVE=1` → **Yes** + Data safety per `docs/STORE-READINESS.md` §E |
| App access | All functionality is available without special access (no login) |

Policy notes: no "best / #1 / top" or ranking claims, no price or "free" text in the app name or icon, no emoji, exam names used only descriptively + non-affiliation line. "Free" appears only in descriptions. The feature graphic and screenshots carry no "free" / call-to-action text.

## Screenshots (same order in every language)

| # | Screen (live app, `?sandbox=1&demo=1`) | Headline (en) |
|---|---|---|
| 1 | `#/home` – today's plan | Learn English words a little every day |
| 2 | `#/review` – flashcard flipped, FSRS rating buttons | Review right before you forget |
| 3 | `#/dict/resilience` – word detail | Every word, clearly explained |
| 4 | `#/tests` – IELTS / TOEIC / TOEFL practice tests | Practice tests with explanations |
| 5 | `#/usage/affect-effect` – usage note | Fix the mistakes learners often make |
| 6 | `#/stats` – streak, XP, progress | Watch your streak grow |
| 7 | `#/practice` in dark mode | Study your way, day or night |

---

## English (en-US) – default

**App name (27):**
```
Lexkite: English Vocabulary
```

**Short description (78):**
```
Learn English words with FSRS flashcards. IELTS, TOEIC & TOEFL practice. Free.
```

**Full description (2,423):**
```
Lexkite is a free app for learning English vocabulary and practising for IELTS, TOEIC and TOEFL. No account or login is needed – open the app and start learning.

LEARN WORDS THAT MATTER
• 6,800+ words with IPA and audio: NGSL core words, the 570-word Academic Word List, 1,250 TOEIC words, IELTS topics, phrasal verbs and collocations.
• A daily plan of new words and reviews, built around your goal and level.
• A 5-minute placement test shows where you are and suggests a study path.

REMEMBER THEM WITH FSRS
• Flashcards scheduled by FSRS, the modern spaced repetition algorithm also used by Anki.
• After each card, rate how well you remembered it – the app schedules the next review right before you would forget.
• Daily reminders and a home screen widget with your cards due today and your streak.

LOOK UP ANY WORD
• UK and US pronunciation, meanings by part of speech, definitions and examples.
• Save any word to your flashcards in one tap.

EXAM PRACTICE
• IELTS: four-skill mock test with band conversion, 40-question Listening tests and Reading practice.
• TOEIC: full Listening & Reading tests with a 10–990 score estimate.
• TOEFL iBT: practice by section – Reading, Listening, Writing and Speaking.
• Explanations for answers and a history of your scores.

GRAMMAR, USAGE AND SKILLS
• Grammar topics and a 40-question mixed grammar check.
• Clear notes on common mistakes, such as affect vs effect or interested vs interesting.
• Listening and dictation, pronunciation practice with your microphone, reading passages and games.
• AI feedback on your writing and conversation roleplays (internet connection required).

MADE FOR EVERYDAY STUDY
• Works offline: review your flashcards and study without a connection. Looking up new words and AI features need internet.
• Streaks, daily goals, XP and progress statistics.
• Light and dark mode.
• Interface in 15 languages: English, Vietnamese, Spanish, Portuguese, French, German, Indonesian, Thai, Chinese, Japanese, Korean, Hindi, Arabic, Russian and Turkish.

PRIVATE BY DESIGN
• Your learning data is stored on your device.
• Privacy policy: https://lexkite.com/en/privacy

Questions or feedback: support@lexkite.com · https://lexkite.com

Lexkite is an independent product and is not affiliated with or endorsed by the British Council, IDP, Cambridge University Press & Assessment or ETS. IELTS, TOEIC and TOEFL are trademarks of their respective owners.
```

---

## Tiếng Việt (vi-VN)

**Tên ứng dụng (26):**
```
Lexkite: Từ vựng tiếng Anh
```

**Mô tả ngắn (77):**
```
Học từ vựng tiếng Anh bằng flashcard FSRS, luyện IELTS, TOEIC, TOEFL miễn phí
```

**Mô tả đầy đủ (2.263):**
```
Lexkite là ứng dụng miễn phí giúp bạn học từ vựng tiếng Anh và luyện thi IELTS, TOEIC, TOEFL. Không cần tạo tài khoản hay đăng nhập – mở app là học được ngay.

HỌC ĐÚNG TỪ CẦN HỌC
• Hơn 6.800 từ có phiên âm và phát âm: từ cốt lõi NGSL, 570 từ học thuật AWL, 1.250 từ TOEIC, từ theo chủ đề IELTS, phrasal verb và collocation.
• Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu và trình độ của bạn.
• Bài kiểm tra trình độ 5 phút cho biết bạn đang ở đâu và gợi ý lộ trình học.

NHỚ LÂU VỚI FSRS
• Flashcard được lên lịch bằng FSRS – thuật toán lặp lại ngắt quãng hiện đại mà Anki cũng dùng.
• Sau mỗi thẻ, bạn chấm mức độ nhớ – app hẹn lần ôn tiếp theo đúng lúc bạn sắp quên.
• Nhắc học hằng ngày và widget trên màn hình chính hiện số thẻ cần ôn hôm nay cùng chuỗi ngày học.

TRA TỪ BẤT KỲ
• Phát âm Anh–Anh và Anh–Mỹ, nghĩa theo từ loại, định nghĩa và ví dụ.
• Lưu từ vào flashcard chỉ với một chạm.

LUYỆN THI
• IELTS: thi thử 4 kỹ năng có quy đổi band, đề Listening 40 câu và luyện Reading.
• TOEIC: đề Listening & Reading đầy đủ, quy đổi điểm 10–990.
• TOEFL iBT: luyện theo từng phần Reading, Listening, Writing, Speaking.
• Có giải thích đáp án và lịch sử điểm.

NGỮ PHÁP, CÁCH DÙNG TỪ VÀ KỸ NĂNG
• Các chủ điểm ngữ pháp và bài kiểm tra ngữ pháp tổng hợp 40 câu.
• Giải thích rõ các lỗi hay gặp, như affect và effect, interested và interesting.
• Luyện nghe và chép chính tả, luyện phát âm bằng micro, bài đọc và trò chơi.
• AI nhận xét bài viết và luyện hội thoại nhập vai (cần kết nối mạng).

HỌC MỖI NGÀY THẬT DỄ
• Dùng được khi không có mạng: ôn flashcard và học bình thường. Tra từ mới và các tính năng AI cần mạng.
• Chuỗi ngày học, mục tiêu ngày, điểm XP và thống kê tiến độ.
• Giao diện sáng và tối.
• Giao diện 15 ngôn ngữ: Tiếng Việt, tiếng Anh, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Indonesia, Thái, Trung, Nhật, Hàn, Hindi, Ả Rập, Nga và Thổ Nhĩ Kỳ.

TÔN TRỌNG QUYỀN RIÊNG TƯ
• Dữ liệu học được lưu trên thiết bị của bạn.
• Chính sách quyền riêng tư: https://lexkite.com/vi/privacy

Góp ý, hỏi đáp: support@lexkite.com · https://lexkite.com

Lexkite là sản phẩm độc lập, không liên kết và không được bảo trợ bởi British Council, IDP, Cambridge University Press & Assessment hay ETS. IELTS, TOEIC, TOEFL là nhãn hiệu của các chủ sở hữu tương ứng.
```

---

## Other interface languages (compact descriptions)

Same facts as en-US, shorter. Screenshots for these languages: use the en-US set (Play falls back to the default language) until `LANGS` in `play-shots.mjs` gets headline copy for them. Native-speaker review recommended before publishing.

### Español (es-ES / es-419)

**Nombre:**
```
Lexkite: Vocabulario de inglés
```
**Descripción breve:**
```
Aprende vocabulario en inglés con tarjetas FSRS y practica IELTS, TOEIC y TOEFL
```
**Descripción completa:**
```
Lexkite es una app gratuita para aprender vocabulario en inglés y prepararte para IELTS, TOEIC y TOEFL. No necesitas cuenta ni iniciar sesión.

• Más de 6.800 palabras con IPA y audio: vocabulario básico (NGSL), Academic Word List, palabras de TOEIC, temas de IELTS, phrasal verbs y colocaciones.
• Tarjetas con FSRS, el algoritmo de repetición espaciada que también usa Anki: repasas cada palabra justo antes de olvidarla.
• Diccionario: pronunciación británica y americana, significados, definiciones y ejemplos; guarda palabras con un toque.
• Exámenes de práctica: simulacro de IELTS con conversión a band, tests completos de TOEIC Listening & Reading (10–990), práctica de TOEFL iBT por secciones, prueba de nivel de 5 minutos, explicaciones e historial de puntuaciones.
• Gramática, notas sobre errores frecuentes, comprensión auditiva y dictado, pronunciación, lecturas y juegos.
• Comentarios de IA sobre tu escritura y conversaciones de rol (requiere internet).
• Funciona sin conexión para repasar y estudiar; buscar palabras nuevas y las funciones de IA requieren internet.
• Widget en la pantalla de inicio, recordatorios diarios, rachas, metas, estadísticas y modo oscuro.
• Interfaz en 15 idiomas. Tus datos de aprendizaje se guardan en tu dispositivo.

Privacidad: https://lexkite.com/es/privacy · Soporte: support@lexkite.com

Lexkite es un producto independiente y no está afiliado ni respaldado por el British Council, IDP, Cambridge University Press & Assessment ni ETS. IELTS, TOEIC y TOEFL son marcas de sus respectivos propietarios.
```

### Português – Brasil (pt-BR)

**Nome:**
```
Lexkite: Vocabulário de inglês
```
**Descrição curta:**
```
Aprenda vocabulário de inglês com flashcards FSRS. Pratique IELTS, TOEIC e TOEFL
```
**Descrição completa:**
```
O Lexkite é um app gratuito para aprender vocabulário em inglês e se preparar para IELTS, TOEIC e TOEFL. Não precisa de conta nem de login.

• Mais de 6.800 palavras com IPA e áudio: vocabulário essencial (NGSL), Academic Word List, palavras do TOEIC, temas do IELTS, phrasal verbs e colocações.
• Flashcards com FSRS, o algoritmo de repetição espaçada também usado pelo Anki: você revisa cada palavra pouco antes de esquecê-la.
• Dicionário: pronúncia britânica e americana, significados, definições e exemplos; salve palavras com um toque.
• Simulados: simulado de IELTS com conversão para band, testes completos de TOEIC Listening & Reading (10–990), prática de TOEFL iBT por seção, teste de nível de 5 minutos, explicações e histórico de notas.
• Gramática, notas sobre erros comuns, compreensão oral e ditado, pronúncia, leituras e jogos.
• Feedback de IA para sua escrita e conversas de roleplay (requer internet).
• Funciona offline para revisar e estudar; consultar palavras novas e os recursos de IA exigem internet.
• Widget na tela inicial, lembretes diários, sequências, metas, estatísticas e modo escuro.
• Interface em 15 idiomas. Seus dados de estudo ficam no seu dispositivo.

Privacidade: https://lexkite.com/pt/privacy · Suporte: support@lexkite.com

O Lexkite é um produto independente e não é afiliado nem endossado pelo British Council, IDP, Cambridge University Press & Assessment ou ETS. IELTS, TOEIC e TOEFL são marcas de seus respectivos proprietários.
```

### Français (fr-FR)

**Nom :**
```
Lexkite : vocabulaire anglais
```
**Description courte :**
```
Apprenez le vocabulaire anglais avec des cartes FSRS. IELTS, TOEIC et TOEFL
```
**Description complète :**
```
Lexkite est une application gratuite pour apprendre le vocabulaire anglais et préparer l'IELTS, le TOEIC et le TOEFL. Aucun compte ni connexion n'est nécessaire.

• Plus de 6 800 mots avec API et audio : vocabulaire essentiel (NGSL), Academic Word List, mots du TOEIC, thèmes de l'IELTS, phrasal verbs et collocations.
• Cartes mémoire planifiées par FSRS, l'algorithme de répétition espacée également utilisé par Anki : vous révisez chaque mot juste avant de l'oublier.
• Dictionnaire : prononciation britannique et américaine, sens, définitions et exemples ; enregistrez un mot d'un simple toucher.
• Entraînement aux examens : examen blanc IELTS avec conversion en band, tests TOEIC Listening & Reading complets (10–990), entraînement TOEFL iBT par section, test de niveau de 5 minutes, explications et historique des scores.
• Grammaire, fiches sur les erreurs fréquentes, compréhension orale et dictée, prononciation, lectures et jeux.
• Retours de l'IA sur vos écrits et dialogues en jeu de rôle (connexion Internet requise).
• Fonctionne hors ligne pour réviser et étudier ; la recherche de nouveaux mots et les fonctions d'IA nécessitent Internet.
• Widget sur l'écran d'accueil, rappels quotidiens, séries, objectifs, statistiques et mode sombre.
• Interface en 15 langues. Vos données d'apprentissage sont stockées sur votre appareil.

Confidentialité : https://lexkite.com/fr/privacy · Assistance : support@lexkite.com

Lexkite est un produit indépendant, sans lien avec le British Council, IDP, Cambridge University Press & Assessment ou ETS, et non approuvé par eux. IELTS, TOEIC et TOEFL sont des marques de leurs propriétaires respectifs.
```

### Deutsch (de-DE)

**Name:**
```
Lexkite: Englisch-Vokabeln
```
**Kurzbeschreibung:**
```
Englische Vokabeln mit FSRS-Karteikarten lernen. Übung für IELTS, TOEIC, TOEFL
```
**Vollständige Beschreibung:**
```
Lexkite ist eine kostenlose App zum Lernen englischer Vokabeln und zur Vorbereitung auf IELTS, TOEIC und TOEFL. Kein Konto und keine Anmeldung nötig.

• Über 6.800 Wörter mit Lautschrift (IPA) und Audio: Grundwortschatz (NGSL), Academic Word List, TOEIC-Wörter, IELTS-Themen, Phrasal Verbs und Kollokationen.
• Karteikarten mit FSRS, dem Algorithmus für verteilte Wiederholung, den auch Anki nutzt: Du wiederholst jedes Wort kurz bevor du es vergessen würdest.
• Wörterbuch: britische und amerikanische Aussprache, Bedeutungen, Definitionen und Beispiele; Wörter mit einem Tipp speichern.
• Prüfungstraining: IELTS-Probetest mit Band-Umrechnung, vollständige TOEIC-Tests für Listening & Reading (10–990), TOEFL-iBT-Übungen nach Prüfungsteilen, 5-minütiger Einstufungstest, Erklärungen und Punkteverlauf.
• Grammatik, Hinweise zu typischen Fehlern, Hörverstehen und Diktat, Ausspracheübungen, Lesetexte und Spiele.
• KI-Feedback zu deinen Texten und Rollenspiel-Gespräche (Internetverbindung erforderlich).
• Funktioniert offline zum Wiederholen und Lernen; das Nachschlagen neuer Wörter und KI-Funktionen brauchen Internet.
• Startbildschirm-Widget, tägliche Erinnerungen, Lernserien, Ziele, Statistiken und dunkles Design.
• Oberfläche in 15 Sprachen. Deine Lerndaten werden auf deinem Gerät gespeichert.

Datenschutz: https://lexkite.com/de/privacy · Support: support@lexkite.com

Lexkite ist ein unabhängiges Produkt und steht in keiner Verbindung zu British Council, IDP, Cambridge University Press & Assessment oder ETS und wird von diesen nicht unterstützt. IELTS, TOEIC und TOEFL sind Marken ihrer jeweiligen Inhaber.
```

### Bahasa Indonesia (id)

**Nama:**
```
Lexkite: Kosakata Inggris
```
**Deskripsi singkat:**
```
Belajar kosakata bahasa Inggris dengan kartu FSRS, latihan IELTS, TOEIC, TOEFL
```
**Deskripsi lengkap:**
```
Lexkite adalah aplikasi gratis untuk belajar kosakata bahasa Inggris dan berlatih IELTS, TOEIC, dan TOEFL. Tidak perlu akun atau login.

• Lebih dari 6.800 kata dengan IPA dan audio: kosakata inti (NGSL), Academic Word List, kata TOEIC, topik IELTS, phrasal verb, dan kolokasi.
• Kartu hafalan dengan FSRS, algoritma pengulangan berjarak yang juga dipakai Anki: setiap kata diulang tepat sebelum kamu lupa.
• Kamus: pelafalan Inggris (UK) dan Amerika (US), arti, definisi, dan contoh; simpan kata dengan satu ketukan.
• Latihan ujian: simulasi IELTS dengan konversi band, tes lengkap TOEIC Listening & Reading (10–990), latihan TOEFL iBT per bagian, tes penempatan 5 menit, pembahasan, dan riwayat skor.
• Tata bahasa, catatan kesalahan umum, mendengarkan dan dikte, latihan pelafalan, bacaan, dan permainan.
• Masukan AI untuk tulisanmu dan percakapan roleplay (perlu internet).
• Bisa dipakai offline untuk mengulang dan belajar; mencari kata baru dan fitur AI perlu internet.
• Widget layar utama, pengingat harian, runtunan hari, target, statistik, dan mode gelap.
• Antarmuka dalam 15 bahasa. Data belajarmu disimpan di perangkatmu.

Privasi: https://lexkite.com/id/privacy · Dukungan: support@lexkite.com

Lexkite adalah produk independen dan tidak berafiliasi dengan atau didukung oleh British Council, IDP, Cambridge University Press & Assessment, maupun ETS. IELTS, TOEIC, dan TOEFL adalah merek dagang milik pemiliknya masing-masing.
```

### ไทย (th)

**ชื่อแอป:**
```
Lexkite: คำศัพท์ภาษาอังกฤษ
```
**คำอธิบายแบบย่อ:**
```
ท่องศัพท์ภาษาอังกฤษด้วยแฟลชการ์ด FSRS ฝึก IELTS, TOEIC และ TOEFL ฟรี
```
**คำอธิบายแบบเต็ม:**
```
Lexkite เป็นแอปฟรีสำหรับเรียนคำศัพท์ภาษาอังกฤษและฝึกสอบ IELTS, TOEIC และ TOEFL ไม่ต้องสร้างบัญชีหรือเข้าสู่ระบบ

• คำศัพท์กว่า 6,800 คำ พร้อมคำอ่าน IPA และเสียง: คำศัพท์พื้นฐาน (NGSL), Academic Word List, คำศัพท์ TOEIC, หัวข้อ IELTS, phrasal verb และ collocation
• แฟลชการ์ดที่จัดตารางทบทวนด้วย FSRS อัลกอริทึมทบทวนแบบเว้นระยะที่ Anki ก็ใช้ ทบทวนแต่ละคำก่อนจะลืม
• พจนานุกรม: การออกเสียงแบบอังกฤษและอเมริกัน ความหมาย คำจำกัดความ และตัวอย่าง บันทึกคำได้ในแตะเดียว
• ฝึกทำข้อสอบ: ข้อสอบจำลอง IELTS พร้อมแปลงเป็น band, ข้อสอบ TOEIC Listening & Reading ฉบับเต็ม (10–990), ฝึก TOEFL iBT แยกตามพาร์ต, แบบทดสอบวัดระดับ 5 นาที, คำอธิบายเฉลย และประวัติคะแนน
• ไวยากรณ์ ข้อผิดพลาดที่พบบ่อย การฟังและเขียนตามคำบอก ฝึกออกเสียง บทอ่าน และเกม
• AI ให้คำแนะนำงานเขียนและฝึกสนทนาแบบบทบาทสมมติ (ต้องใช้อินเทอร์เน็ต)
• ใช้งานออฟไลน์ได้สำหรับทบทวนและเรียน ส่วนการค้นหาคำใหม่และฟีเจอร์ AI ต้องใช้อินเทอร์เน็ต
• วิดเจ็ตหน้าจอหลัก การแจ้งเตือนรายวัน สถิติการเรียนต่อเนื่อง เป้าหมาย และโหมดมืด
• อินเทอร์เฟซ 15 ภาษา ข้อมูลการเรียนจัดเก็บไว้ในอุปกรณ์ของคุณ

ความเป็นส่วนตัว: https://lexkite.com/th/privacy · ติดต่อ: support@lexkite.com

Lexkite เป็นผลิตภัณฑ์อิสระ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก British Council, IDP, Cambridge University Press & Assessment หรือ ETS โดย IELTS, TOEIC และ TOEFL เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย
```

### 简体中文 (zh-CN)

**应用名称：**
```
Lexkite：英语单词
```
**简短说明：**
```
用 FSRS 闪卡背英语单词，免费练习雅思、托业、托福
```
**完整说明：**
```
Lexkite 是一款免费的英语词汇学习与 IELTS（雅思）、TOEIC（托业）、TOEFL（托福）备考应用。无需注册或登录。

• 6,800+ 单词，带音标和发音：NGSL 核心词、学术词汇表 AWL、TOEIC 词汇、IELTS 话题词、短语动词和固定搭配。
• 采用 FSRS 算法（Anki 也在使用的间隔重复算法）安排闪卡复习，在你快要忘记时提醒复习。
• 词典：英式和美式发音、按词性的释义、定义和例句；一键加入闪卡。
• 考试练习：IELTS 四项模考并换算分数段、完整的 TOEIC 听力与阅读试题（10–990 分）、按部分练习 TOEFL iBT、5 分钟水平测试，附答案解析和成绩记录。
• 语法、常见错误讲解、听力与听写、发音练习、阅读和小游戏。
• AI 点评写作，并可进行情景对话练习（需联网）。
• 可离线复习和学习；查新词和 AI 功能需要联网。
• 主屏幕小组件、每日提醒、连续学习天数、目标、统计和深色模式。
• 15 种界面语言。学习数据保存在你的设备上。

隐私政策：https://lexkite.com/zh/privacy · 联系：support@lexkite.com

Lexkite 是独立产品，与 British Council、IDP、Cambridge University Press & Assessment 及 ETS 均无关联，亦未获其认可。IELTS、TOEIC、TOEFL 是其各自所有者的商标。
```

### 日本語 (ja-JP)

**アプリ名：**
```
Lexkite：英単語
```
**簡単な説明：**
```
FSRS の単語カードで英単語を覚え、IELTS・TOEIC・TOEFL 対策も無料で
```
**詳しい説明：**
```
Lexkite は、英単語の学習と IELTS・TOEIC・TOEFL 対策ができる無料アプリです。アカウント登録やログインは不要です。

• 6,800 語以上を発音記号と音声付きで収録：NGSL の基本語、Academic Word List、TOEIC 頻出語、IELTS のトピック別単語、句動詞、コロケーション。
• Anki でも使われている間隔反復アルゴリズム FSRS で単語カードを管理し、忘れる直前に復習できます。
• 辞書：イギリス英語とアメリカ英語の発音、品詞別の意味、定義、例文。ワンタップで単語カードに保存。
• 試験対策：IELTS 4 技能の模試（バンド換算）、TOEIC Listening & Reading のフルテスト（10–990 点）、TOEFL iBT のセクション別練習、5 分のレベル診断、解説とスコア履歴。
• 文法、よくある間違いの解説、リスニングとディクテーション、発音練習、リーディング、ゲーム。
• AI による英作文のフィードバックとロールプレイ会話（インターネット接続が必要）。
• 復習や学習はオフラインでも可能。新しい単語の検索と AI 機能にはインターネットが必要です。
• ホーム画面ウィジェット、毎日のリマインダー、連続学習日数、目標、統計、ダークモード。
• 15 言語の表示に対応。学習データはお使いの端末に保存されます。

プライバシーポリシー：https://lexkite.com/ja/privacy · お問い合わせ：support@lexkite.com

Lexkite は独立した製品であり、British Council、IDP、Cambridge University Press & Assessment、ETS とは提携しておらず、承認も受けていません。IELTS、TOEIC、TOEFL は各所有者の商標です。
```

### 한국어 (ko-KR)

**앱 이름:**
```
Lexkite: 영어 단어
```
**간단한 설명:**
```
FSRS 플래시카드로 영어 단어 암기, IELTS·TOEIC·TOEFL 연습까지 무료로
```
**자세한 설명:**
```
Lexkite는 영어 단어를 익히고 IELTS, TOEIC, TOEFL을 준비할 수 있는 무료 앱입니다. 계정이나 로그인이 필요 없습니다.

• 발음기호와 음성이 있는 6,800개 이상의 단어: NGSL 핵심 어휘, 학술 어휘 목록(AWL), TOEIC 단어, IELTS 주제별 단어, 구동사, 연어.
• Anki도 사용하는 간격 반복 알고리즘 FSRS로 플래시카드를 관리해 잊기 직전에 복습합니다.
• 사전: 영국식·미국식 발음, 품사별 뜻, 정의, 예문. 한 번 탭으로 플래시카드에 저장.
• 시험 연습: 밴드 환산이 되는 IELTS 4개 영역 모의고사, TOEIC Listening & Reading 실전 테스트(10–990점), TOEFL iBT 영역별 연습, 5분 레벨 테스트, 해설과 점수 기록.
• 문법, 자주 하는 실수 정리, 듣기와 받아쓰기, 발음 연습, 읽기 지문, 게임.
• AI 작문 피드백과 롤플레이 대화(인터넷 연결 필요).
• 복습과 학습은 오프라인에서도 가능하며, 새 단어 검색과 AI 기능은 인터넷이 필요합니다.
• 홈 화면 위젯, 매일 알림, 연속 학습일, 목표, 통계, 다크 모드.
• 15개 언어 인터페이스. 학습 데이터는 기기에 저장됩니다.

개인정보처리방침: https://lexkite.com/ko/privacy · 문의: support@lexkite.com

Lexkite는 독립 제품이며 British Council, IDP, Cambridge University Press & Assessment, ETS와 제휴하거나 승인을 받지 않았습니다. IELTS, TOEIC, TOEFL은 각 소유자의 상표입니다.
```

### हिन्दी (hi-IN)

**ऐप का नाम:**
```
Lexkite: अंग्रेज़ी शब्दावली
```
**छोटा विवरण:**
```
FSRS फ़्लैशकार्ड से अंग्रेज़ी शब्द सीखें, IELTS, TOEIC, TOEFL की मुफ़्त तैयारी
```
**पूरा विवरण:**
```
Lexkite अंग्रेज़ी शब्दावली सीखने और IELTS, TOEIC व TOEFL की तैयारी के लिए एक मुफ़्त ऐप है। कोई खाता या लॉगिन ज़रूरी नहीं।

• IPA और ऑडियो के साथ 6,800+ शब्द: NGSL के मुख्य शब्द, Academic Word List, TOEIC शब्द, IELTS विषयों के शब्द, phrasal verbs और collocations.
• FSRS से तय होने वाले फ़्लैशकार्ड – वही spaced repetition एल्गोरिद्म जिसे Anki भी इस्तेमाल करता है – ताकि आप हर शब्द भूलने से ठीक पहले दोहराएँ।
• शब्दकोश: ब्रिटिश और अमेरिकी उच्चारण, शब्द-भेद के अनुसार अर्थ, परिभाषाएँ और उदाहरण; एक टैप में शब्द सहेजें।
• परीक्षा अभ्यास: band रूपांतरण के साथ IELTS मॉक टेस्ट, पूरे TOEIC Listening & Reading टेस्ट (10–990), TOEFL iBT का भाग-वार अभ्यास, 5 मिनट का लेवल टेस्ट, उत्तरों की व्याख्या और स्कोर इतिहास।
• व्याकरण, आम गलतियों पर नोट्स, सुनना और डिक्टेशन, उच्चारण अभ्यास, पठन और गेम।
• आपके लेखन पर AI फ़ीडबैक और रोलप्ले बातचीत (इंटरनेट ज़रूरी)।
• दोहराने और पढ़ने के लिए ऑफ़लाइन भी चलता है; नए शब्द खोजने और AI सुविधाओं के लिए इंटरनेट चाहिए।
• होम स्क्रीन विजेट, रोज़ाना रिमाइंडर, लगातार दिनों की स्ट्रीक, लक्ष्य, आँकड़े और डार्क मोड।
• 15 भाषाओं में इंटरफ़ेस। आपका सीखने का डेटा आपके डिवाइस पर रहता है।

गोपनीयता नीति: https://lexkite.com/hi/privacy · सहायता: support@lexkite.com

Lexkite एक स्वतंत्र उत्पाद है और British Council, IDP, Cambridge University Press & Assessment या ETS से संबद्ध या उनके द्वारा समर्थित नहीं है। IELTS, TOEIC और TOEFL अपने-अपने स्वामियों के ट्रेडमार्क हैं।
```

### العربية (ar)

**اسم التطبيق:**
```
Lexkite: مفردات الإنجليزية
```
**وصف مختصر:**
```
تعلّم مفردات الإنجليزية ببطاقات FSRS وتدرّب على IELTS وTOEIC وTOEFL مجانًا
```
**الوصف الكامل:**
```
Lexkite تطبيق مجاني لتعلّم مفردات اللغة الإنجليزية والاستعداد لاختبارات IELTS وTOEIC وTOEFL. لا حاجة إلى حساب أو تسجيل دخول.

• أكثر من 6,800 كلمة مع النطق الصوتي (IPA) والصوت: الكلمات الأساسية NGSL، وقائمة الكلمات الأكاديمية AWL، وكلمات TOEIC، وموضوعات IELTS، والأفعال المركّبة والمتلازمات اللفظية.
• بطاقات تعليمية تُجدوَل بخوارزمية FSRS للتكرار المتباعد، وهي التي يستخدمها Anki أيضًا، لتراجع كل كلمة قبل أن تنساها مباشرة.
• قاموس: النطق البريطاني والأمريكي، والمعاني حسب نوع الكلمة، والتعريفات والأمثلة، مع حفظ الكلمة بلمسة واحدة.
• تدريب على الاختبارات: اختبار IELTS تجريبي بالمهارات الأربع مع تحويل الدرجة إلى band، واختبارات TOEIC كاملة للاستماع والقراءة (10–990)، وتدريب على أقسام TOEFL iBT، واختبار تحديد مستوى في 5 دقائق، مع شرح للإجابات وسجل للدرجات.
• القواعد، وملاحظات عن الأخطاء الشائعة، والاستماع والإملاء، والتدريب على النطق، ونصوص القراءة، والألعاب.
• ملاحظات بالذكاء الاصطناعي على كتابتك ومحادثات لعب الأدوار (يتطلب الاتصال بالإنترنت).
• يعمل دون اتصال للمراجعة والدراسة، أما البحث عن كلمات جديدة وميزات الذكاء الاصطناعي فتتطلب الإنترنت.
• أداة على الشاشة الرئيسية، وتذكيرات يومية، وسلسلة أيام التعلّم، وأهداف، وإحصاءات، ووضع داكن.
• واجهة بـ 15 لغة. تُحفظ بيانات تعلّمك على جهازك.

سياسة الخصوصية: https://lexkite.com/ar/privacy · الدعم: support@lexkite.com

Lexkite منتج مستقل وغير تابع أو معتمد من British Council أو IDP أو Cambridge University Press & Assessment أو ETS. إن IELTS وTOEIC وTOEFL علامات تجارية لأصحابها.
```

### Русский (ru-RU)

**Название:**
```
Lexkite: английские слова
```
**Краткое описание:**
```
Учите английские слова с карточками FSRS и готовьтесь к IELTS, TOEIC и TOEFL
```
**Полное описание:**
```
Lexkite — бесплатное приложение для изучения английской лексики и подготовки к IELTS, TOEIC и TOEFL. Не нужен ни аккаунт, ни вход.

• Более 6 800 слов с транскрипцией (IPA) и озвучкой: базовая лексика NGSL, Academic Word List, слова TOEIC, темы IELTS, фразовые глаголы и коллокации.
• Карточки по алгоритму интервального повторения FSRS, который использует и Anki: каждое слово вы повторяете прямо перед тем, как его забыть.
• Словарь: британское и американское произношение, значения по частям речи, определения и примеры; слово сохраняется в карточки одним касанием.
• Подготовка к экзаменам: пробный IELTS по четырём навыкам с пересчётом в band, полные тесты TOEIC Listening & Reading (10–990), тренировка разделов TOEFL iBT, 5-минутный тест уровня, разборы ответов и история результатов.
• Грамматика, разбор частых ошибок, аудирование и диктанты, тренировка произношения, тексты для чтения и игры.
• Отзыв ИИ на ваши тексты и ролевые диалоги (нужен интернет).
• Повторять и заниматься можно офлайн; поиск новых слов и функции ИИ требуют интернета.
• Виджет на главном экране, ежедневные напоминания, серии дней, цели, статистика и тёмная тема.
• Интерфейс на 15 языках. Данные обучения хранятся на вашем устройстве.

Конфиденциальность: https://lexkite.com/ru/privacy · Поддержка: support@lexkite.com

Lexkite — независимый продукт, не связанный с British Council, IDP, Cambridge University Press & Assessment или ETS и не одобренный ими. IELTS, TOEIC и TOEFL — товарные знаки их владельцев.
```

### Türkçe (tr-TR)

**Uygulama adı:**
```
Lexkite: İngilizce Kelime
```
**Kısa açıklama:**
```
FSRS kartlarıyla İngilizce kelime öğren, IELTS, TOEIC, TOEFL'a ücretsiz hazırlan
```
**Tam açıklama:**
```
Lexkite, İngilizce kelime öğrenmek ve IELTS, TOEIC ile TOEFL'a hazırlanmak için ücretsiz bir uygulamadır. Hesap veya giriş gerekmez.

• IPA ve sesli telaffuzla 6.800'den fazla kelime: NGSL temel kelimeleri, Academic Word List, TOEIC kelimeleri, IELTS konuları, phrasal verb'ler ve eşdizimler.
• Anki'nin de kullandığı aralıklı tekrar algoritması FSRS ile planlanan kartlar: her kelimeyi unutmadan hemen önce tekrar edersin.
• Sözlük: İngiliz ve Amerikan telaffuzu, sözcük türüne göre anlamlar, tanımlar ve örnekler; kelimeyi tek dokunuşla kaydet.
• Sınav pratiği: band dönüşümlü dört beceri IELTS deneme sınavı, tam TOEIC Listening & Reading testleri (10–990), bölüm bölüm TOEFL iBT pratiği, 5 dakikalık seviye testi, cevap açıklamaları ve puan geçmişi.
• Dilbilgisi, sık yapılan hatalar üzerine notlar, dinleme ve dikte, telaffuz pratiği, okuma metinleri ve oyunlar.
• Yazdıklarına yapay zekâ geri bildirimi ve rol yapma konuşmaları (internet gerekir).
• Tekrar ve çalışma için çevrimdışı çalışır; yeni kelime aramak ve yapay zekâ özellikleri internet gerektirir.
• Ana ekran widget'ı, günlük hatırlatıcılar, seri günler, hedefler, istatistikler ve karanlık mod.
• 15 dilde arayüz. Öğrenme verilerin cihazında saklanır.

Gizlilik: https://lexkite.com/tr/privacy · Destek: support@lexkite.com

Lexkite bağımsız bir üründür; British Council, IDP, Cambridge University Press & Assessment veya ETS ile bağlantılı değildir ve bunlar tarafından onaylanmamıştır. IELTS, TOEIC ve TOEFL, ilgili sahiplerinin ticari markalarıdır.
```
