import { MockPickupPoint } from "../../data/mockAppData";
import { ParishCode, VehicleListing } from "../../types/vehicle";
import {
  getListingParishCode,
  getParishLabelFromCode,
  getListingParish,
  getParishCodeFromLabel,
  jamaicaParishOptions,
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
  key: ParishCode;
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

export function getListingRating(listing: VehicleListing) {
  return listing.averageRating ?? 0;
}

export function getListingRatingCount(listing: VehicleListing) {
  return listing.reviewCount ?? 0;
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

const SVG_PARISH_LAYOUT: Record<
  ParishCode,
  { x: number; y: number; labelDx: number; labelDy: number }
> = {
  HAN: { x: 110, y: 60, labelDx: -50, labelDy: -22 },
  WES: { x: 110, y: 140, labelDx: -80, labelDy: 38 },
  SJM: { x: 250, y: 35, labelDx: -49, labelDy: -20 },
  TRL: { x: 370, y: 48, labelDx: -58, labelDy: 35 },
  SAN: { x: 490, y: 50, labelDx: -40, labelDy: -30 },
  SMY: { x: 640, y: 86, labelDx: -42, labelDy: -20 },
  POR: { x: 860, y: 180, labelDx: -49, labelDy: -25 },
  STT: { x: 880, y: 282, labelDx: -60, labelDy: 52 },
  KIN: { x: 690, y: 240, labelDx: -49, labelDy: 39 },
  STA: { x: 654, y: 204, labelDx: -46, labelDy: -24 },
  SCA: { x: 576, y: 270, labelDx: -50, labelDy: 40 },
  CLA: { x: 460, y: 266, labelDx: -66, labelDy: -25 },
  MAN: { x: 340, y: 280, labelDx: -48, labelDy: 30 },
  SEL: { x: 230, y: 220, labelDx: -68, labelDy: 40 },
};

function getParishMapPosition(parishCode: ParishCode) {
  return SVG_PARISH_LAYOUT[parishCode];
}

const PARISH_DISPLAY_ORDER = jamaicaParishOptions
  .map((parish) => getParishCodeFromLabel(parish))
  .filter((code): code is ParishCode => Boolean(code));

export function buildExploreMapRegions(
  listings: VehicleListing[],
  pickupPoints: MockPickupPoint[],
) {
  const regionMap = new Map<ParishCode, ExploreMapRegion>();

  listings.forEach((vehicle) => {
    const parishCode = getListingParishCode(vehicle);

    if (!parishCode) {
      return;
    }

    const parish =
      getParishLabelFromCode(parishCode) ??
      getListingParish(vehicle.location, vehicle.parishCode);
    const position = getParishMapPosition(parishCode);
    const existing = regionMap.get(parishCode);

    regionMap.set(parishCode, {
      key: parishCode,
      label: parish,
      x: position.x,
      y: position.y,
      labelDx: position.labelDx,
      labelDy: position.labelDy,
      vehicleCount: (existing?.vehicleCount ?? 0) + 1,
      pickupCount:
        existing?.pickupCount ??
        pickupPoints.filter((point) => point.parishCode === parishCode).length,
    });
  });

  pickupPoints.forEach((point) => {
    if (regionMap.has(point.parishCode)) {
      return;
    }

    const position = getParishMapPosition(point.parishCode);
    regionMap.set(point.parishCode, {
      key: point.parishCode,
      label: point.parish,
      x: position.x,
      y: position.y,
      labelDx: position.labelDx,
      labelDy: position.labelDy,
      vehicleCount: 0,
      pickupCount: pickupPoints.filter(
        (pickupPoint) => pickupPoint.parishCode === point.parishCode,
      ).length,
    });
  });

  return [...regionMap.values()].sort(
    (a, b) =>
      PARISH_DISPLAY_ORDER.indexOf(a.key) - PARISH_DISPLAY_ORDER.indexOf(b.key),
  );
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
