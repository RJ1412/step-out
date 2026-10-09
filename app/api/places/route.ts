import { NextRequest, NextResponse } from 'next/server';
import { fetchNearbyPlaces, geocodeLocation } from '@/lib/places';
import { fetchWeather } from '@/lib/weather';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Take a slow breath.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  try {
    // If user provided a search query string, geocode it first
    if (query && query.trim().length > 0) {
      const geo = await geocodeLocation(query);
      if (!geo) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      }

      const [places, weather] = await Promise.all([
        fetchNearbyPlaces(geo.lat, geo.lng),
        fetchWeather(geo.lat, geo.lng),
      ]);

      return NextResponse.json({
        location: geo,
        places,
        weather,
      });
    }

    // Otherwise use provided lat / lng
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
      }

      const [places, weather] = await Promise.all([
        fetchNearbyPlaces(lat, lng),
        fetchWeather(lat, lng),
      ]);

      return NextResponse.json({
        location: { displayName: `${lat.toFixed(2)}, ${lng.toFixed(2)}`, lat, lng },
        places,
        weather,
      });
    }

    return NextResponse.json({ error: 'Please provide either ?q= or ?lat=&lng=' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Places lookup failed' }, { status: 500 });
  }
}
