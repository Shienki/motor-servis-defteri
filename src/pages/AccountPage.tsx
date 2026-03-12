import { LogOut, Settings2, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { getCurrentUserProfile, signOutUser } from "../lib/mockApi";
import type { Profile } from "../types";

export function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then(setUser);
  }, []);

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle eyebrow="Hesap" title="Hesap ayarları" description="Kullanıcı bilgilerini gör ve oturumu kapat." />
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
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3 text-steel">
          <Settings2 size={18} />
          <p className="text-sm">Bu alan sade tutuldu. Usta için önemli olan hızlı giriş ve hızlı çıkış.</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="ghost" onClick={() => navigate("/panel")}>
            Panele Dön
          </Button>
          <Button
            variant="danger"
            className="gap-2"
            onClick={async () => {
              await signOutUser();
              navigate("/giris");
            }}
          >
            <LogOut size={18} />
            Çıkış Yap
          </Button>
        </div>
      </Panel>
    </div>
  );
}
