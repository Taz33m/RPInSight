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
    const isNearestQuery = query.toLowerCase().includes('nearest') || 
                          query.toLowerCase().includes('closest') ||
                          query.toLowerCase().includes('near me');
    
    if (isNearestQuery && userLocation) {
      const searchTerm = query.toLowerCase();
      const relevantLocations = Object.entries(KNOWN_LOCATIONS).filter(([name]) => {
        if (searchTerm.includes('dining') || searchTerm.includes('food') || 
            searchTerm.includes('lunch') || searchTerm.includes('dinner')) {
          return name.includes('dining') || name.includes('commons') || name.includes('union');
        }
        return true;
      });

      const distances = relevantLocations.map(([name, coords]) => ({
        name,
        coordinates: coords,
        distance: calculateDistance(userLocation[1], userLocation[0], coords[1], coords[0])
      }));

      const nearest = distances.sort((a, b) => a.distance - b.distance)[0];
      
      return NextResponse.json({
        content: `${nearest.name.charAt(0).toUpperCase() + nearest.name.slice(1)} is the closest to your current location.`,
        buildingName: nearest.name,
        coordinates: nearest.coordinates
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an RPI campus expert. Respond with both the building name and a brief description relevant to the query. Format your response as JSON with 'buildingName' and 'description' fields. If the query mentions "nearby" or similar terms, prioritize locations close to the user. Stick to these buildings and places on the RPI campus: Folsom Library, Russell Sage Dining Hall, Student Union, Greene Building, Walker Laboratory, Academy Hall, DCC (Darrin Communications Center).`
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
