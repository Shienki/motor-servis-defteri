import { ChevronRight, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Panel, SectionTitle } from "../components/Ui";
import { fetchDebtList, fetchPaidRepairs } from "../lib/mockApi";
import { formatCurrency, formatDate, formatShortDate } from "../lib/format";
import type { Repair } from "../types";

type DebtItem = Awaited<ReturnType<typeof fetchDebtList>>[number];

export function DebtsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<DebtItem[]>([]);
  const [paidItems, setPaidItems] = useState<Repair[]>([]);
  const showPaid = searchParams.get("gorunum") === "odenen";

  useEffect(() => {
    fetchDebtList().then(setItems);
    fetchPaidRepairs().then(setPaidItems);
  }, []);

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Tahsilat listesi"
          title={showPaid ? "Ödenmiş borç geçmişi" : "Ödenmemiş ve kısmi ödemeler"}
          description={
            showPaid
              ? "Tamamlanan tahsilatları geçmiş olarak inceleyebilirsin."
              : "Kimin borcu kaldığını plaka ve müşteri bazında tek bakışta gör."
          }
        />
      </Panel>

      <Panel>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${showPaid ? "bg-sand text-ink" : "bg-amber text-ink"}`}
          >
            Açık Borçlar
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ gorunum: "odenen" })}
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${showPaid ? "bg-amber text-ink" : "bg-sand text-ink"}`}
          >
            Ödenmiş Borçlar
          </button>
        </div>

        {showPaid ? (
          <div className="mt-5 space-y-4">
            {paidItems.map((repair) => (
              <button
                key={repair.id}
                type="button"
                onClick={() => navigate(`/motosiklet/${repair.motorcycleId}`)}
                className="w-full rounded-[24px] border border-slate/10 p-4 text-left transition hover:border-amber/40 hover:bg-sand"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink">{repair.description}</p>
                    <p className="text-sm text-steel">Son işlem: {formatDate(repair.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-success/10 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-success">Tahsil edildi</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{formatCurrency(repair.totalCost)}</p>
                    <p className="mt-1 text-xs text-steel">Tam ödeme alındı</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <button
                key={item.motorcycle.id}
                type="button"
                onClick={() => navigate(`/motosiklet/${item.motorcycle.id}`)}
                className="w-full rounded-[24px] border border-slate/10 p-4 text-left transition hover:border-amber/40 hover:bg-sand"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink">{item.motorcycle.licensePlate}</p>
                    <p className="text-sm text-steel">{item.motorcycle.model}</p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-steel">
                      <Phone size={14} />
                      <span>
                        {item.motorcycle.customerName} - {item.motorcycle.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-danger/10 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-danger">Toplam borç</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{formatCurrency(item.unpaidBalance)}</p>
                      {item.lastRepair ? (
                        <div className="mt-1 space-y-1 text-xs text-steel">
                          <p>Son işlem: {formatDate(item.lastRepair.createdAt)}</p>
                          <p>Tahsil günü: {formatShortDate(item.lastRepair.paymentDueDate)}</p>
                        </div>
                      ) : null}
                    </div>
                    <ChevronRight size={20} className="text-steel" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
