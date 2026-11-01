import { GeocodeLocation, IGeocodingProvider } from "./types";

export class OpenMeteoGeocodingProvider implements IGeocodingProvider {
  private searchUrl = "https://geocoding-api.open-meteo.com/v1/search";

  async search(query: string, limit: number = 8): Promise<GeocodeLocation[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `${this.searchUrl}?name=${encodeURIComponent(
        query.trim()
      )}&count=${limit}&language=en&format=json`;

      const response = await fetch(url, {
        headers: { "User-Agent": "GeoAir-Monitor/1.0" },
        next: { revalidate: 3600 }, // Cache search queries for 1 hour
      });

      if (!response.ok) {
        throw new Error(`Geocoding HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((item: any) => ({
        id: String(item.id || `${item.latitude}-${item.longitude}`),
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country,
        countryCode: item.country_code,
        admin1: item.admin1,
        elevation: item.elevation,
        timezone: item.timezone,
      }));
    } catch (error) {
      console.error("[GeocodingProvider] Search error:", error);
      return [];
    }
  }

  async reverse(lat: number, lng: number): Promise<GeocodeLocation | null> {
    try {
      // Free keyless reverse geocoder for fast sector naming
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const response = await fetch(url, {
        headers: { "User-Agent": "GeoAir-Monitor/1.0" },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return {
          id: `${lat.toFixed(4)},${lng.toFixed(4)}`,
          name: `SECTOR [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`,
          latitude: lat,
          longitude: lng,
        };
      }

      const data = await response.json();
      const locality = data.locality || data.city || data.principalSubdivision || data.countryName;
      const name = locality ? `${locality.toUpperCase()}` : `SECTOR [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`;

      return {
        id: `${lat.toFixed(4)},${lng.toFixed(4)}`,
        name,
        latitude: lat,
        longitude: lng,
        country: data.countryName,
        countryCode: data.countryCode,
        admin1: data.principalSubdivision,
      };
    } catch (error) {
      return {
        id: `${lat.toFixed(4)},${lng.toFixed(4)}`,
        name: `SECTOR [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`,
        latitude: lat,
        longitude: lng,
      };
    }
  }
}

// Singleton factory instance
export const geocodingProvider = new OpenMeteoGeocodingProvider();
