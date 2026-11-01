# Lexkite – Google Play store listing (com.lexkite.app)

Text source: `store/metadata/<locale>.json` (one file per language, shared with the App Store; lint `node scripts/store-metadata.mjs --check`). Copy each block into **Play Console → Grow users → Store presence → Main store listing** (default language en-US), then **Manage translations → Add your own translations** for the other languages.
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

Policy notes: no "best / #1 / top" or ranking claims, no price or "free" text in the app name or icon, no emoji, exam names used only descriptively + non-affiliation line. "Free" appears only in long descriptions and promotional text – never in titles, the Play short description, subtitles or keywords (lint `PRICE` in `scripts/store-metadata.mjs`). The feature graphic and screenshots carry no "free" / call-to-action text.

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

<!-- BEGIN GENERATED: node scripts/store-metadata.mjs --write-md -->

Source: `store/metadata/<locale>.json` (block `play`). Edit there, then run `node scripts/store-metadata.mjs --check --write-md`.

## en-US

Keywords – primary: `english vocabulary` · secondary: `vocabulary builder`, `english flashcards`, `ielts vocabulary`, `toeic vocabulary`, `english dictionary`, `english pronunciation`

**App name (27/30):**
```
Lexkite: English Vocabulary
```
**Short description (74/80):**
```
English vocabulary builder: flashcards, dictionary and IELTS & TOEIC words
```
**Full description (2653/4000):**
```
Lexkite is a 100% free English vocabulary builder for everyday learners and for IELTS, TOEIC and TOEFL preparation. No subscription, no in-app purchases, no hearts or energy limits – and no account or login: open the app and start learning.

BUILD YOUR ENGLISH VOCABULARY
• 6,800+ words with IPA and audio: NGSL core words, the 570-word Academic Word List, 1,250 TOEIC words, IELTS topic vocabulary, phrasal verbs and collocations.
• A daily plan of new words and reviews, built around your goal and level.
• A 5-minute placement test shows where you are and suggests a study path.

FLASHCARDS THAT REMEMBER FOR YOU
• English flashcards scheduled by FSRS, a modern spaced repetition algorithm.
• After each card, rate how well you remembered it – the app schedules the next review right before you would forget.
• Daily reminders and a home screen widget with your cards due today and your streak.

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
• AI feedback on your writing and conversation roleplays (internet connection required).

MADE FOR EVERYDAY STUDY
• Works offline: review your flashcards and study without a connection. Looking up new words and AI features need internet.
• Streaks, daily goals, XP and progress statistics.
• Light and dark mode.
• Interface in 15 languages: English, Vietnamese, Spanish, Portuguese, French, German, Indonesian, Thai, Chinese, Japanese, Korean, Hindi, Arabic, Russian and Turkish.

PRIVATE BY DESIGN
• Your learning data is stored on your device.
• Privacy policy: https://lexkite.com/en/privacy

Learn English vocabulary a little every day – Lexkite keeps every feature free for everyone.

Questions or feedback: support@lexkite.com · https://lexkite.com

Lexkite is an independent product and is not affiliated with or endorsed by the British Council, IDP, Cambridge University Press & Assessment or ETS. IELTS, TOEIC and TOEFL are trademarks of their respective owners.
```

## vi

Keywords – primary: `từ vựng tiếng anh` · secondary: `học từ vựng`, `học tiếng anh`, `flashcard tiếng anh`, `từ vựng ielts`, `từ vựng toeic`, `phát âm tiếng anh`, `từ điển anh việt`

**App name (26/30):**
```
Lexkite: Từ vựng tiếng Anh
```
**Short description (75/80):**
```
Học từ vựng tiếng Anh bằng flashcard, tra từ Anh–Việt, luyện IELTS và TOEIC
```
**Full description (2553/4000):**
```
Lexkite là ứng dụng học từ vựng tiếng Anh miễn phí 100% cho người học hằng ngày và người luyện thi IELTS, TOEIC, TOEFL. Không có gói trả phí, không mua trong app, không giới hạn "tim" hay "năng lượng" – cũng không cần tài khoản hay đăng nhập: mở app là học được ngay.

HỌC TỪ VỰNG TIẾNG ANH ĐÚNG TRỌNG TÂM
• Hơn 6.800 từ có phiên âm IPA và phát âm: từ cốt lõi NGSL, 570 từ học thuật AWL, 1.250 từ vựng TOEIC, từ vựng IELTS theo chủ đề, phrasal verb và collocation.
• Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu và trình độ của bạn.
• Bài kiểm tra trình độ 5 phút cho biết bạn đang ở đâu và gợi ý lộ trình học.

FLASHCARD GIÚP NHỚ LÂU
• Flashcard tiếng Anh được lên lịch bằng FSRS – thuật toán lặp lại ngắt quãng hiện đại.
• Sau mỗi thẻ, bạn chấm mức độ nhớ – app hẹn lần ôn tiếp theo đúng lúc bạn sắp quên.
• Nhắc học hằng ngày và widget trên màn hình chính hiện số thẻ cần ôn hôm nay cùng chuỗi ngày học.

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
• AI nhận xét bài viết và luyện hội thoại nhập vai (cần kết nối mạng).

HỌC MỖI NGÀY THẬT DỄ
• Dùng được khi không có mạng: ôn flashcard và học bình thường. Tra từ mới và các tính năng AI cần mạng.
• Chuỗi ngày học, mục tiêu ngày, điểm XP và thống kê tiến độ.
• Giao diện sáng và tối.
• Giao diện 15 ngôn ngữ: Tiếng Việt, tiếng Anh, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Indonesia, Thái, Trung, Nhật, Hàn, Hindi, Ả Rập, Nga và Thổ Nhĩ Kỳ.

TÔN TRỌNG QUYỀN RIÊNG TƯ
• Dữ liệu học được lưu trên thiết bị của bạn.
• Chính sách quyền riêng tư: https://lexkite.com/vi/privacy

Mỗi ngày học một ít từ vựng tiếng Anh – mọi tính năng của Lexkite đều miễn phí cho tất cả mọi người.

Góp ý, hỏi đáp: support@lexkite.com · https://lexkite.com

Lexkite là sản phẩm độc lập, không liên kết và không được bảo trợ bởi British Council, IDP, Cambridge University Press & Assessment hay ETS. IELTS, TOEIC, TOEFL là nhãn hiệu của các chủ sở hữu tương ứng.
```

## es-ES

Keywords – primary: `vocabulario en inglés` · secondary: `aprender inglés`, `palabras en inglés`, `tarjetas de inglés`, `vocabulario IELTS`, `vocabulario TOEIC`, `pronunciación en inglés`, `diccionario inglés`

**App name (30/30):**
```
Lexkite: Vocabulario en inglés
```
**Short description (75/80):**
```
Vocabulario en inglés con tarjetas, diccionario y palabras de IELTS y TOEIC
```
**Full description (2964/4000):**
```
Lexkite es una app 100 % gratuita para aprender vocabulario en inglés, pensada para el día a día y para preparar IELTS, TOEIC y TOEFL. Sin suscripción, sin compras dentro de la app, sin vidas ni límites de energía y sin cuenta ni registro: abres la app y empiezas a estudiar.

CONSTRUYE TU VOCABULARIO EN INGLÉS
• Más de 6.800 palabras con IPA y audio: vocabulario básico NGSL, la Academic Word List de 570 palabras, 1.250 palabras de TOEIC, vocabulario de IELTS por temas, phrasal verbs y colocaciones.
• Un plan diario de palabras nuevas y repasos, adaptado a tu objetivo y a tu nivel.
• Una prueba de nivel de 5 minutos te dice dónde estás y te propone un itinerario de estudio.

TARJETAS QUE RECUERDAN POR TI
• Tarjetas de inglés programadas con FSRS, un algoritmo moderno de repetición espaciada.
• Tras cada tarjeta indicas cuánto la has recordado, y la app programa el siguiente repaso justo antes de que se te olvide.
• Recordatorios diarios y un widget para la pantalla de inicio con las tarjetas que te tocan hoy y tu racha.

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
• Comentarios de IA sobre tu redacción y conversaciones de rol (requiere conexión a internet).

PENSADA PARA ESTUDIAR A DIARIO
• Funciona sin conexión: repasa tus tarjetas y estudia sin internet. Buscar palabras nuevas y las funciones de IA sí la necesitan.
• Rachas, objetivos diarios, XP y estadísticas de progreso.
• Modo claro y modo oscuro.
• Interfaz en 15 idiomas: inglés, vietnamita, español, portugués, francés, alemán, indonesio, tailandés, chino, japonés, coreano, hindi, árabe, ruso y turco.

PRIVADA POR DISEÑO
• Tus datos de aprendizaje se guardan en tu dispositivo.
• Política de privacidad: https://lexkite.com/es/privacy

Aprende vocabulario en inglés un poco cada día: Lexkite mantiene todas sus funciones gratis para todo el mundo.

Dudas o comentarios: support@lexkite.com · https://lexkite.com

Lexkite es un producto independiente y no está afiliado ni respaldado por el British Council, IDP, Cambridge University Press & Assessment ni ETS. IELTS, TOEIC y TOEFL son marcas de sus respectivos propietarios.
```

## pt-BR

Keywords – primary: `vocabulário em inglês` · secondary: `aprender inglês`, `palavras em inglês`, `flashcards de inglês`, `vocabulário IELTS`, `vocabulário TOEIC`, `pronúncia em inglês`, `dicionário de inglês`

**App name (30/30):**
```
Lexkite: Vocabulário em inglês
```
**Short description (76/80):**
```
Vocabulário em inglês com flashcards, dicionário e palavras de IELTS e TOEIC
```
**Full description (2889/4000):**
```
O Lexkite é um app 100% gratuito para aprender vocabulário em inglês, feito para o dia a dia e para quem se prepara para IELTS, TOEIC e TOEFL. Sem assinatura, sem compras no app, sem vidas nem limites de energia e sem precisar de conta ou login: abra o app e comece a estudar.

CONSTRUA SEU VOCABULÁRIO EM INGLÊS
• Mais de 6.800 palavras com IPA e áudio: vocabulário essencial NGSL, a Academic Word List de 570 palavras, 1.250 palavras do TOEIC, vocabulário do IELTS por tema, phrasal verbs e colocações.
• Um plano diário de palavras novas e revisões, montado de acordo com o seu objetivo e o seu nível.
• Um teste de nível de 5 minutos mostra onde você está e sugere um caminho de estudo.

FLASHCARDS QUE LEMBRAM POR VOCÊ
• Flashcards de inglês agendados pelo FSRS, um algoritmo moderno de repetição espaçada.
• Depois de cada card, você avalia o quanto lembrou, e o app agenda a próxima revisão pouco antes de você esquecer.
• Lembretes diários e um widget na tela inicial com os cards de hoje e a sua sequência.

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
• Feedback de IA sobre a sua escrita e conversas de roleplay (requer conexão com a internet).

FEITO PARA ESTUDAR TODO DIA
• Funciona offline: revise seus flashcards e estude sem conexão. Consultar palavras novas e os recursos de IA precisam de internet.
• Sequências, metas diárias, XP e estatísticas de progresso.
• Modo claro e modo escuro.
• Interface em 15 idiomas: inglês, vietnamita, espanhol, português, francês, alemão, indonésio, tailandês, chinês, japonês, coreano, hindi, árabe, russo e turco.

PRIVADO POR PROJETO
• Seus dados de estudo ficam no seu dispositivo.
• Política de privacidade: https://lexkite.com/pt/privacy

Aprenda vocabulário em inglês um pouco a cada dia: o Lexkite mantém todos os recursos gratuitos para todo mundo.

Dúvidas ou sugestões: support@lexkite.com · https://lexkite.com

O Lexkite é um produto independente e não é afiliado nem endossado pelo British Council, IDP, Cambridge University Press & Assessment ou ETS. IELTS, TOEIC e TOEFL são marcas de seus respectivos proprietários.
```

## fr-FR

Keywords – primary: `vocabulaire anglais` · secondary: `apprendre l'anglais`, `mots anglais`, `flashcards anglais`, `vocabulaire IELTS`, `vocabulaire TOEIC`, `prononciation anglaise`, `dictionnaire anglais`

**App name (29/30):**
```
Lexkite : vocabulaire anglais
```
**Short description (79/80):**
```
Vocabulaire anglais : flashcards, dictionnaire et mots pour l'IELTS et le TOEIC
```
**Full description (3139/4000):**
```
Lexkite est une application 100 % gratuite pour apprendre le vocabulaire anglais, conçue pour le quotidien comme pour préparer l'IELTS, le TOEIC et le TOEFL. Sans abonnement, sans achats intégrés, sans vies ni limites d'énergie, et sans compte ni connexion : ouvrez l'application et lancez-vous.

ENRICHISSEZ VOTRE VOCABULAIRE ANGLAIS
• Plus de 6 800 mots avec API et audio : vocabulaire essentiel NGSL, Academic Word List de 570 mots, 1 250 mots du TOEIC, vocabulaire de l'IELTS par thème, phrasal verbs et collocations.
• Un programme quotidien de mots nouveaux et de révisions, adapté à votre objectif et à votre niveau.
• Un test de niveau de 5 minutes vous situe et vous suggère un parcours d'étude.

DES FLASHCARDS QUI SE SOUVIENNENT POUR VOUS
• Des flashcards d'anglais planifiées par FSRS, un algorithme moderne de répétition espacée.
• Après chaque carte, indiquez à quel point vous vous en souveniez : l'application programme la prochaine révision juste avant que vous n'oubliiez.
• Rappels quotidiens et un widget pour l'écran d'accueil avec les cartes à réviser aujourd'hui et votre série.

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
• Retours de l'IA sur vos écrits et dialogues en jeu de rôle (connexion Internet requise).

CONÇUE POUR ÉTUDIER AU QUOTIDIEN
• Fonctionne hors ligne : révisez vos flashcards et étudiez sans connexion. La recherche de nouveaux mots et les fonctions d'IA nécessitent Internet.
• Séries, objectifs quotidiens, XP et statistiques de progression.
• Mode clair et mode sombre.
• Interface en 15 langues : anglais, vietnamien, espagnol, portugais, français, allemand, indonésien, thaï, chinois, japonais, coréen, hindi, arabe, russe et turc.

RESPECTUEUSE DE VOTRE VIE PRIVÉE
• Vos données d'apprentissage restent sur votre appareil.
• Politique de confidentialité : https://lexkite.com/fr/privacy

Enrichissez votre vocabulaire anglais un peu chaque jour : Lexkite garde toutes ses fonctions gratuites pour tout le monde.

Une question, un avis ? support@lexkite.com · https://lexkite.com

Lexkite est un produit indépendant, sans lien avec le British Council, IDP, Cambridge University Press & Assessment ou ETS, et non approuvé par eux. IELTS, TOEIC et TOEFL sont des marques de leurs propriétaires respectifs.
```

## de-DE

Keywords – primary: `englisch vokabeln` · secondary: `englisch lernen`, `vokabeltrainer`, `karteikarten englisch`, `ielts vokabeln`, `toeic vokabeln`, `englisch wörterbuch`, `englisch aussprache`

**App name (26/30):**
```
Lexkite: Englisch-Vokabeln
```
**Short description (80/80):**
```
Englisch-Vokabeln lernen mit Karteikarten, Wörterbuch und IELTS- & TOEIC-Wörtern
```
**Full description (3020/4000):**
```
Lexkite ist die 100 % kostenlose App, um Englisch-Vokabeln zu lernen – für den Alltag und für die Vorbereitung auf IELTS, TOEIC und TOEFL. Kein Abo, keine In-App-Käufe, keine Herzen oder Energie-Limits – und kein Konto, keine Anmeldung: App öffnen und loslegen.

ENGLISCH-VOKABELN GEZIELT LERNEN
• Über 6.800 Wörter mit Lautschrift (IPA) und Audio: Grundwortschatz (NGSL), die 570 Wörter der Academic Word List, 1.250 TOEIC-Wörter, IELTS-Themenwortschatz, Phrasal Verbs und Kollokationen.
• Ein Tagesplan mit neuen Wörtern und Wiederholungen, passend zu deinem Ziel und Niveau.
• Ein 5-minütiger Einstufungstest zeigt, wo du stehst, und schlägt einen Lernweg vor.

KARTEIKARTEN, DIE FÜR DICH MITDENKEN
• Englische Karteikarten, geplant mit FSRS, einem modernen Algorithmus für verteilte Wiederholung.
• Nach jeder Karte bewertest du, wie gut du dich erinnert hast – die App legt die nächste Wiederholung kurz vor das Vergessen.
• Tägliche Erinnerungen und ein Widget für den Startbildschirm mit den heute fälligen Karten und deiner Lernserie.

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
• KI-Feedback zu deinen Texten und Rollenspiel-Gespräche (Internetverbindung erforderlich).

FÜRS TÄGLICHE LERNEN GEMACHT
• Funktioniert offline: Karteikarten wiederholen und lernen ohne Verbindung. Das Nachschlagen neuer Wörter und die KI-Funktionen brauchen Internet.
• Lernserien, Tagesziele, XP und Fortschrittsstatistiken.
• Heller und dunkler Modus.
• Oberfläche in 15 Sprachen: Englisch, Vietnamesisch, Spanisch, Portugiesisch, Französisch, Deutsch, Indonesisch, Thailändisch, Chinesisch, Japanisch, Koreanisch, Hindi, Arabisch, Russisch und Türkisch.

PRIVATSPHÄRE VON ANFANG AN
• Deine Lerndaten werden auf deinem Gerät gespeichert.
• Datenschutzerklärung: https://lexkite.com/de/privacy

Englisch-Vokabeln lernen, jeden Tag ein bisschen – Lexkite hält alle Funktionen für alle kostenlos.

Fragen oder Feedback: support@lexkite.com · https://lexkite.com

Lexkite ist ein unabhängiges Produkt und steht in keiner Verbindung zu British Council, IDP, Cambridge University Press & Assessment oder ETS und wird von diesen nicht unterstützt. IELTS, TOEIC und TOEFL sind Marken ihrer jeweiligen Inhaber.
```

## id

Keywords – primary: `kosakata bahasa inggris` · secondary: `belajar bahasa inggris`, `kosakata ielts`, `kosakata toefl`, `flashcard bahasa inggris`, `kamus inggris indonesia`, `pelafalan bahasa inggris`, `hafalan bahasa inggris`

**App name (25/30):**
```
Lexkite: Kosakata Inggris
```
**Short description (76/80):**
```
Kosakata bahasa Inggris: kartu hafalan FSRS, kamus, dan latihan IELTS, TOEIC
```
**Full description (2798/4000):**
```
Lexkite adalah aplikasi kosakata bahasa Inggris yang 100% gratis untuk pembelajar sehari-hari dan persiapan IELTS, TOEIC, dan TOEFL. Tanpa langganan, tanpa pembelian dalam aplikasi, tanpa batas "nyawa" atau energi – dan tanpa akun atau login: buka aplikasinya, langsung belajar.

MEMBANGUN KOSAKATA BAHASA INGGRIS
• Lebih dari 6.800 kata dengan IPA dan audio: kosakata inti NGSL, Academic Word List 570 kata, 1.250 kata TOEIC, kosakata topik IELTS, phrasal verb, dan kolokasi.
• Rencana harian berisi kata baru dan ulasan, disesuaikan dengan target dan levelmu.
• Tes penempatan 5 menit menunjukkan posisimu dan menyarankan jalur belajar.

KARTU HAFALAN YANG MENGINGATKAN UNTUKMU
• Kartu hafalan bahasa Inggris dijadwalkan oleh FSRS, algoritma pengulangan berjarak yang modern.
• Setelah tiap kartu, nilai seberapa baik kamu mengingatnya – aplikasi menjadwalkan ulasan berikutnya tepat sebelum kamu lupa.
• Pengingat harian dan widget layar utama berisi kartu yang jatuh tempo hari ini serta runtunan harimu.

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
• Masukan AI untuk tulisanmu dan percakapan roleplay (perlu internet).

BELAJAR JADI MUDAH SETIAP HARI
• Bisa dipakai offline: ulangi kartu hafalan dan belajar tanpa koneksi. Mencari kata baru dan fitur AI perlu internet.
• Runtunan hari, target harian, XP, dan statistik kemajuan.
• Mode terang dan gelap.
• Antarmuka dalam 15 bahasa: Inggris, Vietnam, Spanyol, Portugis, Prancis, Jerman, Indonesia, Thai, Mandarin, Jepang, Korea, Hindi, Arab, Rusia, dan Turki.

PRIVASI TERJAGA
• Data belajarmu disimpan di perangkatmu.
• Kebijakan privasi: https://lexkite.com/id/privacy

Belajar kosakata bahasa Inggris sedikit demi sedikit setiap hari – Lexkite membuat semua fiturnya gratis untuk semua orang.

Pertanyaan atau masukan: support@lexkite.com · https://lexkite.com

Lexkite adalah produk independen dan tidak berafiliasi dengan atau didukung oleh British Council, IDP, Cambridge University Press & Assessment, maupun ETS. IELTS, TOEIC, dan TOEFL adalah merek dagang milik pemiliknya masing-masing.
```

## th

Keywords – primary: `คำศัพท์ภาษาอังกฤษ` · secondary: `เรียนภาษาอังกฤษ`, `ศัพท์อังกฤษ`, `แฟลชการ์ดภาษาอังกฤษ`, `คำศัพท์ IELTS`, `คำศัพท์ TOEIC`, `พจนานุกรมอังกฤษ-ไทย`, `ออกเสียงภาษาอังกฤษ`

**App name (26/30):**
```
Lexkite: คำศัพท์ภาษาอังกฤษ
```
**Short description (68/80):**
```
คำศัพท์ภาษาอังกฤษด้วยแฟลชการ์ด FSRS พจนานุกรม และข้อสอบ IELTS, TOEIC
```
**Full description (2445/4000):**
```
Lexkite เป็นแอปเรียนคำศัพท์ภาษาอังกฤษที่ฟรี 100% สำหรับการเรียนทุกวันและการเตรียมสอบ IELTS, TOEIC, TOEFL ไม่มีค่าสมาชิก ไม่มีการซื้อในแอป ไม่จำกัดหัวใจหรือพลังงาน และไม่ต้องสมัครบัญชีหรือเข้าสู่ระบบ เปิดแอปแล้วเริ่มเรียนได้ทันที

เพิ่มคำศัพท์ภาษาอังกฤษของคุณ
• คำศัพท์กว่า 6,800 คำ พร้อมคำอ่าน IPA และเสียง: คำศัพท์พื้นฐาน NGSL, Academic Word List 570 คำ, คำศัพท์ TOEIC 1,250 คำ, หัวข้อ IELTS, phrasal verb และ collocation
• แผนรายวันที่รวมคำใหม่และการทบทวน จัดให้ตามเป้าหมายและระดับของคุณ
• แบบทดสอบวัดระดับ 5 นาทีบอกว่าตอนนี้คุณอยู่ตรงไหน พร้อมแนะนำแผนการเรียนที่เหมาะกับคุณ

แฟลชการ์ดที่จำให้คุณ
• แฟลชการ์ดภาษาอังกฤษที่จัดตารางทบทวนด้วย FSRS อัลกอริทึมทบทวนแบบเว้นระยะสมัยใหม่
• หลังจบแต่ละการ์ด ให้คะแนนว่าจำได้แค่ไหน แอปจะนัดทบทวนครั้งถัดไปก่อนที่คุณจะลืม
• การแจ้งเตือนรายวัน และวิดเจ็ตหน้าจอโฮมที่แสดงการ์ดที่ต้องทบทวนวันนี้และสถิติเรียนต่อเนื่อง

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
• AI ให้คำแนะนำงานเขียนและฝึกสนทนาแบบบทบาทสมมติ (ต้องใช้อินเทอร์เน็ต)

เรียนได้ง่ายทุกวัน
• ใช้งานออฟไลน์ได้: ทบทวนแฟลชการ์ดและเรียนได้โดยไม่ต้องต่ออินเทอร์เน็ต ส่วนการค้นหาคำใหม่และฟีเจอร์ AI ต้องใช้อินเทอร์เน็ต
• สถิติการเรียนต่อเนื่อง เป้าหมายรายวัน XP และสถิติความก้าวหน้า
• โหมดสว่างและโหมดมืด
• อินเทอร์เฟซ 15 ภาษา: อังกฤษ เวียดนาม สเปน โปรตุเกส ฝรั่งเศส เยอรมัน อินโดนีเซีย ไทย จีน ญี่ปุ่น เกาหลี ฮินดี อาหรับ รัสเซีย และตุรกี

เป็นส่วนตัวโดยออกแบบ
• ข้อมูลการเรียนของคุณเก็บไว้ในอุปกรณ์
• นโยบายความเป็นส่วนตัว: https://lexkite.com/th/privacy

ท่องคำศัพท์ภาษาอังกฤษวันละนิด Lexkite เปิดทุกฟีเจอร์ให้ใช้ฟรีสำหรับทุกคน

มีคำถามหรือข้อเสนอแนะ: support@lexkite.com · https://lexkite.com

Lexkite เป็นผลิตภัณฑ์อิสระ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก British Council, IDP, Cambridge University Press & Assessment หรือ ETS โดย IELTS, TOEIC และ TOEFL เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย
```

## zh-CN

Keywords – primary: `英语单词` · secondary: `背单词`, `学英语`, `雅思词汇`, `托业单词`, `英语词典`, `英语发音`, `单词闪卡`

**App name (12/30):**
```
Lexkite：英语单词
```
**Short description (31/80):**
```
背英语单词：FSRS 闪卡、英语词典，雅思、托业词汇与模考练习
```
**Full description (1183/4000):**
```
Lexkite 是一款 100% 免费的英语单词学习应用，适合日常积累，也适合 IELTS（雅思）、TOEIC（托业）、TOEFL（托福）备考。无订阅、无内购、没有红心或体力限制，也无需注册登录：打开就能开始学。

【积累英语单词】
• 6,800+ 单词，配音标（IPA）和真人发音：NGSL 核心词、570 词的学术词汇表（AWL）、1,250 个 TOEIC 词汇、IELTS 话题词汇、短语动词和固定搭配。
• 每日学习计划：新词加复习，根据你的目标和水平自动安排。
• 5 分钟水平测试，帮你了解当前词汇量，并推荐学习路径。

【闪卡，替你记住】
• 英语单词闪卡由现代间隔重复算法 FSRS 安排复习。
• 每张卡片学完后，评价自己记得多牢，应用会把下一次复习安排在你快要忘记之前。
• 每日提醒，以及显示今日待复习卡片和连续学习天数的主屏幕小组件。

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
• AI 点评你的写作，并可进行情景对话练习（需联网）。

【适合每天坚持学习】
• 可离线使用：没有网络也能复习闪卡、继续学习；查新词和 AI 功能需要联网。
• 连续学习天数、每日目标、经验值（XP）和学习统计。
• 浅色与深色模式。
• 15 种界面语言：英语、越南语、西班牙语、葡萄牙语、法语、德语、印尼语、泰语、中文、日语、韩语、印地语、阿拉伯语、俄语和土耳其语。

【隐私优先】
• 你的学习数据保存在你的设备上。
• 隐私政策：https://lexkite.com/zh/privacy

每天背一点英语单词，Lexkite 让所有功能对所有人保持免费。

问题或建议：support@lexkite.com · https://lexkite.com

Lexkite 是独立产品，与 British Council、IDP、Cambridge University Press & Assessment 及 ETS 均无关联，亦未获其认可。IELTS、TOEIC 和 TOEFL 是其各自所有者的商标。
```

## ja-JP

Keywords – primary: `英単語` · secondary: `英語学習`, `単語帳`, `TOEIC 単語`, `英語 発音`, `英語辞書`, `単語カード`

**App name (11/30):**
```
Lexkite：英単語
```
**Short description (44/80):**
```
英単語を単語カードで習得。辞書、IELTS・TOEIC・TOEFL 対策の単語と模試つき
```
**Full description (1481/4000):**
```
Lexkite は、100% 無料で使える英単語学習アプリです。毎日の英語学習にも、IELTS・TOEIC・TOEFL 対策にも使えます。サブスクなし、アプリ内課金なし、ハートやエネルギーの制限もなし。アカウント登録やログインも不要で、開けばすぐ学習を始められます。

■ 英単語を増やす
• 6,800 語以上を発音記号（IPA）と音声付きで収録：NGSL の基本語、570 語の Academic Word List、TOEIC 頻出語 1,250 語、IELTS のトピック別単語、句動詞、コロケーション。
• 新しい単語と復習をまとめた毎日の学習プラン。目標とレベルに合わせて組まれます。
• 5 分のレベル診断で現在地がわかり、学習の進め方も提案します。

■ 忘れる前に復習できる単語カード
• 英単語の単語カードは、最新の間隔反復アルゴリズム FSRS が復習タイミングを管理します。
• カードごとに覚えていた度合いを選ぶと、忘れる直前に次の復習がやってきます。
• 毎日のリマインダーと、今日の復習カード数や連続学習日数を表示するホーム画面ウィジェット。

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
• AI による英作文のフィードバックとロールプレイ会話（インターネット接続が必要）。

■ 毎日続けやすい設計
• オフライン対応：電波がなくても単語カードの復習や学習ができます。新しい単語の検索と AI 機能にはインターネットが必要です。
• 連続学習日数、毎日の目標、XP、学習統計。
• ライトモードとダークモード。
• 15 言語の表示に対応：英語、ベトナム語、スペイン語、ポルトガル語、フランス語、ドイツ語、インドネシア語、タイ語、中国語、日本語、韓国語、ヒンディー語、アラビア語、ロシア語、トルコ語。

■ プライバシーに配慮
• 学習データはお使いの端末に保存されます。
• プライバシーポリシー：https://lexkite.com/ja/privacy

英単語を毎日少しずつ。Lexkite は、すべての機能をみなさんに無料でお届けします。

ご質問・ご意見：support@lexkite.com · https://lexkite.com

Lexkite は独立した製品であり、British Council、IDP、Cambridge University Press & Assessment、ETS とは提携しておらず、承認も受けていません。IELTS、TOEIC、TOEFL は各所有者の商標です。
```

## ko-KR

Keywords – primary: `영어 단어` · secondary: `영단어`, `단어장`, `토익 단어`, `영어 공부`, `영어 사전`, `영어 발음`, `플래시카드`

**App name (14/30):**
```
Lexkite: 영어 단어
```
**Short description (53/80):**
```
영어 단어를 FSRS 플래시카드로 암기. 사전, IELTS·TOEIC·TOEFL 단어와 모의고사
```
**Full description (1556/4000):**
```
Lexkite는 100% 무료로 쓸 수 있는 영어 단어 학습 앱입니다. 일상 영어 공부는 물론 IELTS, TOEIC, TOEFL 준비에도 좋습니다. 구독도, 인앱 결제도, 하트나 에너지 제한도 없고, 계정이나 로그인도 필요 없습니다. 앱을 열고 바로 시작하세요.

■ 영어 단어 늘리기
• 발음기호(IPA)와 음성이 있는 6,800개 이상의 단어: NGSL 핵심 어휘, 570단어의 학술 어휘 목록(AWL), TOEIC 단어 1,250개, IELTS 주제별 단어, 구동사, 연어.
• 새 단어와 복습을 함께 담은 하루 학습 계획. 목표와 수준에 맞춰 짜 드립니다.
• 5분 레벨 테스트로 현재 실력을 확인하고 학습 방향을 추천받으세요.

■ 대신 기억해 주는 플래시카드
• 영어 단어 플래시카드는 최신 간격 반복 알고리즘 FSRS가 복습 시점을 관리합니다.
• 카드마다 얼마나 기억했는지 평가하면, 잊어버리기 직전에 다음 복습이 찾아옵니다.
• 매일 알림, 그리고 오늘 복습할 카드 수와 연속 학습일을 보여 주는 홈 화면 위젯.

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
• AI 작문 피드백과 롤플레이 대화(인터넷 연결 필요).

■ 매일 꾸준히 공부하도록
• 오프라인 지원: 연결이 없어도 플래시카드 복습과 학습이 가능합니다. 새 단어 검색과 AI 기능은 인터넷이 필요합니다.
• 연속 학습일, 일일 목표, XP, 학습 통계.
• 라이트 모드와 다크 모드.
• 15개 언어 인터페이스: 영어, 베트남어, 스페인어, 포르투갈어, 프랑스어, 독일어, 인도네시아어, 태국어, 중국어, 일본어, 한국어, 힌디어, 아랍어, 러시아어, 튀르키예어.

■ 개인정보 보호
• 학습 데이터는 내 기기에 저장됩니다.
• 개인정보처리방침: https://lexkite.com/ko/privacy

영어 단어를 매일 조금씩. Lexkite는 모든 기능을 모두에게 무료로 제공합니다.

문의 및 의견: support@lexkite.com · https://lexkite.com

Lexkite는 독립 제품이며 British Council, IDP, Cambridge University Press & Assessment, ETS와 제휴하거나 승인을 받지 않았습니다. IELTS, TOEIC, TOEFL은 각 소유자의 상표입니다.
```

## hi-IN

Keywords – primary: `english vocabulary` · secondary: `अंग्रेज़ी शब्दावली`, `अंग्रेज़ी सीखें`, `अंग्रेज़ी शब्द`, `ielts vocabulary`, `toeic vocabulary`, `english flashcards`, `अंग्रेज़ी शब्दकोश`

**App name (27/30):**
```
Lexkite: English Vocabulary
```
**Short description (74/80):**
```
फ़्लैशकार्ड, शब्दकोश और IELTS-TOEIC अभ्यास के साथ English Vocabulary सीखें
```
**Full description (2583/4000):**
```
Lexkite अंग्रेज़ी शब्दावली सीखने का 100% मुफ़्त ऐप है – रोज़ English Vocabulary बढ़ाने वालों और IELTS, TOEIC, TOEFL की तैयारी करने वालों के लिए। कोई सब्सक्रिप्शन नहीं, कोई इन-ऐप ख़रीदारी नहीं, "लाइव्स" या एनर्जी की कोई सीमा नहीं – और खाता या लॉगिन भी नहीं: ऐप खोलिए और सीखना शुरू कीजिए।

अपनी English Vocabulary बढ़ाएँ
• IPA और ऑडियो के साथ 6,800+ शब्द: NGSL के मुख्य शब्द, 570 शब्दों की Academic Word List, 1,250 TOEIC शब्द, IELTS विषयों के शब्द, phrasal verbs और collocations।
• आपके लक्ष्य और स्तर के हिसाब से नए शब्दों और रिवीज़न का रोज़ाना प्लान।
• 5 मिनट का लेवल टेस्ट बताता है कि आप अभी कहाँ हैं और पढ़ाई का रास्ता सुझाता है।

फ़्लैशकार्ड जो आपके लिए याद रखें
• FSRS – एक आधुनिक spaced repetition एल्गोरिद्म – से तय होने वाले अंग्रेज़ी फ़्लैशकार्ड।
• हर कार्ड के बाद बताइए कि कितना याद रहा – ऐप अगला रिवीज़न आपके भूलने से ठीक पहले तय करता है।
• रोज़ाना रिमाइंडर और होम स्क्रीन विजेट, जिसमें आज के कार्ड और आपकी स्ट्रीक दिखती है।

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
• आपके लेखन पर AI फ़ीडबैक और रोलप्ले बातचीत (इंटरनेट ज़रूरी)।

रोज़ की पढ़ाई आसान
• ऑफ़लाइन भी चलता है: बिना कनेक्शन के फ़्लैशकार्ड दोहराएँ और पढ़ें। नए शब्द खोजने और AI सुविधाओं के लिए इंटरनेट चाहिए।
• लगातार दिनों की स्ट्रीक, रोज़ाना लक्ष्य, XP और प्रगति के आँकड़े।
• लाइट और डार्क मोड।
• 15 भाषाओं में इंटरफ़ेस: अंग्रेज़ी, वियतनामी, स्पेनिश, पुर्तगाली, फ़्रेंच, जर्मन, इंडोनेशियाई, थाई, चीनी, जापानी, कोरियाई, हिंदी, अरबी, रूसी और तुर्की।

डिज़ाइन से ही निजी
• आपका सीखने का डेटा आपके डिवाइस पर रहता है।
• गोपनीयता नीति: https://lexkite.com/hi/privacy

रोज़ थोड़ी English Vocabulary सीखिए – Lexkite की हर सुविधा सबके लिए मुफ़्त है।

सवाल या सुझाव: support@lexkite.com · https://lexkite.com

Lexkite एक स्वतंत्र उत्पाद है और British Council, IDP, Cambridge University Press & Assessment या ETS से संबद्ध या उनके द्वारा समर्थित नहीं है। IELTS, TOEIC और TOEFL अपने-अपने स्वामियों के ट्रेडमार्क हैं।
```

## ar

Keywords – primary: `كلمات إنجليزية` · secondary: `تعلم الإنجليزية`, `مفردات إنجليزية`, `بطاقات إنجليزية`, `مفردات آيلتس`, `مفردات توفل`, `قاموس إنجليزي`, `نطق الإنجليزية`

**App name (23/30):**
```
Lexkite: كلمات إنجليزية
```
**Short description (67/80):**
```
بطاقات FSRS وقاموس بالنطق وكلمات IELTS وTOEIC لتعلّم كلمات إنجليزية
```
**Full description (2537/4000):**
```
Lexkite تطبيق مجاني 100% لتعلّم الكلمات الإنجليزية وبناء الحصيلة اللغوية، سواء للدراسة اليومية أو للاستعداد لاختبارات IELTS وTOEIC وTOEFL. بلا اشتراك، وبلا مشتريات داخل التطبيق، وبلا قلوب أو حدود للطاقة، ولا حاجة إلى حساب أو تسجيل دخول: افتح التطبيق وابدأ التعلّم.

ابنِ رصيدك من الكلمات الإنجليزية
• أكثر من 6,800 كلمة مع النطق الصوتي (IPA) والصوت: الكلمات الأساسية NGSL، وقائمة الكلمات الأكاديمية AWL البالغة 570 كلمة، و1,250 كلمة من TOEIC، ومفردات موضوعات IELTS، والأفعال المركّبة والمتلازمات اللفظية.
• خطة يومية من الكلمات الجديدة والمراجعات، مبنية على هدفك ومستواك.
• اختبار تحديد مستوى في 5 دقائق يكشف مستواك ويقترح لك مسار الدراسة.

بطاقات تتذكّر عنك
• بطاقات للكلمات الإنجليزية تُجدوَل بخوارزمية FSRS، وهي خوارزمية حديثة للتكرار المتباعد.
• بعد كل بطاقة قيّم مدى تذكّرك للكلمة، فيحدد التطبيق موعد المراجعة التالية قبل أن تنساها مباشرة.
• تذكيرات يومية وأداة على الشاشة الرئيسية تعرض بطاقات اليوم وسلسلة أيامك.

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
• ملاحظات بالذكاء الاصطناعي على كتابتك ومحادثات لعب الأدوار (يتطلب الاتصال بالإنترنت).

صُمّم للدراسة اليومية
• يعمل دون اتصال: راجع بطاقاتك وادرس دون إنترنت. أما البحث عن كلمات جديدة وميزات الذكاء الاصطناعي فتتطلب الاتصال بالإنترنت.
• سلسلة أيام التعلّم، وأهداف يومية، ونقاط خبرة XP، وإحصاءات للتقدّم.
• وضع فاتح ووضع داكن.
• واجهة بـ 15 لغة: الإنجليزية والفيتنامية والإسبانية والبرتغالية والفرنسية والألمانية والإندونيسية والتايلاندية والصينية واليابانية والكورية والهندية والعربية والروسية والتركية.

خصوصيتك أولًا
• تُحفظ بيانات تعلّمك على جهازك.
• سياسة الخصوصية: https://lexkite.com/ar/privacy

تعلّم الكلمات الإنجليزية قليلًا كل يوم، وسيبقى Lexkite مجانيًا بكل ميزاته للجميع.

للأسئلة والملاحظات: support@lexkite.com · https://lexkite.com

Lexkite منتج مستقل وغير تابع أو معتمد من British Council أو IDP أو Cambridge University Press & Assessment أو ETS. إن IELTS وTOEIC وTOEFL علامات تجارية لأصحابها.
```

## ru-RU

Keywords – primary: `английские слова` · secondary: `учить английский`, `английские слова карточки`, `учить английские слова`, `английский словарь`, `лексика ielts`, `лексика toeic`, `произношение английских слов`

**App name (25/30):**
```
Lexkite: английские слова
```
**Short description (75/80):**
```
Английские слова: карточки, словарь с произношением и лексика IELTS и TOEIC
```
**Full description (2776/4000):**
```
Lexkite — полностью бесплатное (100 %) приложение, чтобы учить английские слова: для ежедневных занятий и подготовки к IELTS, TOEIC и TOEFL. Без подписки, без покупок в приложении, без «сердечек» и лимитов энергии — и без аккаунта: откройте приложение и начинайте учиться.

УЧИТЕ АНГЛИЙСКИЕ СЛОВА С УМОМ
• Более 6 800 слов с транскрипцией (IPA) и озвучкой: базовая лексика NGSL, 570 слов Academic Word List, 1 250 слов TOEIC, тематическая лексика IELTS, фразовые глаголы и коллокации.
• Ежедневный план из новых слов и повторений под вашу цель и уровень.
• 5-минутный тест уровня покажет, где вы сейчас, и предложит маршрут обучения.

КАРТОЧКИ, КОТОРЫЕ ПОМНЯТ ЗА ВАС
• Карточки по современному алгоритму интервального повторения FSRS.
• После каждой карточки вы отмечаете, как хорошо запомнили слово, — а приложение назначает повтор незадолго до того, как вы начнёте его забывать.
• Ежедневные напоминания и виджет на главном экране с карточками на сегодня и вашей серией дней.

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
• Отзыв ИИ на ваши тексты и ролевые диалоги (нужен интернет).

СОЗДАНО ДЛЯ ЕЖЕДНЕВНЫХ ЗАНЯТИЙ
• Работает офлайн: повторяйте карточки и занимайтесь без соединения. Для поиска новых слов и функций ИИ нужен интернет.
• Серии дней, ежедневные цели, XP и статистика прогресса.
• Светлая и тёмная темы.
• Интерфейс на 15 языках: английский, вьетнамский, испанский, португальский, французский, немецкий, индонезийский, тайский, китайский, японский, корейский, хинди, арабский, русский и турецкий.

ПРИВАТНОСТЬ ПО УМОЛЧАНИЮ
• Данные обучения хранятся на вашем устройстве.
• Политика конфиденциальности: https://lexkite.com/ru/privacy

Учите английские слова понемногу каждый день — Lexkite оставляет все функции бесплатными для всех.

Вопросы и отзывы: support@lexkite.com · https://lexkite.com

Lexkite — независимый продукт, не связанный с British Council, IDP, Cambridge University Press & Assessment или ETS и не одобренный ими. IELTS, TOEIC и TOEFL — товарные знаки их владельцев.
```

## tr-TR

Keywords – primary: `İngilizce kelime` · secondary: `İngilizce öğren`, `kelime ezberleme`, `İngilizce kelime kartları`, `IELTS kelimeleri`, `TOEIC kelimeleri`, `İngilizce sözlük`, `İngilizce telaffuz`

**App name (25/30):**
```
Lexkite: İngilizce Kelime
```
**Short description (77/80):**
```
İngilizce kelime öğren: kartlar, telaffuzlu sözlük, IELTS ve TOEIC kelimeleri
```
**Full description (2815/4000):**
```
Lexkite, İngilizce kelime öğrenmek isteyenler ve IELTS, TOEIC, TOEFL'a hazırlananlar için %100 ücretsiz bir uygulamadır. Abonelik yok, uygulama içi satın alma yok, can ya da enerji sınırı yok – hesap veya giriş de gerekmez: uygulamayı aç ve hemen öğrenmeye başla.

İNGİLİZCE KELİME DAĞARCIĞINI GELİŞTİR
• IPA ve sesli telaffuzla 6.800'den fazla kelime: NGSL temel kelimeleri, 570 kelimelik Academic Word List, 1.250 TOEIC kelimesi, IELTS konu kelimeleri, phrasal verb'ler ve eşdizimler.
• Hedefine ve seviyene göre hazırlanan, yeni kelime ve tekrarlardan oluşan günlük plan.
• 5 dakikalık seviye tespit sınavı nerede olduğunu gösterir ve bir çalışma yolu önerir.

SENİN YERİNE HATIRLAYAN KELİME KARTLARI
• Modern bir aralıklı tekrar algoritması olan FSRS ile planlanan İngilizce kelime kartları.
• Her karttan sonra ne kadar hatırladığını işaretlersin – uygulama bir sonraki tekrarı unutmadan hemen önceye koyar.
• Günlük hatırlatıcılar ve ana ekranda bugün tekrar edilecek kartlarını ve seri günlerini gösteren bir widget.

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
• Yazdıklarına yapay zekâ geri bildirimi ve rol yapma konuşmaları (internet bağlantısı gerekir).

HER GÜN ÇALIŞMAYA GÖRE TASARLANDI
• Çevrimdışı çalışır: bağlantı olmadan kartlarını tekrar edebilir ve çalışabilirsin. Yeni kelime aramak ve yapay zekâ özellikleri internet ister.
• Seri günler, günlük hedefler, XP ve ilerleme istatistikleri.
• Açık ve koyu mod.
• 15 dilde arayüz: İngilizce, Vietnamca, İspanyolca, Portekizce, Fransızca, Almanca, Endonezce, Tayca, Çince, Japonca, Korece, Hintçe, Arapça, Rusça ve Türkçe.

TASARIMDAN GELEN GİZLİLİK
• Öğrenme verilerin cihazında saklanır.
• Gizlilik politikası: https://lexkite.com/tr/privacy

Her gün biraz İngilizce kelime öğren – Lexkite tüm özellikleri herkes için ücretsiz tutar.

Soru ve geri bildirimler için: support@lexkite.com · https://lexkite.com

Lexkite bağımsız bir üründür; British Council, IDP, Cambridge University Press & Assessment veya ETS ile bağlantılı değildir ve bunlar tarafından onaylanmamıştır. IELTS, TOEIC ve TOEFL, ilgili sahiplerinin ticari markalarıdır.
```

<!-- END GENERATED -->
