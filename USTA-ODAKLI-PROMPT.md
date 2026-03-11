# Usta Odakli Revizyon Promptu

Bu projeyi bir SaaS paneli gibi degil, gun boyu ayakta calisan bir motor ustasinin hizli kullanacagi saha araci gibi yeniden duzenle.

## Ana ilke

Bu uygulamanin merkezi:

- plaka veya QR ile motora ulasma
- hizli kayit
- hizli is emri takibi
- hizli tahsilat

## Kaldirilacak veya geri plana alinacaklar

- system admin paneli
- fazla yonetim dili
- ana ekranda gereksiz buton kalabaligi
- kullaniciyi asiri fazla secenekle yavaslatan alanlar

## Ana ekran kurallari

Ana ekran ilk bakista sadece su sorulari cozmeli:

- Motor bulundu mu?
- Yeni kayit acilacak mi?
- Acik borc ne kadar?
- Aktif isler nerede?

Ana ekranda birincil aksiyonlar:

- Plaka ara
- Kamerayla tara
- Yeni kayit ekle
- Aktif isleri ac

QR hizi onemli ama ayri merkez gibi hissettirilmesin. QR motor detayinda ve aktif is akisinda dogal bir parca olarak kalsin.

## Usta deneyimi

- daha az tik
- daha buyuk ve net buton
- daha az metin
- daha dogrudan aksiyon
- once is, sonra detay

## Tasarim dili

- panel gibi degil atolye araci gibi
- sert, net, okunakli
- gunes altinda okunabilir kontrast
- gorsel gosteris yerine hiz ve netlik

## Korumasi gerekenler

- plaka arama esnekligi
- borc ve parcali tahsilat mantigi
- QR ile motor acma fikri
- aktif is durumu
- musteri takip ekrani

## Teknik uygulama

- system admin route ve girisini kaldir
- login ekrani sadece servis kullanicisina odaklansin
- dashboard u sadelestir
- QR merkezi ana akis disina cikarilsin
- QR kullanimi motor detayinda ve servis akisinda kalsin
- servis yonetimi korunup daha birincil hale getirilsin
