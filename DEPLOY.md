# Deploy Rehberi

## Amaç

Projeyi `Vercel` üzerinde online yayınlamak ve `Supabase` ile `OpenAI` ortam değişkenlerini güvenli şekilde tanımlamak.

## Yayından önce kontrol

1. `Supabase schema.sql` çalışmış olmalı
2. `VITE_SUPABASE_URL` hazır olmalı
3. `VITE_SUPABASE_ANON_KEY` hazır olmalı
4. `OPENAI_API_KEY` hazır olmalı
5. `Supabase email confirmation` kapalı olmalı

## Supabase kritik ayar

Kullanıcı adı + şifre kullandığımız için uygulama arka planda görünmeyen e-posta üretir.

Bu yüzden Supabase içinde:

- `Authentication`
- `Providers`
- `Email`
- `Confirm email`

ayarını kapat.

## Vercel ile yayın

1. `vercel.com` sitesine gir
2. Hesap aç veya giriş yap
3. Projeyi GitHub üzerinden içe aktar veya Vercel CLI ile bağla
4. Framework olarak `Vite` seçilirse kabul et
5. Build ayarları:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Environment Variables bölümüne şunları ekle:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
```

7. Deploy bas

## İlk yayın sonrası kontrol

1. Kayıt ol
2. Giriş yap
3. Motosiklet ekle
4. Yeni işlem ekle
5. Borç ekranını kontrol et
6. QR ekranını aç
7. System admin girişini kontrol et

## Bilinen teknik not

- Derleme geçiyor
- Tek uyarı: ana JavaScript paketi büyük, ileride `code split` (parçalara bölme) yapılabilir
- Bu uyarı yayına engel değil
