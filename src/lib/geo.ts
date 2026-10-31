/** Great-circle distance in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const kmToMiles = (km: number) => km * 0.621371;

export function formatDistance(km?: number): string | undefined {
  if (km === undefined) return undefined;
  const mi = kmToMiles(km);
  return mi < 0.2 ? "Nearby" : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

const RADII_KM = [5, 10, 16, 20, 32, 48];

/** Distance choices, always including the current value. */
export const radiusOptions = (current: number) => [...new Set([...RADII_KM, current])].sort((a, b) => a - b);

/** Qloo price levels run 1–4; map an outing budget onto the ceiling. */
export function priceCeiling(budget: number): number {
  if (budget <= 15) return 1;
  if (budget <= 30) return 2;
  if (budget <= 60) return 3;
  return 4;
}

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function weekdayOf(isoDate: string): (typeof WEEKDAYS)[number] {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
