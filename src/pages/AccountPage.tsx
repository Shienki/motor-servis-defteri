import { LogOut, Save, Settings2, Store, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle } from "../components/Ui";
import { changeCurrentUserPassword, getCurrentUserProfile, signOutUser, updateCurrentUserProfile } from "../lib/mockApi";
import { numbersOnly } from "../lib/format";
import type { Profile } from "../types";

export function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    phone: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    nextPasswordRepeat: ""
  });

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        setUser(profile);
        setForm({
          name: profile.name,
          shopName: profile.shopName,
          phone: profile.phone ?? ""
        });
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Hesap bilgileri yüklenemedi.");
      });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const updated = await updateCurrentUserProfile(form);
      setUser(updated);
      setForm({
        name: updated.name,
        shopName: updated.shopName,
        phone: updated.phone ?? ""
      });
      setMessage("Servis bilgileri güncellendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bilgiler güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage("");

    try {
      if (passwordForm.nextPassword !== passwordForm.nextPasswordRepeat) {
        throw new Error("Yeni şifre tekrarı eşleşmiyor.");
      }

      await changeCurrentUserPassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword
      });

      setPasswordForm({
        currentPassword: "",
        nextPassword: "",
        nextPasswordRepeat: ""
      });
      setPasswordMessage("Şifre güncellendi.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Şifre güncellenemedi.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Hesap"
          title="Servis bilgileri"
          description="Adını, servis adını ve müşterinin göreceği servis telefonunu buradan güncelle."
          titleClassName="text-white"
        />
      </Panel>

      <Panel>
        <div className="flex items-start gap-4">
          <div className="rounded-3xl bg-sand p-4 text-steel">
            <UserCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-ink">{user?.name ?? "-"}</p>
            <p className="text-sm text-steel">@{user?.username ?? "-"}</p>
            <p className="text-sm text-steel">{user?.shopName ?? "-"}</p>
            <p className="text-sm text-steel">{user?.phone ? `Servis telefonu: ${user.phone}` : "Servis telefonu eklenmedi"}</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3 text-steel">
          <Settings2 size={18} />
          <p className="text-sm">Müşteri takip ekranında görünen telefon artık buradaki servis telefonu olacak.</p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Usta adı</Label>
              <Input
                value={form.name}
                maxLength={80}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Servis adı</Label>
              <div className="relative">
                <Store size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel" />
                <Input
                  className="pl-11"
                  value={form.shopName}
                  maxLength={80}
                  onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Servis telefonu</Label>
              <Input
                value={form.phone}
                maxLength={11}
                inputMode="numeric"
                placeholder="05XXXXXXXXX"
                onChange={(event) => setForm((current) => ({ ...current, phone: numbersOnly(event.target.value) }))}
              />
            </div>
            <div>
              <Label>Kullanıcı adı</Label>
              <Input value={user?.username ?? ""} disabled className="cursor-not-allowed opacity-70" />
            </div>
          </div>

          {message ? <p className="text-sm text-steel">{message}</p> : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="submit" className="gap-2" disabled={saving}>
              <Save size={18} />
              {saving ? "Kaydediliyor..." : "Bilgileri Kaydet"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/panel")}>
              Panele dön
            </Button>
            <Button
              type="button"
              variant="danger"
              className="gap-2"
              onClick={async () => {
                await signOutUser();
                navigate("/giris");
              }}
            >
              <LogOut size={18} />
              Çıkış yap
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Güvenlik"
          title="Şifre değiştir"
          description="Hesabının giriş şifresini buradan güncelleyebilirsin."
        />

        <form className="mt-5 grid gap-4" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Mevcut şifre</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Yeni şifre</Label>
              <Input
                type="password"
                value={passwordForm.nextPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Yeni şifre tekrar</Label>
              <Input
                type="password"
                value={passwordForm.nextPasswordRepeat}
                onChange={(event) => setPasswordForm((current) => ({ ...current, nextPasswordRepeat: event.target.value }))}
                required
              />
            </div>
          </div>

          {passwordMessage ? <p className="text-sm text-steel">{passwordMessage}</p> : null}

          <div className="flex justify-start">
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Şifre güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
