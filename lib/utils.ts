import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format decimal coordinates to military-style / HUD readout
 * e.g., 28.6139, 77.2090 -> 28°36'50"N 077°12'32"E
 */
export function formatCoordinates(lat: number, lng: number): {
  latStr: string;
  lngStr: string;
  mgrsSim: string;
} {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = ((absLat - latDeg - latMin / 60) * 3600).toFixed(1);

  const lngDeg = Math.floor(absLng);
  const lngMin = Math.floor((absLng - lngDeg) * 60);
  const lngSec = ((absLng - lngDeg - lngMin / 60) * 3600).toFixed(1);

  const latStr = `${latDeg.toString().padStart(2, "0")}°${latMin.toString().padStart(2, "0")}'${latSec.padStart(4, "0")}"${latDir}`;
  const lngStr = `${lngDeg.toString().padStart(3, "0")}°${lngMin.toString().padStart(2, "0")}'${lngSec.padStart(4, "0")}"${lngDir}`;

  // Approximate MGRS grid zone for aesthetic intelligence HUD readout
  const zoneNumber = Math.floor((lng + 180) / 6) + 1;
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const latBandIndex = Math.min(23, Math.max(0, Math.floor((lat + 80) / 8)));
  const zoneLetter = letters[latBandIndex] || "X";
  const easting = Math.floor((absLng * 1000) % 100000).toString().padStart(5, "0");
  const northing = Math.floor((absLat * 1000) % 100000).toString().padStart(5, "0");

  const mgrsSim = `${zoneNumber.toString().padStart(2, "0")}${zoneLetter} ${easting.slice(0, 3)} ${northing.slice(0, 3)}`;

  return { latStr, lngStr, mgrsSim };
}
