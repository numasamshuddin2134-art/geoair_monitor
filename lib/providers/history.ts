import { firebaseCache } from "../cache/firebaseCache";

export interface HistoricalDataPoint {
  time: string;
  date: string;
  usAqi: number;
  pm2_5: number;
  pm10: number;
  temperature: number;
  precipitation: number;
}

export interface HistoricalTrendsResult {
  latitude: number;
  longitude: number;
  range: "7d" | "30d" | "90d";
  points: HistoricalDataPoint[];
  summary: {
    avgAqi: number;
    peakAqi: number;
    peakDate: string;
    minAqi: number;
    minDate: string;
    avgTemp: number;
    trend: "improving" | "degrading" | "stable";
    daysAboveWhoLimit: number;
  };
  cached: boolean;
  timestamp: string;
}

export class HistoricalProvider {
  async getHistory(lat: number, lng: number, range: "7d" | "30d" | "90d" = "7d"): Promise<HistoricalTrendsResult> {
    const roundedLat = Number(lat.toFixed(2));
    const roundedLng = Number(lng.toFixed(2));
    const cacheKey = `hist_${roundedLat}_${roundedLng}_${range}`;

    // 1. Check cache
    const cached = await firebaseCache.get<HistoricalTrendsResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const pastDays = range === "90d" ? 90 : range === "30d" ? 30 : 7;

    // 2. Query Open-Meteo Air Quality and Weather with past_days
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLng}&hourly=pm2_5,pm10,us_aqi&past_days=${pastDays}&forecast_days=1&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&hourly=temperature_2m,precipitation&past_days=${pastDays}&forecast_days=1&timezone=auto`;

    const [airRes, weatherRes] = await Promise.all([
      fetch(airUrl, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } }),
      fetch(weatherUrl, { headers: { "User-Agent": "GeoAir-Monitor/1.0" } }),
    ]);

    if (!airRes.ok || !weatherRes.ok) {
      throw new Error(`History fetch failed: Air HTTP ${airRes.status}, Weather HTTP ${weatherRes.status}`);
    }

    const [airJson, weatherJson] = await Promise.all([airRes.json(), weatherRes.json()]);

    const times: string[] = airJson.hourly?.time || [];
    const rawAqi: number[] = airJson.hourly?.us_aqi || [];
    const rawPm25: number[] = airJson.hourly?.pm2_5 || [];
    const rawPm10: number[] = airJson.hourly?.pm10 || [];
    const rawTemp: number[] = weatherJson.hourly?.temperature_2m || [];
    const rawPrecip: number[] = weatherJson.hourly?.precipitation || [];

    // Downsample based on range so charts render smoothly
    // 7d: every 3 hours (56 points)
    // 30d: daily average or every 12 hours (60 points)
    // 90d: daily average (90 points)
    const step = range === "90d" ? 24 : range === "30d" ? 12 : 3;

    const points: HistoricalDataPoint[] = [];
    let sumAqi = 0;
    let sumTemp = 0;
    let peakAqi = -Infinity;
    let peakDate = "";
    let minAqi = Infinity;
    let minDate = "";
    let daysAboveWho = 0;

    for (let i = 0; i < times.length; i += step) {
      const t = times[i];
      const aqi = Math.round(rawAqi[i] ?? 40);
      const pm25 = Number((rawPm25[i] ?? 12).toFixed(1));
      const pm10 = Number((rawPm10[i] ?? 25).toFixed(1));
      const temp = Number((rawTemp[i] ?? 20).toFixed(1));
      const precip = Number((rawPrecip[i] ?? 0).toFixed(1));

      const dateObj = new Date(t);
      const formattedTime =
        range === "7d"
          ? dateObj.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" })
          : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      points.push({
        time: formattedTime,
        date: t,
        usAqi: aqi,
        pm2_5: pm25,
        pm10: pm10,
        temperature: temp,
        precipitation: precip,
      });

      sumAqi += aqi;
      sumTemp += temp;

      if (aqi > peakAqi) {
        peakAqi = aqi;
        peakDate = formattedTime;
      }
      if (aqi < minAqi) {
        minAqi = aqi;
        minDate = formattedTime;
      }
      if (pm25 > 15) {
        daysAboveWho++;
      }
    }

    const count = points.length || 1;
    const avgAqi = Math.round(sumAqi / count);
    const avgTemp = Number((sumTemp / count).toFixed(1));

    // Determine overall trend
    const firstQuarter = points.slice(0, Math.floor(count / 3));
    const lastQuarter = points.slice(-Math.floor(count / 3));
    const startAvg = firstQuarter.reduce((a, b) => a + b.usAqi, 0) / (firstQuarter.length || 1);
    const endAvg = lastQuarter.reduce((a, b) => a + b.usAqi, 0) / (lastQuarter.length || 1);

    let trend: "improving" | "degrading" | "stable" = "stable";
    if (endAvg < startAvg - 8) trend = "improving";
    else if (endAvg > startAvg + 8) trend = "degrading";

    const result: HistoricalTrendsResult = {
      latitude: roundedLat,
      longitude: roundedLng,
      range,
      points,
      summary: {
        avgAqi,
        peakAqi: peakAqi === -Infinity ? 50 : peakAqi,
        peakDate: peakDate || "Recent",
        minAqi: minAqi === Infinity ? 20 : minAqi,
        minDate: minDate || "Recent",
        avgTemp,
        trend,
        daysAboveWhoLimit: daysAboveWho,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    await firebaseCache.set(cacheKey, result, 15);
    return result;
  }
}

export const historicalProvider = new HistoricalProvider();
