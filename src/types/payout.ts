export type PayoutRequestStatus = "Pending" | "Processed";

export type PayoutRequestRecord = {
  id: string;
  ownerId: string;
  amount: number;
  status: PayoutRequestStatus;
  referenceNote?: string;
  requestedAt: string;
  processedAt?: string;
};

export type PayoutBalance = {
  availableBalance: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
};
