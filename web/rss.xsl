<?xml version="1.0" encoding="UTF-8"?>
<!-- Trang hiển thị RSS cho người mở bằng trình duyệt (máy đọc RSS bỏ qua file này). Màu theo token thương hiệu. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<xsl:variable name="l" select="/rss/channel/language"/>
<html lang="{$l}"><xsl:if test="$l='ar'"><xsl:attribute name="dir">rtl</xsl:attribute></xsl:if>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/>
<title><xsl:value-of select="/rss/channel/title"/> · RSS</title>
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"/>
<style>
:root{--bg:#f5f6fb;--surface:#fff;--text:#171827;--muted:#4e526b;--line:#e2e4ef;--primary:#CC3F1C;--accent:#0D6964;--ink:#0F3D3E}
@media (prefers-color-scheme:dark){:root{--bg:#0f1117;--surface:#171a22;--text:#eceef5;--muted:#a3a8bd;--line:#2a2f3c;--primary:#FF8466;--accent:#5FD0C4;--ink:#5FD0C4}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
.top{display:flex;align-items:center;gap:10px;margin-bottom:20px}.top img{width:36px;height:36px}.top b{font-size:1.2rem;color:var(--ink)}
.note{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:14px 16px;color:var(--muted);font-size:.95rem}
.note code{background:var(--bg);padding:2px 6px;border-radius:6px;word-break:break-all}
h1{font-size:1.7rem;margin:18px 0 4px}.desc{color:var(--muted);margin:0 0 18px}
.item{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}
.item h2{font-size:1.1rem;margin:0 0 4px}.item h2 a{color:var(--text);text-decoration:none}.item h2 a:hover{color:var(--primary)}
.meta{color:var(--muted);font-size:.85rem}.item p{margin:6px 0 8px}
.go{color:var(--primary);font-weight:700;text-decoration:none}.back{display:inline-block;margin-top:18px;color:var(--accent);font-weight:700}
</style></head>
<body><main>
<div class="top"><img src="/icons/icon.svg?v=2" alt=""/><b>lexkite</b></div>
<div class="note"><xsl:choose><xsl:when test="$l='vi'">Đây là nguồn tin RSS của blog. Dán địa chỉ trang này vào ứng dụng đọc tin (Feedly, Inoreader…) để nhận bài mới.</xsl:when><xsl:when test="$l='es'">Este es el feed RSS del blog. Pega esta URL en un lector de feeds (Feedly, Inoreader…) para recibir nuevos artículos.</xsl:when><xsl:when test="$l='pt'">Este é o feed RSS do blog. Cole este endereço num leitor de feeds (Feedly, Inoreader…) para receber novos artigos.</xsl:when><xsl:when test="$l='fr'">Ceci est le flux RSS du blog. Collez cette adresse dans un lecteur de flux (Feedly, Inoreader…) pour recevoir les nouveaux articles.</xsl:when><xsl:when test="$l='de'">Dies ist der RSS-Feed des Blogs. Füge diese Adresse in einen Feedreader (Feedly, Inoreader…) ein, um neue Beiträge zu erhalten.</xsl:when><xsl:when test="$l='id'">Ini adalah feed RSS blog. Tempel alamat halaman ini ke aplikasi pembaca feed (Feedly, Inoreader…) untuk menerima artikel baru.</xsl:when><xsl:when test="$l='th'">นี่คือฟีด RSS ของบล็อก วางที่อยู่หน้านี้ในแอปอ่านฟีด (Feedly, Inoreader…) เพื่อรับบทความใหม่</xsl:when><xsl:when test="$l='zh'">这是博客的 RSS 订阅源。将此页面地址粘贴到阅读器（Feedly、Inoreader…）即可接收新文章。</xsl:when><xsl:when test="$l='ja'">これはブログの RSS フィードです。このページの URL をフィードリーダー（Feedly、Inoreader など）に貼り付けると新着記事を受け取れます。</xsl:when><xsl:when test="$l='ko'">블로그 RSS 피드입니다. 이 페이지 주소를 피드 리더(Feedly, Inoreader 등)에 붙여 넣으면 새 글을 받아볼 수 있습니다.</xsl:when><xsl:when test="$l='hi'">यह ब्लॉग का RSS फ़ीड है। नए लेख पाने के लिए इस पेज का पता किसी फ़ीड रीडर (Feedly, Inoreader…) में चिपकाएँ।</xsl:when><xsl:when test="$l='ar'">هذه خلاصة RSS للمدونة. الصق عنوان هذه الصفحة في قارئ الخلاصات (Feedly وInoreader…) لتلقي المقالات الجديدة.</xsl:when><xsl:when test="$l='ru'">Это RSS-лента блога. Вставьте адрес этой страницы в RSS-ридер (Feedly, Inoreader…), чтобы получать новые статьи.</xsl:when><xsl:when test="$l='tr'">Bu, blogun RSS akışıdır. Yeni yazıları almak için bu sayfanın adresini bir akış okuyucusuna (Feedly, Inoreader…) yapıştırın.</xsl:when><xsl:otherwise>This is the blog RSS feed. Paste this page URL into a feed reader (Feedly, Inoreader…) to get new posts.</xsl:otherwise></xsl:choose><br/><code><xsl:value-of select="/rss/channel/atom:link[@rel='self']/@href"/></code></div>
<h1><xsl:value-of select="/rss/channel/title"/></h1>
<p class="desc"><xsl:value-of select="/rss/channel/description"/></p>
<xsl:for-each select="/rss/channel/item">
<div class="item"><h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
<div class="meta"><xsl:value-of select="substring(pubDate,1,16)"/> · <xsl:value-of select="category"/></div>
<p><xsl:value-of select="description"/></p><a class="go" href="{link}"><xsl:choose><xsl:when test="$l='vi'">Đọc bài</xsl:when><xsl:when test="$l='es'">Leer</xsl:when><xsl:when test="$l='pt'">Ler</xsl:when><xsl:when test="$l='fr'">Lire</xsl:when><xsl:when test="$l='de'">Lesen</xsl:when><xsl:when test="$l='id'">Baca</xsl:when><xsl:when test="$l='th'">อ่าน</xsl:when><xsl:when test="$l='zh'">阅读</xsl:when><xsl:when test="$l='ja'">読む</xsl:when><xsl:when test="$l='ko'">읽기</xsl:when><xsl:when test="$l='hi'">पढ़ें</xsl:when><xsl:when test="$l='ar'">اقرأ</xsl:when><xsl:when test="$l='ru'">Читать</xsl:when><xsl:when test="$l='tr'">Oku</xsl:when><xsl:otherwise>Read</xsl:otherwise></xsl:choose> →</a></div>
</xsl:for-each>
<a class="back" href="{/rss/channel/link}">← <xsl:choose><xsl:when test="$l='vi'">Về blog</xsl:when><xsl:when test="$l='es'">Volver al blog</xsl:when><xsl:when test="$l='pt'">Voltar ao blog</xsl:when><xsl:when test="$l='fr'">Retour au blog</xsl:when><xsl:when test="$l='de'">Zum Blog</xsl:when><xsl:when test="$l='id'">Kembali ke blog</xsl:when><xsl:when test="$l='th'">กลับไปที่บล็อก</xsl:when><xsl:when test="$l='zh'">返回博客</xsl:when><xsl:when test="$l='ja'">ブログへ戻る</xsl:when><xsl:when test="$l='ko'">블로그로 돌아가기</xsl:when><xsl:when test="$l='hi'">ब्लॉग पर वापस</xsl:when><xsl:when test="$l='ar'">العودة إلى المدونة</xsl:when><xsl:when test="$l='ru'">К блогу</xsl:when><xsl:when test="$l='tr'">Bloga dön</xsl:when><xsl:otherwise>Back to blog</xsl:otherwise></xsl:choose></a>
</main></body></html>
</xsl:template></xsl:stylesheet>
