export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Active"
  | "Completed"
  | "Cancelled";

export type BookingMessageSenderRole = "system" | "owner" | "renter";
export type BookingMessageKind = "standard" | "status" | "blocked-contact";

export type BookingMessageRecord = {
  id: string;
  senderRole: BookingMessageSenderRole;
  kind: BookingMessageKind;
  body: string;
  createdAt?: string;
};

export type BookingModerationRecord = {
  blockedContactAttempts: number;
  lastBlockedContactAt?: string;
  flaggedForReview: boolean;
  flaggedForReviewAt?: string;
};

export type BookingRecord = {
  id: string;
  vehicleId: string;
  ownerId: string;
  renterId: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
  ownerPayout: number;
  pickupPointId: string;
  dropoffPointId: string;
  title: string;
  location: string;
  ownerName: string;
  renterName: string;
  notes: string;
  messages: BookingMessageRecord[];
  moderation: BookingModerationRecord;
  reviewedByMe?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBookingPayload = {
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
  ownerPayout: number;
  pickupPointId: string;
  dropoffPointId: string;
  notes: string;
};
