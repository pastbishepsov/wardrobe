export type Category = "top" | "bottom" | "dress" | "outerwear" | "shoes" | "bag" | "accessory";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Zone = "top" | "bottom" | "shoes";

export interface Item {
  id: string;
  created_at: string;
  name: string;
  category: Category;
  subcategory: string | null;
  colors: string[];
  pattern: string | null;
  material: string | null;
  seasons: Season[];
  warmth: number; // 1 (very light) … 5 (very warm)
  formality: number; // 1 (sport/home) … 5 (evening/formal)
  style_tags: string[];
  brand: string | null;
  notes: string | null;
  image_path: string;
  original_path: string | null;
  width: number | null;
  height: number | null;
  archived: boolean;
}

export interface ItemWithUrl extends Item {
  url: string;
}

export interface CollageLayoutItem {
  item_id: string;
  x: number; // 0..1 of canvas width (center)
  y: number; // 0..1 of canvas height (center)
  scale: number; // relative to base size
  rotation: number; // degrees
  z: number;
}

export interface TryonSelection {
  top?: string | null;
  bottom?: string | null;
  shoes?: string | null;
}

export interface OutfitLayout {
  items?: CollageLayoutItem[];
  tryon?: TryonSelection;
}

export interface Outfit {
  id: string;
  created_at: string;
  name: string | null;
  kind: "collage" | "tryon";
  item_ids: string[];
  layout: OutfitLayout;
  occasion: string | null;
}

export interface ZoneBox {
  x: number; // left, fraction of photo width
  y: number; // top, fraction of photo height
  w: number;
  h: number;
}

export interface TryonZones {
  top: ZoneBox;
  bottom: ZoneBox;
  shoes: ZoneBox;
}

export interface TryonProfile {
  id: number;
  photo_path: string | null;
  zones: TryonZones | null;
  updated_at: string | null;
}

export interface Placement {
  item_id: string;
  dx: number; // fraction of zone width
  dy: number; // fraction of zone height
  scale: number;
  rotation: number;
}

export interface Wear {
  id: string;
  worn_on: string;
  outfit_id: string | null;
  item_ids: string[];
}

export interface TripDayWeather {
  date: string;
  tmin: number;
  tmax: number;
  rain: number; // precipitation probability 0..100 or mm when from archive
  code: number;
  summary: string;
}

export interface TripPlan {
  items: string[];
  days: { date: string; item_ids: string[]; note: string }[];
  notes: string[];
  missing: string[];
}

export interface Trip {
  id: string;
  created_at: string;
  city: string;
  country: string | null;
  lat: number;
  lon: number;
  start_date: string;
  end_date: string;
  purpose: string;
  activities: string[];
  weather: { source: "forecast" | "archive"; days: TripDayWeather[] } | null;
  plan: TripPlan | null;
  packed: string[];
}

export interface GapAdvice {
  summary: string;
  gaps: { title: string; why: string; unlocks: string[]; look_for: string }[];
  quick_wins: string[];
  dead_weight: { item_id: string; reason: string }[];
}
