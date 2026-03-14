# Yedek ve Kurtarma Notları

Bu projede veri kaybını azaltmak için iki katman hedeflenir:

1. Platform yedeği
- Supabase günlük backup / PITR

2. Uygulama içi değişiklik izi
- `backup_events` tablosu ile her insert/update/delete kaydı saklanır

## Supabase tarafında kontrol etmen gerekenler

Dashboard yolu:
- `Database`
- `Backups`

PITR yolu:
- `Database`
- `Point in Time Recovery`

Not:
- Canlı dashboard ayarlarının açık olup olmadığını kod içinden doğrulayamıyoruz.
- Bu kontrolü Supabase panelinden senin teyit etmen gerekiyor.

## Bu repoya eklenenler

- `supabase/migrations/20260315_add_backup_events.sql`
  Her kritik tablo değişiminde `backup_events` tablosuna audit kaydı düşer.

- `api/system-backup-export.ts`
  Yönetici oturumu ile tüm ana tabloların JSON snapshot'ını indirir.

## Önerilen operasyon rutini

1. Supabase `Backups` ekranını haftalık kontrol et
2. Mümkünse PITR aç
3. Admin panelden düzenli JSON dışa aktarımı al
4. JSON dosyasını farklı bir yerde sakla
5. `backup_events` tablosunun büyümesini aylık kontrol et

## Önemli sınır

`backup_events` aynı veritabanında tutulur.
Bu şu anlama gelir:
- yanlış veri güncelleme/silme sonrası iz bırakır
- ama Supabase projesi tamamen silinirse tek başına yeterli değildir

Bu yüzden:
- platform backup
- dışa aktarım
- audit trail

birlikte kullanılmalıdır.
