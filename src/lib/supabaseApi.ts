import type {
  AiRepairDraft,
  Motorcycle,
  PaymentEntry,
  Profile,
  Repair,
  WorkOrder,
  WorkOrderStatus
} from "../types";
import { currentUser } from "../data/mockData";
import { canonicalPlate, formatPlateDisplay, normalizeWorkOrderStatus } from "./format";
import { supabase } from "./supabase";

function mapAuthErrorMessage(error: unknown, fallback = "İşlem tamamlanamadı.") {
  const rawMessage =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  const message = rawMessage.trim();
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();

  if (lower.includes("new password should be different from the old password")) {
    return "Yeni şifre eski şifreyle aynı olamaz.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Kullanıcı adı veya şifre hatalı.";
  }
  if (lower.includes("password should be at least")) {
    return "Şifre en az 6 karakter olmalı.";
  }
  if (lower.includes("user already registered")) {
    return "Bu kullanıcı adı zaten kayıtlı.";
  }
  if (lower.includes("email not confirmed")) {
    return "E-posta doğrulaması bekleniyor.";
  }
  if (lower.includes("auth session missing")) {
    return "Oturum bilgisi bulunamadı. Lütfen yeniden giriş yap.";
  }
  if (lower.includes("same password")) {
    return "Yeni şifre eski şifreyle aynı olamaz.";
  }

  return message;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase bağlantısı hazır değil.");
  }
  return supabase;
}

function authEmailFromUsername(username: string) {
  return `${username.trim().toLowerCase()}@motorservis.local`;
}

function normalizeRepair(repair: Repair): Repair {
  const paid = repair.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = Math.max(repair.totalCost - paid, 0);
  return {
    ...repair,
    paymentStatus: remaining === 0 ? "paid" : paid > 0 ? "partial" : "unpaid"
  };
}

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    shopName: row.shop_name,
    phone: row.phone ?? ""
  };
}

function mapMotorcycle(row: any): Motorcycle {
  return {
    id: row.id,
    userId: row.user_id,
    licensePlate: formatPlateDisplay(row.license_plate),
    model: row.model,
    customerName: row.customer_name,
    phone: row.phone,
    kilometer: row.kilometer,
    notes: row.notes ?? "",
    createdAt: row.created_at
  };
}

function mapPaymentEntry(row: any): PaymentEntry {
  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    paidAt: row.paid_at,
    note: row.note ?? ""
  };
}

function mapRepair(row: any): Repair {
  const entries = Array.isArray(row.payment_entries) ? row.payment_entries.map(mapPaymentEntry) : [];
  return normalizeRepair({
    id: row.id,
    motorcycleId: row.motorcycle_id,
    userId: row.user_id,
    description: row.description,
    laborCost: Number(row.labor_cost ?? 0),
    partsCost: Number(row.parts_cost ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    kilometer: row.kilometer ?? 0,
    paymentStatus: row.payment_status,
    paymentDueDate: row.payment_due_date,
    paymentEntries: entries,
    notes: row.notes ?? "",
    createdAt: row.created_at
  });
}

function mapWorkOrder(row: any) {
  return {
    id: row.id,
    motorcycleId: row.motorcycle_id,
    userId: row.user_id,
    complaint: row.complaint,
    status: normalizeWorkOrderStatus(row.status) as WorkOrderStatus,
    estimatedDeliveryDate: row.estimated_delivery_date,
    publicTrackingToken: row.public_tracking_token,
    qrValue: row.qr_value,
    customerVisibleNote: row.customer_visible_note ?? "",
    internalNote: row.internal_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    motorcycle: row.motorcycles ? mapMotorcycle(row.motorcycles) : null,
    updates: Array.isArray(row.work_order_updates)
      ? row.work_order_updates.map((item: any) => ({
          id: item.id,
          workOrderId: item.work_order_id,
          userId: item.user_id,
          message: item.message,
          visibleToCustomer: item.visible_to_customer,
          createdAt: item.created_at
        }))
      : []
  };
}

async function getAuthUserId() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error("Oturum bulunamadı.");
  }
  return data.user.id;
}

export async function registerUser(input: {
  name: string;
  shopName: string;
  username: string;
  password: string;
}) {
  const client = requireSupabase();
  const username = input.username.trim().toLowerCase();
  const email = authEmailFromUsername(username);
  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
        name: input.name,
        shop_name: input.shopName
      }
    }
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error, "Kullanıcı oluşturulamadı."));
  }

  if (!data.user) {
    throw new Error("Kullanıcı oluşturulamadı.");
  }

  const { error: profileError } = await client.from("profiles").upsert({
    id: data.user.id,
    username,
    name: input.name,
    shop_name: input.shopName,
    phone: ""
  });

  if (profileError) {
    throw profileError;
  }

  return {
    id: data.user.id,
    username,
    name: input.name,
    shopName: input.shopName,
    phone: ""
  };
}

export async function signInUser(input: {
  username: string;
  password: string;
  rememberMe: boolean;
}) {
  const client = requireSupabase();
  const email = authEmailFromUsername(input.username);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: input.password
  });

  if (error || !data.user) {
    return { success: false, user: null };
  }

  const { data: profileRow } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  const user = profileRow
    ? mapProfile(profileRow)
    : {
        id: data.user.id,
        username: input.username.trim().toLowerCase(),
        name: (data.user.user_metadata.name as string) || "",
        shopName: (data.user.user_metadata.shop_name as string) || "",
        phone: (data.user.user_metadata.phone as string) || ""
      };

  return { success: true, user };
}

export async function signOutUser() {
  const client = requireSupabase();
  await client.auth.signOut();
}

export async function getCurrentUserProfile() {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw authError ?? new Error("Oturum bulunamadı.");
  }
  const { data, error } = await client.from("profiles").select("*").eq("id", authData.user.id).single();
  if (error || !data) {
    throw error ?? new Error("Profil bulunamadı.");
  }
  return {
    ...mapProfile(data),
    phone: data.phone ?? (authData.user.user_metadata.phone as string) ?? ""
  };
}

export async function updateCurrentUserProfile(input: {
  name: string;
  shopName: string;
  phone: string;
}) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw authError ?? new Error("Oturum bulunamadı.");
  }

  const payload = {
    name: input.name.trim(),
    shopName: input.shopName.trim(),
    phone: input.phone.trim()
  };

  const { error: metadataError } = await client.auth.updateUser({
    data: {
      name: payload.name,
      shop_name: payload.shopName,
      phone: payload.phone,
      username: authData.user.user_metadata.username
    }
  });

  if (metadataError) {
    throw new Error(mapAuthErrorMessage(metadataError, "Profil bilgileri güncellenemedi."));
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({
      name: payload.name,
      shop_name: payload.shopName,
      phone: payload.phone
    })
    .eq("id", authData.user.id);

  if (updateError) {
    const { error: fallbackError } = await client
      .from("profiles")
      .update({
        name: payload.name,
        shop_name: payload.shopName
      })
      .eq("id", authData.user.id);

    if (fallbackError) {
      throw new Error(mapAuthErrorMessage(fallbackError, "Profil bilgileri güncellenemedi."));
    }
  }

  return {
    id: authData.user.id,
    username: (authData.user.user_metadata.username as string) || "",
    name: payload.name,
    shopName: payload.shopName,
    phone: payload.phone
  };
}

export async function changeCurrentUserPassword(input: {
  currentPassword: string;
  nextPassword: string;
}) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw authError ?? new Error("Oturum bulunamadı.");
  }

  const username = (authData.user.user_metadata.username as string) || "";
  const email = authEmailFromUsername(username);

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: input.currentPassword.trim()
  });

  if (signInError) {
    throw new Error("Mevcut şifre yanlış.");
  }

  if (input.nextPassword.trim().length < 6) {
    throw new Error("Yeni şifre en az 6 karakter olmalı.");
  }

  const { error: updateError } = await client.auth.updateUser({
    password: input.nextPassword.trim()
  });

  if (updateError) {
    throw new Error(mapAuthErrorMessage(updateError, "Şifre güncellenemedi."));
  }

  return { success: true };
}

export async function fetchMotorcycles() {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client.from("motorcycles").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapMotorcycle);
}

export async function findMotorcycleByPlate(plate: string) {
  const motorcycles = await fetchMotorcycles();
  const normalized = canonicalPlate(plate);
  return motorcycles.find((item) => canonicalPlate(item.licensePlate) === normalized) ?? null;
}

export async function fetchDashboardData() {
  const motorcycles = await fetchMotorcycles();
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("repairs")
    .select("*, payment_entries(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const repairs = (data ?? []).map(mapRepair);
  const recentRepairs = repairs.filter((item) => {
    const paid = item.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(item.totalCost - paid, 0) > 0;
  }).slice(0, 10);
  const unpaidTotal = repairs.reduce((sum, item) => {
    const paid = item.paymentEntries.reduce((subtotal, entry) => subtotal + entry.amount, 0);
    return sum + Math.max(item.totalCost - paid, 0);
  }, 0);
  return { motorcycles, recentRepairs, unpaidTotal };
}

export async function fetchMotorcycleDetail(motorcycleId: string) {
  const client = requireSupabase();
  const motorcycle = await findMotorcycleById(motorcycleId);
  if (!motorcycle) {
    return { motorcycle: null, history: [], unpaidBalance: 0 };
  }
  const { data, error } = await client
    .from("repairs")
    .select("*, payment_entries(*)")
    .eq("motorcycle_id", motorcycleId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const history = (data ?? []).map(mapRepair);
  const unpaidBalance = history.reduce((sum, item) => {
    const paid = item.paymentEntries.reduce((subtotal, entry) => subtotal + entry.amount, 0);
    return sum + Math.max(item.totalCost - paid, 0);
  }, 0);
  return { motorcycle, history, unpaidBalance };
}

async function findMotorcycleById(motorcycleId: string) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("motorcycles")
    .select("*")
    .eq("id", motorcycleId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapMotorcycle(data) : null;
}

export async function fetchDebtList() {
  const motorcycles = await fetchMotorcycles();
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("repairs")
    .select("*, payment_entries(*)")
    .eq("user_id", userId);
  if (error) throw error;
  const repairs = (data ?? []).map(mapRepair);

  return motorcycles
    .map((motorcycle) => {
      const relatedRepairs = repairs.filter((item) => item.motorcycleId === motorcycle.id);
      const unpaidBalance = relatedRepairs.reduce((sum, item) => {
        const paid = item.paymentEntries.reduce((subtotal, entry) => subtotal + entry.amount, 0);
        return sum + Math.max(item.totalCost - paid, 0);
      }, 0);
      return {
        motorcycle,
        unpaidBalance,
        lastRepair: relatedRepairs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
      };
    })
    .filter((item) => item.unpaidBalance > 0)
    .sort((a, b) => b.unpaidBalance - a.unpaidBalance);
}

export async function fetchPaidRepairs() {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("repairs")
    .select("*, payment_entries(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRepair).filter((item) => {
    const paid = item.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(item.totalCost - paid, 0) === 0;
  });
}

export async function createMotorcycle(input: Omit<Motorcycle, "id" | "createdAt">) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("motorcycles")
    .insert({
      user_id: userId,
      license_plate: formatPlateDisplay(input.licensePlate),
      model: input.model,
      customer_name: input.customerName,
      phone: input.phone,
      kilometer: input.kilometer,
      notes: input.notes
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMotorcycle(data);
}

export async function createRepairDraft(motorcycleId: string, draft: AiRepairDraft): Promise<Repair> {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const labor = Number(draft.laborCost ?? 0);
  const parts = Number(draft.partsCost ?? 0);
  const total = labor + parts;
  const partialPaidAmount =
    draft.paymentStatus === "partial" && draft.paidAmount !== null ? Math.max(0, Math.min(Number(draft.paidAmount), total)) : 0;
  const { data, error } = await client
    .from("repairs")
    .insert({
      motorcycle_id: motorcycleId,
      user_id: userId,
      description: draft.description,
      labor_cost: labor,
      parts_cost: parts,
      total_cost: total,
      kilometer: Number(draft.kilometer ?? 0),
      payment_status: draft.paymentStatus ?? "unpaid",
      notes: draft.notes
    })
    .select("*")
    .single();
  if (error) throw error;

  if (draft.paymentStatus === "paid") {
    await client.from("payment_entries").insert({
      repair_id: data.id,
      user_id: userId,
      amount: total,
      paid_at: new Date().toISOString().slice(0, 10),
      note: "İşlem onayında tam ödeme alındı."
    });
  } else if (draft.paymentStatus === "partial" && partialPaidAmount > 0) {
    await client.from("payment_entries").insert({
      repair_id: data.id,
      user_id: userId,
      amount: partialPaidAmount,
      paid_at: new Date().toISOString().slice(0, 10),
      note: "İşlem onayında kısmi ödeme alındı."
    });
  }

  const detail = await fetchMotorcycleDetail(motorcycleId);
  return detail.history.find((item) => item.id === data.id)!;
}

export async function updateRepairDebt(
  repairId: string,
  input: {
    paymentStatus: Repair["paymentStatus"];
    paymentDueDate: string | null;
    notes: string;
    newPayment?: PaymentEntry | null;
  }
) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { error } = await client
    .from("repairs")
    .update({
      payment_status: input.paymentStatus,
      payment_due_date: input.paymentDueDate,
      notes: input.notes
    })
    .eq("id", repairId)
    .eq("user_id", userId);
  if (error) throw error;

  if (input.newPayment && input.newPayment.amount > 0) {
    const { error: paymentError } = await client.from("payment_entries").insert({
      repair_id: repairId,
      user_id: userId,
      amount: input.newPayment.amount,
      paid_at: input.newPayment.paidAt,
      note: input.newPayment.note
    });
    if (paymentError) throw paymentError;
  }

  const { data, error: selectError } = await client
    .from("repairs")
    .select("*, payment_entries(*)")
    .eq("id", repairId)
    .single();
  if (selectError) throw selectError;
  return mapRepair(data);
}

export async function deleteRepair(repairId: string) {
  const client = requireSupabase();
  const userId = await getAuthUserId();

  const { error: paymentDeleteError } = await client
    .from("payment_entries")
    .delete()
    .eq("repair_id", repairId)
    .eq("user_id", userId);
  if (paymentDeleteError) throw paymentDeleteError;

  const { error } = await client
    .from("repairs")
    .delete()
    .eq("id", repairId)
    .eq("user_id", userId);
  if (error) throw error;

  return { success: true };
}

export async function fetchWorkOrders() {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("work_orders")
    .select("*, motorcycles(*), work_order_updates(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWorkOrder);
}

export async function fetchServiceManagementSummary() {
  const workOrders = await fetchWorkOrders();
  return {
    totalActive: workOrders.filter((item) => item.status !== "delivered").length,
    readyCount: workOrders.filter((item) => item.status === "ready").length,
    waitingPartsCount: workOrders.filter((item) => item.status === "in_progress").length,
    deliveredToday: workOrders.filter((item) => item.status === "delivered").length,
    workOrders
  };
}

export async function createTrackingWorkOrder(motorcycleId: string) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const motorcycle = await findMotorcycleById(motorcycleId);

  if (!motorcycle) {
    throw new Error("Bu motosiklet bulunamadı.");
  }

  const { data, error } = await client
    .from("work_orders")
    .insert({
      motorcycle_id: motorcycleId,
      user_id: userId,
      complaint: "Servis takip süreci",
      status: "received",
      estimated_delivery_date: null,
      public_tracking_token: crypto.randomUUID(),
      qr_value: "",
      customer_visible_note: "",
      internal_note: ""
    })
    .select("*, motorcycles(*), work_order_updates(*)")
    .single();

  if (error) throw error;
  return mapWorkOrder(data);
}

export async function findMotorcycleByOfficialQr(qrValue: string) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("work_orders")
    .select("motorcycle_id, qr_value, motorcycles(*)")
    .eq("user_id", userId)
    .eq("qr_value", qrValue)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.motorcycles ? mapMotorcycle(data.motorcycles) : null;
}

export async function bindOfficialQrToMotorcycle(motorcycleId: string, qrValue: string) {
  const client = requireSupabase();
  const userId = await getAuthUserId();

  const { data: conflict, error: conflictError } = await client
    .from("work_orders")
    .select("id,motorcycle_id")
    .eq("user_id", userId)
    .eq("qr_value", qrValue)
    .neq("motorcycle_id", motorcycleId)
    .limit(1)
    .maybeSingle();

  if (conflictError) throw conflictError;
  if (conflict) {
    throw new Error("Bu resmi plaka QR'ı başka bir motosiklete bağlı.");
  }

  let { data: targetOrder, error: orderError } = await client
    .from("work_orders")
    .select("id")
    .eq("user_id", userId)
    .eq("motorcycle_id", motorcycleId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) throw orderError;

  if (!targetOrder) {
    const created = await createTrackingWorkOrder(motorcycleId);
    targetOrder = { id: created.id };
  }

  const { error: updateError } = await client
    .from("work_orders")
    .update({
      qr_value: qrValue,
      updated_at: new Date().toISOString()
    })
    .eq("id", targetOrder.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;
  return true;
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  input: {
    status: WorkOrderStatus;
    customerVisibleNote: string;
    internalNote: string;
    estimatedDeliveryDate: string | null;
  }
) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("work_orders")
    .update({
      status: input.status,
      customer_visible_note: input.customerVisibleNote,
      internal_note: input.internalNote,
      estimated_delivery_date: input.estimatedDeliveryDate,
      updated_at: new Date().toISOString()
    })
    .eq("id", workOrderId)
    .eq("user_id", userId)
    .select("*, motorcycles(*), work_order_updates(*)")
    .single();
  if (error) throw error;
  return mapWorkOrder(data);
}

export async function addWorkOrderUpdate(input: {
  workOrderId: string;
  message: string;
  visibleToCustomer: boolean;
}) {
  const client = requireSupabase();
  const userId = await getAuthUserId();
  const { data, error } = await client
    .from("work_order_updates")
    .insert({
      work_order_id: input.workOrderId,
      user_id: userId,
      message: input.message,
      visible_to_customer: input.visibleToCustomer
    })
    .select("*")
    .single();
  if (error) throw error;

  await client
    .from("work_orders")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.workOrderId)
    .eq("user_id", userId);

  return {
    id: data.id,
    workOrderId: data.work_order_id,
    userId: data.user_id,
    message: data.message,
    visibleToCustomer: data.visible_to_customer,
    createdAt: data.created_at
  };
}

export async function fetchSystemAdminOverview() {
  const client = requireSupabase();
  const [
    { data: profiles },
    { data: motorcycles },
    { data: repairs },
    { data: workOrders }
  ] = await Promise.all([
    client.from("profiles").select("*"),
    client.from("motorcycles").select("*"),
    client.from("repairs").select("*, payment_entries(*)"),
    client.from("work_orders").select("*")
  ]);

  const mappedRepairs = (repairs ?? []).map(mapRepair);
  const services = (profiles ?? []).map((row: any) => {
    const userRepairs = mappedRepairs.filter((item) => item.userId === row.id);
    const userOpenRepairs = userRepairs.filter((item) => {
      const paid = item.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
      return Math.max(item.totalCost - paid, 0) > 0;
    });
    const userWorkOrders = (workOrders ?? []).filter((item: any) => item.user_id === row.id);
    return {
      id: row.id,
      shopName: row.shop_name,
      ownerName: row.name,
      username: row.username,
      motorcycleCount: (motorcycles ?? []).filter((item: any) => item.user_id === row.id).length,
      activeWorkOrderCount: userWorkOrders.filter((item: any) => item.status !== "delivered").length,
      readyCount: userWorkOrders.filter((item: any) => item.status === "ready").length,
      unpaidRepairCount: userOpenRepairs.length,
      unpaidTotal: userOpenRepairs.reduce((sum, item) => {
        const paid = item.paymentEntries.reduce((subtotal, entry) => subtotal + entry.amount, 0);
        return sum + Math.max(item.totalCost - paid, 0);
      }, 0),
      subscriptionStatus: "Hazırlanıyor"
    };
  });

  return {
    systemAdmin: {
      username: "",
      displayName: ""
    },
    totals: {
      serviceCount: services.length,
      motorcycleCount: (motorcycles ?? []).length,
      activeWorkOrderCount: (workOrders ?? []).filter((item: any) => item.status !== "delivered").length,
      readyCount: (workOrders ?? []).filter((item: any) => item.status === "ready").length,
      unpaidTotal: services.reduce((sum, item) => sum + item.unpaidTotal, 0)
    },
    services
  };
}
