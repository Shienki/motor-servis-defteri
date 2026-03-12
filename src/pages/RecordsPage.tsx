import { ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Panel, SectionTitle } from "../components/Ui";
import { fetchMotorcycles } from "../lib/mockApi";
import { canonicalPlate, formatPlateDisplay } from "../lib/format";
import type { Motorcycle } from "../types";

export function RecordsPage() {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchMotorcycles().then(setMotorcycles);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = canonicalPlate(query);
    if (!normalizedQuery) {
      return motorcycles;
    }

    return motorcycles.filter((item) => canonicalPlate(item.licensePlate).includes(normalizedQuery));
  }, [motorcycles, query]);

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Kayıt menüsü"
          title="Tüm motosiklet kayıtları"
          description="Buradan tüm kayıtları açabilir veya yeni kayıt başlatabilirsin."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mist" size={18} />
            <Input
              className="border-white/10 bg-white/10 pl-11 text-white placeholder:text-sand/50"
              placeholder="Plaka ara"
              value={query}
              onChange={(event) => setQuery(formatPlateDisplay(event.target.value))}
            />
          </div>
          <Button variant="secondary" onClick={() => navigate("/motosiklet-yeni?yontem=manuel")}>
            Elle Yeni Kayıt
          </Button>
          <Button variant="ghost" onClick={() => navigate("/kamera?hedef=yeni-kayit")}>
            Kamerayla Kayıt
          </Button>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Kayıt listesi"
          title={`${filtered.length} motosiklet`}
          description="Sağdaki oka dokunarak ilgili motosiklet kaydını aç."
        />
        <div className="mt-5 space-y-3">
          {filtered.map((motorcycle) => (
            <button
              key={motorcycle.id}
              type="button"
              onClick={() => navigate(`/motosiklet/${motorcycle.id}`)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate/10 px-4 py-4 text-left transition hover:border-amber/40 hover:bg-sand"
            >
              <div>
                <p className="font-semibold text-ink">{formatPlateDisplay(motorcycle.licensePlate)}</p>
                <p className="text-sm text-steel">{motorcycle.model}</p>
                <p className="text-xs text-mist">
                  {motorcycle.customerName} • {motorcycle.phone}
                </p>
              </div>
              <ChevronRight size={18} className="text-steel" />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
