import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { text, errorResult } from "../lib/result.js";
import { fetchJson } from "../lib/http.js";

/**
 * A networked tool that composes two calls (geocode → forecast) against the
 * free, key-less Open-Meteo API. Shows the real-world shape: external I/O,
 * timeouts (via fetchJson), expected failures returned as `errorResult`, and
 * unexpected failures left to throw (the SDK converts them to error responses).
 */
interface GeoResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
    admin1?: string;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
};

export function registerWeatherTools(server: McpServer): void {
  server.tool(
    "get_weather",
    "Current weather for a city via the free Open-Meteo API (no API key required).",
    {
      city: z.string().min(1).describe("City name, e.g. 'Austin' or 'Austin, TX'"),
      units: z.enum(["celsius", "fahrenheit"]).default("fahrenheit").describe("Temperature units"),
    },
    async ({ city, units }) => {
      const geo = await fetchJson<GeoResponse>(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
      );
      const place = geo.results?.[0];
      if (!place) return errorResult(`No location found for "${city}".`);

      const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";
      const windUnit = units === "celsius" ? "kmh" : "mph";

      const forecast = await fetchJson<ForecastResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
          `&current=temperature_2m,wind_speed_10m,weather_code` +
          `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`,
      );
      const current = forecast.current;
      if (!current) return errorResult(`No current weather available for "${city}".`);

      return text({
        location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
        temperature: `${current.temperature_2m}°${units === "celsius" ? "C" : "F"}`,
        wind: `${current.wind_speed_10m} ${windUnit}`,
        conditions: WEATHER_CODES[current.weather_code] ?? `Code ${current.weather_code}`,
        observedAt: current.time,
      });
    },
  );
}
