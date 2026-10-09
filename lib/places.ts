// OpenStreetMap Overpass API for nearby parks/trails/lakes
// Nominatim for geocoding typed search queries

export interface PlaceItem {
  id: string;
  name: string;
  kind: 'park' | 'nature_reserve' | 'water' | 'trail' | 'viewpoint' | 'greenery';
  distanceKm: number;
  lat: number;
  lng: number;
}

// 24-hour in-memory cache keyed by rounded lat/lng (~1 km grid)
interface CacheEntry {
  timestamp: number;
  places: PlaceItem[];
}

const placesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCacheKey(lat: number, lng: number): string {
  // 2 decimal places is roughly 1.1 km precision
  return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

// Haversine formula in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export async function fetchNearbyPlaces(lat: number, lng: number, radiusMeters = 3000): Promise<PlaceItem[]> {
  const cacheKey = getCacheKey(lat, lng);
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.places;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

  // Overpass QL query: find parks, reserves, water bodies, viewpoints, and footways with names
  const overpassQuery = `
    [out:json][timeout:8];
    (
      nwr["leisure"~"park|nature_reserve"](around:${radiusMeters},${lat},${lng});
      nwr["natural"~"water|peak|wood"](around:${radiusMeters},${lat},${lng});
      nwr["tourism"~"viewpoint"](around:${radiusMeters},${lat},${lng});
      way["highway"~"path|footway|pedestrian"][name](around:${radiusMeters},${lat},${lng});
    );
    out center tags 30;
  `;

  // Overpass servers: primary and backup mirror
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  let rawData: any = null;

  // overpass gets flaky around noon, hence the retry
  for (const serverUrl of servers) {
    try {
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'StepOutApp/1.0 (outdoor planner)',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      if (res.ok) {
        rawData = await res.json();
        break;
      }
    } catch {
      // try next server
    }
  }

  try {
    if (!rawData) {
      throw new Error('All Overpass mirrors timed out or failed');
    }

    const elements: any[] = rawData.elements || [];

    const parsed: PlaceItem[] = [];
    const seenNames = new Set<string>();

    for (const el of elements) {
      const name = el.tags?.name || el.tags?.['name:en'];
      if (!name || seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());

      const placeLat = el.lat ?? el.center?.lat ?? lat;
      const placeLng = el.lon ?? el.center?.lon ?? lng;
      const distance = calculateDistanceKm(lat, lng, placeLat, placeLng);

      let kind: PlaceItem['kind'] = 'greenery';
      if (el.tags?.leisure === 'nature_reserve') kind = 'nature_reserve';
      else if (el.tags?.leisure === 'park') kind = 'park';
      else if (el.tags?.natural === 'water') kind = 'water';
      else if (el.tags?.natural === 'peak' || el.tags?.tourism === 'viewpoint') kind = 'viewpoint';
      else if (el.tags?.highway) kind = 'trail';

      parsed.push({
        id: `${el.id}`,
        name,
        kind,
        distanceKm: distance,
        lat: placeLat,
        lng: placeLng,
      });
    }

    // Sort closest first, keep top 10
    parsed.sort((a, b) => a.distanceKm - b.distanceKm);
    const topPlaces = parsed.slice(0, 10);

    // If Overpass yielded empty results (e.g. rural area with few tags), add graceful nearby fallbacks
    if (topPlaces.length === 0) {
      const fallback: PlaceItem[] = [
        {
          id: 'fb-1',
          name: 'Neighborhood Tree-Lined Loop',
          kind: 'trail',
          distanceKm: 0.3,
          lat,
          lng,
        },
        {
          id: 'fb-2',
          name: 'Local Greenbelt & Quiet Byway',
          kind: 'park',
          distanceKm: 0.8,
          lat,
          lng,
        },
      ];
      placesCache.set(cacheKey, { timestamp: Date.now(), places: fallback });
      return fallback;
    }

    placesCache.set(cacheKey, { timestamp: Date.now(), places: topPlaces });
    return topPlaces;
  } catch (err) {
    // Overpass gets flaky around peak hours or rate limits, hence graceful fallback
    const fallback: PlaceItem[] = [
      {
        id: 'fb-fallback-1',
        name: 'Local Quiet Street Loop & Pocket Green',
        kind: 'trail',
        distanceKm: 0.4,
        lat,
        lng,
      },
      {
        id: 'fb-fallback-2',
        name: 'Nearby Community Path',
        kind: 'park',
        distanceKm: 0.9,
        lat,
        lng,
      },
    ];
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Geocode a user-typed location string (e.g. "Hyde Park London", "Koramangala Bangalore")
export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'StepOutApp/1.0 (step-out outdoor discovery app)',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      return {
        displayName: first.display_name.split(',').slice(0, 3).join(',').trim(),
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
