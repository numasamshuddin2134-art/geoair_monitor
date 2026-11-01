import { firebaseCache } from "../cache/firebaseCache";

export interface HeatmapFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    latitude: number;
    longitude: number;
    aqi: number;
    pm2_5: number;
    weight: number;
  };
}

export interface HeatmapGeoJSON {
  type: "FeatureCollection";
  features: HeatmapFeature[];
  pointCount: number;
  cached: boolean;
  timestamp: string;
}

export class HeatmapProvider {
  private baseUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";

  async getHeatmapPoints(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number
  ): Promise<HeatmapGeoJSON> {
    // Clamp to valid geographic ranges
    const cMinLng = Math.max(-180, Math.min(180, minLng));
    const cMaxLng = Math.max(-180, Math.min(180, maxLng));
    const cMinLat = Math.max(-85, Math.min(85, minLat));
    const cMaxLat = Math.max(-85, Math.min(85, maxLat));

    const cacheKey = `heatmap_${cMinLng.toFixed(1)}_${cMinLat.toFixed(1)}_${cMaxLng.toFixed(1)}_${cMaxLat.toFixed(1)}`;

    // 1. Check cache
    const cached = await firebaseCache.get<HeatmapGeoJSON>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Generate a coarse grid (5x5 = 25 sample points)
    const steps = 5;
    const lats: number[] = [];
    const lngs: number[] = [];
    const latStep = (cMaxLat - cMinLat) / (steps + 1);
    const lngStep = (cMaxLng - cMinLng) / (steps + 1);

    for (let i = 1; i <= steps; i++) {
      for (let j = 1; j <= steps; j++) {
        lats.push(Number((cMinLat + i * latStep).toFixed(2)));
        lngs.push(Number((cMinLng + j * lngStep).toFixed(2)));
      }
    }

    try {
      const url = `${this.baseUrl}?latitude=${lats.join(",")}&longitude=${lngs.join(",")}&current=us_aqi,pm2_5&timezone=auto`;
      const res = await fetch(url, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } });

      if (!res.ok) {
        throw new Error(`Open-Meteo Heatmap batch error: HTTP ${res.status}`);
      }

      const json = await res.json();
      const results = Array.isArray(json) ? json : json.value ? json.value : [json];

      const features: HeatmapFeature[] = [];

      results.forEach((item: any, idx: number) => {
        const lat = lats[idx];
        const lng = lngs[idx];
        const cur = item.current || {};
        const aqi = Math.round(cur.us_aqi ?? 40);
        const pm25 = Number((cur.pm2_5 ?? 10).toFixed(1));

        // Normalized weight between 0.1 and 1.0 based on AQI
        const weight = Math.min(1.0, Math.max(0.1, aqi / 300));

        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          properties: {
            id: `heatmap-${lat}-${lng}-${idx}`,
            latitude: lat,
            longitude: lng,
            aqi,
            pm2_5: pm25,
            weight,
          },
        });
      });

      const response: HeatmapGeoJSON = {
        type: "FeatureCollection",
        features,
        pointCount: features.length,
        cached: false,
        timestamp: new Date().toISOString(),
      };

      // 3. Cache for 15 minutes
      await firebaseCache.set(cacheKey, response, 15);
      return response;
    } catch (e) {
      console.error("[HeatmapProvider] Error generating heatmap grid:", e);
      return {
        type: "FeatureCollection",
        features: [],
        pointCount: 0,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const heatmapProvider = new HeatmapProvider();
