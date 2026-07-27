import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { MockPickupPoint } from "../../data/mockAppData";
import { VehicleListing } from "../../types/vehicle";
import { colors } from "../../theme/tokens";
import {
  FilterChip,
  PageHeader,
  PrimaryAction,
  SecondaryAction,
  StatusChip,
  ToggleButton,
} from "./discoveryComponents";
import {
  buildExploreMapRegions,
  getBrowseListingAccent,
  getHomeVehicleCategory,
  getListingTitle,
} from "./discoveryHelpers";
import {
  JAMAICA_OUTLINE_PATH,
  MAP_VIEWBOX,
  jamaicaParishOptions,
  getListingParish,
} from "./location";
import { discoveryStyles as styles } from "./discoveryStyles";

const palette = colors.dark;
const TODAY_ISO = formatLocalDateToIso(new Date());

type ExploreVehicleTypeFilter =
  | "all"
  | "coupes"
  | "sedans"
  | "suvs"
  | "vans"
  | "trucks"
  | "buses";

type ExplorePriceFilter =
  | "all"
  | "under-8000"
  | "8000-15000"
  | "15000-30000"
  | "30000-plus";

type ParishFilter = (typeof jamaicaParishOptions)[number] | "All";

export function ExploreScreen({
  listings,
  listingsLoading,
  listingsError,
  pickupPoints,
  onOpenVehicle,
  onStartVehicleBooking,
  onOpenPickupPoints,
}: {
  listings: VehicleListing[];
  listingsLoading: boolean;
  listingsError: string | null;
  pickupPoints: MockPickupPoint[];
  onOpenVehicle: (vehicleId: string) => void;
  onStartVehicleBooking: (vehicleId: string) => void;
  onOpenPickupPoints: () => void;
}) {
  const [search, setSearch] = useState("");
  const [listMode, setListMode] = useState<"list" | "map">("list");
  const [selectedMapArea, setSelectedMapArea] = useState<string | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<ExploreVehicleTypeFilter>("all");
  const [selectedParish, setSelectedParish] = useState<ParishFilter>("All");
  const [selectedPriceRange, setSelectedPriceRange] =
    useState<ExplorePriceFilter>("all");
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [startDate, setStartDate] = useState(addDaysIso(TODAY_ISO, 1));
  const [endDate, setEndDate] = useState(addDaysIso(TODAY_ISO, 4));
  const [activeDateField, setActiveDateField] = useState<"start" | "end" | null>(
    null,
  );

  const parishOptions = useMemo<ParishFilter[]>(() => {
    const activeParishes = new Set(
      listings.map((vehicle) => getListingParish(vehicle.location, vehicle.parishCode)),
    );

    return ["All", ...jamaicaParishOptions.filter((parish) => activeParishes.has(parish))];
  }, [listings]);

  const bookingDates = useMemo(
    () => getBookingDates(startDate, endDate),
    [endDate, startDate],
  );

  const effectiveMapArea =
    selectedMapArea ?? (selectedParish === "All" ? null : selectedParish);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((vehicle) => {
      const listingParish = getListingParish(vehicle.location, vehicle.parishCode);
      const matchesMapArea = !effectiveMapArea || listingParish === effectiveMapArea;
      const matchesVehicleType =
        selectedVehicleType === "all" ||
        getHomeVehicleCategory(vehicle) === selectedVehicleType;
      const matchesParish =
        selectedParish === "All" || listingParish === selectedParish;
      const matchesPrice = matchesPriceRange(vehicle.dailyRate, selectedPriceRange);
      const matchesAvailability =
        !availabilityOnly ||
        bookingDates.every((date) => !vehicle.blockedDates.includes(date));

      if (!query) {
        return (
          matchesMapArea &&
          matchesVehicleType &&
          matchesParish &&
          matchesPrice &&
          matchesAvailability
        );
      }

      return (
        matchesMapArea &&
        matchesVehicleType &&
        matchesParish &&
        matchesPrice &&
        matchesAvailability &&
        (getListingTitle(vehicle).toLowerCase().includes(query) ||
          vehicle.location.toLowerCase().includes(query) ||
          vehicle.transmission.toLowerCase().includes(query) ||
          vehicle.fuelType.toLowerCase().includes(query) ||
          vehicle.ownerName?.toLowerCase().includes(query) === true)
      );
    });
  }, [
    availabilityOnly,
    bookingDates,
    effectiveMapArea,
    listings,
    search,
    selectedParish,
    selectedPriceRange,
    selectedVehicleType,
  ]);

  const mapRegions = useMemo(
    () => buildExploreMapRegions(filteredVehicles, pickupPoints),
    [filteredVehicles, pickupPoints],
  );

  const selectedRegion =
    mapRegions.find((region) => region.key === selectedMapArea) ?? null;
  const activeFilterCount =
    Number(selectedVehicleType !== "all") +
    Number(selectedParish !== "All") +
    Number(selectedPriceRange !== "all") +
    Number(availabilityOnly);

  const resetFilters = () => {
    setSelectedVehicleType("all");
    setSelectedParish("All");
    setSelectedPriceRange("all");
    setAvailabilityOnly(false);
    setSelectedMapArea(null);
    setStartDate(addDaysIso(TODAY_ISO, 1));
    setEndDate(addDaysIso(TODAY_ISO, 4));
  };

  const handleDateChange = (
    field: "start" | "end",
    event: DateTimePickerEvent,
    selectedValue?: Date,
  ) => {
    if (Platform.OS === "android") {
      setActiveDateField(null);
    }

    if (event.type !== "set" || !selectedValue) {
      return;
    }

    const nextIso = formatLocalDateToIso(selectedValue);

    if (field === "start") {
      setStartDate(nextIso);
      if (endDate <= nextIso) {
        setEndDate(addDaysIso(nextIso, 1));
      }
      return;
    }

    if (nextIso <= startDate) {
      setEndDate(addDaysIso(startDate, 1));
      return;
    }

    setEndDate(nextIso);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <PageHeader
        title='Explore'
        subtitle='Search by category, location, price, availability, and pickup point.'
      />

      <View style={styles.searchShell}>
        <Ionicons
          name='search'
          size={18}
          color={palette.onSurfaceVariant}
          style={styles.searchIcon}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder='Search vehicles, parishes, or hosts'
          placeholderTextColor={palette.onSurfaceVariant}
          style={styles.searchInput}
          selectionColor={palette.primary}
        />
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>Vehicle type</Text>
          <Text style={styles.filterSectionMeta}>
            {selectedVehicleType === "all" ? "All types" : "Filtered"}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={styles.filterScrollerContent}>
          {[
            { key: "all", label: "All" },
            { key: "coupes", label: "Coupes" },
            { key: "sedans", label: "Sedans" },
            { key: "suvs", label: "SUVs" },
            { key: "vans", label: "Vans" },
            { key: "trucks", label: "Trucks" },
            { key: "buses", label: "Buses" },
          ].map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              selected={selectedVehicleType === filter.key}
              onPress={() =>
                setSelectedVehicleType(filter.key as ExploreVehicleTypeFilter)
              }
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>Parish</Text>
          <Text style={styles.filterSectionMeta}>
            {selectedParish === "All" ? "Across Jamaica" : selectedParish}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={styles.filterScrollerContent}>
          {parishOptions.map((parish) => (
            <FilterChip
              key={parish}
              label={parish}
              selected={selectedParish === parish}
              onPress={() => {
                setSelectedParish(parish);
                setSelectedMapArea(parish === "All" ? null : parish);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <Text style={styles.filterSectionTitle}>Price</Text>
          <Text style={styles.filterSectionMeta}>
            {getPriceFilterLabel(selectedPriceRange)}
          </Text>
        </View>
        <View style={styles.filterRow}>
          {[
            { key: "all", label: "All prices" },
            { key: "under-8000", label: "Under JMD 8k" },
            { key: "8000-15000", label: "JMD 8k-15k" },
            { key: "15000-30000", label: "JMD 15k-30k" },
            { key: "30000-plus", label: "JMD 30k+" },
          ].map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              selected={selectedPriceRange === filter.key}
              onPress={() =>
                setSelectedPriceRange(filter.key as ExplorePriceFilter)
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.availabilityCard}>
        <View style={styles.availabilityHeader}>
          <View style={styles.availabilityTitleWrap}>
            <Text style={styles.availabilityTitle}>Availability</Text>
            <Text style={styles.availabilityText}>
              Check which listings are open for your selected trip dates.
            </Text>
          </View>
          <FilterChip
            label={availabilityOnly ? "Filtering active" : "Any time"}
            selected={availabilityOnly}
            onPress={() => setAvailabilityOnly((current) => !current)}
          />
        </View>

        <View style={styles.availabilityDateGrid}>
          <Pressable
            style={[
              styles.availabilityDateField,
              activeDateField === "start" && styles.availabilityDateFieldActive,
            ]}
            onPress={() => {
              setAvailabilityOnly(true);
              setActiveDateField((current) => (current === "start" ? null : "start"));
            }}>
            <Text style={styles.availabilityDateLabel}>Pickup date</Text>
            <Text style={styles.availabilityDateValue}>
              {formatPickerFieldDate(startDate)}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.availabilityDateField,
              activeDateField === "end" && styles.availabilityDateFieldActive,
            ]}
            onPress={() => {
              setAvailabilityOnly(true);
              setActiveDateField((current) => (current === "end" ? null : "end"));
            }}>
            <Text style={styles.availabilityDateLabel}>Drop-off date</Text>
            <Text style={styles.availabilityDateValue}>
              {formatPickerFieldDate(endDate)}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.availabilitySummary}>
          {availabilityOnly
            ? `${filteredVehicles.length} vehicle${
                filteredVehicles.length === 1 ? "" : "s"
              } available from ${formatPickerFieldDate(startDate)} to ${formatPickerFieldDate(endDate)}`
            : "Selecting trip dates will automatically filter out unavailable vehicles."}
        </Text>

        {activeDateField ? (
          <View style={styles.availabilityPickerWrap}>
            <DateTimePicker
              value={parseIsoDateToLocalDate(
                activeDateField === "start" ? startDate : endDate,
              )}
              mode='date'
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, value) =>
                handleDateChange(activeDateField, event, value)
              }
              minimumDate={parseIsoDateToLocalDate(
                activeDateField === "start"
                  ? TODAY_ISO
                  : addDaysIso(startDate, 1),
              )}
              themeVariant='dark'
              textColor='#F5F7FA'
            />
          </View>
        ) : null}
      </View>

      <View style={styles.filterSectionHeader}>
        <Text style={styles.filterSectionMeta}>
          {activeFilterCount
            ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
            : "No filters applied"}
        </Text>
        {activeFilterCount ? (
          <Pressable style={styles.filterResetButton} onPress={resetFilters}>
            <Text style={styles.filterResetText}>Reset filters</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.toggleShell}>
        <ToggleButton
          label='List'
          selected={listMode === "list"}
          onPress={() => setListMode("list")}
        />
        <ToggleButton
          label='Map'
          selected={listMode === "map"}
          onPress={() => setListMode("map")}
        />
      </View>

      {listMode === "map" ? (
        <View style={styles.mapPreviewCard}>
          <Text style={styles.mapPreviewTitle}>Map-based vehicle search</Text>
          <Text style={styles.mapPreviewSubtitle}>
            Tap a parish pin to focus available vehicles and approved pickup
            zones in that area.
          </Text>

          <View style={styles.mapCanvas}>
            <View style={styles.mapBackdropGlowA} />
            <View style={styles.mapBackdropGlowB} />

            <View style={styles.mapIslandViewport}>
              <Svg
                width='100%'
                height='100%'
                viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
                preserveAspectRatio='xMidYMid meet'
                style={styles.mapIslandSvg}>
                <Path
                  d={JAMAICA_OUTLINE_PATH}
                  fill='rgba(226,232,240,0.14)'
                  stroke='rgba(255,255,255,0.28)'
                  strokeWidth={7}
                />
                {mapRegions.map((region) => {
                  const selected = selectedMapArea === region.key;
                  return (
                    <G key={`svg-${region.key}`}>
                      <SvgText
                        x={region.x + region.labelDx}
                        y={region.y + region.labelDy}
                        fill={selected ? "#EAFEF6" : "rgba(226,232,240,0.68)"}
                        fontSize='26'
                        fontWeight='600'>
                        {region.label}
                      </SvgText>
                      <Circle
                        cx={region.x}
                        cy={region.y}
                        r={selected ? 24 : 18}
                        fill={
                          selected
                            ? "rgba(33,216,160,0.22)"
                            : "rgba(14,25,35,0.85)"
                        }
                        stroke={
                          selected
                            ? "rgba(33,216,160,0.72)"
                            : "rgba(255,255,255,0.12)"
                        }
                        strokeWidth={selected ? 5 : 3}
                      />
                      <Circle
                        cx={region.x}
                        cy={region.y}
                        r={selected ? 8 : 6}
                        fill='#21D8A0'
                      />
                      <SvgText
                        x={region.x + 18}
                        y={region.y + 8}
                        fill={selected ? "#EAFEF6" : "rgba(226,232,240,0.78)"}
                        fontSize='26'
                        fontWeight='700'>
                        {String(region.vehicleCount)}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>

              {mapRegions.map((region) => (
                <Pressable
                  key={region.key}
                  style={[
                    styles.mapMarkerTapTarget,
                    {
                      top: `${
                        ((region.y - MAP_VIEWBOX.y) / MAP_VIEWBOX.height) * 100
                      }%`,
                      left: `${
                        ((region.x - MAP_VIEWBOX.x) / MAP_VIEWBOX.width) * 100
                      }%`,
                    },
                  ]}
                  onPress={() =>
                    setSelectedMapArea((current) => {
                      const nextValue = current === region.key ? null : region.key;
                      setSelectedParish(getParishFilterValue(nextValue));
                      return nextValue;
                    })
                  }
                />
              ))}
            </View>
          </View>

          <View style={styles.mapLegendInline}>
            <View style={styles.mapLegendChip}>
              <Ionicons name='car-sport' size={14} color={palette.primary} />
              <Text style={styles.mapLegendChipText}>Listings</Text>
            </View>
            <View style={styles.mapLegendChip}>
              <Ionicons name='location' size={14} color={palette.info} />
              <Text style={styles.mapLegendChipText}>Pickup points</Text>
            </View>
            <Text style={styles.mapLegendMetaInline}>
              {selectedRegion
                ? `${selectedRegion.label}: ${selectedRegion.vehicleCount} listing(s), ${selectedRegion.pickupCount} pickup point(s)`
                : `${filteredVehicles.length} listing(s) across ${mapRegions.length} mapped areas`}
            </Text>
          </View>

          <View style={styles.mapAreaScroller}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.mapAreaChipRow}>
                <Pressable
                  style={[
                    styles.mapAreaChip,
                    !selectedMapArea && styles.mapAreaChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedMapArea(null);
                    setSelectedParish("All");
                  }}>
                  <Text
                    style={[
                      styles.mapAreaChipText,
                      !selectedMapArea && styles.mapAreaChipTextSelected,
                    ]}>
                    All
                  </Text>
                </Pressable>
                {mapRegions.map((region) => {
                  const selected = selectedMapArea === region.key;
                  return (
                    <Pressable
                      key={`chip-${region.key}`}
                      style={[
                        styles.mapAreaChip,
                        selected && styles.mapAreaChipSelected,
                      ]}
                      onPress={() =>
                        setSelectedMapArea((current) => {
                          const nextValue = current === region.key ? null : region.key;
                          setSelectedParish(getParishFilterValue(nextValue));
                          return nextValue;
                        })
                      }>
                      <Text
                        style={[
                          styles.mapAreaChipText,
                          selected && styles.mapAreaChipTextSelected,
                        ]}>
                        {region.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.mapSummaryCard}>
            <Text style={styles.mapSummaryTitle}>
              {selectedRegion
                ? `${selectedRegion.label} overview`
                : "Explore all active areas"}
            </Text>
            <Text style={styles.mapSummaryText}>
              {selectedRegion
                ? `This area has ${selectedRegion.vehicleCount} live vehicle listing(s) and ${selectedRegion.pickupCount} approved pickup point(s).`
                : "Switch between map pins to narrow live listings by parish before opening a vehicle."}
            </Text>
          </View>

          <SecondaryAction
            label={
              selectedRegion
                ? `View ${selectedRegion.label} pickup points`
                : "View pickup points"
            }
            onPress={onOpenPickupPoints}
          />
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Search results</Text>
        <Text style={styles.sectionMeta}>{filteredVehicles.length} vehicles</Text>
      </View>

      {listingsLoading ? (
        <Text style={styles.helperText}>Loading live search results...</Text>
      ) : null}
      {listingsError ? <Text style={styles.errorText}>{listingsError}</Text> : null}
      {!listingsLoading && !filteredVehicles.length ? (
        <View style={styles.infoCard}>
          <Ionicons name='search-outline' size={18} color={palette.primary} />
          <Text style={styles.infoCardText}>
            No active listings matched those filters yet.
          </Text>
        </View>
      ) : null}

      {filteredVehicles.map((vehicle, index) => (
        <View key={vehicle.id} style={styles.resultCard}>
          <Pressable
            style={styles.resultContentPressable}
            onPress={() => onOpenVehicle(vehicle.id)}>
            {vehicle.photos[0]?.url ? (
              <Image
                source={{ uri: vehicle.photos[0].url }}
                style={styles.resultImage}
                resizeMode='cover'
              />
            ) : (
              <View
                style={[
                  styles.resultCardAccent,
                  { backgroundColor: getBrowseListingAccent(index) },
                ]}
              />
            )}
            <View style={styles.resultCardBody}>
              <View style={styles.resultHeaderRow}>
                <View style={styles.resultTitleWrap}>
                  <Text style={styles.resultTitle}>
                    {getListingTitle(vehicle)}
                  </Text>
                  <Text style={styles.resultSubtitle}>{vehicle.location}</Text>
                </View>
                <View style={styles.resultPriceWrap}>
                  <Text style={styles.resultPrice}>
                    JMD {vehicle.dailyRate.toLocaleString()}
                  </Text>
                  <Text style={styles.resultPriceLabel}>per day</Text>
                </View>
              </View>
              <Text style={styles.resultSpecs}>
                {vehicle.transmission} · {vehicle.fuelType} · {vehicle.seats}{" "}
                seats
              </Text>
              <View style={styles.resultMetaRow}>
                <StatusChip label='Active' tone='success' />
                <StatusChip
                  label={vehicle.hasDailyLimit ? "Mileage cap" : "Unlimited km"}
                  tone='info'
                />
              </View>
              <View style={styles.resultHostBlock}>
                <Text style={styles.resultHostLabel}>Host</Text>
                <Text style={styles.resultHostName}>
                  {vehicle.ownerName?.trim() || "Host"}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.resultActionsRow}>
            <SecondaryAction
              label='View details'
              onPress={() => onOpenVehicle(vehicle.id)}
              compact
            />
            <PrimaryAction
              label='Book now'
              onPress={() => onStartVehicleBooking(vehicle.id)}
              compact
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function matchesPriceRange(value: number, filter: ExplorePriceFilter) {
  switch (filter) {
    case "under-8000":
      return value < 8000;
    case "8000-15000":
      return value >= 8000 && value <= 15000;
    case "15000-30000":
      return value > 15000 && value <= 30000;
    case "30000-plus":
      return value > 30000;
    default:
      return true;
  }
}

function getPriceFilterLabel(filter: ExplorePriceFilter) {
  switch (filter) {
    case "under-8000":
      return "Under JMD 8k";
    case "8000-15000":
      return "JMD 8k-15k";
    case "15000-30000":
      return "JMD 15k-30k";
    case "30000-plus":
      return "JMD 30k+";
    default:
      return "All prices";
  }
}

function getParishFilterValue(value: string | null): ParishFilter {
  if (!value) {
    return "All";
  }

  return jamaicaParishOptions.includes(value as (typeof jamaicaParishOptions)[number])
    ? (value as ParishFilter)
    : "All";
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

  return parseIsoDateToLocalDate(value).toLocaleDateString("en-JM", {
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
