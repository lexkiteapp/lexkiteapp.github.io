// Chữ quảng cáo cửa hàng theo ngôn ngữ – dùng chung cho store-shots.mjs (ảnh) và store-video.mjs (video).
// [nhãn nhỏ, tiêu đề (<em> = chữ nhấn), phụ đề, lợi ích[], địa chỉ trên thanh trình duyệt]
// Ảnh 0 = ảnh bìa (thumbnail): tiêu đề rất ngắn, ≤ ~4 từ/dòng. Ảnh 4 = ảnh "bằng chứng": đúng 4 ô số liệu 'SỐ LỚN|nhãn nhỏ', mọi con số đã kiểm trong repo
// (6,000+ từ có IPA: web/js/data.js + web/js/lib/*; 15 ngôn ngữ: extension/_locales; đề luyện IELTS/TOEIC: web/js/listen, readtest, toeic).
export const CAP = {
  en: [
    ['On any website', 'Double-click any word.<br><em>Learn it for good.</em>', 'Pronunciation, meanings and examples right where you read.', ['British & American IPA + audio', 'Meanings by part of speech', 'Save with the original sentence'], 'dailyplanet.com/environment'],
    ['Translate & learn grammar', 'Select a sentence.<br><em>See how it works.</em>', 'Instant translation plus the grammar structures inside it.', ['Translate any selection', 'Grammar patterns explained', 'Listen at normal or slow speed'], 'dailyplanet.com/environment'],
    ['Toolbar popup', 'Your daily study,<br><em>one click away.</em>', 'Due cards, daily goal, quick lookup and a 1-minute review.', ['Cards due today at a glance', 'Quick review without leaving the page', 'Sync across devices (optional)'], ''],
    ['New tab', 'Learn a word<br><em>every new tab.</em>', 'A flashcard from your own deck each time you open a tab.', ['Words picked at the right moment', 'One tap: got it / review again', 'Turn off anytime'], 'New Tab'],
    ['Free · No ads in the extension', 'Free. Private.<br><em>Built for exams.</em>', 'No account needed – your words stay in your browser.', ['6,000+|words with IPA & audio', '15|interface languages', 'IELTS · TOEIC|practice tests with explanations', 'FSRS|spaced-repetition reviews'], 'Lexkite'],
  ],
  vi: [
    ['Trên mọi trang web', 'Bấm đúp mọi từ.<br><em>Nhớ thật lâu.</em>', 'Phiên âm, phát âm, nghĩa và ví dụ ngay tại chỗ bạn đọc.', ['Phiên âm Anh–Anh & Anh–Mỹ', 'Nghĩa theo từ loại', 'Lưu kèm câu gốc'], 'dailyplanet.com/environment'],
    ['Dịch & học ngữ pháp', 'Bôi đen một câu.<br><em>Hiểu cả cấu trúc.</em>', 'Dịch tức thì, kèm giải thích các cấu trúc ngữ pháp trong câu.', ['Dịch mọi đoạn bôi đen', 'Giải thích cấu trúc ngữ pháp', 'Nghe tốc độ thường hoặc chậm'], 'dailyplanet.com/environment'],
    ['Cửa sổ tiện ích', 'Việc học mỗi ngày,<br><em>chỉ một cú bấm.</em>', 'Thẻ cần ôn, mục tiêu ngày, tra nhanh và ôn 1 phút.', ['Thấy ngay số thẻ cần ôn', 'Ôn nhanh không rời trang', 'Đồng bộ nhiều thiết bị (tùy chọn)'], ''],
    ['Tab mới', 'Mỗi tab mới,<br><em>thêm một từ.</em>', 'Một thẻ từ chính sổ của bạn mỗi lần mở tab.', ['Chọn từ đúng thời điểm vàng', 'Một chạm: đã nhớ / ôn lại', 'Tắt bất cứ lúc nào'], 'Tab mới'],
    ['Miễn phí · Không quảng cáo trong tiện ích', 'Miễn phí. Riêng tư.<br><em>Dành cho kỳ thi.</em>', 'Không cần tài khoản – từ của bạn nằm trong trình duyệt.', ['6.000+|từ có phiên âm & phát âm', '15|ngôn ngữ giao diện', 'IELTS · TOEIC|đề luyện có giải thích', 'FSRS|ôn tập lặp lại ngắt quãng'], 'Lexkite'],
  ],
  es: [
    ['En cualquier web', 'Doble clic en una palabra.<br><em>Recuérdala siempre.</em>', 'Pronunciación, significados y ejemplos justo donde lees.', ['IPA británico y americano + audio', 'Significados por categoría', 'Guarda la frase original'], 'dailyplanet.com/environment'],
    ['Traduce y aprende gramática', 'Selecciona una frase.<br><em>Entiende su estructura.</em>', 'Traducción al instante con las estructuras gramaticales explicadas.', ['Traduce cualquier selección', 'Gramática explicada', 'Escucha a velocidad normal o lenta'], 'dailyplanet.com/environment'],
    ['Ventana de la extensión', 'Tu estudio diario,<br><em>a un clic.</em>', 'Tarjetas pendientes, meta diaria, búsqueda rápida y repaso de 1 minuto.', ['Tus tarjetas de hoy de un vistazo', 'Repaso rápido sin salir de la página', 'Sincroniza tus dispositivos (opcional)'], ''],
    ['Nueva pestaña', 'Una palabra<br><em>en cada pestaña.</em>', 'Una tarjeta de tu propio mazo cada vez que abres una pestaña.', ['Palabras en el momento justo', 'Un toque: la sé / repasar', 'Desactívalo cuando quieras'], 'Nueva pestaña'],
    ['Gratis · Sin anuncios en la extensión', 'Gratis. Privado.<br><em>Pensado para exámenes.</em>', 'Sin cuenta: tus palabras se quedan en tu navegador.', ['6.000+|palabras con IPA y audio', '15|idiomas de interfaz', 'IELTS · TOEIC|exámenes de práctica explicados', 'FSRS|repaso con repetición espaciada'], 'Lexkite'],
  ],
  pt: [
    ['Em qualquer site', 'Clique duas vezes.<br><em>Lembre para sempre.</em>', 'Pronúncia, significados e exemplos bem onde você lê.', ['IPA britânico e americano + áudio', 'Significados por classe gramatical', 'Salve com a frase original'], 'dailyplanet.com/environment'],
    ['Traduza e aprenda gramática', 'Selecione uma frase.<br><em>Entenda a estrutura.</em>', 'Tradução instantânea com as estruturas gramaticais explicadas.', ['Traduza qualquer seleção', 'Gramática explicada', 'Ouça em velocidade normal ou lenta'], 'dailyplanet.com/environment'],
    ['Janela da extensão', 'Seu estudo diário,<br><em>a um clique.</em>', 'Cartões do dia, meta diária, busca rápida e revisão de 1 minuto.', ['Cartões de hoje num relance', 'Revisão rápida sem sair da página', 'Sincronize seus dispositivos (opcional)'], ''],
    ['Nova guia', 'Uma palavra<br><em>a cada nova guia.</em>', 'Um cartão do seu próprio baralho sempre que abrir uma guia.', ['Palavras no momento certo', 'Um toque: já sei / revisar', 'Desative quando quiser'], 'Nova guia'],
    ['Grátis · Sem anúncios na extensão', 'Grátis. Privado.<br><em>Feito para provas.</em>', 'Sem conta: suas palavras ficam no seu navegador.', ['6.000+|palavras com IPA e áudio', '15|idiomas de interface', 'IELTS · TOEIC|simulados com explicações', 'FSRS|revisão com repetição espaçada'], 'Lexkite'],
  ],
  ja: [
    ['どのサイトでも', '単語をダブルクリック。<br><em>ずっと覚える。</em>', '発音・意味・例文を、読んでいるその場で。', ['英米の発音記号と音声', '品詞ごとの意味', '元の文ごと保存'], 'dailyplanet.com/environment'],
    ['翻訳と文法', '文を選ぶだけで<br><em>構造まで理解。</em>', '瞬時に翻訳し、文中の文法構造も解説します。', ['選択した文をすぐ翻訳', '文法パターンを解説', '通常・ゆっくり再生'], 'dailyplanet.com/environment'],
    ['ツールバーのポップアップ', '毎日の学習が<br><em>ワンクリックで。</em>', '今日の復習カード、目標、クイック検索、1分復習。', ['今日のカードがひと目でわかる', 'ページを離れずに復習', '端末間で同期（任意）'], ''],
    ['新しいタブ', '新しいタブで<br><em>毎回ひとつ単語を。</em>', 'タブを開くたびに、自分の単語帳からカードを表示。', ['最適なタイミングで出題', 'ワンタップで「覚えた／もう一度」', 'いつでもオフにできます'], '新しいタブ'],
    ['無料・拡張機能内に広告なし', '無料。安心。<br><em>試験対策に。</em>', 'アカウント不要。単語はブラウザ内に保存。', ['6,000+|発音記号・音声付きの単語', '15|インターフェース言語', 'IELTS · TOEIC|解説付きの模擬問題', 'FSRS|間隔反復で復習'], 'Lexkite'],
  ],
  ko: [
    ['모든 웹사이트에서', '단어를 더블클릭.<br><em>오래 기억하세요.</em>', '읽고 있는 바로 그 자리에서 발음, 뜻, 예문을 확인하세요.', ['영국·미국 발음 기호와 음성', '품사별 뜻', '원래 문장과 함께 저장'], 'dailyplanet.com/environment'],
    ['번역과 문법', '문장을 선택하면<br><em>구조까지 보입니다.</em>', '즉시 번역하고 문장 속 문법 구조를 설명합니다.', ['선택한 문장 바로 번역', '문법 패턴 설명', '보통·느린 속도로 듣기'], 'dailyplanet.com/environment'],
    ['툴바 팝업', '매일의 공부를<br><em>클릭 한 번으로.</em>', '오늘 복습할 카드, 목표, 빠른 검색, 1분 복습.', ['오늘의 카드를 한눈에', '페이지를 떠나지 않고 복습', '기기 간 동기화(선택)'], ''],
    ['새 탭', '새 탭을 열 때마다<br><em>단어 하나씩.</em>', '탭을 열 때마다 내 단어장의 카드를 보여줍니다.', ['딱 맞는 때에 출제', '한 번 탭: 외웠어요 / 다시', '언제든 끌 수 있어요'], '새 탭'],
    ['무료 · 확장 프로그램 내 광고 없음', '무료. 안심.<br><em>시험 대비용.</em>', '계정 불필요 – 단어는 내 브라우저에 저장됩니다.', ['6,000+|발음기호·음성 포함 단어', '15|인터페이스 언어', 'IELTS · TOEIC|해설이 있는 모의 문제', 'FSRS|간격 반복 복습'], 'Lexkite'],
  ],
  zh: [
    ['任意网页', '双击任意单词，<br><em>牢牢记住。</em>', '就在你阅读的地方查看发音、释义和例句。', ['英式与美式音标 + 发音', '按词性分类的释义', '连同原句一起保存'], 'dailyplanet.com/environment'],
    ['翻译与语法', '选中一句话，<br><em>看懂句子结构。</em>', '即时翻译，并讲解句中的语法结构。', ['任意选中内容即时翻译', '语法结构详解', '正常或慢速朗读'], 'dailyplanet.com/environment'],
    ['工具栏弹窗', '每天的学习，<br><em>一键开始。</em>', '待复习卡片、每日目标、快速查词和 1 分钟复习。', ['今日卡片一目了然', '不离开页面即可复习', '多设备同步（可选）'], ''],
    ['新标签页', '每开一个标签页，<br><em>学一个单词。</em>', '每次打开标签页，都从你的词库中出一张卡片。', ['在最佳时机复习', '一键：记住了 / 再复习', '随时可以关闭'], '新标签页'],
    ['免费 · 扩展内无广告', '免费，私密，<br><em>为考试而生。</em>', '无需注册，生词保存在你的浏览器中。', ['6,000+|带音标和发音的单词', '15|种界面语言', 'IELTS · TOEIC|带解析的练习题', 'FSRS|间隔重复复习'], 'Lexkite'],
  ],
  id: [
    ['Di situs mana pun', 'Klik dua kali kata apa pun.<br><em>Ingat selamanya.</em>', 'Pelafalan, arti, dan contoh tepat di tempat Anda membaca.', ['IPA Inggris & Amerika + audio', 'Arti per kelas kata', 'Simpan dengan kalimat aslinya'], 'dailyplanet.com/environment'],
    ['Terjemahkan & pelajari tata bahasa', 'Pilih satu kalimat.<br><em>Pahami strukturnya.</em>', 'Terjemahan instan beserta penjelasan struktur tata bahasanya.', ['Terjemahkan teks apa pun', 'Pola tata bahasa dijelaskan', 'Dengarkan normal atau lambat'], 'dailyplanet.com/environment'],
    ['Jendela ekstensi', 'Belajar harian,<br><em>cukup satu klik.</em>', 'Kartu jatuh tempo, target harian, cari cepat, dan ulasan 1 menit.', ['Kartu hari ini sekilas', 'Ulas cepat tanpa pindah halaman', 'Sinkron antarperangkat (opsional)'], ''],
    ['Tab baru', 'Satu kata<br><em>di setiap tab baru.</em>', 'Satu kartu dari koleksi Anda setiap kali membuka tab.', ['Kata muncul di saat yang tepat', 'Sekali ketuk: hafal / ulangi', 'Matikan kapan saja'], 'Tab baru'],
    ['Gratis · Tanpa iklan di ekstensi', 'Gratis. Privat.<br><em>Dibuat untuk ujian.</em>', 'Tanpa akun – kata Anda tetap di browser Anda.', ['6.000+|kata dengan IPA & audio', '15|bahasa antarmuka', 'IELTS · TOEIC|tes latihan dengan pembahasan', 'FSRS|pengulangan berjarak'], 'Lexkite'],
  ],
  de: [
    ['Auf jeder Website', 'Doppelklick aufs Wort.<br><em>Für immer gemerkt.</em>', 'Aussprache, Bedeutungen und Beispiele direkt beim Lesen.', ['Britische & amerikanische IPA + Audio', 'Bedeutungen nach Wortart', 'Mit dem Originalsatz speichern'], 'dailyplanet.com/environment'],
    ['Übersetzen & Grammatik', 'Satz markieren.<br><em>Struktur verstehen.</em>', 'Sofortige Übersetzung mit erklärten Grammatikstrukturen.', ['Jede Auswahl übersetzen', 'Grammatikmuster erklärt', 'Normal oder langsam anhören'], 'dailyplanet.com/environment'],
    ['Erweiterungs-Popup', 'Dein tägliches Lernen,<br><em>ein Klick entfernt.</em>', 'Fällige Karten, Tagesziel, Schnellsuche und 1-Minuten-Wiederholung.', ['Heutige Karten auf einen Blick', 'Wiederholen, ohne die Seite zu verlassen', 'Geräte synchronisieren (optional)'], ''],
    ['Neuer Tab', 'Ein Wort<br><em>in jedem neuen Tab.</em>', 'Eine Karte aus deinem eigenen Deck bei jedem neuen Tab.', ['Wörter zum richtigen Zeitpunkt', 'Ein Tipp: gewusst / wiederholen', 'Jederzeit abschaltbar'], 'Neuer Tab'],
    ['Kostenlos · Keine Werbung in der Erweiterung', 'Kostenlos. Privat.<br><em>Für Prüfungen gemacht.</em>', 'Kein Konto nötig – deine Wörter bleiben im Browser.', ['6.000+|Wörter mit IPA & Audio', '15|Sprachen der Oberfläche', 'IELTS · TOEIC|Übungstests mit Erklärungen', 'FSRS|verteilte Wiederholung'], 'Lexkite'],
  ],
  fr: [
    ['Sur tous les sites', 'Double-cliquez un mot.<br><em>Retenez-le pour de bon.</em>', 'Prononciation, sens et exemples là où vous lisez.', ['API britannique et américain + audio', 'Sens par nature de mot', 'Enregistrez avec la phrase d’origine'], 'dailyplanet.com/environment'],
    ['Traduction et grammaire', 'Sélectionnez une phrase.<br><em>Comprenez sa structure.</em>', 'Traduction instantanée et structures grammaticales expliquées.', ['Traduisez toute sélection', 'Structures grammaticales expliquées', 'Écoute normale ou lente'], 'dailyplanet.com/environment'],
    ['Fenêtre de l’extension', 'Votre étude du jour,<br><em>en un clic.</em>', 'Cartes à revoir, objectif du jour, recherche rapide et révision d’une minute.', ['Les cartes du jour en un coup d’œil', 'Révisez sans quitter la page', 'Synchronisation multi-appareils (option)'], ''],
    ['Nouvel onglet', 'Un mot<br><em>à chaque onglet.</em>', 'Une carte de votre propre paquet à chaque nouvel onglet.', ['Des mots au bon moment', 'Un geste : je sais / à revoir', 'Désactivable à tout moment'], 'Nouvel onglet'],
    ['Gratuit · Sans publicité dans l’extension', 'Gratuit. Privé.<br><em>Pensé pour les examens.</em>', 'Sans compte : vos mots restent dans votre navigateur.', ['6 000+|mots avec API et audio', '15|langues d’interface', 'IELTS · TOEIC|tests d’entraînement expliqués', 'FSRS|révisions en répétition espacée'], 'Lexkite'],
  ],
  ar: [
    ['على أي موقع', 'انقر مرتين على أي كلمة.<br><em>واحفظها للأبد.</em>', 'النطق والمعاني والأمثلة في المكان الذي تقرأ فيه.', ['النطق البريطاني والأمريكي مع الصوت', 'المعاني حسب نوع الكلمة', 'احفظ الكلمة مع جملتها الأصلية'], 'dailyplanet.com/environment'],
    ['ترجمة وقواعد', 'حدّد جملة.<br><em>وافهم تركيبها.</em>', 'ترجمة فورية مع شرح التراكيب النحوية في الجملة.', ['ترجم أي نص تحدده', 'شرح الأنماط النحوية', 'استمع بسرعة عادية أو بطيئة'], 'dailyplanet.com/environment'],
    ['نافذة الإضافة', 'دراستك اليومية<br><em>بنقرة واحدة.</em>', 'البطاقات المستحقة، الهدف اليومي، بحث سريع ومراجعة في دقيقة.', ['بطاقات اليوم في لمحة', 'مراجعة سريعة دون مغادرة الصفحة', 'مزامنة بين أجهزتك (اختياري)'], ''],
    ['علامة تبويب جديدة', 'كلمة جديدة<br><em>مع كل تبويب.</em>', 'بطاقة من مجموعتك الخاصة في كل مرة تفتح فيها تبويبًا.', ['كلمات في الوقت المناسب', 'نقرة واحدة: حفظتها / راجعها', 'يمكنك إيقافها متى شئت'], 'New Tab'],
    ['مجاني · بلا إعلانات في الإضافة', 'مجاني. خاص.<br><em>مصمم للاختبارات.</em>', 'لا حاجة إلى حساب – كلماتك تبقى في متصفحك.', ['6000+|كلمة مع النطق والصوت', '15|لغة للواجهة', 'IELTS · TOEIC|اختبارات تدريبية مع الشرح', 'FSRS|مراجعة بالتكرار المتباعد'], 'Lexkite'],
  ],
  hi: [
    ['किसी भी वेबसाइट पर', 'किसी शब्द पर डबल-क्लिक।<br><em>हमेशा याद रखें।</em>', 'जहाँ आप पढ़ रहे हैं, वहीं उच्चारण, अर्थ और उदाहरण।', ['ब्रिटिश और अमेरिकी IPA + ऑडियो', 'शब्द-भेद के अनुसार अर्थ', 'मूल वाक्य के साथ सेव करें'], 'dailyplanet.com/environment'],
    ['अनुवाद और व्याकरण', 'वाक्य चुनें।<br><em>उसकी संरचना समझें।</em>', 'तुरंत अनुवाद, साथ में वाक्य की व्याकरण संरचना की व्याख्या।', ['कोई भी चयन अनुवाद करें', 'व्याकरण पैटर्न समझाए गए', 'सामान्य या धीमी गति से सुनें'], 'dailyplanet.com/environment'],
    ['एक्सटेंशन पॉपअप', 'रोज़ की पढ़ाई,<br><em>बस एक क्लिक पर।</em>', 'आज के कार्ड, दैनिक लक्ष्य, क्विक लुकअप और 1 मिनट रिव्यू।', ['आज के कार्ड एक नज़र में', 'पेज छोड़े बिना रिव्यू', 'डिवाइस सिंक (वैकल्पिक)'], ''],
    ['नया टैब', 'हर नए टैब में<br><em>एक नया शब्द।</em>', 'हर बार टैब खोलने पर आपकी अपनी डेक से एक कार्ड।', ['सही समय पर शब्द', 'एक टैप: याद है / दोबारा', 'कभी भी बंद करें'], 'New Tab'],
    ['मुफ़्त · एक्सटेंशन में विज्ञापन नहीं', 'मुफ़्त। निजी।<br><em>परीक्षा के लिए बना।</em>', 'अकाउंट ज़रूरी नहीं – आपके शब्द आपके ब्राउज़र में रहते हैं।', ['6,000+|IPA और ऑडियो वाले शब्द', '15|इंटरफ़ेस भाषाएँ', 'IELTS · TOEIC|व्याख्या सहित प्रैक्टिस टेस्ट', 'FSRS|स्पेस्ड रिपिटिशन रिव्यू'], 'Lexkite'],
  ],
  ru: [
    ['На любом сайте', 'Двойной клик по слову.<br><em>Запомните навсегда.</em>', 'Произношение, значения и примеры прямо там, где вы читаете.', ['Британская и американская транскрипция + аудио', 'Значения по частям речи', 'Сохранение с исходным предложением'], 'dailyplanet.com/environment'],
    ['Перевод и грамматика', 'Выделите фразу.<br><em>Поймите структуру.</em>', 'Мгновенный перевод и разбор грамматических конструкций.', ['Перевод любого выделения', 'Грамматика с объяснениями', 'Обычная или медленная озвучка'], 'dailyplanet.com/environment'],
    ['Окно расширения', 'Ежедневная учёба —<br><em>в один клик.</em>', 'Карточки на сегодня, цель дня, быстрый поиск и повтор за минуту.', ['Карточки на сегодня одним взглядом', 'Повтор, не покидая страницу', 'Синхронизация устройств (по желанию)'], ''],
    ['Новая вкладка', 'Новое слово<br><em>в каждой вкладке.</em>', 'Карточка из вашей колоды при каждом открытии вкладки.', ['Слова в нужный момент', 'Одно касание: знаю / повторить', 'Можно отключить в любой момент'], 'New Tab'],
    ['Бесплатно · Без рекламы в расширении', 'Бесплатно. Приватно.<br><em>Для экзаменов.</em>', 'Без регистрации – ваши слова хранятся в браузере.', ['6000+|слов с транскрипцией и аудио', '15|языков интерфейса', 'IELTS · TOEIC|пробные тесты с разбором', 'FSRS|интервальные повторения'], 'Lexkite'],
  ],
  th: [
    ['บนทุกเว็บไซต์', 'ดับเบิลคลิกคำใดก็ได้<br><em>จำได้นาน</em>', 'คำอ่าน ความหมาย และตัวอย่าง ตรงที่คุณกำลังอ่าน', ['IPA แบบอังกฤษและอเมริกัน + เสียง', 'ความหมายตามชนิดคำ', 'บันทึกพร้อมประโยคต้นฉบับ'], 'dailyplanet.com/environment'],
    ['แปลและไวยากรณ์', 'เลือกประโยค<br><em>เข้าใจโครงสร้าง</em>', 'แปลทันที พร้อมอธิบายโครงสร้างไวยากรณ์ในประโยค', ['แปลข้อความที่เลือกได้ทันที', 'อธิบายรูปแบบไวยากรณ์', 'ฟังความเร็วปกติหรือช้า'], 'dailyplanet.com/environment'],
    ['หน้าต่างส่วนขยาย', 'การเรียนประจำวัน<br><em>ในคลิกเดียว</em>', 'การ์ดที่ต้องทบทวน เป้าหมายรายวัน ค้นหาด่วน และทบทวน 1 นาที', ['เห็นการ์ดวันนี้ในพริบตา', 'ทบทวนโดยไม่ต้องออกจากหน้า', 'ซิงก์ข้ามอุปกรณ์ (ไม่บังคับ)'], ''],
    ['แท็บใหม่', 'คำศัพท์ใหม่<br><em>ทุกแท็บใหม่</em>', 'การ์ดจากคลังคำของคุณทุกครั้งที่เปิดแท็บ', ['คำศัพท์มาในจังหวะที่ใช่', 'แตะครั้งเดียว: จำได้ / ทบทวน', 'ปิดได้ทุกเมื่อ'], 'New Tab'],
    ['ฟรี · ไม่มีโฆษณาในส่วนขยาย', 'ฟรี เป็นส่วนตัว<br><em>เพื่อการสอบ</em>', 'ไม่ต้องสมัครบัญชี คำศัพท์อยู่ในเบราว์เซอร์ของคุณ', ['6,000+|คำพร้อม IPA และเสียง', '15|ภาษาของอินเทอร์เฟซ', 'IELTS · TOEIC|ข้อสอบฝึกพร้อมคำอธิบาย', 'FSRS|ทบทวนแบบเว้นระยะ'], 'Lexkite'],
  ],
  tr: [
    ['Her web sitesinde', 'Kelimeye çift tıkla.<br><em>Kalıcı öğren.</em>', 'Telaffuz, anlamlar ve örnekler, tam okuduğun yerde.', ['İngiliz ve Amerikan IPA + ses', 'Sözcük türüne göre anlamlar', 'Orijinal cümleyle kaydet'], 'dailyplanet.com/environment'],
    ['Çeviri ve dil bilgisi', 'Bir cümle seç.<br><em>Yapısını anla.</em>', 'Anında çeviri ve cümledeki dil bilgisi yapılarının açıklaması.', ['Her seçimi çevir', 'Dil bilgisi kalıpları açıklanır', 'Normal veya yavaş dinle'], 'dailyplanet.com/environment'],
    ['Eklenti penceresi', 'Günlük çalışman<br><em>bir tık uzakta.</em>', 'Bugünkü kartlar, günlük hedef, hızlı arama ve 1 dakikalık tekrar.', ['Bugünkü kartlar bir bakışta', 'Sayfadan çıkmadan tekrar', 'Cihazlar arası senkron (isteğe bağlı)'], ''],
    ['Yeni sekme', 'Her yeni sekmede<br><em>bir kelime.</em>', 'Her sekme açışında kendi destenden bir kart.', ['Kelimeler doğru zamanda', 'Tek dokunuş: biliyorum / tekrar', 'İstediğin zaman kapat'], 'New Tab'],
    ['Ücretsiz · Eklentide reklam yok', 'Ücretsiz. Gizli.<br><em>Sınavlar için.</em>', 'Hesap gerekmez – kelimelerin tarayıcında kalır.', ['6.000+|IPA ve sesli kelime', '15|arayüz dili', 'IELTS · TOEIC|açıklamalı deneme sınavları', 'FSRS|aralıklı tekrar'], 'Lexkite'],
  ],
};

// Video: màn mở đầu [tiêu đề, phụ đề] và màn kết
export const VIDEO = {
 "en": {
  "intro": [
   "Learn English words<br><em>while you browse.</em>",
   "The free vocabulary extension for IELTS, TOEIC & everyday English"
  ],
  "outro": [
   "Add to Chrome –<br><em>it’s free.</em>",
   "lexkite.com"
  ]
 },
 "vi": {
  "intro": [
   "Học từ vựng tiếng Anh<br><em>ngay khi lướt web.</em>",
   "Tiện ích từ vựng miễn phí cho IELTS, TOEIC và tiếng Anh hằng ngày"
  ],
  "outro": [
   "Thêm vào Chrome –<br><em>miễn phí.</em>",
   "lexkite.com"
  ]
 },
 "es": {
  "intro": [
   "Aprende vocabulario en inglés<br><em>mientras navegas.</em>",
   "La extensión gratuita de vocabulario para IELTS, TOEIC y el inglés diario"
  ],
  "outro": [
   "Añádela a Chrome:<br><em>es gratis.</em>",
   "lexkite.com"
  ]
 },
 "pt": {
  "intro": [
   "Aprenda vocabulário em inglês<br><em>enquanto navega.</em>",
   "A extensão gratuita de vocabulário para IELTS, TOEIC e o inglês do dia a dia"
  ],
  "outro": [
   "Adicione ao Chrome:<br><em>é grátis.</em>",
   "lexkite.com"
  ]
 },
 "ja": {
  "intro": [
   "ブラウジングしながら<br><em>英単語を覚えよう。</em>",
   "IELTS・TOEIC・日常英語のための無料単語拡張機能"
  ],
  "outro": [
   "Chrome に追加 –<br><em>無料です。</em>",
   "lexkite.com"
  ]
 },
 "ko": {
  "intro": [
   "웹을 보면서<br><em>영어 단어를 익히세요.</em>",
   "IELTS·TOEIC·일상 영어를 위한 무료 단어 확장 프로그램"
  ],
  "outro": [
   "Chrome에 추가 –<br><em>무료입니다.</em>",
   "lexkite.com"
  ]
 },
 "zh": {
  "intro": [
   "浏览网页，<br><em>顺便学英语单词。</em>",
   "面向 IELTS、TOEIC 和日常英语的免费词汇扩展"
  ],
  "outro": [
   "添加到 Chrome —<br><em>完全免费。</em>",
   "lexkite.com"
  ]
 },
 "id": {
  "intro": [
   "Belajar kosakata Inggris<br><em>sambil browsing.</em>",
   "Ekstensi kosakata gratis untuk IELTS, TOEIC, dan bahasa Inggris sehari-hari"
  ],
  "outro": [
   "Tambahkan ke Chrome –<br><em>gratis.</em>",
   "lexkite.com"
  ]
 },
 "de": {
  "intro": [
   "Englische Vokabeln lernen,<br><em>während du surfst.</em>",
   "Die kostenlose Vokabel-Erweiterung für IELTS, TOEIC & Alltagsenglisch"
  ],
  "outro": [
   "Zu Chrome hinzufügen –<br><em>kostenlos.</em>",
   "lexkite.com"
  ]
 },
 "fr": {
  "intro": [
   "Apprenez l’anglais<br><em>en naviguant.</em>",
   "L’extension de vocabulaire gratuite pour l’IELTS, le TOEIC et l’anglais du quotidien"
  ],
  "outro": [
   "Ajoutez-la à Chrome :<br><em>c’est gratuit.</em>",
   "lexkite.com"
  ]
 },
 "ar": {
  "intro": [
   "تعلّم مفردات الإنجليزية<br><em>أثناء التصفح.</em>",
   "إضافة مجانية للمفردات لاختبارات IELTS وTOEIC والإنجليزية اليومية"
  ],
  "outro": [
   "أضفها إلى Chrome –<br><em>مجانًا.</em>",
   "lexkite.com"
  ]
 },
 "hi": {
  "intro": [
   "वेब ब्राउज़ करते हुए<br><em>अंग्रेज़ी शब्द सीखें।</em>",
   "IELTS, TOEIC और रोज़मर्रा की अंग्रेज़ी के लिए मुफ़्त शब्दावली एक्सटेंशन"
  ],
  "outro": [
   "Chrome में जोड़ें –<br><em>बिल्कुल मुफ़्त।</em>",
   "lexkite.com"
  ]
 },
 "ru": {
  "intro": [
   "Учите английские слова<br><em>прямо в браузере.</em>",
   "Бесплатное расширение для лексики: IELTS, TOEIC и повседневный английский"
  ],
  "outro": [
   "Установите в Chrome —<br><em>бесплатно.</em>",
   "lexkite.com"
  ]
 },
 "th": {
  "intro": [
   "เรียนคำศัพท์อังกฤษ<br><em>ระหว่างท่องเว็บ</em>",
   "ส่วนขยายคำศัพท์ฟรีสำหรับ IELTS, TOEIC และภาษาอังกฤษในชีวิตประจำวัน"
  ],
  "outro": [
   "เพิ่มลงใน Chrome –<br><em>ฟรี</em>",
   "lexkite.com"
  ]
 },
 "tr": {
  "intro": [
   "İngilizce kelimeleri<br><em>gezinirken öğren.</em>",
   "IELTS, TOEIC ve günlük İngilizce için ücretsiz kelime eklentisi"
  ],
  "outro": [
   "Chrome’a ekle –<br><em>ücretsiz.</em>",
   "lexkite.com"
  ]
 }
};
