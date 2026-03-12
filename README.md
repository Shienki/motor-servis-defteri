# Motor Servis Defteri

Motor tamircileri için mobil odaklı dijital servis kayıt uygulaması.

## Bu sürüm ne içeriyor

- React + Vite + Tailwind arayüzü
- Kullanıcı adı + şifre ile giriş ve kayıt
- Dashboard, motosiklet detay, yeni işlem, borç takibi, kayıtlar, hesap, servis yönetimi
- System admin girişi ve genel yönetim paneli
- QR üretme, QR yönlendirme ve müşteri takip ekranı
- Supabase bağlantı altyapısı
- OpenAI için sunucu tarafı `API` (uygulama programlama arayüzü) hazırlığı

## Lokal çalışma

Bu proje içine yönetici yetkisi gerektirmeyen taşınabilir `Node.js` (JavaScript çalışma ortamı) indirildi:

`.\.tools\node-v22.14.0-win-x64\`

Mevcut terminal oturumunda bu `Node.js` kopyası ile komut çalıştırmak için:

```powershell
$nodeDir = "$PWD\.tools\node-v22.14.0-win-x64"
$env:PATH = "$nodeDir;$env:PATH"
```

Ardından:

```bash
npm install
npm run dev
```

Doğrulama sırasında uygulama `http://127.0.0.1:4173` adresinde başarıyla çalıştı.

## Ortam değişkenleri

`.env.local` dosyası örneği:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Supabase notu

Bu projede giriş akışı kullanıcı adı + şifre şeklinde kurulmuş olsa da `Supabase Auth` (giriş sistemi) arka tarafta e-posta ister. Bu yüzden uygulama içerde görünmeyen bir e-posta üretir:

`kullaniciadi@motorservis.local`

Bu yüzden Supabase panelinde `email confirmation` (e-posta doğrulama) kapalı olmalıdır. Aksi halde kayıt olup hemen giriş yapmak zorlaşır.

Kontrol yeri:

- `Authentication`
- `Providers`
- `Email`
- `Confirm email` kapalı olmalı

## AI notu

Sesli işlem ekranı şu an iki modla çalışır:

- `OPENAI_API_KEY` yoksa simülasyon verisi kullanır
- `OPENAI_API_KEY` varsa `/api/repair-draft` üzerinden gerçek OpenAI çağrısı yapar

Anahtar istemci tarafına yazılmaz. Sadece sunucu ortam değişkeni olarak tutulur.

## Whisper notu

Gerçek ses kaydı akışı artık `Supabase Edge Function` için hazırdır:

- fonksiyon yolu: `supabase/functions/repair-voice/index.ts`
- frontend önce `https://<supabase-url>/functions/v1/repair-voice` adresini dener
- fonksiyon deploy edilmemişse eski Vercel route fallback olarak kalır

Bu fonksiyonun çalışması için `Supabase` tarafında şu secret'lar tanımlı olmalıdır:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Yayın notu

Vercel için temel yapı hazır:

- [vercel.json](c:\Users\BilgeAdam\OneDrive\Masaüstü\Motor servisiss\vercel.json)
- [api/repair-draft.ts](c:\Users\BilgeAdam\OneDrive\Masaüstü\Motor servisiss\api\repair-draft.ts)

Detaylı yayın adımları için:

- [DEPLOY.md](c:\Users\BilgeAdam\OneDrive\Masaüstü\Motor servisiss\DEPLOY.md)

## Güvenlik notu

- `OPENAI_API_KEY` istemci tarafında `VITE_...` olarak tutulmamalı
- `SUPABASE_SERVICE_ROLE_KEY` sadece sunucu tarafında tutulmalı, istemciye verilmemeli
- müşteri takip ekranı için herkese açık veritabanı politikası açılmamalı
- müşteri takip ve QR yönlendirme bu sürümde sunucu tarafı rotalar üzerinden çalışır
