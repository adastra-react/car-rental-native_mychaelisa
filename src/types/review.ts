export type ReviewRecord = {
  id: string;
  bookingId: string;
  vehicleId: string;
  reviewerId: string;
  reviewerName?: string;
  revieweeId: string;
  rating: number;
  comment: string;
  tags: string[];
  createdAt?: string;
};

export type SubmitReviewPayload = {
  rating: number;
  comment: string;
  tags: string[];
};
