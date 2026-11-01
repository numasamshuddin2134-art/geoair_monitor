/**
 * Core Provider Abstraction Layer Types for GeoAir Monitor
 */

export interface GeocodeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  admin1?: string; // State / Region / Province
  elevation?: number;
  timezone?: string;
}

export interface IGeocodingProvider {
  search(query: string, limit?: number): Promise<GeocodeLocation[]>;
  reverse(lat: number, lng: number): Promise<GeocodeLocation | null>;
}
