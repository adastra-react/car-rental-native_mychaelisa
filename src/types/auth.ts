export type UserRole = "Owner" | "Renter" | "Admin";
export type LicenseVerificationStatus = "pending" | "verified" | "rejected";

export type UploadedDocument = {
  _id?: string;
  url: string;
  public_id: string;
  label?: string;
};

export type UploadedLicense = {
  url: string;
  public_id: string;
  status: LicenseVerificationStatus;
  rejectionReason?: string;
  reviewedAt?: string;
};

export type NotificationPreferences = {
  bookingUpdates: boolean;
  chatMessages: boolean;
  paymentAndClaims: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  bio: string;
  license: UploadedLicense | null;
  documents: UploadedDocument[];
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
