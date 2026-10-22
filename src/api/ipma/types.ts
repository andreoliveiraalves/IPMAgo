/**
 * Raw response shapes from the IPMA APIs.
 *
 * IPMA serializes most numbers as strings (e.g. "19.8"), so these types keep
 * the wire format. Normalization happens in `api/ipma/index.ts`.
 *
 * Two APIs are used:
 * - `open-data` — documented, but only covers 35 locations for daily forecasts.
 * - `public-data` — used by the IPMA website itself; covers all 423 locations
 *   and provides hourly/3-hourly data. It is undocumented, so the forecast
 *   layer falls back to `open-data` when it is unavailable.
 */

export type IpmaEnvelope<T> = {
  owner: string;
  country: string;
  data: T[];
};

/** Some forecast endpoints add the target date to the envelope. */
export type IpmaForecastEnvelope<T> = IpmaEnvelope<T> & {
  forecastDate: string;
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

/** One entry of `public-data/forecast/aggregate/{id}.json`. */
export type IpmaAggregateEntry = {
  dataPrev: string;
  dataUpdate: string;
  globalIdLocal: number;
  /** 1 = hourly, 3 = 3-hourly, 24 = daily. */
  idPeriodo: number;
  idTipoTempo: number;
  probabilidadePrecipita: string;
  ddVento: string;
  idFfxVento?: number;
  tMin?: string;
  tMax?: string;
  tMed?: string;
  iUv?: string;
  hR?: string;
  utci?: string;
  ffVento?: string;
  tempAguaMar?: string;
  ondulacao?: string;
  dirOndulacao?: string;
  marTotal?: string;
  periodOndulacao?: string;
  periodoPico?: string;
};

/** One entry of `open-data/forecast/meteorology/cities/daily/{id}.json`. */
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

/** `open-data/sea-locations.json` */
export type IpmaSeaLocation = {
  idRegiao: number;
  idAreaAviso: string;
  globalIdLocal: number;
  idLocal: number;
  latitude: string;
  local: string;
  longitude: string;
};

/** One entry of `open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day{n}.json`. */
export type IpmaSeaForecast = {
  wavePeriodMin: string;
  globalIdLocal: number;
  totalSeaMax: number;
  waveHighMax: string;
  waveHighMin: string;
  longitude: string;
  wavePeriodMax: string;
  latitude: string;
  totalSeaMin: number;
  sstMax: string;
  predWaveDir: string;
  sstMin: string;
};

/** `open-data/forecast/meteorology/rcm/rcm-d{n}.json` */
export type IpmaFireRiskFile = {
  dataPrev: string;
  dataRun: string;
  fileDate: string;
  local: Record<string, IpmaFireRiskLocal>;
};

export type IpmaFireRiskLocal = {
  data: { rcm: number };
  dico: string;
  latitude: number;
  longitude: number;
};

/** Normalized models used by the app. */

export type DailyForecast = {
  /** `YYYY-MM-DD`, local date as published by IPMA. */
  date: string;
  minTemp: number;
  maxTemp: number;
  /** Percentage, 0-100; null when IPMA reports no data (-99). */
  rainProbability: number | null;
  /** Cardinal direction, e.g. `NW`. */
  windDirection: string;
  /** IPMA wind class; resolve the label with `WindSpeedClass`. */
  windClass: number;
  /** IPMA weather type id; resolve the label with `WeatherTypeClass`. */
  weatherTypeId: number;
  /** UV index; null when unavailable. */
  uvIndex: number | null;
};

export type HourlyForecast = {
  /** Naive ISO timestamp exactly as published, e.g. `2026-10-22T14:00:00`. */
  time: string;
  temp: number;
  feelings: number | null;
  /** Relative humidity, percentage. */
  humidity: number | null;
  /** Wind speed in km/h. */
  windSpeed: number | null;
  windDirection: string;
  rainProbability: number | null;
  weatherTypeId: number;
  /** 1 for hourly data, 3 for 3-hourly data. */
  stepHours: 1 | 3;
};

export type ForecastBundle = {
  globalIdLocal: number;
  days: DailyForecast[];
  hourly: HourlyForecast[];
  /** Epoch ms of the model update, from IPMA's `dataUpdate`. */
  updatedAt: number;
  /** Epoch ms of the successful request that produced this data. */
  fetchedAt: number;
};

export type FireRiskDay = {
  date: string;
  /** DICO (municipality code) -> risk level 1-5. */
  levels: Record<string, number>;
};

export type FireRiskBundle = {
  days: FireRiskDay[];
  fetchedAt: number;
};

export type SeaZone = {
  globalIdLocal: number;
  name: string;
  latitude: number;
  longitude: number;
};

export type SeaForecastDay = {
  date: string;
  waveHeightMin: number;
  waveHeightMax: number;
  totalSeaMin: number;
  totalSeaMax: number;
  waveDirection: string;
  wavePeriodMin: number | null;
  wavePeriodMax: number | null;
  seaTempMin: number | null;
  seaTempMax: number | null;
};

export type SeaBundle = {
  zones: SeaZone[];
  /** zone id -> ordered forecast days */
  daysByZone: Record<number, SeaForecastDay[]>;
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
