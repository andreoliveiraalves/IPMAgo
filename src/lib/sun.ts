/**
 * Sunrise/sunset for a coordinate, computed locally.
 *
 * IPMA does not publish sun times in any of its open/public feeds, so the app
 * derives them from the classic "Almanac for Computers" solar algorithm
 * (accurate to about a minute at Portuguese latitudes). Everything stays
 * offline and works for every one of the 423 locations.
 */

export type SunDay = {
  /** UTC instant of sunrise, or `null` on polar day/night. */
  sunrise: Date | null;
  /** UTC instant of sunset, or `null` on polar day/night. */
  sunset: Date | null;
};

/** Standard refraction-adjusted zenith used for "sun above the horizon". */
const ZENITH_DEGREES = 90.833;
const MS_PER_HOUR = 3_600_000;

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/**
 * Sun times for the local calendar day `isoDate` (`YYYY-MM-DD`) at the given
 * coordinates. Longitude is positive to the east, latitude positive north.
 */
export function sunTimes(latitude: number, longitude: number, isoDate: string): SunDay {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

  if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { sunrise: null, sunset: null };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const midnightUtc = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.floor((midnightUtc - Date.UTC(year, 0, 0)) / 86_400_000);

  const lngHour = longitude / 15;
  const latitudeRad = toRadians(latitude);
  const cosLatitude = Math.cos(latitudeRad);

  const compute = (rising: boolean): Date | null => {
    // First approximation of the event in local mean time.
    const approx = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;

    // Sun's mean anomaly and true longitude.
    const meanAnomaly = 0.9856 * approx - 3.289;
    const trueLongitude = normalizeDegrees(
      meanAnomaly +
        1.916 * Math.sin(toRadians(meanAnomaly)) +
        0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
        282.634
    );

    // Right ascension, moved into the same quadrant as the true longitude.
    let rightAscension = normalizeDegrees(
      toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))))
    );
    const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
    const ascensionQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = (rightAscension + (longitudeQuadrant - ascensionQuadrant)) / 15;

    const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
    const cosDeclination = Math.cos(Math.asin(sinDeclination));

    const cosHourAngle =
      (Math.cos(toRadians(ZENITH_DEGREES)) - sinDeclination * Math.sin(latitudeRad)) /
      (cosDeclination * cosLatitude);

    // Polar day/night: the sun never crosses the horizon on this date.
    if (cosHourAngle > 1 || cosHourAngle < -1) {
      return null;
    }

    const hourAngle =
      (rising ? 360 - toDegrees(Math.acos(cosHourAngle)) : toDegrees(Math.acos(cosHourAngle))) /
      15;

    const localMeanTime = hourAngle + rightAscension - 0.06571 * approx - 6.622;
    const utcHours = ((localMeanTime - lngHour) % 24 + 24) % 24;

    return new Date(midnightUtc + utcHours * MS_PER_HOUR);
  };

  return { sunrise: compute(true), sunset: compute(false) };
}

/** Local `HH:MM` for a computed sun event. */
export function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}
