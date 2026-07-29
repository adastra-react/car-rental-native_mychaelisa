export type VehicleListingStatus = "draft" | "active" | "inactive";
export type VehicleCondition = "excellent" | "good" | "fair";
export type ParishCode =
  | "KIN"
  | "STA"
  | "STT"
  | "POR"
  | "SMY"
  | "SAN"
  | "TRL"
  | "SJM"
  | "HAN"
  | "WES"
  | "SEL"
  | "MAN"
  | "CLA"
  | "SCA";
export type VehicleCategory =
  | "Sedan"
  | "Coupe"
  | "SUV"
  | "Van"
  | "Truck"
  | "Bus";

export type VehiclePhoto = {
  _id?: string;
  url: string;
  public_id: string;
};

export type VehicleListing = {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerAverageRating?: number;
  ownerReviewCount?: number;
  category?: VehicleCategory;
  make: string;
  model: string;
  color: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  mileage: number;
  hasDailyLimit: boolean;
  dailyMileageLimit: number | null;
  condition: VehicleCondition;
  plate: string;
  chassis: string;
  engine: string;
  parishCode?: ParishCode | null;
  approvedPickupPointIds: string[];
  location: string;
  description: string;
  dailyRate: number;
  weeklyRate: number;
  status: VehicleListingStatus;
  blockedDates: string[];
  photos: VehiclePhoto[];
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VehicleListingPayload = Omit<
  VehicleListing,
  "id" | "ownerId" | "ownerName" | "photos" | "createdAt" | "updatedAt"
>;
