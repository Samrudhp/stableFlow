export type PaymentStatus =
  | 'CREATED'
  | 'FUNDS_RESERVED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'FAILED';

export interface Wallet {
  walletId: string;
  ownerName: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
}

export interface BalanceResponse {
  walletId: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
}

export interface CreateWalletRequest {
  ownerName: string;
  currency: 'USDC';
  initialBalance: number;
}

export interface CreatePaymentRequest {
  senderWalletId: string;
  receiverWalletId: string;
  amount: number;
  currency: 'USDC';
}

export interface Payment {
  paymentId: string;
  senderWalletId: string;
  receiverWalletId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface NotificationItem {
  id: string;
  paymentId: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number | null;
  durationMs: number;
  ok: boolean;
  summary: string;
  responseBody?: unknown;
}

export interface AuthCheckResult {
  label: string;
  expected: number;
  actual: number | null;
  passed: boolean;
  detail: string;
}
