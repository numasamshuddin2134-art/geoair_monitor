import {
  EnvironmentalProfile,
  AQICategory,
  PollutantDetail,
  WeatherData,
  FireHotspot,
} from "../types/environmental";
import { getBoundingBox, sampleGridInsidePolygon, calculatePolygonAreaKm2, getPolygonCentroid } from "../geo";
import { firebaseCache } from "../cache/firebaseCache";

const FIRMS_MAP_KEY = process.env.NASA_FIRMS_MAP_KEY || "65f01f7c19bfad2bdd7f991228340944";

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) {
    return {
      label: "Good",
      category: "good",
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.3)",
      description: "Air quality is satisfactory with little or no risk.",
      healthRecommendation: "Ideal conditions for outdoor recreation and activities.",
    };
  }
  if (aqi <= 100) {
    return {
      label: "Moderate",
      category: "moderate",
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.12)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      description: "Air quality is acceptable; unusually sensitive individuals may experience minor irritation.",
      healthRecommendation: "Sensitive individuals should consider reducing prolonged outdoor exertion.",
    };
  }
  if (aqi <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      category: "unhealthy-sensitive",
      color: "#f97316",
      bgColor: "rgba(249, 115, 22, 0.12)",
      borderColor: "rgba(249, 115, 22, 0.3)",
      description: "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
      healthRecommendation: "People with respiratory or heart conditions, children, and older adults should limit outdoor exertion.",
    };
  }
  if (aqi <= 200) {
    return {
      label: "Unhealthy",
      category: "unhealthy",
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.3)",
      description: "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.",
      healthRecommendation: "Wear an N95 mask outdoors, close windows, and run air purifiers indoors.",
    };
  }
  if (aqi <= 300) {
    return {
      label: "Very Unhealthy",
      category: "very-unhealthy",
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.12)",
      borderColor: "rgba(139, 92, 246, 0.3)",
      description: "Health alert: The risk of health effects is significantly increased for everyone in the area.",
      healthRecommendation: "Avoid all strenuous outdoor activity. Keep indoor air clean and monitor respiratory symptoms.",
    };
  }
  return {
    label: "Hazardous",
    category: "hazardous",
    color: "#991b1b",
    bgColor: "rgba(153, 27, 27, 0.18)",
    borderColor: "rgba(153, 27, 27, 0.4)",
    description: "Health warning of emergency conditions: The entire population is likely to be affected.",
    healthRecommendation: "Remain indoors with doors and windows sealed. Essential personnel only outdoors with high-grade filtration.",
  };
}

export function getWindCompass(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index] || "N";
}

export function getWeatherDescription(code: number): string {
  const wmoMap: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
  };
  return wmoMap[code] || "Fair";
}

export class EnvironmentalProvider {
  /**
   * Fetch single-point environmental profile with 15-min Firebase Cache
   */
  async getPointProfile(lat: number, lng: number, locationName?: string): Promise<EnvironmentalProfile> {
    const cacheKey = `point_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const cached = await firebaseCache.get<EnvironmentalProfile>(cacheKey);
    if (cached) {
      if (locationName && cached.location.name !== locationName) {
        cached.location.name = locationName;
      }
      return cached;
    }

    const [airData, weatherData, fireData] = await Promise.all([
      this.fetchAirQuality(lat, lng),
      this.fetchWeather(lat, lng),
      this.fetchFiresAroundPoint(lat, lng),
    ]);

    const usAqi = Math.round(airData?.current?.us_aqi ?? 50);
    const europeanAqi = Math.round(airData?.current?.european_aqi ?? 30);
    const category = getAQICategory(usAqi);

    // Build standardized pollutants map with WHO guidelines
    const rawPollutants = airData?.current || {};
    const pollutants: Record<string, PollutantDetail> = {
      pm2_5: this.buildPollutant("pm2_5", "PM2.5 Fine Particulates", rawPollutants.pm2_5, "µg/m³", 15),
      pm10: this.buildPollutant("pm10", "PM10 Coarse Particulates", rawPollutants.pm10, "µg/m³", 45),
      nitrogen_dioxide: this.buildPollutant("nitrogen_dioxide", "NO₂ Nitrogen Dioxide", rawPollutants.nitrogen_dioxide, "µg/m³", 25),
      sulphur_dioxide: this.buildPollutant("sulphur_dioxide", "SO₂ Sulphur Dioxide", rawPollutants.sulphur_dioxide, "µg/m³", 40),
      ozone: this.buildPollutant("ozone", "O₃ Ground-level Ozone", rawPollutants.ozone, "µg/m³", 100),
      carbon_monoxide: this.buildPollutant("carbon_monoxide", "CO Carbon Monoxide", rawPollutants.carbon_monoxide, "µg/m³", 4000),
    };

    // Determine dominant pollutant
    let dominant = "PM2.5";
    let maxPct = -1;
    Object.values(pollutants).forEach((p) => {
      if (p.percentageOfLimit > maxPct) {
        maxPct = p.percentageOfLimit;
        dominant = p.name.split(" ")[0];
      }
    });

    const currentW = weatherData?.current || {};
    const weather: WeatherData = {
      temperature: currentW.temperature_2m ?? 20,
      apparentTemperature: currentW.apparent_temperature ?? 20,
      relativeHumidity: currentW.relative_humidity_2m ?? 50,
      surfacePressure: currentW.surface_pressure ?? 1013,
      windSpeed: currentW.wind_speed_10m ?? 10,
      windDirection: currentW.wind_direction_10m ?? 0,
      windCompass: getWindCompass(currentW.wind_direction_10m ?? 0),
      precipitation: currentW.precipitation ?? 0,
      weatherCode: currentW.weather_code ?? 0,
      weatherDescription: getWeatherDescription(currentW.weather_code ?? 0),
    };

    const profile: EnvironmentalProfile = {
      location: {
        name: locationName || `Sector [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`,
        latitude: lat,
        longitude: lng,
      },
      airQuality: {
        usAqi,
        europeanAqi,
        category,
        dominantPollutant: dominant,
        pollutants,
      },
      weather,
      fires: fireData,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Firebase Realtime Database for 15 minutes
    await firebaseCache.set(cacheKey, profile, 15);

    return profile;
  }

  /**
   * Fetch area profile for a drawn polygon
   * Samples a 9-point interior grid and batches requests with Firebase caching
   */
  async getPolygonProfile(polygonCoordinates: number[][]): Promise<EnvironmentalProfile> {
    const centroid = getPolygonCentroid(polygonCoordinates);
    const cacheKey = `poly_${polygonCoordinates.length}_${centroid.lat.toFixed(3)}_${centroid.lng.toFixed(3)}`;
    const cached = await firebaseCache.get<EnvironmentalProfile>(cacheKey);
    if (cached) return cached;

    const samplePoints = sampleGridInsidePolygon(polygonCoordinates, 9);
    const areaKm2 = calculatePolygonAreaKm2(polygonCoordinates);
    const bbox = getBoundingBox(polygonCoordinates);

    // Fetch batch data for sampled points
    const pointProfiles = await Promise.all(
      samplePoints.map((pt) => this.getPointProfile(pt.lat, pt.lng))
    );

    // Fetch fires across the exact polygon bounding box
    const fires = await this.fetchFiresInBbox(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat);

    // Compute aggregated metrics
    const aqiValues = pointProfiles.map((p) => p.airQuality.usAqi);
    const avgAqi = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);
    const minAqi = Math.min(...aqiValues);
    const maxAqi = Math.max(...aqiValues);

    // Use centroid profile as primary base, then augment with area averages
    const base = pointProfiles[0] || (await this.getPointProfile(centroid.lat, centroid.lng));
    base.airQuality.usAqi = avgAqi;
    base.airQuality.category = getAQICategory(avgAqi);
    base.location.name = `Enclosed Sector (${areaKm2} km²)`;
    base.fires = fires;

    const sampleNodes = pointProfiles.map((p, idx) => ({
      id: `node-${idx + 1}`,
      lat: Number(p.location.latitude.toFixed(3)),
      lng: Number(p.location.longitude.toFixed(3)),
      aqi: p.airQuality.usAqi,
      pm2_5: p.airQuality.pollutants.pm2_5?.value ?? 0,
      status: p.airQuality.category.label,
    }));

    base.areaMetrics = {
      isPolygon: true,
      areaKm2,
      avgAqi,
      minAqi,
      maxAqi,
      samplePointsCount: samplePoints.length,
      sampleNodes,
    };

    // Cache polygon profile
    await firebaseCache.set(cacheKey, base, 15);

    return base;
  }

  private buildPollutant(
    code: string,
    name: string,
    val: number | undefined,
    unit: string,
    whoLimit: number
  ): PollutantDetail {
    const value = val ? Number(val.toFixed(1)) : 0;
    const percentageOfLimit = Math.round((value / whoLimit) * 100);

    let status: PollutantDetail["status"] = "nominal";
    if (percentageOfLimit > 300) status = "critical";
    else if (percentageOfLimit > 150) status = "unhealthy";
    else if (percentageOfLimit > 100) status = "moderate";

    return {
      code,
      name,
      value,
      unit,
      whoLimit,
      percentageOfLimit,
      status,
    };
  }

  private async fetchAirQuality(lat: number, lng: number) {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("[EnvironmentalProvider] Air Quality fetch failed:", e);
      return null;
    }
  }

  private async fetchWeather(lat: number, lng: number) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("[EnvironmentalProvider] Weather fetch failed:", e);
      return null;
    }
  }

  private async fetchFiresAroundPoint(lat: number, lng: number): Promise<{ count: number; hotspots: FireHotspot[] }> {
    const delta = 0.5; // ~50km radius box
    return this.fetchFiresInBbox(lng - delta, lat - delta, lng + delta, lat + delta);
  }

  private async fetchFiresInBbox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number
  ): Promise<{ count: number; hotspots: FireHotspot[] }> {
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${minLng.toFixed(2)},${minLat.toFixed(2)},${maxLng.toFixed(2)},${maxLat.toFixed(2)}/1`;
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (!res.ok) return { count: 0, hotspots: [] };

      const csv = await res.text();
      const lines = csv.trim().split("\n");
      if (lines.length <= 1) return { count: 0, hotspots: [] };

      const headers = lines[0].split(",");
      const latIdx = headers.indexOf("latitude");
      const lngIdx = headers.indexOf("longitude");
      const brightIdx = headers.indexOf("bright_ti4");
      const satIdx = headers.indexOf("satellite");
      const confIdx = headers.indexOf("confidence");
      const dateIdx = headers.indexOf("acq_date");
      const timeIdx = headers.indexOf("acq_time");

      const hotspots: FireHotspot[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length >= 7) {
          hotspots.push({
            latitude: parseFloat(parts[latIdx]),
            longitude: parseFloat(parts[lngIdx]),
            brightness: parseFloat(parts[brightIdx] || "300"),
            satellite: parts[satIdx] || "VIIRS",
            confidence: parts[confIdx] || "nominal",
            acquiredDate: parts[dateIdx] || "",
            acquiredTime: parts[timeIdx] || "",
          });
        }
      }

      return {
        count: hotspots.length,
        hotspots: hotspots.slice(0, 25), // Cap return list for performance
      };
    } catch (e) {
      console.error("[EnvironmentalProvider] FIRMS fetch failed:", e);
      return { count: 0, hotspots: [] };
    }
  }
}

export const environmentalProvider = new EnvironmentalProvider();
