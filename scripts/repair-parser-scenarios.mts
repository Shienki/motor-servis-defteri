import type { AiRepairDraft } from "../src/types.ts";

export type RepairParserScenario = {
  id: string;
  transcript: string;
  expected: Partial<AiRepairDraft>;
};

export const repairParserScenarios: RepairParserScenario[] = [
  {
    id: "basic-baga",
    transcript: "Bagalar değişti, işçilik ücreti 1500, yedek parça 700, kilometre 22000.",
    expected: { description: "Bagalar değişti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "misheard-babalar",
    transcript: "Babalar değişti, işçilik ücreti 1500, yedek parça 700, kilometre 22000.",
    expected: { description: "Bagalar değişti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "debriyaj-paid",
    transcript: "Debriyaj balatası değişti, işçilik ücreti 1200, yedek parça 900, kilometre 18720, ödeme durumu ödendi.",
    expected: {
      description: "Debriyaj balatası değişti",
      laborCost: 1200,
      partsCost: 900,
      kilometer: 18720,
      paymentStatus: "paid"
    }
  },
  {
    id: "half-payment",
    transcript: "Ön takım kontrol edildi, baga değişti, işçilik 1800, yedek parça 650, ödemenin yarısı alındı.",
    expected: {
      description: "Ön takım kontrol edildi. Baga değişti",
      laborCost: 1800,
      partsCost: 650,
      paymentStatus: "partial",
      paidAmount: 1225
    }
  },
  {
    id: "peşin-kalan",
    transcript: "Keçe değişti, burç kontrol edildi, kilometre 24500, 500 peşin alındı, kalan haftaya.",
    expected: {
      description: "Keçe değişti. Burç kontrol edildi",
      kilometer: 24500,
      paymentStatus: "partial",
      paidAmount: 500
    }
  },
  {
    id: "payment-only-paid",
    transcript: "Ödeme durumu ödendi.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "paid" }
  },
  {
    id: "payment-only-unpaid",
    transcript: "Ödeme durumu ödenmedi.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "unpaid" }
  },
  {
    id: "punctuated-values",
    transcript: "İşçilik ücreti. 1500. Yedek parça ücreti. 700. Kilometre. 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "thousand-separators",
    transcript: "Bagalar değişti, işçilik ücreti 1.500, yedek parça 700, kilometre 22.000.",
    expected: { description: "Bagalar değişti", laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "yag-filter",
    transcript: "Yağ ve yağ filtresi değişti, işçilik 650, yedek parça 400, kilometre 31200.",
    expected: { description: "Yağ ve yağ filtresi değişti", laborCost: 650, partsCost: 400, kilometer: 31200 }
  },
  {
    id: "zincir-note",
    transcript: "Arka fren merkezi değişti, işçilik 900, yedek parça 400, haftaya zincir için tekrar bakılacak.",
    expected: { description: "Arka fren merkezi değişti", laborCost: 900, partsCost: 400 }
  },
  {
    id: "only-parts",
    transcript: "Yedek parça ücreti 1500 TL.",
    expected: { laborCost: null, partsCost: 1500 }
  },
  {
    id: "only-labor",
    transcript: "İşçilik ücreti 900 TL.",
    expected: { laborCost: 900, partsCost: null }
  },
  {
    id: "furc-kece",
    transcript: "Furç keçesi değişti, işçilik 850, yedek parça 300, kilometre 28000.",
    expected: { laborCost: 850, partsCost: 300, kilometer: 28000 }
  },
  {
    id: "varyator",
    transcript: "Varyatör kayışı değişti, işçilik 1000, yedek parça 1100, kilometre 19000.",
    expected: { laborCost: 1000, partsCost: 1100, kilometer: 19000 }
  },
  {
    id: "burc-misheard",
    transcript: "Burca kontrol edildi, keçe değişti, işçilik 700, yedek parça 250.",
    expected: { laborCost: 700, partsCost: 250 }
  },
  {
    id: "kapora",
    transcript: "Debriyaj merkezi değişti, işçilik 1400, yedek parça 950, kapora alındı.",
    expected: { laborCost: 1400, partsCost: 950, paymentStatus: "partial" }
  },
  {
    id: "veresiye",
    transcript: "Buji değişti, işçilik 300, yedek parça 200, veresiye yazıldı.",
    expected: { laborCost: 300, partsCost: 200, paymentStatus: "unpaid" }
  },
  {
    id: "multi-thousand",
    transcript: "Segman değişti, işçilik 2.500, yedek parça 1.250, kilometre 102.000.",
    expected: { laborCost: 2500, partsCost: 1250, kilometer: 102000 }
  },
  {
    id: "tekrar-bakilacak",
    transcript: "Balata değişti, işçilik 600, yedek parça 450, gelecek hafta amortisör için tekrar bakılacak.",
    expected: { description: "Balata değişti", laborCost: 600, partsCost: 450 }
  },
  {
    id: "usta-daginik-1",
    transcript: "Baga tarafına baktık değişti yani, işçilik 1500 tuttu, parça da 700, km 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "usta-daginik-2",
    transcript: "Debriyaj balatası değişti işte, 1200 işçilik, 900 parça, 18720 km, adam ödedi.",
    expected: { laborCost: 1200, partsCost: 900, kilometer: 18720, paymentStatus: "paid" }
  },
  {
    id: "usta-daginik-3",
    transcript: "Ön takım yaptık, baga değişti, toplamın yarısını aldık.",
    expected: { paymentStatus: "partial" }
  },
  {
    id: "usta-daginik-4",
    transcript: "Keçe burç işi yapıldı, 500 peşin verdiler, kalanı haftaya.",
    expected: { paymentStatus: "partial", paidAmount: 500 }
  },
  {
    id: "usta-daginik-5",
    transcript: "Şu debriyaj işi oldu, işçilik bin iki yüz, parça dokuz yüz, km on sekiz yedi yüz yirmi.",
    expected: {}
  },
  {
    id: "usta-belirsiz-1",
    transcript: "Parayı aldı galiba, iş tamam.",
    expected: {}
  },
  {
    id: "usta-belirsiz-2",
    transcript: "Motorun ön tarafta ses vardı, baga gibi, onu yaptık.",
    expected: {}
  },
  {
    id: "usta-belirsiz-3",
    transcript: "Parça yaz bir tane, işçiliği sonra söylerim.",
    expected: {}
  },
  {
    id: "usta-yanlis-duyma-1",
    transcript: "Babalar değişti, işçilik 1500, parça 700, km 22000.",
    expected: { laborCost: 1500, partsCost: 700, kilometer: 22000 }
  },
  {
    id: "usta-yanlis-duyma-2",
    transcript: "Kese değişti, vurç kontrol edildi, 500 peşin alındı.",
    expected: { paymentStatus: "partial", paidAmount: 500 }
  },
  {
    id: "usta-yanlis-duyma-3",
    transcript: "Furca tarafını yaptık, işçilik 850, parça 300.",
    expected: { laborCost: 850, partsCost: 300 }
  },
  {
    id: "usta-tek-odeme",
    transcript: "Sadece ödeme alındı, hesap kapandı.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "paid" }
  },
  {
    id: "usta-veresiye-kisa",
    transcript: "Yaptık ama para sonra, veresiye.",
    expected: { laborCost: 0, partsCost: 0, paymentStatus: "unpaid" }
  },
  {
    id: "usta-toplam-yarisi",
    transcript: "Debriyaj merkezi değişti, işçilik 1400, parça 600, ödemenin yarısını aldık.",
    expected: { laborCost: 1400, partsCost: 600, paymentStatus: "partial", paidAmount: 1000 }
  }
];
