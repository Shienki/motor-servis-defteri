import type { PaymentStatus, WorkOrderStatus } from "../types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "Ödendi";
  if (status === "partial") return "Kısmi";
  return "Ödenmedi";
}

export function paymentStatusTone(status: PaymentStatus) {
  if (status === "paid") return "bg-success/15 text-success ring-1 ring-success/20";
  if (status === "partial") return "bg-warning/15 text-warning ring-1 ring-warning/20";
  return "bg-danger/15 text-danger ring-1 ring-danger/20";
}

export function numbersOnly(input: string) {
  return input.replace(/\D+/g, "");
}

export function lettersAndSpacesOnly(input: string) {
  return input.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü\s]/g, "").replace(/\s+/g, " ").trimStart();
}

export function normalizePlate(input: string) {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}

export function canonicalPlate(input: string) {
  return input
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, "")
    .trim();
}

export function formatPlateDisplay(input: string) {
  const canonical = canonicalPlate(input);

  if (!canonical) {
    return "";
  }

  const city = canonical.match(/^\d{1,2}/)?.[0] ?? "";
  const restAfterCity = canonical.slice(city.length);
  const letters = restAfterCity.match(/^[A-ZÇĞİÖŞÜ]{1,3}/)?.[0] ?? "";
  const numbers = restAfterCity.slice(letters.length);

  return [city, letters, numbers].filter(Boolean).join(" ");
}

export function formatShortDate(value: string | null) {
  if (!value) return "Belirlenmedi";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function normalizeWorkOrderStatus(status: string | null | undefined): WorkOrderStatus {
  if (status === "ready") return "ready";
  if (status === "delivered") return "delivered";
  if (status === "in_progress") return "in_progress";
  if (status === "inspection" || status === "waiting_parts" || status === "waiting_approval" || status === "testing") {
    return "in_progress";
  }
  return "received";
}

export function workOrderStatusLabel(status: WorkOrderStatus) {
  if (status === "received") return "Sırada";
  if (status === "in_progress") return "Hazırlanıyor";
  if (status === "ready") return "Hazır";
  return "Teslim edildi";
}

export function workOrderStatusTone(status: WorkOrderStatus) {
  if (status === "ready") return "bg-success/15 text-success ring-1 ring-success/25";
  if (status === "delivered") return "bg-steel/15 text-ink ring-1 ring-steel/30";
  if (status === "in_progress") return "bg-warning/20 text-warning ring-1 ring-warning/30";
  return "bg-info/15 text-info ring-1 ring-info/30";
}
