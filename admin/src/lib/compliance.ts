/**
 * Shared compliance rules — the auto-flag thresholds and geofence math.
 *
 * MIRRORED FILE — an identical copy lives at mobile/lib/compliance.ts.
 * These exact numbers appear in the Timesheets screen, the seed data, and the
 * worker app's clock-in copy; they live here once, never as magic numbers.
 */

/** Clock-in more than this many minutes after shift start → 'late'. */
export const LATE_THRESHOLD_MIN = 15;

/** No clock-out this many hours after shift end → 'missing_clock_out' (read-time). */
export const MISSING_CLOCK_OUT_GRACE_H = 2;

/** Soft-warn ceiling for a worker's rostered hours in one Mon–Sun week. */
export const MAX_WEEK_HOURS = 38;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export interface ClockInFlagsInput {
  /** Shift scheduled start (ISO, UTC). */
  shiftStartsAt: string;
  /** Actual clock-in moment. */
  clockInAt: Date;
  /** Distance from site in metres — null when location was unavailable. */
  distanceM: number | null;
  geofenceRadiusM: number;
}

export interface ClockInFlagsResult {
  flags: ('late' | 'out_of_zone')[];
  withinGeofence: boolean | null;
  status: 'pending' | 'flagged';
}

/** late / out_of_zone are computed and stored at clock-in mutation time. */
export function computeClockInFlags(input: ClockInFlagsInput): ClockInFlagsResult {
  const flags: ('late' | 'out_of_zone')[] = [];

  const lateMs = input.clockInAt.getTime() - new Date(input.shiftStartsAt).getTime();
  if (lateMs > LATE_THRESHOLD_MIN * 60_000) flags.push('late');

  const withinGeofence =
    input.distanceM === null ? null : input.distanceM <= input.geofenceRadiusM;
  if (withinGeofence === false) flags.push('out_of_zone');

  return { flags, withinGeofence, status: flags.length > 0 ? 'flagged' : 'pending' };
}
