import type { VenueResponse } from '@/schemas/courts';
import { VERIFIED_VENUES, type LatLng } from './venue-locations';

/** Map centre when nothing else is known: Tăng Nhơn Phú / Quận 9, the same default the web map uses. */
export const DEFAULT_CENTER: LatLng = [10.846895, 106.797142];

const REQUEST_TIMEOUT_MS = 4000;
/** A pin this close (km) to a known venue is reported as that venue instead of a street address. */
const NEAR_VENUE_KM = 0.35;

export interface KnownVenue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sport_key?: string | null;
  keywords?: string[];
}

export interface PlaceSuggestion {
  id: string | number;
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  /** Comes from the SportGo venue list rather than OpenStreetMap. */
  isSystemVenue?: boolean;
}

const VERIFIED_KNOWN_VENUES: KnownVenue[] = VERIFIED_VENUES.map((venue, index) => ({
  id: `verified-${index + 1}`,
  name: venue.name,
  address: venue.address,
  latitude: venue.lat,
  longitude: venue.lng,
  sport_key: venue.sport,
  keywords: venue.keywords,
}));

/** Verified venues plus the ones registered in the backend; a backend venue with the same name refines coordinates. */
export function buildKnownVenues(backendVenues?: VenueResponse[]): KnownVenue[] {
  const merged = VERIFIED_KNOWN_VENUES.map((venue) => ({ ...venue }));
  for (const venue of backendVenues ?? []) {
    const existing = merged.find((item) => item.name.toLowerCase() === venue.name.toLowerCase());
    if (existing) {
      if (venue.latitude != null && venue.longitude != null) {
        existing.latitude = venue.latitude;
        existing.longitude = venue.longitude;
      }
    } else if (venue.latitude != null && venue.longitude != null) {
      merged.push({
        id: `venue-${venue.id}`,
        name: venue.name,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        sport_key: venue.sport_key,
      });
    }
  }
  return merged;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** GET JSON with a timeout; any failure (offline, timeout, bad status) resolves to null so callers can fall back. */
async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Nominatim's usage policy asks clients to identify themselves.
      headers: { Accept: 'application/json', 'Accept-Language': 'vi', 'User-Agent': 'SportGo-Mobile/1.0' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

interface NominatimSearchItem {
  place_id: number;
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
}

/** Venue-list matches first (by name, address or keyword), topped up from OpenStreetMap when fewer than 3 match. */
export async function searchPlaces(query: string, venues: KnownVenue[], signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  const matched: PlaceSuggestion[] = venues
    .filter((venue) => {
      const nameMatch = venue.name.toLowerCase().includes(term);
      const addressMatch = venue.address.toLowerCase().includes(term);
      const keywordMatch = venue.keywords?.some((keyword) => term.includes(keyword) || keyword.includes(term));
      return nameMatch || addressMatch || keywordMatch;
    })
    .slice(0, 5)
    .map((venue) => ({
      id: venue.id,
      title: venue.name,
      subtitle: venue.address,
      lat: venue.latitude,
      lon: venue.longitude,
      isSystemVenue: true,
    }));

  let osm: PlaceSuggestion[] = [];
  if (matched.length < 3) {
    const data = await fetchJson<NominatimSearchItem[]>(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&countrycodes=vn&addressdetails=1&limit=4`,
      signal,
    );
    osm = (data ?? []).map((item) => ({
      id: item.place_id,
      title: item.name || item.display_name?.split(',')[0] || term,
      subtitle: item.display_name ?? '',
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  }
  return [...matched, ...osm];
}

interface BigDataCloudReverse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
}

interface NominatimReverse {
  error?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

/** Turns a map pin into text: a nearby SportGo venue, else a street address, else the raw coordinates. */
export async function reverseAddress(lat: number, lon: number, venues: KnownVenue[]): Promise<string> {
  const nearby = venues.find((venue) => distanceKm(lat, lon, venue.latitude, venue.longitude) <= NEAR_VENUE_KM);
  if (nearby) return `${nearby.name} (${nearby.address})`;

  const bigData = await fetchJson<BigDataCloudReverse>(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`,
  );
  if (bigData) {
    const parts: string[] = [];
    if (bigData.locality) parts.push(bigData.locality);
    if (bigData.city && bigData.city !== bigData.locality && bigData.city !== bigData.principalSubdivision) {
      parts.push(bigData.city);
    }
    if (bigData.principalSubdivision) parts.push(bigData.principalSubdivision);
    if (parts.length > 0) return parts.join(', ');
  }

  const osm = await fetchJson<NominatimReverse>(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
  );
  if (osm && !osm.error) {
    const address = osm.address ?? {};
    const parts: string[] = [];
    const place = osm.name && osm.name !== address.road ? osm.name : '';
    if (place) parts.push(place);
    const street = [address.house_number, address.road].filter(Boolean).join(' ');
    if (street && street !== place) parts.push(street);
    const sub = address.suburb || address.quarter || address.neighbourhood || address.village;
    if (sub) parts.push(sub);
    const district = address.city_district || address.district || address.county || address.town;
    if (district) parts.push(district);
    const city = address.city || address.state;
    if (city) parts.push(city);
    if (parts.length > 0) return parts.join(', ');
    if (osm.display_name) return osm.display_name.split(',').slice(0, 4).join(',').trim();
  }

  return `Vị trí bản đồ (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

/** Best-effort coordinates for a free-text address: venue list first, then OpenStreetMap. */
export async function geocodeLocation(location: string, venues: KnownVenue[], signal?: AbortSignal): Promise<LatLng | null> {
  const lower = location.toLowerCase();
  const known = venues.find(
    (venue) => lower.includes(venue.name.toLowerCase()) || lower.includes(venue.address.toLowerCase()),
  );
  if (known) return [known.latitude, known.longitude];

  // Drop the "(address)" suffix and generic "Sân ..." words so the geocoder sees just the place.
  const cleaned = location
    .replace(/\([^)]*\)/g, ' ')
    .replace(/Sân\s*(cầu lông|bóng đá|pickleball|tennis)?/gi, '')
    .trim();
  const data = await fetchJson<NominatimSearchItem[]>(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned || location)}&countrycodes=vn&limit=1`,
    signal,
  );
  if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}
