# Lexkite – App Store listing (iOS · com.lexkite.app · App Store Connect app 6824714708)

Matches the Google Play listing (`store/play/LISTING.md`) and the privacy policy (`https://lexkite.com/en/privacy`, `content/legal/en/privacy.html`).
**Source of truth for all text = `store/apple/listing.json`.** The per-language section at the bottom of this file is generated from it
(`node scripts/asc-upload.mjs --check --write-md`; `--check` runs in `npm test`, so this file cannot drift).
Upload: workflow **iOS → ảnh App Store** (`.github/workflows/ios-shots.yml`, input `asc = dry-run | upload`) or locally
`ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_KEY_PATH=~/.config/lexkite/AuthKey_….p8 node scripts/asc-upload.mjs [--dry-run]`.
The script writes text, categories, copyright, review notes and screenshots of version 1.0 only while it is *Prepare for Submission*. It never submits for review and never touches pricing, availability, age rating or App Privacy.

Apple rules applied: no price / "free" / "best" / "#1" in name, subtitle, keywords or promotional text; no other platforms or apps named anywhere (Play's "also used by Anki" was removed); IELTS / TOEIC / TOEFL only in the description, promotional text and screenshots, descriptively, with the non-affiliation line, never in name / subtitle / keywords (Apple 2.3.7, 5.2.1); keywords comma-separated without spaces and without repeating words already in the name.

## App information

| Field | Value |
|---|---|
| Name (en-US) | `Lexkite: English Vocabulary` (27/30) |
| Subtitle (en-US) | `Flashcards & exam practice` (26/30) |
| Primary category | **Education** |
| Secondary category | **Reference** (dictionary, usage notes) |
| Content rights | "Does your app contain, show, or access third-party content?" → **Yes**, and **Yes, I have the necessary rights**: open-licensed word lists and examples (NGSL / NAWL / BSL CC BY-SA, Wiktionary via Free Dictionary API, Tatoeba CC BY), Openverse images with author + licence shown, YouTube clips via the official embedded player. Credits: privacy policy §16. |
| Copyright | `2026 MODIAN LUXURY JEWELRY LLC` (data controller / rights holder named in the privacy policy and terms) |
| Support URL | `https://lexkite.com/app/?hl=en#/contact` (contact form + `support@lexkite.com`; per-language `hl=` in each locale) |
| Marketing URL | `https://lexkite.com/en/` (per language: `/<lang>/`, Vietnamese = `/`) |
| Privacy policy URL | `https://lexkite.com/en/privacy` (per language: `/<lang>/privacy`) |
| Price | Free (set by the owner in *Pricing and Availability*; not touched by the script) |
| In-app purchases / ads | None / none in builds without the AdMob SDK (`web/js/ads/config.js` → `enabled: false`; SDK only with `ADS_NATIVE=1` – then `docs/STORE-READINESS.md` §E) |
| Export compliance | Already answered in the binary: `ITSAppUsesNonExemptEncryption = false` (HTTPS only) |
| Sign-in | Not offered in the iOS app (`web/js/sync.js` → `nativeNoAuth`); no demo account needed; Sign in with Apple only becomes mandatory when in-app sign-in is turned on |

## Age rating (App Store Connect → App Information → Age Rating → Edit)

Answers for the current questionnaire (2025+). Facts are for the **iOS build**: no sign-in, so no leaderboard / nicknames (those need a Google account, web only).

| Section | Question | Answer | Why |
|---|---|---|---|
| In-app controls | Parental controls | No | |
| | Age assurance | No | |
| Capabilities | Unrestricted web access | **No** | External links open in Safari; no in-app browser |
| | User-generated content | **No** | No content is shared between users in the iOS app (leaderboard needs sign-in, not available on iOS) |
| | Messaging and chat | **No** | No user-to-user messaging. Roleplay is a text conversation with an AI tutor – if the form asks about AI chatbots / generative AI, answer **Yes** (text only, educational, English practice) |
| | Advertising | **No** | No ad SDK |
| Mature themes | Profanity or crude humour · Horror/fear · Alcohol, tobacco or drugs | None · None · None | |
| Medical or wellness | Medical or treatment information · Health or wellness topics | None · No | |
| Sexuality or nudity | Mature or suggestive themes · Sexual content or nudity · Graphic sexual content | None · None · None | |
| Violence | Cartoon/fantasy · Realistic · Prolonged graphic/sadistic · Guns or other weapons | None · None · None · None | |
| Chance-based | Simulated gambling · Gambling · Contests · Loot boxes | None · No · None · No | Streaks/XP are not contests or prizes |
| Kids | Made for Kids | **No** | |
| **Override** | Age rating override | **13+** | The calculated rating will be 4+. Privacy policy §10: not directed to children under 13; Play target audience 13+; free-form AI roleplay. Choosing the higher rating keeps all three consistent. |

## App Privacy (App Store Connect → App Privacy → Get Started / Edit)

"Do you or your third-party partners collect data from this app?" → **Yes**. Tracking: **No** for every type ("Data Used to Track You": none; no ATT prompt, no IDFA, `NSPrivacyTracking = false`).
Mapped line by line from privacy policy §2 (and the Play Data safety form, `docs/STORE-READINESS.md` § A2). Kept in sync with `mobile/ios/App/App/PrivacyInfo.xcprivacy`.

| Apple data type | Collected | Linked to user | Tracking | Purposes | Policy §2 row / code |
|---|---|---|---|---|---|
| Contact Info → **Name** | Yes (optional, contact form) | **Yes** | No | App Functionality | "Name, email address and message you send through the contact form" – `functions/api/contact.js` |
| Contact Info → **Email Address** | Yes (optional: contact form; problem-report updates if asked) | **Yes** | No | App Functionality | contact form row; "your email only if you ask for updates" – `contact.js`, `report.js` |
| User Content → **Customer Support** | Yes (contact messages, problem-report descriptions) | **Yes** | No | App Functionality | contact form + "Problem reports" rows |
| User Content → **Photos or Videos** | Yes (optional screenshot attached to a problem report) | **Yes** | No | App Functionality | "an optional screenshot" – `report.js` |
| User Content → **Other User Content** | Yes (essays, speaking transcripts, Roleplay messages sent for AI feedback) | No | No | App Functionality | "Text you submit for AI feedback" (Gemini / Workers AI; name and email not included, §6) – `functions/api/ai.js` |
| **Search History** | Yes (word / sentence looked up, sent to lookup services, not stored by us) | No | No | App Functionality | row 1 + §4 (Google Translate, Free Dictionary API…) – `dictionary.js` |
| Identifiers → **Device ID** | Yes (random visitor identifier; random device code + hashed IP for abuse limits) | No | No | Analytics, App Functionality (fraud prevention / security) | "Visitor identifier", "Abuse-prevention data" – `hit.js`, quota |
| Usage Data → **Product Interaction** | Yes (pages opened, time spent, pages viewed, returning visitor) | No | No | Analytics | "Usage statistics for each visit" – `/api/hit` |
| Location → **Coarse Location** | Yes (country derived by Cloudflare from IP; IP not stored) | No | No | Analytics | "country (determined by Cloudflare from your IP address…)" |
| Diagnostics → **Crash Data** | Yes (JS error message, code location, app version) | No | No | Analytics | "Technical error reports" |
| Diagnostics → **Performance Data** | Yes (page load speed) | No | No | Analytics | "page load speed" |
| Diagnostics → **Other Diagnostic Data** | Yes (device type, platform, screen size, app version in stats and problem reports) | No | No | Analytics, App Functionality | usage statistics + problem-report technical details |

**Not collected** (leave unticked): Health & Fitness, Financial Info, Sensitive Info, Contacts, Browsing History, Purchases, Precise Location, Physical Address, Phone Number, **User ID** (no sign-in on iOS), Audio Data (speech is recognised by iOS; we never receive audio – policy §2 "Microphone audio" row), Gameplay Content, Emails or Text Messages, Advertising Data, Other Data.
Privacy policy URL in App Privacy: `https://lexkite.com/en/privacy`. Privacy choices URL: leave empty (no ads / no tracking; deletion steps are in §9).
When in-app sign-in or AdMob is turned on: add Name / Email / User ID (Linked, App Functionality) and move learning data to Linked; ads → Device ID + Advertising Data + Tracking = Yes with ATT. Update `PrivacyInfo.xcprivacy`, Play Data safety and this table in the same release.

## App Review information

- Sign-in required: **No** (untick "Sign-in required").
- Contact information (first/last name, phone, email): **owner fills in** (`support@lexkite.com` + a phone number that answers).
- Notes: `reviewNotes` in `listing.json` (uploaded by the script) – full text in the generated section below.

## Screenshots

Built on GitHub Actions macOS from the **native iOS app running in the Simulator** (`.github/workflows/ios-shots.yml` → `scripts/ios-shots.mjs`), same 7 screens and headlines as Google Play (shared copy in `scripts/lib/app-shots-copy.mjs`): today's plan · FSRS review · dictionary · practice tests · usage note · progress · practice in dark mode. Same brand frame as the Play images (deep-teal background, amber/coral accent, logo from `web/icons/icon.svg`).

| Device | Size (px) | App Store display type | Files |
|---|---|---|---|
| iPhone 6.9" (iPhone 17 / 16 Pro Max simulator) | 1320 × 2868 | `APP_IPHONE_67` | `iphone-69/<lang>/1..7.png` |
| iPad 13" (iPad Pro 13-inch M5 / M4 simulator) – required because `TARGETED_DEVICE_FAMILY = 1,2` | 2064 × 2752 | `APP_IPAD_PRO_3GEN_129` | `ipad-13/<lang>/1..7.png` |

Stored on the orphan branch **`ios-shots`** (same convention as `play-shots`; tens of MB of PNG kept out of the main history) and as the run artifact `lexkite-appstore-shots`. Languages with headline copy: en (→ en-US), vi (→ vi). Other locales fall back to the en-US screenshots, as App Store Connect does when a localization has none. To add a language: headlines in `scripts/lib/app-shots-copy.mjs`, the workflow `langs` input, and `screenshotLangs` in `listing.json`.

## Localized metadata

<!-- BEGIN GENERATED: node scripts/asc-upload.mjs --write-md -->

### App Review notes (all locales)

```
Lexkite is an English vocabulary and exam-practice app. No login is required: sign-in is not offered in the iOS app, every feature works without an account and learning data is stored on the device, so no demo account is needed.

How to reach the main features (bottom tab bar: Today, Vocabulary, Skills, Tests, Me):
- Today: the daily plan of new words and reviews. On first launch, pick a goal on the welcome screen (or skip it) to create the first deck.
- Vocabulary: word lists and flashcard review (FSRS). Tap the card to flip it, then rate how well you remembered it.
- Dictionary: use the search box at the top and type any English word (looking up new words needs internet).
- Skills: listening, dictation, pronunciation, reading, games, AI writing feedback and Roleplay (AI conversation for English practice, processed by Google Gemini or Cloudflare Workers AI; needs internet). Hands-free audio study: tap the headphones button during a flashcard review session.
- Tests: placement test and IELTS / TOEIC / TOEFL practice tests with explanations.
- Me: streak, XP, statistics and Settings (daily reminder, interface language, dark mode, export backup, delete all study data, contact / report a problem).

Native iOS features: Home Screen and Lock Screen widgets (long-press the Home Screen, tap +, choose Lexkite), daily study reminders (local notifications; tapping one opens the review session), offline use (the whole app is bundled), haptic feedback, native text-to-speech, the share sheet for exports, and hands-free audio study that keeps playing with the screen locked (lock-screen controls), which is why the app declares the "audio" background mode.

The microphone and speech recognition are used only when the user taps the microphone button in speaking or pronunciation practice. The app has no in-app purchases. This build shows no ads (the AdMob SDK is not included); a future build may show labelled ads outside lessons, with Google UMP consent and App Tracking Transparency.

IELTS, TOEIC and TOEFL are mentioned only to describe practice content; Lexkite is not affiliated with their owners (stated at the end of the description).
```

### en-US

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: English Vocabulary` | 27/30 |
| Subtitle | `Vocab Builder & Flashcards` | 26/30 |
| Keywords | `words,dictionary,pronunciation,spaced repetition,grammar,ESL,learn,study,test prep,phrasal verbs,IPA` | 100/100 |
| Privacy policy URL | https://lexkite.com/en/privacy | |
| Support URL | https://lexkite.com/app/?hl=en#/contact | |
| Marketing URL | https://lexkite.com/en/ | |

**Promotional text (157/170):**
```
100% free English vocabulary practice: FSRS flashcards, a clear dictionary and IELTS, TOEIC & TOEFL practice tests. No subscription, no login, works offline.
```

**Description (2783/4000):**
```
Lexkite is a 100% free English vocabulary builder for everyday learners and for IELTS, TOEIC and TOEFL preparation. No subscription, no in-app purchases, no hearts or energy limits – and no account or login: open the app and start learning.

BUILD YOUR ENGLISH VOCABULARY
• 6,800+ words with IPA and audio: NGSL core words, the 570-word Academic Word List, 1,250 TOEIC words, IELTS topic vocabulary, phrasal verbs and collocations.
• A daily plan of new words and reviews, built around your goal and level.
• A 5-minute placement test shows where you are and suggests a study path.

FLASHCARDS THAT REMEMBER FOR YOU
• English flashcards scheduled by FSRS, a modern spaced repetition algorithm.
• After each card, rate how well you remembered it – the app schedules the next review right before you would forget.
• Daily reminders, plus Home Screen and Lock Screen widgets with your cards due today and your streak.

ENGLISH DICTIONARY WITH PRONUNCIATION
• UK and US pronunciation, meanings by part of speech, definitions and examples.
• Save any word to your flashcards in one tap.

IELTS, TOEIC AND TOEFL PRACTICE
• IELTS: four-skill mock test with band conversion, 40-question Listening tests and Reading practice.
• TOEIC: full Listening & Reading tests with a 10–990 score estimate.
• TOEFL iBT: practice by section – Reading, Listening, Writing and Speaking.
• Explanations for answers and a history of your scores.

GRAMMAR, USAGE AND SKILLS
• Grammar topics and a 40-question mixed grammar check.
• Clear notes on common mistakes, such as affect vs effect or interested vs interesting.
• Listening and dictation, pronunciation practice with your microphone, reading passages and word games.
• Hands-free audio study that keeps playing when your screen is locked.
• AI feedback on your writing and conversation roleplays (internet connection required).

MADE FOR EVERYDAY STUDY
• Works offline: review your flashcards and study without a connection. Looking up new words and AI features need internet.
• Streaks, daily goals, XP and progress statistics.
• Light and dark mode.
• Interface in 15 languages: English, Vietnamese, Spanish, Portuguese, French, German, Indonesian, Thai, Chinese, Japanese, Korean, Hindi, Arabic, Russian and Turkish.

PRIVATE BY DESIGN
• Your learning data is stored on your device. No ads during lessons, quizzes or tests.
• Privacy policy: https://lexkite.com/en/privacy

Learn English vocabulary a little every day – Lexkite keeps every feature free for everyone.

Questions or feedback: support@lexkite.com · https://lexkite.com

Lexkite is an independent product and is not affiliated with or endorsed by the British Council, IDP, Cambridge University Press & Assessment or ETS. IELTS, TOEIC and TOEFL are trademarks of their respective owners.
```

### vi

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Từ vựng tiếng Anh` | 26/30 |
| Subtitle | `Học từ mới, flashcard, tra từ` | 29/30 |
| Keywords | `từ điển,anh việt,phát âm,ngữ pháp,ôn tập,lặp lại ngắt quãng,luyện nghe,anh văn,IPA,luyện thi` | 92/100 |
| Privacy policy URL | https://lexkite.com/vi/privacy | |
| Support URL | https://lexkite.com/app/?hl=vi#/contact | |
| Marketing URL | https://lexkite.com/ | |

**Promotional text (167/170):**
```
Học từ vựng tiếng Anh miễn phí 100% với flashcard FSRS, tra từ rõ ràng và đề luyện IELTS, TOEIC, TOEFL. Không thu phí, không cần đăng nhập, học được khi không có mạng.
```

**Description (2684/4000):**
```
Lexkite là ứng dụng học từ vựng tiếng Anh miễn phí 100% cho người học hằng ngày và người luyện thi IELTS, TOEIC, TOEFL. Không có gói trả phí, không mua trong app, không giới hạn "tim" hay "năng lượng" – cũng không cần tài khoản hay đăng nhập: mở app là học được ngay.

HỌC TỪ VỰNG TIẾNG ANH ĐÚNG TRỌNG TÂM
• Hơn 6.800 từ có phiên âm IPA và phát âm: từ cốt lõi NGSL, 570 từ học thuật AWL, 1.250 từ vựng TOEIC, từ vựng IELTS theo chủ đề, phrasal verb và collocation.
• Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu và trình độ của bạn.
• Bài kiểm tra trình độ 5 phút cho biết bạn đang ở đâu và gợi ý lộ trình học.

FLASHCARD GIÚP NHỚ LÂU
• Flashcard tiếng Anh được lên lịch bằng FSRS – thuật toán lặp lại ngắt quãng hiện đại.
• Sau mỗi thẻ, bạn chấm mức độ nhớ – app hẹn lần ôn tiếp theo đúng lúc bạn sắp quên.
• Nhắc học hằng ngày, cùng widget trên Màn hình chính và Màn hình khóa hiện số thẻ cần ôn hôm nay và chuỗi ngày học.

TRA TỪ ANH–VIỆT, NGHE PHÁT ÂM CHUẨN
• Phát âm Anh–Anh và Anh–Mỹ, nghĩa theo từ loại, định nghĩa và ví dụ.
• Lưu từ vào flashcard chỉ với một chạm.

LUYỆN THI IELTS, TOEIC, TOEFL
• IELTS: thi thử 4 kỹ năng có quy đổi band, đề Listening 40 câu và luyện Reading.
• TOEIC: đề Listening & Reading đầy đủ, quy đổi điểm 10–990.
• TOEFL iBT: luyện theo từng phần Reading, Listening, Writing, Speaking.
• Có giải thích đáp án và lịch sử điểm.

NGỮ PHÁP, CÁCH DÙNG TỪ VÀ KỸ NĂNG
• Các chủ điểm ngữ pháp và bài kiểm tra ngữ pháp tổng hợp 40 câu.
• Giải thích rõ các lỗi hay gặp, như affect và effect, interested và interesting.
• Luyện nghe và chép chính tả, luyện phát âm bằng micro, bài đọc và trò chơi từ vựng.
• Học nghe rảnh tay, vẫn phát tiếp khi khóa màn hình.
• AI nhận xét bài viết và luyện hội thoại nhập vai (cần kết nối mạng).

HỌC MỖI NGÀY THẬT DỄ
• Dùng được khi không có mạng: ôn flashcard và học bình thường. Tra từ mới và các tính năng AI cần mạng.
• Chuỗi ngày học, mục tiêu ngày, điểm XP và thống kê tiến độ.
• Giao diện sáng và tối.
• Giao diện 15 ngôn ngữ: Tiếng Việt, tiếng Anh, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Indonesia, Thái, Trung, Nhật, Hàn, Hindi, Ả Rập, Nga và Thổ Nhĩ Kỳ.

TÔN TRỌNG QUYỀN RIÊNG TƯ
• Dữ liệu học được lưu trên thiết bị của bạn. Không có quảng cáo trong bài học, bài kiểm tra hay đề thi.
• Chính sách quyền riêng tư: https://lexkite.com/vi/privacy

Mỗi ngày học một ít từ vựng tiếng Anh – mọi tính năng của Lexkite đều miễn phí cho tất cả mọi người.

Góp ý, hỏi đáp: support@lexkite.com · https://lexkite.com

Lexkite là sản phẩm độc lập, không liên kết và không được bảo trợ bởi British Council, IDP, Cambridge University Press & Assessment hay ETS. IELTS, TOEIC, TOEFL là nhãn hiệu của các chủ sở hữu tương ứng.
```

### es-ES (also used for es-MX)

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Vocabulario en inglés` | 30/30 |
| Subtitle | `Tarjetas y práctica de examen` | 29/30 |
| Keywords | `diccionario,gramática,pronunciación,repaso,aprender,palabras,repetición espaciada,phrasal verbs` | 95/100 |
| Privacy policy URL | https://lexkite.com/es/privacy | |
| Support URL | https://lexkite.com/app/?hl=es#/contact | |
| Marketing URL | https://lexkite.com/es/ | |

**Promotional text (168/170):**
```
Practica vocabulario en inglés 100 % gratis: tarjetas FSRS, un diccionario claro y tests de IELTS, TOEIC y TOEFL. Sin suscripción, sin registro y con modo sin conexión.
```

**Description (3137/4000):**
```
Lexkite es una app 100 % gratuita para aprender vocabulario en inglés, pensada para el día a día y para preparar IELTS, TOEIC y TOEFL. Sin suscripción, sin compras dentro de la app, sin vidas ni límites de energía y sin cuenta ni registro: abres la app y empiezas a estudiar.

CONSTRUYE TU VOCABULARIO EN INGLÉS
• Más de 6.800 palabras con IPA y audio: vocabulario básico NGSL, la Academic Word List de 570 palabras, 1.250 palabras de TOEIC, vocabulario de IELTS por temas, phrasal verbs y colocaciones.
• Un plan diario de palabras nuevas y repasos, adaptado a tu objetivo y a tu nivel.
• Una prueba de nivel de 5 minutos te dice dónde estás y te propone un itinerario de estudio.

TARJETAS QUE RECUERDAN POR TI
• Tarjetas de inglés programadas con FSRS, un algoritmo moderno de repetición espaciada.
• Tras cada tarjeta indicas cuánto la has recordado, y la app programa el siguiente repaso justo antes de que se te olvide.
• Recordatorios diarios, y widgets para la pantalla de inicio y la pantalla de bloqueo con las tarjetas que te tocan hoy y tu racha.

DICCIONARIO DE INGLÉS CON PRONUNCIACIÓN
• Pronunciación británica y estadounidense, significados por categoría gramatical, definiciones y ejemplos.
• Guarda cualquier palabra en tus tarjetas con un solo toque.

PRÁCTICA DE IELTS, TOEIC Y TOEFL
• IELTS: simulacro de las cuatro destrezas con conversión a band, tests de Listening de 40 preguntas y práctica de Reading.
• TOEIC: tests completos de Listening & Reading con estimación de puntuación de 10–990.
• TOEFL iBT: práctica por secciones: Reading, Listening, Writing y Speaking.
• Explicaciones de las respuestas e historial de tus puntuaciones.

GRAMÁTICA, USO Y DESTREZAS
• Temas de gramática y un test de gramática mixto de 40 preguntas.
• Notas claras sobre errores frecuentes, como affect vs effect o interested vs interesting.
• Comprensión oral y dictado, práctica de pronunciación con el micrófono, textos de lectura y juegos de palabras.
• Estudio con audio manos libres que sigue sonando con la pantalla bloqueada.
• Comentarios de IA sobre tu redacción y conversaciones de rol (requiere conexión a internet).

PENSADA PARA ESTUDIAR A DIARIO
• Funciona sin conexión: repasa tus tarjetas y estudia sin internet. Buscar palabras nuevas y las funciones de IA sí la necesitan.
• Rachas, objetivos diarios, XP y estadísticas de progreso.
• Modo claro y modo oscuro.
• Interfaz en 15 idiomas: inglés, vietnamita, español, portugués, francés, alemán, indonesio, tailandés, chino, japonés, coreano, hindi, árabe, ruso y turco.

PRIVADA POR DISEÑO
• Tus datos de aprendizaje se guardan en tu dispositivo. Sin anuncios durante las lecciones, los cuestionarios ni los exámenes.
• Política de privacidad: https://lexkite.com/es/privacy

Aprende vocabulario en inglés un poco cada día: Lexkite mantiene todas sus funciones gratis para todo el mundo.

Dudas o comentarios: support@lexkite.com · https://lexkite.com

Lexkite es un producto independiente y no está afiliado ni respaldado por el British Council, IDP, Cambridge University Press & Assessment ni ETS. IELTS, TOEIC y TOEFL son marcas de sus respectivos propietarios.
```

### pt-BR

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Vocabulário em inglês` | 30/30 |
| Subtitle | `Flashcards e simulados` | 22/30 |
| Keywords | `dicionário,gramática,pronúncia,revisão,aprender,palavras,repetição espaçada,phrasal verbs,estudar` | 97/100 |
| Privacy policy URL | https://lexkite.com/pt/privacy | |
| Support URL | https://lexkite.com/app/?hl=pt#/contact | |
| Marketing URL | https://lexkite.com/pt/ | |

**Promotional text (164/170):**
```
Pratique vocabulário em inglês 100% grátis: flashcards com FSRS, dicionário claro e simulados de IELTS, TOEIC e TOEFL. Sem assinatura, sem login e funciona offline.
```

**Description (3058/4000):**
```
O Lexkite é um app 100% gratuito para aprender vocabulário em inglês, feito para o dia a dia e para quem se prepara para IELTS, TOEIC e TOEFL. Sem assinatura, sem compras no app, sem vidas nem limites de energia e sem precisar de conta ou login: abra o app e comece a estudar.

CONSTRUA SEU VOCABULÁRIO EM INGLÊS
• Mais de 6.800 palavras com IPA e áudio: vocabulário essencial NGSL, a Academic Word List de 570 palavras, 1.250 palavras do TOEIC, vocabulário do IELTS por tema, phrasal verbs e colocações.
• Um plano diário de palavras novas e revisões, montado de acordo com o seu objetivo e o seu nível.
• Um teste de nível de 5 minutos mostra onde você está e sugere um caminho de estudo.

FLASHCARDS QUE LEMBRAM POR VOCÊ
• Flashcards de inglês agendados pelo FSRS, um algoritmo moderno de repetição espaçada.
• Depois de cada card, você avalia o quanto lembrou, e o app agenda a próxima revisão pouco antes de você esquecer.
• Lembretes diários, além de widgets na tela de início e na tela de bloqueio com os cards de hoje e a sua sequência.

DICIONÁRIO DE INGLÊS COM PRONÚNCIA
• Pronúncia britânica e americana, significados por classe gramatical, definições e exemplos.
• Salve qualquer palavra nos seus flashcards com um toque.

PRÁTICA DE IELTS, TOEIC E TOEFL
• IELTS: simulado das quatro habilidades com conversão para band, testes de Listening de 40 questões e prática de Reading.
• TOEIC: testes completos de Listening & Reading com estimativa de nota de 10–990.
• TOEFL iBT: prática por seção: Reading, Listening, Writing e Speaking.
• Explicações das respostas e histórico das suas notas.

GRAMÁTICA, USO E HABILIDADES
• Tópicos de gramática e um teste de gramática misto com 40 questões.
• Notas claras sobre erros comuns, como affect vs effect ou interested vs interesting.
• Compreensão oral e ditado, prática de pronúncia com o microfone, textos para leitura e jogos de palavras.
• Estudo por áudio no modo mãos livres, que continua tocando com a tela bloqueada.
• Feedback de IA sobre a sua escrita e conversas de roleplay (requer conexão com a internet).

FEITO PARA ESTUDAR TODO DIA
• Funciona offline: revise seus flashcards e estude sem conexão. Consultar palavras novas e os recursos de IA precisam de internet.
• Sequências, metas diárias, XP e estatísticas de progresso.
• Modo claro e modo escuro.
• Interface em 15 idiomas: inglês, vietnamita, espanhol, português, francês, alemão, indonésio, tailandês, chinês, japonês, coreano, hindi, árabe, russo e turco.

PRIVADO POR PROJETO
• Seus dados de estudo ficam no seu dispositivo. Sem anúncios durante as lições, os quizzes ou as provas.
• Política de privacidade: https://lexkite.com/pt/privacy

Aprenda vocabulário em inglês um pouco a cada dia: o Lexkite mantém todos os recursos gratuitos para todo mundo.

Dúvidas ou sugestões: support@lexkite.com · https://lexkite.com

O Lexkite é um produto independente e não é afiliado nem endossado pelo British Council, IDP, Cambridge University Press & Assessment ou ETS. IELTS, TOEIC e TOEFL são marcas de seus respectivos proprietários.
```

### fr-FR

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite : vocabulaire anglais` | 29/30 |
| Subtitle | `Cartes mémoire, examens blancs` | 30/30 |
| Keywords | `dictionnaire,grammaire,prononciation,révision,apprendre,mots,répétition espacée,flashcards,écoute` | 97/100 |
| Privacy policy URL | https://lexkite.com/fr/privacy | |
| Support URL | https://lexkite.com/app/?hl=fr#/contact | |
| Marketing URL | https://lexkite.com/fr/ | |

**Promotional text (162/170):**
```
Pratiquez le vocabulaire anglais, 100 % gratuit : flashcards FSRS, dictionnaire clair et tests IELTS, TOEIC et TOEFL. Sans abonnement ni connexion, et hors ligne.
```

**Description (3289/4000):**
```
Lexkite est une application 100 % gratuite pour apprendre le vocabulaire anglais, conçue pour le quotidien comme pour préparer l'IELTS, le TOEIC et le TOEFL. Sans abonnement, sans achats intégrés, sans vies ni limites d'énergie, et sans compte ni connexion : ouvrez l'application et lancez-vous.

ENRICHISSEZ VOTRE VOCABULAIRE ANGLAIS
• Plus de 6 800 mots avec API et audio : vocabulaire essentiel NGSL, Academic Word List de 570 mots, 1 250 mots du TOEIC, vocabulaire de l'IELTS par thème, phrasal verbs et collocations.
• Un programme quotidien de mots nouveaux et de révisions, adapté à votre objectif et à votre niveau.
• Un test de niveau de 5 minutes vous situe et vous suggère un parcours d'étude.

DES FLASHCARDS QUI SE SOUVIENNENT POUR VOUS
• Des flashcards d'anglais planifiées par FSRS, un algorithme moderne de répétition espacée.
• Après chaque carte, indiquez à quel point vous vous en souveniez : l'application programme la prochaine révision juste avant que vous n'oubliiez.
• Rappels quotidiens, ainsi que des widgets pour l'écran d'accueil et l'écran verrouillé avec les cartes à réviser aujourd'hui et votre série.

DICTIONNAIRE ANGLAIS AVEC PRONONCIATION
• Prononciation britannique et américaine, sens par classe grammaticale, définitions et exemples.
• Ajoutez n'importe quel mot à vos flashcards d'un simple toucher.

ENTRAÎNEMENT À L'IELTS, AU TOEIC ET AU TOEFL
• IELTS : examen blanc des quatre compétences avec conversion en band, tests de Listening de 40 questions et entraînement à la lecture.
• TOEIC : tests Listening & Reading complets avec estimation du score de 10–990.
• TOEFL iBT : entraînement par section : Reading, Listening, Writing et Speaking.
• Explications des réponses et historique de vos scores.

GRAMMAIRE, USAGE ET COMPÉTENCES
• Des thèmes de grammaire et un test de grammaire mixte de 40 questions.
• Des fiches claires sur les erreurs fréquentes, comme affect vs effect ou interested vs interesting.
• Compréhension orale et dictée, entraînement à la prononciation avec le micro, textes de lecture et jeux de mots.
• Écoute mains libres qui continue même écran verrouillé.
• Retours de l'IA sur vos écrits et dialogues en jeu de rôle (connexion Internet requise).

CONÇUE POUR ÉTUDIER AU QUOTIDIEN
• Fonctionne hors ligne : révisez vos flashcards et étudiez sans connexion. La recherche de nouveaux mots et les fonctions d'IA nécessitent Internet.
• Séries, objectifs quotidiens, XP et statistiques de progression.
• Mode clair et mode sombre.
• Interface en 15 langues : anglais, vietnamien, espagnol, portugais, français, allemand, indonésien, thaï, chinois, japonais, coréen, hindi, arabe, russe et turc.

RESPECTUEUSE DE VOTRE VIE PRIVÉE
• Vos données d'apprentissage restent sur votre appareil. Aucune publicité pendant les leçons, les quiz ou les tests.
• Politique de confidentialité : https://lexkite.com/fr/privacy

Enrichissez votre vocabulaire anglais un peu chaque jour : Lexkite garde toutes ses fonctions gratuites pour tout le monde.

Une question, un avis ? support@lexkite.com · https://lexkite.com

Lexkite est un produit indépendant, sans lien avec le British Council, IDP, Cambridge University Press & Assessment ou ETS, et non approuvé par eux. IELTS, TOEIC et TOEFL sont des marques de leurs propriétaires respectifs.
```

### de-DE

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Englisch-Vokabeln` | 26/30 |
| Subtitle | `Karteikarten & Vokabeltrainer` | 29/30 |
| Keywords | `Wörterbuch,Aussprache,Grammatik,Wörter,lernen,Wortschatz,Hörverstehen,Diktat,Wiederholung,IPA,Test` | 98/100 |
| Privacy policy URL | https://lexkite.com/de/privacy | |
| Support URL | https://lexkite.com/app/?hl=de#/contact | |
| Marketing URL | https://lexkite.com/de/ | |

**Promotional text (168/170):**
```
Englisch-Vokabeln lernen, 100 % kostenlos: FSRS-Karteikarten, ein klares Wörterbuch und Übungstests für IELTS, TOEIC und TOEFL. Kein Abo, keine Anmeldung, auch offline.
```

**Description (3169/4000):**
```
Lexkite ist die 100 % kostenlose App, um Englisch-Vokabeln zu lernen – für den Alltag und für die Vorbereitung auf IELTS, TOEIC und TOEFL. Kein Abo, keine In-App-Käufe, keine Herzen oder Energie-Limits – und kein Konto, keine Anmeldung: App öffnen und loslegen.

ENGLISCH-VOKABELN GEZIELT LERNEN
• Über 6.800 Wörter mit Lautschrift (IPA) und Audio: Grundwortschatz (NGSL), die 570 Wörter der Academic Word List, 1.250 TOEIC-Wörter, IELTS-Themenwortschatz, Phrasal Verbs und Kollokationen.
• Ein Tagesplan mit neuen Wörtern und Wiederholungen, passend zu deinem Ziel und Niveau.
• Ein 5-minütiger Einstufungstest zeigt, wo du stehst, und schlägt einen Lernweg vor.

KARTEIKARTEN, DIE FÜR DICH MITDENKEN
• Englische Karteikarten, geplant mit FSRS, einem modernen Algorithmus für verteilte Wiederholung.
• Nach jeder Karte bewertest du, wie gut du dich erinnert hast – die App legt die nächste Wiederholung kurz vor das Vergessen.
• Tägliche Erinnerungen, dazu Widgets für Home-Bildschirm und Sperrbildschirm mit den heute fälligen Karten und deiner Lernserie.

ENGLISCH-WÖRTERBUCH MIT AUSSPRACHE
• Britische und amerikanische Aussprache, Bedeutungen nach Wortart, Definitionen und Beispiele.
• Jedes Wort mit einem Tipp in deine Karteikarten übernehmen.

IELTS, TOEIC UND TOEFL ÜBEN
• IELTS: Probetest für alle vier Fertigkeiten mit Band-Umrechnung, Listening-Tests mit 40 Fragen und Reading-Training.
• TOEIC: vollständige Tests für Listening & Reading mit Punkteschätzung von 10–990.
• TOEFL iBT: Training nach Prüfungsteilen – Reading, Listening, Writing und Speaking.
• Erklärungen zu den Antworten und ein Verlauf deiner Ergebnisse.

GRAMMATIK, WORTGEBRAUCH UND FERTIGKEITEN
• Grammatikthemen und ein gemischter Grammatik-Check mit 40 Fragen.
• Klare Hinweise zu typischen Fehlern, etwa affect vs. effect oder interested vs. interesting.
• Hörverstehen und Diktat, Ausspracheübungen mit dem Mikrofon, Lesetexte und Wortspiele.
• Freihändiges Lernen mit Audio, das auch bei gesperrtem Bildschirm weiterläuft.
• KI-Feedback zu deinen Texten und Rollenspiel-Gespräche (Internetverbindung erforderlich).

FÜRS TÄGLICHE LERNEN GEMACHT
• Funktioniert offline: Karteikarten wiederholen und lernen ohne Verbindung. Das Nachschlagen neuer Wörter und die KI-Funktionen brauchen Internet.
• Lernserien, Tagesziele, XP und Fortschrittsstatistiken.
• Heller und dunkler Modus.
• Oberfläche in 15 Sprachen: Englisch, Vietnamesisch, Spanisch, Portugiesisch, Französisch, Deutsch, Indonesisch, Thailändisch, Chinesisch, Japanisch, Koreanisch, Hindi, Arabisch, Russisch und Türkisch.

PRIVATSPHÄRE VON ANFANG AN
• Deine Lerndaten werden auf deinem Gerät gespeichert. Keine Werbung während Lektionen, Quizzen oder Tests.
• Datenschutzerklärung: https://lexkite.com/de/privacy

Englisch-Vokabeln lernen, jeden Tag ein bisschen – Lexkite hält alle Funktionen für alle kostenlos.

Fragen oder Feedback: support@lexkite.com · https://lexkite.com

Lexkite ist ein unabhängiges Produkt und steht in keiner Verbindung zu British Council, IDP, Cambridge University Press & Assessment oder ETS und wird von diesen nicht unterstützt. IELTS, TOEIC und TOEFL sind Marken ihrer jeweiligen Inhaber.
```

### id

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Kosakata Inggris` | 25/30 |
| Subtitle | `Kartu hafalan bahasa Inggris` | 28/30 |
| Keywords | `kamus,pelafalan,tata,belajar,flashcard,kata,ujian,listening,dikte,IPA,kuis,pemula,offline,ulasan` | 96/100 |
| Privacy policy URL | https://lexkite.com/id/privacy | |
| Support URL | https://lexkite.com/app/?hl=id#/contact | |
| Marketing URL | https://lexkite.com/id/ | |

**Promotional text (158/170):**
```
Kosakata bahasa Inggris 100% gratis: kartu hafalan FSRS, kamus yang jelas, serta tes latihan IELTS, TOEIC & TOEFL. Tanpa langganan, tanpa login, bisa offline.
```

**Description (2941/4000):**
```
Lexkite adalah aplikasi kosakata bahasa Inggris yang 100% gratis untuk pembelajar sehari-hari dan persiapan IELTS, TOEIC, dan TOEFL. Tanpa langganan, tanpa pembelian dalam aplikasi, tanpa batas "nyawa" atau energi – dan tanpa akun atau login: buka aplikasinya, langsung belajar.

MEMBANGUN KOSAKATA BAHASA INGGRIS
• Lebih dari 6.800 kata dengan IPA dan audio: kosakata inti NGSL, Academic Word List 570 kata, 1.250 kata TOEIC, kosakata topik IELTS, phrasal verb, dan kolokasi.
• Rencana harian berisi kata baru dan ulasan, disesuaikan dengan target dan levelmu.
• Tes penempatan 5 menit menunjukkan posisimu dan menyarankan jalur belajar.

KARTU HAFALAN YANG MENGINGATKAN UNTUKMU
• Kartu hafalan bahasa Inggris dijadwalkan oleh FSRS, algoritma pengulangan berjarak yang modern.
• Setelah tiap kartu, nilai seberapa baik kamu mengingatnya – aplikasi menjadwalkan ulasan berikutnya tepat sebelum kamu lupa.
• Pengingat harian, plus widget Layar Utama dan Layar Kunci berisi kartu yang jatuh tempo hari ini serta runtunan harimu.

KAMUS DENGAN PELAFALAN
• Pelafalan Inggris Britania (UK) dan Amerika (US), arti menurut jenis kata, definisi, dan contoh.
• Simpan kata apa pun ke kartu hafalanmu dengan satu ketukan.

LATIHAN IELTS, TOEIC, DAN TOEFL
• IELTS: tes simulasi empat keterampilan dengan konversi band, tes Listening 40 soal, dan latihan Reading.
• TOEIC: tes Listening & Reading lengkap dengan perkiraan skor 10–990.
• TOEFL iBT: latihan per bagian – Reading, Listening, Writing, dan Speaking.
• Pembahasan jawaban dan riwayat skormu.

TATA BAHASA, PENGGUNAAN KATA, DAN KETERAMPILAN
• Topik tata bahasa dan cek tata bahasa campuran 40 soal.
• Catatan kesalahan umum, misalnya affect vs effect atau interested vs interesting.
• Listening dan dikte, latihan pelafalan dengan mikrofon, bacaan, dan permainan kata.
• Belajar lewat audio tanpa memegang ponsel, tetap berputar saat layar terkunci.
• Masukan AI untuk tulisanmu dan percakapan roleplay (perlu internet).

BELAJAR JADI MUDAH SETIAP HARI
• Bisa dipakai offline: ulangi kartu hafalan dan belajar tanpa koneksi. Mencari kata baru dan fitur AI perlu internet.
• Runtunan hari, target harian, XP, dan statistik kemajuan.
• Mode terang dan gelap.
• Antarmuka dalam 15 bahasa: Inggris, Vietnam, Spanyol, Portugis, Prancis, Jerman, Indonesia, Thai, Mandarin, Jepang, Korea, Hindi, Arab, Rusia, dan Turki.

PRIVASI TERJAGA
• Data belajarmu disimpan di perangkatmu. Tanpa iklan saat pelajaran, kuis, atau tes.
• Kebijakan privasi: https://lexkite.com/id/privacy

Belajar kosakata bahasa Inggris sedikit demi sedikit setiap hari – Lexkite membuat semua fiturnya gratis untuk semua orang.

Pertanyaan atau masukan: support@lexkite.com · https://lexkite.com

Lexkite adalah produk independen dan tidak berafiliasi dengan atau didukung oleh British Council, IDP, Cambridge University Press & Assessment, maupun ETS. IELTS, TOEIC, dan TOEFL adalah merek dagang milik pemiliknya masing-masing.
```

### th

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: คำศัพท์ภาษาอังกฤษ` | 26/30 |
| Subtitle | `แฟลชการ์ดและฝึกทำข้อสอบ` | 23/30 |
| Keywords | `ศัพท์อังกฤษ,พจนานุกรม,ไวยากรณ์,ออกเสียง,ทบทวน,ท่องศัพท์,ออฟไลน์,ฟัง,เขียนตามคำบอก,เตรียมสอบ,vocab` | 97/100 |
| Privacy policy URL | https://lexkite.com/th/privacy | |
| Support URL | https://lexkite.com/app/?hl=th#/contact | |
| Marketing URL | https://lexkite.com/th/ | |

**Promotional text (136/170):**
```
คำศัพท์ภาษาอังกฤษฟรี 100% ท่องวันละนิดด้วยแฟลชการ์ด FSRS พจนานุกรมอ่านง่าย และข้อสอบฝึก IELTS, TOEIC, TOEFL ไม่ต้องล็อกอิน ใช้ออฟไลน์ได้
```

**Description (2564/4000):**
```
Lexkite เป็นแอปเรียนคำศัพท์ภาษาอังกฤษที่ฟรี 100% สำหรับการเรียนทุกวันและการเตรียมสอบ IELTS, TOEIC, TOEFL ไม่มีค่าสมาชิก ไม่มีการซื้อในแอป ไม่จำกัดหัวใจหรือพลังงาน และไม่ต้องสมัครบัญชีหรือเข้าสู่ระบบ เปิดแอปแล้วเริ่มเรียนได้ทันที

เพิ่มคำศัพท์ภาษาอังกฤษของคุณ
• คำศัพท์กว่า 6,800 คำ พร้อมคำอ่าน IPA และเสียง: คำศัพท์พื้นฐาน NGSL, Academic Word List 570 คำ, คำศัพท์ TOEIC 1,250 คำ, หัวข้อ IELTS, phrasal verb และ collocation
• แผนรายวันที่รวมคำใหม่และการทบทวน จัดให้ตามเป้าหมายและระดับของคุณ
• แบบทดสอบวัดระดับ 5 นาทีบอกว่าตอนนี้คุณอยู่ตรงไหน พร้อมแนะนำแผนการเรียนที่เหมาะกับคุณ

แฟลชการ์ดที่จำให้คุณ
• แฟลชการ์ดภาษาอังกฤษที่จัดตารางทบทวนด้วย FSRS อัลกอริทึมทบทวนแบบเว้นระยะสมัยใหม่
• หลังจบแต่ละการ์ด ให้คะแนนว่าจำได้แค่ไหน แอปจะนัดทบทวนครั้งถัดไปก่อนที่คุณจะลืม
• การแจ้งเตือนรายวัน พร้อมวิดเจ็ตบนหน้าจอโฮมและหน้าจอล็อกที่แสดงการ์ดที่ต้องทบทวนวันนี้และสถิติเรียนต่อเนื่อง

พจนานุกรมพร้อมการออกเสียง
• ออกเสียงแบบอังกฤษ (UK) และอเมริกัน (US) ความหมายแยกตามชนิดของคำ คำจำกัดความ และตัวอย่าง
• บันทึกคำใดก็ได้ลงแฟลชการ์ดในแตะเดียว

ฝึกสอบ IELTS, TOEIC และ TOEFL
• IELTS: ข้อสอบจำลองครบ 4 ทักษะพร้อมแปลงเป็น band, ข้อสอบ Listening 40 ข้อ และแบบฝึก Reading
• TOEIC: ข้อสอบ Listening & Reading ฉบับเต็ม พร้อมประเมินคะแนน 10–990
• TOEFL iBT: ฝึกแยกตามพาร์ต ทั้ง Reading, Listening, Writing และ Speaking
• คำอธิบายเฉลยและประวัติคะแนนของคุณ

ไวยากรณ์ การใช้คำ และทักษะต่าง ๆ
• หัวข้อไวยากรณ์และแบบตรวจไวยากรณ์รวม 40 ข้อ
• บันทึกข้อผิดพลาดที่พบบ่อย เช่น affect กับ effect หรือ interested กับ interesting
• ฝึกฟังและเขียนตามคำบอก ฝึกออกเสียงด้วยไมโครโฟน บทอ่าน และเกมคำศัพท์
• เรียนด้วยเสียงแบบไม่ต้องใช้มือ เล่นต่อได้แม้ล็อกหน้าจอ
• AI ให้คำแนะนำงานเขียนและฝึกสนทนาแบบบทบาทสมมติ (ต้องใช้อินเทอร์เน็ต)

เรียนได้ง่ายทุกวัน
• ใช้งานออฟไลน์ได้: ทบทวนแฟลชการ์ดและเรียนได้โดยไม่ต้องต่ออินเทอร์เน็ต ส่วนการค้นหาคำใหม่และฟีเจอร์ AI ต้องใช้อินเทอร์เน็ต
• สถิติการเรียนต่อเนื่อง เป้าหมายรายวัน XP และสถิติความก้าวหน้า
• โหมดสว่างและโหมดมืด
• อินเทอร์เฟซ 15 ภาษา: อังกฤษ เวียดนาม สเปน โปรตุเกส ฝรั่งเศส เยอรมัน อินโดนีเซีย ไทย จีน ญี่ปุ่น เกาหลี ฮินดี อาหรับ รัสเซีย และตุรกี

เป็นส่วนตัวโดยออกแบบ
• ข้อมูลการเรียนของคุณเก็บไว้ในอุปกรณ์ ไม่มีโฆษณาระหว่างบทเรียน แบบทดสอบ หรือการสอบ
• นโยบายความเป็นส่วนตัว: https://lexkite.com/th/privacy

ท่องคำศัพท์ภาษาอังกฤษวันละนิด Lexkite เปิดทุกฟีเจอร์ให้ใช้ฟรีสำหรับทุกคน

มีคำถามหรือข้อเสนอแนะ: support@lexkite.com · https://lexkite.com

Lexkite เป็นผลิตภัณฑ์อิสระ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก British Council, IDP, Cambridge University Press & Assessment หรือ ETS โดย IELTS, TOEIC และ TOEFL เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย
```

### zh-Hans

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite：英语单词` | 12/30 |
| Subtitle | `背单词闪卡，词典与备考` | 11/30 |
| Keywords | `词汇,学英语,词典,发音,语法,听力,复习,间隔重复,单词本,英文,考试,短语动词,音标,离线,四六级,考研,词汇量,打卡,学习计划,例句,听写,小组件,生词本,记忆,背诵,拼写,近义词,同义词` | 97/100 |
| Privacy policy URL | https://lexkite.com/zh/privacy | |
| Support URL | https://lexkite.com/app/?hl=zh#/contact | |
| Marketing URL | https://lexkite.com/zh/ | |

**Promotional text (70/170):**
```
100% 免费的英语单词练习：FSRS 闪卡、清晰的词典，以及 IELTS、TOEIC、TOEFL 模考练习。无订阅、无需登录，可离线使用。
```

**Description (1226/4000):**
```
Lexkite 是一款 100% 免费的英语单词学习应用，适合日常积累，也适合 IELTS（雅思）、TOEIC（托业）、TOEFL（托福）备考。无订阅、无内购、没有红心或体力限制，也无需注册登录：打开就能开始学。

【积累英语单词】
• 6,800+ 单词，配音标（IPA）和真人发音：NGSL 核心词、570 词的学术词汇表（AWL）、1,250 个 TOEIC 词汇、IELTS 话题词汇、短语动词和固定搭配。
• 每日学习计划：新词加复习，根据你的目标和水平自动安排。
• 5 分钟水平测试，帮你了解当前词汇量，并推荐学习路径。

【闪卡，替你记住】
• 英语单词闪卡由现代间隔重复算法 FSRS 安排复习。
• 每张卡片学完后，评价自己记得多牢，应用会把下一次复习安排在你快要忘记之前。
• 每日提醒，以及显示今日待复习卡片和连续学习天数的主屏幕与锁定屏幕小组件。

【带发音的英语词典】
• 英式和美式发音、按词性分类的释义、定义和例句。
• 一键把任意单词加入闪卡。

【IELTS、TOEIC、TOEFL 备考练习】
• IELTS：四项技能模考，可换算分数段；含 40 题听力测试和阅读练习。
• TOEIC：完整的听力与阅读（Listening & Reading）试题，可估算 10–990 分。
• TOEFL iBT：按部分练习——阅读、听力、写作和口语。
• 每题附答案解析，并保存成绩记录。

【语法、用法与综合技能】
• 语法专题和 40 题综合语法测试。
• 常见错误讲解，如 affect 与 effect、interested 与 interesting。
• 听力与听写、用麦克风做发音练习、阅读短文和单词小游戏。
• 免手动音频学习，锁屏后也能继续播放。
• AI 点评你的写作，并可进行情景对话练习（需联网）。

【适合每天坚持学习】
• 可离线使用：没有网络也能复习闪卡、继续学习；查新词和 AI 功能需要联网。
• 连续学习天数、每日目标、经验值（XP）和学习统计。
• 浅色与深色模式。
• 15 种界面语言：英语、越南语、西班牙语、葡萄牙语、法语、德语、印尼语、泰语、中文、日语、韩语、印地语、阿拉伯语、俄语和土耳其语。

【隐私优先】
• 你的学习数据保存在你的设备上。学习、测验和考试过程中不显示广告。
• 隐私政策：https://lexkite.com/zh/privacy

每天背一点英语单词，Lexkite 让所有功能对所有人保持免费。

问题或建议：support@lexkite.com · https://lexkite.com

Lexkite 是独立产品，与 British Council、IDP、Cambridge University Press & Assessment 及 ETS 均无关联，亦未获其认可。IELTS、TOEIC 和 TOEFL 是其各自所有者的商标。
```

### ja

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite：英単語` | 11/30 |
| Subtitle | `単語カードと辞書で語彙力アップ` | 15/30 |
| Keywords | `英語,単語帳,文法,発音,リスニング,復習,暗記,語彙,英会話,間隔反復,オフライン,フラッシュカード,句動詞,例文,学習,ウィジェット,英熟語,ディクテーション,英語勉強,単語アプリ,暗記カード` | 98/100 |
| Privacy policy URL | https://lexkite.com/ja/privacy | |
| Support URL | https://lexkite.com/app/?hl=ja#/contact | |
| Marketing URL | https://lexkite.com/ja/ | |

**Promotional text (82/170):**
```
100% 無料の英単語練習：FSRS の単語カード、わかりやすい辞書、IELTS・TOEIC・TOEFL の模試。サブスクもログインも不要、オフラインでも使えます。
```

**Description (1544/4000):**
```
Lexkite は、100% 無料で使える英単語学習アプリです。毎日の英語学習にも、IELTS・TOEIC・TOEFL 対策にも使えます。サブスクなし、アプリ内課金なし、ハートやエネルギーの制限もなし。アカウント登録やログインも不要で、開けばすぐ学習を始められます。

■ 英単語を増やす
• 6,800 語以上を発音記号（IPA）と音声付きで収録：NGSL の基本語、570 語の Academic Word List、TOEIC 頻出語 1,250 語、IELTS のトピック別単語、句動詞、コロケーション。
• 新しい単語と復習をまとめた毎日の学習プラン。目標とレベルに合わせて組まれます。
• 5 分のレベル診断で現在地がわかり、学習の進め方も提案します。

■ 忘れる前に復習できる単語カード
• 英単語の単語カードは、最新の間隔反復アルゴリズム FSRS が復習タイミングを管理します。
• カードごとに覚えていた度合いを選ぶと、忘れる直前に次の復習がやってきます。
• 毎日のリマインダーと、今日の復習カード数や連続学習日数を表示するホーム画面・ロック画面ウィジェット。

■ 発音つきの英語辞書
• イギリス英語とアメリカ英語の発音、品詞別の意味、定義、例文。
• 気になった単語はワンタップで単語カードに保存。

■ IELTS・TOEIC・TOEFL の練習
• IELTS：4 技能の模試（バンド換算つき）、40 問のリスニングテスト、リーディング練習。
• TOEIC：Listening & Reading のフルテストで、10–990 点のスコアを目安として算出。
• TOEFL iBT：リーディング、リスニング、ライティング、スピーキングをセクション別に練習。
• 全問に解説つき。スコアの履歴も確認できます。

■ 文法・使い方・4 技能
• 文法トピックと、40 問の総合文法チェック。
• affect と effect、interested と interesting など、よくある間違いをわかりやすく解説。
• リスニングとディクテーション、マイクを使った発音練習、リーディング、単語ゲーム。
• 画面をロックしても再生が続く、ハンズフリーの音声学習。
• AI による英作文のフィードバックとロールプレイ会話（インターネット接続が必要）。

■ 毎日続けやすい設計
• オフライン対応：電波がなくても単語カードの復習や学習ができます。新しい単語の検索と AI 機能にはインターネットが必要です。
• 連続学習日数、毎日の目標、XP、学習統計。
• ライトモードとダークモード。
• 15 言語の表示に対応：英語、ベトナム語、スペイン語、ポルトガル語、フランス語、ドイツ語、インドネシア語、タイ語、中国語、日本語、韓国語、ヒンディー語、アラビア語、ロシア語、トルコ語。

■ プライバシーに配慮
• 学習データはお使いの端末に保存されます。レッスン・クイズ・テストの最中に広告は表示されません。
• プライバシーポリシー：https://lexkite.com/ja/privacy

英単語を毎日少しずつ。Lexkite は、すべての機能をみなさんに無料でお届けします。

ご質問・ご意見：support@lexkite.com · https://lexkite.com

Lexkite は独立した製品であり、British Council、IDP、Cambridge University Press & Assessment、ETS とは提携しておらず、承認も受けていません。IELTS、TOEIC、TOEFL は各所有者の商標です。
```

### ko

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: 영어 단어` | 14/30 |
| Subtitle | `플래시카드와 사전으로 암기` | 14/30 |
| Keywords | `단어장,영단어,사전,문법,발음,듣기,복습,외우기,어휘,영어공부,간격반복,오프라인,구동사,예문,위젯,회화,레벨테스트,수능,어휘력,받아쓰기,영문법,스펠링,기초영어,생활영어,초급,중급` | 99/100 |
| Privacy policy URL | https://lexkite.com/ko/privacy | |
| Support URL | https://lexkite.com/app/?hl=ko#/contact | |
| Marketing URL | https://lexkite.com/ko/ | |

**Promotional text (96/170):**
```
100% 무료 영어 단어 연습: FSRS 플래시카드, 알기 쉬운 사전, IELTS·TOEIC·TOEFL 모의고사. 구독도 로그인도 필요 없고, 오프라인에서도 쓸 수 있어요.
```

**Description (1618/4000):**
```
Lexkite는 100% 무료로 쓸 수 있는 영어 단어 학습 앱입니다. 일상 영어 공부는 물론 IELTS, TOEIC, TOEFL 준비에도 좋습니다. 구독도, 인앱 결제도, 하트나 에너지 제한도 없고, 계정이나 로그인도 필요 없습니다. 앱을 열고 바로 시작하세요.

■ 영어 단어 늘리기
• 발음기호(IPA)와 음성이 있는 6,800개 이상의 단어: NGSL 핵심 어휘, 570단어의 학술 어휘 목록(AWL), TOEIC 단어 1,250개, IELTS 주제별 단어, 구동사, 연어.
• 새 단어와 복습을 함께 담은 하루 학습 계획. 목표와 수준에 맞춰 짜 드립니다.
• 5분 레벨 테스트로 현재 실력을 확인하고 학습 방향을 추천받으세요.

■ 대신 기억해 주는 플래시카드
• 영어 단어 플래시카드는 최신 간격 반복 알고리즘 FSRS가 복습 시점을 관리합니다.
• 카드마다 얼마나 기억했는지 평가하면, 잊어버리기 직전에 다음 복습이 찾아옵니다.
• 매일 알림, 그리고 오늘 복습할 카드 수와 연속 학습일을 보여 주는 홈 화면·잠금 화면 위젯.

■ 발음이 있는 영어 사전
• 영국식·미국식 발음, 품사별 뜻, 정의, 예문.
• 궁금한 단어는 한 번 탭으로 플래시카드에 저장.

■ IELTS, TOEIC, TOEFL 연습
• IELTS: 밴드 환산이 되는 4개 영역 모의고사, 40문항 Listening 테스트, Reading 연습.
• TOEIC: Listening & Reading 실전 테스트로 10–990점 점수 예상.
• TOEFL iBT: Reading, Listening, Writing, Speaking 영역별 연습.
• 모든 문제에 해설이 있고, 점수 기록도 확인할 수 있습니다.

■ 문법, 쓰임, 4가지 기술
• 문법 주제와 40문항 종합 문법 점검.
• affect와 effect, interested와 interesting처럼 자주 하는 실수를 쉽게 정리.
• 듣기와 받아쓰기, 마이크를 이용한 발음 연습, 읽기 지문, 단어 게임.
• 화면을 잠가도 계속 재생되는 핸즈프리 오디오 학습.
• AI 작문 피드백과 롤플레이 대화(인터넷 연결 필요).

■ 매일 꾸준히 공부하도록
• 오프라인 지원: 연결이 없어도 플래시카드 복습과 학습이 가능합니다. 새 단어 검색과 AI 기능은 인터넷이 필요합니다.
• 연속 학습일, 일일 목표, XP, 학습 통계.
• 라이트 모드와 다크 모드.
• 15개 언어 인터페이스: 영어, 베트남어, 스페인어, 포르투갈어, 프랑스어, 독일어, 인도네시아어, 태국어, 중국어, 일본어, 한국어, 힌디어, 아랍어, 러시아어, 튀르키예어.

■ 개인정보 보호
• 학습 데이터는 내 기기에 저장됩니다. 수업, 퀴즈, 시험 중에는 광고가 없습니다.
• 개인정보처리방침: https://lexkite.com/ko/privacy

영어 단어를 매일 조금씩. Lexkite는 모든 기능을 모두에게 무료로 제공합니다.

문의 및 의견: support@lexkite.com · https://lexkite.com

Lexkite는 독립 제품이며 British Council, IDP, Cambridge University Press & Assessment, ETS와 제휴하거나 승인을 받지 않았습니다. IELTS, TOEIC, TOEFL은 각 소유자의 상표입니다.
```

### hi

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: English Vocabulary` | 27/30 |
| Subtitle | `फ़्लैशकार्ड और परीक्षा अभ्यास` | 29/30 |
| Keywords | `अंग्रेज़ी,शब्दावली,शब्दकोश,व्याकरण,उच्चारण,शब्द,सीखें,ऑफ़लाइन,मीनिंग,रिवीज़न,सुनना,ग्रामर,vocab,IPA` | 99/100 |
| Privacy policy URL | https://lexkite.com/hi/privacy | |
| Support URL | https://lexkite.com/app/?hl=hi#/contact | |
| Marketing URL | https://lexkite.com/hi/ | |

**Promotional text (154/170):**
```
100% मुफ़्त English Vocabulary अभ्यास: FSRS फ़्लैशकार्ड, साफ़ शब्दकोश और IELTS, TOEIC, TOEFL टेस्ट। कोई सब्सक्रिप्शन नहीं, लॉगिन नहीं, ऑफ़लाइन भी चलता है।
```

**Description (2721/4000):**
```
Lexkite अंग्रेज़ी शब्दावली सीखने का 100% मुफ़्त ऐप है – रोज़ English Vocabulary बढ़ाने वालों और IELTS, TOEIC, TOEFL की तैयारी करने वालों के लिए। कोई सब्सक्रिप्शन नहीं, कोई इन-ऐप ख़रीदारी नहीं, "लाइव्स" या एनर्जी की कोई सीमा नहीं – और खाता या लॉगिन भी नहीं: ऐप खोलिए और सीखना शुरू कीजिए।

अपनी English Vocabulary बढ़ाएँ
• IPA और ऑडियो के साथ 6,800+ शब्द: NGSL के मुख्य शब्द, 570 शब्दों की Academic Word List, 1,250 TOEIC शब्द, IELTS विषयों के शब्द, phrasal verbs और collocations।
• आपके लक्ष्य और स्तर के हिसाब से नए शब्दों और रिवीज़न का रोज़ाना प्लान।
• 5 मिनट का लेवल टेस्ट बताता है कि आप अभी कहाँ हैं और पढ़ाई का रास्ता सुझाता है।

फ़्लैशकार्ड जो आपके लिए याद रखें
• FSRS – एक आधुनिक spaced repetition एल्गोरिद्म – से तय होने वाले अंग्रेज़ी फ़्लैशकार्ड।
• हर कार्ड के बाद बताइए कि कितना याद रहा – ऐप अगला रिवीज़न आपके भूलने से ठीक पहले तय करता है।
• रोज़ाना रिमाइंडर, साथ में होम स्क्रीन और लॉक स्क्रीन विजेट, जिनमें आज के कार्ड और आपकी स्ट्रीक दिखती है।

उच्चारण के साथ अंग्रेज़ी शब्दकोश
• ब्रिटिश (UK) और अमेरिकी (US) उच्चारण, शब्द-भेद के अनुसार अर्थ, परिभाषाएँ और उदाहरण।
• किसी भी शब्द को एक टैप में अपने फ़्लैशकार्ड में सहेजें।

IELTS, TOEIC और TOEFL अभ्यास
• IELTS: band रूपांतरण के साथ चारों स्किल का मॉक टेस्ट, 40 सवालों के Listening टेस्ट और Reading अभ्यास।
• TOEIC: पूरे Listening & Reading टेस्ट, 10–990 स्कोर के अनुमान के साथ।
• TOEFL iBT: भाग-वार अभ्यास – Reading, Listening, Writing और Speaking।
• उत्तरों की व्याख्या और आपके स्कोर का इतिहास।

व्याकरण, शब्द-प्रयोग और स्किल्स
• व्याकरण के विषय और 40 सवालों की मिली-जुली ग्रामर जाँच।
• आम गलतियों पर साफ़ नोट्स, जैसे affect बनाम effect या interested बनाम interesting।
• सुनना और डिक्टेशन, माइक्रोफ़ोन से उच्चारण अभ्यास, पठन अंश और वर्ड गेम।
• हैंड्स-फ़्री ऑडियो पढ़ाई, जो स्क्रीन लॉक होने पर भी चलती रहती है।
• आपके लेखन पर AI फ़ीडबैक और रोलप्ले बातचीत (इंटरनेट ज़रूरी)।

रोज़ की पढ़ाई आसान
• ऑफ़लाइन भी चलता है: बिना कनेक्शन के फ़्लैशकार्ड दोहराएँ और पढ़ें। नए शब्द खोजने और AI सुविधाओं के लिए इंटरनेट चाहिए।
• लगातार दिनों की स्ट्रीक, रोज़ाना लक्ष्य, XP और प्रगति के आँकड़े।
• लाइट और डार्क मोड।
• 15 भाषाओं में इंटरफ़ेस: अंग्रेज़ी, वियतनामी, स्पेनिश, पुर्तगाली, फ़्रेंच, जर्मन, इंडोनेशियाई, थाई, चीनी, जापानी, कोरियाई, हिंदी, अरबी, रूसी और तुर्की।

डिज़ाइन से ही निजी
• आपका सीखने का डेटा आपके डिवाइस पर रहता है। पाठ, क्विज़ या टेस्ट के दौरान कोई विज्ञापन नहीं।
• गोपनीयता नीति: https://lexkite.com/hi/privacy

रोज़ थोड़ी English Vocabulary सीखिए – Lexkite की हर सुविधा सबके लिए मुफ़्त है।

सवाल या सुझाव: support@lexkite.com · https://lexkite.com

Lexkite एक स्वतंत्र उत्पाद है और British Council, IDP, Cambridge University Press & Assessment या ETS से संबद्ध या उनके द्वारा समर्थित नहीं है। IELTS, TOEIC और TOEFL अपने-अपने स्वामियों के ट्रेडमार्क हैं।
```

### ar-SA

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: كلمات إنجليزية` | 23/30 |
| Subtitle | `مفردات وبطاقات وتدريب يومي` | 26/30 |
| Keywords | `إنجليزي,انجليزي,تعلم,قاموس,قواعد,نطق,مراجعة,استماع,تكرار متباعد,أفعال مركبة,جمل,IPA,درس,اختبار,كلمة` | 99/100 |
| Privacy policy URL | https://lexkite.com/ar/privacy | |
| Support URL | https://lexkite.com/app/?hl=ar#/contact | |
| Marketing URL | https://lexkite.com/ar/ | |

**Promotional text (143/170):**
```
تعلّم كلمات إنجليزية مجانًا 100%: بطاقات FSRS وقاموس واضح واختبارات تدريبية لـ IELTS وTOEIC وTOEFL. بلا اشتراك ولا تسجيل دخول، ويعمل دون اتصال.
```

**Description (2679/4000):**
```
Lexkite تطبيق مجاني 100% لتعلّم الكلمات الإنجليزية وبناء الحصيلة اللغوية، سواء للدراسة اليومية أو للاستعداد لاختبارات IELTS وTOEIC وTOEFL. بلا اشتراك، وبلا مشتريات داخل التطبيق، وبلا قلوب أو حدود للطاقة، ولا حاجة إلى حساب أو تسجيل دخول: افتح التطبيق وابدأ التعلّم.

ابنِ رصيدك من الكلمات الإنجليزية
• أكثر من 6,800 كلمة مع النطق الصوتي (IPA) والصوت: الكلمات الأساسية NGSL، وقائمة الكلمات الأكاديمية AWL البالغة 570 كلمة، و1,250 كلمة من TOEIC، ومفردات موضوعات IELTS، والأفعال المركّبة والمتلازمات اللفظية.
• خطة يومية من الكلمات الجديدة والمراجعات، مبنية على هدفك ومستواك.
• اختبار تحديد مستوى في 5 دقائق يكشف مستواك ويقترح لك مسار الدراسة.

بطاقات تتذكّر عنك
• بطاقات للكلمات الإنجليزية تُجدوَل بخوارزمية FSRS، وهي خوارزمية حديثة للتكرار المتباعد.
• بعد كل بطاقة قيّم مدى تذكّرك للكلمة، فيحدد التطبيق موعد المراجعة التالية قبل أن تنساها مباشرة.
• تذكيرات يومية، وأدوات على الشاشة الرئيسية وشاشة القفل تعرض بطاقات اليوم وسلسلة أيامك.

قاموس إنجليزي مع النطق
• النطق البريطاني والأمريكي، والمعاني حسب نوع الكلمة، والتعريفات والأمثلة.
• احفظ أي كلمة في بطاقاتك بلمسة واحدة.

تدريب على IELTS وTOEIC وTOEFL
• IELTS: اختبار تجريبي بالمهارات الأربع مع تحويل الدرجة إلى band، واختبارات استماع من 40 سؤالًا وتدريب على القراءة.
• TOEIC: اختبارات كاملة للاستماع والقراءة مع تقدير للدرجة من 10 إلى 990.
• TOEFL iBT: تدريب حسب القسم: القراءة والاستماع والكتابة والمحادثة.
• شرح للإجابات وسجل لدرجاتك.

القواعد والاستخدام والمهارات
• موضوعات في القواعد واختبار قواعد متنوع من 40 سؤالًا.
• ملاحظات واضحة عن الأخطاء الشائعة، مثل affect وeffect أو interested وinteresting.
• الاستماع والإملاء، والتدريب على النطق عبر الميكروفون، ونصوص القراءة، وألعاب الكلمات.
• دراسة صوتية دون استخدام اليدين تستمر في العمل حتى مع قفل الشاشة.
• ملاحظات بالذكاء الاصطناعي على كتابتك ومحادثات لعب الأدوار (يتطلب الاتصال بالإنترنت).

صُمّم للدراسة اليومية
• يعمل دون اتصال: راجع بطاقاتك وادرس دون إنترنت. أما البحث عن كلمات جديدة وميزات الذكاء الاصطناعي فتتطلب الاتصال بالإنترنت.
• سلسلة أيام التعلّم، وأهداف يومية، ونقاط خبرة XP، وإحصاءات للتقدّم.
• وضع فاتح ووضع داكن.
• واجهة بـ 15 لغة: الإنجليزية والفيتنامية والإسبانية والبرتغالية والفرنسية والألمانية والإندونيسية والتايلاندية والصينية واليابانية والكورية والهندية والعربية والروسية والتركية.

خصوصيتك أولًا
• تُحفظ بيانات تعلّمك على جهازك. لا إعلانات أثناء الدروس أو الاختبارات القصيرة أو الامتحانات.
• سياسة الخصوصية: https://lexkite.com/ar/privacy

تعلّم الكلمات الإنجليزية قليلًا كل يوم، وسيبقى Lexkite مجانيًا بكل ميزاته للجميع.

للأسئلة والملاحظات: support@lexkite.com · https://lexkite.com

Lexkite منتج مستقل وغير تابع أو معتمد من British Council أو IDP أو Cambridge University Press & Assessment أو ETS. إن IELTS وTOEIC وTOEFL علامات تجارية لأصحابها.
```

### ru

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: английские слова` | 25/30 |
| Subtitle | `Карточки и пробные экзамены` | 27/30 |
| Keywords | `английский,словарь,грамматика,произношение,лексика,повторение,аудирование,учить,флешкарты,IPA` | 93/100 |
| Privacy policy URL | https://lexkite.com/ru/privacy | |
| Support URL | https://lexkite.com/app/?hl=ru#/contact | |
| Marketing URL | https://lexkite.com/ru/ | |

**Promotional text (169/170):**
```
Английские слова понемногу каждый день – 100 % бесплатно: карточки FSRS, понятный словарь и пробные тесты IELTS, TOEIC и TOEFL. Без подписки и аккаунта, работает офлайн.
```

**Description (2931/4000):**
```
Lexkite — полностью бесплатное (100 %) приложение, чтобы учить английские слова: для ежедневных занятий и подготовки к IELTS, TOEIC и TOEFL. Без подписки, без покупок в приложении, без «сердечек» и лимитов энергии — и без аккаунта: откройте приложение и начинайте учиться.

УЧИТЕ АНГЛИЙСКИЕ СЛОВА С УМОМ
• Более 6 800 слов с транскрипцией (IPA) и озвучкой: базовая лексика NGSL, 570 слов Academic Word List, 1 250 слов TOEIC, тематическая лексика IELTS, фразовые глаголы и коллокации.
• Ежедневный план из новых слов и повторений под вашу цель и уровень.
• 5-минутный тест уровня покажет, где вы сейчас, и предложит маршрут обучения.

КАРТОЧКИ, КОТОРЫЕ ПОМНЯТ ЗА ВАС
• Карточки по современному алгоритму интервального повторения FSRS.
• После каждой карточки вы отмечаете, как хорошо запомнили слово, — а приложение назначает повтор незадолго до того, как вы начнёте его забывать.
• Ежедневные напоминания, а также виджеты для экрана «Домой» и экрана блокировки с карточками на сегодня и вашей серией дней.

АНГЛИЙСКИЙ СЛОВАРЬ С ПРОИЗНОШЕНИЕМ
• Британское и американское произношение, значения по частям речи, определения и примеры.
• Любое слово можно добавить в карточки одним касанием.

ПОДГОТОВКА К IELTS, TOEIC И TOEFL
• IELTS: пробный экзамен по четырём навыкам с пересчётом в band, тесты Listening из 40 вопросов и тренировка Reading.
• TOEIC: полные тесты Listening & Reading с оценкой баллов от 10 до 990.
• TOEFL iBT: тренировка по разделам — Reading, Listening, Writing и Speaking.
• Разборы ответов и история ваших результатов.

ГРАММАТИКА, УПОТРЕБЛЕНИЕ И НАВЫКИ
• Темы по грамматике и смешанная проверка из 40 вопросов.
• Понятные пояснения к частым ошибкам, например affect и effect или interested и interesting.
• Аудирование и диктанты, тренировка произношения с микрофоном, тексты для чтения и игры со словами.
• Аудиозанятия без рук, которые продолжают играть при заблокированном экране.
• Отзыв ИИ на ваши тексты и ролевые диалоги (нужен интернет).

СОЗДАНО ДЛЯ ЕЖЕДНЕВНЫХ ЗАНЯТИЙ
• Работает офлайн: повторяйте карточки и занимайтесь без соединения. Для поиска новых слов и функций ИИ нужен интернет.
• Серии дней, ежедневные цели, XP и статистика прогресса.
• Светлая и тёмная темы.
• Интерфейс на 15 языках: английский, вьетнамский, испанский, португальский, французский, немецкий, индонезийский, тайский, китайский, японский, корейский, хинди, арабский, русский и турецкий.

ПРИВАТНОСТЬ ПО УМОЛЧАНИЮ
• Данные обучения хранятся на вашем устройстве. Без рекламы во время уроков, викторин и тестов.
• Политика конфиденциальности: https://lexkite.com/ru/privacy

Учите английские слова понемногу каждый день — Lexkite оставляет все функции бесплатными для всех.

Вопросы и отзывы: support@lexkite.com · https://lexkite.com

Lexkite — независимый продукт, не связанный с British Council, IDP, Cambridge University Press & Assessment или ETS и не одобренный ими. IELTS, TOEIC и TOEFL — товарные знаки их владельцев.
```

### tr

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: İngilizce Kelime` | 25/30 |
| Subtitle | `Kelime kartı ve sınav pratiği` | 29/30 |
| Keywords | `sözlük,dilbilgisi,gramer,telaffuz,tekrar,dinleme,öğren,ezberleme,vocabulary,flashcard,IPA,çalışma` | 97/100 |
| Privacy policy URL | https://lexkite.com/tr/privacy | |
| Support URL | https://lexkite.com/app/?hl=tr#/contact | |
| Marketing URL | https://lexkite.com/tr/ | |

**Promotional text (165/170):**
```
%100 ücretsiz İngilizce kelime çalışması: FSRS kartları, anlaşılır bir sözlük ve IELTS, TOEIC, TOEFL deneme testleri. Abonelik yok, giriş yok, çevrimdışı da çalışır.
```

**Description (2957/4000):**
```
Lexkite, İngilizce kelime öğrenmek isteyenler ve IELTS, TOEIC, TOEFL'a hazırlananlar için %100 ücretsiz bir uygulamadır. Abonelik yok, uygulama içi satın alma yok, can ya da enerji sınırı yok – hesap veya giriş de gerekmez: uygulamayı aç ve hemen öğrenmeye başla.

İNGİLİZCE KELİME DAĞARCIĞINI GELİŞTİR
• IPA ve sesli telaffuzla 6.800'den fazla kelime: NGSL temel kelimeleri, 570 kelimelik Academic Word List, 1.250 TOEIC kelimesi, IELTS konu kelimeleri, phrasal verb'ler ve eşdizimler.
• Hedefine ve seviyene göre hazırlanan, yeni kelime ve tekrarlardan oluşan günlük plan.
• 5 dakikalık seviye tespit sınavı nerede olduğunu gösterir ve bir çalışma yolu önerir.

SENİN YERİNE HATIRLAYAN KELİME KARTLARI
• Modern bir aralıklı tekrar algoritması olan FSRS ile planlanan İngilizce kelime kartları.
• Her karttan sonra ne kadar hatırladığını işaretlersin – uygulama bir sonraki tekrarı unutmadan hemen önceye koyar.
• Günlük hatırlatıcılar, ayrıca bugün tekrar edilecek kartlarını ve seri günlerini gösteren ana ekran ve kilit ekranı widget'ları.

TELAFFUZLU İNGİLİZCE SÖZLÜK
• İngiliz ve Amerikan telaffuzu, sözcük türüne göre anlamlar, tanımlar ve örnekler.
• Herhangi bir kelimeyi tek dokunuşla kartlarına kaydet.

IELTS, TOEIC VE TOEFL PRATİĞİ
• IELTS: band dönüşümlü dört beceri deneme sınavı, 40 soruluk Listening testleri ve Reading pratiği.
• TOEIC: 10–990 puan tahminli tam Listening & Reading testleri.
• TOEFL iBT: bölüm bölüm pratik – Reading, Listening, Writing ve Speaking.
• Cevap açıklamaları ve puan geçmişin.

DİLBİLGİSİ, KULLANIM VE BECERİLER
• Dilbilgisi konuları ve 40 soruluk karma dilbilgisi testi.
• affect ile effect ya da interested ile interesting gibi sık yapılan hatalara dair net notlar.
• Dinleme ve dikte, mikrofonla telaffuz pratiği, okuma metinleri ve kelime oyunları.
• Ekran kilitliyken de çalmaya devam eden eller serbest sesli çalışma.
• Yazdıklarına yapay zekâ geri bildirimi ve rol yapma konuşmaları (internet bağlantısı gerekir).

HER GÜN ÇALIŞMAYA GÖRE TASARLANDI
• Çevrimdışı çalışır: bağlantı olmadan kartlarını tekrar edebilir ve çalışabilirsin. Yeni kelime aramak ve yapay zekâ özellikleri internet ister.
• Seri günler, günlük hedefler, XP ve ilerleme istatistikleri.
• Açık ve koyu mod.
• 15 dilde arayüz: İngilizce, Vietnamca, İspanyolca, Portekizce, Fransızca, Almanca, Endonezce, Tayca, Çince, Japonca, Korece, Hintçe, Arapça, Rusça ve Türkçe.

TASARIMDAN GELEN GİZLİLİK
• Öğrenme verilerin cihazında saklanır. Dersler, testler ve sınavlar sırasında reklam yok.
• Gizlilik politikası: https://lexkite.com/tr/privacy

Her gün biraz İngilizce kelime öğren – Lexkite tüm özellikleri herkes için ücretsiz tutar.

Soru ve geri bildirimler için: support@lexkite.com · https://lexkite.com

Lexkite bağımsız bir üründür; British Council, IDP, Cambridge University Press & Assessment veya ETS ile bağlantılı değildir ve bunlar tarafından onaylanmamıştır. IELTS, TOEIC ve TOEFL, ilgili sahiplerinin ticari markalarıdır.
```

<!-- END GENERATED -->
