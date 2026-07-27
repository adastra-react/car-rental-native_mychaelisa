import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { ParishCode, VehicleListing } from "../../types/vehicle";
import { colors } from "../../theme/tokens";
import {
  DiscoveryCategoryChip,
  DiscoveryVehicleCard,
  PageActionButton,
  SecondaryAction,
} from "./discoveryComponents";
import {
  HomeVehicleCategory,
  buildRenterHomeSections,
  getBrowseListingAccent,
  getHomeVehicleCategory,
  getNearbyVehicleListings,
} from "./discoveryHelpers";
import {
  getNearestParishCode,
  getParishLabelFromCode,
} from "./location";
import { discoveryStyles as styles } from "./discoveryStyles";

const palette = colors.dark;

type Coordinates = {
  latitude: number;
  longitude: number;
};

export function RenterHomeScreen({
  unreadNotifications,
  listings,
  listingsLoading,
  listingsError,
  onSelectTrips,
  onSelectExplore,
  onOpenNotifications,
  onOpenVehicle,
}: {
  unreadNotifications: number;
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  onSelectTrips: () => void;
  onSelectExplore: () => void;
  onOpenNotifications: () => void;
  onOpenVehicle: (vehicleId: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<HomeVehicleCategory>("all");
  const [nearbyPermissionState, setNearbyPermissionState] = useState<
    "idle" | "loading" | "granted" | "denied" | "error"
  >("idle");
  const [nearbyUserCoordinates, setNearbyUserCoordinates] =
    useState<Coordinates | null>(null);
  const [nearbyParishCode, setNearbyParishCode] =
    useState<ParishCode | null>(null);
  const [nearbyStatusText, setNearbyStatusText] = useState<string | null>(null);
  const categoryChips: Array<{
    key: HomeVehicleCategory;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: "all", label: "All", icon: "car-sport" },
    { key: "nearby", label: "Nearby", icon: "navigate-outline" },
    { key: "coupes", label: "Coupes", icon: "car-sport-outline" },
    { key: "sedans", label: "Sedans", icon: "car-outline" },
    { key: "suvs", label: "SUVs", icon: "car-sport-outline" },
    { key: "vans", label: "Vans", icon: "bus-outline" },
    { key: "trucks", label: "Trucks", icon: "cube-outline" },
    { key: "buses", label: "Buses", icon: "bus" },
  ];
  const nearbyResults = useMemo(
    () => getNearbyVehicleListings(listings, nearbyParishCode),
    [listings, nearbyParishCode],
  );
  const homeCategoryListings = useMemo(() => {
    if (selectedCategory === "all") {
      return listings;
    }

    if (selectedCategory === "nearby") {
      return nearbyResults.vehicles;
    }

    return listings.filter(
      (vehicle) => getHomeVehicleCategory(vehicle) === selectedCategory,
    );
  }, [listings, nearbyResults.vehicles, selectedCategory]);
  const curatedSections = useMemo(
    () => buildRenterHomeSections(homeCategoryListings),
    [homeCategoryListings],
  );
  const isAllCategory = selectedCategory === "all";
  const selectedCategoryLabel =
    categoryChips.find((chip) => chip.key === selectedCategory)?.label ??
    "category";
  const focusedSectionTitle =
    selectedCategory === "nearby" ? "Nearby vehicles" : selectedCategoryLabel;
  const focusedSectionSubtitle =
    selectedCategory === "nearby"
      ? nearbyResults.mode === "nearby"
        ? `${homeCategoryListings.length} vehicle${
            homeCategoryListings.length === 1 ? "" : "s"
          } in ${getParishLabelFromCode(nearbyParishCode) ?? "your parish"}`
        : "Using your current parish to find active listings nearby"
      : `${homeCategoryListings.length} ${selectedCategoryLabel.toLowerCase()} vehicle${
          homeCategoryListings.length === 1 ? "" : "s"
        } available`;

  const requestNearbyAccess = async () => {
    if (nearbyPermissionState === "loading") {
      return;
    }

    setNearbyPermissionState("loading");
    setNearbyStatusText(
      "Checking which parish you are currently in...",
    );

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setNearbyPermissionState("denied");
        setNearbyUserCoordinates(null);
        setNearbyParishCode(null);
        setNearbyStatusText(
          "Location permission is needed to show vehicles near you.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setNearbyPermissionState("granted");
      const nextCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const nextParishCode = getNearestParishCode(nextCoordinates);

      setNearbyUserCoordinates(nextCoordinates);
      setNearbyParishCode(nextParishCode);
      setNearbyStatusText(
        nextParishCode
          ? null
          : "We couldn't match your location to a parish just now.",
      );
    } catch (error) {
      setNearbyPermissionState("error");
      setNearbyUserCoordinates(null);
      setNearbyParishCode(null);
      setNearbyStatusText(
        error instanceof Error
          ? error.message
          : "We couldn't read your current location just now.",
      );
    }
  };

  const handleCategoryPress = (category: HomeVehicleCategory) => {
    setSelectedCategory(category);

    if (category === "nearby" && nearbyPermissionState !== "loading") {
      void requestNearbyAccess();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.discoveryTopRow}>
        <View style={styles.discoveryTitleWrap}>
          <Text style={styles.discoveryEyebrow}>Across Jamaica</Text>
          <Text style={styles.discoveryHeading}>Search your next ride</Text>
        </View>
        <PageActionButton
          icon='notifications-outline'
          badge={unreadNotifications}
          onPress={onOpenNotifications}
        />
      </View>

      <Pressable style={styles.discoverySearchBar} onPress={onSelectExplore}>
        <View style={styles.discoverySearchPrompt}>
          <Ionicons
            name='search'
            size={18}
            color={palette.onSurfaceVariant}
          />
          <Text style={styles.discoverySearchText}>Search anywhere</Text>
        </View>
        <View style={styles.discoverySearchButton}>
          <Ionicons name='options-outline' size={18} color={palette.onPrimary} />
        </View>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.discoveryCategoryRow}>
        {categoryChips.map((chip) => (
          <DiscoveryCategoryChip
            key={chip.key}
            icon={chip.icon}
            label={chip.label}
            selected={selectedCategory === chip.key}
            onPress={() => handleCategoryPress(chip.key)}
          />
        ))}
      </ScrollView>

      <View style={styles.discoverySpotlightCard}>
        <View style={styles.discoverySpotlightCopy}>
          <Text style={styles.discoverySpotlightTitle}>Ready for the weekend?</Text>
          <Text style={styles.discoverySpotlightText}>
            Browse verified hosts, airport-friendly pickups, and book faster
            with saved preferences.
          </Text>
        </View>
        <SecondaryAction label='Open trips' onPress={onSelectTrips} compact />
      </View>

      {listingsLoading ? (
        <Text style={styles.helperText}>Loading live vehicle listings...</Text>
      ) : null}
      {listingsError ? <Text style={styles.errorText}>{listingsError}</Text> : null}
      {!listingsLoading && !listings.length ? (
        <View style={styles.infoCard}>
          <Ionicons name='car-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            No active vehicle listings are live yet. Host-created listings will
            appear here once they are activated.
          </Text>
        </View>
      ) : null}

      {!listingsLoading &&
      selectedCategory === "nearby" &&
      (nearbyStatusText || nearbyResults.mode === "empty") ? (
        <View style={styles.infoCard}>
          <Ionicons
            name={
              nearbyPermissionState === "loading"
                ? "locate-outline"
                : nearbyPermissionState === "denied" ||
                    nearbyPermissionState === "error"
                ? "location-outline"
                : "navigate-outline"
            }
            size={18}
            color={palette.primary}
          />
          <View style={styles.infoCardTextWrap}>
            {nearbyStatusText ? (
              <Text style={styles.infoCardText}>{nearbyStatusText}</Text>
            ) : null}
            {nearbyPermissionState === "denied" ? (
              <Pressable onPress={() => Linking.openSettings()}>
                <Text style={styles.infoCardLink}>Open settings</Text>
              </Pressable>
            ) : null}
            {nearbyPermissionState === "granted" &&
            nearbyResults.mode === "empty" ? (
              <Text style={styles.infoCardText}>
                No active listings were found in{" "}
                {getParishLabelFromCode(nearbyParishCode) ?? "your parish"} yet.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!listingsLoading &&
      listings.length &&
      !homeCategoryListings.length &&
      selectedCategory !== "nearby" ? (
        <View style={styles.infoCard}>
          <Ionicons name='funnel-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            No live {selectedCategoryLabel.toLowerCase()} listings matched that
            category yet.
          </Text>
        </View>
      ) : null}

      {!listingsLoading && isAllCategory && homeCategoryListings.length
        ? curatedSections.map((section) => (
            <View key={section.key} style={styles.discoverySection}>
              <View style={styles.sectionHeader}>
                <View style={styles.discoverySectionTitleWrap}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.discoverySectionSubtitle}>
                    {section.subtitle}
                  </Text>
                </View>
                <Pressable onPress={onSelectExplore}>
                  <Text style={styles.discoverySectionLink}>See all</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.discoveryRail}>
                {section.vehicles.map((vehicle, index) => (
                  <DiscoveryVehicleCard
                    key={`${section.key}-${vehicle.id}`}
                    vehicle={vehicle}
                    accent={getBrowseListingAccent(index)}
                    onPress={() => onOpenVehicle(vehicle.id)}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        : null}

      {!listingsLoading && !isAllCategory && homeCategoryListings.length ? (
        <View style={styles.discoverySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.discoverySectionTitleWrap}>
              <Text style={styles.sectionTitle}>{focusedSectionTitle}</Text>
              <Text style={styles.discoverySectionSubtitle}>
                {focusedSectionSubtitle}
              </Text>
            </View>
            <Pressable onPress={onSelectExplore}>
              <Text style={styles.discoverySectionLink}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discoveryRail}>
            {homeCategoryListings.map((vehicle, index) => (
              <DiscoveryVehicleCard
                key={`focused-${selectedCategory}-${vehicle.id}`}
                vehicle={vehicle}
                accent={getBrowseListingAccent(index)}
                onPress={() => onOpenVehicle(vehicle.id)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  );
}
