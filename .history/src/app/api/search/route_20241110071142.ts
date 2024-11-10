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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an RPI campus expert. You have access to detailed information about campus locations. 
          When answering queries, use ONLY the information provided in the following JSON data:
          ${JSON.stringify(allLocations, null, 2)}

          For each query:
          1. Find the most relevant location from the data
          2. Return information about what can be done at that location based on its properties
          3. Format response as JSON with 'buildingName' and 'description' fields
          4. For queries about "nearest" or "closest", prioritize locations near the user's coordinates`
        },
        {
          role: "user",
          content: query + (userLocation ? " (Using my current location)" : "")
        }
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    // Find the coordinates for the building
    const location = allLocations.find(loc => 
      loc.properties.name.toLowerCase() === aiResponse.buildingName.toLowerCase()
    );
    const coordinates = location ? location.geometry.coordinates : null;

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
