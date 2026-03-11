# Project Status

## Proje

Motor Servis Defteri

## Su ana kadar yapilanlar

- React + Vite + Tailwind tabanli yerel proje kuruldu.
- Tasinabilir Node.js proje icine eklendi ve yerelde calistirildi.
- `npm install` ve `npm run build` basariyla calisti.
- Giris ve kayit ekranlari hazirlandi.
- Dashboard (panel) ekrani hazirlandi.
- Motosiklet detay ekrani hazirlandi.
- Yeni islem ekleme ekrani hazirlandi.
- Borc takibi ekrani hazirlandi.
- Kayitlar menusu eklendi.
- Yeni motosiklet kaydi olusturma ekrani eklendi.

## Is kurali ve davranis duzeltmeleri

- Plaka arama esnek hale getirildi.
- Kucuk/buyuk harf, bosluk farki ve dazgin yazim tolere ediliyor.
- Ekranda plaka her zaman standart formatta gosteriliyor.
- Borc sistemi tahsilat hareketlerine cevrildi.
- Her odeme ayri satir olarak tarih ve not ile saklaniyor.
- Kalan borc otomatik hesaplanıyor.
- `0 TL` kalan borclar acik borc olarak gosterilmiyor.
- Odenmis borclar icin ayri gorunum eklendi.
- Tahsilat sonrasi alanlar temizleniyor.
- Panel geri donuste veriyi yeniden yukluyor.

## Guvenlik acisindan yapilanlar

- Istemci tarafinda `VITE_OPENAI_API_KEY` kullanimi kaldirildi.
- OpenAI anahtarinin istemciye verilmemesi gerektigi not edildi.
- `localStorage` okuma/yazma akisina guvenli parse ve veri temizleme eklendi.
- Motosiklet, bakim ve odeme verilerine sinirlama ve normalize islemleri eklendi.
- Tekrarlayan plaka kaydi veri katmaninda da engelleniyor.

## Demo veri

- Birden fazla yeni plaka ve bakim kaydi eklendi.
- Demo veri surumlenerek tarayicidaki eski veri otomatik yenileniyor.

## Henuz yapilmayanlar

- Gercek Supabase baglantisi
- Gercek auth sistemi
- Gercek veritabani kayitlari
- Gercek OCR entegrasyonu
- Gercek Whisper / GPT entegrasyonu
- Sunucu tarafi guvenli API akislari
- Kodlama / Turkce karakter temizliginin tamamen bitirilmesi

## Bir sonraki mantikli adimlar

1. Supabase proje bilgilerini eklemek
2. Auth ve veritabani baglantisini gercek hale getirmek
3. RLS politikalarini aktif kullanmak
4. OpenAI entegrasyonunu sunucu tarafina tasimak
5. OCR ve sesli kayit akislarini gercek servislerle baglamak

## Yerel calistirma

PowerShell:

```powershell
cd "c:\Users\BilgeAdam\OneDrive\Masaüstü\Motor servisiss"
$nodeDir = "$PWD\.tools\node-v22.14.0-win-x64"
$env:PATH = "$nodeDir;$env:PATH"
npm run dev
```

## Yerel adres

`http://127.0.0.1:4173`
