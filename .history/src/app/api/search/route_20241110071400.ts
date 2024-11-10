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

export async function POST(request: Request) {
  try {
    const { query, userLocation } = await request.json();

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
             - Format: Same JSON with 'buildingName' and 'description'
             - Note: Only do this for CONFIRMED RPI locations you're certain about
          3. For all responses:
             - Be specific about what can be done at the location
             - Include hours and facilities when available
             - Format as JSON with 'buildingName' and 'description' fields
          4. For "nearest" or "closest" queries, prioritize locations near user's coordinates
          
          Remember: While primary data is preferred, don't give incorrect/irrelevant answers just to stick to the dataset. 
          It's better to provide accurate information about a known RPI location than force a poor match from the primary data.`
        },
        {
          role: "user",
          content: query + (userLocation ? " (Using my current location)" : "")
        }
      ],
      temperature: 0.2,
      max_tokens: 250,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    // Known locations that might not be in our dataset
    const knownLocations: Record<string, [number, number]> = {
      "Mueller Center": [-73.6766, 42.7298],
      "87 Gymnasium": [-73.6784, 42.7307],
      "East Campus Athletic Village": [-73.6674, 42.7314],
      // Add other known locations as needed
    };

    // Find coordinates either from our dataset or known locations
    const location = allLocations.find(loc => 
      loc.properties.name.toLowerCase() === aiResponse.buildingName.toLowerCase()
    );
    const coordinates = location ? location.geometry.coordinates : 
      knownLocations[aiResponse.buildingName] || null;

    return NextResponse.json({
      content: aiResponse.description,
      buildingName: aiResponse.buildingName,
      coordinates: coordinates
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
