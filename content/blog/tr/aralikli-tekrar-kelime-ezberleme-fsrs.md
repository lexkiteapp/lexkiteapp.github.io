---
slug: aralikli-tekrar-kelime-ezberleme-fsrs
title: "Aralikli Tekrar Kelime Ezberleme FSRS Sistemi Rehberi"
description: "Aralikli tekrar kelime ezberleme fsrs algoritması ile unutma eğrisini yenin. Anki ve SM-2 farkı, hafıza bilimi ve kalıcı kelime öğrenme stratejileri."
keyword: "aralikli tekrar kelime ezberleme fsrs"
lang: tr
translationKey: phuong-phap-spaced-repetition-thong-sap-fsrs
category: phuong-phap
tags: [fsrs, aralikli-tekrar, kelime]
cover: review
coverAlt: "Lexkite FSRS aralıklı tekrar modülü: kelime hatırlama kartları ve zorluk butonları"
qualityScore: 95
factChecked: 2026-10-22
author: Lexkite
status: ready
coverArt: {mood: think, icon: bulb}
publishAt: 2026-11-06T12:48:00+03:00
quiz: [
  {
    q: "Hermann Ebbinghaus'un Unutma Eğrisi'ne göre yeni öğrenilen bilgilerin yaklaşık yüzde kaçı 24 saat içinde unutulur?",
    options: [
      "Yaklaşık %10'u",
      "Yaklaşık %20'si",
      "Yaklaşık %70'i",
      "Bilgiler 1 hafta boyunca hiç unutulmaz"
    ],
    answer: 2,
    explain: "Ebbinghaus'un deneysel hafıza araştırmalarına göre aktif tekrar yapılmadığında yeni öğrenilen bilgilerin yaklaşık %70'i ilk 24 saat içinde zihinden silinir."
  },
  {
    q: "FSRS (Free Spaced Repetition Scheduler) algoritmasının eski SM-2 algoritmasına göre temel üstünlüğü nedir?",
    options: [
      "Daha az kelime kaydetmesi",
      "Kullanıcının kişisel hafıza stabilitesini ve zorluk seviyesini makine öğrenimiyle modelleyerek gereksiz tekrarları azaltması",
      "Sadece İngilizceye özel olması",
      "Günde sadece 5 kelime tekrarına izin vermesi"
    ],
    answer: 1,
    explain: "FSRS algoritması hafıza stabilitesi (stability) ve geri çağrılabilirlik (retrievability) parametrelerini kişiye özel hesaplayarak öğrenme süresini %30'a kadar kısaltır."
  },
  {
    q: "Aralıklı tekrar sisteminde bir kelimeyi 'Hard' veya 'Again' olarak işaretlediğinizde ne olur?",
    options: [
      "Kelime sistemden tamamen silinir",
      "Kelime puanınız sıfırlanır",
      "Algoritma o kelimenin stabilitesini düşürerek daha kısa bir süre sonra karşınıza yeniden çıkarır",
      "Uygulama o gün için kilitlenir"
    ],
    answer: 2,
    explain: "Hatırlamakta zorlandığınız kelimeler için algoritma tekrar aralığını kısaltır ve unutma eşiğine gelmeden önce kartı yeniden önünüze getirir."
  }
]
---

İngilizce öğrenirken yüzlerce kelime ezberleyip birkaç hafta sonra neredeyse tamamını unuttuğunuzu hissettiniz mi? Bu durum sizin hafızanızın zayıf olmasından değil, beynin doğal biyolojik bilgi eleme mekanizmasından kaynaklanır. Geleneksel ezber yöntemlerini terk edip modern bilişsel bilimin en gelişmiş modeli olan **aralikli tekrar kelime ezberleme fsrs** sistemini uygulamak, kelimeleri kalıcı uzun süreli hafızaya (*long-term memory*) nakşetmenin en kesin yoludur.

Bu rehberde, Hermann Ebbinghaus'un Unutma Eğrisi'ni, klasik Anki SM-2 algoritması ile yeni nesil FSRS arasındaki farkları ve Lexkite üzerinde aralıklı tekrar yöntemini nasıl maksimum verimle kullanacağınızı inceleyeceğiz.

## Ebbinghaus Unutma Eğrisi ve Beynin Bilgi Saklama Mantığı

1885 yılında Alman psikolog Hermann Ebbinghaus, insan hafızasının zaman içindeki bilgi kaybını ölçen öncü deneyler yaptı. Ortaya çıkan **Unutma Eğrisi (Forgetting Curve)**, insan zihninin doğasına dair çarpıcı bir gerçeği kanıtladı:

- Yeni bir kelime öğrendikten sadece **20 dakika sonra**, bilginin yaklaşık %40'ı unutulur.
- **24 saat sonra**, tekrar yapılmazsa öğrenilen kelimelerin yaklaşık %70'i buharlaşır.
- **1 ay sonra** ise geriye sadece %10-15 civarında dağınık kırıntılar kalır.

Beynimiz enerji tasarrufu yapmak üzere evrimleşmiştir; günlük hayatta hayati tehlike veya duygusal önem taşımayan her veri parçası "gereksiz çöp" olarak sınıflandırılıp sinapslardan temizlenir. Bir kelimenin kalıcı olması için beyne tek bir mesaj verilmelidir: *"Bu bilgi hayati ve sürekli kullanılıyor."*

Bunu başarmanın tek yolu ise bilgiyi tam unutulmak üzereyken, yani hatırlamanın zihinsel çaba gerektirdiği kritik anda yeniden çağırmaktır (*active recall*).

Daha geleneksel yöntemleri karşılaştırmak için [İngilizce kelime ezberleme teknikleri](/tr/blog/ingilizce-kelime-ezberleme/) yazımızı inceleyebilirsiniz.

![Lexkite akıllı öğrenme arayüzü: IELTS odaklı come up with deyimi kartı](media:practice-learn "IELTS hazırlık sürecinde akıllı öğrenme sistemiyle come up with kartını çalışma ekranı")

## Aralikli Tekrar Kelime Ezberleme FSRS Algoritması Nasıl Çalışır?

Aralıklı Tekrar Sistemi (Spaced Repetition System - SRS), her kelimenin tekrar aralığını matematiksel olarak optimize eden bir yazılım mimarisidir. Ancak her algoritma aynı performansı sunmaz.

### 1. Klasik SM-2 Algoritması (1987) ve Kısıtları
35 yılı aşkın süredir Anki ve SuperMemo gibi popüler uygulamaların temelini oluşturan SuperMemo-2 (SM-2) algoritması, doğrusal bir kolaylık faktörüne (*Ease Factor*) dayanır:
- Bir kelimeyi doğru bildiğinizde tekrar aralığı sabit bir katsayıyla (genellikle 2.5 kat) çarpılır (1 gün -> 3 gün -> 7 gün -> 18 gün...).
- **Kusuru**: Her kullanıcının hafıza yapısını ve her kelimenin soyutluk derecesini aynı kabul eder. Zor bir akademik kelime ile basit bir meyve ismine benzer aralıklar biçer; bu da gereksiz tekrarlara ve zaman israfına yol açar.

### 2. Yeni Nesil FSRS Modeli (Free Spaced Repetition Scheduler)
FSRS, modern bilişsel sinirbilim ve veri analitiğine dayalı açık kaynaklı devrimsel bir algoritmadır. DSY (DSR) hafıza modelini kullanır:
- **Difficulty (Zorluk - D)**: Kelimenin sizin için ne kadar karmaşık olduğu.
- **Stability (Stabilite - S)**: Kelimenin zihninizde ne kadar süre unutulmadan kalabileceği (gün cinsinden).
- **Retrievability (Hatırlanabilirlik - R)**: Belirli bir anda o kelimeyi zihninizden çağırabilme olasılığınız (örneğin %90 hedefi).

FSRS, her kullanıcının geçmiş cevaplama geçmişini analiz ederek kişisel bir hafıza haritası çıkarır. Böylece unutma ihtimaliniz %10'a ulaştığı anda kelimeyi karşınıza getirir. Sonuç: **%30 daha az tekrar ile %20 daha yüksek kalıcılık**.

Hafıza geliştirme sürecinizi hızlandırmak için [aralıklı tekrar modülü](/app/#/review) ekranımızı deneyimleyebilirsiniz.

## Aktif Hatırlama (Active Recall) vs. Pasif Okuma

Birçok öğrencinin düştüğü en büyük yanılgı, kelime listelerini alt alta yazıp fosforlu kalemle defalarca okumaktır (*passive review*).

> Bunu da oku: [Ingilizce Modal Verbs Can Could Should Must Kullanimi](/tr/blog/ingilizce-modal-verbs-can-could-should-must/)

- **Pasif Okuma**: Kelimeye baktığınızda beyniniz *"Evet, bunu biliyorum"* diyerek sahte bir aşinalık hissi (*illusion of competence*) üretir. Ancak sınavda veya konuşma anında kelimeyi sıfırdan zihninizden çekip çıkaramazsınız.
- **Aktif Hatırlama**: Kartın ön yüzünde sadece İngilizce kelime veya bağlam cümlesi yer alır. Cevaba bakmadan önce zihninizi zorlayarak anlamı üretmeye çalışırsınız. Nöronlar arasındaki bu zorlanma, sinaptik bağları kalınlaştırır ve bilgiyi uzun vadeli belleğe kilitler.

Kapsamlı kelime havuzuna erişmek için [kelime kütüphanesi](/app/#/library) modülümüzü ziyaret edebilirsiniz.

![Lexkite FSRS hafıza performansı: heatmap takvimi ve xp skorları](media:stats "Haftalık heatmap üzerinde aralıklı tekrar istikrarı ve toplanan toplam xp puanları")

## FSRS İle Günde 15 Dakikada Yılda 3.000 Kelime Öğrenme Rutini

Sürdürülebilir bir kelime öğrenme alışkanlığı kurmak için devasa zaman bloklarına ihtiyacınız yoktur. Günde sadece 15 dakikalık disiplinli bir FSRS rutini yeterlidir:

1. **Günde 10 Yeni Kelime Ekleyin**: Günde 50 kelime eklemek başlangıçta çekici görünse de 2 hafta sonra yüzlerce birikmiş tekrar kartı altında ezilmenize (*review backlog*) neden olur. Günde 10 yeni kart, ayda 300, yılda 3.650 kelime demektir.
2. **Sabah İlk İş Tekrarları Tamamlayın**: Yeni kelime öğrenmeden önce sistemin o gün için planladığı tekrar kartlarını (*Due Cards*) eritin.
3. **Kartları Dürüstçe Puanlayın**:
   - *Again (Tekrar)*: Kelimeyi tamamen unuttuysanız veya yanlış hatırladıysanız.
   - *Hard (Zor)*: Çok uzun süre düşünüp zorlukla hatırladıysanız.
   - *Good (İyi)*: Normal bir zihinsel çabayla doğru hatırladıysanız (en sık kullanılması gereken buton).
   - *Easy (Kolay)*: Hiç düşünmeden anında bildiyseniz.
4. **Bağlam ve Ses İle Destekleyin**: Kelimeyi tek başına değil, örnek bir cümle içinde görün ve telaffuzunu dinleyin. Doğru sesletim için [İngilizce telaffuz geliştirme](/tr/blog/ingilizce-telaffuz-gelistirme/) sayfamızdan destek alabilirsiniz.

Genel öğrenme stratejinizi optimize etmek için [İngilizce nasıl öğrenilir](/tr/blog/ingilizce-nasil-ogrenilir/) ve günlük kalıplar için [İngilizce phrasal verbs en çok kullanılanlar](/tr/blog/ingilizce-phrasal-verbs-en-cok-kullanilanlar/) makalelerimize göz atabilirsiniz.

## FSRS Algoritmasının 4 Temel Parametresi ve Matematiksel Mantığı

FSRS (Free Spaced Repetition Scheduler), hafıza izini doğrusal olmayan diferansiyel denklemlerle modeller. Bu model 4 temel sütun üzerinde yükselir:

### 1. Hafıza Stabilitesi (Memory Stability - S)
Stabilite, bir bilginin zihninizden silinmeden kalabileceği süreyi gün bazında ifade eder. Örneğin $S = 10$ ise, bu kelimeyi 10 gün sonra hatırlama ihtimaliniz %90 seviyesindedir. Her başarılı aktif hatırlama seansında stabilite katlanarak büyür ($S = 10 \rightarrow S = 28 \rightarrow S = 95$).

### 2. Geri Çağrılabilirlik (Retrievability - R)
Zaman geçtikçe bilginin zihinden geri çağrılma olasılığı düşer. Ebbinghaus eğrisine göre formüle edilen bu değer, zaman ve stabilite oranına bağlı olarak hesaplanır. FSRS, kullanıcı tarafından belirlenen hedef hatırlanabilirlik oranına (genellikle %90) ulaşıldığında kartı tam vaktinde incelemeye gönderir.

### 3. Göreceli Zorluk Derecesi (Difficulty - D)
Her İngilizce kelime eşit zorlukta değildir. Örneğin somut ve kısa bir kelime olan *"desk"*, soyut ve çok anlamlı bir akademik terim olan *"ubiquitous"* veya *"paradigm shift"* ile aynı bilişsel yükü taşımaz. FSRS, kullanıcının verdiği ilk tepkilere göre zorluk puanını 1 ile 10 arasında dinamik olarak kalibre eder.

### 4. Kart Durumları (Card States)
Sistemde her kelime 4 farklı evreden geçer:
- **New (Yeni)**: Henüz ilk kez karşılaşılan ve hafıza kodu oluşturulmamış kelimeler.
- **Learning (Öğrenme)**: Kısa aralıklarla (dakikalar veya saatler) pekiştirilen erken evre kartları.
- **Review (Aralıklı Tekrar)**: Günler ve haftalar mertebesinde uzun vadeli belleğe aktarılmakta olan kartlar.
- **Relearning (Yeniden Öğrenme)**: Unutulan ve stabilite puanı düşürülerek sıfırdan öğrenme döngüsüne sokulan kartlar.

Bu matematiksel hassasiyet sayesinde Lexkite kullanıcıları, günde binlerce kelimeyi gereksiz yere gözden geçirmek zorunda kalmadan tam vaktinde öğrenir.

## Mnemonik Hafıza Teknikleri İle FSRS Birlikteliği

FSRS algoritması kelimenin tekrar takvimini mükemmel şekilde yönetirken, kelimeyi hafızaya ilk kodlama anında görsel ve çağrışımsal tekniklerden (*mnemonics*) yararlanmak öğrenme hızınızı ikiye katlar:
- **Görsel Hikayeleştirme**: Kelimenin okunuşunu Türkçe komik veya absürt bir sahneyle eşleştirin. Beynimiz duygusal ve tuhaf sahneleri sıradan soyut tanımlardan katbekat daha hızlı kaydeder.
- **Kişisel Bağlantı Kurma**: Kelimeyi tanımadığınız hayali bir kişiyle değil, kendi ailenizden biriyle veya geçmiş bir anınızla bağdaştırarak örnek bir cümle içinde kullanın.

Ayrıca okuyun: [IELTS Writing Task 1 Grafik: Rapor Yazma ve Analiz Taktikleri](/tr/blog/ielts-writing-task-1-grafik-yorumlama-rehberi/) · [İngilizce Bağlaçlar: Essay Yazımı İçin Linking Words Rehberi](/tr/blog/ingilizce-baglaclar-ve-linking-words-tablosu/) · [İngilizce Connected Speech: Ses Bağlama Kuralları ve Telaffuz](/tr/blog/ingilizce-connected-speech-ses-baglama-kurallari/)

{{cta: /tu-vung/ | FSRS Destekli Kelime Öğrenimine Başla}}

{{youtube: | Spaced Repetition FSRS Memory Algorithm Explained}}

## Sıkça Sorulan Sorular (FAQ)

### Q1. FSRS ile Anki SM-2 arasındaki en büyük fark nedir?
SM-2 sabit katsayılarla çalışırken, FSRS makine öğrenimi temelli parametrelerle sizin kişisel unutma hızınızı hesaplar. Bu sayede bildiğiniz kelimeleri gereksiz yere önünüze getirmez ve çalışma sürenizi yaklaşık %30 oranında kısaltır.

### Q2. Bir gün bile tekrar yapmazsam ne olur?
Aralıklı tekrar sistemi zincirleme bir disipline dayanır. Bir gün kaçırdığınızda ertesi güne iki günlük tekrar birikir. Arka arkaya birkaç gün aksatmak kartların birikmesine (*backlog*) ve motivasyon kaybına yol açabilir. Bu nedenle her gün az da olsa (örneğin sadece 5 dakika) tekrar yapmak hayati önem taşır.

### Q3. Kelimeleri ezberlerken Türkçe karşılığını mı yoksa İngilizce tanımını mı yazmalıyım?
A1-A2 başlangıç seviyelerinde Türkçe karşılık ve görsel hafıza kartları faydalıdır. Ancak B1 ve üzeri seviyelerde kelimenin İngilizce tanımını, eş anlamlılarını (*synonyms*) ve örnek bir cümle içindeki kullanımını tercih etmek, Türkçe çeviri yapmadan düşünme becerisini geliştirir.

### Q4. FSRS sadece kelime ezberlemek için mi kullanılır?
Hayır. FSRS dilbilgisi kuralları, deyimler (*idioms*), tıp ve hukuk terimleri, sınav soru kalıpları veya tarihsel tarihler gibi hatırlanması gereken her türlü olgusal bilginin öğrenilmesinde son derece etkilidir.
