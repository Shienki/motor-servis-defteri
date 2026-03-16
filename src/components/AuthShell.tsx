import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] bg-gradient-to-br from-slate via-steel to-ink p-8 text-white shadow-panel">
          <p className="text-xs uppercase tracking-[0.3em] text-amber">Atölye odaklı dijital kayıt</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Plakadan kayda, kayıttan tahsilata.</h1>
          <p className="mt-4 max-w-md text-sm text-sand/85">
            Ustanın iş akışını yavaşlatmadan plaka arama, servis geçmişi, iş durumu ve tahsilat takibi için tasarlandı.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-sand/90">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Plakayı yaz ya da resmi QR'ı okut, kaydı anında aç.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Hazır işlemi seç, ücreti gir, kaydı hızlıca oluştur.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Borçları, tahsilatları ve teslim durumunu tek ekranda gör.</div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-6 shadow-panel">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-warning">Motor Servis Defteri</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm text-steel">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  );
}
