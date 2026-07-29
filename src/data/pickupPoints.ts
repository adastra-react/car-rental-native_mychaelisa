import { ParishCode, VehicleListing } from "../types/vehicle";
import {
  getListingParishCode,
  getParishLabelFromCode,
} from "../screens/home-shell/location";

export type PickupPoint = {
  id: string;
  name: string;
  parishCode: ParishCode;
  parish: string;
  address: string;
  note: string;
  kind: "parish" | "airport";
  airportCode?: "KIN" | "MBJ";
};

export const KINGSTON_AIRPORT_PICKUP_POINT_ID = "pickup-airport-kin";
export const MBJ_AIRPORT_PICKUP_POINT_ID = "pickup-airport-mbj";

const PARISH_PICKUP_POINTS: Record<ParishCode, PickupPoint> = {
  KIN: {
    id: "pickup-kin-hwt",
    name: "Half-Way Tree Hub",
    parishCode: "KIN",
    parish: "Kingston",
    address: "Shop 12, Transport Centre, Half-Way Tree",
    note: "Shared after confirmation only. Staffed handoff window 8AM to 7PM.",
    kind: "parish",
  },
  STA: {
    id: "pickup-sta-new-kingston",
    name: "New Kingston Handoff Point",
    parishCode: "STA",
    parish: "St. Andrew",
    address: "Knutsford Boulevard, New Kingston",
    note: "Exact curbside instructions are shared in-app after confirmation.",
    kind: "parish",
  },
  STT: {
    id: "pickup-stt-morant-bay",
    name: "Morant Bay Handoff Point",
    parishCode: "STT",
    parish: "St. Thomas",
    address: "Main Street, Morant Bay",
    note: "Hosts confirm the exact meeting bay after approval.",
    kind: "parish",
  },
  POR: {
    id: "pickup-por-port-antonio",
    name: "Port Antonio Handoff Point",
    parishCode: "POR",
    parish: "Portland",
    address: "West Street, Port Antonio",
    note: "Pickup note is shared once the trip is confirmed.",
    kind: "parish",
  },
  SMY: {
    id: "pickup-smy-port-maria",
    name: "Port Maria Handoff Point",
    parishCode: "SMY",
    parish: "St. Mary",
    address: "Market Square, Port Maria",
    note: "Photo ID check required at handoff.",
    kind: "parish",
  },
  SAN: {
    id: "pickup-san-ochi",
    name: "Island Village Pickup Point",
    parishCode: "SAN",
    parish: "St. Ann",
    address: "Island Village Plaza, Ocho Rios",
    note: "Photo ID check required at handoff.",
    kind: "parish",
  },
  TRL: {
    id: "pickup-trl-falmouth",
    name: "Falmouth Handoff Point",
    parishCode: "TRL",
    parish: "Trelawny",
    address: "Market Street, Falmouth",
    note: "Exact meeting spot is confirmed in-app after approval.",
    kind: "parish",
  },
  SJM: {
    id: "pickup-sjm-fairview",
    name: "Fairview Pickup Point",
    parishCode: "SJM",
    parish: "St. James",
    address: "Fairview Shopping Centre, Montego Bay",
    note: "Owner confirms exact bay after trip approval.",
    kind: "parish",
  },
  HAN: {
    id: "pickup-han-lucea",
    name: "Lucea Handoff Point",
    parishCode: "HAN",
    parish: "Hanover",
    address: "Seaside Circle, Lucea",
    note: "Exact handoff instructions are released after confirmation.",
    kind: "parish",
  },
  WES: {
    id: "pickup-wes-sav",
    name: "Savanna-la-Mar Handoff Point",
    parishCode: "WES",
    parish: "Westmoreland",
    address: "Lewis Street, Savanna-la-Mar",
    note: "Hosts confirm the exact lay-by inside the app.",
    kind: "parish",
  },
  SEL: {
    id: "pickup-sel-black-river",
    name: "Black River Handoff Point",
    parishCode: "SEL",
    parish: "St. Elizabeth",
    address: "High Street, Black River",
    note: "Trip confirmation unlocks the precise meeting instructions.",
    kind: "parish",
  },
  MAN: {
    id: "pickup-man-mandeville",
    name: "Mandeville Handoff Point",
    parishCode: "MAN",
    parish: "Manchester",
    address: "Caledonia Road, Mandeville",
    note: "Shared after confirmation only. Driver must present photo ID.",
    kind: "parish",
  },
  CLA: {
    id: "pickup-cla-may-pen",
    name: "May Pen Handoff Point",
    parishCode: "CLA",
    parish: "Clarendon",
    address: "Main Street, May Pen",
    note: "Owner shares the exact curbside spot after booking approval.",
    kind: "parish",
  },
  SCA: {
    id: "pickup-sca-portmore",
    name: "Portmore Handoff Point",
    parishCode: "SCA",
    parish: "St. Catherine",
    address: "Portmore Mall, Portmore",
    note: "Shared after confirmation only. Staffed handoff window 9AM to 6PM.",
    kind: "parish",
  },
};

export const approvedPickupPointsCatalog: PickupPoint[] = [
  ...Object.values(PARISH_PICKUP_POINTS),
  {
    id: KINGSTON_AIRPORT_PICKUP_POINT_ID,
    name: "Kingston Airport Handoff",
    parishCode: "KIN",
    parish: "Kingston",
    address: "Norman Manley International Airport, Kingston",
    note: "Airport pickup logistics are coordinated by the host after confirmation.",
    kind: "airport",
    airportCode: "KIN",
  },
  {
    id: MBJ_AIRPORT_PICKUP_POINT_ID,
    name: "MBJ Airport Handoff",
    parishCode: "SJM",
    parish: "St. James",
    address: "Donald Sangster International Airport, Montego Bay",
    note: "Airport pickup logistics are coordinated by the host after confirmation.",
    kind: "airport",
    airportCode: "MBJ",
  },
];

export function hydratePickupPointsCatalog(points: PickupPoint[]) {
  if (!Array.isArray(points) || !points.length) {
    return;
  }

  approvedPickupPointsCatalog.length = 0;
  approvedPickupPointsCatalog.push(...points);
}

export function getPickupPointById(pointId?: string | null) {
  return (
    approvedPickupPointsCatalog.find((point) => point.id === pointId) ?? null
  );
}

export function getParishPickupPoint(parishCode?: ParishCode | null) {
  return parishCode ? PARISH_PICKUP_POINTS[parishCode] ?? null : null;
}

export function getDefaultApprovedPickupPointIds(
  parishCode?: ParishCode | null,
) {
  const point = getParishPickupPoint(parishCode);
  return point ? [point.id] : [];
}

export function normalizeApprovedPickupPointIds(
  parishCode: ParishCode | null | undefined,
  pointIds: string[] | null | undefined,
) {
  const parishDefaults = getDefaultApprovedPickupPointIds(parishCode);
  const normalized = Array.isArray(pointIds)
    ? pointIds.filter((pointId) => Boolean(getPickupPointById(pointId)))
    : [];

  return [...new Set([...parishDefaults, ...normalized])];
}

export function getApprovedPickupPointIdsForListing(
  listing: Pick<VehicleListing, "approvedPickupPointIds" | "parishCode" | "location">,
) {
  const parishCode = getListingParishCode(listing);
  return normalizeApprovedPickupPointIds(
    parishCode,
    listing.approvedPickupPointIds,
  );
}

export function getApprovedPickupPointsForListing(
  listing: Pick<VehicleListing, "approvedPickupPointIds" | "parishCode" | "location">,
) {
  const approvedIds = new Set(getApprovedPickupPointIdsForListing(listing));
  return approvedPickupPointsCatalog.filter((point) => approvedIds.has(point.id));
}

export function formatPickupPointSummary(point?: PickupPoint | null) {
  if (!point) {
    return "Approved point";
  }

  return `${point.name} · ${point.parish}`;
}

export function formatPickupPointFullLocation(point?: PickupPoint | null) {
  if (!point) {
    return "Approved point";
  }

  return `${point.address}, ${point.parish}`;
}

export function getPickupPointRevealCopy(
  point?: PickupPoint | null,
  isConfirmed = false,
) {
  if (!point) {
    return "Approved point";
  }

  if (isConfirmed) {
    return formatPickupPointFullLocation(point);
  }

  const parishLabel = getParishLabelFromCode(point.parishCode) ?? point.parish;
  return `${point.name} · ${parishLabel} · exact handoff details shared after confirmation`;
}
