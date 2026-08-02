import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppMode, BottomNav } from "../components/BottomNav";
import { createSocket, disconnectSocket } from "../components/socket";
import {
  createBooking,
  fetchMyBookings,
  sendBookingMessage,
  updateBookingStatus,
} from "../services/bookings";
import {
  disputeDamageClaim,
  fetchDamageClaims,
  reviewDamageClaim,
  submitDamageClaim,
  triggerDamageClaimCharge,
} from "../services/damageClaims";
import {
  fetchNotifications,
  markAllNotificationsRead,
  registerPushToken as registerPushTokenOnServer,
  saveNotificationPreferences,
  sendTestNotification,
  unregisterPushToken as unregisterPushTokenOnServer,
} from "../services/notifications";
import { fetchMyPayouts, requestPayout } from "../services/payouts";
import { fetchPickupPoints } from "../services/pickupPoints";
import { fetchVehicleReviews, submitReview } from "../services/reviews";
import {
  Notifications,
  scheduleLocalDemoNotificationAsync,
  registerForPushNotificationsAsync,
} from "../services/pushNotifications";
import {
  MockChat,
  MockListing,
  MockNotification,
  MockPickupPoint,
  MockTrip,
  mockListings,
  mockPickupPoints,
  mockTrips,
  reviewTagOptions,
} from "../data/mockAppData";
import {
  formatPickupPointFullLocation,
  getApprovedPickupPointIdsForListing,
  getApprovedPickupPointsForListing,
  getDefaultApprovedPickupPointIds,
  getPickupPointById,
  getPickupPointRevealCopy,
  hydratePickupPointsCatalog,
  KINGSTON_AIRPORT_PICKUP_POINT_ID,
  MBJ_AIRPORT_PICKUP_POINT_ID,
} from "../data/pickupPoints";
import { fetchCurrentUser, UploadAsset } from "../services/auth";
import {
  createVehicleListing,
  deleteVehiclePhoto,
  fetchPublicListings,
  fetchMyListings,
  updateVehicleListing,
  updateVehicleListingStatus,
  uploadVehiclePhotos,
} from "../services/vehicles";
import { signOut, updateUser } from "../store/authSlice";
import { AppDispatch, RootState } from "../store";
import {
  AuthUser,
  LicenseVerificationStatus,
  NotificationPreferences,
} from "../types/auth";
import { BookingRecord } from "../types/booking";
import { DamageClaimRecord } from "../types/damageClaim";
import { AppNotificationRecord } from "../types/notification";
import { PayoutBalance, PayoutRequestRecord } from "../types/payout";
import { ReviewRecord } from "../types/review";
import {
  ParishCode,
  VehicleCategory,
  VehicleListing,
  VehicleListingPayload,
} from "../types/vehicle";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { isProfileComplete } from "../utils/profile";
import { pickUploadAssets } from "../utils/uploadPicker";
import { DamageClaimScreen } from "../features/damage-claims/DamageClaimScreen";
import { AdminDamageClaimsScreen } from "../features/damage-claims/AdminDamageClaimsScreen";
import { canDisputeDamageClaim as canUserDisputeDamageClaim } from "../features/damage-claims/helpers";
import { ExploreScreen } from "./home-shell/ExploreScreen";
import { RenterHomeScreen } from "./home-shell/RenterHomeScreen";
import {
  PageHeader,
  PrimaryAction,
  SecondaryAction,
  StatusChip,
} from "./home-shell/discoveryComponents";
import {
  getBrowseListingAccent,
  getHomeVehicleCategory,
  getListingCategoryLabel,
  getListingRating,
  getListingRatingCount,
  getListingTitle,
  getListingYear,
} from "./home-shell/discoveryHelpers";
import {
  getListingParish,
  getParishCodeFromLabel,
  getParishLabelFromCode,
  jamaicaParishOptions,
} from "./home-shell/location";

const palette = colors.dark;

type RenterTab = "home" | "explore" | "trips" | "messages" | "profile";
type HostTab = "dashboard" | "listings" | "calendar" | "messages" | "profile";
type OverlayScreen =
  | "personal-information"
  | "license-viewer"
  | "payments"
  | "browse-vehicle"
  | "vehicle-details"
  | "booking-start"
  | "booking-detail"
  | "booking-request"
  | "chat-thread"
  | "pickup-points"
  | "pickup-point-network"
  | "damage-report"
  | "review"
  | "payouts"
  | "notifications"
  | "admin-preview"
  | "admin-damage-claims"
  | null;
type VehicleCondition = "excellent" | "good" | "fair" | null;
type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "default";

type SavedPaymentMethod = {
  id: string;
  brand: string;
  cardholderName: string;
  expiry: string;
  last4: string;
  nickname?: string;
};

type NotificationSettings = NotificationPreferences;

type PickupSelection = {
  pickupId: string;
  dropoffId: string;
};

const transmissionOptions = ["Automatic", "Manual"] as const;
const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric"] as const;
const vehicleCategoryOptions = [
  "Sedan",
  "Coupe",
  "SUV",
  "Van",
  "Truck",
  "Bus",
] as const;
const TODAY_ISO = getTodayIso();

export function HomeShell() {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [mode, setMode] = useState<AppMode>("renter");
  const [renterTab, setRenterTab] = useState<RenterTab>("home");
  const [hostTab, setHostTab] = useState<HostTab>("dashboard");
  const [overlay, setOverlay] = useState<OverlayScreen>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    SavedPaymentMethod[]
  >([]);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [trips, setTrips] = useState<MockTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [damageClaims, setDamageClaims] = useState<DamageClaimRecord[]>([]);
  const [damageClaimsLoading, setDamageClaimsLoading] = useState(false);
  const [damageClaimsError, setDamageClaimsError] = useState<string | null>(
    null,
  );
  const [payouts, setPayouts] = useState<PayoutRequestRecord[]>([]);
  const [payoutsBalance, setPayoutsBalance] = useState<PayoutBalance>({
    availableBalance: 0,
    lifetimeEarned: 0,
    lifetimePaidOut: 0,
  });
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [chats, setChats] = useState<MockChat[]>([]);
  const [registeredPushToken, setRegisteredPushToken] = useState<string | null>(
    null,
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      bookingUpdates: true,
      chatMessages: true,
      paymentAndClaims: true,
    });
  const [selectedTripId, setSelectedTripId] = useState(mockTrips[0].id);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [selectedBrowseVehicleId, setSelectedBrowseVehicleId] = useState<
    string | null
  >(null);
  const [hostListings, setHostListings] = useState<VehicleListing[]>([]);
  const [hostListingsLoading, setHostListingsLoading] = useState(false);
  const [hostListingsError, setHostListingsError] = useState<string | null>(
    null,
  );
  const [publicListings, setPublicListings] = useState<VehicleListing[]>([]);
  const [publicListingsLoading, setPublicListingsLoading] = useState(false);
  const [publicListingsError, setPublicListingsError] = useState<string | null>(
    null,
  );
  const [pickupSelections, setPickupSelections] = useState<
    Record<string, PickupSelection>
  >({});
  const deliveredLocalNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedNotificationInboxRef = useRef(false);

  const currentTab = mode === "renter" ? renterTab : hostTab;
  const unreadNotifications = notifications.filter(
    (item) => item.unread,
  ).length;
  const shouldPreviewNotificationLocally = useCallback(
    (notification: MockNotification) => {
      if (notification.type === "booking") {
        return notificationSettings.bookingUpdates;
      }

      if (notification.type === "chat") {
        return notificationSettings.chatMessages;
      }

      return notificationSettings.paymentAndClaims;
    },
    [notificationSettings],
  );
  const renterTrips = useMemo(
    () =>
      currentUser?.id
        ? trips.filter((trip) => trip.renterId === currentUser.id)
        : [],
    [currentUser?.id, trips],
  );
  const hostTrips = useMemo(
    () =>
      currentUser?.id
        ? trips.filter((trip) => trip.ownerId === currentUser.id)
        : [],
    [currentUser?.id, trips],
  );
  const hostDamageClaims = useMemo(
    () =>
      currentUser?.id
        ? damageClaims.filter((claim) => claim.ownerId === currentUser.id)
        : [],
    [currentUser?.id, damageClaims],
  );
  const openHostDamageClaims = useMemo(
    () =>
      hostDamageClaims.filter(
        (claim) =>
          claim.status !== "Rejected" && claim.chargeStatus !== "Triggered",
      ),
    [hostDamageClaims],
  );
  const adminDamageClaims = useMemo(
    () =>
      currentUser?.role === "Admin"
        ? damageClaims.filter(
            (claim) =>
              claim.status === "Submitted" ||
              claim.status === "Disputed" ||
              (claim.status === "Approved" &&
                claim.chargeStatus !== "Triggered"),
          )
        : [],
    [currentUser?.role, damageClaims],
  );
  const hasCompletedProfile = useMemo(
    () => isProfileComplete(currentUser),
    [currentUser],
  );
  const completionPercent = useMemo(() => {
    return getProfileCompletionPercent(currentUser);
  }, [currentUser]);
  const selectedTrip =
    trips.find((trip) => trip.id === selectedTripId) ??
    renterTrips[0] ??
    hostTrips[0] ??
    trips[0] ??
    mockTrips[0];
  const selectedChat =
    chats.find((chat) => chat.id === selectedChatId) ??
    chats[0] ??
    null;
  const selectedPickup = pickupSelections[selectedTrip.id] ?? {
    pickupId: selectedTrip.pickupPointId,
    dropoffId: selectedTrip.dropoffPointId,
  };
  const selectedVehicle =
    hostListings.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const selectedBrowseVehicle =
    publicListings.find((vehicle) => vehicle.id === selectedBrowseVehicleId) ??
    null;
  const selectedTripVehicle = useMemo(() => {
    if (!selectedTrip.vehicleId) {
      return null;
    }

    return (
      publicListings.find((vehicle) => vehicle.id === selectedTrip.vehicleId) ??
      hostListings.find((vehicle) => vehicle.id === selectedTrip.vehicleId) ??
      null
    );
  }, [hostListings, publicListings, selectedTrip.vehicleId]);
  const selectedTripDamageClaim = useMemo(
    () =>
      damageClaims.find((claim) => claim.bookingId === selectedTrip.id) ?? null,
    [damageClaims, selectedTrip.id],
  );

  const refreshBookings = useCallback(
    async (showLoading = false) => {
      if (!token) {
        setTrips([]);
        setPickupSelections({});
        setTripsError(null);
        setTripsLoading(false);
        setChats([]);
        setSelectedChatId("");
        return;
      }

      if (showLoading) {
        setTripsLoading(true);
        setTripsError(null);
      }

      try {
        const response = await fetchMyBookings(token);
        const nextTrips = synchronizeTrips(
          response.bookings.map((booking) => mapBookingToTrip(booking)),
        );
        const nextChats = response.bookings
          .map((booking) => mapBookingToChat(booking, currentUser?.id ?? null))
          .filter((chat): chat is MockChat => Boolean(chat));

        setTrips(nextTrips);
        setChats(nextChats);
        setSelectedTripId((current) =>
          nextTrips.some((trip) => trip.id === current)
            ? current
            : (nextTrips[0]?.id ?? mockTrips[0].id),
        );
        setSelectedChatId((current) =>
          nextChats.some((chat) => chat.id === current)
            ? current
            : (nextChats[0]?.id ?? ""),
        );
        setPickupSelections(
          Object.fromEntries(
            nextTrips.map((trip) => [
              trip.id,
              {
                pickupId: trip.pickupPointId,
                dropoffId: trip.dropoffPointId,
              },
            ]),
          ),
        );
        setTripsError(null);
      } catch (error) {
        if (showLoading) {
          setTripsError(
            error instanceof Error
              ? error.message
              : "Unable to load booking history.",
          );
        }
      } finally {
        if (showLoading) {
          setTripsLoading(false);
        }
      }
    },
    [currentUser?.id, token],
  );

  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const response = await fetchNotifications(token);
      setNotifications(
        response.notifications.map(mapNotificationToMockNotification),
      );
    } catch (_error) {
      setNotifications([]);
    }
  }, [token]);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetchCurrentUser(token);
      dispatch(updateUser(response.user));
    } catch (error) {
      console.error("Unable to refresh current user:", error);
    }
  }, [dispatch, token]);

  const refreshDamageClaims = useCallback(async () => {
    if (!token) {
      setDamageClaims([]);
      setDamageClaimsError(null);
      setDamageClaimsLoading(false);
      return;
    }

    setDamageClaimsLoading(true);

    try {
      const response = await fetchDamageClaims(token);
      setDamageClaims(response.claims);
      setDamageClaimsError(null);
    } catch (error) {
      setDamageClaimsError(
        error instanceof Error
          ? error.message
          : "Unable to load damage claims right now.",
      );
    } finally {
      setDamageClaimsLoading(false);
    }
  }, [token]);

  const refreshPayouts = useCallback(async () => {
    if (!token) {
      setPayouts([]);
      setPayoutsBalance({ availableBalance: 0, lifetimeEarned: 0, lifetimePaidOut: 0 });
      setPayoutsError(null);
      setPayoutsLoading(false);
      return;
    }

    setPayoutsLoading(true);

    try {
      const response = await fetchMyPayouts(token);
      setPayouts(response.payouts);
      setPayoutsBalance({
        availableBalance: response.availableBalance,
        lifetimeEarned: response.lifetimeEarned,
        lifetimePaidOut: response.lifetimePaidOut,
      });
      setPayoutsError(null);
    } catch (error) {
      setPayoutsError(
        error instanceof Error
          ? error.message
          : "Unable to load payouts right now.",
      );
    } finally {
      setPayoutsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (currentUser?.notificationPreferences) {
      setNotificationSettings(currentUser.notificationPreferences);
      return;
    }

    setNotificationSettings({
      bookingUpdates: true,
      chatMessages: true,
      paymentAndClaims: true,
    });
  }, [currentUser?.notificationPreferences]);

  useEffect(() => {
    let isMounted = true;
    setPublicListingsLoading(true);
    setPublicListingsError(null);

    fetchPublicListings()
      .then((response) => {
        if (isMounted) {
          setPublicListings(response.vehicles);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setPublicListingsError(
            error instanceof Error
              ? error.message
              : "Unable to load vehicle listings.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setPublicListingsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setHostListings([]);
      setHostListingsError(null);
      setHostListingsLoading(false);
      return;
    }

    let isMounted = true;
    setHostListingsLoading(true);
    setHostListingsError(null);

    fetchMyListings(token)
      .then((response) => {
        if (isMounted) {
          setHostListings(response.vehicles);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setHostListingsError(
            error instanceof Error
              ? error.message
              : "Unable to load vehicle listings.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setHostListingsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    void refreshBookings(true);
  }, [refreshBookings]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    void refreshDamageClaims();
  }, [refreshDamageClaims]);

  useEffect(() => {
    void refreshPayouts();
  }, [refreshPayouts]);

  useEffect(() => {
    let isMounted = true;

    fetchPickupPoints()
      .then((points) => {
        if (isMounted) {
          hydratePickupPointsCatalog(points);
        }
      })
      .catch((error) => {
        console.error("Unable to refresh pickup points from the server:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setRegisteredPushToken(null);
      return;
    }

    if (registeredPushToken) {
      return;
    }

    let isMounted = true;

    registerForPushNotificationsAsync()
      .then(async (pushToken) => {
        if (!pushToken || !isMounted) {
          return;
        }

        await registerPushTokenOnServer(token, pushToken);
        if (isMounted) {
          setRegisteredPushToken(pushToken);
        }
      })
      .catch((error) => {
        console.error("Push registration failed:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [registeredPushToken, token]);

  useEffect(() => {
    deliveredLocalNotificationIdsRef.current.clear();
    hasHydratedNotificationInboxRef.current = false;

    if (!token) {
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!hasHydratedNotificationInboxRef.current) {
      notifications.forEach((notification) => {
        deliveredLocalNotificationIdsRef.current.add(notification.id);
      });
      hasHydratedNotificationInboxRef.current = true;
      return;
    }

    const newUnreadNotifications = notifications.filter(
      (notification) =>
        notification.unread &&
        !deliveredLocalNotificationIdsRef.current.has(notification.id),
    );

    if (!newUnreadNotifications.length) {
      return;
    }

    newUnreadNotifications.forEach((notification) => {
      deliveredLocalNotificationIdsRef.current.add(notification.id);
    });

    if (registeredPushToken) {
      return;
    }

    newUnreadNotifications
      .filter(shouldPreviewNotificationLocally)
      .forEach((notification) => {
        void scheduleLocalDemoNotificationAsync({
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: notification.id,
            type: notification.type,
            localDemo: true,
          },
        }).catch((error) => {
          console.error("Local notification preview failed:", error);
        });
      });
  }, [
    notifications,
    registeredPushToken,
    shouldPreviewNotificationLocally,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        void refreshCurrentUser();
        void refreshNotifications();
        void refreshBookings();
        void refreshDamageClaims();
        void refreshPayouts();
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(() => {
        void refreshCurrentUser();
        void refreshNotifications();
        void refreshBookings();
        void refreshDamageClaims();
        void refreshPayouts();
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [
    refreshBookings,
    refreshCurrentUser,
    refreshDamageClaims,
    refreshNotifications,
    refreshPayouts,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = createSocket(token);
    const handleBookingsChanged = () => {
      void refreshBookings();
    };
    const handleNotificationsChanged = () => {
      void refreshNotifications();
      void refreshCurrentUser();
    };
    const handleClaimsChanged = () => {
      void refreshDamageClaims();
    };
    const handleReviewsChanged = () => {
      void refreshBookings();
    };
    const handlePayoutsChanged = () => {
      void refreshPayouts();
    };
    const handleUserChanged = (payload?: { user?: AuthUser }) => {
      if (payload?.user) {
        dispatch(updateUser(payload.user));
        return;
      }

      void refreshCurrentUser();
    };
    const handleConnectError = (error: Error) => {
      console.error("Socket connection failed:", error);
    };

    socket.on("bookings:changed", handleBookingsChanged);
    socket.on("notifications:changed", handleNotificationsChanged);
    socket.on("claims:changed", handleClaimsChanged);
    socket.on("reviews:changed", handleReviewsChanged);
    socket.on("payouts:changed", handlePayoutsChanged);
    socket.on("user:changed", handleUserChanged);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("bookings:changed", handleBookingsChanged);
      socket.off("notifications:changed", handleNotificationsChanged);
      socket.off("claims:changed", handleClaimsChanged);
      socket.off("reviews:changed", handleReviewsChanged);
      socket.off("payouts:changed", handlePayoutsChanged);
      socket.off("user:changed", handleUserChanged);
      socket.off("connect_error", handleConnectError);
    };
  }, [
    dispatch,
    refreshBookings,
    refreshCurrentUser,
    refreshDamageClaims,
    refreshNotifications,
    refreshPayouts,
    token,
  ]);

  const openTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setOverlay("booking-detail");
  };

  const openBrowseVehicle = (vehicleId: string) => {
    setSelectedBrowseVehicleId(vehicleId);
    setOverlay("browse-vehicle");
  };

  const openBookingStart = (vehicleId: string) => {
    setSelectedBrowseVehicleId(vehicleId);
    setOverlay("booking-start");
  };

  const pendingTripForReview =
    hostTrips.find((trip) => trip.status === "Pending") ??
    hostTrips[0] ??
    mockTrips[1];
  const pendingTripVehicle =
    (pendingTripForReview.vehicleId
      ? publicListings.find(
          (vehicle) => vehicle.id === pendingTripForReview.vehicleId,
        ) ??
        hostListings.find(
          (vehicle) => vehicle.id === pendingTripForReview.vehicleId,
        )
      : null) ?? null;

  const openChat = (chatId: string) => {
    const nextChat = chats.find((chat) => chat.id === chatId);
    if (!nextChat) {
      setToast("This booking chat is not available yet.");
      return;
    }
    setSelectedChatId(chatId);
    setOverlay("chat-thread");
  };

  const handleLogout = async () => {
    if (token && registeredPushToken) {
      try {
        await unregisterPushTokenOnServer(token, registeredPushToken);
      } catch (error) {
        console.error("Push token cleanup failed:", error);
      }
    }

    setRegisteredPushToken(null);
    dispatch(signOut());
  };

  const handleNotificationSettingToggle = async (
    key: keyof NotificationSettings,
  ) => {
    if (!token) {
      setToast("Sign in again before updating push settings.");
      return;
    }

    const nextSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };

    setNotificationSettings(nextSettings);

    try {
      const response = await saveNotificationPreferences(token, nextSettings);
      setNotificationSettings(response.notificationPreferences);

      if (currentUser) {
        dispatch(
          updateUser({
            ...currentUser,
            notificationPreferences: response.notificationPreferences,
          }),
        );
      }

      setToast("Notification preferences updated");
    } catch (error) {
      setNotificationSettings((current) => ({
        ...current,
        [key]: !nextSettings[key],
      }));
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to update notification preferences.",
      );
    }
  };

  const applyTripStatusUpdate = async (
    tripId: string,
    nextStatus: Extract<MockTrip["status"], "Confirmed" | "Cancelled">,
    note: string,
  ) => {
    if (!token) {
      setToast("Sign in again before reviewing booking requests.");
      return false;
    }

    try {
      const response = await updateBookingStatus(token, tripId, nextStatus);
      const savedTrip = {
        ...mapBookingToTrip(response.booking),
        notes: `${response.booking.notes} ${note}`.trim(),
      };
      const savedChat = mapBookingToChat(response.booking, currentUser?.id ?? null);

      setTrips((current) =>
        synchronizeTrips(
          current.map((trip) => (trip.id === tripId ? savedTrip : trip)),
        ),
      );
      setPickupSelections((current) => ({
        ...current,
        [savedTrip.id]: {
          pickupId: savedTrip.pickupPointId,
          dropoffId: savedTrip.dropoffPointId,
        },
      }));

      if (savedChat) {
        setChats((current) => upsertChat(current, savedChat));
        setSelectedChatId((current) =>
          current === getChatIdForTrip(tripId) ? savedChat.id : current,
        );
      }

      if (nextStatus === "Confirmed" && savedTrip.vehicleId) {
        const bookingDates = getBookingDates(
          savedTrip.startDateIso ?? "",
          savedTrip.endDateIso ?? "",
        );

        if (bookingDates.length) {
          const updateBlockedDates = (listing: VehicleListing) =>
            listing.id === savedTrip.vehicleId
              ? {
                  ...listing,
                  blockedDates: Array.from(
                    new Set([...listing.blockedDates, ...bookingDates]),
                  ).sort(),
                }
              : listing;

          setHostListings((current) => current.map(updateBlockedDates));
          setPublicListings((current) => current.map(updateBlockedDates));
        }
      }

      return true;
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to update the booking right now.",
      );
      return false;
    }
  };

  let body: React.ReactNode;

  switch (overlay) {
    case "personal-information":
      body = (
        <PersonalInformationScreen
          user={currentUser}
          onBack={() => setOverlay(null)}
        />
      );
      break;
    case "license-viewer":
      body = (
        <DriversLicenseScreen
          user={currentUser}
          onBack={() => setOverlay(null)}
        />
      );
      break;
    case "payments":
      body = (
        <PaymentMethodsScreen
          savedMethods={savedPaymentMethods}
          onBack={() => setOverlay(null)}
          onCancel={() => setOverlay(null)}
          onDeleteMethod={(methodId) => {
            setSavedPaymentMethods((methods) =>
              methods.filter((method) => method.id !== methodId),
            );
            setToast("Payment method removed");
          }}
          onSave={(method) => {
            setSavedPaymentMethods((methods) => [method, ...methods]);
            setToast("Payment method saved");
            setOverlay(null);
          }}
        />
      );
      break;
    case "browse-vehicle":
      body = selectedBrowseVehicle ? (
        <BrowseVehicleDetailScreen
          vehicle={selectedBrowseVehicle}
          onBack={() => setOverlay(null)}
          onStartBooking={() => setOverlay("booking-start")}
        />
      ) : null;
      break;
    case "booking-start":
      body = selectedBrowseVehicle ? (
        <VehicleBookingStartScreen
          token={token}
          vehicle={selectedBrowseVehicle}
          existingTrips={trips}
          user={currentUser}
          pickupPoints={getApprovedPickupPointsForListing(selectedBrowseVehicle)}
          onBack={() => setOverlay("browse-vehicle")}
          onSubmit={(booking) => {
            setTrips((current) => synchronizeTrips([booking.trip, ...current]));
            setChats((current) => upsertChat(current, booking.chat));
            setPickupSelections((current) => ({
              ...current,
              [booking.trip.id]: booking.selection,
            }));
            if (token) {
              void fetchNotifications(token)
                .then((response) => {
                  setNotifications(
                    response.notifications.map(mapNotificationToMockNotification),
                  );
                })
                .catch(() => undefined);
            }
            setSelectedTripId(booking.trip.id);
            setSelectedChatId(booking.chat.id);
            setToast("Booking request sent");
            setOverlay("booking-detail");
          }}
        />
      ) : null;
      break;
    case "vehicle-details":
      body = (
        <VehicleDetailsScreen
          token={token}
          listing={selectedVehicle}
          onBack={() => setOverlay(null)}
          onSaved={(vehicle, message) => {
            setHostListings((current) => {
              const exists = current.some((item) => item.id === vehicle.id);
              if (exists) {
                return current.map((item) =>
                  item.id === vehicle.id ? vehicle : item,
                );
              }
              return [vehicle, ...current];
            });
            setPublicListings((current) => {
              if (vehicle.status !== "active") {
                return current.filter((item) => item.id !== vehicle.id);
              }

              const exists = current.some((item) => item.id === vehicle.id);
              if (exists) {
                return current.map((item) =>
                  item.id === vehicle.id ? { ...item, ...vehicle } : item,
                );
              }

              return [
                {
                  ...vehicle,
                  ownerName: currentUser?.name || vehicle.ownerName,
                },
                ...current,
              ];
            });
            setSelectedVehicleId(vehicle.id);
            setToast(message);
          }}
          onDeletePhoto={(vehicleId, photoId) => {
            setHostListings((current) =>
              current.map((vehicle) =>
                vehicle.id === vehicleId
                  ? {
                      ...vehicle,
                      photos: vehicle.photos.filter(
                        (photo) => photo._id !== photoId,
                      ),
                    }
                  : vehicle,
              ),
            );
            setPublicListings((current) =>
              current.map((vehicle) =>
                vehicle.id === vehicleId
                  ? {
                      ...vehicle,
                      photos: vehicle.photos.filter(
                        (photo) => photo._id !== photoId,
                      ),
                    }
                  : vehicle,
              ),
            );
          }}
          onSaveDraftMessage={() => {
            setToast("Draft saved");
          }}
          onCloseAfterSave={() => {
            setOverlay(null);
          }}
        />
      );
      break;
    case "booking-detail":
      body = (
        <BookingDetailScreen
          trip={selectedTrip}
          damageClaim={selectedTripDamageClaim}
          canDisputeClaim={canUserDisputeDamageClaim(
            selectedTripDamageClaim,
            currentUser?.id,
          )}
          pickupPoints={
            selectedTripVehicle
              ? getApprovedPickupPointsForListing(selectedTripVehicle)
              : mockPickupPoints
          }
          selection={selectedPickup}
          onBack={() => setOverlay(null)}
          onOpenPickupPoints={() => setOverlay("pickup-points")}
          onOpenChat={() => {
            const tripChatId = getChatIdForTrip(selectedTrip.id);
            const tripChat = chats.find((chat) => chat.id === tripChatId);
            if (tripChat) {
              setSelectedChatId(tripChat.id);
              setOverlay("chat-thread");
              return;
            }
            setToast("Booking chat will open once the thread is ready");
          }}
          onOpenDamageReport={() => setOverlay("damage-report")}
          onOpenReview={() => setOverlay("review")}
        />
      );
      break;
    case "booking-request":
      body = (
        <BookingRequestScreen
          trip={pendingTripForReview}
          pickupPoints={
            pendingTripVehicle
              ? getApprovedPickupPointsForListing(pendingTripVehicle)
              : mockPickupPoints
          }
          onBack={() => setOverlay(null)}
          onApprove={async () => {
            const success = await applyTripStatusUpdate(
              pendingTripForReview.id,
              "Confirmed",
              "Owner approved the request in host mode.",
            );
            if (success) {
              setToast("Booking request approved");
              setOverlay(null);
            }
          }}
          onDecline={async () => {
            const success = await applyTripStatusUpdate(
              pendingTripForReview.id,
              "Cancelled",
              "Owner declined the request in host mode.",
            );
            if (success) {
              setToast("Booking request declined");
              setOverlay(null);
            }
          }}
        />
      );
      break;
    case "chat-thread":
      body = selectedChat ? (
        <ChatThreadScreen
          chat={selectedChat}
          onBack={() => setOverlay(null)}
          onSend={async (messageBody) => {
            if (!token) {
              throw new Error("Sign in again before sending a message.");
            }

            const response = await sendBookingMessage(
              token,
              selectedChat.bookingId,
              messageBody,
            );
            const nextTrip = mapBookingToTrip(response.booking);
            const nextChat = mapBookingToChat(
              response.booking,
              currentUser?.id ?? null,
            );

            setTrips((current) =>
              synchronizeTrips(
                current.map((trip) =>
                  trip.id === nextTrip.id ? nextTrip : trip,
                ),
              ),
            );
            if (nextChat) {
              setChats((current) => upsertChat(current, nextChat));
              setSelectedChatId(nextChat.id);
            }
            setSelectedTripId(nextTrip.id);
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.overlayScroll}
          showsVerticalScrollIndicator={false}>
          <OverlayHeader title='Booking chat' onBack={() => setOverlay(null)} />
          <View style={styles.infoCard}>
            <Ionicons
              name='chatbubble-ellipses-outline'
              size={18}
              color={palette.primary}
            />
            <Text style={styles.infoCardText}>
              This conversation is not available yet. Booking chats only open
              once a real booking thread exists in the app.
            </Text>
          </View>
        </ScrollView>
      );
      break;
    case "pickup-points":
      body = (
        <PickupPointsScreen
          trip={selectedTrip}
          pickupPoints={
            selectedTripVehicle
              ? getApprovedPickupPointsForListing(selectedTripVehicle)
              : mockPickupPoints
          }
          selection={selectedPickup}
          onBack={() => setOverlay("booking-detail")}
          onSave={(nextSelection) => {
            setPickupSelections((current) => ({
              ...current,
              [selectedTrip.id]: nextSelection,
            }));
            setToast("Pickup and drop-off points updated");
            setOverlay("booking-detail");
          }}
        />
      );
      break;
    case "pickup-point-network":
      body = <PickupPointNetworkScreen onBack={() => setOverlay(null)} />;
      break;
    case "damage-report":
      body = (
        <DamageClaimScreen
          trip={selectedTrip}
          claim={selectedTripDamageClaim}
          currentUserId={currentUser?.id ?? null}
          currentUserRole={currentUser?.role ?? null}
          onBack={() => setOverlay("booking-detail")}
          onSubmitClaim={async ({ claimedAmount, description, photos }) => {
            if (!token) {
              throw new Error("Sign in again before submitting a damage claim.");
            }

            const response = await submitDamageClaim(
              token,
              {
                bookingId: selectedTrip.id,
                description,
                claimedAmount,
              },
              photos,
            );

            setDamageClaims((current) =>
              upsertDamageClaim(current, response.claim),
            );
            void refreshNotifications();
            setToast("Damage claim submitted");
            setOverlay("booking-detail");
          }}
          onSubmitDispute={async (disputeReason) => {
            if (!token || !selectedTripDamageClaim) {
              throw new Error("This damage claim is not ready for dispute.");
            }

            const response = await disputeDamageClaim(
              token,
              selectedTripDamageClaim.id,
              disputeReason,
            );

            setDamageClaims((current) =>
              upsertDamageClaim(current, response.claim),
            );
            void refreshNotifications();
            setToast("Damage dispute sent");
            setOverlay("booking-detail");
          }}
        />
      );
      break;
    case "review":
      body = (
        <ReviewScreen
          trip={selectedTrip}
          onBack={() => setOverlay("booking-detail")}
          onSubmit={async ({ rating, comment, tags }) => {
            if (!token) {
              throw new Error("Sign in again before submitting a review.");
            }
            await submitReview(token, selectedTrip.id, { rating, comment, tags });
            void refreshBookings();
            void refreshNotifications();
            setToast("Review submitted");
            setOverlay("booking-detail");
          }}
        />
      );
      break;
    case "payouts":
      body = (
        <PayoutsScreen
          payouts={payouts}
          balance={payoutsBalance}
          isLoading={payoutsLoading}
          errorText={payoutsError}
          onBack={() => setOverlay(null)}
          onRequest={async (amount) => {
            if (!token) {
              throw new Error("Sign in again before requesting a payout.");
            }
            await requestPayout(token, amount);
            void refreshPayouts();
            void refreshNotifications();
            setToast("Payout request submitted");
          }}
        />
      );
      break;
    case "notifications":
      body = (
        <NotificationsScreen
          notifications={notifications}
          settings={notificationSettings}
          onBack={() => setOverlay(null)}
          onMarkAllRead={async () => {
            if (!token) {
              setToast("Sign in again before refreshing notifications.");
              return;
            }

            try {
              const response = await markAllNotificationsRead(token);
              setNotifications(
                response.notifications.map(mapNotificationToMockNotification),
              );
              setToast("Notifications marked as read");
            } catch (error) {
              setToast(
                error instanceof Error
                  ? error.message
                  : "Unable to update notification status.",
              );
            }
          }}
          onSendTest={async () => {
            if (!token) {
              setToast("Sign in again before sending a test notification.");
              return;
            }

            try {
              if (!registeredPushToken) {
                await scheduleLocalDemoNotificationAsync({
                  title: "Demo notification",
                  body: "This is a local preview of booking and chat push alerts.",
                  data: {
                    type: "booking",
                    localDemo: true,
                  },
                });
                setToast("Demo notification shown locally");
                return;
              }

              const response = await sendTestNotification(token);
              setToast(response.message ?? "Test push sent");
            } catch (error) {
              if (
                error instanceof Error &&
                error.message.includes("No push-enabled device token found")
              ) {
                try {
                  await scheduleLocalDemoNotificationAsync({
                    title: "Demo notification",
                    body: "This is a local preview of booking and chat push alerts.",
                    data: {
                      type: "booking",
                      localDemo: true,
                    },
                  });
                  setToast("Demo notification shown locally");
                  return;
                } catch (localError) {
                  console.error(
                    "Local test notification fallback failed:",
                    localError,
                  );
                }
              }

              setToast(
                error instanceof Error
                  ? error.message
                  : "Unable to send a test push notification.",
              );
            }
          }}
          onToggleSetting={handleNotificationSettingToggle}
        />
      );
      break;
    case "admin-preview":
      body = (
        <AdminPreviewScreen
          onBack={() => setOverlay(null)}
          openClaimCount={adminDamageClaims.length}
          onOpenDamageClaims={() => setOverlay("admin-damage-claims")}
        />
      );
      break;
    case "admin-damage-claims":
      body = (
        <AdminDamageClaimsScreen
          claims={damageClaims}
          loading={damageClaimsLoading}
          error={damageClaimsError}
          isAdmin={currentUser?.role === "Admin"}
          onBack={() => setOverlay("admin-preview")}
          onReviewClaim={async (claimId, decision) => {
            if (!token) {
              throw new Error("Sign in again before reviewing damage claims.");
            }

            const response = await reviewDamageClaim(token, claimId, decision);
            setDamageClaims((current) =>
              upsertDamageClaim(current, response.claim),
            );
            void refreshNotifications();
            setToast(
              decision === "Approved"
                ? "Damage claim approved"
                : "Damage claim rejected",
            );
          }}
          onTriggerCharge={async (claimId) => {
            if (!token) {
              throw new Error("Sign in again before recording a damage charge.");
            }

            const response = await triggerDamageClaimCharge(token, claimId);
            setDamageClaims((current) =>
              upsertDamageClaim(current, response.claim),
            );
            void refreshNotifications();
            setToast("Damage charge recorded");
          }}
        />
      );
      break;
    default:
      if (mode === "renter") {
        body = renderRenterTab({
          tab: renterTab,
          completionPercent,
          isProfileComplete: hasCompletedProfile,
          hasPaymentMethod: savedPaymentMethods.length > 0,
          unreadNotifications,
          user: currentUser,
          listings: publicListings,
          listingsLoading: publicListingsLoading,
          listingsError: publicListingsError,
          trips: renterTrips,
          chats,
          onSelectProfile: () => setRenterTab("profile"),
          onSelectTrips: () => setRenterTab("trips"),
          onSelectExplore: () => setRenterTab("explore"),
          onOpenPersonalInfo: () => setOverlay("personal-information"),
          onOpenLicense: () => setOverlay("license-viewer"),
          onOpenPayments: () => setOverlay("payments"),
          onOpenNotifications: () => setOverlay("notifications"),
          onLogout: () => {
            void handleLogout();
          },
          onOpenTrip: openTrip,
          onOpenVehicle: openBrowseVehicle,
          onStartVehicleBooking: openBookingStart,
          onOpenChat: openChat,
          onOpenPickupPoints: (tripId) => {
            setSelectedTripId(tripId);
            setOverlay("pickup-points");
          },
          onOpenHostMode: () => setMode("host"),
        });
      } else {
        const firstHostPendingTrip =
          hostTrips.find((trip) => trip.status === "Pending") ?? null;
        const firstHostActiveTrip =
          hostTrips.find(
            (trip) => trip.status === "Confirmed" || trip.status === "Active",
          ) ?? null;
        const firstCompletedHostTrip =
          hostTrips.find((trip) => trip.status === "Completed") ?? null;
        const firstOpenHostClaim = openHostDamageClaims[0] ?? null;
        const firstHostClaimTrip =
          hostTrips.find((trip) => trip.id === firstOpenHostClaim?.bookingId) ??
          firstCompletedHostTrip ??
          firstHostActiveTrip ??
          hostTrips[0] ??
          null;
        const firstDraftHostListing =
          hostListings.find((listing) => listing.status === "draft") ?? null;
        const firstBlockedDatesListing =
          hostListings.find((listing) => listing.blockedDates.length > 0) ??
          hostListings[0] ??
          null;

        body = renderHostTab({
          tab: hostTab,
          unreadNotifications,
          user: currentUser,
          trips: hostTrips,
          chats,
          listings: hostListings,
          listingsLoading: hostListingsLoading,
          listingsError: hostListingsError,
          damageClaimsCount: openHostDamageClaims.length,
          damageClaimsLoading,
          damageClaimsError,
          payoutQueueCount: payouts.filter((payout) => payout.status === "Pending")
            .length,
          onOpenPersonalInfo: () => setOverlay("personal-information"),
          onOpenVehicleDetails: (vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setOverlay("vehicle-details");
          },
          onCreateVehicle: () => {
            setSelectedVehicleId(null);
            setOverlay("vehicle-details");
          },
          onToggleVehicleStatus: async (vehicleId, status) => {
            if (!token) {
              setToast("Sign in again to manage listings");
              return;
            }

            try {
              const response = await updateVehicleListingStatus(
                token,
                vehicleId,
                status,
              );
              setHostListings((current) =>
                current.map((vehicle) =>
                  vehicle.id === response.vehicle.id
                    ? response.vehicle
                    : vehicle,
                ),
              );
              setPublicListings((current) => {
                if (response.vehicle.status !== "active") {
                  return current.filter(
                    (vehicle) => vehicle.id !== response.vehicle.id,
                  );
                }

                const exists = current.some(
                  (vehicle) => vehicle.id === response.vehicle.id,
                );
                if (exists) {
                  return current.map((vehicle) =>
                    vehicle.id === response.vehicle.id
                      ? { ...vehicle, ...response.vehicle }
                      : vehicle,
                  );
                }

                return [
                  {
                    ...response.vehicle,
                    ownerName: currentUser?.name || response.vehicle.ownerName,
                  },
                  ...current,
                ];
              });
              setToast(
                status === "inactive"
                  ? "Listing deactivated"
                  : status === "active"
                  ? "Listing activated"
                  : "Listing moved to draft",
              );
            } catch (error) {
              setToast(
                error instanceof Error
                  ? error.message
                  : "Unable to update listing status.",
              );
            }
          },
          onOpenBookingRequest: () => {
            if (!firstHostPendingTrip) {
              setToast("No pending booking requests right now");
              return;
            }
            setSelectedTripId(firstHostPendingTrip.id);
            setOverlay("booking-request");
          },
          onOpenDamageClaim: () => {
            if (!firstHostClaimTrip) {
              setToast("No booking is ready for a damage claim yet");
              return;
            }
            setSelectedTripId(firstHostClaimTrip.id);
            setOverlay("damage-report");
          },
          onOpenPayouts: () => setOverlay("payouts"),
          onOpenNotifications: () => setOverlay("notifications"),
          onOpenAdminPreview: () => setOverlay("admin-preview"),
          onOpenActiveBooking: () => {
            if (!firstHostActiveTrip) {
              setToast("No active host bookings right now");
              return;
            }
            openTrip(firstHostActiveTrip.id);
          },
          onOpenDraftListing: () => {
            if (firstDraftHostListing) {
              setSelectedVehicleId(firstDraftHostListing.id);
              setOverlay("vehicle-details");
              return;
            }

            if (hostListings.length) {
              setSelectedVehicleId(hostListings[0].id);
              setOverlay("vehicle-details");
              return;
            }

            setSelectedVehicleId(null);
            setOverlay("vehicle-details");
          },
          onOpenBlockedDates: () => {
            if (!firstBlockedDatesListing) {
              setToast("Create a listing first to manage blocked dates");
              return;
            }
            setSelectedVehicleId(firstBlockedDatesListing.id);
            setOverlay("vehicle-details");
          },
          onOpenPickupPointNetwork: () => setOverlay("pickup-point-network"),
          onLogout: () => {
            void handleLogout();
          },
          onOpenChat: openChat,
          onOpenTrip: openTrip,
          onBackToRenter: () => setMode("renter"),
        });
      }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar style='light' />
      <View
        style={[
          styles.page,
          !(mode === "renter" && renterTab === "home" && !overlay) &&
            styles.pagePadded,
          (overlay === "browse-vehicle" || overlay === "booking-start") &&
            styles.pageFullBleedOverlay,
        ]}>
        <View
          style={[
            styles.body,
            (overlay === "browse-vehicle" || overlay === "booking-start") &&
              styles.bodyFullBleedOverlay,
          ]}>
          {body}
        </View>

        {!overlay ? (
          <BottomNav
            mode={mode}
            currentTab={currentTab}
            onSelectTab={(tabKey) => {
              if (mode === "renter") {
                setRenterTab(tabKey as RenterTab);
              } else {
                setHostTab(tabKey as HostTab);
              }
            }}
          />
        ) : null}

        {toast ? (
          <View style={styles.toast}>
            <Ionicons
              name='checkmark-circle'
              size={18}
              color={palette.primary}
            />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function renderRenterTab({
  tab,
  completionPercent,
  isProfileComplete,
  hasPaymentMethod,
  unreadNotifications,
  user,
  listings,
  listingsLoading,
  listingsError,
  trips,
  chats,
  onSelectProfile,
  onSelectTrips,
  onSelectExplore,
  onOpenPersonalInfo,
  onOpenLicense,
  onOpenPayments,
  onOpenNotifications,
  onLogout,
  onOpenTrip,
  onOpenVehicle,
  onStartVehicleBooking,
  onOpenChat,
  onOpenPickupPoints,
  onOpenHostMode,
}: {
  tab: RenterTab;
  completionPercent: number;
  isProfileComplete: boolean;
  hasPaymentMethod: boolean;
  unreadNotifications: number;
  user: AuthUser | null;
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  trips: MockTrip[];
  chats: MockChat[];
  onSelectProfile: () => void;
  onSelectTrips: () => void;
  onSelectExplore: () => void;
  onOpenPersonalInfo: () => void;
  onOpenLicense: () => void;
  onOpenPayments: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  onOpenTrip: (tripId: string) => void;
  onOpenVehicle: (vehicleId: string) => void;
  onStartVehicleBooking: (vehicleId: string) => void;
  onOpenChat: (chatId: string) => void;
  onOpenPickupPoints: (tripId: string) => void;
  onOpenHostMode: () => void;
}) {
  switch (tab) {
    case "home":
      return (
        <RenterHomeScreen
          unreadNotifications={unreadNotifications}
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          onSelectTrips={onSelectTrips}
          onSelectExplore={onSelectExplore}
          onOpenNotifications={onOpenNotifications}
          onOpenVehicle={onOpenVehicle}
        />
      );
    case "explore":
      return (
        <ExploreScreen
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          pickupPoints={mockPickupPoints}
          onOpenVehicle={onOpenVehicle}
          onStartVehicleBooking={onStartVehicleBooking}
          onOpenPickupPoints={() =>
            onOpenPickupPoints(trips[0]?.id ?? mockTrips[0].id)
          }
        />
      );
    case "trips":
      return (
        <TripsScreen
          trips={trips}
          onOpenTrip={onOpenTrip}
          onOpenChat={onOpenChat}
        />
      );
    case "messages":
      return (
        <MessagesScreen
          chats={chats}
          hostMode={false}
          onOpenChat={onOpenChat}
        />
      );
    case "profile":
      return (
        <RenterProfileScreen
          completionPercent={completionPercent}
          isProfileComplete={isProfileComplete}
          hasPaymentMethod={hasPaymentMethod}
          unreadNotifications={unreadNotifications}
          user={user}
          onOpenPersonalInfo={onOpenPersonalInfo}
          onOpenLicense={onOpenLicense}
          onOpenPayments={onOpenPayments}
          onOpenNotifications={onOpenNotifications}
          onOpenHostMode={onOpenHostMode}
          onLogout={onLogout}
        />
      );
  }
}

function renderHostTab({
  tab,
  unreadNotifications,
  user,
  trips,
  chats,
  listings,
  listingsLoading,
  listingsError,
  damageClaimsCount,
  damageClaimsLoading,
  damageClaimsError,
  payoutQueueCount,
  onOpenPersonalInfo,
  onOpenVehicleDetails,
  onCreateVehicle,
  onToggleVehicleStatus,
  onOpenBookingRequest,
  onOpenDamageClaim,
  onOpenPayouts,
  onOpenNotifications,
  onOpenAdminPreview,
  onOpenActiveBooking,
  onOpenDraftListing,
  onOpenBlockedDates,
  onOpenPickupPointNetwork,
  onLogout,
  onOpenChat,
  onOpenTrip,
  onBackToRenter,
}: {
  tab: HostTab;
  unreadNotifications: number;
  user: AuthUser | null;
  trips: MockTrip[];
  chats: MockChat[];
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  damageClaimsCount: number;
  damageClaimsLoading: boolean;
  damageClaimsError: string | null;
  payoutQueueCount: number;
  onOpenPersonalInfo: () => void;
  onOpenVehicleDetails: (vehicleId: string | null) => void;
  onCreateVehicle: () => void;
  onToggleVehicleStatus: (
    vehicleId: string,
    status: VehicleListing["status"],
  ) => void;
  onOpenBookingRequest: () => void;
  onOpenDamageClaim: () => void;
  onOpenPayouts: () => void;
  onOpenNotifications: () => void;
  onOpenAdminPreview: () => void;
  onOpenActiveBooking: () => void;
  onOpenDraftListing: () => void;
  onOpenBlockedDates: () => void;
  onOpenPickupPointNetwork: () => void;
  onLogout: () => void;
  onOpenChat: (chatId: string) => void;
  onOpenTrip: (tripId: string) => void;
  onBackToRenter: () => void;
}) {
  switch (tab) {
    case "dashboard":
      return (
        <HostDashboardScreen
          trips={trips}
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          damageClaimsCount={damageClaimsCount}
          damageClaimsLoading={damageClaimsLoading}
          damageClaimsError={damageClaimsError}
          payoutQueueCount={payoutQueueCount}
          onOpenVehicleDetails={onOpenDraftListing}
          onOpenBookingRequest={onOpenBookingRequest}
          onOpenDamageClaim={onOpenDamageClaim}
          onOpenPayouts={onOpenPayouts}
          onOpenAdminPreview={onOpenAdminPreview}
          onOpenActiveBooking={onOpenActiveBooking}
          onOpenDraftListing={onOpenDraftListing}
          onOpenBlockedDates={onOpenBlockedDates}
          onOpenTrip={onOpenTrip}
          onBackToRenter={onBackToRenter}
        />
      );
    case "listings":
      return (
        <HostListingsScreen
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          onCreateVehicle={onCreateVehicle}
          onOpenVehicleDetails={onOpenVehicleDetails}
          onToggleVehicleStatus={onToggleVehicleStatus}
          onOpenBookingRequest={onOpenBookingRequest}
        />
      );
    case "calendar":
      return (
        <HostCalendarScreen
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          onOpenVehicleDetails={onOpenVehicleDetails}
        />
      );
    case "messages":
      return <MessagesScreen chats={chats} hostMode onOpenChat={onOpenChat} />;
    case "profile":
      return (
        <HostProfileScreen
          unreadNotifications={unreadNotifications}
          user={user}
          payoutQueueCount={payoutQueueCount}
          damageClaimsCount={damageClaimsCount}
          onOpenPersonalInfo={onOpenPersonalInfo}
          onOpenPayouts={onOpenPayouts}
          onOpenNotifications={onOpenNotifications}
          onOpenAdminPreview={onOpenAdminPreview}
          onOpenDamageClaim={onOpenDamageClaim}
          onOpenPickupPointNetwork={onOpenPickupPointNetwork}
          onLogout={onLogout}
        />
      );
  }
}

function TripsScreen({
  trips,
  onOpenTrip,
  onOpenChat,
}: {
  trips: MockTrip[];
  onOpenTrip: (tripId: string) => void;
  onOpenChat: (chatId: string) => void;
}) {
  const active = trips.filter(
    (trip) => trip.status === "Active" || trip.status === "Confirmed",
  );
  const pending = trips.filter((trip) => trip.status === "Pending");
  const past = trips.filter(
    (trip) => trip.status === "Completed" || trip.status === "Cancelled",
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title='Trips'
        subtitle='Booking history for both renter and owner flows, including approvals and post-trip actions.'
      />

      <SectionBlock title='Active trips' items={active}>
        {active.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={() => onOpenChat(getChatIdForTrip(trip.id))}
          />
        ))}
      </SectionBlock>

      <SectionBlock title='Pending requests' items={pending}>
        {pending.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={() => onOpenChat(getChatIdForTrip(trip.id))}
          />
        ))}
      </SectionBlock>

      <SectionBlock title='Past trips' items={past}>
        {past.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={() => onOpenChat(getChatIdForTrip(trip.id))}
          />
        ))}
      </SectionBlock>
    </ScrollView>
  );
}

function MessagesScreen({
  chats,
  hostMode,
  onOpenChat,
}: {
  chats: MockChat[];
  hostMode: boolean;
  onOpenChat: (chatId: string) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title={hostMode ? "Host Inbox" : "Messages"}
        subtitle={
          hostMode
            ? "Owner and renter conversations stay separated per booking."
            : "Each booking gets its own moderated chat thread."
        }
      />

      {chats.length === 0 ? (
        <View style={styles.infoCard}>
          <Ionicons
            name='chatbubble-ellipses-outline'
            size={18}
            color={palette.primary}
          />
          <Text style={styles.infoCardText}>
            No booking conversations yet. A message thread only appears after a
            renter sends a real booking request or a host receives one.
          </Text>
        </View>
      ) : null}

      {chats.map((chat) => (
        <Pressable
          key={chat.id}
          style={styles.chatCard}
          onPress={() => onOpenChat(chat.id)}>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>
              {chat.participantName.slice(0, 1)}
            </Text>
          </View>
          <View style={styles.chatBody}>
            <View style={styles.chatTopRow}>
              <Text style={styles.chatName}>{chat.participantName}</Text>
              <Text style={styles.chatTime}>{chat.updatedAt}</Text>
            </View>
            <Text style={styles.chatVehicle}>{chat.vehicle}</Text>
            <Text
              style={styles.chatPreview}
              numberOfLines={2}
              ellipsizeMode='tail'>
              {chat.lastMessage}
            </Text>
            {chat.blockedAttempt ? (
              <View style={styles.chatWarningRow}>
                <Ionicons
                  name='shield-outline'
                  size={14}
                  color={palette.secondary}
                />
                <Text style={styles.chatWarningText}>
                  {chat.flaggedForReview
                    ? "Repeated contact-sharing attempts flagged this thread for review."
                    : "A contact-sharing attempt was blocked in this thread."}
                </Text>
              </View>
            ) : null}
          </View>
          {chat.unreadCount > 0 ? (
            <View style={styles.unreadBubble}>
              <Text style={styles.unreadBubbleText}>{chat.unreadCount}</Text>
            </View>
          ) : (
            <Ionicons
              name='chevron-forward'
              size={18}
              color={palette.onSurfaceVariant}
            />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

function RenterProfileScreen({
  completionPercent,
  isProfileComplete,
  hasPaymentMethod,
  unreadNotifications,
  user,
  onOpenPersonalInfo,
  onOpenLicense,
  onOpenPayments,
  onOpenNotifications,
  onOpenHostMode,
  onLogout,
}: {
  completionPercent: number;
  isProfileComplete: boolean;
  hasPaymentMethod: boolean;
  unreadNotifications: number;
  user: AuthUser | null;
  onOpenPersonalInfo: () => void;
  onOpenLicense: () => void;
  onOpenPayments: () => void;
  onOpenNotifications: () => void;
  onOpenHostMode: () => void;
  onLogout: () => void;
}) {
  const profileName = user?.name?.trim() || "Your account";
  const profileEmail = user?.email || "No email on file";
  const profilePhone = user?.phone?.trim() || "Add phone number";
  const initials = getUserInitials(user);
  const licenceStatus = getLicenseStatusLabel(user, "Upload needed");
  const licensePill = getLicensePill(user);

  return (
    <ScrollView
      contentContainerStyle={styles.profileScroll}
      showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>

        <View style={styles.profileIdentity}>
          <Text style={styles.profileName}>{profileName}</Text>
          <Text style={styles.profileEmail}>{profileEmail}</Text>

          <View
            style={[
              styles.verifiedPill,
              { backgroundColor: licensePill.backgroundColor },
            ]}>
            <Ionicons
              name={licensePill.icon}
              size={14}
              color={licensePill.textColor}
            />
            <Text
              style={[
                styles.verifiedPillText,
                { color: licensePill.textColor },
              ]}>
              {licensePill.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.modeCard}>
        <View style={styles.modeCopy}>
          <View style={styles.modeDot} />
          <View>
            <Text style={styles.modeTitle}>Renter Mode</Text>
            <Text style={styles.modeSubtitle}>
              Browsing and booking vehicles
            </Text>
          </View>
        </View>

        <View style={styles.inlineModeSwitch}>
          <View style={styles.inlineModeOptionActive}>
            <Text style={styles.inlineModeOptionActiveText}>Rent</Text>
          </View>
          <Pressable style={styles.inlineModeOption} onPress={onOpenHostMode}>
            <Text style={styles.inlineModeOptionText}>Host</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Profile Completion</Text>
          <Text style={styles.progressValue}>{completionPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${completionPercent}%` }]}
          />
        </View>
        <Text style={styles.progressHint}>
          {!isProfileComplete
            ? "Finish your profile basics and upload your driver's licence."
            : hasPaymentMethod
            ? "All core profile items are complete."
            : "All core profile items are complete. Payment methods are optional."}
        </Text>
      </View>

      <SectionLabel title='ACCOUNT' />
      <SectionCard>
        <SettingsRow
          icon='person-outline'
          title='Personal information'
          value={profileName}
          onPress={onOpenPersonalInfo}
        />
        <Divider />
        <SettingsRow
          icon='call-outline'
          title='Phone number'
          value={profilePhone}
        />
        <Divider />
        <SettingsRow
          icon='card-outline'
          title="Driver's licence"
          value={licenceStatus}
          onPress={onOpenLicense}
        />
        <Divider />
        <SettingsRow
          icon='log-out-outline'
          title='Log out'
          value='Exit account'
          onPress={onLogout}
        />
      </SectionCard>

      <SectionLabel title='PAYMENTS' />
      <SectionCard>
        <SettingsRow
          icon='card-outline'
          title='Payment methods'
          value={hasPaymentMethod ? "1 saved" : "Add method"}
          onPress={onOpenPayments}
        />
        <Divider />
        <SettingsRow
          icon='notifications-outline'
          title='Push notifications'
          value={
            unreadNotifications > 0
              ? `${unreadNotifications} unread`
              : "All caught up"
          }
          onPress={onOpenNotifications}
        />
      </SectionCard>

      <SectionLabel title='SAFETY' />
      <SectionCard>
        <SettingsRow
          icon='chatbubble-ellipses-outline'
          title='Chat moderation'
          value='Contact sharing blocked'
        />
        <Divider />
        <SettingsRow
          icon='shield-checkmark-outline'
          title='Damage protection'
          value='Claims handled in-app'
        />
      </SectionCard>
    </ScrollView>
  );
}

function PaymentMethodsScreen({
  savedMethods,
  onBack,
  onCancel,
  onDeleteMethod,
  onSave,
}: {
  savedMethods: SavedPaymentMethod[];
  onBack: () => void;
  onCancel: () => void;
  onDeleteMethod: (methodId: string) => void;
  onSave: (method: SavedPaymentMethod) => void;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [nickname, setNickname] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const brand = detectCardBrand(cardNumber);
  const brandLabel = getBrandLabel(brand);
  const gradient = getCardBackground(brand);
  const digits = onlyDigits(cardNumber);
  const canSave =
    digits.length >= 13 &&
    digits.length <= 19 &&
    passesLuhn(digits) &&
    cardholderName.trim().length > 1 &&
    isValidExpiry(expiry) &&
    isValidCvv(cvv, brand);

  const resetForm = () => {
    setCardNumber("");
    setCardholderName("");
    setNickname("");
    setExpiry("");
    setCvv("");
    setShowCvv(false);
    setErrorText(null);
  };

  const saveForm = () => {
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
      setErrorText("Enter a valid card number");
      return;
    }
    if (!cardholderName.trim()) {
      setErrorText("Cardholder name is required");
      return;
    }
    if (!isValidExpiry(expiry)) {
      setErrorText("Enter a valid expiry date");
      return;
    }
    if (!isValidCvv(cvv, brand)) {
      setErrorText("Enter a valid CVV");
      return;
    }

    setErrorText(null);
    onSave({
      id: Date.now().toString(),
      brand: brandLabel,
      cardholderName: cardholderName.trim(),
      expiry,
      last4: digits.slice(-4),
      nickname: nickname.trim() || undefined,
    });
    resetForm();
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlayPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OverlayHeader title='Payment methods' onBack={onBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.paymentScroll}
        keyboardShouldPersistTaps='always'
        keyboardDismissMode='none'
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior='automatic'>
        <Text style={styles.sheetTitle}>Add method</Text>

        <View style={[styles.liveCard, gradient]}>
          <View style={styles.liveCardTop}>
            <Text style={styles.liveCardBrand}>CARIB CONNECT</Text>
            <View style={styles.liveCardBrandPill}>
              <Text style={styles.liveCardBrandPillText}>{brandLabel}</Text>
            </View>
          </View>

          <Text style={styles.liveCardNumber}>
            {formatCardPreview(cardNumber)}
          </Text>

          <View style={styles.liveCardBottom}>
            <View>
              <Text style={styles.liveCardCaption}>CARDHOLDER</Text>
              <Text style={styles.liveCardValue}>
                {cardholderName.trim()
                  ? cardholderName.trim().toUpperCase()
                  : "YOUR NAME"}
              </Text>
            </View>
            <View>
              <Text style={styles.liveCardCaption}>EXPIRES</Text>
              <Text style={styles.liveCardValue}>
                {expiry.trim() || "MM/YY"}
              </Text>
            </View>
          </View>
        </View>

        <PaymentSheetField
          label='Card number'
          value={cardNumber}
          onChangeText={(value) => {
            setCardNumber(formatCardInput(value));
            if (errorText) {
              setErrorText(null);
            }
          }}
          keyboardType='number-pad'
          placeholder='Card number'
          maxLength={23}
        />
        <View style={styles.paymentFieldMetaRow}>
          <View style={styles.paymentFieldMetaChip}>
            <Text style={styles.paymentFieldMetaChipText}>{brandLabel}</Text>
          </View>
        </View>
        <Text style={styles.helperText}>
          Only the last 4 digits are saved. The full number is checked and used
          to detect card type. It is never stored.
        </Text>

        <PaymentSheetField
          label='Cardholder name'
          value={cardholderName}
          onChangeText={(value) => {
            setCardholderName(normalizeNameInput(value));
            if (errorText) {
              setErrorText(null);
            }
          }}
          placeholder='Cardholder name'
          autoCapitalize='words'
          autoCorrect={false}
        />

        <PaymentSheetField
          label='Nickname (optional)'
          value={nickname}
          onChangeText={(value) => setNickname(value.replace(/\s{2,}/g, " "))}
          placeholder='e.g. Personal Visa'
          autoCorrect={false}
        />

        <View style={styles.paymentFieldRow}>
          <View style={styles.paymentFieldColumn}>
            <PaymentSheetField
              label='Expiry date'
              value={expiry}
              onChangeText={(value) => {
                setExpiry(formatExpiryInput(value));
                if (errorText) {
                  setErrorText(null);
                }
              }}
              keyboardType='number-pad'
              placeholder='MM/YY'
              maxLength={5}
            />
          </View>

          <View style={styles.paymentFieldColumn}>
            <PaymentSheetField
              label='CVV'
              value={cvv}
              onChangeText={(value) => {
                setCvv(onlyDigits(value).slice(0, brand === "amex" ? 4 : 3));
                if (errorText) {
                  setErrorText(null);
                }
              }}
              keyboardType='number-pad'
              placeholder='CVV'
              secureTextEntry={!showCvv}
              textContentType='creditCardSecurityCode'
              autoComplete='cc-csc'
              maxLength={brand === "amex" ? 4 : 3}
            />
            <Pressable
              style={styles.paymentFieldToggle}
              onPress={() => setShowCvv((open) => !open)}>
              <Text style={styles.paymentFieldToggleText}>
                {showCvv ? "Hide CVV" : "Show CVV"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.helperText}>
          Security code is used for verification only and is never stored.
        </Text>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.sheetActions}>
          <Pressable
            style={[styles.sheetButton, styles.sheetButtonSecondary]}
            onPress={() => {
              resetForm();
              onCancel();
            }}>
            <Text style={styles.sheetButtonSecondaryText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.sheetButton, !canSave && styles.sheetButtonDisabled]}
            onPress={saveForm}>
            <Text style={styles.sheetButtonPrimaryText}>Save</Text>
          </Pressable>
        </View>

        {savedMethods.length > 0 ? (
          <View style={styles.savedMethodStrip}>
            <Text style={styles.savedMethodStripTitle}>Saved methods</Text>
            <View style={styles.savedMethodList}>
              {savedMethods.map((method) => (
                <View key={method.id} style={styles.savedMethodRow}>
                  <View style={styles.savedMethodBody}>
                    <Text style={styles.savedMethodChipText}>
                      {method.nickname ||
                        `${method.brand} . . . . ${method.last4}`}
                    </Text>
                    <Text style={styles.savedMethodMetaText}>
                      {method.brand} . . . . {method.last4} · Expires{" "}
                      {method.expiry}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.savedMethodRemoveButton}
                    onPress={() => onDeleteMethod(method.id)}>
                    <Text style={styles.savedMethodRemoveText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BrowseVehicleDetailScreen({
  vehicle,
  onBack,
  onStartBooking,
}: {
  vehicle: VehicleListing;
  onBack: () => void;
  onStartBooking: () => void;
}) {
  const detailAccent = palette.primary;
  const photos = vehicle.photos.length
    ? vehicle.photos
    : [{ url: "", public_id: "placeholder" }];
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [fullScreenGalleryOpen, setFullScreenGalleryOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { width: heroWidth, height: windowHeight } = Dimensions.get("window");
  const rating = getListingRating(vehicle);
  const ratingCount = getListingRatingCount(vehicle);
  const listingYear = getListingYear(vehicle);
  const categoryLabel = getListingCategoryLabel(vehicle);
  const listingSubtitle = getListingSubtitle(vehicle);
  const formattedBlockedDates = vehicle.blockedDates
    .slice(0, 2)
    .map((date) => formatVehicleDetailDateTime(date))
    .join(" · ");
  const includedMileage =
    vehicle.hasDailyLimit && vehicle.dailyMileageLimit
      ? `${vehicle.dailyMileageLimit.toLocaleString()} km per day`
      : "Unlimited kilometres";
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setReviewsLoading(true);

    fetchVehicleReviews(vehicle.id)
      .then((response) => {
        if (isMounted) {
          setReviews(response.reviews);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReviews([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setReviewsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [vehicle.id]);
  const featureGroups = [
    {
      title: "Vehicle features",
      items: [
        "Bluetooth",
        "USB charger",
        "USB input",
        "Backup camera",
        "Air conditioning",
        vehicle.hasDailyLimit ? "Daily mileage allowance" : "Unlimited km",
      ],
    },
    {
      title: "Included in the price",
      items: [
        "Approved pickup instructions in the app",
        "Add an additional driver at checkout",
        "30-minute return grace period",
      ],
    },
  ];
  const extras = [
    {
      title: "Prepaid refuel",
      body:
        "Save time on drop-off by returning the vehicle at any fuel level.",
      price: "JMD 6,500 / trip",
    },
    {
      title: "Airport handoff",
      body: "Arrange a smoother pickup if your trip starts near the terminal.",
      price: "JMD 4,000 / trip",
    },
  ];
  const rules = [
    "No smoking allowed",
    "Keep the vehicle tidy",
    "Refuel before returning unless prepaid",
    "No off-roading or track use",
  ];

  return (
    <View style={styles.vehicleDetailScreen}>
      <ScrollView
        style={styles.vehicleDetailScroll}
        contentContainerStyle={styles.vehicleDetailScrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleDetailHero}>
          <ScrollView
            horizontal
            pagingEnabled
            decelerationRate='fast'
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(
                event.nativeEvent.contentOffset.x / heroWidth,
              );
              setActivePhotoIndex(nextIndex);
            }}>
            {photos.map((photo, index) => (
              <Pressable
                key={`${photo.public_id}-${index}`}
                style={[styles.vehicleDetailHeroSlide, { width: heroWidth }]}
                onPress={() => {
                  setActivePhotoIndex(index);
                  setFullScreenGalleryOpen(true);
                }}>
                {photo.url ? (
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.vehicleDetailHeroImage}
                    resizeMode='cover'
                  />
                ) : (
                  <View
                    style={[
                      styles.vehicleDetailHeroFallback,
                      { backgroundColor: getBrowseListingAccent(index) },
                    ]}>
                    <Ionicons name='car-sport' size={62} color='#0B0B0B' />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.vehicleDetailHeroTopRow}>
            <Pressable style={styles.vehicleDetailCircleButton} onPress={onBack}>
              <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
            </Pressable>
            <View style={styles.vehicleDetailTopActions}>
              <Pressable
                style={styles.vehicleDetailCircleButton}
                onPress={() =>
                  Alert.alert(
                    "Share listing",
                    "Sharing shortcuts can be connected here next.",
                  )
                }>
                <Ionicons name='share-social-outline' size={23} color='#FFFFFF' />
              </Pressable>
              <Pressable
                style={styles.vehicleDetailCircleButton}
                onPress={() => setSaved((current) => !current)}>
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={23}
                  color='#FFFFFF'
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.vehicleDetailPhotoCount}>
            <Text style={styles.vehicleDetailPhotoCountText}>
              {Math.min(activePhotoIndex + 1, photos.length)} of {photos.length}
            </Text>
          </View>
        </View>

        <View style={styles.vehicleDetailContent}>
          <View style={styles.vehicleDetailSummaryCard}>
            <View style={styles.vehicleDetailSummaryEyebrowRow}>
              <View style={styles.vehicleDetailSummaryBadge}>
                <Text style={styles.vehicleDetailSummaryBadgeText}>
                  {categoryLabel}
                </Text>
              </View>
              {listingYear ? (
                <View style={styles.vehicleDetailSummaryYearBadge}>
                  <Text style={styles.vehicleDetailSummaryYearText}>
                    {listingYear}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.vehicleDetailTitle}>{getListingTitle(vehicle)}</Text>
            <Text style={styles.vehicleDetailSummarySubtitle}>{listingSubtitle}</Text>

            <View style={styles.vehicleDetailSummaryMetaRow}>
              <View style={styles.vehicleDetailSummaryRatingWrap}>
                <Text style={styles.vehicleDetailMetaLine}>
                  {ratingCount > 0 ? (
                    <>
                      {rating.toFixed(1)}{" "}
                      <Text
                        style={[styles.vehicleDetailMetaLine, { color: detailAccent }]}>
                        ★
                      </Text>{" "}
                      ({ratingCount} trips)
                    </>
                  ) : (
                    "New listing"
                  )}
                </Text>
              </View>
              <View style={styles.vehicleDetailHostBadgeWrap}>
                <Ionicons
                  name='shield-checkmark-outline'
                  size={15}
                  color={detailAccent}
                />
                <Text style={styles.vehicleDetailHostBadge}>All-Star Host</Text>
              </View>
            </View>

            <View style={styles.vehicleDetailSummaryDivider} />

            <View style={styles.vehicleDetailPillWrap}>
              <View style={styles.vehicleDetailPill}>
                <Ionicons
                  name='person-circle-outline'
                  size={18}
                  color={detailAccent}
                />
                <Text style={styles.vehicleDetailPillText}>{vehicle.seats} seats</Text>
              </View>
              <View style={styles.vehicleDetailPill}>
                <Ionicons name='water-outline' size={18} color={detailAccent} />
                <Text style={styles.vehicleDetailPillText}>{vehicle.fuelType}</Text>
              </View>
              <View style={styles.vehicleDetailPill}>
                <Ionicons
                  name='speedometer-outline'
                  size={18}
                  color={detailAccent}
                />
                <Text style={styles.vehicleDetailPillText}>
                  {vehicle.mileage.toLocaleString()} km
                </Text>
              </View>
              <View style={styles.vehicleDetailPill}>
                <Ionicons
                  name='swap-horizontal-outline'
                  size={18}
                  color={detailAccent}
                />
                <Text style={styles.vehicleDetailPillText}>
                  {vehicle.transmission} transmission
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Your trip</Text>
            <View style={styles.vehicleDetailInfoCard}>
              <View style={styles.vehicleDetailInfoRow}>
                <View style={styles.vehicleDetailInfoIcon}>
                  <Ionicons name='calendar-outline' size={21} color='#FFFFFF' />
                </View>
                <View style={styles.vehicleDetailInfoCopy}>
                  <Text style={styles.vehicleDetailInfoTitle}>Trip dates</Text>
                  <Text style={styles.vehicleDetailInfoText}>
                    {formatVehicleDetailDateTime(addDaysIso(TODAY_ISO, 7))} at 10:00
                  </Text>
                  <Text style={styles.vehicleDetailInfoText}>
                    {formatVehicleDetailDateTime(addDaysIso(TODAY_ISO, 10))} at 10:00
                  </Text>
                </View>
                <Pressable
                  style={styles.vehicleDetailInfoAction}
                  onPress={onStartBooking}>
                  <Ionicons name='pencil-outline' size={18} color='#FFFFFF' />
                </Pressable>
              </View>
              <View style={styles.vehicleDetailSectionDivider} />
              <View style={styles.vehicleDetailInfoRow}>
                <View style={styles.vehicleDetailInfoIcon}>
                  <Ionicons name='location-outline' size={21} color='#FFFFFF' />
                </View>
                <View style={styles.vehicleDetailInfoCopy}>
                  <Text style={styles.vehicleDetailInfoTitle}>
                    Pickup & return location
                  </Text>
                  <Text style={styles.vehicleDetailInfoText}>{vehicle.location}</Text>
                </View>
                <Pressable
                  style={styles.vehicleDetailInfoAction}
                  onPress={onStartBooking}>
                  <Ionicons name='pencil-outline' size={18} color='#FFFFFF' />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>About this vehicle</Text>
            <Text style={styles.vehicleDetailSectionBody}>
              {vehicle.description.trim()
                ? vehicle.description
                : "Hosted by a verified owner with in-app handoff details and live availability."}
            </Text>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Flexible payment</Text>
            <View style={styles.vehicleDetailSimpleRow}>
              <Ionicons name='card-outline' size={24} color='#FFFFFF' />
              <View style={styles.vehicleDetailSimpleRowCopy}>
                <Text style={styles.vehicleDetailSimpleRowTitle}>
                  Pay for your trip in-app
                </Text>
                <Text style={styles.vehicleDetailSimpleRowText}>
                  Final pricing, fees, and any selected extras appear at checkout.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Kilometres included</Text>
            <View style={styles.vehicleDetailSimpleRow}>
              <Ionicons name='speedometer-outline' size={24} color='#FFFFFF' />
              <View style={styles.vehicleDetailSimpleRowCopy}>
                <Text style={styles.vehicleDetailSimpleRowTitle}>
                  {includedMileage}
                </Text>
                <Text style={styles.vehicleDetailSimpleRowText}>
                  {vehicle.hasDailyLimit
                    ? "Extra kilometres can be discussed with the host before approval."
                    : "No additional kilometre fee is applied for this listing."}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>
              Insurance & protection
            </Text>
            <View style={styles.vehicleDetailSimpleRow}>
              <Ionicons name='shield-checkmark-outline' size={24} color='#FFFFFF' />
              <View style={styles.vehicleDetailSimpleRowCopy}>
                <Text style={styles.vehicleDetailSimpleRowTitle}>
                  Protection options shown at checkout
                </Text>
                <Text style={styles.vehicleDetailSimpleRowText}>
                  Coverage details can be finalised when you continue to book.
                </Text>
              </View>
            </View>
          </View>

          {featureGroups.map((group) => (
            <View key={group.title} style={styles.vehicleDetailSection}>
              <Text style={styles.vehicleDetailSectionTitle}>{group.title}</Text>
              <View style={styles.vehicleDetailListCard}>
                {group.items.map((item, index) => (
                  <View key={item}>
                    {index > 0 ? (
                      <View style={styles.vehicleDetailSectionDivider} />
                    ) : null}
                    <View style={styles.vehicleDetailListRow}>
                      <Ionicons
                        name='checkmark-circle-outline'
                        size={19}
                        color={detailAccent}
                      />
                      <Text style={styles.vehicleDetailListText}>{item}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Ratings and reviews</Text>
            {ratingCount > 0 ? (
              <Text style={styles.vehicleDetailReviewSummary}>
                {rating.toFixed(1)} <Text style={{ color: detailAccent }}>★</Text> (
                {ratingCount} ratings)
              </Text>
            ) : (
              <Text style={styles.vehicleDetailReviewSummary}>
                No ratings yet — be the first to review this vehicle.
              </Text>
            )}
            {reviewsLoading ? (
              <ActivityIndicator color={detailAccent} style={{ marginTop: spacing.sm }} />
            ) : reviews.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleDetailReviewRail}>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.vehicleDetailReviewCard}>
                    <View style={styles.vehicleDetailReviewStars}>
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Ionicons
                          key={`${review.id}-${index}`}
                          name='star'
                          size={17}
                          color={detailAccent}
                        />
                      ))}
                    </View>
                    <Text style={styles.vehicleDetailReviewMeta}>
                      {review.reviewerName || "Renter"}
                    </Text>
                    {review.comment ? (
                      <Text style={styles.vehicleDetailReviewText}>{review.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Hosted by</Text>
            <View style={styles.vehicleDetailHostCard}>
              <View style={styles.vehicleDetailHostAvatar}>
                <Text style={styles.vehicleDetailHostAvatarText}>
                  {(vehicle.ownerName?.trim() || "Host").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.vehicleDetailHostCopy}>
                <Text style={styles.vehicleDetailHostName}>
                  {vehicle.ownerName?.trim() || "Vehicle host"}
                </Text>
                <Text style={styles.vehicleDetailHostMeta}>
                  {vehicle.ownerReviewCount
                    ? `${(vehicle.ownerAverageRating ?? 0).toFixed(1)} ★ host rating (${vehicle.ownerReviewCount} reviews)`
                    : "New host"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Availability notes</Text>
            <View style={styles.vehicleDetailSimpleRow}>
              <Ionicons name='time-outline' size={24} color='#FFFFFF' />
              <View style={styles.vehicleDetailSimpleRowCopy}>
                <Text style={styles.vehicleDetailSimpleRowTitle}>
                  {vehicle.blockedDates.length
                    ? `${vehicle.blockedDates.length} blocked date(s)`
                    : "Currently open for booking"}
                </Text>
                <Text style={styles.vehicleDetailSimpleRowText}>
                  {formattedBlockedDates || "No blocked dates are currently listed."}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>
              Extras ({extras.length})
            </Text>
            {extras.map((extra) => (
              <View key={extra.title} style={styles.vehicleDetailExtraCard}>
                <Text style={styles.vehicleDetailExtraTitle}>{extra.title}</Text>
                <Text style={styles.vehicleDetailExtraBody}>{extra.body}</Text>
                <Text style={styles.vehicleDetailExtraPrice}>{extra.price}</Text>
              </View>
            ))}
          </View>

          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailSectionTitle}>Rules of the road</Text>
            <View style={styles.vehicleDetailListCard}>
              {rules.map((rule, index) => (
                <View key={rule}>
                  {index > 0 ? <View style={styles.vehicleDetailSectionDivider} /> : null}
                  <View style={styles.vehicleDetailListRow}>
                    <Ionicons
                      name='remove-circle-outline'
                      size={19}
                      color={palette.onSurfaceVariant}
                    />
                    <Text style={styles.vehicleDetailListText}>{rule}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.vehicleDetailFooterLinks}>
            <Pressable>
              <Text style={[styles.vehicleDetailFooterLink, { color: detailAccent }]}>
                Report listing
              </Text>
            </Pressable>
            <Pressable>
              <Text style={[styles.vehicleDetailFooterLink, { color: detailAccent }]}>
                Cancellation policy
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.vehicleDetailBottomBar}>
        <View style={styles.vehicleDetailPriceStack}>
          <Text style={styles.vehicleDetailPriceStrike}>
            JMD {Math.round(vehicle.dailyRate * 1.2).toLocaleString()}/day
          </Text>
          <Text style={styles.vehicleDetailPriceNow}>
            JMD {vehicle.dailyRate.toLocaleString()}/day
          </Text>
          <Text style={styles.vehicleDetailPriceNote}>Before taxes</Text>
        </View>
        <Pressable
          style={[styles.vehicleDetailContinueButton, { backgroundColor: detailAccent }]}
          onPress={onStartBooking}>
          <Text style={styles.vehicleDetailContinueButtonText}>Continue</Text>
        </Pressable>
      </View>

      {fullScreenGalleryOpen ? (
        <View style={styles.vehicleGalleryOverlay}>
          <ScrollView
            horizontal
            pagingEnabled
            decelerationRate='fast'
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: activePhotoIndex * heroWidth, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(
                event.nativeEvent.contentOffset.x / heroWidth,
              );
              setActivePhotoIndex(nextIndex);
            }}>
            {photos.map((photo, index) => (
              <View
                key={`fullscreen-${photo.public_id}-${index}`}
                style={[
                  styles.vehicleGalleryOverlaySlide,
                  { width: heroWidth, height: windowHeight },
                ]}>
                {photo.url ? (
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.vehicleGalleryOverlayImage}
                    resizeMode='contain'
                  />
                ) : (
                  <View
                    style={[
                      styles.vehicleGalleryOverlayFallback,
                      { backgroundColor: getBrowseListingAccent(index) },
                    ]}>
                    <Ionicons name='car-sport' size={80} color='#0B0B0B' />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.vehicleGalleryOverlayTopRow}>
            <Pressable
              style={styles.vehicleGalleryOverlayButton}
              onPress={() => setFullScreenGalleryOpen(false)}>
              <Ionicons name='close' size={24} color='#FFFFFF' />
            </Pressable>
            <View style={styles.vehicleGalleryOverlayCount}>
              <Text style={styles.vehicleGalleryOverlayCountText}>
                {Math.min(activePhotoIndex + 1, photos.length)} of {photos.length}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function VehicleBookingStartScreen({
  token,
  vehicle,
  existingTrips,
  user,
  pickupPoints,
  onBack,
  onSubmit,
}: {
  token: string | null;
  vehicle: VehicleListing;
  existingTrips: MockTrip[];
  user: AuthUser | null;
  pickupPoints: MockPickupPoint[];
  onBack: () => void;
  onSubmit: (booking: {
    trip: MockTrip;
    chat: MockChat;
    selection: PickupSelection;
  }) => void;
}) {
  const checkoutAccent = palette.primary;
  const checkoutDropdownOptions = ["+1", "+44", "+61", "+49"] as const;
  const ageOptions = Array.from({ length: 55 }, (_, index) =>
    String(index + 21),
  );
  const listingParish = getListingParish(
    vehicle.location,
    vehicle.parishCode,
  );
  const approvedPointIds = getApprovedPickupPointIdsForListing(vehicle);
  const approvedPickupPoints =
    pickupPoints.length > 0
      ? pickupPoints
      : mockPickupPoints.filter((point) => approvedPointIds.includes(point.id));
  const defaultPickupPoint =
    approvedPickupPoints.find((point) => point.parish === listingParish) ??
    approvedPickupPoints[0] ??
    getPickupPointById(approvedPointIds[0]) ??
    mockPickupPoints[0];
  const [startDate, setStartDate] = useState(addDaysIso(TODAY_ISO, 7));
  const [endDate, setEndDate] = useState(addDaysIso(TODAY_ISO, 10));
  const [pickupId, setPickupId] = useState(defaultPickupPoint?.id ?? "");
  const [dropoffId, setDropoffId] = useState(defaultPickupPoint?.id ?? "");
  const [hasEditedPickupLocation, setHasEditedPickupLocation] = useState(false);
  const [showTripEditor, setShowTripEditor] = useState(false);
  const [activeCheckoutDateField, setActiveCheckoutDateField] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [activeCheckoutDropdown, setActiveCheckoutDropdown] = useState<
    "countryCode" | "age" | null
  >(null);
  const userNameParts = (user?.name?.trim() || "").split(/\s+/).filter(Boolean);
  const [countryCode, setCountryCode] = useState<(typeof checkoutDropdownOptions)[number]>("+1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [firstName, setFirstName] = useState(userNameParts[0] ?? "");
  const [lastName, setLastName] = useState(userNameParts.slice(1).join(" "));
  const [age, setAge] = useState("30");
  const [protectionAdded, setProtectionAdded] = useState(false);
  const [extraAdded, setExtraAdded] = useState(false);
  const [bookingRate, setBookingRate] = useState<"non-refundable" | "refundable">(
    "non-refundable",
  );
  const [payTiming, setPayTiming] = useState<"pay-now" | "pay-over-time">(
    "pay-now",
  );
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [wantsPromos, setWantsPromos] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const bookingDates = getBookingDates(startDate, endDate);
  const totalDays = bookingDates.length;
  const pickupPoint =
    approvedPickupPoints.find((point) => point.id === pickupId) ??
    defaultPickupPoint;
  const dropoffPoint =
    approvedPickupPoints.find((point) => point.id === dropoffId) ??
    defaultPickupPoint;
  const listingYear = getListingYear(vehicle) || "2026";
  const rating = getListingRating(vehicle);
  const ratingCount = getListingRatingCount(vehicle);
  const rentalBase = calculateBookingTotal(totalDays, vehicle);
  const weeklySavings = Math.max(vehicle.dailyRate * totalDays - rentalBase, 0);
  const protectionFee = protectionAdded ? 3200 : 0;
  const extrasFee = extraAdded ? 1200 : 0;
  const nonRefundableDiscount =
    bookingRate === "non-refundable"
      ? Math.max(Math.round(rentalBase * 0.06), 1800)
      : 0;
  const refundablePremium =
    bookingRate === "refundable"
      ? Math.max(Math.round(rentalBase * 0.04), 1200)
      : 0;
  const subtotal =
    rentalBase + protectionFee + extrasFee + refundablePremium - nonRefundableDiscount;
  const salesTax = Math.round(subtotal * 0.15);
  const tripTotal = subtotal + salesTax;
  const savingsTotal = weeklySavings + nonRefundableDiscount;
  const rateOptions = {
    nonRefundable:
      rentalBase +
      protectionFee +
      extrasFee -
      Math.max(Math.round(rentalBase * 0.06), 1800) +
      Math.round(
        (rentalBase +
          protectionFee +
          extrasFee -
          Math.max(Math.round(rentalBase * 0.06), 1800)) *
          0.15,
      ),
    refundable:
      rentalBase +
      protectionFee +
      extrasFee +
      Math.max(Math.round(rentalBase * 0.04), 1200) +
      Math.round(
        (rentalBase +
          protectionFee +
          extrasFee +
          Math.max(Math.round(rentalBase * 0.04), 1200)) *
          0.15,
      ),
  };
  const displayLocation =
    pickupPoint
      ? getPickupPointRevealCopy(pickupPoint, false)
      : getListingParish(vehicle.location, vehicle.parishCode);
  const renterName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  useEffect(() => {
    if (endDate <= startDate) {
      setEndDate(addDaysIso(startDate, 1));
    }
  }, [endDate, startDate]);

  const submitBooking = async () => {
    if (!user) {
      setErrorText("Sign in before continuing with checkout.");
      return;
    }

    if (!token) {
      setErrorText("Reconnect your account before sending this booking request.");
      return;
    }

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      setErrorText("Choose both trip dates.");
      return;
    }

    if (startDate < TODAY_ISO) {
      setErrorText("Choose a pickup date on or after Monday, July 27, 2026.");
      return;
    }

    if (endDate <= startDate) {
      setErrorText("Drop-off must be after the pickup date.");
      return;
    }

    if (
      !mobileNumber.trim() ||
      !email.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !age.trim()
    ) {
      setErrorText("Complete the primary driver details before continuing.");
      return;
    }

    if (!agreedToTerms) {
      setErrorText("Agree to the checkout terms before continuing.");
      return;
    }

    if (payTiming === "pay-now" && !paymentMethodAdded) {
      setErrorText("Add a payment method before continuing.");
      return;
    }

    if (!pickupId || !dropoffId) {
      setErrorText("Choose both a pickup point and a drop-off point.");
      return;
    }

    const conflictingDate = bookingDates.find((date) =>
      vehicle.blockedDates.includes(date),
    );
    if (conflictingDate) {
      setErrorText(`This vehicle is unavailable on ${conflictingDate}.`);
      return;
    }

    const conflictingTrip = findConflictingTrip(
      existingTrips,
      vehicle,
      startDate,
      endDate,
    );
    if (conflictingTrip) {
      setErrorText(
        `This vehicle already has a ${conflictingTrip.status.toLowerCase()} booking overlapping those dates.`,
      );
      return;
    }

    const notes = [
      `Checkout complete for ${renterName || user.email}.`,
      protectionAdded ? "Protection selected." : "No protection add-on selected.",
      extraAdded ? "Extra item added." : "No extras added.",
      bookingRate === "non-refundable"
        ? "Non-refundable rate selected."
        : "Refundable rate selected.",
      promoCode.trim() ? `Promo code entered: ${promoCode.trim()}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      setIsSubmitting(true);
      setErrorText(null);

      const response = await createBooking(token, {
        vehicleId: vehicle.id,
        startDate,
        endDate,
        totalDays,
        totalAmount: tripTotal,
        ownerPayout: Math.round(rentalBase * 0.8),
        pickupPointId: pickupId,
        dropoffPointId: dropoffId,
        notes,
      });
      const trip = mapBookingToTrip(response.booking);
      const chat = mapBookingToChat(response.booking, user.id);
      if (!chat) {
        throw new Error("Booking thread was created without a chat payload.");
      }

      onSubmit({
        trip,
        chat,
        selection: {
          pickupId: trip.pickupPointId,
          dropoffId: trip.dropoffPointId,
        },
      });
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to send the booking request right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.checkoutScreen}>
      <View style={styles.checkoutHeader}>
        <Pressable style={styles.checkoutBackButton} onPress={onBack}>
          <Ionicons name='chevron-back' size={24} color='#FFFFFF' />
        </Pressable>
        <Text style={styles.checkoutTitle}>Checkout</Text>
        <View style={styles.checkoutBackButtonGhost} />
      </View>

      <ScrollView
        style={styles.checkoutScroll}
        contentContainerStyle={styles.checkoutScrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.checkoutVehicleCard}>
          <View style={styles.checkoutVehicleTopRow}>
            <View style={styles.checkoutVehicleCopy}>
              <Text style={styles.checkoutVehicleTitle}>
                {getListingTitle(vehicle)}
              </Text>
              <Text style={styles.checkoutVehicleMeta}>
                {listingYear}
                {ratingCount > 0 ? ` • ${rating.toFixed(1)} ★ (${ratingCount} trips)` : ""}
              </Text>
            </View>

            <View style={styles.checkoutVehicleThumb}>
              {vehicle.photos[0]?.url ? (
                <Image
                  source={{ uri: vehicle.photos[0].url }}
                  style={styles.checkoutVehicleThumbImage}
                  resizeMode='cover'
                />
              ) : (
                <View
                  style={[
                    styles.checkoutVehicleThumbFallback,
                    { backgroundColor: getBrowseListingAccent(0) },
                  ]}>
                  <Ionicons name='car-sport' size={28} color='#0B0B0B' />
                </View>
              )}
            </View>
          </View>

          <View style={styles.checkoutVehicleInfoRow}>
            <Ionicons
              name='calendar-outline'
              size={22}
              color={palette.onSurface}
            />
            <View style={styles.checkoutVehicleInfoCopy}>
              <Text style={styles.checkoutVehicleInfoText}>
                {formatCheckoutDateLabel(startDate)} at 10:00
              </Text>
              <Text style={styles.checkoutVehicleInfoText}>
                {formatCheckoutDateLabel(endDate)} at 10:00
              </Text>
            </View>
          </View>

          <View style={styles.checkoutVehicleInfoRow}>
            <Ionicons
              name='location-outline'
              size={22}
              color={palette.onSurface}
            />
            <Text style={styles.checkoutVehicleInfoSingle}>{displayLocation}</Text>
          </View>
        </View>

        <Pressable
          style={styles.checkoutEditTripButton}
          onPress={() => setShowTripEditor((current) => !current)}>
          <Text style={styles.checkoutEditTripButtonText}>
            {showTripEditor ? "Hide trip details" : "Edit trip details"}
          </Text>
          <Ionicons
            name={showTripEditor ? "chevron-up" : "chevron-down"}
            size={18}
            color={palette.primary}
          />
        </Pressable>

        {showTripEditor ? (
          <View style={styles.checkoutEditorCard}>
            <View style={styles.checkoutFieldRow}>
              <View style={styles.checkoutFieldHalf}>
                <DatePickerField
                  label='Pickup date'
                  value={startDate}
                  onChange={setStartDate}
                  icon='calendar-outline'
                  minimumDate={TODAY_ISO}
                  open={activeCheckoutDateField === "pickup"}
                  hideInlinePicker
                  onToggle={() =>
                    setActiveCheckoutDateField((current) =>
                      current === "pickup" ? null : "pickup",
                    )
                  }
                  onClose={() => setActiveCheckoutDateField(null)}
                />
              </View>
              <View style={styles.checkoutFieldHalf}>
                <DatePickerField
                  label='Drop-off date'
                  value={endDate}
                  onChange={setEndDate}
                  icon='calendar-outline'
                  minimumDate={addDaysIso(startDate, 1)}
                  open={activeCheckoutDateField === "dropoff"}
                  hideInlinePicker
                  onToggle={() =>
                    setActiveCheckoutDateField((current) =>
                      current === "dropoff" ? null : "dropoff",
                    )
                  }
                  onClose={() => setActiveCheckoutDateField(null)}
                />
              </View>
            </View>

            {activeCheckoutDateField ? (
              <InlineDatePickerPanel
                value={
                  activeCheckoutDateField === "pickup" ? startDate : endDate
                }
                onChange={
                  activeCheckoutDateField === "pickup"
                    ? setStartDate
                    : setEndDate
                }
                minimumDate={
                  activeCheckoutDateField === "pickup"
                    ? TODAY_ISO
                    : addDaysIso(startDate, 1)
                }
                onDone={() => setActiveCheckoutDateField(null)}
              />
            ) : null}

            <Text style={styles.checkoutEditorLabel}>Pickup point</Text>
            {approvedPickupPoints.map((point) => (
              <SelectionCard
                key={`pickup-checkout-${point.id}`}
                title={point.name}
                subtitle={getPickupPointRevealCopy(point, false)}
                note={point.note}
                selected={pickupId === point.id}
                onPress={() => {
                  setPickupId(point.id);
                  setHasEditedPickupLocation(true);
                }}
              />
            ))}

            <Text style={styles.checkoutEditorLabel}>Drop-off point</Text>
            {approvedPickupPoints.map((point) => (
              <SelectionCard
                key={`dropoff-checkout-${point.id}`}
                title={point.name}
                subtitle={getPickupPointRevealCopy(point, false)}
                note={point.note}
                selected={dropoffId === point.id}
                onPress={() => {
                  setDropoffId(point.id);
                  setHasEditedPickupLocation(true);
                }}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.checkoutSection}>
          <View style={styles.checkoutSectionHeader}>
            <Text style={styles.checkoutSectionTitle}>Primary driver</Text>
            <Pressable
              style={styles.checkoutLoginButton}
              onPress={() => {
                if (!user) {
                  setErrorText("Sign in support can be connected here next.");
                  return;
                }
                setErrorText(null);
              }}>
              <Text style={styles.checkoutLoginButtonText}>
                {user ? "Profile" : "Log in"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.checkoutFieldRow}>
            <View style={styles.checkoutCountryField}>
              <Text style={styles.checkoutFieldLabel}>Country code</Text>
              <Pressable
                style={styles.checkoutDropdownField}
                onPress={() =>
                  setActiveCheckoutDropdown((current) =>
                    current === "countryCode" ? null : "countryCode",
                  )
                }>
                <Text style={styles.checkoutDropdownValue}>{countryCode}</Text>
                <Ionicons
                  name={
                    activeCheckoutDropdown === "countryCode"
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={18}
                  color={palette.onSurfaceVariant}
                />
              </Pressable>
              {activeCheckoutDropdown === "countryCode" ? (
                <View style={styles.checkoutDropdownMenu}>
                  {checkoutDropdownOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.checkoutDropdownOption}
                      onPress={() => {
                        setCountryCode(option);
                        setActiveCheckoutDropdown(null);
                      }}>
                      <Text style={styles.checkoutDropdownOptionText}>
                        {option}
                      </Text>
                      {countryCode === option ? (
                        <Ionicons
                          name='checkmark'
                          size={16}
                          color={palette.primary}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.checkoutPhoneField}>
              <Text style={styles.checkoutFieldLabel}>Mobile number</Text>
              <View style={styles.checkoutTextFieldShell}>
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder='Mobile number'
                  placeholderTextColor={palette.onSurfaceVariant}
                  style={styles.checkoutTextFieldInput}
                  keyboardType='number-pad'
                  selectionColor={palette.primary}
                />
              </View>
            </View>
          </View>

          <Text style={styles.checkoutHelperText}>
            By providing a phone number, you consent to receive automated text
            messages with trip or account updates.
          </Text>

          <Text style={styles.checkoutFieldLabel}>Email</Text>
          <View style={styles.checkoutTextFieldShell}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder='Email'
              placeholderTextColor={palette.onSurfaceVariant}
              style={styles.checkoutTextFieldInput}
              autoCapitalize='none'
              autoCorrect={false}
              selectionColor={palette.primary}
            />
          </View>

          <Text style={styles.checkoutFieldLabel}>First name on driver's license</Text>
          <View style={styles.checkoutTextFieldShell}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder='First name'
              placeholderTextColor={palette.onSurfaceVariant}
              style={styles.checkoutTextFieldInput}
              autoCapitalize='words'
              selectionColor={palette.primary}
            />
          </View>
          <Text style={styles.checkoutHelperTextMuted}>
            You can add a preferred name through your account later.
          </Text>

          <Text style={styles.checkoutFieldLabel}>Last name on driver's license</Text>
          <View style={styles.checkoutTextFieldShell}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder='Last name'
              placeholderTextColor={palette.onSurfaceVariant}
              style={styles.checkoutTextFieldInput}
              autoCapitalize='words'
              selectionColor={palette.primary}
            />
          </View>

          <Text style={styles.checkoutFieldLabel}>Age</Text>
          <Pressable
            style={styles.checkoutDropdownField}
            onPress={() =>
              setActiveCheckoutDropdown((current) =>
                current === "age" ? null : "age",
              )
            }>
            <Text style={styles.checkoutDropdownValue}>{age}</Text>
            <Ionicons
              name={activeCheckoutDropdown === "age" ? "chevron-up" : "chevron-down"}
              size={18}
              color={palette.onSurfaceVariant}
            />
          </Pressable>
          {activeCheckoutDropdown === "age" ? (
            <View style={styles.checkoutDropdownMenu}>
              <ScrollView nestedScrollEnabled style={styles.checkoutDropdownScroller}>
                {ageOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={styles.checkoutDropdownOption}
                    onPress={() => {
                      setAge(option);
                      setActiveCheckoutDropdown(null);
                    }}>
                    <Text style={styles.checkoutDropdownOptionText}>{option}</Text>
                    {age === option ? (
                      <Ionicons
                        name='checkmark'
                        size={16}
                        color={palette.primary}
                      />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.checkoutInfoBanner}>
            <View style={styles.checkoutInfoBadge}>
              <Ionicons name='information-outline' size={18} color='#081B14' />
            </View>
            <Text style={styles.checkoutInfoBannerText}>
              After booking, you'll need to submit more information to avoid
              cancellation and fees.
            </Text>
          </View>

          <Text style={styles.checkoutBodyCopy}>
            You can add additional drivers to your trip for free after booking.
          </Text>
        </View>

        <View style={styles.checkoutSection}>
          <Text style={styles.checkoutSectionTitle}>Protection</Text>
          <View style={styles.checkoutActionRow}>
            <View style={styles.checkoutActionRowIcon}>
              <Ionicons name='shield-outline' size={24} color='#FFFFFF' />
            </View>
            <View style={styles.checkoutActionRowCopy}>
              <Text style={styles.checkoutActionRowTitle}>Protection plans</Text>
              <Text style={styles.checkoutActionRowText}>
                Choose a protection plan, roadside assistance, and supplemental
                liability.
              </Text>
            </View>
            <Pressable
              style={styles.checkoutAddButton}
              onPress={() => setProtectionAdded((current) => !current)}>
              <Ionicons
                name={protectionAdded ? "checkmark" : "add"}
                size={18}
                color='#FFFFFF'
              />
              <Text style={styles.checkoutAddButtonText}>
                {protectionAdded ? "Added" : "Add"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <Text style={styles.checkoutSectionTitle}>Extras</Text>
          <View style={styles.checkoutActionRow}>
            <View style={styles.checkoutActionRowIcon}>
              <Ionicons name='add-circle-outline' size={24} color='#FFFFFF' />
            </View>
            <View style={styles.checkoutActionRowCopy}>
              <Text style={styles.checkoutActionRowTitle}>Extras</Text>
              <Text style={styles.checkoutActionRowText}>
                Choose optional extras like a phone mount or prepaid fuel.
              </Text>
            </View>
            <Pressable
              style={styles.checkoutAddButton}
              onPress={() => setExtraAdded((current) => !current)}>
              <Ionicons
                name={extraAdded ? "checkmark" : "add"}
                size={18}
                color='#FFFFFF'
              />
              <Text style={styles.checkoutAddButtonText}>
                {extraAdded ? "Added" : "Add"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <Text style={styles.checkoutSectionTitle}>Booking rate</Text>
          <View style={styles.checkoutRadioCard}>
            <Pressable
              style={styles.checkoutRadioRow}
              onPress={() => setBookingRate("non-refundable")}>
              <Ionicons
                name={
                  bookingRate === "non-refundable"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={26}
                color='#FFFFFF'
              />
              <View style={styles.checkoutRadioCopy}>
                <View style={styles.checkoutRadioHeadingRow}>
                  <Text style={styles.checkoutRadioTitle}>Non-refundable</Text>
                  <Text style={styles.checkoutRadioPrice}>
                    JMD {rateOptions.nonRefundable.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.checkoutRadioText}>
                  Cancel for free for 24 hours. After that, the trip is
                  non-refundable.
                </Text>
                <View style={styles.checkoutSavingsRow}>
                  <Ionicons name='pricetag' size={18} color={palette.primary} />
                  <Text style={styles.checkoutSavingsText}>
                    Save JMD {Math.max(nonRefundableDiscount, 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Pressable>

            <View style={styles.checkoutRadioDivider} />

            <Pressable
              style={styles.checkoutRadioRow}
              onPress={() => setBookingRate("refundable")}>
              <Ionicons
                name={
                  bookingRate === "refundable"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={26}
                color='#FFFFFF'
              />
              <View style={styles.checkoutRadioCopy}>
                <View style={styles.checkoutRadioHeadingRow}>
                  <Text style={styles.checkoutRadioTitle}>Refundable</Text>
                  <Text style={styles.checkoutRadioPrice}>
                    JMD {rateOptions.refundable.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.checkoutRadioText}>
                  Flexible cancellation before your trip starts, with a small
                  premium added now.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <Text style={styles.checkoutSectionTitle}>Summary</Text>
          <View style={styles.checkoutSummaryCard}>
            <View style={styles.checkoutSummaryRow}>
              <Text style={styles.checkoutSummaryLabel}>Subtotal</Text>
              <Text style={styles.checkoutSummaryValue}>
                JMD {subtotal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.checkoutSummaryRow}>
              <Text style={styles.checkoutSummaryLabel}>Sales tax</Text>
              <Text style={styles.checkoutSummaryValue}>
                JMD {salesTax.toLocaleString()}
              </Text>
            </View>
            <View style={styles.checkoutSummaryRow}>
              <Text style={styles.checkoutSummaryLabel}>
                {vehicle.hasDailyLimit ? "Daily mileage allowance" : "Unlimited miles"}
              </Text>
              <Text style={styles.checkoutSummaryFreeValue}>
                {vehicle.hasDailyLimit && vehicle.dailyMileageLimit
                  ? `${vehicle.dailyMileageLimit.toLocaleString()} km`
                  : "FREE"}
              </Text>
            </View>
            <View style={styles.checkoutSummaryDivider} />
            <View style={styles.checkoutSummaryRow}>
              <Text style={styles.checkoutSummaryTotalLabel}>Trip total</Text>
              <Text style={styles.checkoutSummaryTotalValue}>
                JMD {tripTotal.toLocaleString()}
              </Text>
            </View>

            {savingsTotal > 0 ? (
              <View style={styles.checkoutSavingBanner}>
                <Ionicons name='pricetag' size={22} color={palette.primary} />
                <View style={styles.checkoutSavingBannerCopy}>
                  <Text style={styles.checkoutSavingBannerTitle}>
                    You're saving JMD {savingsTotal.toLocaleString()}
                  </Text>
                  <Text style={styles.checkoutSavingBannerText}>
                    Weekly discount and selected booking rate applied.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <Text style={styles.checkoutSectionTitle}>Choose when to pay</Text>
          <View style={styles.checkoutRadioCard}>
            <Pressable
              style={styles.checkoutRadioRow}
              onPress={() => setPayTiming("pay-now")}>
              <Ionicons
                name={
                  payTiming === "pay-now"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={26}
                color='#FFFFFF'
              />
              <View style={styles.checkoutRadioCopy}>
                <Text style={styles.checkoutRadioTitle}>Pay now</Text>
              </View>
            </Pressable>

            <View style={styles.checkoutRadioDivider} />

            <Pressable
              style={styles.checkoutRadioRow}
              onPress={() => setPayTiming("pay-over-time")}>
              <Ionicons
                name={
                  payTiming === "pay-over-time"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={26}
                color='#FFFFFF'
              />
              <View style={styles.checkoutRadioCopy}>
                <Text style={styles.checkoutRadioTitle}>Pay over time</Text>
                <View style={styles.checkoutProviderRow}>
                  <View style={styles.checkoutProviderBadgePink}>
                    <Text style={styles.checkoutProviderBadgeTextDark}>Klarna</Text>
                  </View>
                  <Text style={styles.checkoutProviderWordmark}>affirm</Text>
                  <View style={styles.checkoutProviderBadgeGreen}>
                    <Text style={styles.checkoutProviderBadgeText}>Afterpay</Text>
                  </View>
                </View>
                <Text style={styles.checkoutRadioText}>
                  You'll choose a payment provider before you book your trip.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <View style={styles.checkoutPaymentHeader}>
            <Text style={styles.checkoutSectionTitle}>Payment</Text>
            <View style={styles.checkoutPaymentIconChip}>
              <Text style={styles.checkoutPaymentIconChipText}>Pay</Text>
            </View>
          </View>

          <View style={styles.checkoutActionRow}>
            <View style={styles.checkoutActionRowIcon}>
              <Ionicons name='card-outline' size={24} color='#FFFFFF' />
            </View>
            <View style={styles.checkoutActionRowCopy}>
              <Text style={styles.checkoutActionRowTitle}>Payment method</Text>
              <Text style={styles.checkoutActionRowText}>
                {paymentMethodAdded
                  ? "Visa ending in 4242 selected for this checkout."
                  : "Add a payment method to complete checkout."}
              </Text>
            </View>
            <Pressable
              style={styles.checkoutAddButton}
              onPress={() => setPaymentMethodAdded((current) => !current)}>
              <Ionicons
                name={paymentMethodAdded ? "checkmark" : "add"}
                size={18}
                color='#FFFFFF'
              />
              <Text style={styles.checkoutAddButtonText}>
                {paymentMethodAdded ? "Added" : "Add"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.checkoutPromoRow}
            onPress={() => setPromoExpanded((current) => !current)}>
            <Text style={styles.checkoutPromoRowText}>Add promo code</Text>
            <Ionicons
              name={promoExpanded ? "chevron-up" : "chevron-forward"}
              size={20}
              color={palette.onSurface}
            />
          </Pressable>

          {promoExpanded ? (
            <View style={styles.checkoutPromoEditor}>
              <View style={styles.checkoutTextFieldShell}>
                <TextInput
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder='Enter promo code'
                  placeholderTextColor={palette.onSurfaceVariant}
                  style={styles.checkoutTextFieldInput}
                  autoCapitalize='characters'
                  selectionColor={palette.primary}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.checkoutConsentGroup}>
          <Pressable
            style={styles.checkoutConsentRow}
            onPress={() => setWantsPromos((current) => !current)}>
            <Ionicons
              name={wantsPromos ? "checkbox" : "square-outline"}
              size={28}
              color='#FFFFFF'
            />
            <Text style={styles.checkoutConsentText}>
              Send me promotions and announcements via email
            </Text>
          </Pressable>

          <Pressable
            style={styles.checkoutConsentRow}
            onPress={() => setAgreedToTerms((current) => !current)}>
            <Ionicons
              name={agreedToTerms ? "checkbox" : "square-outline"}
              size={28}
              color='#FFFFFF'
            />
            <Text style={styles.checkoutConsentText}>
              I agree to pay the total shown and to the platform terms of
              service, cancellation policy, and privacy policy.
            </Text>
          </Pressable>
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </ScrollView>

      <View style={styles.checkoutBottomBar}>
        <View style={styles.checkoutBottomPriceStack}>
          <Text style={styles.checkoutBottomPrice}>
            JMD {tripTotal.toLocaleString()} total
          </Text>
          <Text style={styles.checkoutBottomNote}>Taxes and fees included</Text>
        </View>
        <Pressable
          style={styles.checkoutBottomButton}
          onPress={() => void submitBooking()}
          disabled={isSubmitting}>
          <Text style={styles.checkoutBottomButtonText}>
            {isSubmitting ? "Sending..." : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function BookingDetailScreen({
  trip,
  damageClaim,
  canDisputeClaim,
  pickupPoints,
  selection,
  onBack,
  onOpenPickupPoints,
  onOpenChat,
  onOpenDamageReport,
  onOpenReview,
}: {
  trip: MockTrip;
  damageClaim?: DamageClaimRecord | null;
  canDisputeClaim: boolean;
  pickupPoints: MockPickupPoint[];
  selection: PickupSelection;
  onBack: () => void;
  onOpenPickupPoints: () => void;
  onOpenChat: () => void;
  onOpenDamageReport: () => void;
  onOpenReview: () => void;
}) {
  const pickup = pickupPoints.find((item) => item.id === selection.pickupId);
  const dropoff = pickupPoints.find((item) => item.id === selection.dropoffId);

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Booking details' onBack={onBack} />

      <View style={styles.bookingHero}>
        <View style={[styles.bookingHeroArt, { backgroundColor: trip.accent }]}>
          <Ionicons name='car-sport' size={38} color='#0B0B0B' />
        </View>
        <View style={styles.bookingHeroBody}>
          <Text style={styles.bookingHeroTitle}>{trip.title}</Text>
          <Text style={styles.bookingHeroSubtitle}>
            {trip.location} · {trip.startDate} to {trip.endDate}
          </Text>
          <StatusChip label={trip.status} tone={statusTone(trip.status)} />
        </View>
      </View>

      <SectionLabel title='BOOKING STATUS' />
      <SectionCard>
        <TimelineRow
          title='Owner approval'
          subtitle='Booking request reviewed and status tracked in-app.'
          state={trip.status === "Pending" ? "Pending" : "Done"}
        />
        <Divider />
        <TimelineRow
          title='Pickup details'
          subtitle='Approved pickup and drop-off points are selected per booking.'
          state='Ready'
        />
        <Divider />
        <TimelineRow
          title='Post-trip actions'
          subtitle='Damage claims, receipts, and reviews unlock after completion.'
          state={trip.status === "Completed" ? "Ready" : "Locked"}
        />
      </SectionCard>

      <SectionLabel title='HANDOFF' />
      <SectionCard>
        <SettingsRow
          icon='location-outline'
          title='Pickup point'
          value={pickup ? pickup.name : "Select point"}
          onPress={onOpenPickupPoints}
        />
        <Divider />
        <SettingsRow
          icon='flag-outline'
          title='Drop-off point'
          value={dropoff ? dropoff.name : "Select point"}
          onPress={onOpenPickupPoints}
        />
      </SectionCard>

      <SectionLabel title='SUMMARY' />
      <SectionCard>
        <SummaryRow
          label='Trip total'
          value={`JMD ${trip.totalAmount.toLocaleString()}`}
        />
        <Divider />
        <SummaryRow label='Booking status' value={trip.status} />
        <Divider />
        <SummaryRow label='Chat thread' value='Per booking' />
      </SectionCard>

      {damageClaim ? (
        <>
          <SectionLabel title='DAMAGE CLAIM' />
          <SectionCard>
            <SummaryRow label='Status' value={damageClaim.status} />
            <Divider />
            <SummaryRow
              label='Claim amount'
              value={`JMD ${damageClaim.claimedAmount.toLocaleString()}`}
            />
            <Divider />
            <SummaryRow
              label='Dispute deadline'
              value={formatBookingCardDate(damageClaim.disputeWindowEndsAt)}
            />
          </SectionCard>
        </>
      ) : null}

      <View style={styles.overlayActionStack}>
        <PrimaryAction label='Open booking chat' onPress={onOpenChat} />
        <SecondaryAction
          label='Edit pickup points'
          onPress={onOpenPickupPoints}
        />
        {trip.canReview ? (
          <SecondaryAction label='Leave a review' onPress={onOpenReview} />
        ) : null}
        {trip.canReportDamage ? (
          <SecondaryAction
            label={
              damageClaim
                ? canDisputeClaim
                  ? "Dispute damage claim"
                  : "View damage claim"
                : "Report damage"
            }
            onPress={onOpenDamageReport}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function ChatThreadScreen({
  chat,
  onBack,
  onSend,
}: {
  chat: MockChat;
  onBack: () => void;
  onSend: (messageBody: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  return (
    <KeyboardAvoidingView
      style={styles.overlayPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OverlayHeader
        title={chat.participantName}
        subtitle={chat.vehicle}
        onBack={onBack}
      />

      <ScrollView
        style={styles.chatThreadScroll}
        contentContainerStyle={styles.chatThreadContent}
        showsVerticalScrollIndicator={false}>
        {chat.blockedAttempt ? (
          <View style={styles.moderationBanner}>
            <Ionicons
              name='shield-checkmark-outline'
              size={16}
              color={palette.secondary}
            />
            <Text style={styles.moderationBannerText}>
              {chat.flaggedForReview
                ? "Phone numbers, emails, and social handles are blocked in chat. Repeated attempts in this thread were flagged for review."
                : "Phone numbers, emails, and social handles are blocked in chat. Please keep communication inside the app."}
            </Text>
          </View>
        ) : null}

        {chat.messages.map((message) => {
          if (message.sender === "system") {
            return (
              <View key={message.id} style={styles.systemBubble}>
                <Text style={styles.systemBubbleText}>{message.body}</Text>
              </View>
            );
          }

          const self = message.sender === "self";
          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                self ? styles.messageRowSelf : styles.messageRowOther,
              ]}>
              <View
                style={[
                  styles.messageBubble,
                  self ? styles.messageBubbleSelf : styles.messageBubbleOther,
                ]}>
                <Text
                  style={[
                    styles.messageBubbleText,
                    self && styles.messageBubbleTextSelf,
                  ]}>
                  {message.body}
                </Text>
                <Text
                  style={[
                    styles.messageBubbleMeta,
                    self && styles.messageBubbleMetaSelf,
                  ]}>
                  {message.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.chatComposer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder='Type a booking-safe message'
          placeholderTextColor={palette.onSurfaceVariant}
          style={styles.chatComposerInput}
          selectionColor={palette.primary}
        />
        <Pressable
          style={[
            styles.chatComposerButton,
            (!draft.trim() || sending) && styles.chatComposerButtonDisabled,
          ]}
          onPress={async () => {
            const nextBody = draft.trim();
            if (!nextBody || sending) {
              return;
            }

            setSending(true);
            setErrorText(null);
            try {
              await onSend(nextBody);
              setDraft("");
            } catch (error) {
              setErrorText(
                error instanceof Error
                  ? error.message
                  : "Unable to send this message right now.",
              );
            } finally {
              setSending(false);
            }
          }}>
          <Ionicons name='send' size={16} color={palette.onPrimary} />
        </Pressable>
      </View>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </KeyboardAvoidingView>
  );
}

function PickupPointsScreen({
  trip,
  pickupPoints,
  selection,
  onBack,
  onSave,
}: {
  trip: MockTrip;
  pickupPoints: MockPickupPoint[];
  selection: PickupSelection;
  onBack: () => void;
  onSave: (selection: PickupSelection) => void;
}) {
  const [pickupId, setPickupId] = useState(selection.pickupId);
  const [dropoffId, setDropoffId] = useState(selection.dropoffId);

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Pickup & drop-off' onBack={onBack} />

      <Text style={styles.overlayLead}>
        Admin-defined handoff locations are selected per booking. Exact details
        stay inside the app until confirmation.
      </Text>

      <SectionLabel title={`PICKUP FOR ${trip.title.toUpperCase()}`} />
      {pickupPoints.map((point) => (
        <SelectionCard
          key={`pickup-${point.id}`}
          title={point.name}
          subtitle={getPickupPointRevealCopy(
            point,
            trip.status !== "Pending",
          )}
          note={point.note}
          selected={pickupId === point.id}
          onPress={() => setPickupId(point.id)}
        />
      ))}

      <SectionLabel title='DROP-OFF' />
      {pickupPoints.map((point) => (
        <SelectionCard
          key={`drop-${point.id}`}
          title={point.name}
          subtitle={getPickupPointRevealCopy(
            point,
            trip.status !== "Pending",
          )}
          note={point.note}
          selected={dropoffId === point.id}
          onPress={() => setDropoffId(point.id)}
        />
      ))}

      <View style={styles.overlayActionStack}>
        <PrimaryAction
          label='Save pickup points'
          onPress={() => onSave({ pickupId, dropoffId })}
        />
      </View>
    </ScrollView>
  );
}

function PickupPointNetworkScreen({ onBack }: { onBack: () => void }) {
  const pointsByParish = useMemo(() => {
    const grouped = new Map<string, MockPickupPoint[]>();
    mockPickupPoints.forEach((point) => {
      const existing = grouped.get(point.parish) ?? [];
      grouped.set(point.parish, [...existing, point]);
    });
    return [...grouped.entries()];
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Pickup point network' onBack={onBack} />

      <Text style={styles.overlayLead}>
        Admin-defined handoff locations across Jamaica. Renters choose from
        this network at booking.
      </Text>

      {pointsByParish.map(([parish, points]) => (
        <View key={parish}>
          <SectionLabel title={parish.toUpperCase()} />
          {points.map((point) => (
            <SelectionCard
              key={point.id}
              title={point.name}
              subtitle={point.address}
              note={point.note}
              selected={false}
              onPress={() => {}}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function ReviewScreen({
  trip,
  onBack,
  onSubmit,
}: {
  trip: MockTrip;
  onBack: () => void;
  onSubmit: (payload: {
    rating: number;
    comment: string;
    tags: string[];
  }) => Promise<void> | void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([
    reviewTagOptions[0],
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      await onSubmit({ rating, comment, tags: selectedTags });
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unable to submit review right now.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Leave a review' onBack={onBack} />

      <Text style={styles.overlayLead}>
        Both owner and renter can rate the trip after completion. Ratings appear
        on listings and profile pages.
      </Text>

      <SectionCard>
        <Text style={styles.reviewVehicleTitle}>{trip.title}</Text>
        <Text style={styles.reviewVehicleSubtitle}>
          Hosted by {trip.ownerName}
        </Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={28}
                color={palette.secondary}
              />
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionLabel title='HIGHLIGHTS' />
      <View style={styles.tagsWrap}>
        {reviewTagOptions.map((tag) => {
          const selected = selectedTags.includes(tag);
          return (
            <Pressable
              key={tag}
              style={[styles.tagChip, selected && styles.tagChipSelected]}
              onPress={() =>
                setSelectedTags((current) =>
                  selected
                    ? current.filter((item) => item !== tag)
                    : [...current, tag],
                )
              }>
              <Text
                style={[
                  styles.tagChipText,
                  selected && styles.tagChipTextSelected,
                ]}>
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <InputField
        label='Trip feedback'
        value={comment}
        onChangeText={setComment}
        placeholder='Share details about the vehicle, handoff, and communication.'
        icon='create-outline'
      />

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <View style={styles.overlayActionStack}>
        <PrimaryAction
          label={isSubmitting ? "Submitting..." : "Submit review"}
          onPress={handleSubmit}
        />
      </View>
    </ScrollView>
  );
}

function NotificationsScreen({
  notifications,
  settings,
  onBack,
  onMarkAllRead,
  onSendTest,
  onToggleSetting,
}: {
  notifications: MockNotification[];
  settings: NotificationSettings;
  onBack: () => void;
  onMarkAllRead: () => void;
  onSendTest: () => void;
  onToggleSetting: (key: keyof NotificationSettings) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader
        title='Notifications'
        onBack={onBack}
        actionLabel='Mark all read'
        onAction={onMarkAllRead}
      />

      <SectionLabel title='PUSH SETTINGS' />
      <SectionCard>
        <ToggleRow
          title='Booking updates'
          subtitle='Requests, confirmations, and cancellations'
          value={settings.bookingUpdates}
          onValueChange={() => onToggleSetting("bookingUpdates")}
        />
        <Divider />
        <ToggleRow
          title='Chat messages'
          subtitle='Booking chat thread notifications'
          value={settings.chatMessages}
          onValueChange={() => onToggleSetting("chatMessages")}
        />
        <Divider />
        <ToggleRow
          title='Payments & claims'
          subtitle='Payment confirmations, payout changes, damage claims'
          value={settings.paymentAndClaims}
          onValueChange={() => onToggleSetting("paymentAndClaims")}
        />
      </SectionCard>

      <View style={styles.overlayActionStack}>
        <SecondaryAction label='Send test push' onPress={onSendTest} />
      </View>

      <SectionLabel title='INBOX' />
      {notifications.map((item) => (
        <View key={item.id} style={styles.notificationCard}>
          <View style={styles.notificationIconWrap}>
            <Ionicons
              name={iconForNotification(item.type)}
              size={18}
              color={palette.primary}
            />
          </View>
          <View style={styles.notificationBody}>
            <View style={styles.notificationTopRow}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              {item.unread ? <View style={styles.notificationDot} /> : null}
            </View>
            <Text style={styles.notificationText}>{item.body}</Text>
            <Text style={styles.notificationTime}>{item.receivedAt}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function HostDashboardScreen({
  trips,
  listings,
  listingsLoading,
  listingsError,
  damageClaimsCount,
  damageClaimsLoading,
  damageClaimsError,
  payoutQueueCount,
  onOpenVehicleDetails,
  onOpenBookingRequest,
  onOpenDamageClaim,
  onOpenPayouts,
  onOpenAdminPreview,
  onOpenActiveBooking,
  onOpenDraftListing,
  onOpenBlockedDates,
  onOpenTrip,
  onBackToRenter,
}: {
  trips: MockTrip[];
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  damageClaimsCount: number;
  damageClaimsLoading: boolean;
  damageClaimsError: string | null;
  payoutQueueCount: number;
  onOpenVehicleDetails: () => void;
  onOpenBookingRequest: () => void;
  onOpenDamageClaim: () => void;
  onOpenPayouts: () => void;
  onOpenAdminPreview: () => void;
  onOpenActiveBooking: () => void;
  onOpenDraftListing: () => void;
  onOpenBlockedDates: () => void;
  onOpenTrip: (tripId: string) => void;
  onBackToRenter: () => void;
}) {
  const liveListings = listings.filter(
    (listing) => listing.status === "active",
  ).length;
  const draftListings = listings.filter(
    (listing) => listing.status === "draft",
  ).length;
  const blockedDays = listings.reduce(
    (count, listing) => count + listing.blockedDates.length,
    0,
  );
  const pendingTrips = trips.filter((trip) => trip.status === "Pending");
  const activeTrips = trips.filter(
    (trip) => trip.status === "Confirmed" || trip.status === "Active",
  );
  const pastTrips = trips.filter(
    (trip) => trip.status === "Completed" || trip.status === "Cancelled",
  );
  type HostPriorityTask = {
    id: string;
    title: string;
    detail: string;
    tone: "primary" | "warning" | "info";
    onPress: () => void;
  };
  const hostPriorityTasks: HostPriorityTask[] = [
    pendingTrips.length
      ? {
          id: "task-approve",
          title:
            pendingTrips.length === 1
              ? "Approve 1 booking request"
              : `Approve ${pendingTrips.length} booking requests`,
          detail:
            pendingTrips.length === 1
              ? "A renter is waiting for host review."
              : `${pendingTrips.length} renters are waiting for host review.`,
          tone: "primary" as const,
          onPress: onOpenBookingRequest,
        }
      : null,
    damageClaimsCount
      ? {
          id: "task-claim",
          title:
            damageClaimsCount === 1
              ? "Track 1 damage claim"
              : `Track ${damageClaimsCount} damage claims`,
          detail: "Post-trip claims are waiting on renter or admin follow-up.",
          tone: "warning" as const,
          onPress: onOpenDamageClaim,
        }
      : null,
    payoutQueueCount
      ? {
          id: "task-payout",
          title:
            payoutQueueCount === 1
              ? "Process 1 payout request"
              : `Process ${payoutQueueCount} payout requests`,
          detail: "Payout requests are ready for transfer and reconciliation.",
          tone: "info" as const,
          onPress: onOpenPayouts,
        }
      : null,
  ].filter((task): task is HostPriorityTask => Boolean(task));

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title='Welcome back, Host'
        subtitle='Listings, booking requests, disputes, payout queue, and admin overview.'
        action={{
          icon: "swap-horizontal-outline",
          onPress: onBackToRenter,
        }}
      />

      <View style={styles.hostBannerCard}>
        <Text style={styles.hostBannerTitle}>Host operations overview</Text>
        <Text style={styles.hostBannerSubtitle}>
          This view mirrors the agreement scope with booking approvals, damage
          claims, payout requests, pickup points, and admin tracking.
        </Text>
      </View>

      <View style={styles.dashboardMetricRow}>
        <DashboardMetric
          label='Pending requests'
          value={String(pendingTrips.length).padStart(2, "0")}
          tone='primary'
          onPress={onOpenBookingRequest}
        />
        <DashboardMetric
          label='Damage claims'
          value={String(damageClaimsCount).padStart(2, "0")}
          tone='warning'
          onPress={onOpenDamageClaim}
        />
      </View>
      <View style={styles.dashboardMetricRow}>
        <DashboardMetric
          label='Payout queue'
          value={String(payoutQueueCount).padStart(2, "0")}
          tone='info'
          onPress={onOpenPayouts}
        />
        <DashboardMetric
          label='Active bookings'
          value={String(activeTrips.length).padStart(2, "0")}
          tone='success'
          onPress={onOpenActiveBooking}
        />
      </View>

      <View style={styles.dashboardMetricRow}>
        <DashboardMetric
          label='Draft listings'
          value={String(draftListings).padStart(2, "0")}
          tone='info'
          onPress={onOpenDraftListing}
        />
        <DashboardMetric
          label='Blocked dates'
          value={String(blockedDays).padStart(2, "0")}
          tone='warning'
          onPress={onOpenBlockedDates}
        />
      </View>

      {listingsLoading ? (
        <Text style={styles.helperText}>Loading your host listings...</Text>
      ) : null}
      {listingsError ? (
        <Text style={styles.errorText}>{listingsError}</Text>
      ) : null}
      {damageClaimsError ? (
        <Text style={styles.errorText}>{damageClaimsError}</Text>
      ) : null}
      {damageClaimsLoading ? (
        <Text style={styles.helperText}>Loading damage claims...</Text>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's priorities</Text>
        <Pressable onPress={onOpenAdminPreview}>
          <Text style={styles.sectionLink}>Admin web preview</Text>
        </Pressable>
      </View>

      {hostPriorityTasks.length ? (
        hostPriorityTasks.map((task) => (
          <TaskRow key={task.id} task={task} onPress={task.onPress} />
        ))
      ) : (
        <View style={styles.infoCard}>
          <Ionicons name='checkmark-circle-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            No urgent host actions right now. New booking requests, damage
            claims, and payouts will appear here when they exist.
          </Text>
        </View>
      )}

      <SectionBlock title='Pending booking requests' items={pendingTrips}>
        {pendingTrips.slice(0, 3).map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={onOpenBookingRequest}
          />
        ))}
      </SectionBlock>

      <SectionBlock title='Active booking history' items={activeTrips}>
        {activeTrips.slice(0, 3).map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={onOpenBookingRequest}
          />
        ))}
      </SectionBlock>

      <SectionBlock title='Past booking history' items={pastTrips}>
        {pastTrips.slice(0, 3).map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onOpenTrip={() => onOpenTrip(trip.id)}
            onOpenChat={onOpenBookingRequest}
          />
        ))}
      </SectionBlock>

      <View style={styles.overlayActionStack}>
        <PrimaryAction
          label='Review booking request'
          onPress={onOpenBookingRequest}
        />
        <SecondaryAction
          label='Open damage claims'
          onPress={onOpenDamageClaim}
        />
        <SecondaryAction
          label='Open payout management'
          onPress={onOpenPayouts}
        />
      </View>
    </ScrollView>
  );
}

function HostListingsScreen({
  listings,
  listingsLoading,
  listingsError,
  onCreateVehicle,
  onOpenVehicleDetails,
  onToggleVehicleStatus,
  onOpenBookingRequest,
}: {
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  onCreateVehicle: () => void;
  onOpenVehicleDetails: (vehicleId: string | null) => void;
  onToggleVehicleStatus: (
    vehicleId: string,
    status: VehicleListing["status"],
  ) => void;
  onOpenBookingRequest: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title='Listings'
        subtitle='Create, edit, price, and review vehicles with pickup and document workflows.'
      />

      <View style={styles.overlayActionStack}>
        <PrimaryAction label='Create vehicle' onPress={onCreateVehicle} />
        <SecondaryAction
          label='Review request queue'
          onPress={onOpenBookingRequest}
        />
      </View>

      {listingsLoading ? (
        <Text style={styles.helperText}>Loading your vehicle listings...</Text>
      ) : null}
      {listingsError ? (
        <Text style={styles.errorText}>{listingsError}</Text>
      ) : null}
      {!listingsLoading && !listings.length ? (
        <View style={styles.infoCard}>
          <Ionicons name='car-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            No vehicle listings yet. Create your first listing to set pricing,
            blocked dates, and photo uploads.
          </Text>
        </View>
      ) : null}

      {listings.map((listing) => (
        <View key={listing.id} style={styles.listingCard}>
          <View
            style={[
              styles.listingColorBar,
              { backgroundColor: getListingAccent(listing.status) },
            ]}
          />
          <View style={styles.listingContent}>
            <Text style={styles.listingTitle}>{getListingTitle(listing)}</Text>
            <Text style={styles.listingSubtitle}>
              {getListingSubtitle(listing)}
            </Text>
            <View style={styles.listingMetaRow}>
              <StatusChip
                label={getListingStatusLabel(listing.status)}
                tone={
                  listing.status === "active"
                    ? "success"
                    : listing.status === "inactive"
                    ? "warning"
                    : "info"
                }
              />
              <Text style={styles.listingRate}>
                JMD {listing.dailyRate.toLocaleString()}/day
              </Text>
            </View>
            <Text style={styles.listingMetaText}>
              Weekly: JMD {listing.weeklyRate.toLocaleString()} · Blocked dates:{" "}
              {listing.blockedDates.length}
            </Text>
            <View style={styles.listingActionRow}>
              <SecondaryAction
                label='Edit'
                onPress={() => onOpenVehicleDetails(listing.id)}
                compact
              />
              <SecondaryAction
                label={
                  listing.status === "inactive" ? "Activate" : "Deactivate"
                }
                onPress={() =>
                  onToggleVehicleStatus(
                    listing.id,
                    listing.status === "inactive" ? "active" : "inactive",
                  )
                }
                compact
              />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function HostCalendarScreen({
  listings,
  listingsLoading,
  listingsError,
  onOpenVehicleDetails,
}: {
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  onOpenVehicleDetails: (vehicleId: string | null) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title='Calendar'
        subtitle='Availability, handoff schedules, and booking conflict prevention.'
      />

      <View style={styles.calendarHero}>
        <Text style={styles.calendarHeroTitle}>Availability calendar</Text>
        <Text style={styles.calendarHeroSubtitle}>
          Hosts manage blocked dates, active trips, and pickup/drop-off timing
          from one place.
        </Text>
      </View>

      {listingsLoading ? (
        <Text style={styles.helperText}>Loading availability data...</Text>
      ) : null}
      {listingsError ? (
        <Text style={styles.errorText}>{listingsError}</Text>
      ) : null}

      {!listingsLoading && !listings.length ? (
        <View style={styles.infoCard}>
          <Ionicons name='calendar-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            Create a vehicle listing first, then manage blocked dates per
            vehicle here.
          </Text>
        </View>
      ) : null}

      {listings.map((listing) => (
        <Pressable
          key={listing.id}
          style={styles.calendarRow}
          onPress={() => onOpenVehicleDetails(listing.id)}>
          <Text style={styles.calendarDay}>{getListingTitle(listing)}</Text>
          <Text style={styles.calendarLabel}>
            {listing.blockedDates.length
              ? `${
                  listing.blockedDates.length
                } blocked date(s): ${listing.blockedDates.join(", ")}`
              : "No blocked dates yet"}
          </Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={palette.onSurfaceVariant}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function HostProfileScreen({
  unreadNotifications,
  user,
  payoutQueueCount,
  damageClaimsCount,
  onOpenPersonalInfo,
  onOpenPayouts,
  onOpenNotifications,
  onOpenAdminPreview,
  onOpenDamageClaim,
  onOpenPickupPointNetwork,
  onLogout,
}: {
  unreadNotifications: number;
  user: AuthUser | null;
  payoutQueueCount: number;
  damageClaimsCount: number;
  onOpenPersonalInfo: () => void;
  onOpenPayouts: () => void;
  onOpenNotifications: () => void;
  onOpenAdminPreview: () => void;
  onOpenDamageClaim: () => void;
  onOpenPickupPointNetwork: () => void;
  onLogout: () => void;
}) {
  const profileName = user?.name?.trim() || "Your account";
  const profileEmail = user?.email || "No email on file";
  const initials = getUserInitials(user);

  return (
    <ScrollView
      contentContainerStyle={styles.profileScroll}
      showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>

        <View style={styles.profileIdentity}>
          <Text style={styles.profileName}>{profileName}</Text>
          <Text style={styles.profileEmail}>{profileEmail}</Text>

          <View style={styles.hostStatusPill}>
            <Text style={styles.hostStatusPillText}>Host Active</Text>
          </View>
        </View>
      </View>

      <SectionLabel title='ACCOUNT' />
      <SectionCard>
        <SettingsRow
          icon='person-outline'
          title='Personal information'
          value={profileName}
          onPress={onOpenPersonalInfo}
        />
        <Divider />
        <SettingsRow
          icon='log-out-outline'
          title='Log out'
          value='Exit account'
          onPress={onLogout}
        />
      </SectionCard>

      <SectionLabel title='HOST TOOLS' />
      <SectionCard>
        <SettingsRow
          icon='wallet-outline'
          title='Payout management'
          value={
            payoutQueueCount > 0
              ? `${payoutQueueCount} requests pending`
              : "No requests pending"
          }
          onPress={onOpenPayouts}
        />
        <Divider />
        <SettingsRow
          icon='notifications-outline'
          title='Notifications'
          value={
            unreadNotifications > 0
              ? `${unreadNotifications} unread`
              : "All caught up"
          }
          onPress={onOpenNotifications}
        />
        <Divider />
        <SettingsRow
          icon='globe-outline'
          title='Admin panel modules'
          value='Web dashboard preview'
          onPress={onOpenAdminPreview}
        />
      </SectionCard>

      <SectionLabel title='OPERATIONS' />
      <SectionCard>
        <SettingsRow
          icon='alert-circle-outline'
          title='Damage disputes'
          value={damageClaimsCount > 0 ? `${damageClaimsCount} open` : "None open"}
          onPress={onOpenDamageClaim}
        />
        <Divider />
        <SettingsRow
          icon='pin-outline'
          title='Pickup point network'
          value='Managed across Jamaica'
          onPress={onOpenPickupPointNetwork}
        />
      </SectionCard>
    </ScrollView>
  );
}

function PersonalInformationScreen({
  user,
  onBack,
}: {
  user: AuthUser | null;
  onBack: () => void;
}) {
  const profileName = user?.name?.trim() || "Your account";
  const profileEmail = user?.email || "No email on file";
  const profilePhone = user?.phone?.trim() || "Not added";
  const profileBio = user?.bio?.trim() || "No bio added yet.";
  const profileRole = user?.role || "Renter";
  const licenceStatus = getLicenseStatusLabel(user, "Not uploaded");
  const documentCount =
    profileRole === "Owner"
      ? `${user?.documents?.length ?? 0} uploaded`
      : "Not required for renters";
  const joinedLabel = formatUserDate(user?.createdAt);
  const initials = getUserInitials(user);

  return (
    <View style={styles.overlayPage}>
      <OverlayHeader title='Personal information' onBack={onBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.overlayScroll}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <View style={styles.profileIdentity}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>{profileEmail}</Text>
          </View>
        </View>

        <SectionLabel title='ACCOUNT DETAILS' />
        <SectionCard>
          <SummaryRow label='Full name' value={profileName} />
          <Divider />
          <SummaryRow label='Email address' value={profileEmail} />
          <Divider />
          <SummaryRow label='Phone number' value={profilePhone} />
          <Divider />
          <SummaryRow label='Account role' value={profileRole} />
          <Divider />
          <SummaryRow label="Driver's licence" value={licenceStatus} />
          <Divider />
          <SummaryRow label='Supporting documents' value={documentCount} />
          <Divider />
          <SummaryRow label='Joined' value={joinedLabel} />
        </SectionCard>

        <SectionLabel title='BIO' />
        <SectionCard>
          <Text style={styles.personalInfoBio}>{profileBio}</Text>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function DriversLicenseScreen({
  user,
  onBack,
}: {
  user: AuthUser | null;
  onBack: () => void;
}) {
  const licenseUrl = user?.license?.url;
  const hasLicense = Boolean(licenseUrl);
  const isPdf = /\.pdf($|\?)/i.test(licenseUrl || "");
  const uploadedLabel = formatUserDate(user?.updatedAt);
  const licenseStatusLabel = getLicenseStatusLabel(user, "Missing");
  const rejectionReason =
    user?.license?.status === "rejected"
      ? user.license.rejectionReason?.trim()
      : "";

  return (
    <View style={styles.overlayPage}>
      <OverlayHeader title="Driver's licence" onBack={onBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.overlayScroll}>
        <SectionCard>
          <SummaryRow label='Verification status' value={licenseStatusLabel} />
          <Divider />
          <SummaryRow
            label='Storage'
            value={
              hasLicense ? "Cloudinary URL on account" : "No file on account"
            }
          />
          <Divider />
          <SummaryRow label='Last updated' value={uploadedLabel} />
        </SectionCard>

        {rejectionReason ? (
          <SectionCard>
            <Text style={styles.licenseReviewTitle}>Review note</Text>
            <Text style={styles.licenseReviewText}>{rejectionReason}</Text>
          </SectionCard>
        ) : null}

        {hasLicense ? (
          <SectionCard>
            {isPdf ? (
              <View style={styles.licenseDocCard}>
                <View style={styles.licenseDocIcon}>
                  <Ionicons
                    name='document-text-outline'
                    size={28}
                    color={palette.primary}
                  />
                </View>
                <Text style={styles.licenseDocTitle}>PDF licence uploaded</Text>
                <Text style={styles.licenseDocText}>
                  Tap below to open the stored licence document.
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: licenseUrl }}
                style={styles.licensePreview}
                resizeMode='cover'
              />
            )}

            <Pressable
              style={styles.fullWidthPrimaryButton}
              onPress={() => {
                if (licenseUrl) {
                  void Linking.openURL(licenseUrl);
                }
              }}>
              <Text style={styles.fullWidthPrimaryButtonText}>
                {isPdf ? "Open licence document" : "Open full image"}
              </Text>
            </Pressable>
          </SectionCard>
        ) : (
          <SectionCard>
            <View style={styles.licenseEmptyState}>
              <Ionicons
                name='card-outline'
                size={28}
                color={palette.onSurfaceVariant}
              />
              <Text style={styles.licenseEmptyTitle}>
                No licence uploaded yet
              </Text>
              <Text style={styles.licenseEmptyText}>
                Upload a photo or PDF during profile setup and it will appear
                here.
              </Text>
            </View>
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
}

function VehicleDetailsScreen({
  token,
  listing,
  onBack,
  onSaved,
  onDeletePhoto,
  onSaveDraftMessage,
  onCloseAfterSave,
}: {
  token: string | null;
  listing: VehicleListing | null;
  onBack: () => void;
  onSaved: (vehicle: VehicleListing, message: string) => void;
  onDeletePhoto: (vehicleId: string, photoId: string) => void;
  onSaveDraftMessage: () => void;
  onCloseAfterSave: () => void;
}) {
  const isEditing = Boolean(listing);
  const [category, setCategory] = useState<VehicleCategory>(
    listing?.category ?? "Sedan",
  );
  const [make, setMake] = useState(listing?.make ?? "");
  const [model, setModel] = useState(listing?.model ?? "");
  const [color, setColor] = useState(listing?.color ?? "");
  const [transmission, setTransmission] = useState<
    (typeof transmissionOptions)[number]
  >(
    (listing?.transmission as (typeof transmissionOptions)[number]) ??
      "Automatic",
  );
  const [fuelType, setFuelType] = useState<(typeof fuelOptions)[number]>(
    (listing?.fuelType as (typeof fuelOptions)[number]) ?? "Petrol",
  );
  const [seats, setSeats] = useState(String(listing?.seats ?? 5));
  const [doors, setDoors] = useState(String(listing?.doors ?? 4));
  const [mileage, setMileage] = useState(String(listing?.mileage ?? ""));
  const [hasDailyLimit, setHasDailyLimit] = useState(
    Boolean(listing?.hasDailyLimit),
  );
  const [dailyMileageLimit, setDailyMileageLimit] = useState(
    listing?.dailyMileageLimit ? String(listing.dailyMileageLimit) : "",
  );
  const [condition, setCondition] = useState<VehicleCondition>(
    listing?.condition ?? "excellent",
  );
  const [plate, setPlate] = useState(listing?.plate ?? "");
  const [chassis, setChassis] = useState(listing?.chassis ?? "");
  const [engine, setEngine] = useState(listing?.engine ?? "");
  const [parish, setParish] = useState<
    (typeof jamaicaParishOptions)[number] | ""
  >(
    listing?.parishCode
      ? (getParishLabelFromCode(listing.parishCode) ?? "")
      : splitListingLocation(listing?.location).parish,
  );
  const [pickupAddress, setPickupAddress] = useState(
    splitListingLocation(listing?.location).pickupAddress,
  );
  const [offersKingstonAirport, setOffersKingstonAirport] = useState(
    Boolean(
      listing?.approvedPickupPointIds?.includes(
        KINGSTON_AIRPORT_PICKUP_POINT_ID,
      ),
    ),
  );
  const [offersMbjAirport, setOffersMbjAirport] = useState(
    Boolean(listing?.approvedPickupPointIds?.includes(MBJ_AIRPORT_PICKUP_POINT_ID)),
  );
  const [description, setDescription] = useState(listing?.description ?? "");
  const [dailyRate, setDailyRate] = useState(
    listing?.dailyRate ? String(listing.dailyRate) : "",
  );
  const [weeklyRate, setWeeklyRate] = useState(
    listing?.weeklyRate ? String(listing.weeklyRate) : "",
  );
  const [blockedDates, setBlockedDates] = useState<string[]>(
    listing?.blockedDates ?? [],
  );
  const [blockedDateDraft, setBlockedDateDraft] = useState(
    listing?.blockedDates[0] ?? TODAY_ISO,
  );
  const [queuedPhotos, setQueuedPhotos] = useState<UploadAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeVehicleDropdown, setActiveVehicleDropdown] = useState<
    "category" | "parish" | "transmission" | "fuel" | null
  >(null);
  const maxListingPhotos = 8;
  const existingPhotoCount = listing?.photos.length ?? 0;
  const totalSelectedPhotoCount = existingPhotoCount + queuedPhotos.length;

  useEffect(() => {
    setCategory(listing?.category ?? "Sedan");
    setMake(listing?.make ?? "");
    setModel(listing?.model ?? "");
    setColor(listing?.color ?? "");
    setTransmission(
      (listing?.transmission as (typeof transmissionOptions)[number]) ??
        "Automatic",
    );
    setFuelType(
      (listing?.fuelType as (typeof fuelOptions)[number]) ?? "Petrol",
    );
    setSeats(String(listing?.seats ?? 5));
    setDoors(String(listing?.doors ?? 4));
    setMileage(String(listing?.mileage ?? ""));
    setHasDailyLimit(Boolean(listing?.hasDailyLimit));
    setDailyMileageLimit(
      listing?.dailyMileageLimit ? String(listing.dailyMileageLimit) : "",
    );
    setCondition(listing?.condition ?? "excellent");
    setPlate(listing?.plate ?? "");
    setChassis(listing?.chassis ?? "");
    setEngine(listing?.engine ?? "");
    const nextLocation = splitListingLocation(listing?.location);
    setParish(
      listing?.parishCode
        ? (getParishLabelFromCode(listing.parishCode) ?? "")
        : nextLocation.parish,
    );
    setPickupAddress(nextLocation.pickupAddress);
    setOffersKingstonAirport(
      Boolean(
        listing?.approvedPickupPointIds?.includes(
          KINGSTON_AIRPORT_PICKUP_POINT_ID,
        ),
      ),
    );
    setOffersMbjAirport(
      Boolean(
        listing?.approvedPickupPointIds?.includes(
          MBJ_AIRPORT_PICKUP_POINT_ID,
        ),
      ),
    );
    setDescription(listing?.description ?? "");
    setDailyRate(listing?.dailyRate ? String(listing.dailyRate) : "");
    setWeeklyRate(listing?.weeklyRate ? String(listing.weeklyRate) : "");
    setBlockedDates(listing?.blockedDates ?? []);
    setBlockedDateDraft(listing?.blockedDates[0] ?? TODAY_ISO);
    setQueuedPhotos([]);
    setErrorText(null);
    setActiveVehicleDropdown(null);
  }, [listing]);

  const buildPayload = (
    status: VehicleListing["status"],
  ): VehicleListingPayload => {
    const parishCode = getParishCodeFromLabel(parish);
    const airportPointIds = [
      offersKingstonAirport ? KINGSTON_AIRPORT_PICKUP_POINT_ID : null,
      offersMbjAirport ? MBJ_AIRPORT_PICKUP_POINT_ID : null,
    ].filter((pointId): pointId is string => Boolean(pointId));

    return {
      category,
      make: make.trim(),
      model: model.trim(),
      color: color.trim(),
      transmission,
      fuelType,
      seats: Number(seats || 0),
      doors: Number(doors || 0),
      mileage: Number(mileage || 0),
      hasDailyLimit,
      dailyMileageLimit: hasDailyLimit ? Number(dailyMileageLimit || 0) : null,
      condition: condition ?? "excellent",
      plate: plate.trim().toUpperCase(),
      chassis: chassis.trim().toUpperCase(),
      engine: engine.trim().toUpperCase(),
      parishCode,
      approvedPickupPointIds: [
        ...getDefaultApprovedPickupPointIds(parishCode),
        ...airportPointIds,
      ],
      location: formatListingLocation(parish, pickupAddress),
      description: description.trim(),
      dailyRate: Number(dailyRate || 0),
      weeklyRate: Number(weeklyRate || 0),
      status,
      blockedDates,
    };
  };

  const validate = () => {
    if (
      !make.trim() ||
      !model.trim() ||
      !color.trim() ||
      !parish.trim() ||
      !pickupAddress.trim() ||
      !plate.trim() ||
      !chassis.trim() ||
      !engine.trim() ||
      !dailyRate.trim() ||
      !weeklyRate.trim() ||
      !mileage.trim() ||
      !seats.trim() ||
      !doors.trim() ||
      !condition
    ) {
      setErrorText(
        "Complete the required listing, pricing, and vehicle details.",
      );
      return false;
    }

    if (hasDailyLimit && !dailyMileageLimit.trim()) {
      setErrorText("Add a daily mileage limit or turn that option off.");
      return false;
    }

    if (!Number.isInteger(Number(seats)) || Number(seats) < 1) {
      setErrorText("Seating capacity must be a whole number greater than zero.");
      return false;
    }

    if (!Number.isInteger(Number(doors)) || Number(doors) < 1) {
      setErrorText("Doors must be a whole number greater than zero.");
      return false;
    }

    if (totalSelectedPhotoCount > maxListingPhotos) {
      setErrorText(
        `Each listing can include up to ${maxListingPhotos} photos.`,
      );
      return false;
    }

    setErrorText(null);
    return true;
  };

  const addBlockedDate = () => {
    if (!isIsoDate(blockedDateDraft)) {
      setErrorText("Choose a valid blocked date.");
      return;
    }

    setBlockedDates((current) =>
      [...new Set([...current, blockedDateDraft])].sort(),
    );
    setErrorText(null);
  };

  const removeBlockedDate = (dateToRemove: string) => {
    setBlockedDates((current) =>
      current.filter((date) => date !== dateToRemove),
    );
  };

  const saveListing = async (status: VehicleListing["status"]) => {
    if (!token) {
      setErrorText("You are not signed in.");
      return;
    }

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(status);
      const response = listing
        ? await updateVehicleListing(token, listing.id, payload)
        : await createVehicleListing(token, payload);

      let nextVehicle: VehicleListing = {
        ...response.vehicle,
        category: response.vehicle.category ?? payload.category,
        parishCode: response.vehicle.parishCode ?? payload.parishCode,
        approvedPickupPointIds:
          response.vehicle.approvedPickupPointIds ?? payload.approvedPickupPointIds,
      };

      if (queuedPhotos.length > 0) {
        setUploadingPhotos(true);
        const photoResponse = await uploadVehiclePhotos(
          token,
          nextVehicle.id,
          queuedPhotos,
        );
        nextVehicle = photoResponse.vehicle;
        setQueuedPhotos([]);
      }

      onSaved(
        nextVehicle,
        status === "draft"
          ? "Draft saved"
          : listing
          ? "Listing updated"
          : "Listing created",
      );

      if (status === "draft") {
        onSaveDraftMessage();
      }
      onCloseAfterSave();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to save this vehicle listing.",
      );
    } finally {
      setSaving(false);
      setUploadingPhotos(false);
    }
  };

  const pickListingPhotos = async () => {
    try {
      const remainingSlots = maxListingPhotos - totalSelectedPhotoCount;
      if (remainingSlots <= 0) {
        setErrorText(
          `Each listing can include up to ${maxListingPhotos} photos.`,
        );
        return;
      }

      const assets = await pickUploadAssets({
        allowMultiple: true,
        maxSelections: remainingSlots,
        title: "Select listing photos",
      });
      if (!assets?.length) {
        return;
      }

      setQueuedPhotos((current) => [
        ...current,
        ...assets.slice(0, remainingSlots),
      ]);
      setErrorText(null);
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to select listing photos.",
      );
    }
  };

  const removePhoto = async (photoId?: string) => {
    if (!token || !listing || !photoId) {
      return;
    }

    try {
      setRemovingPhotoId(photoId);
      const response = await deleteVehiclePhoto(token, listing.id, photoId);
      onSaved(response.vehicle, "Listing photo removed");
      onDeletePhoto(listing.id, photoId);
    } catch (error) {
      Alert.alert(
        "Unable to remove photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRemovingPhotoId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlayPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OverlayHeader
        title={isEditing ? "Edit listing" : "Create listing"}
        subtitle={
          listing ? getListingStatusLabel(listing.status) : "New listing"
        }
        onBack={onBack}
        actionLabel='Save draft'
        onAction={() => {
          void saveListing("draft");
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.vehicleScroll}>
        <View style={styles.infoCard}>
          <Ionicons
            name='car-sport-outline'
            size={18}
            color={palette.primary}
          />
          <Text style={styles.infoCardText}>
            Owners can create, edit, deactivate, price, and block dates per
            vehicle from this screen.
          </Text>
        </View>

        <View style={styles.vehicleCategoryFieldWrap}>
          <MiniDropdownSelector
            label='Category'
            value={category}
            options={vehicleCategoryOptions}
            placeholder='Select category'
            fullWidth
            containedMenu
            menuMaxHeight={280}
            open={activeVehicleDropdown === "category"}
            onToggle={() =>
              setActiveVehicleDropdown((current) =>
                current === "category" ? null : "category",
              )
            }
            onSelect={(value) => {
              setCategory(value);
              setActiveVehicleDropdown(null);
            }}
          />
        </View>

        <InputField
          label='Make'
          value={make}
          onChangeText={setMake}
          placeholder='Vehicle make'
          icon='car-outline'
        />

        <InputField
          label='Model'
          value={model}
          onChangeText={setModel}
          placeholder='Vehicle model'
          icon='car-sport-outline'
        />

        <MiniDropdownSelector
          label='Parish'
          value={parish}
          options={jamaicaParishOptions}
          placeholder='Select parish'
          fullWidth
          containedMenu
          menuMaxHeight={280}
          open={activeVehicleDropdown === "parish"}
          onToggle={() =>
            setActiveVehicleDropdown((current) =>
              current === "parish" ? null : "parish",
            )
          }
          onSelect={(value) => {
            setParish(value);
            setActiveVehicleDropdown(null);
          }}
        />

        <InputField
          label='Pickup address'
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholder='Street, district, or handoff address'
          icon='location-outline'
        />

        <View style={styles.infoCard}>
          <Ionicons
            name='location-outline'
            size={18}
            color={palette.primary}
          />
          <Text style={styles.infoCardText}>
            The parish handoff point for {parish || "the selected parish"} is
            included automatically. Turn on airport handoff only if you can
            coordinate MBJ or Kingston pickups after the booking is approved.
          </Text>
        </View>

        <ToggleRow
          title='Offer Kingston airport pickup/drop-off'
          subtitle='Norman Manley International Airport handoff'
          value={offersKingstonAirport}
          onValueChange={() =>
            setOffersKingstonAirport((current) => !current)
          }
        />
        <ToggleRow
          title='Offer MBJ airport pickup/drop-off'
          subtitle='Donald Sangster International Airport handoff'
          value={offersMbjAirport}
          onValueChange={() => setOffersMbjAirport((current) => !current)}
        />

        <View style={styles.vehicleChoiceStack}>
          <MiniDropdownSelector
            label='Transmission'
            value={transmission}
            options={transmissionOptions}
            fullWidth
            open={activeVehicleDropdown === "transmission"}
            onToggle={() =>
              setActiveVehicleDropdown((current) =>
                current === "transmission" ? null : "transmission",
              )
            }
            onSelect={(value) => {
              setTransmission(value);
              setActiveVehicleDropdown(null);
            }}
          />
          <MiniDropdownSelector
            label='Fuel'
            value={fuelType}
            options={fuelOptions}
            fullWidth
            open={activeVehicleDropdown === "fuel"}
            onToggle={() =>
              setActiveVehicleDropdown((current) =>
                current === "fuel" ? null : "fuel",
              )
            }
            onSelect={(value) => {
              setFuelType(value);
              setActiveVehicleDropdown(null);
            }}
          />
        </View>

        <InputField
          label='Color'
          value={color}
          onChangeText={setColor}
          placeholder='Vehicle color'
          icon='color-palette-outline'
        />

        <View style={styles.vehicleChoiceGrid}>
          <View style={styles.formColumn}>
            <InputField
              label='Seating capacity'
              value={seats}
              onChangeText={(value) => setSeats(onlyDigits(value))}
              keyboardType='number-pad'
              placeholder='Seating capacity'
            />
          </View>
          <View style={styles.formColumn}>
            <InputField
              label='Doors'
              value={doors}
              onChangeText={(value) => setDoors(onlyDigits(value))}
              keyboardType='number-pad'
              placeholder='Doors'
            />
          </View>
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>Mileage</Text>
          <Ionicons
            name='help-circle-outline'
            size={16}
            color={palette.onSurfaceVariant}
          />
        </View>
        <InputField
          label='Current odometer (km)'
          value={mileage}
          onChangeText={(value) => setMileage(onlyDigits(value))}
          keyboardType='number-pad'
          placeholder='Current odometer (km)'
          suffix={<Text style={styles.inlineSuffix}>km</Text>}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleTitle}>Set daily mileage limit</Text>
          <Switch
            value={hasDailyLimit}
            onValueChange={setHasDailyLimit}
            thumbColor={hasDailyLimit ? palette.primary : "#F7F7F7"}
            trackColor={{
              false: palette.outlineStrong,
              true: palette.glowPrimary,
            }}
          />
        </View>

        {hasDailyLimit ? (
          <InputField
            label='Daily mileage limit'
            value={dailyMileageLimit}
            onChangeText={(value) => setDailyMileageLimit(onlyDigits(value))}
            keyboardType='number-pad'
            placeholder='Maximum km per day'
            suffix={<Text style={styles.inlineSuffix}>km</Text>}
          />
        ) : null}

        <Text style={styles.inputLabel}>Condition</Text>
        <View style={styles.conditionRow}>
          <ConditionCard
            icon='star'
            title='Excellent'
            subtitle='Near-new'
            selected={condition === "excellent"}
            accent={palette.success}
            onPress={() => setCondition("excellent")}
          />
          <ConditionCard
            icon='thumbs-up'
            title='Good'
            subtitle='Normal wear'
            selected={condition === "good"}
            accent={palette.onSurface}
            onPress={() => setCondition("good")}
          />
          <ConditionCard
            icon='thumbs-down'
            title='Fair'
            subtitle='Visible wear'
            selected={condition === "fair"}
            accent={palette.secondary}
            onPress={() => setCondition("fair")}
          />
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningCardText}>
            These details are required for verification and will not be shown
            publicly.
          </Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <InputField
              label='Daily rate'
              value={dailyRate}
              onChangeText={(value) => setDailyRate(onlyDigits(value))}
              keyboardType='number-pad'
              placeholder='Daily rate'
              suffix={<Text style={styles.inlineSuffix}>JMD</Text>}
            />
          </View>
          <View style={styles.formColumn}>
            <InputField
              label='Weekly rate'
              value={weeklyRate}
              onChangeText={(value) => setWeeklyRate(onlyDigits(value))}
              keyboardType='number-pad'
              placeholder='Weekly rate'
              suffix={<Text style={styles.inlineSuffix}>JMD</Text>}
            />
          </View>
        </View>

        <InputField
          label='Licence plate'
          value={plate}
          onChangeText={(value) => setPlate(value.toUpperCase())}
          placeholder='Licence plate'
          icon='ticket-outline'
        />

        <InputField
          label='Chassis number (VIN)'
          value={chassis}
          onChangeText={(value) => setChassis(value.toUpperCase())}
          placeholder='Chassis number (VIN)'
          icon='car-outline'
        />
        <Text style={styles.helperText}>
          Found on the driver's door frame or dashboard
        </Text>

        <InputField
          label='Engine number'
          value={engine}
          onChangeText={(value) => setEngine(value.toUpperCase())}
          placeholder='Engine number'
          icon='settings-outline'
        />
        <Text style={styles.helperText}>
          Found on the engine block or logbook
        </Text>

        <InputField
          label='Listing description'
          value={description}
          onChangeText={setDescription}
          placeholder='Tell renters about the vehicle, condition, and pickup expectations.'
          icon='document-text-outline'
        />

        <DatePickerField
          label='Add blocked date'
          value={blockedDateDraft}
          onChange={setBlockedDateDraft}
          icon='calendar-outline'
          minimumDate={TODAY_ISO}
        />
        <Pressable
          style={styles.inlineAddButton}
          onPress={addBlockedDate}>
          <Ionicons name='add-circle-outline' size={16} color={palette.primary} />
          <Text style={styles.inlineAddButtonText}>Add blocked date</Text>
        </Pressable>
        {blockedDates.length ? (
          <View style={styles.blockedDateList}>
            {blockedDates.map((date) => (
              <Pressable
                key={date}
                style={styles.blockedDateChip}
                onPress={() => removeBlockedDate(date)}>
                <Text style={styles.blockedDateChipText}>
                  {formatPickerFieldDate(date)}
                </Text>
                <Ionicons
                  name='close-circle'
                  size={16}
                  color={palette.onSurfaceVariant}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>
            No blocked dates added yet. Tap a date above to add it.
          </Text>
        )}

        <SectionLabel title='LISTING PHOTOS' />
        <SectionCard>
          <Text style={styles.helperText}>
            Select multiple exterior and interior photos from your gallery or
            Files. Photos are stored in Cloudinary and linked to this listing.
          </Text>
          <Text style={styles.helperText}>
            {totalSelectedPhotoCount}/{maxListingPhotos} photo slots used
          </Text>

          <Pressable
            style={styles.fullWidthPrimaryButton}
            onPress={() => {
              void pickListingPhotos();
            }}>
            <Text style={styles.fullWidthPrimaryButtonText}>Select photos</Text>
          </Pressable>

          {queuedPhotos.length ? (
            <View style={styles.photoQueueList}>
              {queuedPhotos.map((photo, index) => (
                <View
                  key={`${photo.uri}-${index}`}
                  style={styles.photoQueueRow}>
                  <Text style={styles.photoQueueText}>{photo.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {listing?.photos.length ? (
            <View style={styles.photoQueueList}>
              {listing.photos.map((photo) => (
                <View
                  key={photo._id || photo.public_id}
                  style={styles.photoQueueRow}>
                  <Text style={styles.photoQueueText}>
                    {photo.public_id.split("/").slice(-1)[0]}
                  </Text>
                  <Pressable
                    onPress={() => void removePhoto(photo._id)}
                    disabled={removingPhotoId === photo._id}>
                    <Text style={styles.removeText}>
                      {removingPhotoId === photo._id ? "Removing..." : "Remove"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.pendingText}>
              No listing photos uploaded yet.
            </Text>
          )}
        </SectionCard>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </ScrollView>

      <View style={styles.footerActionBar}>
        <Pressable
          style={[
            styles.fullWidthPrimaryButton,
            (saving || uploadingPhotos) && styles.sheetButtonDisabled,
          ]}
          onPress={() => {
            void saveListing(
              listing?.status === "inactive" ? "inactive" : "active",
            );
          }}
          disabled={saving || uploadingPhotos}>
          {saving || uploadingPhotos ? (
            <ActivityIndicator color={palette.onPrimary} />
          ) : (
            <Text style={styles.fullWidthPrimaryButtonText}>
              {isEditing ? "Save listing" : "Create listing"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getUserInitials(user: AuthUser | null) {
  const name = user?.name?.trim();

  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  }

  const email = user?.email?.trim();
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "ME";
}

function getLicenseStatus(
  user: AuthUser | null,
): LicenseVerificationStatus | "missing" {
  if (!user?.license?.url) {
    return "missing";
  }

  return user.license.status ?? "pending";
}

function getLicenseStatusLabel(user: AuthUser | null, missingLabel: string) {
  switch (getLicenseStatus(user)) {
    case "pending":
      return "Pending verification";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return missingLabel;
  }
}

function getLicensePill(user: AuthUser | null) {
  switch (getLicenseStatus(user)) {
    case "pending":
      return {
        label: "Pending review",
        icon: "time-outline" as const,
        backgroundColor: "rgba(246,179,37,0.18)",
        textColor: palette.secondary,
      };
    case "rejected":
      return {
        label: "Needs update",
        icon: "alert-circle-outline" as const,
        backgroundColor: "rgba(255,102,102,0.18)",
        textColor: palette.error,
      };
    case "verified":
      return {
        label: "Verified",
        icon: "checkmark" as const,
        backgroundColor: palette.primary,
        textColor: palette.onPrimary,
      };
    default:
      return {
        label: "License needed",
        icon: "card-outline" as const,
        backgroundColor: palette.surfaceVariant,
        textColor: palette.onSurfaceSoft,
      };
  }
}

function getProfileCompletionPercent(user: AuthUser | null) {
  if (!user) {
    return 0;
  }

  const requiredChecks = [
    Boolean(user.name.trim()),
    Boolean(user.phone.trim()),
    Boolean(user.license?.url && user.license.status !== "rejected"),
  ];

  if (user.role === "Owner") {
    requiredChecks.push(Boolean(user.documents.length));
  }

  const completedChecks = requiredChecks.filter(Boolean).length;
  return Math.round((completedChecks / requiredChecks.length) * 100);
}

function formatUserDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-JM", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BookingRequestScreen({
  trip,
  pickupPoints,
  onBack,
  onApprove,
  onDecline,
}: {
  trip: MockTrip;
  pickupPoints: MockPickupPoint[];
  onBack: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [reason, setReason] = useState("");
  const pickup = pickupPoints.find((item) => item.id === trip.pickupPointId);

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Booking request' onBack={onBack} />

      <View style={styles.requestProfileCard}>
        <View style={styles.requestAvatar}>
          <Text style={styles.requestAvatarText}>
            {trip.renterName.slice(0, 1)}
          </Text>
        </View>
        <View style={styles.requestProfileBody}>
          <Text style={styles.requestName}>{trip.renterName}</Text>
          <Text style={styles.requestSubtext}>
            Requesting {trip.totalDays} days
          </Text>
        </View>
        <StatusChip label={trip.status} tone='warning' />
      </View>

      <SectionLabel title='REQUEST DETAILS' />
      <SectionCard>
        <SummaryRow label='Vehicle' value={trip.title} />
        <Divider />
        <SummaryRow
          label='Dates'
          value={`${trip.startDate} to ${trip.endDate}`}
        />
        <Divider />
        <SummaryRow
          label='Owner payout'
          value={`JMD ${trip.ownerPayout.toLocaleString()}`}
        />
        <Divider />
        <SummaryRow
          label='Pickup point'
          value={pickup ? pickup.name : "Approved point"}
        />
      </SectionCard>

      <View style={styles.infoCard}>
        <Ionicons
          name='information-circle-outline'
          size={18}
          color={palette.primary}
        />
        <Text style={styles.infoCardText}>
          Booking engine tracks status from Pending to Confirmed, Active,
          Completed, or Cancelled while preventing availability conflicts.
        </Text>
      </View>

      <View style={styles.overlayActionStack}>
        <PrimaryAction label='Approve request' onPress={onApprove} />
        <SecondaryAction
          label='Decline request'
          onPress={() => setShowDeclineReason((current) => !current)}
        />
      </View>

      {showDeclineReason ? (
        <>
          <InputField
            label='Decline reason'
            value={reason}
            onChangeText={setReason}
            placeholder='Provide the renter a short reason.'
            icon='alert-circle-outline'
          />
          <PrimaryAction
            label='Confirm decline'
            onPress={onDecline}
            compact={false}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function PayoutsScreen({
  payouts,
  balance,
  isLoading,
  errorText,
  onBack,
  onRequest,
}: {
  payouts: PayoutRequestRecord[];
  balance: PayoutBalance;
  isLoading: boolean;
  errorText: string | null;
  onBack: () => void;
  onRequest: (amount: number) => Promise<void> | void;
}) {
  const [amountText, setAmountText] = useState(String(balance.availableBalance));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestErrorText, setRequestErrorText] = useState<string | null>(null);

  useEffect(() => {
    setAmountText(String(balance.availableBalance));
  }, [balance.availableBalance]);

  const handleRequest = async () => {
    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount <= 0) {
      setRequestErrorText("Enter a valid payout amount.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setRequestErrorText(null);

    try {
      await onRequest(amount);
    } catch (error) {
      setRequestErrorText(
        error instanceof Error ? error.message : "Unable to request a payout right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Payouts' onBack={onBack} />

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available now</Text>
        <Text style={styles.balanceValue}>
          JMD {balance.availableBalance.toLocaleString()}
        </Text>
        <View style={styles.balanceStatsRow}>
          <BalanceStat
            label='Lifetime earned'
            value={`JMD ${balance.lifetimeEarned.toLocaleString()}`}
          />
          <BalanceStat
            label='Paid out'
            value={`JMD ${balance.lifetimePaidOut.toLocaleString()}`}
          />
        </View>
        <InputField
          label='Payout amount (JMD)'
          value={amountText}
          onChangeText={setAmountText}
          placeholder='0'
          icon='cash-outline'
          keyboardType='number-pad'
        />
        {requestErrorText ? <Text style={styles.errorText}>{requestErrorText}</Text> : null}
        <PrimaryAction
          label={isSubmitting ? "Submitting..." : "Request payout"}
          onPress={handleRequest}
        />
        <Text style={styles.balanceHint}>
          Owners submit payout requests in-app. Admin reviews and processes them
          manually with a transfer reference.
        </Text>
      </View>

      <SectionLabel title='HISTORY' />
      {isLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: spacing.md }} />
      ) : errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : payouts.length ? (
        payouts.map((payout) => (
          <View key={payout.id} style={styles.payoutCard}>
            <View style={styles.payoutBody}>
              <Text style={styles.payoutAmount}>
                JMD {payout.amount.toLocaleString()}
              </Text>
              <Text style={styles.payoutDate}>{formatUserDate(payout.requestedAt)}</Text>
              {payout.referenceNote ? (
                <Text style={styles.payoutReference}>
                  Reference: {payout.referenceNote}
                </Text>
              ) : null}
            </View>
            <StatusChip
              label={payout.status}
              tone={payout.status === "Processed" ? "success" : "warning"}
            />
          </View>
        ))
      ) : (
        <Text style={styles.balanceHint}>No payout requests yet.</Text>
      )}
    </ScrollView>
  );
}

function AdminPreviewScreen({
  onBack,
  openClaimCount,
  onOpenDamageClaims,
}: {
  onBack: () => void;
  openClaimCount: number;
  onOpenDamageClaims: () => void;
}) {
  const modules = [
    ["Dashboard", "Active bookings, revenue overview, flagged disputes"],
    ["Users", "View, suspend, or ban accounts"],
    ["Listings", "Approve, suspend, or remove listings"],
    ["Disputes", "Review damage claims and trigger charges"],
    ["Payouts", "View requests and mark as processed"],
    ["Pickup points", "Manage approved handoff locations"],
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.overlayScroll}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Admin panel preview' onBack={onBack} />

      <View style={styles.infoCard}>
        <Ionicons name='desktop-outline' size={18} color={palette.primary} />
        <Text style={styles.infoCardText}>
          The agreement includes a web admin panel. This mobile preview maps the
          modules so the product scope is visible inside the React Native shell.
        </Text>
      </View>

      <Pressable style={styles.adminModuleCard} onPress={onOpenDamageClaims}>
        <Text style={styles.adminModuleTitle}>Open damage claims</Text>
        <Text style={styles.adminModuleSubtitle}>
          {openClaimCount === 0
            ? "No submitted, disputed, or uncharged approved claims right now."
            : `${openClaimCount} claim${openClaimCount === 1 ? "" : "s"} need review or charge action.`}
        </Text>
      </Pressable>

      {modules.map(([title, subtitle]) => (
        <View key={title} style={styles.adminModuleCard}>
          <Text style={styles.adminModuleTitle}>{title}</Text>
          <Text style={styles.adminModuleSubtitle}>{subtitle}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function OverlayHeader({
  title,
  subtitle,
  onBack,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.overlayHeader}>
      <Pressable style={styles.iconButton} onPress={onBack}>
        <Ionicons name='chevron-back' size={20} color={palette.onSurface} />
      </Pressable>
      <View style={styles.overlayHeaderCenter}>
        <Text style={styles.overlayTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.overlaySubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.headerActionGhost} onPress={onAction}>
          <Text style={styles.headerActionGhostText}>{actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.iconButtonGhost} />
      )}
    </View>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={palette.primary} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function SectionBlock({
  title,
  items,
  children,
}: {
  title: string;
  items: unknown[];
  children: React.ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <SectionLabel title={title.toUpperCase()} />
      <View style={styles.stackGap}>{children}</View>
    </>
  );
}

function TripCard({
  trip,
  onOpenTrip,
  onOpenChat,
}: {
  trip: MockTrip;
  onOpenTrip: () => void;
  onOpenChat: () => void;
}) {
  return (
    <View style={styles.tripCard}>
      <View style={[styles.tripAccent, { backgroundColor: trip.accent }]} />
      <View style={styles.tripCardBody}>
        <View style={styles.tripTopRow}>
          <Text style={styles.tripTitle}>{trip.title}</Text>
          <StatusChip label={trip.status} tone={statusTone(trip.status)} />
        </View>
        <Text style={styles.tripSubtitle}>
          {trip.location} · {trip.startDate} to {trip.endDate}
        </Text>
        <Text style={styles.tripMeta}>
          {trip.totalDays} days · JMD {trip.totalAmount.toLocaleString()}
        </Text>
        <View style={styles.tripButtonRow}>
          <PrimaryAction label='View booking' onPress={onOpenTrip} compact />
          <SecondaryAction label='Message' onPress={onOpenChat} />
        </View>
      </View>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsRow({
  icon,
  title,
  value,
  trailing,
  iconTint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  trailing?: React.ReactNode;
  iconTint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowIconWrap}>
        <Ionicons
          name={icon}
          size={18}
          color={iconTint ?? palette.onSurfaceVariant}
        />
      </View>

      <View style={styles.settingsRowBody}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        {value ? <Text style={styles.settingsRowValue}>{value}</Text> : null}
      </View>

      {trailing ?? (
        <Ionicons
          name='chevron-forward'
          size={18}
          color={palette.onSurfaceVariant}
        />
      )}
    </Pressable>
  );
}

function TimelineRow({
  title,
  subtitle,
  state,
}: {
  title: string;
  subtitle: string;
  state: string;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineBody}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.timelineState}>{state}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function SelectionCard({
  title,
  subtitle,
  note,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  note: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectionCard, selected && styles.selectionCardSelected]}
      onPress={onPress}>
      <View style={styles.selectionCardRadioWrap}>
        <View
          style={[
            styles.selectionCardRadio,
            selected && styles.selectionCardRadioSelected,
          ]}
        />
      </View>
      <View style={styles.selectionCardBody}>
        <Text style={styles.selectionCardTitle}>{title}</Text>
        <Text style={styles.selectionCardSubtitle}>{subtitle}</Text>
        <Text style={styles.selectionCardNote}>{note}</Text>
      </View>
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <View style={styles.toggleSettingsRow}>
      <View style={styles.toggleSettingsBody}>
        <Text style={styles.toggleSettingsTitle}>{title}</Text>
        <Text style={styles.toggleSettingsSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? palette.primary : "#F7F7F7"}
        trackColor={{
          false: palette.outlineStrong,
          true: palette.glowPrimary,
        }}
      />
    </View>
  );
}

function DashboardMetric({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning" | "info" | "success";
  onPress?: () => void;
}) {
  const toneMap = {
    primary: "rgba(33,216,160,0.14)",
    warning: "rgba(246,179,37,0.14)",
    info: "rgba(94,161,255,0.14)",
    success: "rgba(74,222,128,0.14)",
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: toneMap[tone] },
        pressed && styles.pressableCardPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function TaskRow({
  task,
  onPress,
}: {
  task: { title: string; detail: string; tone: "primary" | "warning" | "info" };
  onPress?: () => void;
}) {
  const accent =
    task.tone === "warning"
      ? palette.secondary
      : task.tone === "info"
      ? palette.info
      : palette.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskRow,
        pressed && styles.pressableCardPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={[styles.taskDot, { backgroundColor: accent }]} />
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDetail}>{task.detail}</Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={18}
        color={palette.onSurfaceVariant}
      />
    </Pressable>
  );
}

function BalanceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.balanceStat}>
      <Text style={styles.balanceStatLabel}>{label}</Text>
      <Text style={styles.balanceStatValue}>{value}</Text>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  focused,
  keyboardType,
  suffix,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  textContentType,
  autoComplete,
  onFocus,
  onBlur,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon?: keyof typeof Ionicons.glyphMap;
  focused?: boolean;
  keyboardType?: "default" | "number-pad";
  suffix?: React.ReactNode;
  autoCapitalize?: "none" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  textContentType?:
    | "none"
    | "name"
    | "creditCardNumber"
    | "creditCardSecurityCode";
  autoComplete?: "off" | "name" | "cc-number" | "cc-csc";
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={palette.onSurfaceVariant}
            style={styles.inputIcon}
          />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={palette.onSurfaceVariant}
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          textContentType={textContentType}
          autoComplete={autoComplete}
          maxLength={maxLength}
          selectionColor={palette.primary}
        />
        {suffix}
      </View>
    </View>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  icon,
  minimumDate,
  maximumDate,
  open,
  hideInlinePicker,
  onToggle,
  onClose,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  minimumDate?: string;
  maximumDate?: string;
  open?: boolean;
  hideInlinePicker?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const togglePicker = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setInternalOpen((current) => !current);
  };

  const closePicker = () => {
    if (onClose) {
      onClose();
      return;
    }
    setInternalOpen(false);
  };

  const pickerValue = isIsoDate(value)
    ? parseIsoDateToLocalDate(value)
    : minimumDate && isIsoDate(minimumDate)
    ? parseIsoDateToLocalDate(minimumDate)
    : new Date();

  const handleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      closePicker();
      if (event.type === "dismissed" || !selectedDate) {
        return;
      }
      onChange(formatLocalDateToIso(selectedDate));
      return;
    }

    if (selectedDate) {
      onChange(formatLocalDateToIso(selectedDate));
    }
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable onPress={togglePicker}>
        <View style={[styles.inputShell, isOpen && styles.inputShellFocused]}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={palette.onSurfaceVariant}
              style={styles.inputIcon}
            />
          ) : null}
          <Text style={styles.datePickerFieldValue}>
            {formatPickerFieldDate(value)}
          </Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={palette.onSurfaceVariant}
          />
        </View>
      </Pressable>

      {isOpen && !hideInlinePicker ? (
        <View style={styles.datePickerCard}>
          <View style={styles.datePickerWheelWrap}>
            <DateTimePicker
              value={pickerValue}
              mode='date'
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleChange}
              textColor={palette.onSurface}
              themeVariant='dark'
              accentColor={palette.primary}
              style={Platform.OS === "ios" ? styles.datePickerWheel : undefined}
              minimumDate={
                minimumDate && isIsoDate(minimumDate)
                  ? parseIsoDateToLocalDate(minimumDate)
                  : undefined
              }
              maximumDate={
                maximumDate && isIsoDate(maximumDate)
                  ? parseIsoDateToLocalDate(maximumDate)
                  : undefined
              }
            />
          </View>
          {Platform.OS === "ios" ? (
            <Pressable
              style={styles.datePickerDoneButton}
              onPress={closePicker}>
              <Text style={styles.datePickerDoneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function InlineDatePickerPanel({
  value,
  onChange,
  minimumDate,
  maximumDate,
  onDone,
}: {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  onDone: () => void;
}) {
  const pickerValue = isIsoDate(value)
    ? parseIsoDateToLocalDate(value)
    : minimumDate && isIsoDate(minimumDate)
    ? parseIsoDateToLocalDate(minimumDate)
    : new Date();

  const handleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      onDone();
      if (event.type === "dismissed" || !selectedDate) {
        return;
      }
      onChange(formatLocalDateToIso(selectedDate));
      return;
    }

    if (selectedDate) {
      onChange(formatLocalDateToIso(selectedDate));
    }
  };

  return (
    <View style={styles.datePickerCard}>
      <View style={styles.datePickerWheelWrap}>
        <DateTimePicker
          value={pickerValue}
          mode='date'
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          textColor={palette.onSurface}
          themeVariant='dark'
          accentColor={palette.primary}
          style={Platform.OS === "ios" ? styles.datePickerWheel : undefined}
          minimumDate={
            minimumDate && isIsoDate(minimumDate)
              ? parseIsoDateToLocalDate(minimumDate)
              : undefined
          }
          maximumDate={
            maximumDate && isIsoDate(maximumDate)
              ? parseIsoDateToLocalDate(maximumDate)
              : undefined
          }
        />
      </View>
      {Platform.OS === "ios" ? (
        <Pressable style={styles.datePickerDoneButton} onPress={onDone}>
          <Text style={styles.datePickerDoneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PaymentSheetField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  textContentType,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  textContentType?:
    | "none"
    | "name"
    | "creditCardNumber"
    | "creditCardSecurityCode";
  autoComplete?: "off" | "name" | "cc-number" | "cc-csc";
  maxLength?: number;
}) {
  return (
    <View style={styles.paymentFieldGroup}>
      <Text style={styles.paymentFieldLabel}>{label}</Text>
      <TextInput
        style={styles.paymentFieldInput}
        placeholder={placeholder}
        placeholderTextColor='#6F767E'
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
        autoComplete={autoComplete}
        maxLength={maxLength}
        selectionColor={palette.primary}
      />
    </View>
  );
}

function MiniDropdownSelector<T extends string>({
  label,
  value,
  options,
  placeholder,
  fullWidth,
  containedMenu = true,
  menuMaxHeight = 280,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  placeholder?: string;
  fullWidth?: boolean;
  containedMenu?: boolean;
  menuMaxHeight?: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  const menuContent = options.map((option) => {
    const selected = option === value;

    return (
      <Pressable
        key={option}
        style={[
          styles.miniSelectorOption,
          selected && styles.miniSelectorOptionSelected,
        ]}
        onPress={() => onSelect(option)}>
        <Text
          style={[
            styles.miniSelectorOptionText,
            selected && styles.miniSelectorOptionTextSelected,
          ]}>
          {option}
        </Text>
        {selected ? (
          <Ionicons
            name='checkmark'
            size={16}
            color={palette.primary}
          />
        ) : null}
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.miniSelector,
        fullWidth && styles.miniSelectorFullWidth,
        open && styles.miniSelectorOpen,
      ]}>
      <Pressable onPress={onToggle}>
        <Text style={styles.miniSelectorLabel}>{label}</Text>
        <View style={styles.miniSelectorValueRow}>
          <Text
            style={[
              styles.miniSelectorValue,
              !value && styles.miniSelectorValuePlaceholder,
            ]}>
            {value || placeholder || "Select an option"}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={palette.onSurfaceVariant}
          />
        </View>
      </Pressable>

      {open ? (
        containedMenu ? (
          <ScrollView
            style={[
              styles.miniSelectorMenu,
              styles.miniSelectorMenuContained,
              { maxHeight: menuMaxHeight },
            ]}
            contentContainerStyle={styles.miniSelectorMenuContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}>
            {menuContent}
          </ScrollView>
        ) : (
          <View style={styles.miniSelectorMenu}>{menuContent}</View>
        )
      ) : null}
    </View>
  );
}

function ConditionCard({
  icon,
  title,
  subtitle,
  selected,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.conditionCard,
        selected && {
          borderColor: accent,
          backgroundColor: "rgba(255,255,255,0.02)",
        },
      ]}
      onPress={onPress}>
      <Ionicons
        name={icon}
        size={20}
        color={selected ? accent : palette.onSurface}
      />
      <Text style={styles.conditionTitle}>{title}</Text>
      <Text style={styles.conditionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardInput(value: string) {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatCardPreview(value: string) {
  const digits = onlyDigits(value);
  if (!digits) {
    return "**** **** **** 2424";
  }
  return `**** **** **** ${digits.slice(-4).padStart(4, "*")}`;
}

function formatExpiryInput(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function normalizeNameInput(value: string) {
  return value.replace(/\s{2,}/g, " ").replace(/^\s+/, "");
}

function detectCardBrand(value: string): CardBrand {
  const digits = onlyDigits(value);
  if (digits.startsWith("4")) {
    return "visa";
  }
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
    return "mastercard";
  }
  if (/^3[47]/.test(digits)) {
    return "amex";
  }
  if (digits.startsWith("6011") || digits.startsWith("65")) {
    return "discover";
  }
  return "default";
}

function getBrandLabel(brand: CardBrand) {
  switch (brand) {
    case "visa":
      return "VISA";
    case "mastercard":
      return "MC";
    case "amex":
      return "AMEX";
    case "discover":
      return "DISC";
    default:
      return "CARD";
  }
}

function getCardBackground(brand: CardBrand) {
  switch (brand) {
    case "visa":
      return { backgroundColor: "#2850F0" };
    case "mastercard":
      return { backgroundColor: "#FF5A1F" };
    case "amex":
      return { backgroundColor: "#1FA5A9" };
    case "discover":
      return { backgroundColor: "#F97316" };
    default:
      return { backgroundColor: palette.primary };
  }
}

function passesLuhn(value: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return value.length > 0 && sum % 10 === 0;
}

function isValidExpiry(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return false;
  }
  const month = Number(match[1]);
  return month >= 1 && month <= 12;
}

function isValidCvv(value: string, brand: CardBrand) {
  const digits = onlyDigits(value);
  return digits.length === (brand === "amex" ? 4 : 3);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayIso() {
  return formatLocalDateToIso(new Date());
}

function parseIsoDateToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDateToIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPickerFieldDate(value: string) {
  if (!isIsoDate(value)) {
    return "Select a date";
  }

  const parsed = parseIsoDateToLocalDate(value);
  return parsed.toLocaleDateString("en-JM", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDaysIso(value: string, days: number) {
  const parsed = parseIsoDateToLocalDate(value);
  parsed.setDate(parsed.getDate() + days);
  return formatLocalDateToIso(parsed);
}

function getBookingDates(startDate: string, endDate: string) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate <= startDate) {
    return [];
  }

  const days: string[] = [];
  const cursor = parseIsoDateToLocalDate(startDate);
  const end = parseIsoDateToLocalDate(endDate);

  while (cursor < end) {
    days.push(formatLocalDateToIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getChatIdForTrip(tripId: string) {
  return `chat-${tripId}`;
}

function formatRelativeDateTime(value?: string) {
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return parsed.toLocaleDateString("en-JM", {
    month: "short",
    day: "numeric",
  });
}

function formatChatMessageTime(value?: string) {
  if (!value) {
    return "Now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Now";
  }

  return parsed.toLocaleTimeString("en-JM", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapBookingToTrip(booking: BookingRecord): MockTrip {
  return {
    id: booking.id,
    vehicleId: booking.vehicleId,
    ownerId: booking.ownerId,
    renterId: booking.renterId,
    title: booking.title,
    location: booking.location,
    status: booking.status,
    startDate: formatBookingCardDate(booking.startDate),
    endDate: formatBookingCardDate(booking.endDate),
    startDateIso: booking.startDate,
    endDateIso: booking.endDate,
    totalDays: booking.totalDays,
    totalAmount: booking.totalAmount,
    ownerPayout: booking.ownerPayout,
    ownerName: booking.ownerName,
    renterName: booking.renterName,
    accent:
      booking.status === "Pending"
        ? palette.info
        : booking.status === "Cancelled"
          ? palette.secondary
          : palette.primary,
    pickupPointId: booking.pickupPointId,
    dropoffPointId: booking.dropoffPointId,
    notes: booking.notes,
    canReview: booking.status === "Completed" && !booking.reviewedByMe,
    canReportDamage: booking.status === "Completed",
  };
}

function mapBookingToChat(
  booking: BookingRecord,
  currentUserId: string | null,
) {
  const isOwnerView = currentUserId === booking.ownerId;
  const participantName = isOwnerView ? booking.renterName : booking.ownerName;
  const participantRole = isOwnerView ? "Renter" : "Owner";
  if (!booking.messages.length) {
    return null;
  }

  const messages = booking.messages.map((message) => ({
    id: message.id,
    sender:
      message.senderRole === "system"
        ? ("system" as const)
        : currentUserId &&
            ((message.senderRole === "owner" &&
              booking.ownerId === currentUserId) ||
              (message.senderRole === "renter" &&
                booking.renterId === currentUserId))
          ? ("self" as const)
          : ("other" as const),
    body: message.body,
    time: formatChatMessageTime(message.createdAt),
  }));
  const lastMessage = messages[messages.length - 1];
  const blockedContactAttempts =
    booking.moderation?.blockedContactAttempts
    ?? booking.messages.filter((message) => message.kind === "blocked-contact").length;
  const flaggedForReview = Boolean(booking.moderation?.flaggedForReview);

  return {
    id: getChatIdForTrip(booking.id),
    bookingId: booking.id,
    participantName,
    participantRole,
    vehicle: booking.title,
    unreadCount: 0,
    lastMessage: lastMessage?.body ?? "Booking thread started.",
    updatedAt: formatRelativeDateTime(
      booking.messages[booking.messages.length - 1]?.createdAt ??
        booking.updatedAt ??
        booking.createdAt,
    ),
    blockedAttempt: blockedContactAttempts > 0,
    blockedContactAttempts,
    flaggedForReview,
    messages,
  };
}

function upsertChat(currentChats: MockChat[], nextChat: MockChat) {
  const existingIndex = currentChats.findIndex((chat) => chat.id === nextChat.id);
  if (existingIndex === -1) {
    return [nextChat, ...currentChats];
  }

  return currentChats.map((chat) => (chat.id === nextChat.id ? nextChat : chat));
}

function mapNotificationToMockNotification(
  notification: AppNotificationRecord,
): MockNotification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    receivedAt: formatRelativeDateTime(
      notification.createdAt ?? notification.updatedAt,
    ),
    type: notification.type,
    unread: notification.unread,
  };
}

function synchronizeTrips(trips: MockTrip[]) {
  return trips.map((trip) => synchronizeTripStatus(trip));
}

function upsertDamageClaim(
  currentClaims: DamageClaimRecord[],
  nextClaim: DamageClaimRecord,
) {
  const exists = currentClaims.some((claim) => claim.id === nextClaim.id);

  if (!exists) {
    return [nextClaim, ...currentClaims];
  }

  return currentClaims.map((claim) =>
    claim.id === nextClaim.id ? nextClaim : claim,
  );
}

function synchronizeTripStatus(trip: MockTrip) {
  const startDateIso = trip.startDateIso;
  const endDateIso = trip.endDateIso;

  if (!startDateIso || !endDateIso || !isIsoDate(startDateIso) || !isIsoDate(endDateIso)) {
    return trip;
  }

  let nextStatus = trip.status;

  if (trip.status === "Confirmed") {
    if (TODAY_ISO >= endDateIso) {
      nextStatus = "Completed";
    } else if (TODAY_ISO >= startDateIso) {
      nextStatus = "Active";
    }
  } else if (trip.status === "Active" && TODAY_ISO >= endDateIso) {
    nextStatus = "Completed";
  }

  return {
    ...trip,
    status: nextStatus,
    canReview: nextStatus === "Completed" ? true : trip.canReview,
    canReportDamage: nextStatus === "Completed" ? true : trip.canReportDamage,
  };
}

function findConflictingTrip(
  trips: MockTrip[],
  vehicle: VehicleListing,
  startDateIso: string,
  endDateIso: string,
) {
  return trips
    .map((trip) => synchronizeTripStatus(trip))
    .find((trip) => {
      if (!trip.startDateIso || !trip.endDateIso) {
        return false;
      }

      if (
        trip.status === "Cancelled" ||
        trip.status === "Completed"
      ) {
        return false;
      }

      const matchesVehicle =
        trip.vehicleId === vehicle.id ||
        trip.title.trim().toLowerCase() === getListingTitle(vehicle).trim().toLowerCase();

      return (
        matchesVehicle &&
        datesOverlap(startDateIso, endDateIso, trip.startDateIso, trip.endDateIso)
      );
    });
}

function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA < endB && startB < endA;
}

function formatBookingCardDate(value: string) {
  const parsed = parseIsoDateToLocalDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-JM", {
    month: "short",
    day: "numeric",
  });
}

function formatVehicleDetailDateTime(value: string) {
  const parsed = parseIsoDateToLocalDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-JM", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatCheckoutDateLabel(value: string) {
  const parsed = parseIsoDateToLocalDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-JM", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function calculateBookingTotal(totalDays: number, vehicle: VehicleListing) {
  const fullWeeks = Math.floor(totalDays / 7);
  const extraDays = totalDays % 7;
  return fullWeeks * vehicle.weeklyRate + extraDays * vehicle.dailyRate;
}

function splitListingLocation(location?: string) {
  const rawLocation = location?.trim() ?? "";
  if (!rawLocation) {
    return {
      parish: "" as (typeof jamaicaParishOptions)[number] | "",
      pickupAddress: "",
    };
  }

  const detectedParish = getListingParish(rawLocation);
  if (detectedParish === "Other") {
    return {
      parish: "" as (typeof jamaicaParishOptions)[number] | "",
      pickupAddress: rawLocation,
    };
  }

  const parishPattern = detectedParish.replace(".", "\\.");
  const pickupAddress = rawLocation
    .replace(new RegExp(`(?:,|·)?\\s*${parishPattern}\\s*$`, "i"), "")
    .replace(/\s*(,|·)\s*$/, "")
    .trim();

  return {
    parish: detectedParish,
    pickupAddress: pickupAddress || rawLocation,
  };
}

function formatListingLocation(parish: string, pickupAddress: string) {
  const cleanParish = parish.trim();
  const cleanPickupAddress = pickupAddress.trim().replace(/\s{2,}/g, " ");

  if (!cleanPickupAddress) {
    return cleanParish;
  }

  if (!cleanParish) {
    return cleanPickupAddress;
  }

  return `${cleanPickupAddress}, ${cleanParish}`;
}

function getListingSubtitle(listing: VehicleListing) {
  return `${listing.location} · ${listing.transmission} · ${listing.fuelType}`;
}

function getListingStatusLabel(status: VehicleListing["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    default:
      return "Draft";
  }
}

function getListingAccent(status: VehicleListing["status"]) {
  switch (status) {
    case "active":
      return palette.primary;
    case "inactive":
      return palette.secondary;
    default:
      return palette.info;
  }
}

function statusTone(
  status: string,
): "success" | "warning" | "info" | "neutral" | "error" {
  switch (status) {
    case "Active":
    case "Confirmed":
    case "Processed":
    case "Verified":
      return "success";
    case "Pending":
      return "warning";
    case "Cancelled":
      return "error";
    case "Draft":
      return "info";
    default:
      return "neutral";
  }
}

function iconForNotification(type: MockNotification["type"]) {
  switch (type) {
    case "booking":
      return "calendar-outline";
    case "chat":
      return "chatbubble-outline";
    case "payment":
      return "card-outline";
    case "claim":
      return "shield-outline";
    case "payout":
      return "wallet-outline";
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  page: {
    flex: 1,
    backgroundColor: palette.background,
    paddingTop: spacing.xs,
  },
  pagePadded: {
    paddingHorizontal: spacing.screen,
  },
  pageFullBleedOverlay: {
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
  },
  bodyFullBleedOverlay: {
    marginHorizontal: 0,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pageHeaderText: {
    flex: 1,
  },
  pageTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.displaySmall,
  },
  pageSubtitle: {
    color: palette.onSurfaceSoft,
    ...typography.bodyMedium,
  },
  pageHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.secondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    color: palette.onSecondary,
    ...typography.labelSmall,
  },
  scrollContent: {
    paddingBottom: spacing.hero,
    gap: spacing.lg,
  },
  discoveryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  discoveryTitleWrap: {
    flex: 1,
  },
  discoveryEyebrow: {
    color: palette.onSurfaceVariant,
    marginBottom: spacing.xs,
    ...typography.labelLarge,
  },
  discoveryHeading: {
    color: palette.onSurface,
    ...typography.displaySmall,
  },
  discoveryActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverySearchBar: {
    minHeight: 62,
    borderRadius: radii.xxl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    paddingLeft: spacing.md,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  discoverySearchPrompt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  discoverySearchText: {
    color: palette.onSurfaceVariant,
    ...typography.titleMedium,
  },
  discoverySearchButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: palette.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryCategoryRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  discoveryCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  discoveryCategoryChipSelected: {
    backgroundColor: "#F4F4F4",
    borderColor: "#F4F4F4",
  },
  discoveryCategoryLabel: {
    color: palette.onSurfaceVariant,
    ...typography.labelLarge,
  },
  discoveryCategoryLabelSelected: {
    color: "#111111",
  },
  discoverySpotlightCard: {
    backgroundColor: "#121519",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.xxl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  discoverySpotlightCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  discoverySpotlightTitle: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  discoverySpotlightText: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  discoverySection: {
    gap: spacing.md,
  },
  discoverySectionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  discoverySectionSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  discoverySectionLink: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  discoveryRail: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  discoveryVehicleCard: {
    width: 152,
    backgroundColor: "transparent",
  },
  discoveryVehicleMedia: {
    height: 108,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    marginBottom: 8,
  },
  discoveryVehicleImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111418",
  },
  discoveryVehicleFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryFavoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(17,17,17,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryVehicleBody: {
    gap: 1,
  },
  discoveryVehicleTitle: {
    color: palette.onSurface,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  discoveryVehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
    marginBottom: 6,
  },
  discoveryVehicleMeta: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  discoveryVehiclePriceStack: {
    gap: 0,
  },
  discoveryVehiclePrice: {
    color: palette.onSurface,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  overlayScroll: {
    paddingBottom: spacing.hero,
  },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  heroEyebrow: {
    color: palette.primary,
    marginBottom: spacing.xs,
    ...typography.labelLarge,
  },
  heroTitle: {
    color: palette.onSurface,
    marginBottom: spacing.sm,
    ...typography.displaySmall,
  },
  heroSubtitle: {
    color: palette.onSurfaceSoft,
    ...typography.bodyMedium,
  },
  heroButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonCompact: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  primaryButtonText: {
    color: palette.onPrimary,
    ...typography.labelLarge,
  },
  secondaryButton: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.outlineStrong,
    backgroundColor: palette.surfaceVariant,
  },
  secondaryButtonCompact: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonText: {
    color: palette.onSurface,
    ...typography.labelLarge,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickCard: {
    width: "48%",
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    minHeight: 138,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(33,216,160,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.titleLarge,
  },
  quickSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  sectionMeta: {
    color: palette.onSurfaceVariant,
    ...typography.labelMedium,
  },
  browseGalleryRow: {
    gap: spacing.md,
  },
  browseGalleryCard: {
    width: 312,
    height: 212,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surface,
  },
  browseGalleryImage: {
    width: "100%",
    height: "100%",
  },
  browseGalleryFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutScreen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  checkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  checkoutBackButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(24,24,27,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBackButtonGhost: {
    width: 52,
    height: 52,
  },
  checkoutTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  checkoutScroll: {
    flex: 1,
  },
  checkoutScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 176,
    gap: spacing.xl,
  },
  checkoutVehicleCard: {
    backgroundColor: "#090909",
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#1E1E23",
    gap: spacing.md,
  },
  checkoutVehicleTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkoutVehicleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  checkoutVehicleTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  checkoutVehicleMeta: {
    color: "#C0C0C6",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "500",
  },
  checkoutVehicleInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingTop: 2,
  },
  checkoutVehicleInfoCopy: {
    flex: 1,
    gap: 4,
  },
  checkoutVehicleInfoText: {
    color: "#F1F1F4",
    fontSize: 16,
    lineHeight: 24,
  },
  checkoutVehicleInfoSingle: {
    flex: 1,
    color: "#F1F1F4",
    fontSize: 16,
    lineHeight: 24,
  },
  checkoutVehicleThumb: {
    width: 118,
    height: 92,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#17171B",
  },
  checkoutVehicleThumbImage: {
    width: "100%",
    height: "100%",
  },
  checkoutVehicleThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutEditTripButton: {
    marginTop: -8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(33,216,160,0.12)",
    borderWidth: 1,
    borderColor: "rgba(33,216,160,0.24)",
  },
  checkoutEditTripButtonText: {
    color: palette.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  checkoutEditorCard: {
    backgroundColor: "#090909",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#1E1E23",
    padding: spacing.lg,
    gap: spacing.md,
  },
  checkoutEditorLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  checkoutSection: {
    borderTopWidth: 8,
    borderTopColor: "#2A2A30",
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  checkoutSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  checkoutSectionTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  checkoutLoginButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3A3A42",
    backgroundColor: "#1F1F23",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutLoginButtonText: {
    color: "#F7F7F9",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  checkoutFieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkoutFieldHalf: {
    flex: 1,
  },
  checkoutCountryField: {
    width: 128,
    gap: 8,
  },
  checkoutPhoneField: {
    flex: 1,
    gap: 8,
  },
  checkoutFieldLabel: {
    color: "#F4F4F7",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  checkoutTextFieldShell: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#34343B",
    backgroundColor: "#090909",
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  checkoutTextFieldInput: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 0,
  },
  checkoutDropdownField: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#34343B",
    backgroundColor: "#090909",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutDropdownValue: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
  },
  checkoutDropdownMenu: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#34343B",
    backgroundColor: "#121216",
    overflow: "hidden",
  },
  checkoutDropdownScroller: {
    maxHeight: 220,
  },
  checkoutDropdownOption: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutDropdownOptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 21,
  },
  checkoutHelperText: {
    color: "#D9D9DE",
    fontSize: 15,
    lineHeight: 22,
  },
  checkoutHelperTextMuted: {
    color: "#9797A0",
    fontSize: 15,
    lineHeight: 22,
    marginTop: -6,
    marginBottom: 4,
  },
  checkoutInfoBanner: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: "#0F2F23",
    borderRadius: 20,
    padding: spacing.md,
  },
  checkoutInfoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7CD7B3",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutInfoBannerText: {
    flex: 1,
    color: "#E8FFF5",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  checkoutBodyCopy: {
    color: "#F2F2F4",
    fontSize: 17,
    lineHeight: 26,
  },
  checkoutActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 92,
  },
  checkoutActionRowIcon: {
    width: 34,
    alignItems: "center",
  },
  checkoutActionRowCopy: {
    flex: 1,
    gap: 4,
  },
  checkoutActionRowTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  checkoutActionRowText: {
    color: "#DBDBE0",
    fontSize: 16,
    lineHeight: 24,
  },
  checkoutAddButton: {
    minHeight: 50,
    minWidth: 94,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3A3A42",
    backgroundColor: "#242429",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  checkoutAddButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  checkoutRadioCard: {
    borderRadius: 24,
    backgroundColor: "#2A2A2F",
    borderWidth: 1,
    borderColor: "#3A3A40",
    overflow: "hidden",
  },
  checkoutRadioRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  checkoutRadioCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  checkoutRadioHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  checkoutRadioTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  checkoutRadioPrice: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  checkoutRadioText: {
    color: "#BEBEC6",
    fontSize: 16,
    lineHeight: 24,
  },
  checkoutRadioDivider: {
    height: 1,
    backgroundColor: "#414149",
    marginHorizontal: spacing.lg,
  },
  checkoutSavingsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkoutSavingsText: {
    color: palette.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  checkoutSummaryCard: {
    gap: spacing.md,
  },
  checkoutSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  checkoutSummaryLabel: {
    color: "#EFEFF2",
    fontSize: 17,
    lineHeight: 22,
  },
  checkoutSummaryValue: {
    color: "#EFEFF2",
    fontSize: 17,
    lineHeight: 22,
  },
  checkoutSummaryFreeValue: {
    color: palette.primary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  checkoutSummaryDivider: {
    height: 1,
    backgroundColor: "#303036",
    marginVertical: spacing.xs,
  },
  checkoutSummaryTotalLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  checkoutSummaryTotalValue: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  checkoutSavingBanner: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: "#053D2A",
    borderRadius: 22,
    padding: spacing.md,
  },
  checkoutSavingBannerCopy: {
    flex: 1,
    gap: 2,
  },
  checkoutSavingBannerTitle: {
    color: "#E9FFF5",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  checkoutSavingBannerText: {
    color: "#D4FBEA",
    fontSize: 15,
    lineHeight: 22,
  },
  checkoutProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
    marginBottom: 2,
  },
  checkoutProviderBadgePink: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F597C2",
  },
  checkoutProviderBadgeGreen: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#1CC15C",
  },
  checkoutProviderBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  checkoutProviderBadgeTextDark: {
    color: "#23192B",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  checkoutProviderWordmark: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  checkoutPaymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutPaymentIconChip: {
    minWidth: 58,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutPaymentIconChipText: {
    color: "#000000",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },
  checkoutPromoRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#303036",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutPromoRowText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  checkoutPromoEditor: {
    marginTop: spacing.sm,
  },
  checkoutConsentGroup: {
    borderTopWidth: 8,
    borderTopColor: "#2A2A30",
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  checkoutConsentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkoutConsentText: {
    flex: 1,
    color: "#EDEDF0",
    fontSize: 16,
    lineHeight: 24,
  },
  checkoutBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg + 10,
    backgroundColor: "rgba(16,16,18,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#2A2A30",
  },
  checkoutBottomPriceStack: {
    flex: 1,
    gap: 2,
  },
  checkoutBottomPrice: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  checkoutBottomNote: {
    color: "#A7A7AF",
    fontSize: 15,
    lineHeight: 20,
  },
  checkoutBottomButton: {
    minWidth: 160,
    minHeight: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.primary,
  },
  checkoutBottomButtonText: {
    color: "#08110E",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  vehicleDetailScreen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  vehicleDetailScroll: {
    flex: 1,
    backgroundColor: "#050505",
  },
  vehicleDetailScrollContent: {
    paddingBottom: 156,
  },
  vehicleDetailHero: {
    position: "relative",
    backgroundColor: "#0A0A0A",
  },
  vehicleDetailHeroSlide: {
    height: 308,
    backgroundColor: "#111418",
  },
  vehicleDetailHeroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111418",
  },
  vehicleDetailHeroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDetailHeroTopRow: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleDetailTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  vehicleDetailCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(22,22,22,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDetailPhotoCount: {
    position: "absolute",
    left: spacing.lg,
    bottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(39,39,46,0.9)",
  },
  vehicleDetailPhotoCountText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  vehicleDetailContent: {
    backgroundColor: "#050505",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  vehicleDetailSummaryCard: {
    backgroundColor: "#0C0C0E",
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: "#1E1E24",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  vehicleDetailSummaryEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  vehicleDetailSummaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(33,216,160,0.12)",
    borderWidth: 1,
    borderColor: "rgba(33,216,160,0.22)",
  },
  vehicleDetailSummaryBadgeText: {
    color: palette.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  vehicleDetailSummaryYearBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#16161A",
    borderWidth: 1,
    borderColor: "#26262D",
  },
  vehicleDetailSummaryYearText: {
    color: "#D2D2D8",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  vehicleDetailTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  vehicleDetailSummarySubtitle: {
    color: "#9C9CA5",
    fontSize: 15,
    lineHeight: 21,
  },
  vehicleDetailSummaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  vehicleDetailSummaryRatingWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleDetailMetaLine: {
    color: "#B8B8BE",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  vehicleDetailHostBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(33,216,160,0.08)",
    borderWidth: 1,
    borderColor: "rgba(33,216,160,0.18)",
  },
  vehicleDetailHostBadge: {
    color: palette.primary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  vehicleDetailSummaryDivider: {
    height: 1,
    backgroundColor: "#1B1B21",
  },
  vehicleDetailPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  vehicleDetailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: "47%",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#17171B",
    borderWidth: 1,
    borderColor: "#24242B",
  },
  vehicleDetailPillText: {
    color: "#F5F5F7",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  vehicleDetailSection: {
    borderTopWidth: 8,
    borderTopColor: "#2A2A2F",
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  vehicleDetailSectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  vehicleDetailSectionBody: {
    color: "#E4E4E7",
    fontSize: 16,
    lineHeight: 24,
  },
  vehicleDetailInfoCard: {
    backgroundColor: "#090909",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#202026",
    overflow: "hidden",
  },
  vehicleDetailInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  vehicleDetailInfoIcon: {
    width: 34,
    alignItems: "center",
    paddingTop: 2,
  },
  vehicleDetailInfoCopy: {
    flex: 1,
    gap: 4,
  },
  vehicleDetailInfoTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  vehicleDetailInfoText: {
    color: "#C8C8CE",
    fontSize: 16,
    lineHeight: 22,
  },
  vehicleDetailInfoAction: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#232328",
    borderWidth: 1,
    borderColor: "#36363D",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDetailSectionDivider: {
    height: 1,
    backgroundColor: "#1D1D22",
    marginHorizontal: spacing.md,
  },
  vehicleDetailSimpleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  vehicleDetailSimpleRowCopy: {
    flex: 1,
    gap: 4,
  },
  vehicleDetailSimpleRowTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
  },
  vehicleDetailSimpleRowText: {
    color: "#AFAFB6",
    fontSize: 15,
    lineHeight: 22,
  },
  vehicleDetailListCard: {
    backgroundColor: "#090909",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#1F1F24",
    overflow: "hidden",
  },
  vehicleDetailListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  vehicleDetailListText: {
    flex: 1,
    color: "#F1F1F4",
    fontSize: 16,
    lineHeight: 22,
  },
  vehicleDetailReviewSummary: {
    color: "#F4F4F7",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  vehicleDetailRatingsWrap: {
    gap: spacing.sm,
  },
  vehicleDetailRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  vehicleDetailRatingLabel: {
    width: 108,
    color: "#E3E3E7",
    fontSize: 16,
    lineHeight: 22,
  },
  vehicleDetailRatingBar: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#27272E",
    overflow: "hidden",
  },
  vehicleDetailRatingFill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  vehicleDetailRatingValue: {
    width: 32,
    textAlign: "right",
    color: "#F2F2F5",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  vehicleDetailReviewRail: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  vehicleDetailReviewCard: {
    width: 286,
    minHeight: 172,
    backgroundColor: "#1B1B1F",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#2A2A31",
    padding: spacing.md,
    gap: spacing.sm,
  },
  vehicleDetailReviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  vehicleDetailReviewMeta: {
    color: "#CBCBD1",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  vehicleDetailReviewText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },
  vehicleDetailGhostButton: {
    minHeight: 54,
    borderRadius: radii.xl,
    backgroundColor: "#1F1F23",
    borderWidth: 1,
    borderColor: "#33333A",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDetailGhostButtonText: {
    color: "#F3F3F5",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  vehicleDetailHostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  vehicleDetailHostAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#2A2A30",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDetailHostAvatarText: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  vehicleDetailHostCopy: {
    flex: 1,
    gap: 4,
  },
  vehicleDetailHostName: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  vehicleDetailHostMeta: {
    color: "#C9C9CF",
    fontSize: 16,
    lineHeight: 22,
  },
  vehicleDetailExtraCard: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  vehicleDetailExtraTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  vehicleDetailExtraBody: {
    color: "#C1C1C7",
    fontSize: 16,
    lineHeight: 24,
  },
  vehicleDetailExtraPrice: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  vehicleDetailFooterLinks: {
    alignItems: "center",
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  vehicleDetailFooterLink: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  vehicleDetailBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg + 10,
    backgroundColor: "rgba(16,16,18,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#2A2A30",
  },
  vehicleDetailPriceStack: {
    flex: 1,
    gap: 2,
  },
  vehicleDetailPriceStrike: {
    color: "#8C8C95",
    fontSize: 16,
    lineHeight: 21,
    textDecorationLine: "line-through",
  },
  vehicleDetailPriceNow: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  vehicleDetailPriceNote: {
    color: "#A7A7AE",
    fontSize: 14,
    lineHeight: 18,
  },
  vehicleDetailContinueButton: {
    minWidth: 160,
    minHeight: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  vehicleDetailContinueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  vehicleGalleryOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.97)",
    zIndex: 40,
  },
  vehicleGalleryOverlaySlide: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  vehicleGalleryOverlayImage: {
    width: "100%",
    height: "100%",
  },
  vehicleGalleryOverlayFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleGalleryOverlayTopRow: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleGalleryOverlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(22,22,22,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleGalleryOverlayCount: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(22,22,22,0.64)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  vehicleGalleryOverlayCountText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  vehicleCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: "hidden",
  },
  vehicleArt: {
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleImage: {
    width: "100%",
    height: 168,
    backgroundColor: "#111418",
  },
  vehicleBody: {
    padding: spacing.md,
  },
  vehicleName: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.headlineSmall,
  },
  vehicleMeta: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  vehicleHost: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  detailBodyText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  detailMetaText: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.md,
    ...typography.bodySmall,
  },
  vehicleFooter: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ratingText: {
    color: palette.onSurface,
    ...typography.labelMedium,
  },
  vehiclePrice: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  searchShell: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterChipText: {
    color: palette.onSurfaceSoft,
    ...typography.labelMedium,
  },
  toggleShell: {
    alignSelf: "flex-start",
    flexDirection: "row",
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  toggleButtonSelected: {
    backgroundColor: palette.primary,
  },
  toggleButtonText: {
    color: palette.onSurfaceVariant,
    ...typography.labelLarge,
  },
  toggleButtonTextSelected: {
    color: palette.onPrimary,
  },
  mapPreviewCard: {
    borderRadius: radii.xxl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.lg,
  },
  mapPreviewTitle: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  mapPreviewSubtitle: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...typography.bodySmall,
  },
  mapCanvas: {
    height: 248,
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.xl,
    backgroundColor: "#0E1218",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: spacing.md,
  },
  mapIslandViewport: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    overflow: "hidden",
    borderRadius: radii.xl,
    position: "relative",
  },
  mapIslandSvg: {
    width: "100%",
    height: "100%",
  },
  mapBackdropGlowA: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -34,
    left: -18,
    backgroundColor: "rgba(33,216,160,0.1)",
  },
  mapBackdropGlowB: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -72,
    right: -24,
    backgroundColor: "rgba(94,161,255,0.12)",
  },
  mapMarkerTapTarget: {
    position: "absolute",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
  },
  mapLegendInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  mapLegendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mapLegendChipText: {
    color: palette.onSurfaceSoft,
    ...typography.labelSmall,
  },
  mapLegendMetaInline: {
    color: palette.onSurfaceVariant,
    flexShrink: 1,
    ...typography.bodySmall,
  },
  mapAreaScroller: {
    marginBottom: spacing.md,
  },
  mapAreaChipRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  mapAreaChip: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.surfaceVariant,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  mapAreaChipSelected: {
    backgroundColor: "rgba(33,216,160,0.14)",
    borderColor: "rgba(33,216,160,0.4)",
  },
  mapAreaChipText: {
    color: palette.onSurfaceSoft,
    ...typography.labelMedium,
  },
  mapAreaChipTextSelected: {
    color: palette.primary,
  },
  mapSummaryCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: palette.outline,
    marginBottom: spacing.md,
  },
  mapSummaryTitle: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  mapSummaryText: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  resultCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: "hidden",
  },
  resultContentPressable: {
    flexDirection: "row",
  },
  resultCardAccent: {
    width: 6,
  },
  resultImage: {
    width: 124,
    minHeight: 156,
    backgroundColor: palette.surfaceVariant,
  },
  resultCardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  resultTitleWrap: {
    flex: 1,
  },
  resultPriceWrap: {
    alignItems: "flex-end",
  },
  resultTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  resultSubtitle: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  resultSpecs: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  resultMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  resultPrice: {
    color: palette.primary,
    ...typography.titleMedium,
  },
  resultPriceLabel: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  resultHostBlock: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
  },
  resultHostLabel: {
    color: palette.onSurfaceVariant,
    ...typography.labelSmall,
  },
  resultHostName: {
    color: palette.onSurface,
    marginTop: 4,
    ...typography.bodyMedium,
  },
  resultActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  statusChip: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  statusChipText: {
    ...typography.labelLarge,
  },
  sectionLabel: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    ...typography.labelSmall,
  },
  stackGap: {
    gap: spacing.sm,
  },
  tripCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    flexDirection: "row",
    overflow: "hidden",
  },
  tripAccent: {
    width: 6,
  },
  tripCardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tripTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tripTitle: {
    flex: 1,
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  tripSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  tripMeta: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  tripButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chatCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  chatBody: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 2,
  },
  chatName: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  chatTime: {
    color: palette.onSurfaceVariant,
    ...typography.labelMedium,
  },
  chatVehicle: {
    color: palette.primary,
    marginBottom: spacing.xs,
    ...typography.labelMedium,
  },
  chatPreview: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  chatWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chatWarningText: {
    flex: 1,
    color: palette.secondary,
    ...typography.bodySmall,
  },
  unreadBubble: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBubbleText: {
    color: palette.onPrimary,
    ...typography.labelLarge,
  },
  profileScroll: {
    paddingBottom: spacing.hero,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2A3A27",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatarInitials: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  profileIdentity: {
    flex: 1,
  },
  profileName: {
    color: palette.onSurface,
    marginBottom: 2,
    ...typography.headlineLarge,
  },
  profileEmail: {
    color: palette.onSurfaceVariant,
    marginBottom: spacing.sm,
    ...typography.bodySmall,
  },
  personalInfoBio: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  licensePreview: {
    width: "100%",
    height: 260,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.surfaceVariant,
  },
  licenseDocCard: {
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  licenseDocIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  licenseDocTitle: {
    color: palette.onSurface,
    textAlign: "center",
    ...typography.titleLarge,
  },
  licenseDocText: {
    color: palette.onSurfaceVariant,
    textAlign: "center",
    ...typography.bodySmall,
  },
  licenseReviewTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.titleLarge,
  },
  licenseReviewText: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  licenseEmptyState: {
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  licenseEmptyTitle: {
    color: palette.onSurface,
    textAlign: "center",
    ...typography.titleLarge,
  },
  licenseEmptyText: {
    color: palette.onSurfaceVariant,
    textAlign: "center",
    ...typography.bodySmall,
  },
  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.primary,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  verifiedPillText: {
    color: palette.onPrimary,
    ...typography.labelLarge,
  },
  hostStatusPill: {
    alignSelf: "flex-start",
    backgroundColor: palette.secondary,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  hostStatusPillText: {
    color: palette.onSecondary,
    ...typography.labelLarge,
  },
  modeCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modeCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  modeTitle: {
    color: palette.onSurface,
    marginBottom: 2,
    ...typography.titleLarge,
  },
  modeSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  inlineModeSwitch: {
    flexDirection: "row",
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    padding: 4,
    gap: 4,
  },
  inlineModeOptionActive: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  inlineModeOptionActiveText: {
    color: palette.onPrimary,
    ...typography.labelLarge,
  },
  inlineModeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  inlineModeOptionText: {
    color: palette.onSurfaceSoft,
    ...typography.labelLarge,
  },
  sectionCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    marginBottom: spacing.sm,
    overflow: "hidden",
    padding: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  progressTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  progressValue: {
    color: palette.primary,
    ...typography.titleLarge,
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: palette.surfaceVariant,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: palette.primary,
  },
  progressHint: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  settingsRowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: palette.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowBody: {
    flex: 1,
  },
  settingsRowTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  settingsRowValue: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  divider: {
    height: 1,
    backgroundColor: palette.outline,
    marginVertical: spacing.md,
  },
  overlayPage: {
    flex: 1,
    backgroundColor: palette.background,
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  overlayHeaderCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  overlayTitle: {
    color: palette.onSurface,
    textAlign: "center",
    letterSpacing: -0.2,
    ...typography.headlineSmall,
  },
  overlaySubtitle: {
    color: palette.onSurfaceVariant,
    textAlign: "center",
    marginTop: 2,
    ...typography.bodySmall,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonGhost: {
    width: 40,
    height: 40,
  },
  headerActionGhost: {
    minWidth: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerActionGhostText: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  sheetHandle: {
    width: 78,
    height: 4,
    borderRadius: 99,
    backgroundColor: palette.outlineStrong,
    alignSelf: "center",
    marginTop: 2,
    marginBottom: spacing.md,
  },
  paymentScroll: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: spacing.hero,
    gap: spacing.md,
  },
  sheetTitle: {
    color: palette.onSurface,
    marginBottom: spacing.md,
    ...typography.headlineSmall,
  },
  savedMethodStrip: {
    marginBottom: spacing.sm,
  },
  savedMethodStripTitle: {
    color: palette.onSurfaceSoft,
    marginBottom: spacing.xs,
    ...typography.labelLarge,
  },
  savedMethodList: {
    gap: spacing.xs,
  },
  savedMethodRow: {
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  savedMethodBody: {
    flex: 1,
  },
  savedMethodChip: {
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedMethodChipText: {
    color: palette.onSurface,
    ...typography.labelMedium,
  },
  savedMethodMetaText: {
    color: palette.onSurfaceVariant,
    marginTop: 2,
    ...typography.bodySmall,
  },
  savedMethodRemoveButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedMethodRemoveText: {
    color: palette.error,
    ...typography.labelLarge,
  },
  liveCard: {
    height: 176,
    borderRadius: 26,
    padding: 18,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: palette.shadow,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 12,
  },
  liveCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveCardBrand: {
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.6,
    ...typography.labelLarge,
  },
  liveCardBrandPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  liveCardBrandPillText: {
    color: "#FFFFFF",
    ...typography.labelLarge,
  },
  liveCardNumber: {
    color: "#FFFFFF",
    letterSpacing: 1.8,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  liveCardBottom: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  liveCardCaption: {
    color: "rgba(255,255,255,0.74)",
    marginBottom: 6,
    letterSpacing: 0.8,
    ...typography.labelSmall,
  },
  liveCardValue: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  inputGroup: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    color: palette.onSurfaceSoft,
    marginBottom: 10,
    ...typography.labelLarge,
  },
  inputShell: {
    minHeight: 60,
    borderRadius: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  inputShellFocused: {
    borderColor: palette.primary,
    shadowColor: palette.glowPrimary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: palette.onSurface,
    paddingVertical: spacing.sm,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "500",
  },
  datePickerFieldValue: {
    flex: 1,
    color: palette.onSurface,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "500",
    paddingVertical: spacing.sm,
  },
  datePickerCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    overflow: "hidden",
  },
  datePickerWheelWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
  },
  datePickerWheel: {
    alignSelf: "center",
    width: 300,
    transform: [{ scaleX: 0.9 }],
  },
  datePickerDoneButton: {
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    paddingVertical: spacing.sm,
  },
  datePickerDoneText: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  paymentFieldGroup: {
    marginTop: spacing.sm,
  },
  paymentFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8BDC7",
    marginBottom: 8,
  },
  paymentFieldInput: {
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#F5F7FA",
    backgroundColor: "#181818",
  },
  paymentFieldMetaRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  paymentFieldMetaChip: {
    backgroundColor: "rgba(41,83,242,0.96)",
    borderRadius: radii.round,
    minWidth: 86,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  paymentFieldMetaChipText: {
    color: "#FFFFFF",
    letterSpacing: 0.4,
    ...typography.labelLarge,
  },
  paymentFieldRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  paymentFieldColumn: {
    flex: 1,
  },
  paymentFieldToggle: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
  },
  paymentFieldToggleText: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  helperText: {
    color: palette.onSurfaceVariant,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "400",
  },
  brandBadge: {
    backgroundColor: "rgba(41,83,242,0.96)",
    borderRadius: radii.round,
    minWidth: 86,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  brandBadgeText: {
    color: "#FFFFFF",
    letterSpacing: 0.4,
    ...typography.labelLarge,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  formColumn: {
    flex: 1,
  },
  errorText: {
    color: palette.error,
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sheetButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  sheetButtonDisabled: {
    opacity: 0.55,
  },
  sheetButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.outlineStrong,
  },
  sheetButtonPrimaryText: {
    color: palette.onPrimary,
    ...typography.titleMedium,
  },
  sheetButtonSecondaryText: {
    color: palette.primary,
    ...typography.titleMedium,
  },
  bookingHero: {
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.outline,
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  bookingHeroArt: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingHeroBody: {
    flex: 1,
  },
  bookingHeroTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.headlineSmall,
  },
  bookingHeroSubtitle: {
    color: palette.onSurfaceVariant,
    marginBottom: spacing.sm,
    ...typography.bodySmall,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitle: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  timelineSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  timelineState: {
    color: palette.onSurfaceSoft,
    ...typography.labelLarge,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  summaryValue: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  overlayActionStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chatThreadScroll: {
    flex: 1,
  },
  chatThreadContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  moderationBanner: {
    backgroundColor: palette.bannerTint,
    borderWidth: 1,
    borderColor: "rgba(246,179,37,0.28)",
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  moderationBannerText: {
    flex: 1,
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowSelf: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubbleSelf: {
    backgroundColor: palette.primary,
  },
  messageBubbleOther: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  messageBubbleText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  messageBubbleTextSelf: {
    color: palette.onPrimary,
  },
  messageBubbleMeta: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.labelSmall,
  },
  messageBubbleMetaSelf: {
    color: "rgba(6,19,14,0.7)",
  },
  systemBubble: {
    alignSelf: "center",
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  systemBubbleText: {
    color: palette.onSurfaceSoft,
    textAlign: "center",
    ...typography.bodySmall,
  },
  chatComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    backgroundColor: palette.background,
  },
  chatComposerInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    paddingHorizontal: spacing.md,
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  chatComposerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chatComposerButtonDisabled: {
    opacity: 0.45,
  },
  overlayLead: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.md,
    ...typography.bodyMedium,
  },
  selectionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectionCardSelected: {
    borderColor: palette.primary,
    shadowColor: palette.glowPrimary,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  selectionCardRadioWrap: {
    paddingTop: 3,
  },
  selectionCardRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: palette.outlineStrong,
  },
  selectionCardRadioSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  selectionCardBody: {
    flex: 1,
  },
  selectionCardTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.titleLarge,
  },
  selectionCardSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  selectionCardNote: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoCardText: {
    flex: 1,
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  infoCardTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  infoCardLink: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoTile: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoTileText: {
    color: palette.onSurfaceVariant,
    ...typography.labelMedium,
  },
  photoTileAdd: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.primary,
    backgroundColor: "rgba(33,216,160,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoTileAddText: {
    color: palette.primary,
    ...typography.labelMedium,
  },
  reviewVehicleTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.headlineSmall,
  },
  reviewVehicleSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: palette.surfaceVariant,
  },
  tagChipSelected: {
    backgroundColor: "rgba(33,216,160,0.14)",
  },
  tagChipText: {
    color: palette.onSurfaceSoft,
    ...typography.labelLarge,
  },
  tagChipTextSelected: {
    color: palette.primary,
  },
  notificationCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notificationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(33,216,160,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    flex: 1,
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
  },
  notificationText: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  notificationTime: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.labelMedium,
  },
  toggleSettingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleSettingsBody: {
    flex: 1,
  },
  toggleSettingsTitle: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  toggleSettingsSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  hostBannerCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.lg,
  },
  hostBannerTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.headlineSmall,
  },
  hostBannerSubtitle: {
    color: palette.onSurfaceSoft,
    ...typography.bodyMedium,
  },
  dashboardMetricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    minHeight: 102,
    justifyContent: "space-between",
  },
  pressableCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  metricValue: {
    color: palette.onSurface,
    ...typography.displaySmall,
  },
  metricLabel: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  sectionLink: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  taskRow: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    color: palette.onSurface,
    marginBottom: 2,
    ...typography.titleMedium,
  },
  taskDetail: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  listingCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: "hidden",
    flexDirection: "row",
  },
  listingColorBar: {
    width: 6,
  },
  listingContent: {
    flex: 1,
    padding: spacing.md,
  },
  listingTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  listingSubtitle: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  listingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  listingRate: {
    color: palette.onSurface,
    ...typography.labelLarge,
  },
  listingMetaText: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  listingActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  calendarHero: {
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.lg,
  },
  calendarHeroTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.headlineSmall,
  },
  calendarHeroSubtitle: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  calendarRow: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  calendarDay: {
    color: palette.onSurface,
    minWidth: 64,
    ...typography.titleMedium,
  },
  calendarLabel: {
    flex: 1,
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  stepProgress: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stepProgressActive: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: palette.primary,
  },
  stepProgressMuted: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: palette.outline,
  },
  vehicleScroll: {
    paddingBottom: 120,
  },
  vehicleCategoryFieldWrap: {
    marginTop: spacing.sm,
  },
  photoQueueList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoQueueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surfaceVariant,
  },
  photoQueueText: {
    flex: 1,
    color: palette.onSurface,
    ...typography.bodySmall,
  },
  removeText: {
    color: palette.error,
    ...typography.labelLarge,
  },
  pendingText: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.md,
    ...typography.bodySmall,
  },
  vehicleChoiceGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  vehicleChoiceStack: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inlineAddButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: 4,
  },
  inlineAddButtonText: {
    color: palette.primary,
    ...typography.labelLarge,
  },
  blockedDateList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  blockedDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: palette.surfaceVariant,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  blockedDateChipText: {
    color: palette.onSurface,
    ...typography.labelLarge,
  },
  miniSelector: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    padding: spacing.md,
    position: "relative",
  },
  miniSelectorOpen: {
    borderColor: palette.primary,
    zIndex: 20,
  },
  miniSelectorFullWidth: {
    flex: 0,
    width: "100%",
    marginBottom: spacing.md,
  },
  miniSelectorLabel: {
    color: palette.onSurfaceVariant,
    marginBottom: spacing.xs,
    ...typography.labelLarge,
  },
  miniSelectorValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniSelectorValue: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  miniSelectorValuePlaceholder: {
    color: palette.onSurfaceVariant,
  },
  miniSelectorMenu: {
    position: "absolute",
    top: "100%",
    left: -1,
    right: -1,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.xs,
    gap: spacing.xs,
    shadowColor: palette.shadow,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 12,
  },
  miniSelectorMenuContained: {
    position: "relative",
    top: 0,
    left: 0,
    right: 0,
    marginTop: spacing.sm,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  miniSelectorMenuContent: {
    gap: spacing.xs,
  },
  miniSelectorOption: {
    minHeight: 42,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniSelectorOptionSelected: {
    backgroundColor: "rgba(33,216,160,0.12)",
  },
  miniSelectorOptionText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  miniSelectorOptionTextSelected: {
    color: palette.primary,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  inlineSuffix: {
    color: palette.onSurfaceVariant,
    ...typography.bodyMedium,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.lg,
  },
  toggleTitle: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  conditionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  conditionCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  conditionTitle: {
    color: palette.onSurface,
    marginTop: spacing.xs,
    ...typography.labelLarge,
  },
  conditionSubtitle: {
    color: palette.onSurfaceVariant,
    textAlign: "center",
    ...typography.labelSmall,
  },
  warningCard: {
    backgroundColor: palette.bannerTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(246,179,37,0.28)",
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningCardText: {
    color: palette.onSurfaceSoft,
    ...typography.bodySmall,
  },
  footerActionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: palette.background,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
  },
  fullWidthPrimaryButton: {
    minHeight: 58,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidthPrimaryButtonText: {
    color: palette.onPrimary,
    ...typography.titleMedium,
  },
  requestProfileCard: {
    marginTop: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  requestAvatarText: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  requestProfileBody: {
    flex: 1,
  },
  requestName: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  requestSubtext: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  balanceCard: {
    marginTop: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.lg,
  },
  balanceLabel: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  balanceValue: {
    color: palette.onSurface,
    marginTop: spacing.xs,
    ...typography.displayMedium,
  },
  balanceStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  balanceStat: {
    flex: 1,
  },
  balanceStatLabel: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  balanceStatValue: {
    color: palette.onSurface,
    marginTop: 2,
    ...typography.titleMedium,
  },
  balanceHint: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  payoutCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  payoutBody: {
    flex: 1,
  },
  payoutAmount: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  payoutDate: {
    color: palette.onSurfaceVariant,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  payoutReference: {
    color: palette.onSurfaceSoft,
    marginTop: spacing.xs,
    ...typography.bodySmall,
  },
  adminModuleCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  adminModuleTitle: {
    color: palette.onSurface,
    marginBottom: spacing.xs,
    ...typography.titleLarge,
  },
  adminModuleSubtitle: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  toast: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    bottom: 104,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.outlineStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  toastText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
});
