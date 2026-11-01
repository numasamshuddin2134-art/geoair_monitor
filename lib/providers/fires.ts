import { firebaseCache } from "../cache/firebaseCache";

const FIRMS_MAP_KEY = process.env.NASA_FIRMS_MAP_KEY || "65f01f7c19bfad2bdd7f991228340944";

export interface FireFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    latitude: number;
    longitude: number;
    brightness: number;
    brightnessTemp5: number;
    satellite: string;
    instrument: string;
    confidence: string;
    acquiredDate: string;
    acquiredTime: string;
    frp: number;
    dayNight: string;
  };
}

export interface FireGeoJSON {
  type: "FeatureCollection";
  features: FireFeature[];
  count: number;
  cached: boolean;
  timestamp: string;
}

export class FirmsFireProvider {
  async getFiresInBbox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number
  ): Promise<FireGeoJSON> {
    // Clamp coordinates to valid ranges
    const cMinLng = Math.max(-180, Math.min(180, minLng));
    const cMaxLng = Math.max(-180, Math.min(180, maxLng));
    const cMinLat = Math.max(-85, Math.min(85, minLat));
    const cMaxLat = Math.max(-85, Math.min(85, maxLat));

    const cacheKey = `firms_${cMinLng.toFixed(1)}_${cMinLat.toFixed(1)}_${cMaxLng.toFixed(1)}_${cMaxLat.toFixed(1)}`;

    // 1. Check Cache
    const cached = await firebaseCache.get<FireGeoJSON>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Fetch fresh from NASA FIRMS Area API (1-day VIIRS NRT detections)
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${cMinLng.toFixed(2)},${cMinLat.toFixed(2)},${cMaxLng.toFixed(2)},${cMaxLat.toFixed(2)}/1`;
      const res = await fetch(url, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } });

      if (!res.ok) {
        console.warn(`NASA FIRMS HTTP ${res.status}: ${res.statusText}`);
        return { type: "FeatureCollection", features: [], count: 0, cached: false, timestamp: new Date().toISOString() };
      }

      const csv = await res.text();
      const lines = csv.trim().split("\n");
      if (lines.length <= 1) {
        const empty: FireGeoJSON = {
          type: "FeatureCollection",
          features: [],
          count: 0,
          cached: false,
          timestamp: new Date().toISOString(),
        };
        await firebaseCache.set(cacheKey, empty, 15);
        return empty;
      }

      const headers = lines[0].split(",");
      const latIdx = headers.indexOf("latitude");
      const lngIdx = headers.indexOf("longitude");
      const b4Idx = headers.indexOf("bright_ti4");
      const b5Idx = headers.indexOf("bright_ti5");
      const satIdx = headers.indexOf("satellite");
      const instIdx = headers.indexOf("instrument");
      const confIdx = headers.indexOf("confidence");
      const dateIdx = headers.indexOf("acq_date");
      const timeIdx = headers.indexOf("acq_time");
      const frpIdx = headers.indexOf("frp");
      const dnIdx = headers.indexOf("daynight");

      const features: FireFeature[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",");
        if (row.length >= 7) {
          const lat = parseFloat(row[latIdx]);
          const lng = parseFloat(row[lngIdx]);
          const brightness = parseFloat(row[b4Idx] || "310");

          if (!isNaN(lat) && !isNaN(lng)) {
            features.push({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
              properties: {
                id: `fire-${lat}-${lng}-${i}`,
                latitude: lat,
                longitude: lng,
                brightness,
                brightnessTemp5: parseFloat(row[b5Idx] || "290"),
                satellite: row[satIdx] || "VIIRS",
                instrument: row[instIdx] || "VIIRS",
                confidence: row[confIdx] || "nominal",
                acquiredDate: row[dateIdx] || "",
                acquiredTime: row[timeIdx] || "",
                frp: parseFloat(row[frpIdx] || "1.0"),
                dayNight: row[dnIdx] || "D",
              },
            });
          }
        }
      }

      const result: FireGeoJSON = {
        type: "FeatureCollection",
        features: features.slice(0, 300), // Cap for smooth Mapbox rendering
        count: features.length,
        cached: false,
        timestamp: new Date().toISOString(),
      };

      await firebaseCache.set(cacheKey, result, 15);
      return result;
    } catch (e) {
      console.error("[FirmsFireProvider] Fetch failed:", e);
      return { type: "FeatureCollection", features: [], count: 0, cached: false, timestamp: new Date().toISOString() };
    }
  }
}

export const firmsFireProvider = new FirmsFireProvider();
