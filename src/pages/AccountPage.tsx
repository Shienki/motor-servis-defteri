import { LogOut, Save, Settings2, Store, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle } from "../components/Ui";
import { getCurrentUserProfile, signOutUser, updateCurrentUserProfile } from "../lib/mockApi";
import { numbersOnly } from "../lib/format";
import type { Profile } from "../types";

export function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    phone: ""
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
    </div>
  );
}
