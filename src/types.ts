export type OpeningDay =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

export type DataConfidence = "official" | "curated" | "fallback";

export interface MarketSource {
  label: string;
  url: string;
  confidence: DataConfidence;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface NightMarket {
  id: string;
  name: string;
  localName: string;
  city: string;
  district: string;
  address: string;
  coordinates: Coordinates;
  openingDays: OpeningDay[];
  hours: string;
  moods: string[];
  foodTypes: string[];
  transport: string[];
  nearestStation: string;
  walkingMinutes: number;
  highlights: string[];
  recommendedFoods: string[];
  practicalInfo: string[];
  source: MarketSource;
}

export interface NightMarketFilters {
  query?: string;
  city?: string;
  mood?: string;
  foodType?: string;
  transport?: string;
  openingDay?: OpeningDay;
}

export interface FilterOptions {
  cities: string[];
  moods: string[];
  foodTypes: string[];
  transport: string[];
  openingDays: OpeningDay[];
}

export type StyleId = "neon" | "travel";

export type DataStatus = "loading" | "success" | "error";

export type Locale = "en" | "zh";
