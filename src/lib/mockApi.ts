import {
  currentUser,
  defaultUserAccount,
  demoUserAccounts,
  motorcycles as seedMotorcycles,
  repairs as seedRepairs,
  workOrderUpdates as seedWorkOrderUpdates,
  workOrders as seedWorkOrders
} from "../data/mockData";
import type {
  AiRepairDraft,
  Motorcycle,
  PaymentEntry,
  PaymentStatus,
  Profile,
  Repair,
  SystemAdminOverview,
  UserAccount,
  WorkOrder,
  WorkOrderUpdate,
  WorkOrderStatus
} from "../types";
import { integrationStatus } from "./env";
import { canonicalPlate, formatPlateDisplay, normalizeWorkOrderStatus } from "./format";
import {
  buildAssistantSummary as buildSharedAssistantSummary,
  buildLocalRepairDraft as buildSharedLocalRepairDraft,
  normalizeTranscriptForExtraction as normalizeSharedTranscriptForExtraction
} from "./repairDraftParser";
import { getAccessToken } from "./supabase";
import * as supabaseApi from "./supabaseApi";

const STORAGE_KEYS = {
  version: "motor-servis-defteri:seed-version",
  users: "motor-servis-defteri:users",
  auth: "motor-servis-defteri:auth",
  adminAuth: "motor-servis-defteri:admin-auth",
  motorcycles: "motor-servis-defteri:motorcycles",
  repairs: "motor-servis-defteri:repairs",
  workOrders: "motor-servis-defteri:work-orders",
  workOrderUpdates: "motor-servis-defteri:work-order-updates"
};

const SEED_VERSION = "2026-03-11-demo-5";

type AuthState = {
  userId: string;
  rememberMe: boolean;
};

type AdminAuthState = {
  username: string;
  displayName: string;
  rememberMe: boolean;
};

function wait(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clampText(value: unknown, max = 250) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, max);
}

function clampNumber(value: unknown, min = 0, max = 9999999) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cloneUsers() {
  return JSON.parse(JSON.stringify(demoUserAccounts)) as UserAccount[];
}

function mergeMissingDemoUsers(existingUsers: UserAccount[]) {
  const existingUsernames = new Set(existingUsers.map((item) => item.username));
  const missingUsers = cloneUsers().filter((item) => !existingUsernames.has(item.username));
  if (missingUsers.length === 0) {
    return existingUsers;
  }
  return [...existingUsers, ...missingUsers];
}

function mergeById<T extends { id: string }>(existingItems: T[], seedItems: T[]) {
  const existingIds = new Set(existingItems.map((item) => item.id));
  const missingItems = seedItems.filter((item) => !existingIds.has(item.id));
  if (missingItems.length === 0) {
    return existingItems;
  }
  return [...existingItems, ...missingItems];
}

function cloneMotorcycles() {
  return JSON.parse(JSON.stringify(seedMotorcycles)) as Motorcycle[];
}

function cloneRepairs() {
  return JSON.parse(JSON.stringify(seedRepairs)) as Repair[];
}

function cloneWorkOrders() {
  return JSON.parse(JSON.stringify(seedWorkOrders)) as WorkOrder[];
}

function cloneWorkOrderUpdates() {
  return JSON.parse(JSON.stringify(seedWorkOrderUpdates)) as WorkOrderUpdate[];
}

function sanitizeUserAccount(item: unknown): UserAccount | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Partial<UserAccount>;
  const username = clampText(value.username, 50).toLowerCase();
  const password = clampText(value.password, 120);

  if (!username || !password) {
    return null;
  }

  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    name: clampText(value.name, 80),
    shopName: clampText(value.shopName, 80),
    username,
    password,
    phone: clampText((value as { phone?: string }).phone, 30)
  };
}

function sanitizePaymentEntry(entry: unknown): PaymentEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const value = entry as Partial<PaymentEntry>;
  const amount = clampNumber(value.amount, 0, 999999);
  const paidAt =
    typeof value.paidAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.paidAt)
      ? value.paidAt
      : new Date().toISOString().slice(0, 10);

  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    amount,
    paidAt,
    note: clampText(value.note, 140)
  };
}

function sanitizeMotorcycle(item: unknown): Motorcycle | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Partial<Motorcycle>;
  const plate = formatPlateDisplay(String(value.licensePlate ?? ""));
  if (!canonicalPlate(plate)) {
    return null;
  }

  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    userId: clampText(value.userId || currentUser.id, 80),
    licensePlate: plate,
    model: clampText(value.model, 80),
    customerName: clampText(value.customerName, 80),
    phone: clampText(value.phone, 30),
    kilometer: clampNumber(value.kilometer, 0, 999999),
    notes: clampText(value.notes, 500),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  };
}

function sanitizeRepair(item: unknown): Repair | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Partial<Repair> & { paymentEntries?: unknown[] };
  const paymentEntries = Array.isArray(value.paymentEntries)
    ? value.paymentEntries.map(sanitizePaymentEntry).filter((entry): entry is PaymentEntry => Boolean(entry))
    : [];

  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    motorcycleId: clampText(value.motorcycleId, 80),
    userId: clampText(value.userId || currentUser.id, 80),
    description: clampText(value.description, 220),
    laborCost: clampNumber(value.laborCost, 0, 999999),
    partsCost: clampNumber(value.partsCost, 0, 999999),
    totalCost: clampNumber(value.totalCost, 0, 999999),
    kilometer: clampNumber(value.kilometer, 0, 999999),
    paymentStatus:
      value.paymentStatus === "paid" || value.paymentStatus === "partial" || value.paymentStatus === "unpaid"
        ? value.paymentStatus
        : "unpaid",
    paymentDueDate:
      typeof value.paymentDueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.paymentDueDate)
        ? value.paymentDueDate
        : null,
    paymentEntries,
    notes: clampText(value.notes, 500),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  };
}

function sanitizeWorkOrder(item: unknown): WorkOrder | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Partial<WorkOrder>;
  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    motorcycleId: clampText(value.motorcycleId, 80),
    userId: clampText(value.userId || currentUser.id, 80),
    complaint: clampText(value.complaint, 220),
    status: normalizeWorkOrderStatus(value.status as string) as WorkOrderStatus,
    estimatedDeliveryDate:
      typeof value.estimatedDeliveryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.estimatedDeliveryDate)
        ? value.estimatedDeliveryDate
        : null,
    publicTrackingToken: clampText(value.publicTrackingToken || crypto.randomUUID(), 120),
    qrValue: clampText(value.qrValue || "", 160),
    customerVisibleNote: clampText(value.customerVisibleNote, 220),
    internalNote: clampText(value.internalNote, 300),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

function sanitizeWorkOrderUpdate(item: unknown): WorkOrderUpdate | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Partial<WorkOrderUpdate>;
  return {
    id: clampText(value.id || crypto.randomUUID(), 80),
    workOrderId: clampText(value.workOrderId, 80),
    userId: clampText(value.userId || currentUser.id, 80),
    message: clampText(value.message, 220),
    visibleToCustomer: Boolean(value.visibleToCustomer),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  };
}

function ensureSeedData() {
  if (!isBrowser()) {
    return;
  }

  if (!integrationStatus.localFallbackEnabled) {
    throw new Error("Canlı ortamda yerel demo verisi kapalı.");
  }

  const currentVersion = window.localStorage.getItem(STORAGE_KEYS.version);
  if (currentVersion !== SEED_VERSION) {
    if (!window.localStorage.getItem(STORAGE_KEYS.users)) {
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(cloneUsers()));
    }
    if (!window.localStorage.getItem(STORAGE_KEYS.motorcycles)) {
      window.localStorage.setItem(STORAGE_KEYS.motorcycles, JSON.stringify(cloneMotorcycles()));
    }
    if (!window.localStorage.getItem(STORAGE_KEYS.repairs)) {
      window.localStorage.setItem(STORAGE_KEYS.repairs, JSON.stringify(cloneRepairs()));
    }
    if (!window.localStorage.getItem(STORAGE_KEYS.workOrders)) {
      window.localStorage.setItem(STORAGE_KEYS.workOrders, JSON.stringify(cloneWorkOrders()));
    }
    if (!window.localStorage.getItem(STORAGE_KEYS.workOrderUpdates)) {
      window.localStorage.setItem(STORAGE_KEYS.workOrderUpdates, JSON.stringify(cloneWorkOrderUpdates()));
    }
    window.localStorage.setItem(STORAGE_KEYS.version, SEED_VERSION);
    return;
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.users)) {
    window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(cloneUsers()));
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.motorcycles)) {
    window.localStorage.setItem(STORAGE_KEYS.motorcycles, JSON.stringify(cloneMotorcycles()));
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.repairs)) {
    window.localStorage.setItem(STORAGE_KEYS.repairs, JSON.stringify(cloneRepairs()));
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.workOrders)) {
    window.localStorage.setItem(STORAGE_KEYS.workOrders, JSON.stringify(cloneWorkOrders()));
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.workOrderUpdates)) {
    window.localStorage.setItem(STORAGE_KEYS.workOrderUpdates, JSON.stringify(cloneWorkOrderUpdates()));
  }
}

function readUsers() {
  if (!isBrowser()) {
    return cloneUsers();
  }

  ensureSeedData();
  const users = safeJsonParse<unknown[]>(window.localStorage.getItem(STORAGE_KEYS.users), [])
    .map(sanitizeUserAccount)
    .filter((item): item is UserAccount => Boolean(item));

  const mergedUsers = mergeMissingDemoUsers(users);
  if (mergedUsers.length !== users.length) {
    writeUsers(mergedUsers);
  }

  return mergedUsers;
}

function writeUsers(nextUsers: UserAccount[]) {
  if (!isBrowser()) {
    return;
  }

  const sanitized = nextUsers
    .map(sanitizeUserAccount)
    .filter((item): item is UserAccount => Boolean(item));
  window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(sanitized));
}

function readMotorcycles() {
  if (!isBrowser()) {
    return cloneMotorcycles();
  }

  ensureSeedData();
  const motorcycles = safeJsonParse<unknown[]>(window.localStorage.getItem(STORAGE_KEYS.motorcycles), [])
    .map(sanitizeMotorcycle)
    .filter((item): item is Motorcycle => Boolean(item));

  const mergedMotorcycles = mergeById(motorcycles, cloneMotorcycles());
  if (mergedMotorcycles.length !== motorcycles.length) {
    writeMotorcycles(mergedMotorcycles);
  }

  return mergedMotorcycles;
}

function writeMotorcycles(nextMotorcycles: Motorcycle[]) {
  if (!isBrowser()) {
    return;
  }

  const sanitized = nextMotorcycles
    .map(sanitizeMotorcycle)
    .filter((item): item is Motorcycle => Boolean(item));
  window.localStorage.setItem(STORAGE_KEYS.motorcycles, JSON.stringify(sanitized));
}

function paidAmount(repair: Repair) {
  return repair.paymentEntries.reduce((sum, entry) => sum + clampNumber(entry.amount, 0, 999999), 0);
}

function remainingAmount(repair: Repair) {
  return Math.max(repair.totalCost - paidAmount(repair), 0);
}

function normalizeRepair(repair: Repair): Repair {
  const paid = paidAmount(repair);
  const remaining = remainingAmount(repair);
  return {
    ...repair,
    paymentStatus: remaining === 0 ? "paid" : paid > 0 ? "partial" : "unpaid"
  };
}

function readRepairs() {
  if (!isBrowser()) {
    return cloneRepairs().map(normalizeRepair);
  }

  ensureSeedData();
  const repairs = safeJsonParse<unknown[]>(window.localStorage.getItem(STORAGE_KEYS.repairs), [])
    .map(sanitizeRepair)
    .filter((item): item is Repair => Boolean(item))
    .map(normalizeRepair);

  const mergedRepairs = mergeById(repairs, cloneRepairs().map(normalizeRepair));
  if (mergedRepairs.length !== repairs.length) {
    writeRepairs(mergedRepairs);
  }

  return mergedRepairs;
}

function writeRepairs(nextRepairs: Repair[]) {
  if (!isBrowser()) {
    return;
  }

  const sanitized = nextRepairs
    .map(sanitizeRepair)
    .filter((item): item is Repair => Boolean(item))
    .map(normalizeRepair);
  window.localStorage.setItem(STORAGE_KEYS.repairs, JSON.stringify(sanitized));
}

function readWorkOrders() {
  if (!isBrowser()) {
    return cloneWorkOrders();
  }

  ensureSeedData();
  const workOrders = safeJsonParse<unknown[]>(window.localStorage.getItem(STORAGE_KEYS.workOrders), [])
    .map(sanitizeWorkOrder)
    .filter((item): item is WorkOrder => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const mergedWorkOrders = mergeById(workOrders, cloneWorkOrders()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (mergedWorkOrders.length !== workOrders.length) {
    writeWorkOrders(mergedWorkOrders);
  }

  return mergedWorkOrders;
}

function writeWorkOrders(nextWorkOrders: WorkOrder[]) {
  if (!isBrowser()) {
    return;
  }

  const sanitized = nextWorkOrders
    .map(sanitizeWorkOrder)
    .filter((item): item is WorkOrder => Boolean(item));
  window.localStorage.setItem(STORAGE_KEYS.workOrders, JSON.stringify(sanitized));
}

function readWorkOrderUpdates() {
  if (!isBrowser()) {
    return cloneWorkOrderUpdates();
  }

  ensureSeedData();
  const updates = safeJsonParse<unknown[]>(window.localStorage.getItem(STORAGE_KEYS.workOrderUpdates), [])
    .map(sanitizeWorkOrderUpdate)
    .filter((item): item is WorkOrderUpdate => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const mergedUpdates = mergeById(updates, cloneWorkOrderUpdates()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (mergedUpdates.length !== updates.length) {
    writeWorkOrderUpdates(mergedUpdates);
  }

  return mergedUpdates;
}

function writeWorkOrderUpdates(nextUpdates: WorkOrderUpdate[]) {
  if (!isBrowser()) {
    return;
  }

  const sanitized = nextUpdates
    .map(sanitizeWorkOrderUpdate)
    .filter((item): item is WorkOrderUpdate => Boolean(item));
  window.localStorage.setItem(STORAGE_KEYS.workOrderUpdates, JSON.stringify(sanitized));
}

function getStoredAuth() {
  if (!isBrowser()) {
    return null;
  }

  ensureSeedData();
  return safeJsonParse<AuthState | null>(window.localStorage.getItem(STORAGE_KEYS.auth), null);
}

function writeStoredAuth(auth: AuthState | null) {
  if (!isBrowser()) {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(STORAGE_KEYS.auth);
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(auth));
}

function getStoredAdminAuth() {
  if (!isBrowser()) {
    return null;
  }

  return safeJsonParse<AdminAuthState | null>(window.localStorage.getItem(STORAGE_KEYS.adminAuth), null);
}

function writeStoredAdminAuth(auth: AdminAuthState | null) {
  if (!isBrowser()) {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(STORAGE_KEYS.adminAuth);
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.adminAuth, JSON.stringify(auth));
}

function getActiveUserAccount() {
  const users = readUsers();
  const auth = getStoredAuth();

  if (auth?.userId) {
    return users.find((item) => item.id === auth.userId) ?? defaultUserAccount;
  }

  return defaultUserAccount;
}

function getActiveUserId() {
  return getActiveUserAccount().id;
}

function toProfile(user: UserAccount): Profile {
  return {
    id: user.id,
    name: user.name,
    shopName: user.shopName,
    username: user.username,
    phone: user.phone ?? ""
  };
}

export async function getCurrentUserProfile() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.getCurrentUserProfile();
  }
  await wait(40);
  return toProfile(getActiveUserAccount());
}

export async function registerUser(input: {
  name: string;
  shopName: string;
  username: string;
  password: string;
}) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.registerUser(input);
  }
  await wait(180);
  const users = readUsers();
  const username = clampText(input.username, 50).toLowerCase();

  if (!username) {
    throw new Error("Kullanıcı adı zorunludur.");
  }

  if (users.some((item) => item.username === username)) {
    throw new Error("Bu kullanıcı adı zaten kayıtlı.");
  }

  const user: UserAccount = {
    id: crypto.randomUUID(),
    name: clampText(input.name, 80),
    shopName: clampText(input.shopName, 80),
    username,
    password: clampText(input.password, 120),
    phone: ""
  };

  writeUsers([user, ...users]);
  writeStoredAuth({ userId: user.id, rememberMe: true });
  return toProfile(user);
}

export async function signInUser(input: {
  username: string;
  password: string;
  rememberMe: boolean;
}) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.signInUser(input);
  }
  await wait(160);
  const username = clampText(input.username, 50).toLowerCase();
  const password = clampText(input.password, 120);
  const user = readUsers().find((item) => item.username === username && item.password === password) ?? null;

  if (!user) {
    return { success: false, user: null };
  }

  writeStoredAuth({ userId: user.id, rememberMe: input.rememberMe });
  return {
    success: true,
    user: toProfile(user)
  };
}

export async function signOutUser() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.signOutUser();
  }
  await wait(30);
  writeStoredAuth(null);
}

export async function updateCurrentUserProfile(input: {
  name: string;
  shopName: string;
  phone: string;
}) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.updateCurrentUserProfile(input);
  }

  await wait(140);
  const activeUserId = getActiveUserId();
  const users = readUsers();
  const nextUsers = users.map((item) =>
    item.id === activeUserId
      ? {
          ...item,
          name: clampText(input.name, 80),
          shopName: clampText(input.shopName, 80),
          phone: clampText(input.phone, 30)
        }
      : item
  );

  writeUsers(nextUsers);
  return toProfile(nextUsers.find((item) => item.id === activeUserId) ?? getActiveUserAccount());
}

export async function changeCurrentUserPassword(input: {
  currentPassword: string;
  nextPassword: string;
}) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.changeCurrentUserPassword(input);
  }

  await wait(140);
  const activeUserId = getActiveUserId();
  const users = readUsers();
  const activeUser = users.find((item) => item.id === activeUserId);

  if (!activeUser) {
    throw new Error("Aktif kullanıcı bulunamadı.");
  }

  const currentPassword = clampText(input.currentPassword, 120);
  const nextPassword = clampText(input.nextPassword, 120);

  if (activeUser.password !== currentPassword) {
    throw new Error("Mevcut şifre yanlış.");
  }

  if (nextPassword.length < 6) {
    throw new Error("Yeni şifre en az 6 karakter olmalı.");
  }

  const nextUsers = users.map((item) =>
    item.id === activeUserId
      ? {
          ...item,
          password: nextPassword
        }
      : item
  );

  writeUsers(nextUsers);
  return { success: true };
}

export function hasSystemAdminSession() {
  const session = getStoredAdminAuth();
  return Boolean(session?.username);
}

export async function signInSystemAdmin(input: {
  username: string;
  password: string;
  rememberMe: boolean;
}) {
  if (typeof window === "undefined") {
    await wait(140);
    return { success: false, error: "Yönetici girişi yalnızca tarayıcı üzerinden kullanılabilir." };
  }

  try {
    const response = await fetch(`/api/admin-login?ts=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      writeStoredAdminAuth(null);
      return {
        success: false,
        error: typeof payload?.error === "string" ? payload.error : "Y?netici giri?i ?u an kullan?lam?yor."
      };
    }

    writeStoredAdminAuth({
      username: payload.admin.username,
      displayName: payload.admin.displayName,
      rememberMe: input.rememberMe
    });
    return payload;
  } catch {
    writeStoredAdminAuth(null);
    return {
      success: false,
      error: "Y?netici giri? servisine ula??lamad?. Sayfay? yenileyip tekrar deneyin."
    };
  }
}

export async function signOutSystemAdmin() {
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/admin-logout", { method: "POST" });
    } catch {
      // noop
    }
  }
  await wait(20);
  writeStoredAdminAuth(null);
}

export async function fetchDashboardData() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchDashboardData();
  }
  await wait();
  const activeUserId = getActiveUserId();
  const motorcycles = readMotorcycles().filter((item) => item.userId === activeUserId);
  const repairs = readRepairs().filter((item) => item.userId === activeUserId);

  const recentRepairs = [...repairs]
    .filter((item) => remainingAmount(item) > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const unpaidTotal = repairs
    .filter((item) => remainingAmount(item) > 0)
    .reduce((sum, item) => sum + remainingAmount(item), 0);

  return {
    motorcycles,
    recentRepairs,
    unpaidTotal
  };
}

export async function findMotorcycleByPlate(plate: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.findMotorcycleByPlate(plate);
  }
  await wait(150);
  const motorcycles = readMotorcycles().filter((item) => item.userId === getActiveUserId());
  const normalized = canonicalPlate(plate);
  return motorcycles.find((item) => canonicalPlate(item.licensePlate) === normalized) ?? null;
}

export async function fetchMotorcycleDetail(motorcycleId: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchMotorcycleDetail(motorcycleId);
  }
  await wait();
  const activeUserId = getActiveUserId();
  const motorcycles = readMotorcycles().filter((item) => item.userId === activeUserId);
  const repairs = readRepairs().filter((item) => item.userId === activeUserId);
  const motorcycle = motorcycles.find((item) => item.id === motorcycleId) ?? null;
  const history = repairs
    .filter((item) => item.motorcycleId === motorcycleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    motorcycle,
    history,
    unpaidBalance: history
      .filter((item) => remainingAmount(item) > 0)
      .reduce((sum, item) => sum + remainingAmount(item), 0)
  };
}

export async function fetchDebtList() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchDebtList();
  }
  await wait();
  const activeUserId = getActiveUserId();
  const motorcycles = readMotorcycles().filter((item) => item.userId === activeUserId);
  const repairs = readRepairs().filter((item) => item.userId === activeUserId);

  return motorcycles
    .map((motorcycle) => {
      const relatedRepairs = repairs.filter((item) => item.motorcycleId === motorcycle.id);
      const unpaidBalance = relatedRepairs
        .filter((item) => remainingAmount(item) > 0)
        .reduce((sum, item) => sum + remainingAmount(item), 0);

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
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchPaidRepairs();
  }
  await wait();
  return readRepairs()
    .filter((item) => item.userId === getActiveUserId())
    .filter((item) => remainingAmount(item) === 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchMotorcycles() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchMotorcycles();
  }
  await wait();
  return readMotorcycles()
    .filter((item) => item.userId === getActiveUserId())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchWorkOrders() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchWorkOrders();
  }
  await wait();
  const activeUserId = getActiveUserId();
  const motorcycles = readMotorcycles().filter((item) => item.userId === activeUserId);
  const updates = readWorkOrderUpdates().filter((item) => item.userId === activeUserId);
  return readWorkOrders()
    .filter((order) => order.userId === activeUserId)
    .map((order) => ({
      ...order,
      motorcycle: motorcycles.find((item) => item.id === order.motorcycleId) ?? null,
      updates: updates.filter((item) => item.workOrderId === order.id)
    }));
}

export async function fetchServiceManagementSummary() {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.fetchServiceManagementSummary();
  }
  await wait();
  const workOrders = await fetchWorkOrders();
  return {
    totalActive: workOrders.filter((item) => item.status !== "delivered").length,
    readyCount: workOrders.filter((item) => item.status === "ready").length,
    waitingPartsCount: workOrders.filter((item) => item.status === "in_progress").length,
    deliveredToday: workOrders.filter((item) => item.status === "delivered").length,
    workOrders
  };
}

export async function fetchMotorcycleTrackingCard(motorcycleId: string) {
  if (integrationStatus.supabaseReady) {
    const [{ motorcycle, history }, workOrders] = await Promise.all([
      supabaseApi.fetchMotorcycleDetail(motorcycleId),
      supabaseApi.fetchWorkOrders()
    ]);

    if (!motorcycle) {
      return null;
    }

    const workOrder =
      workOrders
        .filter((item) => item.motorcycleId === motorcycleId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

    return {
      motorcycle,
      history,
      workOrder,
      officialQrBound: Boolean(workOrders.find((item) => item.motorcycleId === motorcycleId && item.qrValue)),
      publicTrackingPath: `/takip/plaka:${encodeURIComponent(formatPlateDisplay(motorcycle.licensePlate))}`
    };
  }

  await wait(100);
  const [{ motorcycle }, workOrders] = await Promise.all([
    fetchMotorcycleDetail(motorcycleId),
    fetchWorkOrders()
  ]);

  if (!motorcycle) {
    return null;
  }

  const workOrder =
    workOrders
      .filter((item) => item.motorcycleId === motorcycleId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

  return {
    motorcycle,
    workOrder,
    officialQrBound: Boolean(workOrders.find((item) => item.motorcycleId === motorcycleId && item.qrValue)),
    publicTrackingPath: `/takip/plaka:${encodeURIComponent(formatPlateDisplay(motorcycle.licensePlate))}`
  };
}

export async function createTrackingWorkOrder(motorcycleId: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.createTrackingWorkOrder(motorcycleId);
  }

  await wait(120);
  const activeUserId = getActiveUserId();
  const motorcycle = readMotorcycles().find((item) => item.id === motorcycleId && item.userId === activeUserId);

  if (!motorcycle) {
    throw new Error("Bu motosiklet bulunamadı.");
  }

  const nextWorkOrder = sanitizeWorkOrder({
    id: crypto.randomUUID(),
    motorcycleId,
    userId: activeUserId,
    complaint: "Servis takip sÃ¼reci",
      status: "received",
    estimatedDeliveryDate: null,
    publicTrackingToken: crypto.randomUUID(),
    qrValue: "",
    customerVisibleNote: "",
    internalNote: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (!nextWorkOrder) {
    throw new Error("İş durumu kaydı oluşturulamadı.");
  }

  writeWorkOrders([nextWorkOrder, ...readWorkOrders()]);
  return nextWorkOrder;
}

export async function fetchPublicTrackingByToken(token: string) {
  await wait(140);
  const response = await fetch(`/api/system-public-tracking?token=${encodeURIComponent(clampText(token, 120))}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchPublicTrackingByPlate(plate: string) {
  await wait(140);
  const response = await fetch(`/api/system-public-tracking?plate=${encodeURIComponent(formatPlateDisplay(plate))}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchPublicTrackingByOfficialQr(qrValue: string) {
  await wait(140);
  const response = await fetch(`/api/system-public-tracking?qr=${encodeURIComponent(qrValue)}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function findMotorcycleByOfficialQr(qrValue: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.findMotorcycleByOfficialQr(qrValue);
  }

  await wait(100);
  const activeUserId = getActiveUserId();
  const matchingOrder = readWorkOrders()
    .filter((item) => item.userId === activeUserId && item.qrValue === clampText(qrValue, 160))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!matchingOrder) {
    return null;
  }

  return readMotorcycles().find((item) => item.id === matchingOrder.motorcycleId && item.userId === activeUserId) ?? null;
}

export async function bindOfficialQrToMotorcycle(motorcycleId: string, qrValue: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.bindOfficialQrToMotorcycle(motorcycleId, qrValue);
  }

  await wait(120);
  const activeUserId = getActiveUserId();
  const safeQrValue = clampText(qrValue, 160);
  const motorcycle = readMotorcycles().find((item) => item.id === motorcycleId && item.userId === activeUserId);

  if (!motorcycle) {
    throw new Error("Bu motosiklet bulunamadı.");
  }

  const conflictingOrder = readWorkOrders().find(
    (item) => item.userId === activeUserId && item.qrValue === safeQrValue && item.motorcycleId !== motorcycleId
  );

  if (conflictingOrder) {
    throw new Error("Bu resmi plaka QR'ı başka bir motosiklete bağlı.");
  }

  let targetOrder =
    readWorkOrders()
      .filter((item) => item.userId === activeUserId && item.motorcycleId === motorcycleId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

  if (!targetOrder) {
    targetOrder = await createTrackingWorkOrder(motorcycleId);
  }

  const nextUpdatedAt = new Date().toISOString();
  const nextWorkOrders = readWorkOrders().map((item) => {
    if (item.userId !== activeUserId) {
      return item;
    }

    if (item.id === targetOrder?.id) {
      return {
        ...item,
        qrValue: safeQrValue,
        updatedAt: nextUpdatedAt
      };
    }

    if (item.motorcycleId === motorcycleId) {
      return {
        ...item,
        qrValue: ""
      };
    }

    return item;
  });

  writeWorkOrders(nextWorkOrders);
  return true;
}
export async function fetchSystemAdminOverview(): Promise<SystemAdminOverview> {
  if (integrationStatus.supabaseReady) {
    const response = await fetch(`/api/system-admin-overview?ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include"
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        writeStoredAdminAuth(null);
      }
      throw new Error(typeof payload?.error === "string" ? payload.error : "Yönetici paneli verileri alınamadı.");
    }

    return response.json();
  }
  await wait();
  const storedAdmin = getStoredAdminAuth();
  const users = readUsers();
  const motorcycles = readMotorcycles();
  const repairs = readRepairs();
  const workOrders = readWorkOrders();
  const allOfficialQrCount = workOrders.filter((item) => item.qrValue).length;

  const services = users.map((user) => {
    const userMotorcycles = motorcycles.filter((item) => item.userId === user.id);
    const userRepairs = repairs.filter((item) => item.userId === user.id);
    const userOpenRepairs = userRepairs.filter((item) => remainingAmount(item) > 0);
    const userWorkOrders = workOrders.filter((item) => item.userId === user.id);
    const latestWorkOrder = [...userWorkOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    const latestMotorcycles = [...userMotorcycles]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        licensePlate: item.licensePlate,
        model: item.model,
        customerName: item.customerName,
        createdAt: item.createdAt
      }));
    const qrBindings = userWorkOrders
      .filter((item) => item.qrValue)
      .map((item) => {
        const motorcycle = userMotorcycles.find((motorcycleItem) => motorcycleItem.id === item.motorcycleId);
        return {
          workOrderId: item.id,
          motorcycleId: item.motorcycleId,
          licensePlate: motorcycle?.licensePlate ?? "Bilinmeyen plaka",
          model: motorcycle?.model ?? "Motosiklet kaydı",
          qrValue: item.qrValue,
          updatedAt: item.updatedAt
        };
      });
    const customerCount = new Set(userMotorcycles.map((item) => `${item.customerName}|${item.phone}`).filter((item) => item !== "|"))
      .size;

    return {
      id: user.id,
      shopName: user.shopName,
      ownerName: user.name,
      username: user.username,
      phone: user.phone ?? "",
      customerCount,
      motorcycleCount: userMotorcycles.length,
      activeWorkOrderCount: userWorkOrders.filter((item) => item.status !== "delivered").length,
      readyCount: userWorkOrders.filter((item) => item.status === "ready").length,
      unpaidRepairCount: userOpenRepairs.length,
      unpaidTotal: userOpenRepairs.reduce((sum, item) => sum + remainingAmount(item), 0),
      subscriptionStatus: "Aktif",
      lastActivityAt: [latestWorkOrder?.updatedAt, latestMotorcycles[0]?.createdAt, userRepairs[0]?.createdAt]
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null,
      latestComplaint: latestWorkOrder?.complaint ?? null,
      latestWorkOrderStatus: latestWorkOrder?.status ?? null,
      latestMotorcycles,
      officialQrCount: qrBindings.length,
      officialQrBindings: qrBindings
    };
  });

  return {
    systemAdmin: {
      username: storedAdmin?.username ?? "admin",
      displayName: storedAdmin?.displayName ?? "Yönetici"
    },
    totals: {
      serviceCount: services.length,
      motorcycleCount: motorcycles.length,
      activeWorkOrderCount: workOrders.filter((item) => item.status !== "delivered").length,
      readyCount: workOrders.filter((item) => item.status === "ready").length,
      unpaidTotal: repairs.filter((item) => remainingAmount(item) > 0).reduce((sum, item) => sum + remainingAmount(item), 0),
      officialQrCount: allOfficialQrCount,
      servicesWithDebtCount: services.filter((item) => item.unpaidTotal > 0).length,
      servicesWithoutPhoneCount: services.filter((item) => !item.phone.trim()).length
    },
    services
  };
}

export async function fetchQrCenterData() {
  await wait();
  const workOrders = await fetchWorkOrders();
  return {
    workOrders: workOrders.filter((item) => item.status !== "delivered"),
    lastScannedSuggestion: workOrders[0] ?? null
  };
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
  if (integrationStatus.supabaseReady) {
    return supabaseApi.updateWorkOrderStatus(workOrderId, input);
  }
  await wait(120);
  const activeUserId = getActiveUserId();
  const nextOrders = readWorkOrders().map((order) => {
    if (order.id !== workOrderId || order.userId !== activeUserId) {
      return order;
    }

    return {
      ...order,
      status: input.status,
      customerVisibleNote: clampText(input.customerVisibleNote, 220),
      internalNote: clampText(input.internalNote, 300),
      estimatedDeliveryDate:
        input.estimatedDeliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(input.estimatedDeliveryDate)
          ? input.estimatedDeliveryDate
          : null,
      updatedAt: new Date().toISOString()
    };
  });

  writeWorkOrders(nextOrders);
  return nextOrders.find((item) => item.id === workOrderId) ?? null;
}

export async function addWorkOrderUpdate(input: {
  workOrderId: string;
  message: string;
  visibleToCustomer: boolean;
}) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.addWorkOrderUpdate(input);
  }
  await wait(100);
  const activeUserId = getActiveUserId();
  const workOrder = readWorkOrders().find((item) => item.id === input.workOrderId && item.userId === activeUserId);

  if (!workOrder) {
    throw new Error("İş emri bulunamadı.");
  }

  const nextUpdate = sanitizeWorkOrderUpdate({
    id: crypto.randomUUID(),
    workOrderId: input.workOrderId,
    userId: activeUserId,
    message: input.message,
    visibleToCustomer: input.visibleToCustomer,
    createdAt: new Date().toISOString()
  });

  if (!nextUpdate) {
    throw new Error("GÃ¼ncelleme kaydedilemedi.");
  }

  writeWorkOrderUpdates([nextUpdate, ...readWorkOrderUpdates()]);

  const nextOrders = readWorkOrders().map((item) =>
    item.id === workOrder.id
      ? {
          ...item,
          updatedAt: nextUpdate.createdAt
        }
      : item
  );
  writeWorkOrders(nextOrders);

  return nextUpdate;
}

export async function simulatePlateScan() {
  await wait(700);
  return {
    rawText: "34 abc 123",
    confidence: 0.82
  };
}

export async function simulateVoiceExtraction(): Promise<AiRepairDraft> {
  await wait(900);
  return {
    description: "Ã–n takÄ±mdan ses geliyor diye geldi. FurÃ§ takÄ±mÄ± kontrol edildi, saÄŸ keÃ§e deÄŸiÅŸti, yaÄŸ tamamlama yapÄ±ldÄ±.",
    laborCost: 950,
    partsCost: 700,
    kilometer: 18720,
    paymentStatus: "partial",
    paidAmount: 500,
    notes: "500 TL peÅŸin alÄ±ndÄ±, kalan haftaya Ã¶denecek."
  };
}

function parseTurkishNumber(rawValue: string) {
  const sanitized = rawValue.replace(/[^\d.,]/g, "").trim().replace(/[.,]+$/g, "");
  if (!sanitized) return null;

  let normalized = sanitized;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (normalized.includes(",") && !normalized.includes(".")) {
    normalized = normalized.replace(",", ".");
  } else if (/^\d+\.\d{3}$/.test(normalized) || /^\d+\.\d{3}\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeTranscriptForExtraction(transcript: string) {
  return transcript
    .replace(/\bbabalar\b/giu, "bagalar")
    .replace(/\bbakanlar\b/giu, "bagalar")
    .replace(/\bbakan\b/giu, "baga")
    .replace(/\bbaba\b/giu, "baga")
    .replace(/\bbagan\b/giu, "baga")
    .replace(/\bkese\b/giu, "kece")
    .replace(/\bvurc\b/giu, "burc")
    .replace(/\bburca\b/giu, "burc")
    .replace(/\bfurca\b/giu, "furc")
    .replace(
      /((?:iscilik|iÅŸÃ§ilik|yedek\s*parca|yedek\s*parÃ§a|parca|parÃ§a|kilometre|kilometer|km)(?:\s+ucreti|\s+Ã¼creti|\s+tutari|\s+tutarÄ±)?)\s*[.:;=-]+\s*(\d)/giu,
      "$1 $2"
    )
    .replace(/\b(\d{1,3}(?:\.\d{3})+(?:,\d+)?)\b/gu, (_, value: string) => value.replace(/\./g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumberByPatterns(transcript: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    const candidate = match?.[1] ?? match?.[2];
    if (!candidate) continue;
    const parsed = parseTurkishNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function toAsciiExtractionText(transcript: string) {
  return transcript
    .toLocaleLowerCase("tr-TR")
    .replace(/Ä±/g, "i")
    .replace(/iÅŸ/g, "is")
    .replace(/ÅŸ/g, "s")
    .replace(/Ã§/g, "c")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¶/g, "o")
    .replace(/Ã¼/g, "u");
}

function extractLabeledAmount(transcript: string, labels: string[]) {
  const source = toAsciiExtractionText(transcript);
  const alternation = labels.join("|");
  return extractNumberByPatterns(source, [
    new RegExp(`(?:${alternation})(?:\\s+ucreti|\\s+ucreti|\\s+tutari|\\s+tutari)?(?:\\s*[:=.,;-]\\s*)*(\\d[\\d.,]*)`, "i"),
    new RegExp(`(?:${alternation})\\D{0,12}?(\\d[\\d.,]*)`, "i"),
    new RegExp(`(\\d[\\d.,]*)\\s*tl\\s*(?:${alternation})`, "i")
  ]);
}

function extractKilometerValue(transcript: string) {
  const source = toAsciiExtractionText(transcript);
  const afterLabel = source.match(/(?:kilometre|kilometer|km)(?:\s*(?:de|deki))?([\s:=.,;-]*\d[\d.,\s]*)/i)?.[1] ?? "";
  const numericMatches = afterLabel.match(/\d[\d.,]*/g) ?? [];
  for (let index = numericMatches.length - 1; index >= 0; index -= 1) {
    const parsed = parseTurkishNumber(numericMatches[index]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return extractNumberByPatterns(source, [/(\d[\d.,]*)\s*(?:km|kilometre|kilometer)\b/i]);
}

function stripStructuredFieldsFromDescription(value: string) {
  return value
    .replace(
      /\b(?:iscilik|iÅŸÃ§ilik|iscilik)\b(?:\s+(?:ucreti|Ã¼creti|tutari|tutarÄ±))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/giu,
      " "
    )
    .replace(
      /\b(?:yedek\s*parca|yedek\s*parÃ§a|parca|parÃ§a)\b(?:\s+(?:ucreti|Ã¼creti|tutari|tutarÄ±))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/giu,
      " "
    )
    .replace(/\b(?:kilometre|kilometer|km)\b(?:\s*(?:de|deki))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*/giu, " ")
    .replace(/\d[\d.,]*\s*(?:km|kilometre|kilometer)\b/giu, " ")
    .replace(/\b(?:odeme|Ã¶deme)\s+durumu\b\s*(?:paid|unpaid|partial|Ã¶dendi|odendi|Ã¶denmedi|odenmedi|kÄ±smi|kismi)?/giu, " ")
    .replace(/\b(?:paid|unpaid|partial)\b/giu, " ")
    .replace(/\b\d[\d.,]*\b/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanStructuredDescription(value: string) {
  const sanitized = clampText(value, 220)
    .replace(/bagalar degisti/gi, "Bagalar deÄŸiÅŸti")
    .replace(/baga degisti/gi, "Baga deÄŸiÅŸti")
    .replace(/debriyaj balatasi/gi, "Debriyaj balatasÄ±")
    .replace(/degisti/gi, "deÄŸiÅŸti")
    .replace(/kontrol edildi/gi, "kontrol edildi")
    .replace(/yapildi/gi, "yapÄ±ldÄ±")
    .replace(/takildi/gi, "takÄ±ldÄ±")
    .replace(/\b0{2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  if (!sanitized) {
    return "";
  }

  if (!/[a-zA-ZÃ§ÄŸÄ±Ã¶ÅŸÃ¼Ã‡ÄÄ°Ã–ÅÃœ]/.test(sanitized)) {
    return "";
  }

  return sanitized;
}

function buildAssistantSummary(draft: AiRepairDraft) {
  const summaryParts = [
    draft.description ? `Islem: ${draft.description}` : null,
    draft.laborCost !== null ? `Iscilik: ${draft.laborCost} TL` : null,
    draft.partsCost !== null ? `Parca: ${draft.partsCost} TL` : null,
    draft.kilometer !== null ? `Kilometre: ${draft.kilometer}` : null,
    draft.paymentStatus ? `Odeme durumu: ${draft.paymentStatus}` : null,
    draft.notes ? `Not: ${draft.notes}` : null
  ].filter(Boolean);

  return summaryParts.length
    ? `Su sekilde kaydedilecek: ${summaryParts.join(". ")}.`
    : "AI net ayrisim yapamadi. Metni kontrol et.";
}

function inferPaymentStatus(transcript: string): PaymentStatus | null {
  const lower = transcript.toLocaleLowerCase("tr-TR");

  if (/(kismi|kÄ±smi|pesin|peÅŸin|kapora|kalan)/i.test(lower)) return "partial";
  if (/(odendi|Ã¶dendi|hesap kapandi|hesap kapandÄ±|tamamlandi|tamamlandÄ±)/i.test(lower)) return "paid";
  if (/(odenmedi|Ã¶denmedi|veresiye|sonra alinacak|sonra alÄ±nacak|haftaya alinacak|haftaya alÄ±nacak)/i.test(lower)) {
    return "unpaid";
  }

  return null;
}

function buildLocalRepairDraft(transcript: string): AiRepairDraft {
  const cleaned = normalizeTranscriptForExtraction(transcript);
  const lower = cleaned.toLocaleLowerCase("tr-TR");
  const segments = cleaned
    .split(/[.!?;,]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const laborCost = extractLabeledAmount(cleaned, ["iscilik", "iÅŸÃ§ilik"]);
  const partsCost = extractLabeledAmount(cleaned, ["yedek\\s*parca", "yedek\\s*parÃ§a", "parca", "parÃ§a"]);
  const kilometer = extractKilometerValue(cleaned);
  const paymentStatus =
    inferPaymentStatus(cleaned) ??
    (/(yarisi|yarÄ±sÄ±|yarim|yarÄ±m|kismi|kÄ±smi|pesin|peÅŸin|kapora|kalan)/i.test(lower) ? "partial" : null);
  const hasPaymentPhrase = /(odeme|Ã¶deme|odendi|Ã¶dendi|odenmedi|Ã¶denmedi|pesin|peÅŸin|kalan|yarisi|yarÄ±sÄ±|yarim|yarÄ±m)/i.test(
    lower
  );

  const noteSegments = segments.filter((segment) =>
    /(haftaya|sonra|tekrar|gelecek|kontrol edilecek|bakilacak|bakÄ±lacak|degisecek|deÄŸiÅŸecek|aranacak|haber verilecek)/i.test(
      segment
    )
  );
  const descriptionSegments = segments
    .map((segment) => stripStructuredFieldsFromDescription(segment))
    .filter(
      (segment) =>
        Boolean(segment) &&
        /(degisti|deÄŸiÅŸti|yapildi|yapÄ±ldÄ±|takildi|takÄ±ldÄ±|kontrol edildi|temizlendi|ayarlandi|ayarlandÄ±|degisen|deÄŸiÅŸen)/i.test(
          segment
        )
    );

  const draft: AiRepairDraft = {
    description: cleanStructuredDescription(descriptionSegments.join(". ")),
    laborCost,
    partsCost,
    kilometer,
    paymentStatus,
    paidAmount: null,
    notes: clampText(noteSegments.join(". "), 500),
    assistantSummary: ""
  };

  if (hasPaymentPhrase && draft.laborCost === null && draft.partsCost === null) {
    draft.laborCost = 0;
    draft.partsCost = 0;
  }

  if (paymentStatus === "partial" && /(yarisi|yarÄ±sÄ±|yarim|yarÄ±m)/i.test(lower)) {
    const total = (draft.laborCost ?? 0) + (draft.partsCost ?? 0);
    if (total > 0) {
      draft.paidAmount = Math.round(total / 2);
    }
    draft.notes = draft.notes
      ? clampText(`${draft.notes}. Toplam odemenin yarisi alindi.`, 500)
      : "Toplam odemenin yarisi alindi.";
  }

  const explicitPaidAmount = extractNumberByPatterns(cleaned, [
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:pesin|peÅŸin)\s*alindi/i,
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:alindi|alÄ±ndÄ±)/i
  ]);
  if (draft.paymentStatus === "partial" && explicitPaidAmount !== null) {
    draft.paidAmount = explicitPaidAmount;
  }

  draft.assistantSummary = buildAssistantSummary(draft);

  return draft;
}

function preserveMotorcycleTerms(sourceTranscript: string, draft: AiRepairDraft) {
  const normalizedTranscript = normalizeTranscriptForExtraction(sourceTranscript).toLocaleLowerCase("tr-TR");
  const nextDraft = { ...draft };

  if (normalizedTranscript.includes("bagalar")) {
    nextDraft.description = nextDraft.description.replace(/\bbabalar\b/gi, "bagalar");
    nextDraft.notes = nextDraft.notes.replace(/\bbabalar\b/gi, "bagalar");
  }

  if (normalizedTranscript.includes("baga")) {
    nextDraft.description = nextDraft.description.replace(/\bbaba\b/gi, "baga");
    nextDraft.notes = nextDraft.notes.replace(/\bbaba\b/gi, "baga");
  }

  if (normalizedTranscript.includes("kece")) {
    nextDraft.description = nextDraft.description.replace(/\bkese\b/gi, "kece");
    nextDraft.notes = nextDraft.notes.replace(/\bkese\b/gi, "kece");
  }

  if (normalizedTranscript.includes("burc")) {
    nextDraft.description = nextDraft.description.replace(/\bburca\b/gi, "burc").replace(/\bvurc\b/gi, "burc");
    nextDraft.notes = nextDraft.notes.replace(/\bburca\b/gi, "burc").replace(/\bvurc\b/gi, "burc");
  }

  return nextDraft;
}

export async function analyzeRepairTranscript(
  transcript = "Ã–n fren balatasÄ± deÄŸiÅŸti, iÅŸÃ§ilik 600, parÃ§a 450, kilometre 18720, 500 peÅŸin alÄ±ndÄ±."
): Promise<AiRepairDraft> {
  const cleanedTranscript = normalizeSharedTranscriptForExtraction(transcript);
  const localDraft = buildSharedLocalRepairDraft(cleanedTranscript);

  if (!cleanedTranscript) {
    return {
      description: "",
      laborCost: null,
      partsCost: null,
      kilometer: null,
      paymentStatus: null,
      paidAmount: null,
      notes: "",
      assistantSummary: "Metin bulunamadi."
    };
  }

  if (typeof window === "undefined") {
    return localDraft;
  }

  try {
    const authToken = await getAccessToken();
    const response = await fetch("/api/repair-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken
          ? {
              Authorization: `Bearer ${authToken}`
            }
          : {})
      },
      body: JSON.stringify({ transcript: cleanedTranscript })
    });

    if (!response.ok) {
      throw new Error("AI servisi hazÄ±r deÄŸil.");
    }

    const parsed = (await response.json()) as {
      description?: string;
      labor_cost?: number | null;
      parts_cost?: number | null;
      kilometer?: number | null;
      payment_status?: "paid" | "unpaid" | "partial" | null;
      notes?: string;
      assistant_summary?: string;
    };

    const aiDraft = preserveMotorcycleTerms(cleanedTranscript, {
      description: cleanStructuredDescription(parsed.description ?? ""),
      laborCost: parsed.labor_cost ?? null,
      partsCost: parsed.parts_cost ?? null,
      kilometer: parsed.kilometer ?? null,
      paymentStatus: parsed.payment_status ?? null,
      paidAmount: null,
      notes: clampText(parsed.notes, 500),
      assistantSummary: clampText(parsed.assistant_summary, 500)
    });

    const mergedDraft: AiRepairDraft = preserveMotorcycleTerms(cleanedTranscript, {
      description: localDraft.description || stripStructuredFieldsFromDescription(aiDraft.description),
      laborCost: localDraft.laborCost ?? aiDraft.laborCost ?? null,
      partsCost: localDraft.partsCost ?? aiDraft.partsCost ?? null,
      kilometer: localDraft.kilometer ?? aiDraft.kilometer ?? null,
      paymentStatus: localDraft.paymentStatus ?? aiDraft.paymentStatus ?? null,
      paidAmount: localDraft.paidAmount ?? aiDraft.paidAmount ?? null,
      notes: localDraft.notes || aiDraft.notes,
      assistantSummary: aiDraft.assistantSummary || ""
    });

    mergedDraft.description = cleanStructuredDescription(mergedDraft.description);
    mergedDraft.assistantSummary = mergedDraft.assistantSummary || buildSharedAssistantSummary(mergedDraft);

    if (!mergedDraft.description && localDraft.description) {
      mergedDraft.description = localDraft.description;
    }

    return mergedDraft;
  } catch {
    return localDraft;
  }
}

export async function createRepairDraft(motorcycleId: string, draft: AiRepairDraft): Promise<Repair> {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.createRepairDraft(motorcycleId, draft);
  }
  await wait(200);
  const activeUserId = getActiveUserId();
  const repairs = readRepairs();
  const motorcycle = readMotorcycles().find((item) => item.id === motorcycleId && item.userId === activeUserId);

  if (!motorcycle) {
    throw new Error("Bu motosiklete iÅŸlem ekleme yetkin yok.");
  }

  const safeLabor = clampNumber(draft.laborCost, 0, 999999);
  const safeParts = clampNumber(draft.partsCost, 0, 999999);
  const totalCost = safeLabor + safeParts;
  const safePaidAmount =
    draft.paymentStatus === "partial" && draft.paidAmount !== null ? clampNumber(draft.paidAmount, 0, totalCost) : 0;

  const initialPaymentEntries: PaymentEntry[] =
    draft.paymentStatus === "paid"
      ? [
          {
            id: crypto.randomUUID(),
            amount: totalCost,
            paidAt: new Date().toISOString().slice(0, 10),
            note: "İşlem onayında tam ödeme alındı."
          }
        ]
      : draft.paymentStatus === "partial" && safePaidAmount > 0
        ? [
            {
              id: crypto.randomUUID(),
              amount: safePaidAmount,
              paidAt: new Date().toISOString().slice(0, 10),
              note: "İşlem onayında kısmi ödeme alındı."
            }
          ]
      : [];

  const nextRepair: Repair = normalizeRepair({
    id: crypto.randomUUID(),
    motorcycleId: clampText(motorcycleId, 80),
    userId: activeUserId,
    description: clampText(draft.description, 220),
    laborCost: safeLabor,
    partsCost: safeParts,
    totalCost,
    kilometer: clampNumber(draft.kilometer, 0, 999999),
    paymentStatus: draft.paymentStatus ?? "unpaid",
    paymentDueDate: null,
    paymentEntries: initialPaymentEntries,
    notes: clampText(draft.notes, 500),
    createdAt: new Date().toISOString()
  });

  writeRepairs([nextRepair, ...repairs]);
  return nextRepair;
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
  if (integrationStatus.supabaseReady) {
    return supabaseApi.updateRepairDebt(repairId, input);
  }
  await wait(150);
  const activeUserId = getActiveUserId();
  const repairs = readRepairs();
  const nextRepairs = repairs.map((repair) => {
    if (repair.id !== repairId || repair.userId !== activeUserId) {
      return repair;
    }

    const safePayment =
      input.newPayment && clampNumber(input.newPayment.amount, 0, 999999) > 0
        ? sanitizePaymentEntry(input.newPayment)
        : null;

    const paymentEntries = safePayment ? [...repair.paymentEntries, safePayment] : repair.paymentEntries;
    return normalizeRepair({
      ...repair,
      paymentEntries,
      paymentStatus: input.paymentStatus,
      paymentDueDate:
        input.paymentDueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.paymentDueDate) ? input.paymentDueDate : null,
      notes: clampText(input.notes, 500)
    });
  });

  writeRepairs(nextRepairs);
  return nextRepairs.find((item) => item.id === repairId) ?? null;
}

export async function deleteRepair(repairId: string) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.deleteRepair(repairId);
  }

  await wait(150);
  const activeUserId = getActiveUserId();
  const repairs = readRepairs();
  const nextRepairs = repairs.filter((repair) => !(repair.id === repairId && repair.userId === activeUserId));
  writeRepairs(nextRepairs);
  return { success: true };
}

export async function createMotorcycle(input: Omit<Motorcycle, "id" | "createdAt">) {
  if (integrationStatus.supabaseReady) {
    return supabaseApi.createMotorcycle(input);
  }
  await wait(250);
  const activeUserId = getActiveUserId();
  const motorcycles = readMotorcycles();
  const formattedPlate = formatPlateDisplay(input.licensePlate);
  const canonical = canonicalPlate(formattedPlate);

  if (!canonical) {
    throw new Error("GeÃ§ersiz plaka.");
  }

  if (motorcycles.some((item) => item.userId === activeUserId && canonicalPlate(item.licensePlate) === canonical)) {
    throw new Error("Bu plaka zaten kayıtlı.");
  }

  const nextMotorcycle = sanitizeMotorcycle({
    ...input,
    userId: activeUserId,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    licensePlate: formattedPlate,
    model: clampText(input.model, 80),
    customerName: clampText(input.customerName, 80),
    phone: clampText(input.phone, 30),
    kilometer: clampNumber(input.kilometer, 0, 999999),
    notes: clampText(input.notes, 500)
  });

  if (!nextMotorcycle) {
    throw new Error("Motosiklet kaydı oluşturulamadı.");
  }

  writeMotorcycles([nextMotorcycle, ...motorcycles]);
  return nextMotorcycle;
}

