import { firebaseCache } from "../cache/firebaseCache";
import { AQICategory, PollutantDetail } from "../types/environmental";
import { getAQICategory } from "./environmental";

export interface AirQualityResult {
  latitude: number;
  longitude: number;
  usAqi: number;
  europeanAqi: number;
  category: AQICategory;
  dominantPollutant: string;
  pollutants: Record<string, PollutantDetail>;
  hourlyForecast?: {
    time: string[];
    usAqi: number[];
    pm2_5: number[];
    pm10: number[];
  };
  source: "Open-Meteo Atmospheric Grid";
  cached: boolean;
  timestamp: string;
}

export class AirQualityProvider {
  private baseUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";

  async getAirQuality(lat: number, lng: number): Promise<AirQualityResult> {
    const roundedLat = Number(lat.toFixed(2));
    const roundedLng = Number(lng.toFixed(2));
    const cacheKey = `air_${roundedLat}_${roundedLng}`;

    // 1. Check cache
    const cached = await firebaseCache.get<AirQualityResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Fetch fresh from Open-Meteo
    const url = `${this.baseUrl}?latitude=${roundedLat}&longitude=${roundedLng}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,pm10,us_aqi&forecast_days=2&timezone=auto`;

    const res = await fetch(url, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } });
    if (!res.ok) {
      throw new Error(`Open-Meteo Air Quality error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const usAqi = Math.round(current.us_aqi ?? 50);
    const europeanAqi = Math.round(current.european_aqi ?? 30);
    const category = getAQICategory(usAqi);

    const pollutants: Record<string, PollutantDetail> = {
      pm2_5: this.formatPollutant("pm2_5", "PM2.5 Fine Particulates", current.pm2_5, "µg/m³", 15),
      pm10: this.formatPollutant("pm10", "PM10 Coarse Particulates", current.pm10, "µg/m³", 45),
      nitrogen_dioxide: this.formatPollutant("nitrogen_dioxide", "NO₂ Nitrogen Dioxide", current.nitrogen_dioxide, "µg/m³", 25),
      sulphur_dioxide: this.formatPollutant("sulphur_dioxide", "SO₂ Sulphur Dioxide", current.sulphur_dioxide, "µg/m³", 40),
      ozone: this.formatPollutant("ozone", "O₃ Ground Ozone", current.ozone, "µg/m³", 100),
      carbon_monoxide: this.formatPollutant("carbon_monoxide", "CO Carbon Monoxide", current.carbon_monoxide, "µg/m³", 4000),
    };

    let dominant = "PM2.5";
    let maxRatio = -1;
    Object.values(pollutants).forEach((p) => {
      if (p.percentageOfLimit > maxRatio) {
        maxRatio = p.percentageOfLimit;
        dominant = p.name.split(" ")[0];
      }
    });

    const hourly = data.hourly
      ? {
          time: data.hourly.time.slice(0, 24),
          usAqi: (data.hourly.us_aqi || []).slice(0, 24),
          pm2_5: (data.hourly.pm2_5 || []).slice(0, 24),
          pm10: (data.hourly.pm10 || []).slice(0, 24),
        }
      : undefined;

    const result: AirQualityResult = {
      latitude: roundedLat,
      longitude: roundedLng,
      usAqi,
      europeanAqi,
      category,
      dominantPollutant: dominant,
      pollutants,
      hourlyForecast: hourly,
      source: "Open-Meteo Atmospheric Grid",
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // 3. Save to Firebase cache (15 min TTL)
    await firebaseCache.set(cacheKey, result, 15);

    return result;
  }

  private formatPollutant(
    code: string,
    name: string,
    val: number | undefined,
    unit: string,
    whoLimit: number
  ): PollutantDetail {
    const value = val !== undefined ? Number(val.toFixed(1)) : 0;
    const percentageOfLimit = Math.round((value / whoLimit) * 100);

    let status: PollutantDetail["status"] = "nominal";
    if (percentageOfLimit > 300) status = "critical";
    else if (percentageOfLimit > 150) status = "unhealthy";
    else if (percentageOfLimit > 100) status = "moderate";

    return { code, name, value, unit, whoLimit, percentageOfLimit, status };
  }
}

export const airQualityProvider = new AirQualityProvider();
