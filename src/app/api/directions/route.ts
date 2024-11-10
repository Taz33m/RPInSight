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

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    
    const response = await fetch(`${url}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Directions API Error:', error);
    return NextResponse.json({ 
      error: 'Error fetching directions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
