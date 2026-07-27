import { MockPickupPoint } from "../../data/mockAppData";
import { ParishCode, VehicleListing } from "../../types/vehicle";
import {
  getParishLabelFromCode,
  getListingParish,
} from "./location";

export type HomeVehicleCategory =
  | "all"
  | "nearby"
  | "coupes"
  | "sedans"
  | "suvs"
  | "vans"
  | "trucks"
  | "buses";

export type ExploreMapRegion = {
  key: string;
  label: string;
  x: number;
  y: number;
  labelDx: number;
  labelDy: number;
  vehicleCount: number;
  pickupCount: number;
};

export function getListingTitle(listing: VehicleListing) {
  return `${listing.make} ${listing.model}`.trim();
}

export function getListingYear(listing: VehicleListing) {
  const title = getListingTitle(listing);
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

export function getListingRating(_listing: VehicleListing) {
  return 5.0;
}

export function getListingRatingCount(_listing: VehicleListing) {
  return 0;
}

export function getHomeVehicleCategory(
  listing: VehicleListing,
): HomeVehicleCategory {
  const haystack =
    `${listing.make} ${listing.model} ${listing.description}`.toLowerCase();
  const legacyCategory = listing.category?.toLowerCase();

  if (listing.category === "SUV") {
    return "suvs";
  }

  if (listing.category === "Van") {
    return "vans";
  }

  if (listing.category === "Truck") {
    return "trucks";
  }

  if (listing.category === "Bus") {
    return "buses";
  }

  if (listing.category === "Coupe" || legacyCategory === "sports") {
    return "coupes";
  }

  if (listing.category === "Sedan") {
    return "sedans";
  }

  if (/bus|coaster|coach|minibus/.test(haystack) || listing.seats >= 18) {
    return "buses";
  }

  if (
    /hiace|voxy|noah|serena|caravan|van/.test(haystack) ||
    (listing.seats >= 7 && listing.seats < 18)
  ) {
    return "vans";
  }

  if (/hilux|ranger|d-max|bt-50|tundra|pickup|truck/.test(haystack)) {
    return "trucks";
  }

  if (/rav4|cr-v|cx-|sportage|tucson|x5|x3|gle|q5|q7|suv/.test(haystack)) {
    return "suvs";
  }

  if (
    /m2|m3|m4|m8|corvette|mustang|camaro|supra|gt-r|gtr|911|cayman|boxster|z4|brz|gr86|mx-5|miata|coupe|roadster|convertible/.test(
      haystack,
    ) ||
    (listing.doors <= 2 && listing.seats <= 5)
  ) {
    return "coupes";
  }

  return "sedans";
}

export function getListingCategoryLabel(listing: VehicleListing) {
  if (listing.category) {
    return listing.category;
  }

  switch (getHomeVehicleCategory(listing)) {
    case "coupes":
      return "Coupe";
    case "sedans":
      return "Sedan";
    case "suvs":
      return "SUV";
    case "vans":
      return "Van";
    case "trucks":
      return "Truck";
    case "buses":
      return "Bus";
    default:
      return "Vehicle";
  }
}

export function getBrowseListingAccent(index: number) {
  const accents = ["#D7F2EC", "#FBE8C0", "#DBEAFE", "#F5D9D0"];
  return accents[index % accents.length];
}

export function getNearbyVehicleListings(
  listings: VehicleListing[],
  currentParishCode: ParishCode | null,
) {
  if (!currentParishCode) {
    return {
      vehicles: [] as VehicleListing[],
      mode: "unavailable" as const,
    };
  }

  const nearbyListings = listings.filter(
    (vehicle) =>
      getListingParish(vehicle.location, vehicle.parishCode) ===
      getParishLabelFromCode(currentParishCode),
  );

  if (nearbyListings.length) {
    return {
      vehicles: nearbyListings.slice(0, 8),
      mode: "nearby" as const,
    };
  }

  return {
    vehicles: [] as VehicleListing[],
    mode: listings.length ? ("empty" as const) : ("unavailable" as const),
  };
}

function getParishMapPosition(parish: string) {
  switch (parish) {
    case "Kingston":
      return { x: 690, y: 240, labelDx: -49, labelDy: 39 };
    case "St. James":
      return { x: 250, y: 35, labelDx: -49, labelDy: -20 };
    case "St. Ann":
      return { x: 440, y: 50, labelDx: -40, labelDy: -30 };
    default:
      return { x: 654, y: 204, labelDx: -20, labelDy: -18 };
  }
}

export function buildExploreMapRegions(
  listings: VehicleListing[],
  pickupPoints: MockPickupPoint[],
) {
  const regionMap = new Map<string, ExploreMapRegion>();

  listings.forEach((vehicle) => {
    const parish = getListingParish(vehicle.location, vehicle.parishCode);
    const position = getParishMapPosition(parish);
    const existing = regionMap.get(parish);

    regionMap.set(parish, {
      key: parish,
      label: parish,
      x: position.x,
      y: position.y,
      labelDx: position.labelDx,
      labelDy: position.labelDy,
      vehicleCount: (existing?.vehicleCount ?? 0) + 1,
      pickupCount:
        existing?.pickupCount ??
        pickupPoints.filter((point) => point.parish === parish).length,
    });
  });

  pickupPoints.forEach((point) => {
    if (regionMap.has(point.parish)) {
      return;
    }

    const position = getParishMapPosition(point.parish);
    regionMap.set(point.parish, {
      key: point.parish,
      label: point.parish,
      x: position.x,
      y: position.y,
      labelDx: position.labelDx,
      labelDy: position.labelDy,
      vehicleCount: 0,
      pickupCount: pickupPoints.filter(
        (pickupPoint) => pickupPoint.parish === point.parish,
      ).length,
    });
  });

  return [...regionMap.values()].sort((a, b) => b.vehicleCount - a.vehicleCount);
}

export function buildRenterHomeSections(listings: VehicleListing[]) {
  const byPrice = [...listings].sort((a, b) => a.dailyRate - b.dailyRate);
  const featured = listings.slice(0, 8);
  const roomy = listings.filter((vehicle) => vehicle.seats >= 6);
  const value = byPrice.filter((vehicle) => vehicle.dailyRate <= 10000);
  const coastalParishes = new Set(["St. James", "St. Ann", "Westmoreland"]);
  const coastal = listings.filter((vehicle) =>
    coastalParishes.has(getListingParish(vehicle.location, vehicle.parishCode)),
  );

  return [
    {
      key: "featured",
      title: "Featured this week",
      subtitle: `${listings.length} live vehicles across Jamaica`,
      vehicles: featured,
    },
    {
      key: "roomy",
      title: "Room for the crew",
      subtitle:
        "SUVs, vans, and larger rides for airport runs and family plans",
      vehicles: roomy.slice(0, 8),
    },
    {
      key: "value",
      title: "Easy on the budget",
      subtitle: "Lower daily rates without leaving the app flow",
      vehicles: value.slice(0, 8),
    },
    {
      key: "coastal",
      title: "Coastal pickups",
      subtitle: "Popular handoff areas around Montego Bay and Ocho Rios",
      vehicles: coastal.slice(0, 8),
    },
  ].filter((section) => section.vehicles.length > 0);
}
