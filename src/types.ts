export type PaymentStatus = "paid" | "unpaid" | "partial";

export type WorkOrderStatus = "received" | "in_progress" | "ready" | "delivered";

export type PaymentEntry = {
  id: string;
  amount: number;
  paidAt: string;
  note: string;
};

export type Profile = {
  id: string;
  name: string;
  shopName: string;
  username: string;
  phone: string;
};

export type UserAccount = Profile & {
  password: string;
};

export type Motorcycle = {
  id: string;
  userId: string;
  licensePlate: string;
  model: string;
  customerName: string;
  phone: string;
  kilometer: number;
  notes: string;
  createdAt: string;
};

export type Repair = {
  id: string;
  motorcycleId: string;
  userId: string;
  description: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  kilometer: number;
  paymentStatus: PaymentStatus;
  paymentDueDate: string | null;
  paymentEntries: PaymentEntry[];
  notes: string;
  createdAt: string;
};

export type AiRepairDraft = {
  description: string;
  laborCost: number | null;
  partsCost: number | null;
  kilometer: number | null;
  paymentStatus: PaymentStatus | null;
  paidAmount: number | null;
  notes: string;
  assistantSummary?: string;
};

export type WorkOrder = {
  id: string;
  motorcycleId: string;
  userId: string;
  complaint: string;
  status: WorkOrderStatus;
  estimatedDeliveryDate: string | null;
  publicTrackingToken: string;
  qrValue: string;
  customerVisibleNote: string;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderUpdate = {
  id: string;
  workOrderId: string;
  userId: string;
  message: string;
  visibleToCustomer: boolean;
  createdAt: string;
};

export type SystemAdminOverview = {
  systemAdmin: {
    username: string;
    displayName: string;
  };
  totals: {
    serviceCount: number;
    motorcycleCount: number;
    activeWorkOrderCount: number;
    readyCount: number;
    unpaidTotal: number;
    officialQrCount: number;
    servicesWithDebtCount: number;
    servicesWithoutPhoneCount: number;
  };
  services: Array<{
    id: string;
    shopName: string;
    ownerName: string;
    username: string;
    phone: string;
    customerCount: number;
    motorcycleCount: number;
    activeWorkOrderCount: number;
    readyCount: number;
    unpaidRepairCount: number;
    unpaidTotal: number;
    subscriptionStatus: string;
    lastActivityAt: string | null;
    latestComplaint: string | null;
    latestWorkOrderStatus: WorkOrderStatus | null;
    latestMotorcycles: Array<{
      id: string;
      licensePlate: string;
      model: string;
      customerName: string;
      createdAt: string;
    }>;
    officialQrCount: number;
    officialQrBindings: Array<{
      workOrderId: string;
      motorcycleId: string;
      licensePlate: string;
      model: string;
      qrValue: string;
      updatedAt: string;
    }>;
  }>;
};
