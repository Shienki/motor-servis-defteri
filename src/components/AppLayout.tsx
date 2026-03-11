import { BadgeAlert, ClipboardList, LayoutGrid, LogOut, Settings2, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import type { Profile } from "../types";
import { getCurrentUserProfile, signOutUser } from "../lib/mockApi";

const navItems = [
  { to: "/panel", label: "Panel", icon: LayoutGrid },
  { to: "/borclar", label: "Borçlar", icon: WalletCards },
  { to: "/kayitlar", label: "Kayıtlar", icon: ClipboardList }
];

export function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then(setUser);
  }, []);

  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="sticky top-0 z-10 border-b border-slate/10 bg-ink px-4 py-4 text-white shadow-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/panel" className="rounded-2xl px-2 py-1 transition hover:bg-white/5">
            <p className="text-xs uppercase tracking-[0.24em] text-mist">Motor Servis Defteri</p>
            <h1 className="text-lg font-semibold">{user?.shopName ?? "Servis hesabı"}</h1>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs sm:flex">
              <BadgeAlert size={16} />
              <span>Yerel demo sürümü</span>
            </div>
            <Link
              to="/hesap"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Settings2 size={16} />
              Hesap
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                navigate("/giris");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-danger/90"
            >
              <LogOut size={16} />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl flex-col pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate/10 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-around">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[84px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs font-medium ${
                  isActive ? "bg-amber text-ink" : "text-steel"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
