import type { Motorcycle, Profile, Repair, UserAccount, WorkOrder, WorkOrderUpdate } from "../types";

export const currentUser: Profile = {
  id: "user-1",
  name: "Murat Usta",
  shopName: "Murat Motor Servis",
  username: "muratusta"
};

export const defaultUserAccount: UserAccount = {
  ...currentUser,
  password: "123456"
};

export const demoUserAccounts: UserAccount[] = [
  defaultUserAccount,
  {
    id: "user-2",
    name: "Ahmet Kaya",
    shopName: "Kaya Moto Servis",
    username: "ahmetusta",
    password: "Ahmet123."
  },
  {
    id: "user-3",
    name: "Selim Demir",
    shopName: "Demir Garage",
    username: "selimusta",
    password: "Selim123."
  },
  {
    id: "user-4",
    name: "Emre Çetin",
    shopName: "Çetin Motor Atölye",
    username: "emreusta",
    password: "Emre123."
  }
];

export const motorcycles: Motorcycle[] = [
  {
    id: "moto-1",
    userId: "user-1",
    licensePlate: "34 ABC 123",
    model: "Yamaha NMAX 155",
    customerName: "Emre Kaya",
    phone: "0532 111 22 33",
    kilometer: 18340,
    notes: "Arka fren balatası değiştiğinde zincir gergisi de kontrol edilmeli.",
    createdAt: "2026-03-01T09:15:00.000Z"
  },
  {
    id: "moto-2",
    userId: "user-1",
    licensePlate: "06 KLM 452",
    model: "Honda PCX 125",
    customerName: "Burak Yıldız",
    phone: "0544 555 66 77",
    kilometer: 27480,
    notes: "Müşteri her bakımda yağ markasını soruyor.",
    createdAt: "2026-02-20T10:20:00.000Z"
  },
  {
    id: "moto-3",
    userId: "user-1",
    licensePlate: "35 ZZ 908",
    model: "Bajaj Pulsar NS 200",
    customerName: "Hakan Demir",
    phone: "0505 888 44 11",
    kilometer: 42100,
    notes: "Akü zayıf, bir sonraki ziyarette teklif verilecek.",
    createdAt: "2026-01-12T08:00:00.000Z"
  },
  {
    id: "moto-4",
    userId: "user-1",
    licensePlate: "25 AA 25",
    model: "Honda Activa 125",
    customerName: "Serkan Acar",
    phone: "0551 341 20 19",
    kilometer: 9150,
    notes: "Şehir içi yoğun kullanım, balata hızlı bitiyor.",
    createdAt: "2026-03-10T09:40:00.000Z"
  },
  {
    id: "moto-5",
    userId: "user-1",
    licensePlate: "16 BTS 48",
    model: "Kawasaki Z250",
    customerName: "Berat Işık",
    phone: "0536 880 71 62",
    kilometer: 33120,
    notes: "Rölanti dalgalanması ara ara tekrar ediyor.",
    createdAt: "2026-03-09T11:10:00.000Z"
  },
  {
    id: "moto-6",
    userId: "user-1",
    licensePlate: "07 TR 707",
    model: "TVS Jupiter 125",
    customerName: "Tolga Çetin",
    phone: "0542 903 45 89",
    kilometer: 12870,
    notes: "Ön amortisör keçesi yakın takipte.",
    createdAt: "2026-03-08T15:05:00.000Z"
  },
  {
    id: "moto-7",
    userId: "user-1",
    licensePlate: "45 MNT 90",
    model: "Suzuki Address 110",
    customerName: "Mehmet Tunç",
    phone: "0538 220 44 52",
    kilometer: 22600,
    notes: "Kurye kullanımı var, bakım aralığı kısa tutulmalı.",
    createdAt: "2026-03-07T13:25:00.000Z"
  },
  {
    id: "moto-8",
    userId: "user-1",
    licensePlate: "41 EK 411",
    model: "Yamaha MT-25",
    customerName: "Ekin Karaca",
    phone: "0553 762 10 74",
    kilometer: 19450,
    notes: "Arka lastik yakında değişecek.",
    createdAt: "2026-03-06T10:55:00.000Z"
  },
  {
    id: "moto-9",
    userId: "user-1",
    licensePlate: "20 DNZ 20",
    model: "Mondial Drift L 125",
    customerName: "Deniz Oruç",
    phone: "0545 661 23 18",
    kilometer: 14720,
    notes: "Marş motorundan hafif ses geliyor.",
    createdAt: "2026-03-05T16:45:00.000Z"
  },
  {
    id: "moto-10",
    userId: "user-1",
    licensePlate: "10 BLK 10",
    model: "Vespa Primavera 150",
    customerName: "Burcu Elik",
    phone: "0537 109 88 41",
    kilometer: 11860,
    notes: "Müşteri yalnızca orijinal parça istiyor.",
    createdAt: "2026-03-04T12:30:00.000Z"
  },
  {
    id: "moto-11",
    userId: "user-2",
    licensePlate: "38 KYS 01",
    model: "Honda Dio 110",
    customerName: "Orhan Keskin",
    phone: "0539 401 21 87",
    kilometer: 8420,
    notes: "Kurye motoru, yağ bakımı sık geliyor.",
    createdAt: "2026-03-10T08:10:00.000Z"
  },
  {
    id: "moto-12",
    userId: "user-2",
    licensePlate: "38 AKY 44",
    model: "Yamaha RayZR 125",
    customerName: "Ali Yüce",
    phone: "0554 210 67 14",
    kilometer: 12660,
    notes: "Marşta tekleme ara ara oluyor.",
    createdAt: "2026-03-09T09:15:00.000Z"
  },
  {
    id: "moto-13",
    userId: "user-3",
    licensePlate: "26 SDM 26",
    model: "KTM Duke 250",
    customerName: "Seda Mert",
    phone: "0541 775 19 23",
    kilometer: 21430,
    notes: "Arka lastik ve zincir seti aynı dönemde değişecek.",
    createdAt: "2026-03-08T13:05:00.000Z"
  },
  {
    id: "moto-14",
    userId: "user-3",
    licensePlate: "26 DMR 77",
    model: "Suzuki Burgman 125",
    customerName: "Kemal Damar",
    phone: "0532 881 44 12",
    kilometer: 30110,
    notes: "Uzun yol öncesi tam kontrol istiyor.",
    createdAt: "2026-03-07T11:35:00.000Z"
  },
  {
    id: "moto-15",
    userId: "user-4",
    licensePlate: "01 ACT 01",
    model: "Mondial 125 Drift",
    customerName: "Tufan Aktaş",
    phone: "0553 412 88 40",
    kilometer: 17320,
    notes: "Ön fren merkezi yakın takipte.",
    createdAt: "2026-03-10T14:20:00.000Z"
  },
  {
    id: "moto-16",
    userId: "user-4",
    licensePlate: "01 EMC 99",
    model: "CFMOTO 250 NK",
    customerName: "Merve Can",
    phone: "0546 920 33 15",
    kilometer: 9620,
    notes: "Garanti dışı aksesuar takıldı, titreşim kontrolü istenecek.",
    createdAt: "2026-03-06T16:50:00.000Z"
  }
];

export const repairs: Repair[] = [
  {
    id: "rep-1",
    motorcycleId: "moto-1",
    userId: "user-1",
    description: "Motor yağı ve yağ filtresi değişimi, genel kontrol yapıldı.",
    laborCost: 450,
    partsCost: 900,
    totalCost: 1350,
    kilometer: 18340,
    paymentStatus: "paid",
    paymentDueDate: null,
    paymentEntries: [{ id: "pay-1", amount: 1350, paidAt: "2026-03-09", note: "Servis çıkışında tam ödeme alındı." }],
    notes: "Bir sonraki bakım 22000 km civarı.",
    createdAt: "2026-03-09T14:00:00.000Z"
  },
  {
    id: "rep-2",
    motorcycleId: "moto-2",
    userId: "user-1",
    description: "Varyatör temizlendi, kayış kontrol edildi, arka lastik değişti.",
    laborCost: 800,
    partsCost: 2100,
    totalCost: 2900,
    kilometer: 27480,
    paymentStatus: "partial",
    paymentDueDate: "2026-03-15",
    paymentEntries: [{ id: "pay-2", amount: 1000, paidAt: "2026-03-08", note: "İlk tahsilat servis tesliminde alındı." }],
    notes: "1000 TL ödendi, kalan ödeme pazar günü alınacak.",
    createdAt: "2026-03-08T16:30:00.000Z"
  },
  {
    id: "rep-3",
    motorcycleId: "moto-3",
    userId: "user-1",
    description: "Ön fren merkezi revizyonu ve balata değişimi yapıldı.",
    laborCost: 900,
    partsCost: 1450,
    totalCost: 2350,
    kilometer: 42100,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-18",
    paymentEntries: [],
    notes: "Müşteri maaş günü ödeme yapacak, çarşamba aranacak.",
    createdAt: "2026-03-07T11:45:00.000Z"
  },
  {
    id: "rep-4",
    motorcycleId: "moto-1",
    userId: "user-1",
    description: "Arka fren balatası değişti, zincir temizlendi ve yağlandı.",
    laborCost: 500,
    partsCost: 650,
    totalCost: 1150,
    kilometer: 17620,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-13",
    paymentEntries: [],
    notes: "Bir sonraki ziyarette arka disk kontrolü önerildi, cuma tahsilat denenecek.",
    createdAt: "2026-02-25T12:00:00.000Z"
  },
  {
    id: "rep-5",
    motorcycleId: "moto-4",
    userId: "user-1",
    description: "CVT temizliği yapıldı, ön balata değişti, şanzıman yağı yenilendi.",
    laborCost: 700,
    partsCost: 980,
    totalCost: 1680,
    kilometer: 9150,
    paymentStatus: "partial",
    paymentDueDate: "2026-03-14",
    paymentEntries: [{ id: "pay-5", amount: 800, paidAt: "2026-03-10", note: "Peşinat alındı." }],
    notes: "Kalan ödeme cuma günü alınacak.",
    createdAt: "2026-03-10T10:15:00.000Z"
  },
  {
    id: "rep-6",
    motorcycleId: "moto-5",
    userId: "user-1",
    description: "Buji takımı değişti, boğaz kelebeği temizlendi, rölanti ayarı yapıldı.",
    laborCost: 950,
    partsCost: 720,
    totalCost: 1670,
    kilometer: 33120,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-17",
    paymentEntries: [],
    notes: "Müşteri akşam uğrayıp teslim alacak.",
    createdAt: "2026-03-09T12:20:00.000Z"
  },
  {
    id: "rep-7",
    motorcycleId: "moto-6",
    userId: "user-1",
    description: "Periyodik bakım yapıldı, hava filtresi ve arka kampana temizlendi.",
    laborCost: 600,
    partsCost: 540,
    totalCost: 1140,
    kilometer: 12870,
    paymentStatus: "paid",
    paymentDueDate: null,
    paymentEntries: [{ id: "pay-7", amount: 1140, paidAt: "2026-03-08", note: "Kart ile ödeme alındı." }],
    notes: "Bir sonraki bakım 16000 km.",
    createdAt: "2026-03-08T15:40:00.000Z"
  },
  {
    id: "rep-8",
    motorcycleId: "moto-7",
    userId: "user-1",
    description: "Arka amortisör burcu değişti, yan sehpa müşürü yenilendi.",
    laborCost: 750,
    partsCost: 820,
    totalCost: 1570,
    kilometer: 22600,
    paymentStatus: "partial",
    paymentDueDate: "2026-03-16",
    paymentEntries: [{ id: "pay-8", amount: 500, paidAt: "2026-03-07", note: "Kurye çıkışında kısmi ödeme alındı." }],
    notes: "Kalan pazartesi alınacak.",
    createdAt: "2026-03-07T14:10:00.000Z"
  },
  {
    id: "rep-9",
    motorcycleId: "moto-8",
    userId: "user-1",
    description: "Ön takım kontrol edildi, zincir dişli seti değişti.",
    laborCost: 1200,
    partsCost: 3400,
    totalCost: 4600,
    kilometer: 19450,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-19",
    paymentEntries: [],
    notes: "Parça orijinal istendi, teslim sonrası havale bekleniyor.",
    createdAt: "2026-03-06T12:05:00.000Z"
  },
  {
    id: "rep-10",
    motorcycleId: "moto-9",
    userId: "user-1",
    description: "Marş rölesi değişti, akü şarj testi yapıldı.",
    laborCost: 500,
    partsCost: 780,
    totalCost: 1280,
    kilometer: 14720,
    paymentStatus: "paid",
    paymentDueDate: null,
    paymentEntries: [{ id: "pay-10", amount: 1280, paidAt: "2026-03-05", note: "Nakit tahsil edildi." }],
    notes: "Soğuk marş sorunu çözüldü.",
    createdAt: "2026-03-05T17:20:00.000Z"
  },
  {
    id: "rep-11",
    motorcycleId: "moto-10",
    userId: "user-1",
    description: "Periyodik bakım, ön disk taşlama ve fren hidroliği değişimi yapıldı.",
    laborCost: 1100,
    partsCost: 1650,
    totalCost: 2750,
    kilometer: 11860,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-20",
    paymentEntries: [],
    notes: "Müşteri şirket kartı ile hafta sonu ödeme yapacak.",
    createdAt: "2026-03-04T13:15:00.000Z"
  },
  {
    id: "rep-12",
    motorcycleId: "moto-11",
    userId: "user-2",
    description: "Yağ bakımı yapıldı, arka kampana temizlendi.",
    laborCost: 420,
    partsCost: 680,
    totalCost: 1100,
    kilometer: 8420,
    paymentStatus: "paid",
    paymentDueDate: null,
    paymentEntries: [{ id: "pay-12", amount: 1100, paidAt: "2026-03-10", note: "Teslimde tam ödeme alındı." }],
    notes: "Bir sonraki bakım 11.000 km civarı.",
    createdAt: "2026-03-10T10:00:00.000Z"
  },
  {
    id: "rep-13",
    motorcycleId: "moto-12",
    userId: "user-2",
    description: "Marş rölesi kontrol edildi, akü testi yapıldı.",
    laborCost: 500,
    partsCost: 350,
    totalCost: 850,
    kilometer: 12660,
    paymentStatus: "partial",
    paymentDueDate: "2026-03-18",
    paymentEntries: [{ id: "pay-13", amount: 300, paidAt: "2026-03-09", note: "Ön ödeme alındı." }],
    notes: "Kalan ödeme salı günü alınacak.",
    createdAt: "2026-03-09T12:10:00.000Z"
  },
  {
    id: "rep-14",
    motorcycleId: "moto-13",
    userId: "user-3",
    description: "Zincir dişli seti değişti, ön takım kontrol edildi.",
    laborCost: 1350,
    partsCost: 3200,
    totalCost: 4550,
    kilometer: 21430,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-19",
    paymentEntries: [],
    notes: "Müşteri havale ile ödeme yapacak.",
    createdAt: "2026-03-08T15:20:00.000Z"
  },
  {
    id: "rep-15",
    motorcycleId: "moto-14",
    userId: "user-3",
    description: "CVT temizliği yapıldı, ön balatalar değişti.",
    laborCost: 780,
    partsCost: 1220,
    totalCost: 2000,
    kilometer: 30110,
    paymentStatus: "paid",
    paymentDueDate: null,
    paymentEntries: [{ id: "pay-15", amount: 2000, paidAt: "2026-03-07", note: "Karttan tek çekim ödeme alındı." }],
    notes: "Uzun yol öncesi lastik basınçları ayarlandı.",
    createdAt: "2026-03-07T13:00:00.000Z"
  },
  {
    id: "rep-16",
    motorcycleId: "moto-15",
    userId: "user-4",
    description: "Ön fren merkezi revizyonu yapıldı, hidrolik yenilendi.",
    laborCost: 900,
    partsCost: 940,
    totalCost: 1840,
    kilometer: 17320,
    paymentStatus: "partial",
    paymentDueDate: "2026-03-17",
    paymentEntries: [{ id: "pay-16", amount: 700, paidAt: "2026-03-10", note: "Elden ön ödeme alındı." }],
    notes: "Kalan tahsilat teslimde tamamlanacak.",
    createdAt: "2026-03-10T16:10:00.000Z"
  },
  {
    id: "rep-17",
    motorcycleId: "moto-16",
    userId: "user-4",
    description: "Titreşim şikayeti için grenaj ve gidon bağlantıları kontrol edildi.",
    laborCost: 650,
    partsCost: 0,
    totalCost: 650,
    kilometer: 9620,
    paymentStatus: "unpaid",
    paymentDueDate: "2026-03-21",
    paymentEntries: [],
    notes: "Ek parça gerekirse müşteri aranacak.",
    createdAt: "2026-03-06T18:00:00.000Z"
  }
];

export const workOrders: WorkOrder[] = [
  {
    id: "wo-1",
    motorcycleId: "moto-2",
    userId: "user-1",
    complaint: "Arka lastikten ses geliyor, varyatör de kontrol edilecek.",
    status: "in_progress",
    estimatedDeliveryDate: "2026-03-14",
    publicTrackingToken: "track-06klm452",
    qrValue: "msd:moto-2",
    customerVisibleNote: "Parça siparişi bekleniyor.",
    internalNote: "Arka lastik ve varyatör rulmanı aynı siparişte gelecek.",
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-11T08:30:00.000Z"
  },
  {
    id: "wo-2",
    motorcycleId: "moto-4",
    userId: "user-1",
    complaint: "Periyodik bakım ve ön balata değişimi.",
    status: "ready",
    estimatedDeliveryDate: "2026-03-11",
    publicTrackingToken: "track-25aa25",
    qrValue: "msd:moto-4",
    customerVisibleNote: "İşlemler tamamlandı, teslime hazır.",
    internalNote: "Tahsilatın kalanı teslimde alınacak.",
    createdAt: "2026-03-10T09:45:00.000Z",
    updatedAt: "2026-03-11T11:10:00.000Z"
  },
  {
    id: "wo-3",
    motorcycleId: "moto-8",
    userId: "user-1",
    complaint: "Zincir dişli seti ve ön takım kontrolü.",
    status: "in_progress",
    estimatedDeliveryDate: "2026-03-12",
    publicTrackingToken: "track-41ek411",
    qrValue: "msd:moto-8",
    customerVisibleNote: "İşlem başladı, test sürüşü sonrası bilgi verilecek.",
    internalNote: "Parçalar tamam, test sürüşü bekleniyor.",
    createdAt: "2026-03-10T13:00:00.000Z",
    updatedAt: "2026-03-11T09:20:00.000Z"
  },
  {
    id: "wo-4",
    motorcycleId: "moto-10",
    userId: "user-1",
    complaint: "Periyodik bakım ve fren hidroliği değişimi.",
    status: "received",
    estimatedDeliveryDate: "2026-03-13",
    publicTrackingToken: "track-10blk10",
    qrValue: "msd:moto-10",
    customerVisibleNote: "İnceleme tamamlanıyor, net durum bildirilecek.",
    internalNote: "Ön disk de taşlanacak.",
    createdAt: "2026-03-11T08:10:00.000Z",
    updatedAt: "2026-03-11T08:10:00.000Z"
  },
  {
    id: "wo-5",
    motorcycleId: "moto-12",
    userId: "user-2",
    complaint: "Marş teklemesi ve akü zayıflığı kontrolü.",
    status: "received",
    estimatedDeliveryDate: "2026-03-12",
    publicTrackingToken: "track-38aky44",
    qrValue: "msd:moto-12",
    customerVisibleNote: "Elektrik kontrolü devam ediyor.",
    internalNote: "Akü değişimi ihtimali yüksek.",
    createdAt: "2026-03-11T09:00:00.000Z",
    updatedAt: "2026-03-11T09:15:00.000Z"
  },
  {
    id: "wo-6",
    motorcycleId: "moto-13",
    userId: "user-3",
    complaint: "Zincir sesi ve arka lastik kontrolü.",
    status: "in_progress",
    estimatedDeliveryDate: "2026-03-13",
    publicTrackingToken: "track-26sdm26",
    qrValue: "msd:moto-13",
    customerVisibleNote: "Ek parça onayı bekleniyor.",
    internalNote: "Arka dişli de değişirse fiyat artacak.",
    createdAt: "2026-03-11T10:10:00.000Z",
    updatedAt: "2026-03-11T10:30:00.000Z"
  },
  {
    id: "wo-7",
    motorcycleId: "moto-15",
    userId: "user-4",
    complaint: "Ön fren sertleşmesi ve merkez revizyonu.",
    status: "ready",
    estimatedDeliveryDate: "2026-03-11",
    publicTrackingToken: "track-01act01",
    qrValue: "msd:moto-15",
    customerVisibleNote: "İşlem tamamlandı, teslime hazır.",
    internalNote: "Kalan ödeme teslimde alınacak.",
    createdAt: "2026-03-10T15:20:00.000Z",
    updatedAt: "2026-03-11T11:20:00.000Z"
  }
];

export const workOrderUpdates: WorkOrderUpdate[] = [
  {
    id: "woup-1",
    workOrderId: "wo-1",
    userId: "user-1",
    message: "Arka lastik söküldü, uyumlu parça siparişe geçti.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T08:40:00.000Z"
  },
  {
    id: "woup-2",
    workOrderId: "wo-1",
    userId: "user-1",
    message: "Varyatör rulmanı da birlikte değişecek.",
    visibleToCustomer: false,
    createdAt: "2026-03-11T09:10:00.000Z"
  },
  {
    id: "woup-3",
    workOrderId: "wo-2",
    userId: "user-1",
    message: "Bakım tamamlandı, teslim öncesi son kontrol yapıldı.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T11:05:00.000Z"
  },
  {
    id: "woup-4",
    workOrderId: "wo-3",
    userId: "user-1",
    message: "Zincir dişli seti takıldı, test sürüşüne hazırlanıyor.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T09:25:00.000Z"
  },
  {
    id: "woup-5",
    workOrderId: "wo-4",
    userId: "user-1",
    message: "Ön disk ölçüldü, taşlama ile toparlanacak.",
    visibleToCustomer: false,
    createdAt: "2026-03-11T08:20:00.000Z"
  },
  {
    id: "woup-6",
    workOrderId: "wo-5",
    userId: "user-2",
    message: "Akü şarj testi yapıldı, ölçüm sonucu kontrol ediliyor.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T09:20:00.000Z"
  },
  {
    id: "woup-7",
    workOrderId: "wo-6",
    userId: "user-3",
    message: "Ek parça ve işçilik için müşteri onayı bekleniyor.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T10:35:00.000Z"
  },
  {
    id: "woup-8",
    workOrderId: "wo-7",
    userId: "user-4",
    message: "Ön fren merkezi toplandı, teslim öncesi son kontrol tamamlandı.",
    visibleToCustomer: true,
    createdAt: "2026-03-11T11:25:00.000Z"
  }
];
