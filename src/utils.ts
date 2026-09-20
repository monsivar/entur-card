import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type {
  EnturCardEntityConfig,
  EnturDeparture,
} from "./types";

dayjs.extend(customParseFormat);

export interface ResolvedDeparture extends EnturDeparture {
  route: string;
  time?: string;
}

export function normalizeEntityConfig(
  value: EnturCardEntityConfig | string
): EnturCardEntityConfig {
  return typeof value === "string" ? { entity: value } : value;
}

export function getEntityId(value: EnturCardEntityConfig | string): string | undefined {
  return normalizeEntityConfig(value).entity;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function fromRecord(value: unknown): ResolvedDeparture | undefined {
  if (!value || typeof value !== "object") return undefined;

  const item = value as Record<string, unknown>;
  const route = String(item.route ?? item.front_display ?? item.line ?? "").trim();
  if (!route) return undefined;

  return {
    route,
    route_id: typeof item.route_id === "string" ? item.route_id : undefined,
    destination:
      typeof item.destination === "string" ? item.destination : undefined,
    expected_at:
      typeof item.expected_at === "string" ? item.expected_at : undefined,
    due_at: typeof item.due_at === "string" ? item.due_at : undefined,
    time: typeof item.time === "string" ? item.time : undefined,
    minutes: asNumber(item.minutes),
    delay: asNumber(item.delay),
    realtime: asBoolean(item.realtime ?? item.real_time),
  };
}

function fromLegacyString(value: unknown): ResolvedDeparture | undefined {
  if (typeof value !== "string") return undefined;

  const match = value.trim().match(/^(ca\.\s*)?(\d{1,2}:\d{2})\s+(.+)$/);
  if (!match) return undefined;

  return {
    route: match[3].trim(),
    time: match[2],
    realtime: !match[1],
  };
}

function firstDeparture(attributes: Record<string, unknown>): ResolvedDeparture | undefined {
  return fromRecord({
    route: attributes.route,
    route_id: attributes.route_id,
    due_at: attributes.due_at,
    expected_at: attributes.expected_at,
    minutes: attributes.minutes,
    delay: attributes.delay,
    realtime: attributes.realtime ?? attributes.real_time,
    destination: attributes.destination,
  });
}

function nextDeparture(attributes: Record<string, unknown>): ResolvedDeparture | undefined {
  return fromRecord({
    route: attributes.next_route,
    route_id: attributes.next_route_id,
    due_at: attributes.next_due_at,
    expected_at: attributes.next_expected_at,
    minutes: asNumber(attributes.next_due_in ?? attributes.next_minutes),
    delay: attributes.next_delay,
    realtime: attributes.next_realtime ?? attributes.next_real_time,
    destination: attributes.next_destination,
  });
}

export function getDepartures(route: { state: string; attributes: Record<string, unknown> }): ResolvedDeparture[] {
  const attributes = route.attributes;
  const structured = Array.isArray(attributes.departures)
    ? attributes.departures
        .map(fromRecord)
        .filter((departure): departure is ResolvedDeparture => Boolean(departure))
    : [];

  if (structured.length) return structured;

  const departures: ResolvedDeparture[] = [];
  const first = firstDeparture(attributes);
  if (first) {
    const stateMinutes = asNumber(route.state);
    if (stateMinutes !== undefined) first.minutes = stateMinutes;
    departures.push(first);
  }

  const next = nextDeparture(attributes);
  if (next) departures.push(next);

  Object.keys(attributes)
    .filter((key) => /^departure_#\d+$/.test(key))
    .sort((a, b) => Number(a.slice(11)) - Number(b.slice(11)))
    .forEach((key) => {
      const departure = fromLegacyString(attributes[key]);
      if (departure) departures.push(departure);
    });

  return departures;
}

function parseTime(value: string, now: Dayjs): Dayjs | undefined {
  if (value.includes("T")) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : undefined;
  }

  const parsed = dayjs(`${now.format("YYYY-MM-DD")} ${value}`, "YYYY-MM-DD H:mm");
  if (!parsed.isValid()) return undefined;

  // A departure shortly after midnight belongs to the following day.
  return parsed.isBefore(now.subtract(12, "hour")) ? parsed.add(1, "day") : parsed;
}

export function departureMinutes(
  departure: EnturDeparture,
  now: Dayjs = dayjs()
): number | undefined {
  if (departure.minutes !== undefined && Number.isFinite(departure.minutes)) {
    return Math.round(departure.minutes);
  }

  const value = departure.expected_at ?? departure.due_at ?? departure.time;
  if (!value) return undefined;

  const parsed = parseTime(value, now);
  return parsed ? Math.round(parsed.diff(now, "minute", true)) : undefined;
}

export function departureClockTime(departure: EnturDeparture): string | undefined {
  const value = departure.expected_at ?? departure.due_at ?? departure.time;
  if (!value) return undefined;
  if (value.includes("T")) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("HH:mm") : undefined;
  }
  return value;
}

export function renderHumanReadable(
  departure: EnturDeparture,
  now: Dayjs = dayjs()
): { minutes: number; hours: number; translationKey: string } {
  const difference = departureMinutes(departure, now);
  if (difference === undefined) {
    return { minutes: 0, hours: 0, translationKey: "common.unknown" };
  }

  if (difference <= 0) {
    return {
      minutes: Math.abs(difference),
      hours: 0,
      translationKey: difference < -2 ? "common.departed" : "common.departing",
    };
  }

  return {
    minutes: difference % 60,
    hours: Math.floor(difference / 60),
    translationKey: "common.departs",
  };
}

export function formatRemainingMinutes(minutes: number | undefined): string {
  if (minutes === undefined) return "—";
  if (minutes <= 0) return "nå";
  return `${minutes} min`;
}
