export type DamageClaimStatus =
  | "Submitted"
  | "Disputed"
  | "Approved"
  | "Rejected";

export type DamageChargeStatus = "NotTriggered" | "Triggered";

export type DamageClaimPhoto = {
  url: string;
  public_id: string;
};

export type DamageClaimRecord = {
  id: string;
  bookingId: string;
  vehicleId: string;
  ownerId: string;
  renterId: string;
  vehicleTitle: string;
  vehicleLocation: string;
  bookingStatus?: string;
  bookingStartDate?: string;
  bookingEndDate?: string;
  description: string;
  claimedAmount: number;
  photos: DamageClaimPhoto[];
  status: DamageClaimStatus;
  disputeWindowEndsAt: string;
  disputeReason?: string;
  disputedAt?: string;
  adminReviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  chargeStatus: DamageChargeStatus;
  chargeNote?: string;
  chargeTriggeredBy?: string;
  chargeTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SubmitDamageClaimPayload = {
  bookingId: string;
  description: string;
  claimedAmount: number;
};
