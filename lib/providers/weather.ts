import { firebaseCache } from "../cache/firebaseCache";
import { WeatherData } from "../types/environmental";
import { getWindCompass, getWeatherDescription } from "./environmental";

export interface WeatherResult extends WeatherData {
  latitude: number;
  longitude: number;
  hourlyForecast?: {
    time: string[];
    temperature: number[];
    precipitationProbability: number[];
  };
  source: "Open-Meteo High-Resolution Ensemble";
  cached: boolean;
  timestamp: string;
}

export class WeatherProvider {
  private baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getWeather(lat: number, lng: number): Promise<WeatherResult> {
    const roundedLat = Number(lat.toFixed(2));
    const roundedLng = Number(lng.toFixed(2));
    const cacheKey = `weather_${roundedLat}_${roundedLng}`;

    // 1. Check cache
    const cached = await firebaseCache.get<WeatherResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Fetch fresh from Open-Meteo
    const url = `${this.baseUrl}?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&forecast_days=2&timezone=auto`;

    const res = await fetch(url, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } });
    if (!res.ok) {
      throw new Error(`Open-Meteo Weather error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const cur = data.current || {};

    const hourly = data.hourly
      ? {
          time: data.hourly.time.slice(0, 24),
          temperature: (data.hourly.temperature_2m || []).slice(0, 24),
          precipitationProbability: (data.hourly.precipitation_probability || []).slice(0, 24),
        }
      : undefined;

    const result: WeatherResult = {
      latitude: roundedLat,
      longitude: roundedLng,
      temperature: cur.temperature_2m ?? 20,
      apparentTemperature: cur.apparent_temperature ?? 20,
      relativeHumidity: cur.relative_humidity_2m ?? 50,
      surfacePressure: cur.surface_pressure ?? 1013,
      windSpeed: cur.wind_speed_10m ?? 10,
      windDirection: cur.wind_direction_10m ?? 0,
      windCompass: getWindCompass(cur.wind_direction_10m ?? 0),
      precipitation: cur.precipitation ?? 0,
      weatherCode: cur.weather_code ?? 0,
      weatherDescription: getWeatherDescription(cur.weather_code ?? 0),
      hourlyForecast: hourly,
      source: "Open-Meteo High-Resolution Ensemble",
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // 3. Save to Firebase cache (15 min TTL)
    await firebaseCache.set(cacheKey, result, 15);

    return result;
  }
}

export const weatherProvider = new WeatherProvider();
