export type TripStatus =
  | "Pending"
  | "Confirmed"
  | "Active"
  | "Completed"
  | "Cancelled";

export type MockTrip = {
  id: string;
  vehicleId?: string;
  ownerId?: string;
  renterId?: string;
  title: string;
  location: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
  startDateIso?: string;
  endDateIso?: string;
  totalDays: number;
  totalAmount: number;
  ownerPayout: number;
  ownerName: string;
  renterName: string;
  accent: string;
  pickupPointId: string;
  dropoffPointId: string;
  notes: string;
  canReview?: boolean;
  canReportDamage?: boolean;
};

export type MockChatMessage = {
  id: string;
  sender: "self" | "other" | "system";
  body: string;
  time: string;
};

export type MockChat = {
  id: string;
  bookingId: string;
  participantName: string;
  participantRole: string;
  vehicle: string;
  unreadCount: number;
  lastMessage: string;
  updatedAt: string;
  blockedAttempt: boolean;
  messages: MockChatMessage[];
};

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  type: "booking" | "chat" | "payment" | "claim" | "payout";
  unread: boolean;
};

export type MockPayout = {
  id: string;
  amount: number;
  status: "Pending" | "Processed";
  requestedAt: string;
  reference?: string;
};

export type MockPickupPoint = {
  id: string;
  name: string;
  parish: string;
  address: string;
  note: string;
};

export type MockHostTask = {
  id: string;
  title: string;
  detail: string;
  tone: "primary" | "warning" | "info";
};

export type MockListing = {
  id: string;
  title: string;
  subtitle: string;
  dailyRate: number;
  status: "Draft" | "Live" | "Needs review";
  rating: number;
  accent: string;
};

export const mockTrips: MockTrip[] = [
  {
    id: "trip-axio-weekend",
    vehicleId: "vehicle-axio-weekend",
    title: "2021 Toyota Axio",
    location: "Kingston",
    status: "Active",
    startDate: "Jul 23",
    endDate: "Jul 27",
    startDateIso: "2026-07-23",
    endDateIso: "2026-07-27",
    totalDays: 4,
    totalAmount: 26400,
    ownerPayout: 21120,
    ownerName: "Ashley Bennett",
    renterName: "Matthew Tingling",
    accent: "#21D8A0",
    pickupPointId: "pickup-hwt",
    dropoffPointId: "pickup-airport-mbj",
    notes: "Pickup confirmation unlocks exact handoff details in chat.",
  },
  {
    id: "trip-vitz-request",
    vehicleId: "vehicle-vitz-request",
    title: "2019 Toyota Vitz",
    location: "Montego Bay",
    status: "Pending",
    startDate: "Jul 29",
    endDate: "Aug 2",
    startDateIso: "2026-07-29",
    endDateIso: "2026-08-02",
    totalDays: 4,
    totalAmount: 22800,
    ownerPayout: 18240,
    ownerName: "Simone Grant",
    renterName: "Matthew Tingling",
    accent: "#5EA1FF",
    pickupPointId: "pickup-mobay",
    dropoffPointId: "pickup-mobay",
    notes: "Owner approval is still pending. Chat stays open during review.",
  },
  {
    id: "trip-hiace-past",
    vehicleId: "vehicle-hiace-past",
    title: "2020 Toyota Hiace",
    location: "Ocho Rios",
    status: "Completed",
    startDate: "Jul 10",
    endDate: "Jul 13",
    startDateIso: "2026-07-10",
    endDateIso: "2026-07-13",
    totalDays: 3,
    totalAmount: 42000,
    ownerPayout: 33600,
    ownerName: "Devon Wallace",
    renterName: "Matthew Tingling",
    accent: "#F6B325",
    pickupPointId: "pickup-ochi",
    dropoffPointId: "pickup-ochi",
    notes: "This trip is complete and eligible for rating and post-trip claims.",
    canReview: true,
    canReportDamage: true,
  },
];

export const mockChats: MockChat[] = [
  {
    id: "chat-axio",
    bookingId: "trip-axio-weekend",
    participantName: "Ashley Bennett",
    participantRole: "Owner",
    vehicle: "2021 Toyota Axio",
    unreadCount: 2,
    lastMessage: "Pickup will be at the approved Half-Way Tree point.",
    updatedAt: "12m ago",
    blockedAttempt: false,
    messages: [
      {
        id: "m1",
        sender: "other",
        body: "Hi Matthew, your booking is confirmed for Thursday.",
        time: "10:02 AM",
      },
      {
        id: "m2",
        sender: "self",
        body: "Great, can you share the pickup point details inside the app?",
        time: "10:05 AM",
      },
      {
        id: "m3",
        sender: "other",
        body: "Pickup will be at the approved Half-Way Tree point.",
        time: "10:08 AM",
      },
    ],
  },
  {
    id: "chat-vitz",
    bookingId: "trip-vitz-request",
    participantName: "Simone Grant",
    participantRole: "Owner",
    vehicle: "2019 Toyota Vitz",
    unreadCount: 0,
    lastMessage: "Your contact-sharing attempt was blocked automatically.",
    updatedAt: "1h ago",
    blockedAttempt: true,
    messages: [
      {
        id: "m4",
        sender: "self",
        body: "Can you confirm the booking timing for Saturday?",
        time: "8:45 AM",
      },
      {
        id: "m5",
        sender: "system",
        body: "Phone numbers, emails, and social handles are blocked until a booking is confirmed.",
        time: "8:46 AM",
      },
      {
        id: "m6",
        sender: "other",
        body: "Yes, I’m reviewing it now and will respond in-app.",
        time: "8:48 AM",
      },
    ],
  },
];

export const mockNotifications: MockNotification[] = [
  {
    id: "notif-booking",
    title: "Booking confirmed",
    body: "Your Toyota Axio trip is confirmed for Jul 23.",
    receivedAt: "8m ago",
    type: "booking",
    unread: true,
  },
  {
    id: "notif-chat",
    title: "New chat message",
    body: "Ashley shared the approved pickup point inside your booking chat.",
    receivedAt: "12m ago",
    type: "chat",
    unread: true,
  },
  {
    id: "notif-claim",
    title: "Damage claim update",
    body: "A previous claim moved to admin review.",
    receivedAt: "Yesterday",
    type: "claim",
    unread: false,
  },
  {
    id: "notif-payout",
    title: "Payout processed",
    body: "Your last payout was marked processed with a transfer reference.",
    receivedAt: "2d ago",
    type: "payout",
    unread: false,
  },
];

export const mockPayouts: MockPayout[] = [
  {
    id: "payout-1001",
    amount: 84200,
    status: "Pending",
    requestedAt: "Jul 22, 2:40 PM",
  },
  {
    id: "payout-1000",
    amount: 56000,
    status: "Processed",
    requestedAt: "Jul 18, 11:15 AM",
    reference: "NCB-441982",
  },
  {
    id: "payout-0998",
    amount: 38800,
    status: "Processed",
    requestedAt: "Jul 8, 3:10 PM",
    reference: "JN-339107",
  },
];

export const mockPickupPoints: MockPickupPoint[] = [
  {
    id: "pickup-hwt",
    name: "Half-Way Tree Hub",
    parish: "Kingston",
    address: "Shop 12, Transport Centre, Half-Way Tree",
    note: "Shared after confirmation only. Staffed handoff window 8AM to 7PM.",
  },
  {
    id: "pickup-airport-mbj",
    name: "MBJ Airport Lot C",
    parish: "St. James",
    address: "Donald Sangster Airport, Montego Bay",
    note: "Airport pickup surcharge already included in booking total.",
  },
  {
    id: "pickup-mobay",
    name: "Fairview Pickup Point",
    parish: "St. James",
    address: "Fairview Shopping Centre, Montego Bay",
    note: "Owner confirms exact bay after trip approval.",
  },
  {
    id: "pickup-ochi",
    name: "Island Village Pickup Point",
    parish: "St. Ann",
    address: "Island Village Plaza, Ocho Rios",
    note: "Photo ID check required at handoff.",
  },
];

export const mockHostTasks: MockHostTask[] = [
  {
    id: "task-approve",
    title: "Approve 3 booking requests",
    detail: "Two Montego Bay rentals and one airport pickup are awaiting host review.",
    tone: "primary",
  },
  {
    id: "task-claim",
    title: "Review 1 damage claim",
    detail: "Owner uploaded 4 photos and requested a JMD 22,000 charge.",
    tone: "warning",
  },
  {
    id: "task-payout",
    title: "Process payout queue",
    detail: "Three payout requests are ready for manual transfer and reference notes.",
    tone: "info",
  },
];

export const mockListings: MockListing[] = [
  {
    id: "listing-axio",
    title: "2021 Toyota Axio",
    subtitle: "Kingston · Automatic · Petrol",
    dailyRate: 6600,
    status: "Live",
    rating: 4.9,
    accent: "#21D8A0",
  },
  {
    id: "listing-vitz",
    title: "2019 Toyota Vitz",
    subtitle: "Montego Bay · Automatic · Petrol",
    dailyRate: 5700,
    status: "Needs review",
    rating: 4.7,
    accent: "#5EA1FF",
  },
  {
    id: "listing-hiace",
    title: "2020 Toyota Hiace",
    subtitle: "Ocho Rios · Manual · Diesel",
    dailyRate: 14000,
    status: "Draft",
    rating: 4.8,
    accent: "#F6B325",
  },
];

export const reviewTagOptions = [
  "Clean vehicle",
  "Smooth pickup",
  "Great communication",
  "Accurate listing",
  "Would rent again",
];
