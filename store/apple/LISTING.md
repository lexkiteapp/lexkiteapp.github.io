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
| Subtitle | `Flashcards & exam practice` | 26/30 |
| Keywords | `words,dictionary,spaced repetition,grammar,pronunciation,ESL,learn,study,test prep,phrasal verbs` | 96/100 |
| Privacy policy URL | https://lexkite.com/en/privacy | |
| Support URL | https://lexkite.com/app/?hl=en#/contact | |
| Marketing URL | https://lexkite.com/en/ | |

**Promotional text (158/170):**
```
Learn English words a little every day with FSRS flashcards, a clear dictionary and practice tests for IELTS, TOEIC and TOEFL. No login needed, works offline.
```

**Description (2520/4000):**
```
Lexkite helps you learn English vocabulary and practise for IELTS, TOEIC and TOEFL. No account or login is needed – open the app and start learning.

LEARN WORDS THAT MATTER
• 6,800+ words with IPA and audio: NGSL core words, the 570-word Academic Word List, 1,250 TOEIC words, IELTS topics, phrasal verbs and collocations.
• A daily plan of new words and reviews, built around your goal and level.
• A 5-minute placement test shows where you are and suggests a study path.

REMEMBER THEM WITH FSRS
• Flashcards scheduled by FSRS, a modern spaced repetition algorithm.
• After each card, rate how well you remembered it – the app schedules the next review right before you would forget.
• Daily reminders, plus Home Screen and Lock Screen widgets with your cards due today and your streak.

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

Questions or feedback: support@lexkite.com · https://lexkite.com

Lexkite is an independent product and is not affiliated with or endorsed by the British Council, IDP, Cambridge University Press & Assessment or ETS. IELTS, TOEIC and TOEFL are trademarks of their respective owners.
```

### vi

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Từ vựng tiếng Anh` | 26/30 |
| Subtitle | `Flashcard, tra từ & luyện thi` | 29/30 |
| Keywords | `học tiếng anh,từ điển,ngữ pháp,phát âm,ôn tập,lặp lại ngắt quãng,từ mới,học từ,luyện nghe,anh văn` | 97/100 |
| Privacy policy URL | https://lexkite.com/vi/privacy | |
| Support URL | https://lexkite.com/app/?hl=vi#/contact | |
| Marketing URL | https://lexkite.com/ | |

**Promotional text (158/170):**
```
Học từ vựng tiếng Anh mỗi ngày một chút với flashcard FSRS, từ điển rõ ràng và đề luyện IELTS, TOEIC, TOEFL. Không cần đăng nhập, dùng được khi không có mạng.
```

**Description (2346/4000):**
```
Lexkite giúp bạn học từ vựng tiếng Anh và luyện thi IELTS, TOEIC, TOEFL. Không cần tạo tài khoản hay đăng nhập – mở app là học được ngay.

HỌC ĐÚNG TỪ CẦN HỌC
• Hơn 6.800 từ có phiên âm và phát âm: từ cốt lõi NGSL, 570 từ học thuật AWL, 1.250 từ TOEIC, từ theo chủ đề IELTS, phrasal verb và collocation.
• Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu và trình độ của bạn.
• Bài kiểm tra trình độ 5 phút cho biết bạn đang ở đâu và gợi ý lộ trình học.

NHỚ LÂU VỚI FSRS
• Flashcard được lên lịch bằng FSRS – thuật toán lặp lại ngắt quãng hiện đại.
• Sau mỗi thẻ, bạn chấm mức độ nhớ – app hẹn lần ôn tiếp theo đúng lúc bạn sắp quên.
• Nhắc học hằng ngày, widget trên màn hình chính và màn hình khóa hiện số thẻ cần ôn hôm nay cùng chuỗi ngày học.

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
• Học rảnh tay bằng âm thanh, vẫn phát khi khóa màn hình.
• AI nhận xét bài viết và luyện hội thoại nhập vai (cần kết nối mạng).

HỌC MỖI NGÀY THẬT DỄ
• Dùng được khi không có mạng: ôn flashcard và học bình thường. Tra từ mới và các tính năng AI cần mạng.
• Chuỗi ngày học, mục tiêu ngày, điểm XP và thống kê tiến độ.
• Giao diện sáng và tối.
• Giao diện 15 ngôn ngữ: Tiếng Việt, tiếng Anh, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Indonesia, Thái, Trung, Nhật, Hàn, Hindi, Ả Rập, Nga và Thổ Nhĩ Kỳ.

TÔN TRỌNG QUYỀN RIÊNG TƯ
• Dữ liệu học được lưu trên thiết bị của bạn. Không quảng cáo trong lúc học, làm quiz hay thi.
• Chính sách quyền riêng tư: https://lexkite.com/vi/privacy

Góp ý, hỏi đáp: support@lexkite.com · https://lexkite.com

Lexkite là sản phẩm độc lập, không liên kết và không được bảo trợ bởi British Council, IDP, Cambridge University Press & Assessment hay ETS. IELTS, TOEIC, TOEFL là nhãn hiệu của các chủ sở hữu tương ứng.
```

### es-ES (also used for es-MX)

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Vocabulario de inglés` | 30/30 |
| Subtitle | `Tarjetas y práctica de examen` | 29/30 |
| Keywords | `diccionario,gramática,pronunciación,repaso,aprender,palabras,repetición espaciada,phrasal verbs` | 95/100 |
| Privacy policy URL | https://lexkite.com/es/privacy | |
| Support URL | https://lexkite.com/app/?hl=es#/contact | |
| Marketing URL | https://lexkite.com/es/ | |

**Promotional text (160/170):**
```
Aprende palabras en inglés un poco cada día con tarjetas FSRS, un diccionario claro y exámenes de práctica de IELTS, TOEIC y TOEFL. Sin registro y sin conexión.
```

**Description (1706/4000):**
```
Lexkite te ayuda a aprender vocabulario en inglés y a prepararte para IELTS, TOEIC y TOEFL. No necesitas cuenta ni iniciar sesión.

• Más de 6.800 palabras con IPA y audio: vocabulario básico (NGSL), Academic Word List, palabras de TOEIC, temas de IELTS, phrasal verbs y colocaciones.
• Tarjetas con FSRS, un algoritmo moderno de repetición espaciada: repasas cada palabra justo antes de olvidarla.
• Diccionario: pronunciación británica y americana, significados, definiciones y ejemplos; guarda palabras con un toque.
• Exámenes de práctica: simulacro de IELTS con conversión a band, tests completos de TOEIC Listening & Reading (10–990), práctica de TOEFL iBT por secciones, prueba de nivel de 5 minutos, explicaciones e historial de puntuaciones.
• Gramática, notas sobre errores frecuentes, comprensión auditiva y dictado, pronunciación, lecturas y juegos.
• Estudio con audio manos libres que sigue sonando con la pantalla bloqueada.
• Comentarios de IA sobre tu escritura y conversaciones de rol (requiere internet).
• Funciona sin conexión para repasar y estudiar; buscar palabras nuevas y las funciones de IA requieren internet.
• Widgets para la pantalla de inicio y la pantalla de bloqueo, recordatorios diarios, rachas, metas, estadísticas y modo oscuro.
• Interfaz en 15 idiomas. Tus datos de aprendizaje se guardan en tu dispositivo. Sin anuncios durante las lecciones, los cuestionarios ni los exámenes.

Privacidad: https://lexkite.com/es/privacy · Soporte: support@lexkite.com

Lexkite es un producto independiente y no está afiliado ni respaldado por el British Council, IDP, Cambridge University Press & Assessment ni ETS. IELTS, TOEIC y TOEFL son marcas de sus respectivos propietarios.
```

### pt-BR

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Vocabulário de inglês` | 30/30 |
| Subtitle | `Flashcards e simulados` | 22/30 |
| Keywords | `dicionário,gramática,pronúncia,revisão,aprender,palavras,repetição espaçada,phrasal verbs,estudar` | 97/100 |
| Privacy policy URL | https://lexkite.com/pt/privacy | |
| Support URL | https://lexkite.com/app/?hl=pt#/contact | |
| Marketing URL | https://lexkite.com/pt/ | |

**Promotional text (151/170):**
```
Aprenda palavras em inglês um pouco por dia com flashcards FSRS, um dicionário claro e simulados de IELTS, TOEIC e TOEFL. Sem login e funciona offline.
```

**Description (1616/4000):**
```
O Lexkite ajuda você a aprender vocabulário em inglês e a se preparar para IELTS, TOEIC e TOEFL. Não precisa de conta nem de login.

• Mais de 6.800 palavras com IPA e áudio: vocabulário essencial (NGSL), Academic Word List, palavras do TOEIC, temas do IELTS, phrasal verbs e colocações.
• Flashcards com FSRS, um algoritmo moderno de repetição espaçada: você revisa cada palavra pouco antes de esquecê-la.
• Dicionário: pronúncia britânica e americana, significados, definições e exemplos; salve palavras com um toque.
• Simulados: simulado de IELTS com conversão para band, testes completos de TOEIC Listening & Reading (10–990), prática de TOEFL iBT por seção, teste de nível de 5 minutos, explicações e histórico de notas.
• Gramática, notas sobre erros comuns, compreensão oral e ditado, pronúncia, leituras e jogos.
• Estudo com áudio no modo mãos livres, que continua tocando com a tela bloqueada.
• Feedback de IA para sua escrita e conversas de roleplay (requer internet).
• Funciona offline para revisar e estudar; consultar palavras novas e os recursos de IA exigem internet.
• Widgets na tela inicial e na tela bloqueada, lembretes diários, sequências, metas, estatísticas e modo escuro.
• Interface em 15 idiomas. Seus dados de estudo ficam no seu dispositivo. Sem anúncios durante as lições, os quizzes ou as provas.

Privacidade: https://lexkite.com/pt/privacy · Suporte: support@lexkite.com

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
Apprenez des mots anglais chaque jour avec des cartes FSRS, un dictionnaire clair et des tests d'entraînement IELTS, TOEIC et TOEFL. Sans compte, même hors ligne.
```

**Description (1757/4000):**
```
Lexkite vous aide à apprendre le vocabulaire anglais et à préparer l'IELTS, le TOEIC et le TOEFL. Aucun compte ni connexion n'est nécessaire.

• Plus de 6 800 mots avec API et audio : vocabulaire essentiel (NGSL), Academic Word List, mots du TOEIC, thèmes de l'IELTS, phrasal verbs et collocations.
• Cartes mémoire planifiées par FSRS, un algorithme moderne de répétition espacée : vous révisez chaque mot juste avant de l'oublier.
• Dictionnaire : prononciation britannique et américaine, sens, définitions et exemples ; enregistrez un mot d'un simple toucher.
• Entraînement aux examens : examen blanc IELTS avec conversion en band, tests TOEIC Listening & Reading complets (10–990), entraînement TOEFL iBT par section, test de niveau de 5 minutes, explications et historique des scores.
• Grammaire, fiches sur les erreurs fréquentes, compréhension orale et dictée, prononciation, lectures et jeux.
• Écoute mains libres qui continue même écran verrouillé.
• Retours de l'IA sur vos écrits et dialogues en jeu de rôle (connexion Internet requise).
• Fonctionne hors ligne pour réviser et étudier ; la recherche de nouveaux mots et les fonctions d'IA nécessitent Internet.
• Widgets pour l'écran d'accueil et l'écran verrouillé, rappels quotidiens, séries, objectifs, statistiques et mode sombre.
• Interface en 15 langues. Vos données d'apprentissage sont stockées sur votre appareil. Aucune publicité pendant les leçons, les quiz ou les tests.

Confidentialité : https://lexkite.com/fr/privacy · Assistance : support@lexkite.com

Lexkite est un produit indépendant, sans lien avec le British Council, IDP, Cambridge University Press & Assessment ou ETS, et non approuvé par eux. IELTS, TOEIC et TOEFL sont des marques de leurs propriétaires respectifs.
```

### de-DE

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Englisch-Vokabeln` | 26/30 |
| Subtitle | `Karteikarten & Prüfungsübungen` | 30/30 |
| Keywords | `Wörterbuch,Grammatik,Aussprache,Wörter,Englisch lernen,Wiederholung,Hörverstehen,Vokabeltrainer` | 95/100 |
| Privacy policy URL | https://lexkite.com/de/privacy | |
| Support URL | https://lexkite.com/app/?hl=de#/contact | |
| Marketing URL | https://lexkite.com/de/ | |

**Promotional text (164/170):**
```
Lerne jeden Tag ein paar englische Wörter – mit FSRS-Karteikarten, einem klaren Wörterbuch und Übungstests für IELTS, TOEIC und TOEFL. Ohne Anmeldung, auch offline.
```

**Description (1760/4000):**
```
Lexkite hilft dir, englische Vokabeln zu lernen und dich auf IELTS, TOEIC und TOEFL vorzubereiten. Kein Konto und keine Anmeldung nötig.

• Über 6.800 Wörter mit Lautschrift (IPA) und Audio: Grundwortschatz (NGSL), Academic Word List, TOEIC-Wörter, IELTS-Themen, Phrasal Verbs und Kollokationen.
• Karteikarten mit FSRS, einem modernen Algorithmus für verteilte Wiederholung: Du wiederholst jedes Wort kurz bevor du es vergessen würdest.
• Wörterbuch: britische und amerikanische Aussprache, Bedeutungen, Definitionen und Beispiele; Wörter mit einem Tipp speichern.
• Prüfungstraining: IELTS-Probetest mit Band-Umrechnung, vollständige TOEIC-Tests für Listening & Reading (10–990), TOEFL-iBT-Übungen nach Prüfungsteilen, 5-minütiger Einstufungstest, Erklärungen und Punkteverlauf.
• Grammatik, Hinweise zu typischen Fehlern, Hörverstehen und Diktat, Ausspracheübungen, Lesetexte und Spiele.
• Freihändiges Lernen mit Audio, das auch bei gesperrtem Bildschirm weiterläuft.
• KI-Feedback zu deinen Texten und Rollenspiel-Gespräche (Internetverbindung erforderlich).
• Funktioniert offline zum Wiederholen und Lernen; das Nachschlagen neuer Wörter und KI-Funktionen brauchen Internet.
• Widgets für Home-Bildschirm und Sperrbildschirm, tägliche Erinnerungen, Lernserien, Ziele, Statistiken und dunkles Design.
• Oberfläche in 15 Sprachen. Deine Lerndaten werden auf deinem Gerät gespeichert. Keine Werbung während Lektionen, Quizzen oder Tests.

Datenschutz: https://lexkite.com/de/privacy · Support: support@lexkite.com

Lexkite ist ein unabhängiges Produkt und steht in keiner Verbindung zu British Council, IDP, Cambridge University Press & Assessment oder ETS und wird von diesen nicht unterstützt. IELTS, TOEIC und TOEFL sind Marken ihrer jeweiligen Inhaber.
```

### id

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: Kosakata Inggris` | 25/30 |
| Subtitle | `Kartu hafalan & latihan ujian` | 29/30 |
| Keywords | `kamus,tata bahasa,pelafalan,belajar,kata,bahasa inggris,flashcard,listening,hafalan,vocabulary` | 94/100 |
| Privacy policy URL | https://lexkite.com/id/privacy | |
| Support URL | https://lexkite.com/app/?hl=id#/contact | |
| Marketing URL | https://lexkite.com/id/ | |

**Promotional text (161/170):**
```
Belajar kosakata bahasa Inggris sedikit demi sedikit setiap hari dengan kartu FSRS, kamus yang jelas, dan latihan IELTS, TOEIC, TOEFL. Tanpa login, bisa offline.
```

**Description (1555/4000):**
```
Lexkite membantumu belajar kosakata bahasa Inggris dan berlatih IELTS, TOEIC, dan TOEFL. Tidak perlu akun atau login.

• Lebih dari 6.800 kata dengan IPA dan audio: kosakata inti (NGSL), Academic Word List, kata TOEIC, topik IELTS, phrasal verb, dan kolokasi.
• Kartu hafalan dengan FSRS, algoritma pengulangan berjarak yang modern: setiap kata diulang tepat sebelum kamu lupa.
• Kamus: pelafalan Inggris (UK) dan Amerika (US), arti, definisi, dan contoh; simpan kata dengan satu ketukan.
• Latihan ujian: simulasi IELTS dengan konversi band, tes lengkap TOEIC Listening & Reading (10–990), latihan TOEFL iBT per bagian, tes penempatan 5 menit, pembahasan, dan riwayat skor.
• Tata bahasa, catatan kesalahan umum, mendengarkan dan dikte, latihan pelafalan, bacaan, dan permainan.
• Belajar lewat audio tanpa memegang ponsel, tetap berputar saat layar terkunci.
• Masukan AI untuk tulisanmu dan percakapan roleplay (perlu internet).
• Bisa dipakai offline untuk mengulang dan belajar; mencari kata baru dan fitur AI perlu internet.
• Widget layar utama dan layar kunci, pengingat harian, runtunan hari, target, statistik, dan mode gelap.
• Antarmuka dalam 15 bahasa. Data belajarmu disimpan di perangkatmu. Tanpa iklan saat pelajaran, kuis, atau tes.

Privasi: https://lexkite.com/id/privacy · Dukungan: support@lexkite.com

Lexkite adalah produk independen dan tidak berafiliasi dengan atau didukung oleh British Council, IDP, Cambridge University Press & Assessment, maupun ETS. IELTS, TOEIC, dan TOEFL adalah merek dagang milik pemiliknya masing-masing.
```

### th

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: คำศัพท์ภาษาอังกฤษ` | 26/30 |
| Subtitle | `แฟลชการ์ดและฝึกทำข้อสอบ` | 23/30 |
| Keywords | `ภาษาอังกฤษ,ศัพท์,พจนานุกรม,ไวยากรณ์,ออกเสียง,ทบทวน,เรียน,ฟัง,vocabulary` | 71/100 |
| Privacy policy URL | https://lexkite.com/th/privacy | |
| Support URL | https://lexkite.com/app/?hl=th#/contact | |
| Marketing URL | https://lexkite.com/th/ | |

**Promotional text (135/170):**
```
ท่องศัพท์ภาษาอังกฤษวันละนิดด้วยแฟลชการ์ด FSRS พจนานุกรมที่อ่านง่าย และข้อสอบฝึก IELTS, TOEIC, TOEFL ไม่ต้องเข้าสู่ระบบ ใช้งานออฟไลน์ได้
```

**Description (1423/4000):**
```
Lexkite ช่วยให้คุณเรียนคำศัพท์ภาษาอังกฤษและฝึกสอบ IELTS, TOEIC และ TOEFL ไม่ต้องสร้างบัญชีหรือเข้าสู่ระบบ

• คำศัพท์กว่า 6,800 คำ พร้อมคำอ่าน IPA และเสียง: คำศัพท์พื้นฐาน (NGSL), Academic Word List, คำศัพท์ TOEIC, หัวข้อ IELTS, phrasal verb และ collocation
• แฟลชการ์ดที่จัดตารางทบทวนด้วย FSRS อัลกอริทึมทบทวนแบบเว้นระยะสมัยใหม่ ทบทวนแต่ละคำก่อนจะลืม
• พจนานุกรม: การออกเสียงแบบอังกฤษและอเมริกัน ความหมาย คำจำกัดความ และตัวอย่าง บันทึกคำได้ในแตะเดียว
• ฝึกทำข้อสอบ: ข้อสอบจำลอง IELTS พร้อมแปลงเป็น band, ข้อสอบ TOEIC Listening & Reading ฉบับเต็ม (10–990), ฝึก TOEFL iBT แยกตามพาร์ต, แบบทดสอบวัดระดับ 5 นาที, คำอธิบายเฉลย และประวัติคะแนน
• ไวยากรณ์ ข้อผิดพลาดที่พบบ่อย การฟังและเขียนตามคำบอก ฝึกออกเสียง บทอ่าน และเกม
• เรียนด้วยเสียงแบบไม่ต้องใช้มือ เล่นต่อได้แม้ล็อกหน้าจอ
• AI ให้คำแนะนำงานเขียนและฝึกสนทนาแบบบทบาทสมมติ (ต้องใช้อินเทอร์เน็ต)
• ใช้งานออฟไลน์ได้สำหรับทบทวนและเรียน ส่วนการค้นหาคำใหม่และฟีเจอร์ AI ต้องใช้อินเทอร์เน็ต
• วิดเจ็ตบนหน้าจอโฮมและหน้าจอล็อก การแจ้งเตือนรายวัน สถิติการเรียนต่อเนื่อง เป้าหมาย และโหมดมืด
• อินเทอร์เฟซ 15 ภาษา ข้อมูลการเรียนจัดเก็บไว้ในอุปกรณ์ของคุณ ไม่มีโฆษณาระหว่างบทเรียน แบบทดสอบ หรือการสอบ

ความเป็นส่วนตัว: https://lexkite.com/th/privacy · ติดต่อ: support@lexkite.com

Lexkite เป็นผลิตภัณฑ์อิสระ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก British Council, IDP, Cambridge University Press & Assessment หรือ ETS โดย IELTS, TOEIC และ TOEFL เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย
```

### zh-Hans

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite：英语单词` | 12/30 |
| Subtitle | `闪卡背单词，备考练习` | 10/30 |
| Keywords | `英语,词汇,背单词,词典,语法,发音,听力,复习,间隔重复,学习,单词本,英文` | 39/100 |
| Privacy policy URL | https://lexkite.com/zh/privacy | |
| Support URL | https://lexkite.com/app/?hl=zh#/contact | |
| Marketing URL | https://lexkite.com/zh/ | |

**Promotional text (60/170):**
```
每天背一点英语单词：FSRS 闪卡、清晰的词典，以及 IELTS、TOEIC、TOEFL 练习题。无需登录，可离线使用。
```

**Description (664/4000):**
```
Lexkite 是一款英语词汇学习与 IELTS（雅思）、TOEIC（托业）、TOEFL（托福）备考应用。无需注册或登录。

• 6,800+ 单词，带音标和发音：NGSL 核心词、学术词汇表 AWL、TOEIC 词汇、IELTS 话题词、短语动词和固定搭配。
• 采用现代间隔重复算法 FSRS 安排闪卡复习，在你快要忘记时提醒复习。
• 词典：英式和美式发音、按词性的释义、定义和例句；一键加入闪卡。
• 考试练习：IELTS 四项模考并换算分数段、完整的 TOEIC 听力与阅读试题（10–990 分）、按部分练习 TOEFL iBT、5 分钟水平测试，附答案解析和成绩记录。
• 语法、常见错误讲解、听力与听写、发音练习、阅读和小游戏。
• 免手动音频学习，锁屏后也能继续播放。
• AI 点评写作，并可进行情景对话练习（需联网）。
• 可离线复习和学习；查新词和 AI 功能需要联网。
• 主屏幕与锁定屏幕小组件、每日提醒、连续学习天数、目标、统计和深色模式。
• 15 种界面语言。学习数据保存在你的设备上。学习、测验和考试过程中不显示广告。

隐私政策：https://lexkite.com/zh/privacy · 联系：support@lexkite.com

Lexkite 是独立产品，与 British Council、IDP、Cambridge University Press & Assessment 及 ETS 均无关联，亦未获其认可。IELTS、TOEIC、TOEFL 是其各自所有者的商标。
```

### ja

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite：英単語` | 11/30 |
| Subtitle | `単語カードと試験対策` | 10/30 |
| Keywords | `英語,単語帳,辞書,文法,発音,リスニング,復習,暗記,語彙,学習,英会話,フラッシュカード` | 46/100 |
| Privacy policy URL | https://lexkite.com/ja/privacy | |
| Support URL | https://lexkite.com/app/?hl=ja#/contact | |
| Marketing URL | https://lexkite.com/ja/ | |

**Promotional text (76/170):**
```
FSRS の単語カード、わかりやすい辞書、IELTS・TOEIC・TOEFL の練習問題で、英単語を毎日少しずつ。ログイン不要、オフラインでも使えます。
```

**Description (859/4000):**
```
Lexkite は、英単語の学習と IELTS・TOEIC・TOEFL 対策ができるアプリです。アカウント登録やログインは不要です。

• 6,800 語以上を発音記号と音声付きで収録：NGSL の基本語、Academic Word List、TOEIC 頻出語、IELTS のトピック別単語、句動詞、コロケーション。
• 最新の間隔反復アルゴリズム FSRS で単語カードを管理し、忘れる直前に復習できます。
• 辞書：イギリス英語とアメリカ英語の発音、品詞別の意味、定義、例文。ワンタップで単語カードに保存。
• 試験対策：IELTS 4 技能の模試（バンド換算）、TOEIC Listening & Reading のフルテスト（10–990 点）、TOEFL iBT のセクション別練習、5 分のレベル診断、解説とスコア履歴。
• 文法、よくある間違いの解説、リスニングとディクテーション、発音練習、リーディング、ゲーム。
• 画面をロックしても再生が続く、ハンズフリーの音声学習。
• AI による英作文のフィードバックとロールプレイ会話（インターネット接続が必要）。
• 復習や学習はオフラインでも可能。新しい単語の検索と AI 機能にはインターネットが必要です。
• ホーム画面とロック画面のウィジェット、毎日のリマインダー、連続学習日数、目標、統計、ダークモード。
• 15 言語の表示に対応。学習データはお使いの端末に保存されます。レッスン・クイズ・テストの最中に広告は表示されません。

プライバシーポリシー：https://lexkite.com/ja/privacy · お問い合わせ：support@lexkite.com

Lexkite は独立した製品であり、British Council、IDP、Cambridge University Press & Assessment、ETS とは提携しておらず、承認も受けていません。IELTS、TOEIC、TOEFL は各所有者の商標です。
```

### ko

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: 영어 단어` | 14/30 |
| Subtitle | `플래시카드와 시험 대비` | 12/30 |
| Keywords | `영어,단어장,사전,문법,발음,듣기,복습,암기,어휘,공부,영단어,단어 암기` | 40/100 |
| Privacy policy URL | https://lexkite.com/ko/privacy | |
| Support URL | https://lexkite.com/app/?hl=ko#/contact | |
| Marketing URL | https://lexkite.com/ko/ | |

**Promotional text (94/170):**
```
FSRS 플래시카드, 알기 쉬운 사전, IELTS·TOEIC·TOEFL 연습 문제로 영어 단어를 매일 조금씩 익히세요. 로그인 없이, 오프라인에서도 사용할 수 있습니다.
```

**Description (863/4000):**
```
Lexkite는 영어 단어를 익히고 IELTS, TOEIC, TOEFL을 준비할 수 있는 앱입니다. 계정이나 로그인이 필요 없습니다.

• 발음기호와 음성이 있는 6,800개 이상의 단어: NGSL 핵심 어휘, 학술 어휘 목록(AWL), TOEIC 단어, IELTS 주제별 단어, 구동사, 연어.
• 최신 간격 반복 알고리즘 FSRS로 플래시카드를 관리해 잊기 직전에 복습합니다.
• 사전: 영국식·미국식 발음, 품사별 뜻, 정의, 예문. 한 번 탭으로 플래시카드에 저장.
• 시험 연습: 밴드 환산이 되는 IELTS 4개 영역 모의고사, TOEIC Listening & Reading 실전 테스트(10–990점), TOEFL iBT 영역별 연습, 5분 레벨 테스트, 해설과 점수 기록.
• 문법, 자주 하는 실수 정리, 듣기와 받아쓰기, 발음 연습, 읽기 지문, 게임.
• 화면을 잠가도 계속 재생되는 핸즈프리 오디오 학습.
• AI 작문 피드백과 롤플레이 대화(인터넷 연결 필요).
• 복습과 학습은 오프라인에서도 가능하며, 새 단어 검색과 AI 기능은 인터넷이 필요합니다.
• 홈 화면·잠금 화면 위젯, 매일 알림, 연속 학습일, 목표, 통계, 다크 모드.
• 15개 언어 인터페이스. 학습 데이터는 기기에 저장됩니다. 수업, 퀴즈, 시험 중에는 광고가 없습니다.

개인정보처리방침: https://lexkite.com/ko/privacy · 문의: support@lexkite.com

Lexkite는 독립 제품이며 British Council, IDP, Cambridge University Press & Assessment, ETS와 제휴하거나 승인을 받지 않았습니다. IELTS, TOEIC, TOEFL은 각 소유자의 상표입니다.
```

### hi

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: अंग्रेज़ी शब्दावली` | 27/30 |
| Subtitle | `फ़्लैशकार्ड और परीक्षा अभ्यास` | 29/30 |
| Keywords | `अंग्रेज़ी,शब्दकोश,व्याकरण,उच्चारण,शब्द,सीखें,अभ्यास,english,vocabulary,dictionary` | 81/100 |
| Privacy policy URL | https://lexkite.com/hi/privacy | |
| Support URL | https://lexkite.com/app/?hl=hi#/contact | |
| Marketing URL | https://lexkite.com/hi/ | |

**Promotional text (148/170):**
```
FSRS फ़्लैशकार्ड, साफ़ शब्दकोश और IELTS, TOEIC, TOEFL अभ्यास टेस्ट के साथ रोज़ थोड़े अंग्रेज़ी शब्द सीखें। लॉगिन की ज़रूरत नहीं, ऑफ़लाइन भी चलता है।
```

**Description (1496/4000):**
```
Lexkite अंग्रेज़ी शब्दावली सीखने और IELTS, TOEIC व TOEFL की तैयारी में आपकी मदद करता है। कोई खाता या लॉगिन ज़रूरी नहीं।

• IPA और ऑडियो के साथ 6,800+ शब्द: NGSL के मुख्य शब्द, Academic Word List, TOEIC शब्द, IELTS विषयों के शब्द, phrasal verbs और collocations.
• FSRS से तय होने वाले फ़्लैशकार्ड – एक आधुनिक spaced repetition एल्गोरिद्म – ताकि आप हर शब्द भूलने से ठीक पहले दोहराएँ।
• शब्दकोश: ब्रिटिश और अमेरिकी उच्चारण, शब्द-भेद के अनुसार अर्थ, परिभाषाएँ और उदाहरण; एक टैप में शब्द सहेजें।
• परीक्षा अभ्यास: band रूपांतरण के साथ IELTS मॉक टेस्ट, पूरे TOEIC Listening & Reading टेस्ट (10–990), TOEFL iBT का भाग-वार अभ्यास, 5 मिनट का लेवल टेस्ट, उत्तरों की व्याख्या और स्कोर इतिहास।
• व्याकरण, आम गलतियों पर नोट्स, सुनना और डिक्टेशन, उच्चारण अभ्यास, पठन और गेम।
• हैंड्स-फ़्री ऑडियो पढ़ाई, जो स्क्रीन लॉक होने पर भी चलती रहती है।
• आपके लेखन पर AI फ़ीडबैक और रोलप्ले बातचीत (इंटरनेट ज़रूरी)।
• दोहराने और पढ़ने के लिए ऑफ़लाइन भी चलता है; नए शब्द खोजने और AI सुविधाओं के लिए इंटरनेट चाहिए।
• होम स्क्रीन और लॉक स्क्रीन विजेट, रोज़ाना रिमाइंडर, लगातार दिनों की स्ट्रीक, लक्ष्य, आँकड़े और डार्क मोड।
• 15 भाषाओं में इंटरफ़ेस। आपका सीखने का डेटा आपके डिवाइस पर रहता है। पाठ, क्विज़ या टेस्ट के दौरान कोई विज्ञापन नहीं।

गोपनीयता नीति: https://lexkite.com/hi/privacy · सहायता: support@lexkite.com

Lexkite एक स्वतंत्र उत्पाद है और British Council, IDP, Cambridge University Press & Assessment या ETS से संबद्ध या उनके द्वारा समर्थित नहीं है। IELTS, TOEIC और TOEFL अपने-अपने स्वामियों के ट्रेडमार्क हैं।
```

### ar-SA

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: مفردات الإنجليزية` | 26/30 |
| Subtitle | `بطاقات وتدريب على الاختبارات` | 28/30 |
| Keywords | `إنجليزي,انجليزي,قاموس,قواعد,نطق,كلمات,تعلم,مراجعة,استماع,مفردات,vocabulary` | 74/100 |
| Privacy policy URL | https://lexkite.com/ar/privacy | |
| Support URL | https://lexkite.com/app/?hl=ar#/contact | |
| Marketing URL | https://lexkite.com/ar/ | |

**Promotional text (135/170):**
```
تعلّم كلمات إنجليزية قليلة كل يوم مع بطاقات FSRS وقاموس واضح واختبارات تدريبية لـ IELTS وTOEIC وTOEFL. دون تسجيل دخول، ويعمل دون اتصال.
```

**Description (1542/4000):**
```
يساعدك Lexkite على تعلّم مفردات اللغة الإنجليزية والاستعداد لاختبارات IELTS وTOEIC وTOEFL. لا حاجة إلى حساب أو تسجيل دخول.

• أكثر من 6,800 كلمة مع النطق الصوتي (IPA) والصوت: الكلمات الأساسية NGSL، وقائمة الكلمات الأكاديمية AWL، وكلمات TOEIC، وموضوعات IELTS، والأفعال المركّبة والمتلازمات اللفظية.
• بطاقات تعليمية تُجدوَل بخوارزمية FSRS الحديثة للتكرار المتباعد، لتراجع كل كلمة قبل أن تنساها مباشرة.
• قاموس: النطق البريطاني والأمريكي، والمعاني حسب نوع الكلمة، والتعريفات والأمثلة، مع حفظ الكلمة بلمسة واحدة.
• تدريب على الاختبارات: اختبار IELTS تجريبي بالمهارات الأربع مع تحويل الدرجة إلى band، واختبارات TOEIC كاملة للاستماع والقراءة (10–990)، وتدريب على أقسام TOEFL iBT، واختبار تحديد مستوى في 5 دقائق، مع شرح للإجابات وسجل للدرجات.
• القواعد، وملاحظات عن الأخطاء الشائعة، والاستماع والإملاء، والتدريب على النطق، ونصوص القراءة، والألعاب.
• دراسة صوتية دون استخدام اليدين تستمر حتى مع قفل الشاشة.
• ملاحظات بالذكاء الاصطناعي على كتابتك ومحادثات لعب الأدوار (يتطلب الاتصال بالإنترنت).
• يعمل دون اتصال للمراجعة والدراسة، أما البحث عن كلمات جديدة وميزات الذكاء الاصطناعي فتتطلب الإنترنت.
• أدوات للشاشة الرئيسية وشاشة القفل، وتذكيرات يومية، وسلسلة أيام التعلّم، وأهداف، وإحصاءات، ووضع داكن.
• واجهة بـ 15 لغة. تُحفظ بيانات تعلّمك على جهازك. لا إعلانات أثناء الدروس أو الاختبارات القصيرة أو الامتحانات.

سياسة الخصوصية: https://lexkite.com/ar/privacy · الدعم: support@lexkite.com

Lexkite منتج مستقل وغير تابع أو معتمد من British Council أو IDP أو Cambridge University Press & Assessment أو ETS. إن IELTS وTOEIC وTOEFL علامات تجارية لأصحابها.
```

### ru

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: английские слова` | 25/30 |
| Subtitle | `Карточки и пробные экзамены` | 27/30 |
| Keywords | `английский,словарь,грамматика,произношение,лексика,повторение,аудирование,учить,флешкарты` | 89/100 |
| Privacy policy URL | https://lexkite.com/ru/privacy | |
| Support URL | https://lexkite.com/app/?hl=ru#/contact | |
| Marketing URL | https://lexkite.com/ru/ | |

**Promotional text (153/170):**
```
Учите английские слова понемногу каждый день: карточки FSRS, понятный словарь и пробные тесты IELTS, TOEIC и TOEFL. Без входа в аккаунт, работает офлайн.
```

**Description (1608/4000):**
```
Lexkite помогает учить английскую лексику и готовиться к IELTS, TOEIC и TOEFL. Не нужен ни аккаунт, ни вход.

• Более 6 800 слов с транскрипцией (IPA) и озвучкой: базовая лексика NGSL, Academic Word List, слова TOEIC, темы IELTS, фразовые глаголы и коллокации.
• Карточки по современному алгоритму интервального повторения FSRS: каждое слово вы повторяете прямо перед тем, как его забыть.
• Словарь: британское и американское произношение, значения по частям речи, определения и примеры; слово сохраняется в карточки одним касанием.
• Подготовка к экзаменам: пробный IELTS по четырём навыкам с пересчётом в band, полные тесты TOEIC Listening & Reading (10–990), тренировка разделов TOEFL iBT, 5-минутный тест уровня, разборы ответов и история результатов.
• Грамматика, разбор частых ошибок, аудирование и диктанты, тренировка произношения, тексты для чтения и игры.
• Аудиозанятия без рук, которые продолжают играть при заблокированном экране.
• Отзыв ИИ на ваши тексты и ролевые диалоги (нужен интернет).
• Повторять и заниматься можно офлайн; поиск новых слов и функции ИИ требуют интернета.
• Виджеты для экрана «Домой» и экрана блокировки, ежедневные напоминания, серии дней, цели, статистика и тёмная тема.
• Интерфейс на 15 языках. Данные обучения хранятся на вашем устройстве. Без рекламы во время уроков, викторин и тестов.

Конфиденциальность: https://lexkite.com/ru/privacy · Поддержка: support@lexkite.com

Lexkite — независимый продукт, не связанный с British Council, IDP, Cambridge University Press & Assessment или ETS и не одобренный ими. IELTS, TOEIC и TOEFL — товарные знаки их владельцев.
```

### tr

| Field | Value | Chars |
|---|---|---|
| Name | `Lexkite: İngilizce Kelime` | 25/30 |
| Subtitle | `Kelime kartı ve sınav pratiği` | 29/30 |
| Keywords | `ingilizce,sözlük,dilbilgisi,gramer,telaffuz,tekrar,dinleme,öğren,kelime ezberleme,vocabulary` | 92/100 |
| Privacy policy URL | https://lexkite.com/tr/privacy | |
| Support URL | https://lexkite.com/app/?hl=tr#/contact | |
| Marketing URL | https://lexkite.com/tr/ | |

**Promotional text (154/170):**
```
FSRS kartları, anlaşılır bir sözlük ve IELTS, TOEIC, TOEFL deneme testleriyle her gün biraz İngilizce kelime öğren. Giriş gerekmez, çevrimdışı da çalışır.
```

**Description (1631/4000):**
```
Lexkite, İngilizce kelime öğrenmene ve IELTS, TOEIC ile TOEFL'a hazırlanmana yardımcı olur. Hesap veya giriş gerekmez.

• IPA ve sesli telaffuzla 6.800'den fazla kelime: NGSL temel kelimeleri, Academic Word List, TOEIC kelimeleri, IELTS konuları, phrasal verb'ler ve eşdizimler.
• Modern aralıklı tekrar algoritması FSRS ile planlanan kartlar: her kelimeyi unutmadan hemen önce tekrar edersin.
• Sözlük: İngiliz ve Amerikan telaffuzu, sözcük türüne göre anlamlar, tanımlar ve örnekler; kelimeyi tek dokunuşla kaydet.
• Sınav pratiği: band dönüşümlü dört beceri IELTS deneme sınavı, tam TOEIC Listening & Reading testleri (10–990), bölüm bölüm TOEFL iBT pratiği, 5 dakikalık seviye testi, cevap açıklamaları ve puan geçmişi.
• Dilbilgisi, sık yapılan hatalar üzerine notlar, dinleme ve dikte, telaffuz pratiği, okuma metinleri ve oyunlar.
• Ekran kilitliyken de çalmaya devam eden eller serbest sesli çalışma.
• Yazdıklarına yapay zekâ geri bildirimi ve rol yapma konuşmaları (internet gerekir).
• Tekrar ve çalışma için çevrimdışı çalışır; yeni kelime aramak ve yapay zekâ özellikleri internet gerektirir.
• Ana ekran ve kilit ekranı widget'ları, günlük hatırlatıcılar, seri günler, hedefler, istatistikler ve karanlık mod.
• 15 dilde arayüz. Öğrenme verilerin cihazında saklanır. Dersler, testler ve sınavlar sırasında reklam yok.

Gizlilik: https://lexkite.com/tr/privacy · Destek: support@lexkite.com

Lexkite bağımsız bir üründür; British Council, IDP, Cambridge University Press & Assessment veya ETS ile bağlantılı değildir ve bunlar tarafından onaylanmamıştır. IELTS, TOEIC ve TOEFL, ilgili sahiplerinin ticari markalarıdır.
```

<!-- END GENERATED -->
