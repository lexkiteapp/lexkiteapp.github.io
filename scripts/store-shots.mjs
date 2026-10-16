// Ảnh Chrome Web Store từ add-on THẬT (nạp extension/ vào Chromium): 5 ảnh 1280×800 (en + vi) + ô quảng cáo 440×280 & 1400×560.
// Thiết kế: nền xanh đậm thương hiệu, tiêu đề lớn có chữ nhấn, 3 lợi ích, ảnh thật trong khung trình duyệt. PNG 24-bit (không alpha).
// Chạy trên GitHub Actions (.github/workflows/store-shots.yml) – cần mạng để tra từ/dịch như người dùng thật.
// Dùng: node scripts/store-shots.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OUT = path.resolve(process.argv[2] || 'store-shots');
const EXT = path.resolve('extension');
const LOCALE = { en: 'es-ES', pt: 'pt-BR', zh: 'zh-CN' }; // en: trình duyệt tiếng Tây Ban Nha → bảng dịch EN → ES
const W = 1280, H = 800, sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
const FONT = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';

// [nhãn nhỏ, tiêu đề (<em> = chữ nhấn), phụ đề, 3 lợi ích, địa chỉ trên thanh trình duyệt]
const CAP = {
  en: [
    ['On any website', 'Double-click.<br><em>Understand instantly.</em>', 'Pronunciation, meanings and examples right where you read.', ['British & American IPA + audio', 'Meanings by part of speech', 'Save with the original sentence'], 'dailyplanet.com/environment'],
    ['Translate & learn grammar', 'Select a sentence.<br><em>See how it works.</em>', 'Instant translation plus the grammar structures inside it.', ['Translate any selection', 'Grammar patterns explained', 'Listen at normal or slow speed'], 'dailyplanet.com/environment'],
    ['Toolbar popup', 'Your daily study,<br><em>one click away.</em>', 'Due cards, daily goal, quick lookup and a 1-minute review.', ['Cards due today at a glance', 'Quick review without leaving the page', 'Sync across devices (optional)'], ''],
    ['New tab', 'Learn a word<br><em>every new tab.</em>', 'A flashcard from your own deck each time you open a tab.', ['Words picked at the right moment', 'One tap: got it / review again', 'Turn off anytime'], 'New Tab'],
    ['Full study app included', 'Remember words<br><em>for good.</em>', 'FSRS spaced repetition plus IELTS & TOEIC practice – free.', ['FSRS reviews like Anki', '6,000+ words with audio', 'Practice tests with explanations'], 'Lexkite'],
  ],
  vi: [
    ['Trên mọi trang web', 'Bấm đúp vào từ.<br><em>Hiểu ngay lập tức.</em>', 'Phiên âm, phát âm, nghĩa và ví dụ ngay tại chỗ bạn đọc.', ['Phiên âm Anh–Anh & Anh–Mỹ', 'Nghĩa theo từ loại', 'Lưu kèm câu gốc'], 'dailyplanet.com/environment'],
    ['Dịch & học ngữ pháp', 'Bôi đen một câu.<br><em>Hiểu cả cấu trúc.</em>', 'Dịch tức thì, kèm giải thích các cấu trúc ngữ pháp trong câu.', ['Dịch mọi đoạn bôi đen', 'Giải thích cấu trúc ngữ pháp', 'Nghe tốc độ thường hoặc chậm'], 'dailyplanet.com/environment'],
    ['Cửa sổ tiện ích', 'Việc học mỗi ngày,<br><em>chỉ một cú bấm.</em>', 'Thẻ cần ôn, mục tiêu ngày, tra nhanh và ôn 1 phút.', ['Thấy ngay số thẻ cần ôn', 'Ôn nhanh không rời trang', 'Đồng bộ nhiều thiết bị (tùy chọn)'], ''],
    ['Tab mới', 'Mỗi tab mới,<br><em>thêm một từ.</em>', 'Một thẻ từ chính sổ của bạn mỗi lần mở tab.', ['Chọn từ đúng thời điểm vàng', 'Một chạm: đã nhớ / ôn lại', 'Tắt bất cứ lúc nào'], 'Tab mới'],
    ['Kèm ứng dụng học đầy đủ', 'Nhớ từ vựng<br><em>thật lâu.</em>', 'Lặp lại ngắt quãng FSRS, luyện IELTS & TOEIC – miễn phí.', ['Ôn FSRS như Anki', '6.000+ từ có phát âm', 'Đề luyện có giải thích'], 'Lexkite'],
  ],
  es: [
    ['En cualquier web', 'Doble clic.<br><em>Entiende al instante.</em>', 'Pronunciación, significados y ejemplos justo donde lees.', ['IPA británico y americano + audio', 'Significados por categoría', 'Guarda la frase original'], 'dailyplanet.com/environment'],
    ['Traduce y aprende gramática', 'Selecciona una frase.<br><em>Entiende su estructura.</em>', 'Traducción al instante con las estructuras gramaticales explicadas.', ['Traduce cualquier selección', 'Gramática explicada', 'Escucha a velocidad normal o lenta'], 'dailyplanet.com/environment'],
    ['Ventana de la extensión', 'Tu estudio diario,<br><em>a un clic.</em>', 'Tarjetas pendientes, meta diaria, búsqueda rápida y repaso de 1 minuto.', ['Tus tarjetas de hoy de un vistazo', 'Repaso rápido sin salir de la página', 'Sincroniza tus dispositivos (opcional)'], ''],
    ['Nueva pestaña', 'Una palabra<br><em>en cada pestaña.</em>', 'Una tarjeta de tu propio mazo cada vez que abres una pestaña.', ['Palabras en el momento justo', 'Un toque: la sé / repasar', 'Desactívalo cuando quieras'], 'Nueva pestaña'],
    ['App de estudio incluida', 'Recuerda palabras<br><em>para siempre.</em>', 'Repetición espaciada FSRS y práctica de IELTS y TOEIC, gratis.', ['Repasos FSRS como Anki', 'Más de 6.000 palabras con audio', 'Exámenes de práctica explicados'], 'Lexkite'],
  ],
  pt: [
    ['Em qualquer site', 'Clique duas vezes.<br><em>Entenda na hora.</em>', 'Pronúncia, significados e exemplos bem onde você lê.', ['IPA britânico e americano + áudio', 'Significados por classe gramatical', 'Salve com a frase original'], 'dailyplanet.com/environment'],
    ['Traduza e aprenda gramática', 'Selecione uma frase.<br><em>Entenda a estrutura.</em>', 'Tradução instantânea com as estruturas gramaticais explicadas.', ['Traduza qualquer seleção', 'Gramática explicada', 'Ouça em velocidade normal ou lenta'], 'dailyplanet.com/environment'],
    ['Janela da extensão', 'Seu estudo diário,<br><em>a um clique.</em>', 'Cartões do dia, meta diária, busca rápida e revisão de 1 minuto.', ['Cartões de hoje num relance', 'Revisão rápida sem sair da página', 'Sincronize seus dispositivos (opcional)'], ''],
    ['Nova guia', 'Uma palavra<br><em>a cada nova guia.</em>', 'Um cartão do seu próprio baralho sempre que abrir uma guia.', ['Palavras no momento certo', 'Um toque: já sei / revisar', 'Desative quando quiser'], 'Nova guia'],
    ['App de estudo incluído', 'Memorize palavras<br><em>de vez.</em>', 'Repetição espaçada FSRS e prática de IELTS e TOEIC, grátis.', ['Revisões FSRS como no Anki', 'Mais de 6.000 palavras com áudio', 'Simulados com explicações'], 'Lexkite'],
  ],
  ja: [
    ['どのサイトでも', 'ダブルクリックで<br><em>すぐにわかる。</em>', '発音・意味・例文を、読んでいるその場で。', ['英米の発音記号と音声', '品詞ごとの意味', '元の文ごと保存'], 'dailyplanet.com/environment'],
    ['翻訳と文法', '文を選ぶだけで<br><em>構造まで理解。</em>', '瞬時に翻訳し、文中の文法構造も解説します。', ['選択した文をすぐ翻訳', '文法パターンを解説', '通常・ゆっくり再生'], 'dailyplanet.com/environment'],
    ['ツールバーのポップアップ', '毎日の学習が<br><em>ワンクリックで。</em>', '今日の復習カード、目標、クイック検索、1分復習。', ['今日のカードがひと目でわかる', 'ページを離れずに復習', '端末間で同期（任意）'], ''],
    ['新しいタブ', '新しいタブで<br><em>毎回ひとつ単語を。</em>', 'タブを開くたびに、自分の単語帳からカードを表示。', ['最適なタイミングで出題', 'ワンタップで「覚えた／もう一度」', 'いつでもオフにできます'], '新しいタブ'],
    ['学習アプリ付き', '単語を<br><em>ずっと覚える。</em>', 'FSRS間隔反復とIELTS・TOEIC対策を無料で。', ['Anki同様のFSRS復習', '音声付き6,000語以上', '解説付きの模擬試験'], 'Lexkite'],
  ],
  ko: [
    ['모든 웹사이트에서', '더블클릭으로<br><em>바로 이해하세요.</em>', '읽고 있는 바로 그 자리에서 발음, 뜻, 예문을 확인하세요.', ['영국·미국 발음 기호와 음성', '품사별 뜻', '원래 문장과 함께 저장'], 'dailyplanet.com/environment'],
    ['번역과 문법', '문장을 선택하면<br><em>구조까지 보입니다.</em>', '즉시 번역하고 문장 속 문법 구조를 설명합니다.', ['선택한 문장 바로 번역', '문법 패턴 설명', '보통·느린 속도로 듣기'], 'dailyplanet.com/environment'],
    ['툴바 팝업', '매일의 공부를<br><em>클릭 한 번으로.</em>', '오늘 복습할 카드, 목표, 빠른 검색, 1분 복습.', ['오늘의 카드를 한눈에', '페이지를 떠나지 않고 복습', '기기 간 동기화(선택)'], ''],
    ['새 탭', '새 탭을 열 때마다<br><em>단어 하나씩.</em>', '탭을 열 때마다 내 단어장의 카드를 보여줍니다.', ['딱 맞는 때에 출제', '한 번 탭: 외웠어요 / 다시', '언제든 끌 수 있어요'], '새 탭'],
    ['학습 앱 포함', '단어를<br><em>오래 기억하세요.</em>', 'FSRS 간격 반복과 IELTS·TOEIC 연습을 무료로.', ['Anki처럼 FSRS 복습', '음성 포함 6,000+ 단어', '해설이 있는 모의고사'], 'Lexkite'],
  ],
  zh: [
    ['任意网页', '双击单词，<br><em>即刻读懂。</em>', '就在你阅读的地方查看发音、释义和例句。', ['英式与美式音标 + 发音', '按词性分类的释义', '连同原句一起保存'], 'dailyplanet.com/environment'],
    ['翻译与语法', '选中一句话，<br><em>看懂句子结构。</em>', '即时翻译，并讲解句中的语法结构。', ['任意选中内容即时翻译', '语法结构详解', '正常或慢速朗读'], 'dailyplanet.com/environment'],
    ['工具栏弹窗', '每天的学习，<br><em>一键开始。</em>', '待复习卡片、每日目标、快速查词和 1 分钟复习。', ['今日卡片一目了然', '不离开页面即可复习', '多设备同步（可选）'], ''],
    ['新标签页', '每开一个标签页，<br><em>学一个单词。</em>', '每次打开标签页，都从你的词库中出一张卡片。', ['在最佳时机复习', '一键：记住了 / 再复习', '随时可以关闭'], '新标签页'],
    ['附带完整学习应用', '单词<br><em>记得更久。</em>', 'FSRS 间隔重复，外加 IELTS 和 TOEIC 练习，完全免费。', ['像 Anki 一样的 FSRS 复习', '6,000+ 带发音的单词', '带解析的模拟试题'], 'Lexkite'],
  ],
  id: [
    ['Di situs mana pun', 'Klik dua kali.<br><em>Langsung paham.</em>', 'Pelafalan, arti, dan contoh tepat di tempat Anda membaca.', ['IPA Inggris & Amerika + audio', 'Arti per kelas kata', 'Simpan dengan kalimat aslinya'], 'dailyplanet.com/environment'],
    ['Terjemahkan & pelajari tata bahasa', 'Pilih satu kalimat.<br><em>Pahami strukturnya.</em>', 'Terjemahan instan beserta penjelasan struktur tata bahasanya.', ['Terjemahkan teks apa pun', 'Pola tata bahasa dijelaskan', 'Dengarkan normal atau lambat'], 'dailyplanet.com/environment'],
    ['Jendela ekstensi', 'Belajar harian,<br><em>cukup satu klik.</em>', 'Kartu jatuh tempo, target harian, cari cepat, dan ulasan 1 menit.', ['Kartu hari ini sekilas', 'Ulas cepat tanpa pindah halaman', 'Sinkron antarperangkat (opsional)'], ''],
    ['Tab baru', 'Satu kata<br><em>di setiap tab baru.</em>', 'Satu kartu dari koleksi Anda setiap kali membuka tab.', ['Kata muncul di saat yang tepat', 'Sekali ketuk: hafal / ulangi', 'Matikan kapan saja'], 'Tab baru'],
    ['Termasuk aplikasi belajar', 'Ingat kosakata<br><em>lebih lama.</em>', 'Pengulangan berjarak FSRS plus latihan IELTS & TOEIC, gratis.', ['Ulasan FSRS seperti Anki', '6.000+ kata dengan audio', 'Tes latihan dengan pembahasan'], 'Lexkite'],
  ],
  de: [
    ['Auf jeder Website', 'Doppelklick.<br><em>Sofort verstehen.</em>', 'Aussprache, Bedeutungen und Beispiele direkt beim Lesen.', ['Britische & amerikanische IPA + Audio', 'Bedeutungen nach Wortart', 'Mit dem Originalsatz speichern'], 'dailyplanet.com/environment'],
    ['Übersetzen & Grammatik', 'Satz markieren.<br><em>Struktur verstehen.</em>', 'Sofortige Übersetzung mit erklärten Grammatikstrukturen.', ['Jede Auswahl übersetzen', 'Grammatikmuster erklärt', 'Normal oder langsam anhören'], 'dailyplanet.com/environment'],
    ['Erweiterungs-Popup', 'Dein tägliches Lernen,<br><em>ein Klick entfernt.</em>', 'Fällige Karten, Tagesziel, Schnellsuche und 1-Minuten-Wiederholung.', ['Heutige Karten auf einen Blick', 'Wiederholen, ohne die Seite zu verlassen', 'Geräte synchronisieren (optional)'], ''],
    ['Neuer Tab', 'Ein Wort<br><em>in jedem neuen Tab.</em>', 'Eine Karte aus deinem eigenen Deck bei jedem neuen Tab.', ['Wörter zum richtigen Zeitpunkt', 'Ein Tipp: gewusst / wiederholen', 'Jederzeit abschaltbar'], 'Neuer Tab'],
    ['Komplette Lern-App inklusive', 'Wörter merken –<br><em>dauerhaft.</em>', 'FSRS-Wiederholung plus IELTS- & TOEIC-Training, kostenlos.', ['FSRS-Wiederholung wie bei Anki', 'Über 6.000 Wörter mit Audio', 'Übungstests mit Erklärungen'], 'Lexkite'],
  ],
  fr: [
    ['Sur tous les sites', 'Double-cliquez.<br><em>Comprenez aussitôt.</em>', 'Prononciation, sens et exemples là où vous lisez.', ['API britannique et américain + audio', 'Sens par nature de mot', 'Enregistrez avec la phrase d’origine'], 'dailyplanet.com/environment'],
    ['Traduction et grammaire', 'Sélectionnez une phrase.<br><em>Comprenez sa structure.</em>', 'Traduction instantanée et structures grammaticales expliquées.', ['Traduisez toute sélection', 'Structures grammaticales expliquées', 'Écoute normale ou lente'], 'dailyplanet.com/environment'],
    ['Fenêtre de l’extension', 'Votre étude du jour,<br><em>en un clic.</em>', 'Cartes à revoir, objectif du jour, recherche rapide et révision d’une minute.', ['Les cartes du jour en un coup d’œil', 'Révisez sans quitter la page', 'Synchronisation multi-appareils (option)'], ''],
    ['Nouvel onglet', 'Un mot<br><em>à chaque onglet.</em>', 'Une carte de votre propre paquet à chaque nouvel onglet.', ['Des mots au bon moment', 'Un geste : je sais / à revoir', 'Désactivable à tout moment'], 'Nouvel onglet'],
    ['Application complète incluse', 'Retenez les mots<br><em>durablement.</em>', 'Répétition espacée FSRS et entraînement IELTS & TOEIC, gratuit.', ['Révisions FSRS comme Anki', 'Plus de 6 000 mots avec audio', 'Tests blancs corrigés'], 'Lexkite'],
  ],
  ar: [
    ['على أي موقع', 'انقر نقرًا مزدوجًا.<br><em>وافهم فورًا.</em>', 'النطق والمعاني والأمثلة في المكان الذي تقرأ فيه.', ['النطق البريطاني والأمريكي مع الصوت', 'المعاني حسب نوع الكلمة', 'احفظ الكلمة مع جملتها الأصلية'], 'dailyplanet.com/environment'],
    ['ترجمة وقواعد', 'حدّد جملة.<br><em>وافهم تركيبها.</em>', 'ترجمة فورية مع شرح التراكيب النحوية في الجملة.', ['ترجم أي نص تحدده', 'شرح الأنماط النحوية', 'استمع بسرعة عادية أو بطيئة'], 'dailyplanet.com/environment'],
    ['نافذة الإضافة', 'دراستك اليومية<br><em>بنقرة واحدة.</em>', 'البطاقات المستحقة، الهدف اليومي، بحث سريع ومراجعة في دقيقة.', ['بطاقات اليوم في لمحة', 'مراجعة سريعة دون مغادرة الصفحة', 'مزامنة بين أجهزتك (اختياري)'], ''],
    ['علامة تبويب جديدة', 'كلمة جديدة<br><em>مع كل تبويب.</em>', 'بطاقة من مجموعتك الخاصة في كل مرة تفتح فيها تبويبًا.', ['كلمات في الوقت المناسب', 'نقرة واحدة: حفظتها / راجعها', 'يمكنك إيقافها متى شئت'], 'New Tab'],
    ['تطبيق تعلّم متكامل', 'احفظ الكلمات<br><em>إلى الأبد.</em>', 'تكرار متباعد FSRS وتدريب على IELTS وTOEIC مجانًا.', ['مراجعة FSRS مثل Anki', 'أكثر من 6000 كلمة بالصوت', 'اختبارات تدريبية مع الشرح'], 'Lexkite'],
  ],
  hi: [
    ['किसी भी वेबसाइट पर', 'डबल-क्लिक करें।<br><em>तुरंत समझें।</em>', 'जहाँ आप पढ़ रहे हैं, वहीं उच्चारण, अर्थ और उदाहरण।', ['ब्रिटिश और अमेरिकी IPA + ऑडियो', 'शब्द-भेद के अनुसार अर्थ', 'मूल वाक्य के साथ सेव करें'], 'dailyplanet.com/environment'],
    ['अनुवाद और व्याकरण', 'वाक्य चुनें।<br><em>उसकी संरचना समझें।</em>', 'तुरंत अनुवाद, साथ में वाक्य की व्याकरण संरचना की व्याख्या।', ['कोई भी चयन अनुवाद करें', 'व्याकरण पैटर्न समझाए गए', 'सामान्य या धीमी गति से सुनें'], 'dailyplanet.com/environment'],
    ['एक्सटेंशन पॉपअप', 'रोज़ की पढ़ाई,<br><em>बस एक क्लिक पर।</em>', 'आज के कार्ड, दैनिक लक्ष्य, क्विक लुकअप और 1 मिनट रिव्यू।', ['आज के कार्ड एक नज़र में', 'पेज छोड़े बिना रिव्यू', 'डिवाइस सिंक (वैकल्पिक)'], ''],
    ['नया टैब', 'हर नए टैब में<br><em>एक नया शब्द।</em>', 'हर बार टैब खोलने पर आपकी अपनी डेक से एक कार्ड।', ['सही समय पर शब्द', 'एक टैप: याद है / दोबारा', 'कभी भी बंद करें'], 'New Tab'],
    ['पूरा स्टडी ऐप शामिल', 'शब्द याद रखें<br><em>हमेशा के लिए।</em>', 'FSRS स्पेस्ड रिपिटिशन और IELTS व TOEIC अभ्यास, मुफ़्त।', ['Anki जैसा FSRS रिव्यू', 'ऑडियो के साथ 6,000+ शब्द', 'व्याख्या सहित प्रैक्टिस टेस्ट'], 'Lexkite'],
  ],
  ru: [
    ['На любом сайте', 'Двойной клик.<br><em>Понятно сразу.</em>', 'Произношение, значения и примеры прямо там, где вы читаете.', ['Британская и американская транскрипция + аудио', 'Значения по частям речи', 'Сохранение с исходным предложением'], 'dailyplanet.com/environment'],
    ['Перевод и грамматика', 'Выделите фразу.<br><em>Поймите структуру.</em>', 'Мгновенный перевод и разбор грамматических конструкций.', ['Перевод любого выделения', 'Грамматика с объяснениями', 'Обычная или медленная озвучка'], 'dailyplanet.com/environment'],
    ['Окно расширения', 'Ежедневная учёба —<br><em>в один клик.</em>', 'Карточки на сегодня, цель дня, быстрый поиск и повтор за минуту.', ['Карточки на сегодня одним взглядом', 'Повтор, не покидая страницу', 'Синхронизация устройств (по желанию)'], ''],
    ['Новая вкладка', 'Новое слово<br><em>в каждой вкладке.</em>', 'Карточка из вашей колоды при каждом открытии вкладки.', ['Слова в нужный момент', 'Одно касание: знаю / повторить', 'Можно отключить в любой момент'], 'New Tab'],
    ['Полное приложение в комплекте', 'Запоминайте слова<br><em>надолго.</em>', 'Интервальные повторения FSRS и подготовка к IELTS и TOEIC бесплатно.', ['Повторения FSRS как в Anki', 'Более 6000 слов с озвучкой', 'Пробные тесты с разбором'], 'Lexkite'],
  ],
  th: [
    ['บนทุกเว็บไซต์', 'ดับเบิลคลิก<br><em>เข้าใจทันที</em>', 'คำอ่าน ความหมาย และตัวอย่าง ตรงที่คุณกำลังอ่าน', ['IPA แบบอังกฤษและอเมริกัน + เสียง', 'ความหมายตามชนิดคำ', 'บันทึกพร้อมประโยคต้นฉบับ'], 'dailyplanet.com/environment'],
    ['แปลและไวยากรณ์', 'เลือกประโยค<br><em>เข้าใจโครงสร้าง</em>', 'แปลทันที พร้อมอธิบายโครงสร้างไวยากรณ์ในประโยค', ['แปลข้อความที่เลือกได้ทันที', 'อธิบายรูปแบบไวยากรณ์', 'ฟังความเร็วปกติหรือช้า'], 'dailyplanet.com/environment'],
    ['หน้าต่างส่วนขยาย', 'การเรียนประจำวัน<br><em>ในคลิกเดียว</em>', 'การ์ดที่ต้องทบทวน เป้าหมายรายวัน ค้นหาด่วน และทบทวน 1 นาที', ['เห็นการ์ดวันนี้ในพริบตา', 'ทบทวนโดยไม่ต้องออกจากหน้า', 'ซิงก์ข้ามอุปกรณ์ (ไม่บังคับ)'], ''],
    ['แท็บใหม่', 'คำศัพท์ใหม่<br><em>ทุกแท็บใหม่</em>', 'การ์ดจากคลังคำของคุณทุกครั้งที่เปิดแท็บ', ['คำศัพท์มาในจังหวะที่ใช่', 'แตะครั้งเดียว: จำได้ / ทบทวน', 'ปิดได้ทุกเมื่อ'], 'New Tab'],
    ['มาพร้อมแอปเรียนครบชุด', 'จำคำศัพท์<br><em>ได้นาน</em>', 'ทบทวนแบบเว้นระยะ FSRS และฝึก IELTS & TOEIC ฟรี', ['ทบทวน FSRS แบบ Anki', 'คำศัพท์ 6,000+ คำพร้อมเสียง', 'ข้อสอบฝึกพร้อมเฉลย'], 'Lexkite'],
  ],
  tr: [
    ['Her web sitesinde', 'Çift tıkla.<br><em>Anında anla.</em>', 'Telaffuz, anlamlar ve örnekler, tam okuduğun yerde.', ['İngiliz ve Amerikan IPA + ses', 'Sözcük türüne göre anlamlar', 'Orijinal cümleyle kaydet'], 'dailyplanet.com/environment'],
    ['Çeviri ve dil bilgisi', 'Bir cümle seç.<br><em>Yapısını anla.</em>', 'Anında çeviri ve cümledeki dil bilgisi yapılarının açıklaması.', ['Her seçimi çevir', 'Dil bilgisi kalıpları açıklanır', 'Normal veya yavaş dinle'], 'dailyplanet.com/environment'],
    ['Eklenti penceresi', 'Günlük çalışman<br><em>bir tık uzakta.</em>', 'Bugünkü kartlar, günlük hedef, hızlı arama ve 1 dakikalık tekrar.', ['Bugünkü kartlar bir bakışta', 'Sayfadan çıkmadan tekrar', 'Cihazlar arası senkron (isteğe bağlı)'], ''],
    ['Yeni sekme', 'Her yeni sekmede<br><em>bir kelime.</em>', 'Her sekme açışında kendi destenden bir kart.', ['Kelimeler doğru zamanda', 'Tek dokunuş: biliyorum / tekrar', 'İstediğin zaman kapat'], 'New Tab'],
    ['Tam çalışma uygulaması dahil', 'Kelimeleri<br><em>kalıcı öğren.</em>', 'FSRS aralıklı tekrar ve IELTS & TOEIC pratiği, ücretsiz.', ['Anki gibi FSRS tekrarı', 'Sesli 6.000+ kelime', 'Açıklamalı deneme sınavları'], 'Lexkite'],
  ],
};

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Why cities are planting forests</title>
<style>body{margin:0;font:19px/1.75 Georgia,serif;color:#23272a;background:#fbfaf7}nav{display:flex;gap:28px;align-items:center;padding:16px 56px;border-bottom:1px solid #e7e3da;font:600 14px Arial,sans-serif;color:#555}
nav b{font:800 22px Georgia,serif;color:#111;margin-right:24px;letter-spacing:-.02em}main{max-width:780px;margin:0 auto;padding:30px 32px}.k{font:700 12px Arial,sans-serif;color:#1F7A72;letter-spacing:.12em}
h1{font:700 40px/1.15 Georgia,serif;margin:6px 0 10px}.by{font:14px Arial,sans-serif;color:#888;margin-bottom:18px}.hero{height:70px;border-radius:10px;margin-bottom:18px;background:linear-gradient(120deg,#2f6b4f,#7fb069 55%,#d8e2a8)}</style></head>
<body><nav><b>The Daily Planet</b><span>World</span><span>Environment</span><span>Science</span><span>Cities</span></nav><main><div class="k">ENVIRONMENT</div><h1>Why cities are planting forests</h1><div class="by">By Clara Hughes · 6 min read</div><div class="hero"></div>
<p>Urban planners increasingly argue that trees are not decoration but infrastructure. Dense canopies can lower street temperatures by several degrees, improving the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>Critics point out that new trees take decades to mature, yet many councils now see green space as an essential part of climate adaptation rather than an optional extra.</p></main></body></html>`;

const BG = `background:radial-gradient(900px 500px at 92% -10%,rgba(255,176,84,.30),transparent 60%),radial-gradient(700px 500px at -10% 110%,rgba(31,122,114,.55),transparent 60%),linear-gradient(160deg,#0B3233,#0F3D3E 45%,#123f40);`;
const CSS = `*{box-sizing:border-box;margin:0}body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Be Vietnam Pro","Noto Sans","Noto Sans Arabic","Noto Sans Devanagari","Noto Sans Thai","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;${BG}position:relative}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(90deg,#000,transparent 55%)}
.brand{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px;letter-spacing:-.02em}.brand img{width:44px;height:44px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.3)}.brand b{color:#FFB054}
.txt{position:absolute;left:64px;top:170px;width:400px}.kick{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:1px solid rgba(255,176,84,.35);padding:6px 12px;border-radius:99px}
h1{font-size:46px;line-height:1.08;font-weight:800;letter-spacing:-.03em;margin-top:22px}h1 em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
p.sub{font-size:19px;line-height:1.5;color:rgba(255,255,255,.78);margin-top:18px}ul{list-style:none;padding:0;margin-top:28px;display:grid;gap:14px}li{display:flex;gap:12px;align-items:center;font-size:17px;font-weight:600}
li i{flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#FFB054,#F2553B);display:grid;place-items:center;font-style:normal;font-size:14px;color:#0F3D3E;font-weight:800}
.win{position:absolute;right:48px;top:92px;width:752px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 40px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
.bar{height:38px;background:#eef1f0;display:flex;align-items:center;gap:8px;padding:0 14px}.bar span{width:11px;height:11px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}
.bar div{margin-left:14px;flex:1;height:24px;border-radius:7px;background:#fff;color:#5b6b6a;font:500 12.5px system-ui,sans-serif;display:flex;align-items:center;padding:0 12px;gap:8px}.bar div:before{content:"🔒";font-size:10px}
.win img{display:block;width:100%}
.pop{position:absolute;right:150px;top:70px;width:380px;border-radius:16px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.1)}.pop img{display:block;width:100%}
.back{position:absolute;right:48px;top:150px;width:700px;border-radius:14px;overflow:hidden;opacity:.55;filter:blur(1.5px) saturate(.8);box-shadow:0 30px 60px rgba(0,0,0,.4)}.back img{display:block;width:100%}
.glow{position:absolute;right:120px;bottom:-140px;width:520px;height:320px;background:radial-gradient(closest-side,rgba(242,85,59,.35),transparent);filter:blur(10px)}`;

async function frame(page, lang, i, shot, popup = null) {
  const [kick, title, sub, pts, url] = CAP[lang][i];
  const img = 'data:image/png;base64,' + shot.toString('base64');
  const visual = popup
    ? `<div class="back"><img src="data:image/png;base64,${popup.toString('base64')}"></div><div class="pop"><img src="${img}"></div>`
    : `<div class="win"><div class="bar"><span></span><span></span><span></span><div>${url}</div></div><img src="${img}"></div>`;
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${CSS}</style></head><body><div class="glow"></div>
    <div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>
    <div class="txt"${lang === 'ar' ? ' dir="rtl" style="text-align:right"' : ''}><span class="kick">${kick}</span><h1>${title}</h1><p class="sub">${sub}</p><ul>${pts.map(x => `<li><i>✓</i>${x}</li>`).join('')}</ul></div>${visual}</body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  await page.screenshot({ path: `${OUT}/${lang}-${i + 1}.png`, clip: { x: 0, y: 0, width: W, height: H } });
}

async function run(lang) {
  const locale = LOCALE[lang] || lang;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: true, locale, viewport: { width: 880, height: 660 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${locale}`],
  });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host, base = `chrome-extension://${id}/`;
  const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
  await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), lang);
  await sleep(1500);
  for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {}); // trang chào mừng tự mở khi cài

  // Dữ liệu mẫu (thẻ, chuỗi ngày) qua app trong add-on – dùng chung chrome.storage với popup, tab mới, trang web
  const app = await ctx.newPage();
  await app.goto(base + `app/index.html?demo=1&hl=${lang}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(5000);
  await app.goto(base + `app/index.html?hl=${lang}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(3500);
  const appShot = await app.screenshot();
  const page = await ctx.newPage();
  await page.route('https://news.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));

  // 1. Bấm đúp tra từ (tắt nút 🌐 của vùng chọn để ảnh gọn)
  await setSettings({ selectMode: 'off', markKnown: false, markAcademic: false });
  await page.goto('https://news.example.com/cities-forests', { waitUntil: 'domcontentloaded' }); await sleep(2500);
  await page.dblclick('#w'); await sleep(14000); // chờ bảng tra tải xong (nghĩa, ảnh, ví dụ)
  const s1 = await page.screenshot();
  // 2. Bôi đen câu → tự dịch
  await setSettings({ selectMode: 'auto' });
  await page.goto('https://news.example.com/cities-forests', { waitUntil: 'domcontentloaded' }); await sleep(2500);
  const b = await page.locator('#s').boundingBox();
  await page.mouse.move(b.x + 1, b.y + 6); await page.mouse.down(); await page.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 12 }); await page.mouse.up();
  await sleep(14000);
  const s2 = await page.screenshot();
  // 3. Popup – kích thước thật
  const pop = await ctx.newPage(); await pop.setViewportSize({ width: 380, height: 600 });
  await pop.goto(base + 'popup.html', { waitUntil: 'domcontentloaded' }); await sleep(2500);
  const s3 = await pop.screenshot();
  // 4. Tab mới
  const nt = await ctx.newPage(); await nt.setViewportSize({ width: 880, height: 660 });
  await nt.goto(base + 'newtab.html', { waitUntil: 'domcontentloaded' }); await sleep(2500);
  const s4 = await nt.screenshot();

  await ctx.close();
  // Ghép khung ở trình duyệt riêng tỉ lệ 1× → ảnh ra đúng 1280×800 (ảnh chụp 2× nên vẫn nét)
  const br = await chromium.launch(), out = await br.newPage({ deviceScaleFactor: 1 });
  await frame(out, lang, 0, s1); await frame(out, lang, 1, s2); await frame(out, lang, 2, s3, s1);
  await frame(out, lang, 3, s4); await frame(out, lang, 4, appShot);
  await br.close();
  return s1;
}

async function promos(shot) {
  const br = await chromium.launch();
  const p = await br.newPage();
  const card = `<div class="wc"><div class="w">resilience <span>/rɪˈzɪliəns/</span></div><div class="m"><b>noun</b> the capacity to recover quickly from difficulties</div><div class="btn">+ Save flashcard</div></div>`;
  const small = `<body class="s"><div class="l"><img src="${ICON}"><div class="n">lex<b>kite</b></div></div><div class="t">Double-click any word.<br><em>Learn it for good.</em></div>${card}</body>`;
  const img = 'data:image/png;base64,' + shot.toString('base64');
  const big = `<body class="b"><div class="txt"><div class="l"><img src="${ICON}"><div class="n">lex<b>kite</b></div></div><h1>Learn English words<br><em>while you browse.</em></h1>
    <p>Double-click to look up · Save with context · Remember with FSRS</p><div class="tags"><span>Free</span><span>15 languages</span><span>IELTS · TOEIC</span></div></div>
    <div class="win"><div class="bar"><span></span><span></span><span></span></div><img src="${img}"></div></body>`;
  const css = `*{margin:0;box-sizing:border-box}body{font-family:"Be Vietnam Pro","Noto Sans","Noto Sans Arabic","Noto Sans Devanagari","Noto Sans Thai","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;overflow:hidden;position:relative;${BG}}
    em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
    .l{display:flex;align-items:center;gap:10px}.l img{border-radius:22%;box-shadow:0 8px 20px rgba(0,0,0,.35)}.n{font-weight:800;letter-spacing:-.03em}.n b{color:#FFB054}
    .s{width:440px;height:280px;padding:26px 28px}.s .l img{width:42px;height:42px}.s .n{font-size:28px}.s .t{font-size:24px;font-weight:800;line-height:1.15;letter-spacing:-.02em;margin-top:18px;width:250px}
    .wc{position:absolute;right:-18px;bottom:26px;width:200px;background:#fff;color:#1c2b2b;border-radius:14px;padding:12px 14px;box-shadow:0 18px 40px rgba(0,0,0,.4);transform:rotate(-4deg)}
    .wc .w{font-weight:800;font-size:16px}.wc .w span{font-weight:500;font-size:11px;color:#1F7A72}.wc .m{font-size:11px;line-height:1.35;margin-top:6px;color:#44524f}.wc .m b{color:#F2553B}.wc .btn{margin-top:8px;display:inline-block;background:#E5502F;color:#fff;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:7px}
    .b{width:1400px;height:560px}.b .txt{position:absolute;left:80px;top:70px;width:560px}.b .l img{width:56px;height:56px}.b .n{font-size:34px}
    .b h1{font-size:54px;line-height:1.06;letter-spacing:-.035em;font-weight:800;margin-top:34px}.b p{font-size:20px;color:rgba(255,255,255,.8);margin-top:20px}
    .tags{display:flex;gap:10px;margin-top:26px}.tags span{font-size:15px;font-weight:700;padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}
    .win{position:absolute;right:70px;top:60px;width:640px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 40px 80px rgba(0,0,0,.5)}.win img{display:block;width:100%}
    .bar{height:30px;background:#eef1f0;display:flex;align-items:center;gap:7px;padding:0 12px}.bar span{width:10px;height:10px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}`;
  for (const [w, h, f, body] of [[440, 280, 'promo-440x280', small], [1400, 560, 'promo-1400x560', big]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${css}</style></head>${body}</html>`);
    await p.evaluate(() => document.fonts.ready); await sleep(400);
    await p.screenshot({ path: `${OUT}/${f}.png` });
  }
  await br.close();
}

// Thị trường: giao diện + chữ quảng cáo + bản dịch theo ngôn ngữ đó; bản en (ảnh chung toàn cầu) minh họa dịch sang tiếng Tây Ban Nha
const LANGS = (process.env.LANGS || 'en,vi,es,pt,ja,ko,zh,id,de,fr,ar,hi,ru,th,tr').split(',');
const enShot = await run(LANGS[0]);
for (const l of LANGS.slice(1)) await run(l);
await promos(enShot);
console.log('✓', fs.readdirSync(OUT).join(' '));
