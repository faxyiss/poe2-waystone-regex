# PoE2 Waystone Regex — Web

*Path of Exile 2* stash arama kutusu için regex oluşturucu. Bu, masaüstü WinForms
uygulamasının **tamamen istemci tarafı (server'sız)** web sürümüdür.
Saf HTML + CSS + JavaScript; build adımı, framework veya bağımlılık yoktur.

## Çalıştırma

- **En basit:** `index.html` dosyasına çift tıkla — tarayıcıda açılır, çalışır.
- **Yayınlama:** Klasörü herhangi bir statik sunucuya (GitHub Pages, Netlify,
  Cloudflare Pages, kendi web sunucun) olduğu gibi yükle. Sunucu kodu gerekmez.

## Özellikler

Masaüstü sürümünün tüm işlevleri taşındı:

- **Regex Builder** — ITEM RARITY / PACK SIZE / MONSTER RARITY / WAYSTONE DROP CHANCE /
  EFFECTIVENESS satırları için MIN/MAX/ACTIVE/EXCLUDE; canlı regex çıktısı;
  oyun içi 250 karakter sınırı uyarısı; regex doğrulama; COPY / CLEAR.
- **Waystone Modifiers** — Extra Chaos/Fire/Cold/Lightning, Reduced Player Resistances,
  Temporal Chains vb. için HIDE (!) / SHOW.
- **CORRUPT** — OFF / ON / HIDE (!).
- **Saved Regexes** — kaydet, etiketle, ara/filtrele/sırala; her kayıtta stat rozetleri
  (IR / PS / MR / DROP / EFF); COPY / SHOW / EXPORT / düzenle-sil; **REACH** kaydırıcısı
  (MIN eşiklerini %0–20 düşürür).
- **Paylaşım** — kayıtları `.wsrx` dosyası olarak indir; dosyayı **📂 LOAD FROM FILE**
  ile ya da listeye **sürükleyip bırakarak** içe aktar.
- **Settings** — 10 tema, font, dil (English / Türkçe), etiket yönetimi.

Sayı kalıbı üreten mantık (`RegexBuilder.cs`) JavaScript'e **birebir** taşındı;
çıktılar masaüstü sürümüyle aynıdır.

## Veri saklama

Masaüstündeki `%AppData%\WaystoneRegex` klasörü yerine veriler tarayıcının
**localStorage**'ında tutulur (kayıtlı regexler + ayarlar). Veriler o tarayıcıya
özeldir; paylaşım/yedekleme için `.wsrx` dışa aktarımını kullan.

## Dosya yapısı

```
index.html        # iskelet + sekmeler
css/styles.css    # tema değişkenleriyle tüm stiller
js/i18n.js        # EN/TR yerelleştirme (Loc.cs portu)
js/data.js        # statlar, modifierlar, 10 tema (Themes.cs portu)
js/regex.js       # regex üretimi + sorgu ayrıştırma (RegexBuilder/SearchQuery portu)
js/store.js       # SavedRegex modeli + localStorage (SavedRegex.cs/AppSettings portu)
js/app.js         # arayüz mantığı (Form1.cs + diyaloglar portu)
```

`WaystoneRegexApp-main/` klasörü orijinal C# masaüstü kaynağıdır; web sürümü için
gerekmez, referans olarak duruyor.

## Kaynak / Credits

Bu site, MIT lisanslı **WaystoneRegexApp** masaüstü uygulamasının (C# WinForms)
web portudur. Regex üretim mantığı orijinal projeden birebir taşınmıştır.

## Feragatname

Resmi olmayan bir hayran aracıdır; Grinding Gear Games ile bağlantılı değildir.
*Path of Exile* ve *Path of Exile 2*, Grinding Gear Games'in ticari markalarıdır.
