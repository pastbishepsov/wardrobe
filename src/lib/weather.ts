import { weatherCodeSummary } from "./taxonomy";
import type { TripDayWeather } from "./types";

export interface GeoResult {
  name: string;
  country: string | null;
  lat: number;
  lon: number;
}

export async function geocode(city: string): Promise<GeoResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ru");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: { name: string; country?: string; latitude: number; longitude: number }[] };
  const r = json.results?.[0];
  if (!r) return null;
  return { name: r.name, country: r.country ?? null, lat: r.latitude, lon: r.longitude };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function shiftYear(date: string, years: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Forecast for the trip. Open-Meteo gives ~16 days ahead; for later dates we take the same
 * dates from last year's archive as an estimate.
 */
export async function tripWeather(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<{ source: "forecast" | "archive"; days: TripDayWeather[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = daysBetween(today, endDate);

  if (horizon <= 15 && daysBetween(today, startDate) >= -1) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as {
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: (number | null)[];
          weather_code: number[];
        };
      };
      return {
        source: "forecast",
        days: j.daily.time.map((date, i) => ({
          date,
          tmax: j.daily.temperature_2m_max[i],
          tmin: j.daily.temperature_2m_min[i],
          rain: j.daily.precipitation_probability_max[i] ?? 0,
          code: j.daily.weather_code[i],
          summary: weatherCodeSummary(j.daily.weather_code[i]),
        })),
      };
    }
  }

  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", shiftYear(startDate, -1));
  url.searchParams.set("end_date", shiftYear(endDate, -1));
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Сервис погоды недоступен");
  const j = (await res.json()) as {
    daily: {
      time: string[];
      temperature_2m_max: (number | null)[];
      temperature_2m_min: (number | null)[];
      precipitation_sum: (number | null)[];
      weather_code: (number | null)[];
    };
  };
  return {
    source: "archive",
    days: j.daily.time.map((date, i) => ({
      date: shiftYear(date, 1),
      tmax: j.daily.temperature_2m_max[i] ?? 15,
      tmin: j.daily.temperature_2m_min[i] ?? 8,
      rain: j.daily.precipitation_sum[i] ?? 0,
      code: j.daily.weather_code[i] ?? 1,
      summary: weatherCodeSummary(j.daily.weather_code[i] ?? 1),
    })),
  };
}
