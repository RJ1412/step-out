import { NextRequest, NextResponse } from 'next/server';
import { createPlan, Mood } from '@/lib/planner';
import { fetchNearbyPlaces, geocodeLocation } from '@/lib/places';
import { fetchWeather } from '@/lib/weather';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    let { lat, lng, locationName, durationMinutes = 45, mood = 'easy' } = body;

    // Validate mood
    const validMoods: Mood[] = ['easy', 'energetic', 'curious', 'quiet'];
    if (!validMoods.includes(mood)) {
      mood = 'easy';
    }

    // Clamp duration between 30 and 240 minutes
    const duration = Math.min(240, Math.max(30, Number(durationMinutes) || 45));

    // If location string was typed without coordinates, geocode first
    if ((lat === undefined || lng === undefined) && locationName) {
      const geo = await geocodeLocation(locationName);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        locationName = geo.displayName;
      }
    }

    // Default to central coordinates if none provided
    const finalLat = typeof lat === 'number' && !isNaN(lat) ? lat : 51.5074; // London fallback
    const finalLng = typeof lng === 'number' && !isNaN(lng) ? lng : -0.1278;

    // Fetch live weather and real places in parallel with 10s upstream limit
    const [weather, places] = await Promise.all([
      fetchWeather(finalLat, finalLng),
      fetchNearbyPlaces(finalLat, finalLng),
    ]);

    const plan = await createPlan({
      lat: finalLat,
      lng: finalLng,
      locationName: locationName || `${finalLat.toFixed(2)}, ${finalLng.toFixed(2)}`,
      durationMinutes: duration,
      mood,
      places,
      weather,
    });

    return NextResponse.json({
      plan,
      weather,
      location: {
        name: locationName || places[0]?.name || 'Your area',
        lat: finalLat,
        lng: finalLng,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
