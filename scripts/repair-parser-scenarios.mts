import type { AiRepairDraft } from "../src/types.ts";

export type RepairParserScenario = {
  id: string;
  transcript: string;
  expected: Partial<AiRepairDraft>;
};

export const repairParserScenarios: RepairParserScenario[] = [
  {
    id: "basic-baga",
    transcript: "Bagalar degisti, iscilik ucreti 1500, yedek parca 700, kilometre 22000.",
    expected: { description: "bagalar degisti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "misheard-babalar",
    transcript: "Babalar degisti, iscilik ucreti 1500, yedek parca 700, kilometre 22000.",
    expected: { description: "bagalar degisti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "debriyaj-paid",
    transcript: "Debriyaj balatasi degisti, iscilik ucreti 1200, yedek parca 900, kilometre 18720, odeme durumu odendi.",
    expected: {
      description: "debriyaj balatasi degisti",
      laborCost: 1200,
      partsCost: 900,
      kilometer: 18720,
      paymentStatus: "paid"
    }
  },
  {
    id: "half-payment",
    transcript: "On takim kontrol edildi, baga degisti, iscilik 1800, yedek parca 650, odemenin yarisi alindi.",
    expected: {
      description: "on takim kontrol edildi. baga degisti",
      laborCost: 1800,
      partsCost: 650,
      paymentStatus: "partial",
      paidAmount: 1225
    }
  },
  {
    id: "peşin-kalan",
    transcript: "Kece degisti, burc kontrol edildi, kilometre 24500, 500 pesin alindi, kalan haftaya.",
    expected: {
      description: "kece degisti. burc kontrol edildi",
      kilometer: 24500,
      paymentStatus: "partial",
      paidAmount: 500
    }
  },
  {
    id: "payment-only-paid",
    transcript: "Odeme durumu odendi.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "paid" }
  },
  {
    id: "payment-only-unpaid",
    transcript: "Odeme durumu odenmedi.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "unpaid" }
  },
  {
    id: "punctuated-values",
    transcript: "Iscilik ucreti. 1500. Yedek parca ucreti. 700. Kilometre. 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "thousand-separators",
    transcript: "Bagalar degisti, iscilik ucreti 1.500, yedek parca 700, kilometre 22.000.",
    expected: { description: "bagalar degisti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "yag-filter",
    transcript: "Yag ve yag filtresi degisti, iscilik 650, yedek parca 400, kilometre 31200.",
    expected: { description: "yag ve yag filtresi degisti", laborCost: 650, partsCost: 400, kilometer: 31200 }
  },
  {
    id: "zincir-note",
    transcript: "Arka fren merkezi degisti, iscilik 900, yedek parca 400, haftaya zincir icin tekrar bakilacak.",
    expected: { description: "arka fren merkezi degisti", laborCost: 900, partsCost: 400 }
  },
  {
    id: "only-parts",
    transcript: "Yedek parca ucreti 1500 TL.",
    expected: { laborCost: null, partsCost: 1500 }
  },
  {
    id: "only-labor",
    transcript: "Iscilik ucreti 900 TL.",
    expected: { laborCost: 900, partsCost: null }
  },
  {
    id: "furc-kece",
    transcript: "Furc kecesi degisti, iscilik 850, yedek parca 300, kilometre 28000.",
    expected: { laborCost: 850, partsCost: 300, kilometer: 28000 }
  },
  {
    id: "varyator",
    transcript: "Varyator kayisi degisti, iscilik 1000, yedek parca 1100, kilometre 19000.",
    expected: { laborCost: 1000, partsCost: 1100, kilometer: 19000 }
  },
  {
    id: "burc-misheard",
    transcript: "Burca kontrol edildi, kece degisti, iscilik 700, yedek parca 250.",
    expected: { laborCost: 700, partsCost: 250 }
  },
  {
    id: "kapora",
    transcript: "Debriyaj merkezi degisti, iscilik 1400, yedek parca 950, kapora alindi.",
    expected: { laborCost: 1400, partsCost: 950, paymentStatus: "partial" }
  },
  {
    id: "veresiye",
    transcript: "Buji degisti, iscilik 300, yedek parca 200, veresiye yazildi.",
    expected: { laborCost: 300, partsCost: 200, paymentStatus: "unpaid" }
  },
  {
    id: "multi-thousand",
    transcript: "Segman degisti, iscilik 2.500, yedek parca 1.250, kilometre 102.000.",
    expected: { laborCost: 2500, partsCost: 1250, kilometer: 102000 }
  },
  {
    id: "tekrar-bakilacak",
    transcript: "Balata degisti, iscilik 600, yedek parca 450, gelecek hafta amortisor icin tekrar bakilacak.",
    expected: { description: "balata degisti", laborCost: 600, partsCost: 450 }
  },
  {
    id: "usta-daginik-1",
    transcript: "Baga tarafina baktik degisti yani, iscilik 1500 tuttu, parca da 700, km 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "usta-daginik-2",
    transcript: "Debriyaj balatasi degisti iste, 1200 iscilik, 900 parca, 18720 km, adam odedi.",
    expected: { laborCost: 1200, partsCost: 900, kilometer: 18720, paymentStatus: "paid" }
  },
  {
    id: "usta-daginik-3",
    transcript: "On takim yaptik, baga degisti, toplamin yarisini aldik.",
    expected: { paymentStatus: "partial" }
  },
  {
    id: "usta-daginik-4",
    transcript: "Kece burc isi yapildi, 500 pesin verdiler, kalani haftaya.",
    expected: { paymentStatus: "partial", paidAmount: 500 }
  },
  {
    id: "usta-daginik-5",
    transcript: "Su debriyaj isi oldu, iscilik bin iki yuz, parca dokuz yuz, km on sekiz yedi yuz yirmi.",
    expected: {}
  },
  {
    id: "usta-belirsiz-1",
    transcript: "Parayi aldi galiba, is tamam.",
    expected: {}
  },
  {
    id: "usta-belirsiz-2",
    transcript: "Motorun on tarafta ses vardi, baga gibi, onu yaptik.",
    expected: {}
  },
  {
    id: "usta-belirsiz-3",
    transcript: "Parca yaz bir tane, isciligi sonra soylerim.",
    expected: {}
  },
  {
    id: "usta-yanlis-duyma-1",
    transcript: "Babalar degisti, iscilik 1500, parca 700, km 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "usta-yanlis-duyma-2",
    transcript: "Kese degisti, vurc kontrol edildi, 500 pesin alindi.",
    expected: { paymentStatus: "partial", paidAmount: 500 }
  },
  {
    id: "usta-yanlis-duyma-3",
    transcript: "Furca tarafini yaptik, iscilik 850, parca 300.",
    expected: { laborCost: 850, partsCost: 300 }
  },
  {
    id: "usta-tek-odeme",
    transcript: "Sadece odeme alindi, hesap kapandi.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "paid" }
  },
  {
    id: "usta-veresiye-kisa",
    transcript: "Yaptik ama para sonra, veresiye.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "unpaid" }
  },
  {
    id: "usta-toplam-yarisi",
    transcript: "Debriyaj merkezi degisti, iscilik 1400, parca 600, odemenin yarisini aldik.",
    expected: { laborCost: 1400, partsCost: 600, paymentStatus: "partial", paidAmount: 1000 }
  }
];
