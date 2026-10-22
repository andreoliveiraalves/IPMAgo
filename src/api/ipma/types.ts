/**
 * Raw response shapes from the IPMA open-data API.
 *
 * Everything numeric is serialized as a string by IPMA (e.g. "19.8"), so these
 * types intentionally keep the wire format. Normalization happens in `api.ts`.
 */

export type IpmaEnvelope<T> = {
  owner: string;
  country: string;
  data: T[];
};

export type IpmaLocation = {
  idRegiao: number;
  idAreaAviso: string;
  idConcelho: number;
  globalIdLocal: number;
  latitude: string;
  idDistrito: number;
  local: string;
  longitude: string;
};

export type IpmaDailyForecast = {
  precipitaProb: string;
  tMin: string;
  tMax: string;
  predWindDir: string;
  idWeatherType: number;
  classWindSpeed: number;
  longitude: string;
  forecastDate: string;
  latitude: string;
};

export type IpmaWeatherTypeClass = {
  descWeatherTypeEN: string;
  descWeatherTypePT: string;
  idWeatherType: number;
};

export type IpmaWindSpeedClass = {
  descClassWindSpeedDailyEN: string;
  descClassWindSpeedDailyPT: string;
  classWindSpeed: string;
};

/** Normalized models used by the app. */

export type DailyForecast = {
  /** `YYYY-MM-DD`, local date as published by IPMA. */
  date: string;
  minTemp: number;
  maxTemp: number;
  /** Percentage, 0-100. */
  rainProbability: number;
  /** Cardinal direction, e.g. `NW`. */
  windDirection: string;
  /** IPMA wind class; resolve the label with `WindSpeedClass`. */
  windClass: number;
  /** IPMA weather type id; resolve the label with `WeatherTypeClass`. */
  weatherTypeId: number;
};

export type ForecastBundle = {
  globalIdLocal: number;
  days: DailyForecast[];
  /** Epoch ms of the successful request that produced this data. */
  fetchedAt: number;
};

export type WeatherTypeClass = {
  id: number;
  pt: string;
  en: string;
};

export type WindSpeedClass = {
  id: number;
  pt: string;
  en: string;
};

export type ReferenceData = {
  weatherTypes: Record<number, WeatherTypeClass>;
  windClasses: Record<number, WindSpeedClass>;
  fetchedAt: number;
};
