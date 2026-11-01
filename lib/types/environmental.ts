/**
 * Environmental profile data types
 */

export interface PollutantDetail {
  code: string;
  name: string;
  value: number;
  unit: string;
  whoLimit: number;
  percentageOfLimit: number;
  status: "nominal" | "moderate" | "unhealthy" | "critical";
}

export interface AQICategory {
  label: string;
  category: "good" | "moderate" | "unhealthy-sensitive" | "unhealthy" | "very-unhealthy" | "hazardous";
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  healthRecommendation: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  surfacePressure: number;
  windSpeed: number;
  windDirection: number;
  windCompass: string;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
}

export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  satellite: string;
  confidence: string;
  acquiredDate: string;
  acquiredTime: string;
}

export interface EnvironmentalProfile {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  };
  airQuality: {
    usAqi: number;
    europeanAqi: number;
    category: AQICategory;
    dominantPollutant: string;
    pollutants: Record<string, PollutantDetail>;
  };
  weather: WeatherData;
  fires: {
    count: number;
    hotspots: FireHotspot[];
  };
  areaMetrics?: {
    isPolygon: boolean;
    areaKm2: number;
    avgAqi: number;
    minAqi: number;
    maxAqi: number;
    samplePointsCount: number;
    sampleNodes?: Array<{
      id: string;
      lat: number;
      lng: number;
      aqi: number;
      pm2_5: number;
      status: string;
    }>;
  };
  updatedAt: string;
}
