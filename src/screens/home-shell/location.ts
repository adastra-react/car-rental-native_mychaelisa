import { ParishCode, VehicleListing } from "../../types/vehicle";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const jamaicaParishOptions = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
] as const;

export const NEARBY_LISTINGS_RADIUS_KM = 30;

export const MAP_VIEWBOX = {
  x: 24,
  y: 8,
  width: 952,
  height: 376,
};

export const JAMAICA_OUTLINE_PATH =
  "M923 242.5l2.9 7 3.4 8 6.1 10.5 7.8 8.3 11.3 8.5-4.3 3.5-21.5 5.5-15.1 8.3-8.7 2.5-7.4-1.9 2.9-2.1 1.2-1.5 1.6-5.3-7.5 2.7-6.7 10-7.2 2.2-6.5-1.9-7.5-3.4-7.6-2-12.5 4.7-32.7 2.8-23-3.5-3.4.1-3.1.6-3.4-.4-4.3-3-1.9-3.9-.8-5.1-1.3-4.3-3.2-1.9-3.4-1-2.2-2.5-1.9-2.9-2.6-2.3-12.5-3-3.1-1.7-6.4-2.6-8.6.5-15.1 3.6-6.4.8-21.7-.8 0-3 45.7-2.7-2.9-2.8-2.1-2-5.5-1.3-12.5-.1-8.5.1-8.7-5.1-7.4-4.9-5.5-2.6-1.3 4.5-1.9 4.7-5.2 5.8-1.6 3.4-5.4-.7-1.6 3.2-1.7 10-7.4 26.4-5.5 7.8-6.7 4.3-5.5 0-3.6-1.6-3.3-2.3-4.6-1.8-23 0 0-3.2 8.8-3-4.5-4-5.6-7.5-4.4-3.4-5-2-12-1.3-10.9 3.8-9.3 5.5-6.9 13.7-1.6 3.9 3.2 12.1-3.1 1.2-5.2 3.3-3.1 1.2 1.1 2.3.7 4.5 1 2.7-4.4-2-4.5-.2-4.3 1.5-4 3.4 7.3 4.5 7.7 1.7 8.1-.7 8.3-2.5 4.3 16.4-1.3 7.5-10.2 3.2-8.6-.4-7.8-1.8-7.7-3.7-36.1-32.4-7.4-9.4-31.1-18.1-9.2-3.4-9.7-1.3-7.7 3.2-8.8 5.9-8.8.8-18.1-5.2-17.9-3.1-56.3 3.2-2.8-.5-8.7-5.9-14.6-7.3-3.7-2.8-1.8-3.4-4.3-11.2-.9-3.5-1.6-2.8-7.4-2.6-2.3-1.9-.6-9.2.7-11-2.6-9.3-10.6-3.9-28.8-.2-6.6-2.5-9.9-22.9-3.2-4.7-3.6-2.5-4.2-2.1-3.3-.9-2.5-2.3-2-5.3-2.6-10.3-7.8-15.9-10.3-5.8-30.6.7-18.7-3.1-6.9-.1-3.9 3.6-3.2 1.8-2.8-.6-10.2-4.2-1-.6-5.9-1-12.8-4.1-7.1-.9-7.3-1.8-7.1-4.7-5.2-6.8-1.8-7.6 2.3-3.7 6.1-4.3 2.9-3.7 1.2-5.7-.6-13.2.8-3.8 3.2-5.2.4-3.3 1.4-1.7 6.5-.5 4-2.7 3.3-5.1 4.3-3.5 7 2.3 4.3-12.4 12.7-11.8 14.9-4.9 10.6 8.2 6.2-7.3 6.6-.2 7.7 2.9 9.5 1.8 26.9-3.3 9 .1 4.5 1.6 3.2 1.2 4.6 1.2 4.7-.8 4.2-3 .4-2.8-.1-3.4 2.6-4.5 9.4-12.1 4.3-4 7.3-3.4 16.8-2.7 19.1.7 33.5 7.3 29.5 6.5 40.4.8 17.9 4.4 28.8 2.1 10.9 2.7 8.5 5.2 13.2-3.4 21.3 0 21.9 2.5 15.1 3.9 1.9 1.9 1.5 5.5 2 1.8 2.5 0 2.2-1 1.3-1.4-.3-.8 18.6 3.2 2.3 1.4 7 6.2 2.2 1.4 13.5.5 14.3-2.4 7.6-1.4 5 1.3 8.7 4.1 4.9.9 24.6-1.1 4.8-2.5 6.8-.8 5.5.4 5 .9 3 3.8-1.3 4.6 0 5.9 4.6 4.3 14.8 9.3 13.1 7.6 2.1 4.3 3.9 11.5 2.5 3.8 3.9 2.4 7.6 2.1 21.5 1.7 7.2 1.6 6.1 3.2 7.9 8.1 6.1 3.9 7 2.2 13.8-.9 7.3 5.2 2.3.6 2.1 2 2.5 1.8 3.4.8 31.3 0 2.1 1.3 3.3 6.3 1.5 1.9 30.6 5.8 15.9 5.7 2 9.1 11.8 11.4 9.2 13.1 13.3 29.3z";

const jamaicaParishCatalog: Array<{
  code: ParishCode;
  label: (typeof jamaicaParishOptions)[number];
  coordinates: Coordinates;
  aliases: string[];
}> = [
  {
    code: "KIN",
    label: "Kingston",
    coordinates: { latitude: 17.9712, longitude: -76.7936 },
    aliases: ["kingston", "half way tree", "half-way tree", "hwt"],
  },
  {
    code: "STA",
    label: "St. Andrew",
    coordinates: { latitude: 18.0179, longitude: -76.7992 },
    aliases: ["st andrew", "st. andrew", "new kingston", "constant spring"],
  },
  {
    code: "STT",
    label: "St. Thomas",
    coordinates: { latitude: 17.9972, longitude: -76.4528 },
    aliases: ["st thomas", "st. thomas"],
  },
  {
    code: "POR",
    label: "Portland",
    coordinates: { latitude: 18.1769, longitude: -76.4509 },
    aliases: ["portland"],
  },
  {
    code: "SMY",
    label: "St. Mary",
    coordinates: { latitude: 18.3093, longitude: -76.9643 },
    aliases: ["st mary", "st. mary"],
  },
  {
    code: "SAN",
    label: "St. Ann",
    coordinates: { latitude: 18.4038, longitude: -77.1027 },
    aliases: ["st ann", "st. ann", "ocho rios", "ochi", "island village"],
  },
  {
    code: "TRL",
    label: "Trelawny",
    coordinates: { latitude: 18.3526, longitude: -77.6078 },
    aliases: ["trelawny"],
  },
  {
    code: "SJM",
    label: "St. James",
    coordinates: { latitude: 18.4762, longitude: -77.8939 },
    aliases: [
      "st james",
      "st. james",
      "montego bay",
      "mobay",
      "mo bay",
      "mbj",
      "donald sangster airport",
      "sangster",
      "fairview shopping centre",
      "west village",
    ],
  },
  {
    code: "HAN",
    label: "Hanover",
    coordinates: { latitude: 18.4098, longitude: -78.1332 },
    aliases: ["hanover"],
  },
  {
    code: "WES",
    label: "Westmoreland",
    coordinates: { latitude: 18.2184, longitude: -78.1336 },
    aliases: ["westmoreland", "negril"],
  },
  {
    code: "SEL",
    label: "St. Elizabeth",
    coordinates: { latitude: 18.0521, longitude: -77.849 },
    aliases: ["st elizabeth", "st. elizabeth"],
  },
  {
    code: "MAN",
    label: "Manchester",
    coordinates: { latitude: 18.0425, longitude: -77.5079 },
    aliases: ["manchester"],
  },
  {
    code: "CLA",
    label: "Clarendon",
    coordinates: { latitude: 17.9659, longitude: -77.2405 },
    aliases: ["clarendon"],
  },
  {
    code: "SCA",
    label: "St. Catherine",
    coordinates: { latitude: 17.9986, longitude: -76.9571 },
    aliases: ["st catherine", "st. catherine", "portmore"],
  },
];

function normalizeGeoLookup(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/[-/]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getParishMetaByCode(code?: ParishCode | null) {
  return jamaicaParishCatalog.find((entry) => entry.code === code) ?? null;
}

export function getParishLabelFromCode(code?: ParishCode | null) {
  return getParishMetaByCode(code)?.label ?? null;
}

export function getParishCodeFromLabel(
  parish: (typeof jamaicaParishOptions)[number] | "",
) {
  return (
    jamaicaParishCatalog.find((entry) => entry.label === parish)?.code ?? null
  );
}

export function inferParishCodeFromLocation(location: string) {
  const normalized = normalizeGeoLookup(location);
  const suffix = normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(-2);
  const suffixText = suffix.join(" ");

  const suffixMatch = jamaicaParishCatalog.find((entry) =>
    entry.aliases.some((alias) =>
      suffixText.includes(normalizeGeoLookup(alias)),
    ),
  );

  if (suffixMatch) {
    return suffixMatch.code;
  }

  const directMatch = jamaicaParishCatalog.find((entry) =>
    entry.aliases.some((alias) =>
      normalized.includes(normalizeGeoLookup(alias)),
    ),
  );

  return directMatch?.code ?? null;
}

export function getListingParishCode(
  listing: Pick<VehicleListing, "location" | "parishCode">,
) {
  const inferredParishCode = inferParishCodeFromLocation(listing.location);

  if (
    listing.parishCode &&
    inferredParishCode &&
    listing.parishCode !== inferredParishCode
  ) {
    return inferredParishCode;
  }

  return listing.parishCode ?? inferredParishCode;
}

export function getListingParish(
  location: string,
  parishCode?: ParishCode | null,
) {
  return (
    getParishLabelFromCode(
      parishCode ?? inferParishCodeFromLocation(location),
    ) ?? "Other"
  );
}

export function getCoordinatesForListing(
  listing: Pick<VehicleListing, "location" | "parishCode">,
): Coordinates | null {
  return (
    getParishMetaByCode(getListingParishCode(listing))?.coordinates ?? null
  );
}

export function calculateDistanceKm(a: Coordinates, b: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function getNearestParishCode(
  coordinates: Coordinates,
): ParishCode | null {
  const nearest = jamaicaParishCatalog.reduce<{
    code: ParishCode;
    distanceKm: number;
  } | null>((closest, parish) => {
    const distanceKm = calculateDistanceKm(coordinates, parish.coordinates);

    if (!closest || distanceKm < closest.distanceKm) {
      return {
        code: parish.code,
        distanceKm,
      };
    }

    return closest;
  }, null);

  return nearest?.code ?? null;
}
