import { create } from "zustand";

export interface GeoLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
}

export interface SystemStatus {
  apiStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  feedStatus: "LIVE" | "STANDBY" | "CONNECTING";
  latencyMs: number;
  classification: string;
}

interface AppState {
  // Boot Sequence
  isBooted: boolean;
  completeBoot: () => void;

  // View & Projection
  projection: "globe" | "mercator";
  setProjection: (proj: "globe" | "mercator") => void;
  toggleProjection: () => void;

  // Selection
  selectedPoint: GeoLocation | null;
  setSelectedPoint: (point: GeoLocation | null) => void;
  selectedPolygon: number[][] | null; // GeoJSON polygon exterior ring
  setSelectedPolygon: (poly: number[][] | null) => void;
  clearSelection: () => void;

  // Cursor Telemetry
  cursorCoords: { lat: number; lng: number };
  setCursorCoords: (coords: { lat: number; lng: number }) => void;

  // Layer Toggles
  layers: {
    aqi: boolean;
    weather: boolean;
    fires: boolean;
    heatmap: boolean;
    grid: boolean;
  };
  toggleLayer: (layer: "aqi" | "weather" | "fires" | "heatmap" | "grid") => void;

  // Panels & HUD State
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  bottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // System Diagnostics
  systemStatus: SystemStatus;
  setSystemStatus: (status: Partial<SystemStatus>) => void;

  // Comparison State
  comparisonLocations: GeoLocation[];
  addComparisonLocation: (loc: GeoLocation) => void;
  removeComparisonLocation: (id: string) => void;
  clearComparisonLocations: () => void;
  compareModalOpen: boolean;
  setCompareModalOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Boot Sequence
  isBooted: false,
  completeBoot: () => set({ isBooted: true }),

  // View & Projection
  projection: "globe",
  setProjection: (projection) => set({ projection }),
  toggleProjection: () =>
    set((state) => ({
      projection: state.projection === "globe" ? "mercator" : "globe",
    })),

  // Selection
  selectedPoint: {
    id: "default-target",
    name: "NEW DELHI // SECTOR 1",
    lat: 28.6139,
    lng: 77.2090,
    country: "India",
  },
  setSelectedPoint: (selectedPoint) => set({ selectedPoint, selectedPolygon: null }),
  selectedPolygon: null,
  setSelectedPolygon: (selectedPolygon) => set({ selectedPolygon, selectedPoint: null }),
  clearSelection: () => set({ selectedPoint: null, selectedPolygon: null }),

  // Cursor Telemetry
  cursorCoords: { lat: 28.6139, lng: 77.2090 },
  setCursorCoords: (cursorCoords) => set({ cursorCoords }),

  // Layers
  layers: {
    aqi: true,
    weather: true,
    fires: true,
    heatmap: false,
    grid: true,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: !state.layers[layer],
      },
    })),

  // Panels
  leftPanelOpen: true,
  setLeftPanelOpen: (val) =>
    set((state) => ({
      leftPanelOpen: typeof val === "function" ? val(state.leftPanelOpen) : val,
    })),
  rightPanelOpen: true,
  setRightPanelOpen: (val) =>
    set((state) => ({
      rightPanelOpen: typeof val === "function" ? val(state.rightPanelOpen) : val,
    })),
  bottomPanelOpen: true,
  setBottomPanelOpen: (val) =>
    set((state) => ({
      bottomPanelOpen: typeof val === "function" ? val(state.bottomPanelOpen) : val,
    })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (val) =>
    set((state) => ({
      commandPaletteOpen:
        typeof val === "function" ? val(state.commandPaletteOpen) : val,
    })),

  // System Diagnostics
  systemStatus: {
    apiStatus: "ONLINE",
    feedStatus: "LIVE",
    latencyMs: 42,
    classification: "UNCLASSIFIED // OPEN SOURCE DATA",
  },
  setSystemStatus: (status) =>
    set((state) => ({
      systemStatus: { ...state.systemStatus, ...status },
    })),

  // Comparison
  comparisonLocations: [],
  addComparisonLocation: (loc) =>
    set((state) => {
      if (state.comparisonLocations.some((l) => l.id === loc.id)) return state;
      if (state.comparisonLocations.length >= 4) return state;
      return { comparisonLocations: [...state.comparisonLocations, loc] };
    }),
  removeComparisonLocation: (id) =>
    set((state) => ({
      comparisonLocations: state.comparisonLocations.filter((l) => l.id !== id),
    })),
  clearComparisonLocations: () => set({ comparisonLocations: [] }),
  compareModalOpen: false,
  setCompareModalOpen: (val) =>
    set((state) => ({
      compareModalOpen: typeof val === "function" ? val(state.compareModalOpen) : val,
    })),
}));
