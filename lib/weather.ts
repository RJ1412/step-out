// Open-Meteo integration: free, no API key required.
// Fetches current temp, rain risk, and local sunset time to calculate a safe "leave by" window.

export interface WeatherSummary {
  temperatureC: number;
  temperatureF: number;
  condition: string;
  isRaining: boolean;
  rainChancePercent: number;
  sunsetTime: string; // HH:MM in local time
  sunsetIso: string;
  isAfterSunset: boolean;
  rawSunset: string;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSummary> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lng.toFixed(4));
    url.searchParams.set('current', 'temperature_2m,precipitation,weather_code');
    url.searchParams.set('daily', 'sunset,precipitation_probability_max');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 900 }, // cache 15 min
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned ${res.status}`);
    }

    const data = await res.json();
    const tempC = Math.round(data.current?.temperature_2m ?? 18);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const precip = data.current?.precipitation ?? 0;
    const rainChance = data.daily?.precipitation_probability_max?.[0] ?? (precip > 0 ? 80 : 10);
    const weatherCode = data.current?.weather_code ?? 0;

    // Daily sunset ISO string (e.g. "2026-10-09T18:24")
    const sunsetIso = data.daily?.sunset?.[0] || '';
    let sunsetTime = '18:00';
    let isAfterSunset = false;

    if (sunsetIso) {
      const parts = sunsetIso.split('T');
      if (parts[1]) {
        sunsetTime = parts[1].slice(0, 5); // "18:24"
      }
      const sunsetDate = new Date(sunsetIso);
      if (!isNaN(sunsetDate.getTime())) {
        isAfterSunset = Date.now() > sunsetDate.getTime();
      }
    }

    // Rough WMO weather code mapping
    let condition = 'clear skies';
    if (weatherCode >= 1 && weatherCode <= 3) condition = 'partly cloudy';
    else if (weatherCode >= 45 && weatherCode <= 48) condition = 'foggy / misty';
    else if (weatherCode >= 51 && weatherCode <= 67) condition = 'drizzle or light rain';
    else if (weatherCode >= 71 && weatherCode <= 77) condition = 'snow flurries';
    else if (weatherCode >= 80 && weatherCode <= 82) condition = 'rain showers';
    else if (weatherCode >= 95) condition = 'thunderstorms likely';

    return {
      temperatureC: tempC,
      temperatureF: tempF,
      condition,
      isRaining: precip > 0.2 || (weatherCode >= 51 && weatherCode <= 82),
      rainChancePercent: rainChance,
      sunsetTime,
      sunsetIso,
      isAfterSunset,
      rawSunset: sunsetIso,
    };
  } catch (err) {
    // If meteo drops offline or times out, provide sensible daylight autumn defaults
    return {
      temperatureC: 18,
      temperatureF: 64,
      condition: 'overcast or mild',
      isRaining: false,
      rainChancePercent: 15,
      sunsetTime: '18:15',
      sunsetIso: '',
      isAfterSunset: false,
      rawSunset: '',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
