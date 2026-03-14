# Güvenlik ve Operasyon El Kitabı

Bu dosya production ortamında site sahibi olarak düzenli takip etmen gereken güvenlik ve operasyon adımlarını özetler.

## 1. Kritik ortam değişkenleri

Production ortamında aşağıdaki değerler yalnızca güvenli ortam değişkeni olarak tutulmalıdır:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Bu değerleri:

- frontend koduna yazma
- ekran görüntüsünde paylaşma
- sohbet içine düz metin olarak yapıştırma
- Git deposuna commit etme

## 2. Günlük kontrol rutini

Her gün 5 dakikalık hızlı kontrol için:

1. `Vercel > Deployments`
   Son deploylar beklediğin branch ve commitlerden mi geldi bak.
2. `Vercel > Runtime Logs`
   Özellikle `401`, `403`, `429`, `500` hatalarında artış var mı bak.
3. `Supabase > Authentication > Users`
   Beklenmeyen kullanıcı artışı var mı bak.
4. `Supabase > Table Editor`
   `profiles`, `motorcycles`, `repairs`, `work_orders` tablolarında anormal veri artışı veya silinme var mı bak.

## 3. Haftalık kontrol rutini

Haftada bir kez:

1. Admin girişi çalışıyor mu test et.
2. Usta hesabıyla giriş ve kayıt akışını test et.
3. Müşteri takip ekranını test et.
4. `Vercel` ortam değişkenlerini gözden geçir.
5. `Supabase` proje ayarlarında beklenmeyen değişiklik var mı bak.
6. Açık API uçlarında (`public-tracking`, `admin-login`, `repair-draft`) olağan dışı trafik artışı var mı incele.

## 4. Hangi log nerede okunur

### Vercel logları

Burada şunları görürsün:

- API route hataları
- crash eden serverless functionlar
- rate limit kaynaklı `429` cevapları
- admin login veya AI route hataları

Özellikle izle:

- `/api/admin-login`
- `/api/admin-overview`
- `/api/repair-draft`
- `/api/public-tracking`

### Supabase logları

Burada şunları görürsün:

- auth akışı
- veritabanı sorgu hataları
- REST erişim sorunları
- edge function davranışı

Özellikle izle:

- Authentication logs
- Database / API logs
- Auth users değişimleri

## 5. Olay anında ilk müdahale

Bir saldırı, sızıntı veya anormal durumdan şüphelenirsen:

1. Yeni deploy oldu mu kontrol et.
2. `Vercel` ve `Supabase` loglarında hangi route veya servis patlıyor bak.
3. Hangi secret etkilenmiş olabilir diye değerlendir.
4. Gerekirse ilgili API key’i hemen döndür.
5. Admin şifresini değiştir.
6. Şüpheli kullanıcı veya oturumları `Supabase Auth` üzerinden incele.

## 6. Production anahtar rotasyon planı

### Ne zaman döndürülmeli

- Bir secret yanlışlıkla paylaşıldığında
- Ekran görüntüsünde göründüğünde
- Şüpheli giriş veya kötüye kullanım olduğunda
- Düzenli bakım için 60-90 günde bir

### Döndürülecek sırlar

1. `OPENAI_API_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `ADMIN_PASSWORD`
4. `ADMIN_SESSION_SECRET`

### Güvenli rotasyon sırası

1. Yeni secret oluştur
2. Önce production ortam değişkenine yeni secretı gir
3. Gerekirse yeniden deploy et
4. Sistemin çalıştığını test et
5. Eski secretı iptal et

### Admin bilgileri için özel not

`ADMIN_PASSWORD` ve `ADMIN_SESSION_SECRET` birlikte ele alınmalıdır:

1. Yeni admin şifresi belirle
2. Yeni session secret üret
3. Vercel env değerlerini güncelle
4. Deploy sonrası admin login test et
5. Eski admin bilgisini geçersiz kabul et

## 7. Mevcut güvenlik kararları

Bu projede şu sertleştirmeler aktif:

- Admin giriş bilgileri koddan kaldırıldı
- Admin secretları env üzerinden zorunlu
- Kritik API uçlarında temel rate limit var
- Public tracking yanıtları cache dışı
- Service role key sadece server tarafında kullanılıyor

## 8. Düzenli test checklist

Her değişiklikten sonra kısa doğrulama:

1. Usta girişi çalışıyor mu
2. Admin girişi çalışıyor mu
3. Yeni kayıt açılabiliyor mu
4. Yeni işlem kaydı yapılabiliyor mu
5. Müşteri takip ekranı açılıyor mu
6. Public tracking ve admin panel loglarında hata var mı
