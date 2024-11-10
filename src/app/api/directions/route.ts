import { NextResponse } from 'next/server';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface DirectionsRequest {
  origin: [number, number];
  destination: [number, number];
  mode: 'walking' | 'cycling' | 'driving';
}

export async function POST(request: Request) {
  try {
    const { origin, destination, mode } = await request.json() as DirectionsRequest;
    
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

    console.log('Fetching directions from:', url.toString());

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
      error: 'Error fetching directions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
