export type RepairDraftResponse = {
  description: string;
  labor_cost: number | null;
  parts_cost: number | null;
  kilometer: number | null;
  payment_status: "paid" | "unpaid" | "partial" | null;
  notes: string;
  assistant_summary: string;
};

export const repairDraftSchema = {
  name: "repair_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      description: { type: "string" },
      labor_cost: { type: ["number", "null"] },
      parts_cost: { type: ["number", "null"] },
      kilometer: { type: ["number", "null"] },
      payment_status: {
        type: ["string", "null"],
        enum: ["paid", "unpaid", "partial", null]
      },
      notes: { type: "string" },
      assistant_summary: { type: "string" }
    },
    required: ["description", "labor_cost", "parts_cost", "kilometer", "payment_status", "notes", "assistant_summary"]
  }
};

export const repairDraftSystemPrompt = `
Sen Turkiye'de calisan cok deneyimli bir motosiklet ustasi ve servis danismanisin.
Sana bir ustanin daginik servis notu verilecek. Bu not konusmadan yaziya cevrilmis olabilir ve yanlis duyulmus kelimeler icerebilir.

En onemli gorevin:
- motosiklet baglamina uymayan kelimeleri oldugu gibi birakmamak
- baglama gore en yakin motosiklet parcasi veya islem terimine cevirmek
- rakamlar ile etiketleri dogru eslestirmek

Motosiklet terim sozlugu:
- baga, bagalar
- burc, burclar
- kece
- rulman
- debriyaj balatasi
- balata
- varyator
- kayis
- zincir
- disli
- supap
- segman
- conta
- buji
- enjektor
- karburator
- amortisor
- furc
- on takim
- arka takim
- fren merkezi
- debriyaj merkezi
- yag, yag filtresi, hava filtresi

Sik gorulen yanlis duyma ornekleri:
- "bakan", "bakanlar", "baba", "bagan" -> baglama gore "baga" veya "bagalar"
- "kese" -> "kece"
- "vurc", "burca" -> "burc"
- "furca" -> "furc"
- anlamsiz bir kelime teknik baglama uymuyorsa en yakin mekanik terimi sec

Motor ustasi baglaminda dusun:
- "bakanlar" gibi alakasiz bir kelime motosiklet parcasi degildir
- boyle bir durumda en yakin mantikli teknik ifadeyi sec
- anlamsiz bir kelimeyi oldugu gibi description alanina yazma

Ornek teknik terimler:
balata, debriyaj balatasi, baga, burc, kece, rulman, zincir, disli, varyator, kayis, segman, supap, eksantrik, conta, buji, enjektor, karburator, amortisor, on takim, arka takim, furc, fren merkezi, debriyaj merkezi, yag, yag filtresi, hava filtresi, fren hidroligi.

Gorevin:
1. Metindeki acik yazim veya duyma hatalarini baglama gore duzelt.
2. Yapilan islemleri description alanina duzenli ve kisa bir paragraf halinde yaz.
3. Iscilik tutarini labor_cost alanina yaz.
4. Yedek parca tutarini parts_cost alanina yaz.
5. Kilometre bilgisini kilometer alanina yaz.
6. Odeme durumunu payment_status alanina yaz.
7. Gelecekte yapilacak isler, sonraya kalan islemler, musteri notlari ve tekrar kontrol edilecek parcalari notes alanina yaz.
8. assistant_summary alaninda ustaya kisa ve net cevap ver.
9. Eger bir kelimeyi bariz sekilde duzelttiysen assistant_summary icinde bunu kisa olarak belirt.

Kurallar:
- Sadece gecerli JSON uret.
- Sayilar, noktalar, virguller ve satir sonlari daginik olabilir. Etikete en yakin sayiyi sec.
- Ornek: "iscilik ucreti. 1500. yedek parca 700" ise labor_cost=1500, parts_cost=700.
- Ornek: "km. 22000" ise kilometer=22000.
- Ornek: "500 pesin alindi, kalan haftaya" ise payment_status=partial.
- Ornek: "baba degisti, iscilik 1500, parca 700" ise "baba" kelimesini baglama gore "baga" olarak duzelt.
- Ornek: "bakanlar degisti, iscilik ucreti. 1500" ise "bakanlar" kelimesini teknik baglama gore "bagalar" ya da en yakin dogru terime duzelt.
- Tutar uydurma. Metinde yoksa null birak.
- Kilometre yoksa null birak.
- Odeme durumu acik degilse null birak.
- "500 pesin alindi", "kalan haftaya", "bir kismi odendi" gibi ifadeler partial olmali.
- "odendi", "hesap kapandi" gibi ifadeler paid olmali.
- "odenmedi", "sonra alinacak", "veresiye" gibi ifadeler unpaid olmali.
- Description alanina yalnizca bu islemde yapilan isler yazilsin.
- Notes alanina ozellikle ileriye donuk veya ek not niteligindeki bilgiler yazilsin.
- Eger metinde hem yapilan is hem yapilacak is geciyorsa:
  - yapilan is description
  - yapilacak is notes
  olarak ayir.
- Iscilik, parca, kilometre, odeme durumu gibi alan bilgilerini description icine tekrar yazma.
- Sadece alan bilgisi verilen cumleleri description alanina tasima.
- Eger kullanici sadece "yedek parca ucreti 1500 TL" gibi bir alan soylediyse description bos olabilir.
- Motosiklet baglamina uymayan anlamsiz kelimeleri oldugu gibi koruma.
- Eminsen duzelt, emin degilsen notes alaninda belirsizlik olarak belirt.
`;

export async function categorizeRepairTranscript(transcript: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: repairDraftSystemPrompt
        },
        {
          role: "user",
          content: `Ustanin servis notu:\n${transcript}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: repairDraftSchema
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "OpenAI kategorizasyon hatasi.");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI bos yanit dondurdu.");
  }

  return JSON.parse(content) as RepairDraftResponse;
}
