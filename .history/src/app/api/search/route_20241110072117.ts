import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Import our data
import diningHalls from '@/data/dining_halls.geojson';
import studyHalls from '@/data/study_halls.geojson';
import parkingLots from '@/data/parking.geojson';
import lectureHalls from '@/data/lecture_halls.geojson';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    const completion = await openai.chat.completions.create({
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
          4. For "nearest" or "closest" queries, prioritize locations near user's coordinates`
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

    // Fix: Remove JSON.parse since completion.choices[0].message.content is already parsed
    const aiResponse = completion.choices[0].message.content;

    // Fix: Find location before using it
    const location = allLocations.find(loc => 
      loc.properties.name.toLowerCase() === aiResponse.buildingName.toLowerCase()
    );

    // Ensure we're returning string values, not objects
    return NextResponse.json({
      content: typeof aiResponse.description === 'object' 
        ? JSON.stringify(aiResponse.description) 
        : aiResponse.description,
      buildingName: aiResponse.buildingName,
      coordinates: location?.geometry.coordinates || knownLocations[aiResponse.buildingName] || null
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
