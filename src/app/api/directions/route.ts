import { NextResponse } from 'next/server';
import { rateLimit, requestKey } from '@/lib/rate-limit';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const VALID_MODES = new Set(['walking', 'cycling', 'driving']);
const CAMPUS_BOUNDS = {
  minLng: -73.72,
  maxLng: -73.64,
  minLat: 42.70,
  maxLat: 42.76,
};

interface DirectionsRequest {
  origin: [number, number];
  destination: [number, number];
  mode: 'walking' | 'cycling' | 'driving';
}

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((coord) => typeof coord === 'number' && Number.isFinite(coord)) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90;
}

function isCampusCoordinate([lng, lat]: [number, number]) {
  return lng >= CAMPUS_BOUNDS.minLng &&
    lng <= CAMPUS_BOUNDS.maxLng &&
    lat >= CAMPUS_BOUNDS.minLat &&
    lat <= CAMPUS_BOUNDS.maxLat;
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(requestKey(request, 'directions'), 60, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Directions are not configured.' }, { status: 503 });
    }

    const { origin, destination, mode } = await request.json() as DirectionsRequest;

    if (!isCoordinate(origin) || !isCoordinate(destination) || !VALID_MODES.has(mode)) {
      return NextResponse.json({ error: 'Invalid directions request.' }, { status: 400 });
    }

    if (!isCampusCoordinate(origin) || !isCampusCoordinate(destination)) {
      return NextResponse.json({ error: 'Directions must stay near the RPI campus area.' }, { status: 400 });
    }
    
    const profile = mode === 'cycling' ? 'cycling' : 
                   mode === 'driving' ? 'driving-traffic' : 
                   'walking';

    // Construct the URL with all required parameters
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`);
    
    // Add required query parameters
    url.searchParams.append('geometries', 'geojson');
    url.searchParams.append('access_token', MAPBOX_ACCESS_TOKEN!);
    url.searchParams.append('overview', 'full');
    url.searchParams.append('steps', 'true');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Directions API Error:', error);
    return NextResponse.json({ 
      error: 'Error fetching directions'
    }, { status: 500 });
  }
}
