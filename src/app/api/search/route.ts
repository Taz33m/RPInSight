import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Import our data
import diningHalls from '@/data/dining_halls.geojson';
import studyHalls from '@/data/study_halls.geojson';
import parkingLots from '@/data/parking.geojson';
import lectureHalls from '@/data/lecture_halls.geojson';
import { rateLimit, requestKey } from '@/lib/rate-limit';

let openaiClient: OpenAI | null = null;
const MAX_QUERY_LENGTH = 240;
const CAMPUS_BOUNDS = {
  minLng: -73.72,
  maxLng: -73.64,
  minLat: 42.70,
  maxLat: 42.76,
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openaiClient;
}

// Combine all location data
const allLocations = [
  ...diningHalls.features,
  ...studyHalls.features,
  ...parkingLots.features,
  ...lectureHalls.features
];

// Known locations that might not be in our dataset
const knownLocations: Record<string, [number, number]> = {
  "Mueller Center": [-73.6766, 42.7298],
  "87 Gymnasium": [-73.6784, 42.7307],
  "East Campus Athletic Village": [-73.6674, 42.7314],
  // Add other known locations as needed
};

function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  // Haversine formula for calculating distance between coordinates
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1[1] * Math.PI) / 180;
  const φ2 = (point2[1] * Math.PI) / 180;
  const Δφ = ((point2[1] - point1[1]) * Math.PI) / 180;
  const Δλ = ((point2[0] - point1[0]) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function findBestLocationMatch(buildingName: string): [number, number] | null {
  // First check exact matches in our datasets
  const exactMatch = allLocations.find(loc => 
    loc.properties.name.toLowerCase() === buildingName.toLowerCase()
  );
  if (exactMatch) {
    return exactMatch.geometry.coordinates as [number, number];
  }

  // Check known locations
  if (knownLocations[buildingName]) {
    return knownLocations[buildingName];
  }

  // Try fuzzy matching
  const fuzzyMatch = allLocations.find(loc => 
    loc.properties.name.toLowerCase().includes(buildingName.toLowerCase()) ||
    buildingName.toLowerCase().includes(loc.properties.name.toLowerCase())
  );
  if (fuzzyMatch) {
    return fuzzyMatch.geometry.coordinates as [number, number];
  }

  // Fallback to approximate campus areas
  const approximateLocations: Record<string, [number, number]> = {
    "freshman hill": [-73.6766, 42.7298],
    "academic": [-73.6784, 42.7307],
    "north": [-73.6777, 42.7321],
    "east": [-73.6674, 42.7314],
    "west": [-73.6820, 42.7318],
    "south": [-73.6792, 42.7273],
    "commons": [-73.6740, 42.7273],
    "union": [-73.6766, 42.7299],
    "sage": [-73.6808, 42.7307],
    "library": [-73.6825, 42.7294]
  };

  // Check if query contains any of our approximate areas
  for (const [area, coords] of Object.entries(approximateLocations)) {
    if (buildingName.toLowerCase().includes(area)) {
      return coords;
    }
  }

  return null;
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

function findLocalLocation(query: string) {
  const normalized = query.trim().toLowerCase();
  const exactMatch = allLocations.find((location) =>
    location.properties.name.toLowerCase() === normalized
  );
  const fuzzyMatch = exactMatch ?? allLocations.find((location) => {
    const name = location.properties.name.toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });

  if (!fuzzyMatch) {
    return null;
  }

  return {
    buildingName: fuzzyMatch.properties.name,
    description: [
      fuzzyMatch.properties.location,
      fuzzyMatch.properties.notes,
    ].filter(Boolean).join(' ') || 'Curated RPI campus location from the local GeoJSON dataset.',
  };
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(requestKey(request, 'search'), 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const { query: originalQuery, userLocation } = await request.json();

    if (typeof originalQuery !== 'string') {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const trimmedQuery = originalQuery.trim();

    if (trimmedQuery.length < 2 || trimmedQuery.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ error: 'Query must be between 2 and 240 characters.' }, { status: 400 });
    }

    if (userLocation !== undefined && userLocation !== null && !isCoordinate(userLocation)) {
      return NextResponse.json({ error: 'Invalid user location.' }, { status: 400 });
    }

    if (isCoordinate(userLocation) && !isCampusCoordinate(userLocation)) {
      return NextResponse.json({ error: 'User location must be near the RPI campus area.' }, { status: 400 });
    }
    
    // Create a mutable copy of the query
    let processedQuery = trimmedQuery;

    // If query contains "nearest" or "closest" and we have user location, pre-process the data
    if (
      userLocation &&
      (processedQuery.toLowerCase().includes('nearest') || 
       processedQuery.toLowerCase().includes('closest'))
    ) {
      // Combine all locations with their distances from user
      const locationsWithDistances = [...allLocations, ...Object.entries(knownLocations).map(([name, coords]) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          name: name
        }
      }))].map(location => ({
        ...location,
        distance: calculateDistance(
          userLocation as [number, number],
          location.geometry.coordinates as [number, number]
        )
      }));

      // Sort by distance
      locationsWithDistances.sort((a, b) => a.distance - b.distance);

      // Ensure we're only using string values for the nearest locations
      const nearestLocations = locationsWithDistances
        .slice(0, 3)
        .map(loc => ({
          name: loc.properties.name,
          distance: Math.round(loc.distance)
        }))
        .map(loc => `${loc.name} (${loc.distance} meters away)`);
      
      processedQuery += ` - Nearest locations are: ${nearestLocations.join(', ')}`;
    }

    const client = getOpenAIClient();
    const localMatch = findLocalLocation(trimmedQuery);

    if (!client && localMatch) {
      const coordinates = findBestLocationMatch(localMatch.buildingName);

      return NextResponse.json({
        content: localMatch.description,
        buildingName: localMatch.buildingName,
        coordinates,
        confidence: coordinates ? 'exact' : null,
      });
    }

    if (!client) {
      return NextResponse.json({
        error: 'Campus search is not configured.',
      }, { status: 503 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an RPI campus expert. You have access to detailed information about campus locations.
          
          Primary Data Source:
          ${JSON.stringify(allLocations, null, 2)}

          Response Priority:
          1. First, try to find an exact or close match from the provided JSON data
          2. If no good match exists BUT the query is about a known RPI location (like Mueller Center, '87 Gym, Union, etc.):
             - Provide accurate information about that location
             - Format: Same JSON with 'buildingName' and 'description' fields
             - Note: Only do this for CONFIRMED RPI locations you're certain about
          3. For all responses:
             - Be specific about what can be done at the location
             - Include hours and facilities when available
             - Format response as a simple string for the description
             - Do not include raw objects or arrays in the response
          4. For "nearest" or "closest" queries, prioritize locations near user's coordinates

          Always respond with a valid JSON object containing 'buildingName' and 'description' fields.`
        },
        {
          role: "user",
          content: processedQuery + (userLocation ? " (Using my current location)" : "")
        }
      ],
      temperature: 0.2,
      max_tokens: 250,
      response_format: { type: "json_object" }
    });

    // Validate OpenAI response
    if (!completion.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure:', completion);
      return NextResponse.json({ 
        error: 'Invalid API response',
        details: 'The API response was empty or malformed'
      }, { status: 500 });
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Validate response structure
      if (!aiResponse.buildingName || !aiResponse.description) {
        throw new Error('Missing required fields in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json({ 
        error: 'Invalid response format'
      }, { status: 500 });
    }

    // Replace the existing return statement with this enhanced version
    const coordinates = findBestLocationMatch(aiResponse.buildingName);

    return NextResponse.json({
      content: typeof aiResponse.description === 'object' 
        ? JSON.stringify(aiResponse.description) 
        : aiResponse.description,
      buildingName: aiResponse.buildingName,
      coordinates: coordinates,
      confidence: coordinates ? (
        knownLocations[aiResponse.buildingName] ? 'exact' :
        allLocations.some(loc => loc.properties.name === aiResponse.buildingName) ? 'exact' :
        'approximate'
      ) : null
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Error processing request'
    }, { status: 500 });
  }
}
