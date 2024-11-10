import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const KNOWN_LOCATIONS = {
  'barh dining hall': [-73.6685, 42.7314],
  'russell sage dining hall': [-73.678224, 42.729802],
  'commons dining hall': [-73.6766, 42.7299],
  'student union': [-73.67686, 42.72956],
  'greene building': [-73.68119608936347, 42.730054595010635],
  'walker laboratory': [-73.68283, 42.73073],
  'academy hall': [-73.67864608936347, 42.727292595010635],
  'dcc': [-73.67843, 42.72921],
  'darrin communications center': [-73.67843, 42.72921],
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

export async function POST(request: Request) {
  try {
    const { query, userLocation } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are Puckman, RPI's friendly campus guide. Respond conversationally and naturally to questions about campus locations. 
          For questions about nearest locations, focus on giving helpful context about the location along with its purpose.
          For libraries specifically:
          - Folsom Library is the main library (4 floors, quiet study spaces, group rooms)
          - Library also has a cafe on the first floor
          - Open late during finals week
          - Located centrally on campus
          Keep responses concise but informative. Don't just state facts - be helpful and engaging.`
        },
        {
          role: "user",
          content: query + (userLocation ? " (Using my current location)" : "")
        }
      ],
      temperature: 0.7, // Increased for more natural language
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    const buildingName = aiResponse.buildingName.toLowerCase();
    const coordinates = KNOWN_LOCATIONS[buildingName];

    return NextResponse.json({
      content: aiResponse.description,
      buildingName: aiResponse.buildingName,
      coordinates: coordinates || null
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
