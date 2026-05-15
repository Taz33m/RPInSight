import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Import our data
import diningHalls from '@/data/dining_halls.geojson';
import studyHalls from '@/data/study_halls.geojson';
import parkingLots from '@/data/parking.geojson';
import lectureHalls from '@/data/lecture_halls.geojson';

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
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

// Add this helper function at the top of the file
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

// Add this helper function at the top of the file
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

export async function POST(request: Request) {
  try {
    const { query: originalQuery, userLocation } = await request.json();
    
    // Create a mutable copy of the query
    let processedQuery = originalQuery;

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

    const completion = await getOpenAIClient().chat.completions.create({
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

    // Add debug logging
    console.log('OpenAI response:', completion.choices[0].message.content);

    let aiResponse;
    try {
      aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Validate response structure
      if (!aiResponse.buildingName || !aiResponse.description) {
        throw new Error('Missing required fields in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw content:', completion.choices[0].message.content);
      return NextResponse.json({ 
        error: 'Invalid response format',
        details: 'Failed to parse AI response or missing required fields'
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
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
