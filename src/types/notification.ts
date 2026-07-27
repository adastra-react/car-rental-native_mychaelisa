export type AppNotificationType =
  | "booking"
  | "chat"
  | "payment"
  | "claim"
  | "payout";

export type AppNotificationRecord = {
  id: string;
  title: string;
  body: string;
  type: AppNotificationType;
  unread: boolean;
  bookingId?: string;
  createdAt?: string;
  updatedAt?: string;
};
