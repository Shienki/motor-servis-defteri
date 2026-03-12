export type PaymentStatus = "paid" | "unpaid" | "partial";

export type WorkOrderStatus =
  | "received"
  | "inspection"
  | "in_progress"
  | "waiting_parts"
  | "waiting_approval"
  | "testing"
  | "ready"
  | "delivered";

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
